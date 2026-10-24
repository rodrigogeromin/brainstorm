"""Kubernetes-discovered, documentation-only gateway behind Argo CD."""
from contextlib import asynccontextmanager
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.parse import quote, unquote

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response

PREFIX = "/extensions/swagger"
CONTEXT = {"Argocd-Application-Name": "argocd:swagger-gateway", "Argocd-Project-Name": "appset"}
MAX_SPEC_BYTES = 1024 * 1024
MAX_REQUEST_BYTES = 1024 * 1024
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
SWAGGER_ENABLED = "platform.io/swagger.enabled"
SWAGGER_PATH = "platform.io/swagger.path"
SWAGGER_PORT = "platform.io/swagger.port"
SWAGGER_TITLE = "platform.io/swagger.title"
DISCOVERY_SELECTOR = f"{SWAGGER_ENABLED}=true"
SERVICE_ACCOUNT = Path("/var/run/secrets/kubernetes.io/serviceaccount")
CLUSTER_DOMAIN = os.getenv("KUBERNETES_CLUSTER_DOMAIN", "cluster.local").strip(".")


@asynccontextmanager
async def lifespan(app):
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0), follow_redirects=False, trust_env=False) as client:
        app.state.client = client
        host = os.getenv("KUBERNETES_SERVICE_HOST")
        token_path = SERVICE_ACCOUNT / "token"
        ca_path = SERVICE_ACCOUNT / "ca.crt"
        if host and token_path.is_file() and ca_path.is_file():
            port = os.getenv("KUBERNETES_SERVICE_PORT_HTTPS", "443")
            app.state.kubernetes_client = httpx.AsyncClient(
                base_url=f"https://{host}:{port}",
                headers={"Authorization": f"Bearer {token_path.read_text().strip()}"},
                verify=str(ca_path),
                timeout=httpx.Timeout(5.0, connect=2.0),
                trust_env=False,
            )
        else:
            app.state.kubernetes_client = None
        yield
        if app.state.kubernetes_client:
            await app.state.kubernetes_client.aclose()


app = FastAPI(title="Swagger Gateway", version="0.1.0", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url="/openapi.json")


def authorize(request: Request):
    # Headers are assertions from the trusted proxy, not standalone authentication.
    if any(request.headers.get(key) != value for key, value in CONTEXT.items()):
        raise HTTPException(403, "Forbidden context")


def publication_id(namespace: str, service: str) -> str:
    return hashlib.sha256(f"{namespace}/{service}".encode()).hexdigest()[:32]


def discovered_record(service: dict):
    metadata = service.get("metadata") or {}
    name = metadata.get("name")
    namespace = metadata.get("namespace")
    labels = metadata.get("labels") or {}
    annotations = metadata.get("annotations") or {}
    if labels.get(SWAGGER_ENABLED) != "true" or not name or not namespace:
        return None

    path = annotations.get(SWAGGER_PATH, "")
    if (not isinstance(path, str) or not re.fullmatch(r"/[A-Za-z0-9._~!$&'()*+,;=:@/-]*", path)
            or any(segment in {".", ".."} for segment in path.split("/"))):
        return None

    raw_port = annotations.get(SWAGGER_PORT, "")
    if not isinstance(raw_port, str) or not raw_port.isdecimal():
        return None
    port = int(raw_port)
    service_ports = (service.get("spec") or {}).get("ports") or []
    if not 1 <= port <= 65535 or not any(item.get("port") == port for item in service_ports):
        return None

    return {
        "id": publication_id(namespace, name),
        "title": annotations.get(SWAGGER_TITLE) or name,
        "application": "swagger-gateway",
        "project": "appset",
        "namespace": namespace,
        "service": name,
        "port": port,
        "path": path,
        "upstream": f"http://{name}.{namespace}.svc.{CLUSTER_DOMAIN}:{port}{path}",
    }


async def discovered_publications(request: Request):
    client = getattr(request.app.state, "kubernetes_client", None)
    if client is None:
        raise HTTPException(503, "Kubernetes service discovery unavailable")
    items = []
    params = {"labelSelector": DISCOVERY_SELECTOR, "limit": 500}
    try:
        while True:
            response = await client.get("/api/v1/services", params=params)
            response.raise_for_status()
            page = response.json()
            items.extend(page.get("items", []))
            continuation = (page.get("metadata") or {}).get("continue")
            if not continuation:
                break
            params["continue"] = continuation
    except (httpx.HTTPError, ValueError, AttributeError):
        raise HTTPException(503, "Kubernetes service discovery unavailable") from None

    publications = [record for item in items if (record := discovered_record(item))]
    return sorted(publications, key=lambda item: (item["namespace"], item["service"]))


def resolve_publication(publication_id: str, publications: list[dict]):
    for item in publications:
        if item["id"] == publication_id:
            return item
    raise HTTPException(404, "Publication not found")


def validate_publication_id(publication_id: str):
    if not re.fullmatch(r"[a-f0-9]{32}", publication_id):
        raise HTTPException(404, "Publication not found")


