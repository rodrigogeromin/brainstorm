from pathlib import Path
import sys

import httpx
import pytest
from fastapi.testclient import TestClient
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import main
from build_application import build

HEADERS = main.CONTEXT
DOC = {"openapi": "3.0.3", "info": {"title": "Demo", "version": "1"}, "paths": {}}


def service(name, namespace="demo", path="/v3/api-docs", port=8080, enabled=True):
    labels = {main.SWAGGER_ENABLED: "true"} if enabled else {}
    annotations = {main.SWAGGER_PATH: path, main.SWAGGER_PORT: str(port), main.SWAGGER_TITLE: name}
    return {"metadata": {"name": name, "namespace": namespace, "labels": labels, "annotations": annotations},
            "spec": {"ports": [{"port": port}]}}


def mock_kubernetes(services, status=200, next_page=None):
    pages = [services]
    if next_page is not None:
        pages = [services[:1], services[1:]]
    calls = []
    def handler(request):
        calls.append(request)
        assert request.url.path == "/api/v1/services"
        assert request.url.params.get("labelSelector") == main.DISCOVERY_SELECTOR
        page = 1 if request.url.params.get("continue") == "page-2" else 0
        payload = {"items": pages[page]}
        if page == 0 and len(pages) == 2:
            payload["metadata"] = {"continue": "page-2"}
        return httpx.Response(status, json=payload if status == 200 else {"message": "forbidden"})
    main.app.state.kubernetes_client = httpx.AsyncClient(base_url="https://kubernetes.default.svc", transport=httpx.MockTransport(handler))
    return calls


@pytest.fixture
def client():
    with TestClient(main.app) as client:
        yield client


@pytest.mark.parametrize("route", ["/api/v1/catalog", "/ui/go-demo", "/specs/java-demo"])
@pytest.mark.parametrize("headers", [{}, {"Argocd-Application-Name": "other", "Argocd-Project-Name": "appset"}, {"Argocd-Application-Name": "argocd:swagger-gateway", "Argocd-Project-Name": "default"}])
def test_context_required(client, route, headers):
    assert client.get(route, headers=headers).status_code == 403


def test_health_independent(client):
    assert client.get("/healthz").json() == {"status": "ok"}


def test_catalog(client):
    mock_kubernetes([service("go-demo", path="/swagger/doc.json"), service("java-demo"), service("swagger-gateway", namespace="swagger-gateway", path="/openapi.json"), service("ignored", enabled=False), service("invalid", path="http://example.test/spec")])
    response = client.get("/api/v1/catalog", headers=HEADERS)
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 3
    assert [item["title"] for item in items] == ["go-demo", "java-demo", "swagger-gateway"]
    assert all(len(item["id"]) == 32 and item["application"] == "swagger-gateway" for item in items)
    assert all(item["uiUrl"].startswith("/extensions/swagger/ui/") for item in items)
    assert "upstream" not in response.text and ".svc" not in response.text


@pytest.mark.parametrize("kind", ["ui", "specs"])
@pytest.mark.parametrize("identifier", ["unknown", "ABC", "bad:id", "a" * 65])
def test_unknown_ids(client, kind, identifier):
    mock_kubernetes([])
    assert client.get(f"/{kind}/{identifier}", headers=HEADERS).status_code == 404


@pytest.mark.parametrize("identifier", ["go-demo", "java-demo"])
def test_universal_ui(client, identifier):
    service_name = identifier
    mock_kubernetes([service(service_name, path="/swagger/doc.json" if service_name == "go-demo" else "/v3/api-docs")])
    response = client.get(f"/ui/{main.publication_id('demo', service_name)}", headers=HEADERS)
    assert response.status_code == 200
    assert f"/extensions/swagger/specs/{main.publication_id('demo', service_name)}" in response.text
    assert "swagger-ui-dist@5.17.14" in response.text
    assert "supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']" in response.text
    assert "tryItOutEnabled: true" in response.text
    assert f"/extensions/swagger/proxy/{main.publication_id('demo', service_name)}" in response.text
    assert "const gatewayOrigin = parent.location.origin" in response.text
    assert "if (target.pathname === '/extensions/swagger/specs/" in response.text
    assert "requestInterceptor" in response.text and "Argocd-Application-Name" in response.text
    assert "__PUBLICATION_ID__" not in response.text


