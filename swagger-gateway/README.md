# Brainstorm — Swagger Discovery Gateway para Argo CD

**Status:** PoC Python implementada; descoberta por Services rotulados
**Data:** 2026-10-23  
**Implementação:** FastAPI + HTTPX, com manifests Kubernetes gerados pelo projeto

## 1. Problema

A plataforma já consegue exibir Swagger UI através do Argo CD Proxy Extension. Cada aplicação hoje exige uma entrada dedicada de proxy, inviável em escala. O Swagger existente usa um `index.html` que configura o documento OpenAPI (`doc.json` ou equivalente) e carrega assets JS/CSS de uma CDN pública. A UI Extension no Top Bar apresenta um botão no contexto da Application; o carregamento provavelmente ocorre por iframe (confirmar no código/DevTools).

**Objetivo:** configurar **um único Argo CD Proxy Extension**, apontando para um Swagger Gateway dedicado, capaz de descobrir publicações OpenAPI de diferentes aplicações e renderizá-las por seleção em um catálogo global.

## 2. Decisões arquiteturais

- Swagger Gateway como Deployment/Service independente do ApplicationSet Generator Plugin, para isolar ciclo de vida, carga, segurança e falhas.
- Contrato HTTP estável e agnóstico à linguagem das aplicações (Go, Java etc.).
- Prototipar em Python (FastAPI + HTTPX); portar depois para Go mantendo endpoints e testes de contrato.
- Preservar a abordagem de `index.html` universal + assets Swagger UI de CDN com versão fixada.
- O navegador deve usar URLs **relativas ao Argo CD**; não expor DNS interno Kubernetes ou redirecionar via HTTP 302 para Service.
- Diferenciar **API lógica** de **publicação** (cluster, namespace, shard/tenant, Service, porta e caminho OpenAPI).
- Descobrir Services Kubernetes em todos os namespaces por um label de opt-in; annotations declaram o caminho e a porta OpenAPI.

## 3. Arquitetura

```text
Argo CD System-Level UI Extension
  ├── Catálogo global (seleção de publicação)
  └── Swagger UI da publicação selecionada (iframe? confirmar)
          |
          v
Argo CD Proxy Extension — configuração única
          |
          v
swagger-gateway.platform.svc:8080
  ├── Catalog API
  ├── Registry / Discovery
  ├── Resolver de publicação
  ├── HTML template (index.html universal)
  ├── OpenAPI spec proxy
  └── API request proxy (Try it out via Service descoberto)
          |
          +--> Go API:   /swagger/doc.json
          +--> Java API: /v3/api-docs
```

## 4. Contrato HTTP proposto

O prefixo público exemplificativo é `/extensions/swagger`. Confirmar como a versão/configuração instalada do Proxy Extension encaminha paths e quais headers exige.

