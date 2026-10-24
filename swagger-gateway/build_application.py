#!/usr/bin/env python3
"""Build the complete, deterministic Argo CD Application (requires PyYAML)."""
import hashlib
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent
NAMESPACE = "swagger-gateway"


class ManifestDumper(yaml.SafeDumper):
    pass


def string(dumper, value):
    return dumper.represent_scalar("tag:yaml.org,2002:str", value, style="|" if "\n" in value else None)


ManifestDumper.add_representer(str, string)


def resource(kind, name, **fields):
    return {"apiVersion": "v1", "kind": kind, "metadata": {"name": name, "namespace": NAMESPACE}, **fields}


def bundle(name, paths):
    data = {target: (ROOT / source).read_text() for target, source in paths.items()}
    assert all("{{" not in value for value in data.values()), "Escape Helm tpl delimiters before embedding sources"
    digest = hashlib.sha256("".join(key + data[key] for key in sorted(data)).encode()).hexdigest()
    return resource("ConfigMap", name, data=data), digest


def deployment(name, image, command, config, checksum, mounts, resources, service_account=None):
    pod_spec = {"automountServiceAccountToken": service_account is not None,
                "containers": [{"name": name, "image": image, "imagePullPolicy": "IfNotPresent",
                                "command": command, "ports": [{"containerPort": 8080, "name": "http"}],
                                "env": [{"name": "PYTHONDONTWRITEBYTECODE", "value": "1"}],
                                "resources": resources, "volumeMounts": mounts,
                                "startupProbe": {"httpGet": {"path": "/healthz", "port": "http"}, "periodSeconds": 5, "failureThreshold": 120},
                                "readinessProbe": {"httpGet": {"path": "/healthz", "port": "http"}, "periodSeconds": 5},
                                "livenessProbe": {"httpGet": {"path": "/healthz", "port": "http"}, "periodSeconds": 10}}],
                "volumes": [{"name": "source", "configMap": {"name": config}}]}
    if service_account:
        pod_spec["serviceAccountName"] = service_account
    return {
        "apiVersion": "apps/v1", "kind": "Deployment",
        "metadata": {"name": name, "namespace": NAMESPACE},
        "spec": {"replicas": 1, "selector": {"matchLabels": {"app": name}},
                 "template": {"metadata": {"labels": {"app": name}, "annotations": {"checksum/source": checksum}},
                              "spec": pod_spec}}}