def test_gateway_openapi_is_enabled(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert {"/api/v1/catalog", "/ui/{publication_id}", "/specs/{publication_id}"}.issubset(response.json()["paths"])


@pytest.mark.parametrize("name,namespace,path,doc", [("go-demo", "demo", "/swagger/doc.json", {"swagger": "2.0", "info": {}, "paths": {}}), ("java-demo", "demo", "/v3/api-docs", DOC), ("swagger-gateway", "swagger-gateway", "/openapi.json", {"openapi": "3.1.0", "info": {"title": "Swagger Gateway", "version": "1"}, "paths": {"/api/v1/catalog": {"get": {"responses": {"200": {"description": "OK"}}}}}})])
def test_formats_and_resolved_upstreams(client, name, namespace, path, doc):
    discovered = service(name, namespace=namespace, path=path)
    identifier = main.publication_id(namespace, name)
    mock_kubernetes([discovered])
    def handler(request):
        assert str(request.url) == f"http://{name}.{namespace}.svc.cluster.local:8080{path}"
        assert "argocd-application-name" not in request.headers
        return httpx.Response(200, json=doc)
    async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    main.app.state.client = async_client
    response = client.get(f"/specs/{identifier}?url=http://evil", headers=HEADERS)
    assert response.status_code == 200 and response.json() == doc


def test_discovery_uses_pagination(client):
    calls = mock_kubernetes([service("first"), service("second")], next_page="page-2")
    response = client.get("/api/v1/catalog", headers=HEADERS)
    assert response.status_code == 200 and len(response.json()["items"]) == 2
    assert len(calls) == 2


def test_discovery_unavailable_is_reported(client):
    mock_kubernetes([], status=403)
    response = client.get("/api/v1/catalog", headers=HEADERS)
    assert response.status_code == 503
    assert response.json()["detail"] == "Kubernetes service discovery unavailable"


@pytest.mark.parametrize("path,port", [("https://evil.test/spec", 8080), ("/../secret", 8080), ("/openapi", 65536), ("/openapi", 8081)])
def test_invalid_discovery_metadata_is_ignored(client, path, port):
    discovered = service("invalid", path=path, port=port)
    if port == 8081:
        discovered["spec"]["ports"][0]["port"] = 8080
    mock_kubernetes([discovered])
    response = client.get("/api/v1/catalog", headers=HEADERS)
    assert response.status_code == 200 and response.json()["items"] == []


@pytest.mark.parametrize("failure,expected", [("redirect", 502), ("status", 502), ("invalid-json", 502), ("invalid-spec", 502), ("large", 502), ("timeout", 504), ("unavailable", 502)])
def test_upstream_failures(client, failure, expected):
    mock_kubernetes([service("go-demo", path="/swagger/doc.json")])
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("secret internal hostname", request=request)
        if failure == "unavailable":
            raise httpx.ConnectError("secret internal hostname", request=request)
        return {
            "redirect": httpx.Response(302, headers={"location": "http://secret.internal"}),
            "status": httpx.Response(500),
            "invalid-json": httpx.Response(200, content=b"not JSON"),
            "invalid-spec": httpx.Response(200, json={"foo": "bar"}),
            "large": httpx.Response(200, content=b"x" * (main.MAX_SPEC_BYTES + 1)),
        }[failure]
    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    response = client.get(f"/specs/{main.publication_id('demo', 'go-demo')}", headers=HEADERS)
    assert response.status_code == expected
    assert "secret" not in response.text and "swagger-go" not in response.text


@pytest.mark.parametrize("encoding", ["gzip", "deflate", "br", "identity, gzip", ""])
def test_compressed_response_rejected_without_reading(client, encoding):
    mock_kubernetes([service("go-demo", path="/swagger/doc.json")])
    class UnreadStream(httpx.AsyncByteStream):
        consumed = False
        closed = False

        async def __aiter__(self):
            self.consumed = True
            raise AssertionError("Encoded body must not be read or decompressed")
            yield b""  # Make this an async generator without reading a body.

        async def aclose(self):
            self.closed = True

    stream = UnreadStream()

    def handler(request):
        assert request.headers["Accept-Encoding"] == "identity"
        return httpx.Response(200, headers={"Content-Encoding": encoding}, stream=stream)

    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    response = client.get(f"/specs/{main.publication_id('demo', 'go-demo')}", headers=HEADERS)
    assert response.status_code == 502
    assert response.json()["detail"] == "Compressed documentation is not supported"
    assert not stream.consumed and stream.closed


def test_try_it_out_proxy_forwards_only_to_discovered_service(client):
    mock_kubernetes([service("go-demo", path="/swagger/doc.json")])
    async def handler(request):
        assert str(request.url) == "http://go-demo.demo.svc.cluster.local:8080/api/hello?name=world"
        assert request.method == "POST"
        assert request.headers["authorization"] == "Bearer api-token"
        assert "cookie" not in request.headers and "argocd-application-name" not in request.headers
        assert request.content == b'{"ok":true}'
        return httpx.Response(201, json={"created": True})
    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    response = client.post(f"/proxy/{main.publication_id('demo', 'go-demo')}/api/hello?name=world",
                           headers={**HEADERS, "Authorization": "Bearer api-token", "Cookie": "argocd.token=secret",
                                    "Content-Type": "application/json"}, content=b'{"ok":true}')
    assert response.status_code == 201 and response.json() == {"created": True}


def test_try_it_out_proxy_restores_fixed_context_only_for_gateway_self_calls(client):
    mock_kubernetes([service("swagger-gateway", namespace="swagger-gateway", path="/openapi.json")])
    def handler(request):
        assert str(request.url) == "http://swagger-gateway.swagger-gateway.svc.cluster.local:8080/api/v1/catalog"
        for name, value in main.CONTEXT.items():
            assert request.headers[name.lower()] == value
        assert "cookie" not in request.headers
        return httpx.Response(200, json={"items": []})
    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    response = client.get(
        f"/proxy/{main.publication_id('swagger-gateway', 'swagger-gateway')}/api/v1/catalog",
        headers={**HEADERS, "Cookie": "argocd.token=secret"},
    )
    assert response.status_code == 200 and response.json() == {"items": []}


def test_try_it_out_proxy_blocks_recursive_gateway_self_calls(client):
    mock_kubernetes([service("swagger-gateway", namespace="swagger-gateway", path="/openapi.json")])
    response = client.get(
        f"/proxy/{main.publication_id('swagger-gateway', 'swagger-gateway')}/proxy/abc/hello",
        headers=HEADERS,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Recursive gateway proxy calls are not supported"


@pytest.mark.parametrize("path", ["../secret", "%2e%2e/secret", "a%2f..%2fsecret", "%5csecret"])
def test_try_it_out_proxy_rejects_traversal(client, path):
    mock_kubernetes([service("go-demo")])
    response = client.get(f"/proxy/{main.publication_id('demo', 'go-demo')}/{path}", headers=HEADERS)
    assert response.status_code in {400, 404}


def test_try_it_out_proxy_rejects_unknown_publication(client):
    mock_kubernetes([service("go-demo")])
    response = client.get(f"/proxy/{'0' * 32}/api/hello", headers=HEADERS)
    assert response.status_code == 404


def test_try_it_out_proxy_supports_root_path(client):
    mock_kubernetes([service("go-demo")])
    def handler(request):
        assert str(request.url) == "http://go-demo.demo.svc.cluster.local:8080/"
        return httpx.Response(200, text="root")
    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    response = client.get(f"/proxy/{main.publication_id('demo', 'go-demo')}/", headers=HEADERS)
    assert response.status_code == 200 and response.text == "root"


def test_try_it_out_proxy_limits_request_body(client):
    mock_kubernetes([service("go-demo")])
    response = client.post(f"/proxy/{main.publication_id('demo', 'go-demo')}/hello",
                           headers=HEADERS, content=b"x" * (main.MAX_REQUEST_BYTES + 1))
    assert response.status_code == 413


def test_try_it_out_proxy_limits_response_body(client):
    mock_kubernetes([service("go-demo")])
    main.app.state.client = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda request: httpx.Response(200, content=b"x" * (main.MAX_RESPONSE_BYTES + 1))))
    response = client.get(f"/proxy/{main.publication_id('demo', 'go-demo')}/hello", headers=HEADERS)
    assert response.status_code == 502
    assert response.json()["detail"] == "API response too large"


