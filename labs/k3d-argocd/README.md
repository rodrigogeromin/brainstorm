# Argo CD lab on k3d

Creates one Kubernetes v1.35.9 k3d cluster with one server and two agents on the existing `k3d-lab` Docker network. k3s provides Traefik; k3d's load balancer publishes HTTP on host port 8080.

```sh
k3d cluster create --config k3d.yaml
kubectl config use-context k3d-argocd-lab
kubectl create namespace argocd
kubectl apply --server-side --force-conflicts -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl rollout status deployment/argocd-server -n argocd --timeout=5m
kubectl apply -f argocd-http.yaml
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout status deployment/argocd-server -n argocd --timeout=5m
```

Open <http://argocd.localhost:8080>. Get the initial `admin` password with:

```sh
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
```

The initial password is stored in Kubernetes Secret `argocd-initial-admin-secret`. This lab exposes Argo CD over plain HTTP and should only be used on a trusted local machine.

## Swagger Petstore fixture

[`petstore-application.yaml`](petstore-application.yaml) deploys the public [Swagger Petstore project](https://github.com/swagger-api/swagger-petstore) from the pinned `swaggerapi/petstore3:1.0.28` image as the Argo CD Application `swagger-petstore`. Its Service opts into the Swagger Gateway catalog and points discovery at `/api/v3/openapi.json`. `appset-project.yaml` allows this Application to deploy into the `petstore` namespace.

Apply it to the Argo CD cluster:

```sh
kubectl config use-context k3d-argocd-lab
kubectl apply -f appset-project.yaml
kubectl apply -f petstore-application.yaml
kubectl get application swagger-petstore -n argocd
kubectl rollout status deployment/swagger-petstore -n petstore --timeout=180s
```

The Proxy Extension catalog and manual browser validation flow are documented in [`swagger-gateway/README.md`](../../swagger-gateway/README.md#abrir-no-argo-cd-autenticado). The `bootstrap.js` snippet opens the catalog UI for the signed-in Argo CD session.

## Remote worker clusters

Create two additional Kubernetes v1.35.9 single-node k3d clusters on the same Docker network. Their K3s server nodes are schedulable and accept workloads from Argo CD.

```sh
k3d cluster create --config workers/worker-1.yaml --wait
k3d cluster create --config workers/worker-2.yaml --wait
bash register-workers.sh
```

The script creates an `argocd-manager` service account and cluster-admin binding on each worker, then creates labeled Argo CD cluster Secrets in the `argocd` namespace. It discovers each worker load balancer's Docker IP and uses that internal network endpoint. Kubernetes API TLS verification is skipped for these dynamically addressed lab endpoints; traffic remains inside the Docker network. Re-run the script after recreating either worker cluster so its Secret uses the new address and token.

### Example ApplicationSet

[`workers/guestbook-applicationset.yaml`](workers/guestbook-applicationset.yaml) deploys the upstream Argo CD Guestbook example to every cluster Secret labeled `lab.k3d.io/role=worker`, using the `default` AppProject. Register workers with `register-workers.sh` to add this label. The ApplicationSet creates `worker-1-guestbook` and `worker-2-guestbook` from [`argocd-example-apps/guestbook`](https://github.com/argoproj/argocd-example-apps/tree/master/guestbook).

```sh
kubectl --context k3d-argocd-lab apply -f workers/guestbook-applicationset.yaml
kubectl --context k3d-argocd-lab get applicationset worker-guestbook -n argocd
kubectl --context k3d-argocd-lab get applications -n argocd
```

The registration script requires `docker`, `kubectl`, `jq`, and `base64` on the host.

On this Docker host, the default inotify instance limit (128) prevented additional K3s servers from starting. The temporary host-level limit is 1024. For a fresh host with the same default, raise it from the privileged main k3d server before creating the workers:

```sh
docker exec k3d-argocd-lab-server-0 sysctl -w fs.inotify.max_user_instances=1024
```