| Método | Rota no gateway | Função |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/api/v1/catalog` | Lista publicações disponíveis |
| GET | `/ui/{publication_id}` | Serve `index.html` universal parametrizado |
| GET | `/specs/{publication_id}` | Resolve e devolve OpenAPI JSON |
| GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD | `/proxy/{publication_id}/{path}` | Encaminha Try it out somente ao Service descoberto para o ID |

Exemplo de catálogo:

```json
{
  "items": [
    {
      "id": "cluster-1:cliente-1:simulacao",
      "application": "simulacao",
      "project": "platform",
      "cluster": "cluster-1",
      "namespace": "cliente-1",
      "tenant": "cliente-1",
      "specUrl": "/extensions/swagger/specs/cluster-1%3Acliente-1%3Asimulacao",
      "uiUrl": "/extensions/swagger/ui/cluster-1%3Acliente-1%3Asimulacao"
    }
  ]
}
```

Identificadores devem ser opacos/validados; URLs públicas são relativas à origem do Argo CD. Evitar dependência de path encoding ambíguo (pode-se preferir IDs curtos opacos).

Registro interno (nunca devolvido integralmente ao browser):

```json
{
  "id": "go-demo",
  "application": "go-demo",
  "project": "platform",
  "cluster": "cluster-1",
  "namespace": "demo",
  "service": "go-demo",
  "port": 8080,
  "specPath": "/swagger/doc.json",
  "upstream": "http://go-demo.demo.svc.cluster.local:8080"
}
```

## 5. Comportamento do navegador

1. A UI Extension consulta o catálogo.
2. Usuário escolhe uma publicação.
3. A UI carrega o `index.html` universal da publicação pelo Argo CD Proxy Extension.
4. O HTML carrega JS/CSS do Swagger UI na CDN pública.
5. O HTML configura Swagger UI com a URL relativa `/extensions/swagger/specs/{id}`.
6. O navegador busca a especificação pelo Argo CD; o gateway resolve a publicação e solicita o JSON ao upstream.
7. O Swagger renderiza a documentação e reescreve chamadas Try it out para o proxy autenticado do Argo CD. O gateway escolhe o upstream pelo ID descoberto; o navegador não controla host nem porta.

A extensão consulta catálogo e HTML com `fetch` autenticado, depois embute o HTML confiável em `iframe.srcdoc`. O HTML usa a origem da janela pai para formar uma URL absoluta da spec, já que `srcdoc` tem URL de documento `about:srcdoc`; o request interceptor preserva essa chamada e reescreve somente operações de API para o proxy, acrescentando os headers de contexto. Um `iframe.src` direto não enviaria os headers exigidos.

## 6. Catálogo por Service opt-in

O gateway consulta `GET /api/v1/services` com o label selector `platform.io/swagger.enabled=true`. A busca abrange todos os namespaces e pagina a resposta da API Kubernetes. Para cada Service válido, deriva um ID opaco estável de namespace/nome; o navegador recebe somente catálogo e URLs relativas ao Argo CD, nunca DNS ou upstream interno.

O próprio Service `swagger-gateway` também participa do catálogo: recebe o mesmo label opt-in, annotation `platform.io/swagger.path: /openapi.json` e porta `8080`. O FastAPI gera esse documento a partir das rotas do gateway, e a UI universal o carrega pelo mesmo proxy autenticado. A NetworkPolicy permite que o pod do gateway consulte seu próprio Service para buscar a spec; o ingresso externo continua limitado ao Argo CD.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments
  namespace: commerce
  labels:
    platform.io/swagger.enabled: "true"
  annotations:
    platform.io/swagger.path: "/v3/api-docs"
    platform.io/swagger.port: "8080"
    platform.io/swagger.title: "Payments API" # opcional
spec:
  ports:
    - name: http
      port: 8080
      targetPort: http
```

O label habilita descoberta. `path` e `port` são obrigatórios; o gateway só aceita caminho relativo seguro, porta numérica presente em `Service.spec.ports` e URLs montadas a partir do DNS Kubernetes desse próprio Service. `title` é opcional e, sem ele, usa o nome do Service. Services incompletos ou com metadados inválidos são ignorados. A descoberta ocorre em cada consulta ao catálogo e ao resolver `/ui` ou `/specs`, portanto alterações aparecem sem reiniciar o gateway.

Para o Service `argocd/argocd-server`, o gateway complementa a especificação Swagger 2.0 com `BearerAuth`. O Swagger UI mostra **Authorize**; informe `Bearer <JWT>`. Como o Proxy Extension do Argo CD remove `Authorization` das requisições encaminhadas, a UI move esse valor para `X-ArgoCD-API-Token`; o gateway o converte de volta para `Authorization` somente no upstream `argocd-server`. Em `curl` manual pela extensão, envie `Authorization: Bearer <JWT>` para autenticar a chamada ao Proxy Extension e `X-ArgoCD-API-Token: Bearer <JWT>` para a API do Argo CD. Cookies de sessão não são encaminhados. Use um token Argo CD com permissões mínimas e validade curta.

O Deployment usa a ServiceAccount `swagger-gateway` vinculada à ClusterRole `swagger-gateway-discovery`, com apenas `list` sobre `services` no API group core. A credencial e a CA projetadas pelo Kubernetes são usadas somente para a API interna. Se o domínio DNS do cluster não for `cluster.local`, configure `KUBERNETES_CLUSTER_DOMAIN` no Deployment do gateway.

Os exemplos Go e Java também usam esse mesmo mecanismo de labels e annotations; não existe registry de upstreams hardcoded.

## 7. Limites de descoberta