@app.middleware("http")
async def safe_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.get("/api/v1/catalog", dependencies=[Depends(authorize)])
async def catalog(request: Request):
    publications = await discovered_publications(request)
    return {"items": [
        {"id": item["id"], "title": item["title"], "application": item["application"], "project": item["project"],
         "namespace": item["namespace"], "specUrl": f"{PREFIX}/specs/{item['id']}", "uiUrl": f"{PREFIX}/ui/{item['id']}"}
        for item in publications
    ]}


@app.get("/ui/{publication_id}", response_class=HTMLResponse, dependencies=[Depends(authorize)])
async def ui(publication_id: str, request: Request):
    validate_publication_id(publication_id)
    record = resolve_publication(publication_id, await discovered_publications(request))
    template = Path(__file__).with_name("templates").joinpath("index.html").read_text()
    return HTMLResponse(template.replace("__PUBLICATION_ID__", record["id"]))


@app.get("/specs/{publication_id}", dependencies=[Depends(authorize)])
async def spec(publication_id: str, request: Request):
    validate_publication_id(publication_id)
    record = resolve_publication(publication_id, await discovered_publications(request))
    try:
        async with request.app.state.client.stream("GET", record["upstream"], headers={"Accept": "application/json", "Accept-Encoding": "identity"}) as response:
            if response.status_code != 200:
                raise HTTPException(502, "Documentation unavailable")
            if response.headers.get("Content-Encoding", "identity").strip().lower() != "identity":
                raise HTTPException(502, "Compressed documentation is not supported")
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > MAX_SPEC_BYTES:
                    raise HTTPException(502, "Documentation too large")
        document = json.loads(body)
        if not isinstance(document, dict) or not isinstance(document.get("info"), dict) or not isinstance(document.get("paths"), dict):
            raise ValueError("invalid specification")
        if document.get("swagger") != "2.0" and not str(document.get("openapi", "")).startswith("3."):
            raise ValueError("unsupported specification")
        return JSONResponse(document)
    except httpx.TimeoutException:
        raise HTTPException(504, "Documentation timed out") from None
    except (httpx.HTTPError, ValueError, RecursionError):
        raise HTTPException(502, "Invalid documentation response") from None


@app.api_route("/proxy/{publication_id}/{upstream_path:path}", methods=API_METHODS,
               dependencies=[Depends(authorize)], include_in_schema=False)
async def proxy_api(publication_id: str, upstream_path: str, request: Request):
    """Proxy Try it out only to the currently discovered Service for this ID."""
    validate_publication_id(publication_id)
    record = resolve_publication(publication_id, await discovered_publications(request))
    decoded_path = "/" + unquote(upstream_path).lstrip("/")
    segments = decoded_path.split("/")
    if (len(decoded_path) > 4096 or "\\" in decoded_path
            or any(segment in {".", ".."} for segment in segments)
            or any(ord(char) < 32 or ord(char) == 127 for char in decoded_path)):
        raise HTTPException(400, "Invalid API path")
    self_service = record["service"] == "swagger-gateway" and record["namespace"] == "swagger-gateway"
    if self_service and (decoded_path == "/proxy" or decoded_path.startswith("/proxy/")):
        raise HTTPException(400, "Recursive gateway proxy calls are not supported")

    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_REQUEST_BYTES:
            raise HTTPException(413, "API request too large")

    # Never forward the Argo CD session, origin, host, or proxy context to an API.
    blocked_headers = {"cookie", "host", "content-length", "transfer-encoding", "connection",
                       "origin", "referer", "argocd-application-name", "argocd-project-name"}
    headers = {key: value for key, value in request.headers.items()
               if key.lower() not in blocked_headers and not key.lower().startswith(("sec-", "proxy-"))}
    if self_service:
        # The outer Argo CD proxy has authorized this request. Restore only the
        # fixed internal gateway context so its protected API routes can be tried.
        headers.update(CONTEXT)
    headers["Accept-Encoding"] = "identity"
    safe_path = quote(decoded_path, safe="/:@-._~!$&'()*+,;=")
    upstream_url = (f"http://{record['service']}.{record['namespace']}.svc.{CLUSTER_DOMAIN}:"
                    f"{record['port']}{safe_path}")
    if request.url.query:
        upstream_url += "?" + request.url.query

    try:
        async with request.app.state.client.stream(request.method, upstream_url,
                                                   headers=headers, content=bytes(body)) as upstream:
            if 300 <= upstream.status_code < 400:
                raise HTTPException(502, "API redirects are not supported")
            if upstream.headers.get("Content-Encoding", "identity").strip().lower() != "identity":
                raise HTTPException(502, "Compressed API responses are not supported")
            response_body = bytearray()
            async for chunk in upstream.aiter_bytes():
                response_body.extend(chunk)
                if len(response_body) > MAX_RESPONSE_BYTES:
                    raise HTTPException(502, "API response too large")
            response_headers = {}
            for name in ("content-type", "content-disposition", "cache-control"):
                if name in upstream.headers:
                    response_headers[name] = upstream.headers[name]
            return Response(bytes(response_body), status_code=upstream.status_code,
                            headers=response_headers)
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(504, "API request timed out") from None
    except httpx.HTTPError:
        raise HTTPException(502, "API request failed") from None