def build():
    gateway, gateway_hash = bundle("swagger-gateway-source", {"main.py": "main.py", "requirements.txt": "requirements.txt", "index.html": "templates/index.html"})
    go, go_hash = bundle("swagger-go-source", {"main.go": "demo/main.go"})
    java, java_hash = bundle("swagger-java-source", {"Demo.java": "demo/Demo.java"})
    resources = [{"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": NAMESPACE}}, gateway, go, java,
                 resource("ServiceAccount", "swagger-gateway"),
                 {"apiVersion": "rbac.authorization.k8s.io/v1", "kind": "ClusterRole",
                  "metadata": {"name": "swagger-gateway-discovery"},
                  "rules": [{"apiGroups": [""], "resources": ["services"], "verbs": ["list"]}]},
                 {"apiVersion": "rbac.authorization.k8s.io/v1", "kind": "ClusterRoleBinding",
                  "metadata": {"name": "swagger-gateway-discovery"},
                  "subjects": [{"kind": "ServiceAccount", "name": "swagger-gateway", "namespace": NAMESPACE}],
                  "roleRef": {"apiGroup": "rbac.authorization.k8s.io", "kind": "ClusterRole", "name": "swagger-gateway-discovery"}}]
    gateway_mounts = [{"name": "source", "mountPath": "/app/main.py", "subPath": "main.py", "readOnly": True},
                      {"name": "source", "mountPath": "/app/requirements.txt", "subPath": "requirements.txt", "readOnly": True},
                      {"name": "source", "mountPath": "/app/templates/index.html", "subPath": "index.html", "readOnly": True}]
    resources += [
        deployment("swagger-gateway", "python:3.12.10-slim", ["sh", "-ec", "pip install --no-cache-dir -r /app/requirements.txt; cd /app; exec uvicorn main:app --host 0.0.0.0 --port 8080 --no-access-log"], gateway["metadata"]["name"], gateway_hash, gateway_mounts,
                   {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "500m", "memory": "256Mi"}}, service_account="swagger-gateway"),
        deployment("swagger-go", "golang:1.24.2-alpine", ["sh", "-ec", "GOTOOLCHAIN=local go build -o /tmp/demo /source/main.go; exec /tmp/demo"], go["metadata"]["name"], go_hash,
                   [{"name": "source", "mountPath": "/source", "readOnly": True}],
                   {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "1", "memory": "512Mi"}}),
        deployment("swagger-java", "eclipse-temurin:21.0.7_6-jdk", ["java", "-XX:MaxRAMPercentage=60", "/source/Demo.java"], java["metadata"]["name"], java_hash,
                   [{"name": "source", "mountPath": "/source", "readOnly": True}],
                   {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "1", "memory": "512Mi"}}),
    ]
    for name, path, title in (("swagger-go", "/swagger/doc.json", "Go demo (demonstration)"),
                              ("swagger-java", "/v3/api-docs", "Java demo (demonstration)")):
        service = resource("Service", name, spec={"selector": {"app": name}, "ports": [{"name": "http", "port": 8080, "targetPort": "http"}]})
        service["metadata"]["labels"] = {"platform.io/swagger.enabled": "true"}
        service["metadata"]["annotations"] = {"platform.io/swagger.path": path, "platform.io/swagger.port": "8080", "platform.io/swagger.title": title}
        resources.append(service)
    gateway_service = resource("Service", "swagger-gateway", spec={"selector": {"app": "swagger-gateway"}, "ports": [{"name": "http", "port": 8080, "targetPort": "http"}]})
    gateway_service["metadata"]["labels"] = {"platform.io/swagger.enabled": "true"}
    gateway_service["metadata"]["annotations"] = {"platform.io/swagger.path": "/openapi.json", "platform.io/swagger.port": "8080", "platform.io/swagger.title": "Swagger Gateway API"}
    resources.append(gateway_service)
    resources.append({"apiVersion": "networking.k8s.io/v1", "kind": "NetworkPolicy", "metadata": {"name": "swagger-gateway-from-argocd", "namespace": NAMESPACE},
                      "spec": {"podSelector": {"matchLabels": {"app": "swagger-gateway"}}, "policyTypes": ["Ingress"],
                               "ingress": [{"from": [{"namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": "argocd"}},
                                                       "podSelector": {"matchLabels": {"app.kubernetes.io/name": "argocd-server"}}},
                                                      {"namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": NAMESPACE}},
                                                       "podSelector": {"matchLabels": {"app": "swagger-gateway"}}}],
                                            "ports": [{"protocol": "TCP", "port": 8080}]}]}})
    # Sources contain no Helm delimiters; keep the embedded code reviewable.
    templates = [yaml.dump(item, Dumper=ManifestDumper, sort_keys=False) for item in resources]
    return {"apiVersion": "argoproj.io/v1alpha1", "kind": "Application", "metadata": {"name": "swagger-gateway", "namespace": "argocd"},
            "spec": {"project": "appset", "source": {"repoURL": "https://bedag.github.io/helm-charts", "chart": "raw", "targetRevision": "2.0.2", "helm": {"valueFiles": ["values.yaml"], "valuesObject": {"templates": templates}}},
                     "destination": {"server": "https://kubernetes.default.svc", "namespace": NAMESPACE},
                     "syncPolicy": {"automated": {"prune": False, "selfHeal": True}, "syncOptions": ["CreateNamespace=true"]}}}


if __name__ == "__main__":
    (ROOT / "application.yaml").write_text(yaml.dump(build(), Dumper=ManifestDumper, sort_keys=False, width=120))