A descoberta é de Services do cluster atual; não encontra endpoints de outros clusters. O Service precisa ter endpoints acessíveis pela rede do cluster e a especificação precisa responder no caminho anotado. A descoberta não verifica saúde antecipadamente: erros e timeouts aparecem quando a documentação é solicitada.

## 8. Segurança

- Proxy Extension autentica/autoriza a requisição para o contexto Argo CD; o gateway precisa validar também se a publicação solicitada corresponde ao contexto autorizado.
- O catálogo inclui todos os Services opt-in do cluster para usuários autorizados a invocar o proxy Swagger e acessar a Application do gateway. A autorização atual da PoC limita a invocação ao role admin. Antes de conceder esse acesso a outros grupos, implemente filtragem por identidade/namespace/projeto. ClusterRole de leitura amplia a descoberta do gateway, não as permissões do usuário final.
- Não confiar somente em headers fornecidos pelo navegador como prova de identidade; considerar fronteiras de confiança e eventual verificação server-side.
- Permitir apenas upstreams descobertos e paths permitidos; bloquear URLs arbitrárias e SSRF.
- Timeouts, limite de tamanho de resposta, redirecionamentos controlados e logs sem segredos.
- Try it out requer permissão `extensions, invoke, swagger`; nesta PoC ela é exclusiva de `role:admin`. Métodos POST/PUT/PATCH/DELETE podem alterar dados reais da API. O gateway aceita somente Services opt-in, impõe limites de corpo/tempo/resposta, não segue redirects e não encaminha cookies da sessão Argo CD. Para chamadas ao próprio gateway, ele restaura apenas o contexto fixo exigido por suas rotas; chamadas recursivas ao proxy são recusadas. Antes de conceder acesso a outros usuários, defina autorização por API/tenant e restrições de métodos conforme o ambiente.
- Ajustar `servers` (OpenAPI 3.x) ou `host/basePath/schemes` (Swagger 2.0) somente quando necessário e de maneira controlada.
- CDN versionada e políticas CSP/frame-ancestors compatíveis com a incorporação.

## 9. Estrutura sugerida do protótipo

```text
swagger-gateway/
├── README.md
├── main.py
├── discovery.py
├── registry.py
├── resolver.py
├── proxy.py
├── templates/
│   └── index.html
├── requirements.txt
├── config.yaml
└── tests/
    ├── test_catalog.py
    ├── test_specs.py
    └── test_authorization.py
```

Bibliotecas sugeridas: FastAPI, HTTPX, Jinja2 e, na fase Kubernetes, kubernetes Python client.

## 10. Plano de execução

**Fase 1 — Prova de conceito:** Go e Java publicados como Services demonstrativos; `GET /catalog`, `GET /ui/{id}`, `GET /specs/{id}`; um único `index.html` e CDN; testes de contrato.

**Fase 2 — Integração Argo CD:** configuração única de Proxy Extension; verificar Network do iframe/index/JS/spec; headers, cookies, RBAC, path rewrite, CSP e navegação entre publicações sem editar `argocd-cm`.

**Fase 3 — Evolução da descoberta:** watch/cache para reduzir consultas à API Kubernetes, autorização do catálogo por usuário/projeto e suporte explícito a clusters remotos.

**Fase 4 — Try it out:** roteamento pelo Service descoberto e reescrita same-origin implementados; autorização atual usa o RBAC do Proxy Extension (admin) e ainda não filtra por operação.

**Fase 5 — Go:** reimplementar com `net/http`, `httputil.ReverseProxy`, `client-go`; manter contratos e testes.

## 11. Critérios de aceite do MVP

- Uma única configuração de Proxy Extension atende as duas APIs.
- Go e Java carregam documentação com seus respectivos caminhos OpenAPI.
- O mesmo `index.html` e assets CDN atendem ambas.
- Alternar seleção não exige alteração de configuração no Argo CD.
- Browser não acessa DNS de Services internos.
- Comportamento de autenticação/iframe é demonstrado e documentado, não presumido.
- Erros de API não encontrada, upstream indisponível e acesso negado são distintos.
- O Generator Plugin permanece independente.

## 12. Pendências de investigação

