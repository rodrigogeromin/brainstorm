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