def test_generated_application_matches_sources():
    application = build()
    assert yaml.safe_load((ROOT / "application.yaml").read_text()) == application
    assert application == build()
    source = application["spec"]["source"]
    assert source["chart"] == "raw" and source["targetRevision"] == "2.0.2"
    resources = [yaml.safe_load(item) for item in source["helm"]["valuesObject"]["templates"]]
    deployments = [item for item in resources if item["kind"] == "Deployment"]
    assert len(deployments) == 3
    gateway_deployment = next(item for item in deployments if item["metadata"]["name"] == "swagger-gateway")
    assert gateway_deployment["spec"]["template"]["spec"]["automountServiceAccountToken"] is True
    assert gateway_deployment["spec"]["template"]["spec"]["serviceAccountName"] == "swagger-gateway"
    assert all(item["spec"]["template"]["spec"]["automountServiceAccountToken"] is False for item in deployments if item != gateway_deployment)
    cluster_role = next(item for item in resources if item["kind"] == "ClusterRole")
    assert cluster_role["rules"] == [{"apiGroups": [""], "resources": ["services"], "verbs": ["list"]}]
    binding = next(item for item in resources if item["kind"] == "ClusterRoleBinding")
    assert binding["roleRef"]["name"] == cluster_role["metadata"]["name"]
    discovered_services = [item for item in resources if item["kind"] == "Service" and item["metadata"].get("labels", {}).get(main.SWAGGER_ENABLED) == "true"]
    assert len(discovered_services) == 3
    assert all(item["metadata"]["annotations"][main.SWAGGER_PORT] == "8080" for item in discovered_services)
    gateway = next(item for item in resources if item["kind"] == "ConfigMap" and item["metadata"]["name"] == "swagger-gateway-source")
    assert gateway["data"]["main.py"] == (ROOT / "main.py").read_text()
    network = next(item for item in resources if item["kind"] == "NetworkPolicy")
    peers = network["spec"]["ingress"][0]["from"]
    assert len(peers) == 2
    assert all("namespaceSelector" in peer and "podSelector" in peer for peer in peers)
    assert application["spec"]["syncPolicy"]["automated"]["prune"] is False