1. Capturar o código real da UI Extension e confirmar iframe vs fetch.
2. Inspecionar o `argocd-cm` atual e as requisições no DevTools.
3. Definir como o catálogo global é autorizado sem Application corrente.
4. Definir acesso do gateway aos clusters remotos.
5. Definir semântica de publicação (API lógica vs instância de shard).
6. Try it out foi habilitado para a PoC; revisar filtragem por operação e identidade antes de ampliar o RBAC.

> **Escopo deste registro:** documentação arquitetural e plano de implementação. Não representa código já desenvolvido ou validado em execução.

## 13. PoC executável (2026-10-23)

As seções anteriores registram a proposta original. A PoC desta pasta implementa a descoberta por labels com dois **upstreams de demonstração**, um programa Go com Swagger 2.0 em `/swagger/doc.json` e um programa Java com OpenAPI 3.0.3 em `/v3/api-docs`. Ambos servem HTTP real, sem frameworks ou bibliotecas externas. Não representam serviços existentes da plataforma. O namespace efetivo é `swagger-gateway`.

As publicações pertencem à Application Argo CD `argocd:swagger-gateway`, projeto `appset`. O catálogo é acessado pelo contexto fixo da extensão `argocd:swagger-gateway` / projeto `appset`; fora dele, o gateway devolve 403. Dentro desse contexto, lista Services opt-in de todos os namespaces do cluster atual. A autorização de usuário continua no Argo CD: só conceda `extensions, invoke, swagger` e acesso à Application do gateway a usuários autorizados a ver todo esse catálogo. Try it out encaminha chamadas somente para Services descobertos e está sujeito à mesma autorização RBAC do Proxy Extension. Não oferece descoberta de outros clusters.

### Gerar e verificar os artefatos

A partir da raiz deste repositório:

```sh
python3 -m venv /tmp/swagger-gateway-venv
/tmp/swagger-gateway-venv/bin/pip install -r swagger-gateway/requirements-dev.txt
/tmp/swagger-gateway-venv/bin/python swagger-gateway/build_application.py
/tmp/swagger-gateway-venv/bin/python -m pytest swagger-gateway/tests -q
```

`build_application.py` gera `application.yaml` de forma determinística. Todas as fontes ficam em ConfigMaps legíveis dentro de `spec.source.helm.valuesObject.templates`; não há checkout Git no boot. O gerador recusa fontes contendo `{{`, que colidiriam com `tpl` do Helm. Cada Deployment inclui checksum das suas fontes para provocar rollout quando o código muda. Regere o manifesto sempre que alterar código, dependências ou HTML.

O chart é `raw` **2.0.2** do Bedag; `valueFiles: [values.yaml]` usa os defaults do próprio chart, com `valuesObject` fornecendo os recursos. Para renderizar os mesmos recursos localmente:

```sh
/tmp/swagger-gateway-venv/bin/python - <<'PY'
from pathlib import Path
import yaml
application = yaml.safe_load(Path('swagger-gateway/application.yaml').read_text())
Path('/tmp/swagger-gateway-values.yaml').write_text(yaml.safe_dump(application['spec']['source']['helm']['valuesObject']))
PY
helm template swagger-gateway raw --repo https://bedag.github.io/helm-charts \
  --version 2.0.2 --namespace swagger-gateway \
  -f /tmp/swagger-gateway-values.yaml > /tmp/swagger-gateway-rendered.yaml
kubectl apply --dry-run=server -f /tmp/swagger-gateway-rendered.yaml
```

O dry-run de recursos namespaced pressupõe que o namespace já exista. Para uma primeira instalação, valide/aplique o Application e deixe o Argo CD criar o namespace antes do dry-run completo. O manifesto também cria a ClusterRole e ClusterRoleBinding de discovery; confirme que o AppProject `appset` permite esses recursos cluster-scoped.

### Aplicar no Argo CD

Pré-requisitos: contexto correto (`k3d-dev` na validação original), Argo CD 3.5.1 no namespace `argocd`, projeto `appset` permitindo o chart/destino/recursos, acesso à CDN no navegador e acesso a registries/PyPI no cluster.

