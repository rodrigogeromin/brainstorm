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
    response = client.get("/api/v1/catalog", headers=HEADERS)
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == ["go-demo", "java-demo"]
    assert all(item["application"] == "swagger-gateway" and item["demonstration"] for item in items)
    assert all(item["uiUrl"].startswith("/extensions/swagger/ui/") for item in items)
    assert "upstream" not in response.text and ".svc" not in response.text


@pytest.mark.parametrize("kind", ["ui", "specs"])
@pytest.mark.parametrize("identifier", ["unknown", "ABC", "bad:id", "a" * 65])
def test_unknown_ids(client, kind, identifier):
    assert client.get(f"/{kind}/{identifier}", headers=HEADERS).status_code == 404


@pytest.mark.parametrize("identifier", ["go-demo", "java-demo"])
def test_universal_ui(client, identifier):
    response = client.get(f"/ui/{identifier}", headers=HEADERS)
    assert response.status_code == 200
    assert f"/extensions/swagger/specs/{identifier}" in response.text
    assert "swagger-ui-dist@5.17.14" in response.text
    assert "supportedSubmitMethods: []" in response.text
    assert "requestInterceptor" in response.text and "Argocd-Application-Name" in response.text
    assert "__PUBLICATION_ID__" not in response.text


@pytest.mark.parametrize("identifier,doc", [("go-demo", {"swagger": "2.0", "info": {}, "paths": {}}), ("java-demo", DOC)])
def test_formats_and_fixed_upstreams(client, identifier, doc):
    def handler(request):
        assert str(request.url) == main.REGISTRY[identifier]["upstream"]
        assert "argocd-application-name" not in request.headers
        return httpx.Response(200, json=doc)
    async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    main.app.state.client = async_client
    response = client.get(f"/specs/{identifier}?url=http://evil", headers=HEADERS)
    assert response.status_code == 200 and response.json() == doc


@pytest.mark.parametrize("failure,expected", [("redirect", 502), ("status", 502), ("invalid-json", 502), ("invalid-spec", 502), ("large", 502), ("timeout", 504), ("unavailable", 502)])
def test_upstream_failures(client, failure, expected):
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
    response = client.get("/specs/go-demo", headers=HEADERS)
    assert response.status_code == expected
    assert "secret" not in response.text and "swagger-go" not in response.text


@pytest.mark.parametrize("encoding", ["gzip", "deflate", "br", "identity, gzip", ""])
def test_compressed_response_rejected_without_reading(client, encoding):
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
    response = client.get("/specs/go-demo", headers=HEADERS)
    assert response.status_code == 502
    assert response.json()["detail"] == "Compressed documentation is not supported"
    assert not stream.consumed and stream.closed


def test_no_try_it_out_proxy(client):
    assert client.get("/proxy/go-demo/hello", headers=HEADERS).status_code == 404


def test_generated_application_matches_sources():
    application = build()
    assert yaml.safe_load((ROOT / "application.yaml").read_text()) == application
    assert application == build()
    source = application["spec"]["source"]
    assert source["chart"] == "raw" and source["targetRevision"] == "2.0.2"
    resources = [yaml.safe_load(item) for item in source["helm"]["valuesObject"]["templates"]]
    deployments = [item for item in resources if item["kind"] == "Deployment"]
    assert len(deployments) == 3
    assert all(not item["spec"]["template"]["spec"]["automountServiceAccountToken"] for item in deployments)
    gateway = next(item for item in resources if item["kind"] == "ConfigMap" and item["metadata"]["name"] == "swagger-gateway-source")
    assert gateway["data"]["main.py"] == (ROOT / "main.py").read_text()
    network = next(item for item in resources if item["kind"] == "NetworkPolicy")
    peers = network["spec"]["ingress"][0]["from"]
    assert len(peers) == 1 and "namespaceSelector" in peers[0] and "podSelector" in peers[0]
    assert application["spec"]["syncPolicy"]["automated"]["prune"] is False
