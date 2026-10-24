# Brainstorm — Swagger Discovery Gateway para Argo CD

**Status:** proposta / MVP planejado  
**Data:** 2026-10-23  
**Implementação:** protótipo Python, evolução para Go

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
- Começar com registry estático de duas APIs (Go e Java); evoluir para discovery Kubernetes por annotations/labels.

## 3. Arquitetura

```text
Argo CD Top Bar UI Extension
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
  └── API request proxy (fase posterior / Try it out)
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
| ANY | `/proxy/{publication_id}/{path}` | Opcional: Try it out com autorização própria |

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
7. O Swagger renderiza a documentação; o Try it out só é habilitado depois de tratar autenticação, URL pública e permissões.

**Ponto ainda não validado:** um iframe comum não adiciona headers customizados à navegação inicial. Confirmar no DevTools como a implementação atual carrega o HTML e como envia `Argocd-Application-Name` e `Argocd-Project-Name`. Não assumir que um `iframe.src` direto funcionará. A estratégia de bootstrap pode precisar preservar o mecanismo atual ou usar outra forma de renderização autorizada.

## 6. Registry estático do MVP

```python
REGISTRY = {
    "go-demo": {
        "application": "go-demo",
        "project": "platform",
        "upstream": "http://localhost:8081",
        "spec_path": "/swagger/doc.json"
    },
    "java-demo": {
        "application": "java-demo",
        "project": "platform",
        "upstream": "http://localhost:8082",
        "spec_path": "/v3/api-docs"
    }
}
```

No MVP, o gateway consulta apenas os paths registrados. A migração para Kubernetes discovery não deve mudar o contrato externo.

## 7. Discovery Kubernetes (fase 2)

Convenção declarativa no Service:

```yaml
metadata:
  labels:
    platform.io/application: simulacao
  annotations:
    platform.io/openapi.enabled: "true"
    platform.io/openapi.path: "/v3/api-docs"
    platform.io/openapi.port: "8080"