```sh
kubectl apply --dry-run=server -f swagger-gateway/application.yaml
kubectl apply -f swagger-gateway/application.yaml
kubectl patch configmap argocd-cm -n argocd --type merge \
  --patch-file swagger-gateway/argocd-proxy.patch.yaml
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge \
  --patch-file swagger-gateway/argocd-params.patch.yaml
kubectl patch configmap argocd-rbac-cm -n argocd --type merge \
  --patch-file swagger-gateway/argocd-rbac.patch.yaml
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout status deployment/argocd-server -n argocd --timeout=180s
kubectl get application swagger-gateway -n argocd
kubectl get deployments,pods,services,networkpolicies -n swagger-gateway
```

Os patches usam merge de chaves dedicadas: `extension.config.swagger` em `argocd-cm`, `server.enable.proxy.extension` em `argocd-cmd-params-cm` e `policy.swagger.csv` em `argocd-rbac-cm`. Preservam as outras entradas e integrações. A regra RBAC concede apenas a `role:admin` a operação `extensions, invoke, swagger`, que exige autorização explícita mesmo para administradores. A configuração proxy contém apenas um backend, o Service do gateway. Argo CD remove `/extensions/swagger` antes de encaminhar ao gateway.

O sync automatizado habilita self-heal e **não** habilita prune. O manifesto cria Namespace, ConfigMaps, três Deployments, três Services, uma NetworkPolicy, uma ServiceAccount, uma ClusterRole e um ClusterRoleBinding. Só o gateway recebe token projetado; a ClusterRole permite apenas listar Services. Remover o Application não faz limpeza em cascata automática.

### Depuração por port-forward

```sh
kubectl port-forward -n swagger-gateway service/swagger-gateway 18088:8080
```

Em outro terminal:

```sh
curl --fail http://127.0.0.1:18088/healthz
curl --fail -H 'Argocd-Application-Name: argocd:swagger-gateway' \
  -H 'Argocd-Project-Name: appset' http://127.0.0.1:18088/api/v1/catalog
curl --fail -H 'Argocd-Application-Name: argocd:swagger-gateway' \
  -H 'Argocd-Project-Name: appset' http://127.0.0.1:18088/specs/go-demo
curl --fail -H 'Argocd-Application-Name: argocd:swagger-gateway' \
  -H 'Argocd-Project-Name: appset' http://127.0.0.1:18088/specs/java-demo
curl -i http://127.0.0.1:18088/api/v1/catalog
```

O último comando deve retornar 403. O port-forward é acesso administrativo e permite fornecer o contexto manualmente; **não é evidência de autenticação pelo Argo CD**. `/healthz` independe de contexto para permitir probes.

### Abrir no Argo CD autenticado

Entre normalmente na interface do Argo CD com um usuário autorizado a `applications, get` para `appset/swagger-gateway` e `extensions, invoke` para `swagger` (administrador atende para a PoC). Abra DevTools → Console e cole o conteúdo de [`bootstrap.js`](bootstrap.js). Um diálogo mostra o seletor das duas publicações e a mesma Swagger UI universal. Alternar a seleção não muda `argocd-cm`.

O bootstrap primeiro faz `fetch` autenticado do catálogo e do HTML com os dois headers de contexto e `credentials: same-origin`, depois atribui o HTML a `iframe.srcdoc`. Um `iframe.src` direto não fornece headers e não funciona para o HTML protegido. Como `srcdoc` usa `about:srcdoc` como URL do documento, o HTML constrói uma URL absoluta para a spec com `parent.location.origin`; o `requestInterceptor` mantém essa URL da spec e reescreve somente operações para `/extensions/swagger/proxy/{id}/...`, acrescentando os headers de contexto e mantendo a sessão same-origin. JS/CSS vêm de `swagger-ui-dist@5.19.0` via jsDelivr; essa versão reconhece `openapi: 3.0.4`. Try it out está habilitado para GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD; `validatorUrl: null` evita envio a um validador externo.

No painel Network, confirme catálogo, HTML e spec sob a origem Argo CD em `/extensions/swagger`; nenhum fetch da spec deve ir ao DNS Kubernetes. Confira também as duas versões (Swagger 2 / OpenAPI 3) renderizadas. Se houver CSP própria na instalação, ela precisa permitir os assets CDN e o iframe `srcdoc`; esta PoC não altera CSP da instalação.

