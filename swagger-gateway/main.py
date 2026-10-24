"""Static, documentation-only gateway behind the Argo CD extension proxy."""
from contextlib import asynccontextmanager
import json
from pathlib import Path
import re

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse

PREFIX = "/extensions/swagger"
CONTEXT = {"Argocd-Application-Name": "argocd:swagger-gateway", "Argocd-Project-Name": "appset"}
MAX_SPEC_BYTES = 1024 * 1024
REGISTRY = {
    "go-demo": {"title": "Go demo (demonstration)", "upstream": "http://swagger-go:8080/swagger/doc.json"},
    "java-demo": {"title": "Java demo (demonstration)", "upstream": "http://swagger-java:8080/v3/api-docs"},
}


@asynccontextmanager
async def lifespan(app):
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0), follow_redirects=False, trust_env=False) as client:
        app.state.client = client
        yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


def authorize(request: Request):
    # Headers are assertions from the trusted proxy, not standalone authentication.
    if any(request.headers.get(key) != value for key, value in CONTEXT.items()):
        raise HTTPException(403, "Forbidden context")


def publication(publication_id: str):
    if not re.fullmatch(r"[a-z0-9-]{1,64}", publication_id) or publication_id not in REGISTRY:
        raise HTTPException(404, "Publication not found")
    return REGISTRY[publication_id]


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
async def catalog():
    return {"items": [
        {"id": key, "title": item["title"], "application": "swagger-gateway", "project": "appset",
         "namespace": "swagger-gateway", "demonstration": True,
         "specUrl": f"{PREFIX}/specs/{key}", "uiUrl": f"{PREFIX}/ui/{key}"}
        for key, item in REGISTRY.items()
    ]}


@app.get("/ui/{publication_id}", response_class=HTMLResponse, dependencies=[Depends(authorize)])
async def ui(publication_id: str):
    publication(publication_id)
    template = Path(__file__).with_name("templates").joinpath("index.html").read_text()
    return HTMLResponse(template.replace("__PUBLICATION_ID__", publication_id))


@app.get("/specs/{publication_id}", dependencies=[Depends(authorize)])
async def spec(publication_id: str, request: Request):
    record = publication(publication_id)
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