```

Discovery via list/watch com RBAC mínimo. Resolver cluster/namespace/Service/porta/path. **Não presumir que DNS `.svc` de outro cluster é acessível**: usar conectividade mesh/ingress ou estratégia explícita de acesso remoto. A presença do Service não prova que o endpoint OpenAPI esteja saudável.

## 8. Segurança

- Proxy Extension autentica/autoriza a requisição para o contexto Argo CD; o gateway precisa validar também se a publicação solicitada corresponde ao contexto autorizado.
- Catálogo global não deve expor automaticamente todas as APIs: definir modelo de identidade e filtragem por autorização.
- Não confiar somente em headers fornecidos pelo navegador como prova de identidade; considerar fronteiras de confiança e eventual verificação server-side.
- Permitir apenas upstreams descobertos e paths permitidos; bloquear URLs arbitrárias e SSRF.
- Timeouts, limite de tamanho de resposta, redirecionamentos controlados e logs sem segredos.
- Separar **ler OpenAPI** de **executar Try it out**, especialmente métodos mutáveis.
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

**Fase 1 — Prova de conceito:** registry estático Go/Java; `GET /catalog`, `GET /ui/{id}`, `GET /specs/{id}`; um único `index.html` e CDN; testes de contrato.

**Fase 2 — Integração Argo CD:** configuração única de Proxy Extension; verificar Network do iframe/index/JS/spec; headers, cookies, RBAC, path rewrite, CSP e navegação entre publicações sem editar `argocd-cm`.

**Fase 3 — Discovery real:** Kubernetes list/watch, metadados de Service, multicluster, tenant/shard, cache e health checks.

**Fase 4 — Try it out:** roteamento de chamadas, reescrita de servers, identidade e autorização explícita por operação.

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
6. Decidir se o MVP precisa apenas visualizar docs ou incluir Try it out.

> **Escopo deste registro:** documentação arquitetural e plano de implementação. Não representa código já desenvolvido ou validado em execução.

## 13. PoC executável (2026-10-23)

As seções anteriores registram a proposta original. A PoC desta pasta implementa a fase estática com dois **upstreams de demonstração**, um programa Go com Swagger 2.0 em `/swagger/doc.json` e um programa Java com OpenAPI 3.0.3 em `/v3/api-docs`. Ambos servem HTTP real, sem frameworks ou bibliotecas externas. Não representam serviços existentes da plataforma. O namespace efetivo é `swagger-gateway`.

Ambas as publicações pertencem à Application Argo CD `argocd:swagger-gateway`, projeto `appset`. O catálogo não é global: só atende esse contexto fixo, fornecido nos headers `Argocd-Application-Name` e `Argocd-Project-Name`. O gateway devolve 403 antes de resolver catálogo/UI/spec quando o contexto está ausente ou incorreto. Não existe discovery Kubernetes, acesso a outros clusters ou endpoint de execução de APIs nesta versão.

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

O dry-run de recursos namespaced pressupõe que o namespace já exista. Para uma primeira instalação, valide/aplique o Application e deixe o Argo CD criar o namespace antes do dry-run completo.

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

O sync automatizado habilita self-heal e **não** habilita prune. O manifesto cria Namespace, três ConfigMaps, três Deployments, três Services e uma NetworkPolicy, sem RBAC Kubernetes e sem montagem de token de ServiceAccount. Remover o Application não faz limpeza em cascata automática.

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

O bootstrap primeiro faz `fetch` autenticado do catálogo e do HTML com os dois headers de contexto e `credentials: same-origin`, depois atribui o HTML a `iframe.srcdoc`. Um `iframe.src` direto não fornece headers e não funciona para o HTML protegido. O documento `srcdoc` herda a origem Argo CD; `requestInterceptor` acrescenta os headers ao fetch da spec. JS/CSS vêm de `swagger-ui-dist@5.17.14` via jsDelivr. `supportedSubmitMethods: []` desabilita Try it out e `validatorUrl: null` evita envio a um validador externo.

No painel Network, confirme catálogo, HTML e spec sob a origem Argo CD em `/extensions/swagger`; nenhum fetch da spec deve ir ao DNS Kubernetes. Confira também as duas versões (Swagger 2 / OpenAPI 3) renderizadas. Se houver CSP própria na instalação, ela precisa permitir os assets CDN e o iframe `srcdoc`; esta PoC não altera CSP da instalação.

### Fronteira de confiança e limitações

- Headers de contexto não provam identidade. A autenticação e autorização são feitas pelo Proxy Extension Argo CD. A NetworkPolicy permite ingresso ao gateway na porta 8080 somente de pods `app.kubernetes.io/name=argocd-server` no namespace `argocd`; namespaceSelector e podSelector estão no mesmo peer. A proteção pressupõe CNI com enforcement de NetworkPolicy e controle de quem pode criar/rotular pods no namespace Argo CD. Probes do kubelet e port-forward administrativo não são prova dessa fronteira.
- Registry estático aceita só `go-demo`/`java-demo`, nunca URL fornecida pelo usuário. Timeout de conexão de 2 segundos e de I/O de 5 segundos, resposta limitada a 1 MiB; solicita `Accept-Encoding: identity` e rejeita qualquer `Content-Encoding` diferente de ausente/`identity` antes de ler o corpo, impedindo descompressão de payloads comprimidos, redirects recusados, documentos JSON exigindo Swagger 2.0/OpenAPI 3, `info` e `paths`. Erros de upstream retornam 502 ou 504 sem URL interna. Isso é validação mínima de estrutura, não um validador OpenAPI completo.
- Catálogo omite upstream e DNS interno. As specs de demonstração também não contêm endereços internos. Não há sanitização geral de documentos arbitrários ou autorização por tenant.
- Instalar Python packages e compilar Go/Java no boot é concessão da PoC. O cluster precisa acessar PyPI/registries; startup probes toleram até dez minutos. Dependências Python diretas, imagens e assets CDN têm versões fixadas; não há lock completo com hashes para dependências transitivas nem imagens por digest. Para produção, construir imagens próprias e revisar dependências.
- UI/HTML são confiáveis e executam no contexto da origem Argo CD via `srcdoc`. Não carregar HTML de upstreams ou aceitar templates arbitrários nesse fluxo. A CDN precisa ser confiável; não há integridade SRI nesta PoC.
- Não foi criada uma nova Top Bar UI Extension. O snippet de console demonstra o mecanismo; integração visual permanente fica para uma etapa posterior. O shards-generator permanece independente.

Os testes automatizados cobrem autorização, catálogo, os dois formatos e HTML, IDs inválidos, upstream indisponível/timeout/redirect/inválido/grande e geração determinística. Evidência de cluster e de autenticação pelo Proxy Extension deve ser registrada separadamente da inspeção visual no navegador.

### Evidência de execução — 2026-10-23

- Instalado no contexto `k3d-dev`, Application `argocd/swagger-gateway`, projeto `appset`; os três Deployments ficaram disponíveis e a Application atingiu `Synced / Healthy`.
- Helm `raw:2.0.2` renderizou 11 recursos; dry-run server do Application e de todos os recursos passou. Os 37 testes de contrato passaram, incluindo recusa de respostas comprimidas antes da leitura.
- Com sessão autenticada pelo Argo CD: catálogo, HTML e spec das duas publicações retornaram 200 através de `/extensions/swagger`. As specs identificaram Swagger 2.0 (Go) e OpenAPI 3.0.3 (Java).
- Sem cookie de autenticação: 400 `Auth cookie not found`. Com autenticação, sem headers de contexto: 400. ID desconhecido com contexto autorizado: 404. Um pod Go fora do peer permitido pela NetworkPolicy não conseguiu acessar diretamente o gateway, enquanto o proxy Argo CD conseguiu.
- A permissão explícita `extensions, invoke, swagger` foi necessária inclusive para `role:admin` nesta instalação; está no patch RBAC dedicado.
- **Inspeção visual pendente:** nenhum navegador estava disponível nesta sessão. HTML e endpoints foram verificados por HTTP; renderização da CDN, seletor e `iframe.srcdoc` devem ser conferidos com o bootstrap acima. Não há evidência visual de funcionamento do iframe nesta entrega.

Contrato de proxy conferido no [código oficial Argo CD v3.5.1](https://github.com/argoproj/argo-cd/blob/v3.5.1/server/extension/extension.go) e na [documentação da mesma versão](https://github.com/argoproj/argo-cd/blob/v3.5.1/docs/developer-guide/extensions/proxy-extensions.md).