### Fronteira de confiança e limitações

- Headers de contexto não provam identidade. A autenticação e autorização são feitas pelo Proxy Extension Argo CD. A NetworkPolicy permite ingresso ao gateway na porta 8080 de pods `app.kubernetes.io/name=argocd-server` no namespace `argocd` e do próprio pod do gateway; namespaceSelector e podSelector estão no mesmo peer. A proteção pressupõe CNI com enforcement de NetworkPolicy e controle de quem pode criar/rotular pods no namespace Argo CD. Probes do kubelet e port-forward administrativo não são prova dessa fronteira.
- O gateway só cria upstreams de Services descobertos com o label opt-in; nunca aceita URL do navegador. Caminho e porta são validados e o hostname deriva de nome/namespace retornados pela API Kubernetes. Timeout de conexão de 2 segundos e de I/O de 5 segundos, docs limitadas a 1 MiB e chamadas limitadas a 1 MiB de request e 5 MiB de response; chamadas pedem `Accept-Encoding: identity`, mas respostas gzip aceitas pelo HTTPX são descomprimidas durante o streaming e os limites se aplicam ao corpo descomprimido. O gateway não segue redirects e não encaminha cookies, Host ou Origin. Headers de contexto Argo CD são removidos para APIs descobertas externas e só o contexto fixo é reintroduzido quando o upstream é o próprio gateway. Erros de upstream retornam 502 ou 504 sem URL interna. Isso é validação mínima de estrutura, não um validador OpenAPI completo.
- Catálogo omite upstream e DNS interno. As specs de demonstração também não contêm endereços internos. Não há sanitização geral de documentos arbitrários ou autorização por tenant.
- Instalar Python packages e compilar Go/Java no boot é concessão da PoC. O cluster precisa acessar PyPI/registries; startup probes toleram até dez minutos. Dependências Python diretas, imagens e assets CDN têm versões fixadas; não há lock completo com hashes para dependências transitivas nem imagens por digest. Para produção, construir imagens próprias e revisar dependências.
- UI/HTML são confiáveis e executam no contexto da origem Argo CD via `srcdoc`. Não carregar HTML de upstreams ou aceitar templates arbitrários nesse fluxo. A CDN precisa ser confiável; não há integridade SRI nesta PoC.
- Não foi criada uma nova Top Bar UI Extension. O snippet de console demonstra o mecanismo; integração visual permanente fica para uma etapa posterior. O shards-generator permanece independente.

Os testes automatizados cobrem autorização, descoberta por label, paginação, validação de caminho/porta, catálogo, os dois formatos e HTML, IDs inválidos, upstream indisponível/timeout/redirect/inválido/grande e geração determinística. Evidência de cluster e de autenticação pelo Proxy Extension deve ser registrada separadamente da inspeção visual no navegador.

### Evidência de execução — 2026-10-23

- Instalado no contexto `k3d-dev`, Application `argocd/swagger-gateway`, projeto `appset`; os três Deployments ficaram disponíveis e a Application atingiu `Synced / Healthy`.
- Helm `raw:2.0.2` renderizou 11 recursos na instalação inicial. Os 37 testes de contrato passaram, incluindo recusa de respostas comprimidas antes da leitura.
- Com sessão autenticada pelo Argo CD: catálogo, HTML e spec das duas publicações retornaram 200 através de `/extensions/swagger`. As specs identificaram Swagger 2.0 (Go) e OpenAPI 3.0.3 (Java).
- Sem cookie de autenticação: 400 `Auth cookie not found`. Com autenticação, sem headers de contexto: 400. ID desconhecido com contexto autorizado: 404. Um pod Go fora do peer permitido pela NetworkPolicy não conseguiu acessar diretamente o gateway, enquanto o proxy Argo CD conseguiu.
- A permissão explícita `extensions, invoke, swagger` foi necessária inclusive para `role:admin` nesta instalação; está no patch RBAC dedicado.
- **Inspeção visual pendente:** nenhum navegador estava disponível nesta sessão. HTML e endpoints foram verificados por HTTP; renderização da CDN, seletor e `iframe.srcdoc` devem ser conferidos com o bootstrap acima. Não há evidência visual de funcionamento do iframe nesta entrega.

