#!/usr/bin/env bash
set -euo pipefail

master_context="k3d-argocd-lab"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

for name in worker-1 worker-2; do
  context="k3d-${name}"
  kubectl --context "$context" apply -f "$script_dir/workers/worker-access.yaml"

  token=""
  for _ in $(seq 1 30); do
    token="$(kubectl --context "$context" -n kube-system get secret argocd-manager-token -o jsonpath='{.data.token}' | base64 --decode 2>/dev/null || true)"
    [[ -n "$token" ]] && break
    sleep 1
  done
  if [[ -z "$token" ]]; then
    echo "Service account token was not populated for ${name}" >&2
    exit 1
  fi

  endpoint_ip="$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "k3d-${name}-serverlb")"
  if [[ -z "$endpoint_ip" ]]; then
    echo "Could not find the Docker network address for ${name}" >&2
    exit 1
  fi
  config="$(jq -cn --arg token "$token" '{bearerToken:$token,tlsClientConfig:{insecure:true}}')"

  kubectl --context "$master_context" -n argocd create secret generic "cluster-${name}" \
    --from-literal="name=${name}" \
    --from-literal="server=https://${endpoint_ip}:6443" \
    --from-literal="config=${config}" \
    --dry-run=client -o yaml \
    | kubectl --context "$master_context" apply -f -
  kubectl --context "$master_context" -n argocd label secret "cluster-${name}" \
    argocd.argoproj.io/secret-type=cluster \
    argocd.argoproj.io/auto-label-cluster-info=true \
    lab.k3d.io/role=worker \
    platform.io/swagger-gateway=enabled --overwrite
done