### Evidência de execução — Discovery por labels (2026-10-24)

- Application `argocd/swagger-gateway` sincronizada e saudável após a atualização; 14 recursos foram renderizados e passaram pelo dry-run server.
- ServiceAccount `swagger-gateway` pode `list services` em todos os namespaces. Verificações negativas confirmaram que não pode `get services` individualmente nem listar Pods.
- `swagger-go` e `swagger-java` optaram pelo catálogo com `platform.io/swagger.enabled=true`; o catálogo trouxe as duas publicações com IDs estáveis derivados de namespace/nome. A sessão Argo CD obteve catálogo, páginas UI e specs 200 pelo Proxy Extension. Formatos conferidos: Swagger 2.0 e OpenAPI 3.0.3.
- Os 43 testes de contrato passaram. A cobertura inclui paginação da API Kubernetes, falhas de descoberta, filtro de Services sem label, validação de caminho e porta e proteção contra upstream não permitido.
- Descoberta continua restrita ao cluster atual. Usuários com acesso ao Proxy Extension Swagger podem ver todos os Services opt-in; conceder essa permissão apenas a identidades autorizadas para o catálogo completo.

### Evidência de execução — API do próprio gateway (2026-10-24)

- O Service `swagger-gateway` foi adicionado ao catálogo via label e aponta para a spec gerada pelo FastAPI em `/openapi.json`, com título `Swagger Gateway` e versão `0.1.0`.
- A Application atingiu `Synced / Healthy`, e o rollout do Deployment concluiu. O catálogo autenticado pelo Proxy Extension retornou três APIs; a spec OpenAPI 3.1 e o HTML da Swagger UI para o próprio gateway retornaram 200.
- O smoke test autenticado confirmou que catálogo, spec e HTML passam pelo Argo CD Proxy Extension. A sessão sem cookie e a sessão sem headers de contexto foram rejeitadas (400).
- A Swagger UI universal consegue renderizar o OpenAPI do gateway pelo mesmo fluxo das APIs Go e Java. Inspeção visual do iframe no navegador ainda depende da sessão manual descrita acima.

### Evidência de execução — Try it out (2026-10-24)

- Try it out habilitado para GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD. O request interceptor reescreve URLs para o proxy same-origin da extensão, que resolve o Service pelo ID do catálogo, limita corpo e resposta e remove cookies/contexto Argo CD antes de encaminhar.
- Uma chamada `GET /hello` à API Go de demonstração retornou `200 Hello from Go demo` através da sessão autenticada do Argo CD e da rota `/extensions/swagger/proxy/{id}/hello`.
- Os 55 testes passaram, cobrindo encaminhamento de método/query/body e Authorization, remoção do cookie de sessão, contexto fixo na chamada ao próprio gateway, recusa de recursão, IDs desconhecidos, tentativa de traversal e limites de payload.
- POST/PUT/PATCH/DELETE podem alterar dados reais. Atualmente, o RBAC restringe a invocação do Proxy Extension a `role:admin`; limitar por identidade/API/operação segue como requisito antes de ampliar o acesso.

### Evidência de execução — Try it out da API do gateway

- O `403 Forbidden context` ao testar `GET /api/v1/catalog` na publicação do gateway vinha da chamada interna ao próprio Service: o proxy removia os headers Argo CD antes de encaminhar, e a rota de catálogo exige contexto. O gateway agora restaura somente seu contexto fixo nessa chamada específica e rejeita chamadas recursivas ao endpoint `/proxy`.
- Repetição autenticada da mesma rota `/extensions/swagger/proxy/995e7c8eabdb8caefb190e3e0966e04a/api/v1/catalog` retornou 200 com o catálogo de três APIs. A autenticação da sessão Argo CD continua obrigatória; os headers `Argocd-Application-Name` e `Argocd-Project-Name` sozinhos não autenticam o `curl`.

Contrato de proxy conferido no [código oficial Argo CD v3.5.1](https://github.com/argoproj/argo-cd/blob/v3.5.1/server/extension/extension.go) e na [documentação da mesma versão](https://github.com/argoproj/argo-cd/blob/v3.5.1/docs/developer-guide/extensions/proxy-extensions.md).
