---
title: Swagger Gateway PoC no Argo CD
type: feature
ticket: ''
created: '2026-10-23'
status: built
baseline_revision: c8de311e77ff6590f98f7f81b71ad1aa4df0ad01
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: [swagger-gateway/README.md]
---

<frozen-after-approval reason="Escopo autorizado pelo usuário: criar e aplicar Application da PoC">

## Intent

Implementar a PoC descrita em swagger-gateway/README.md e um Application Argo CD autocontido, usando chart raw 2.0.2 do repositório Bedag, projeto appset, destino in-cluster. O usuário autorizou expressamente aplicar o Application. O trabalho é avulso na pasta swagger-gateway existente.

## Boundaries & Constraints

Gateway independente do shards-generator, em namespace swagger-gateway, Python FastAPI/HTTPX, registry estático, catálogo e UI universal com Swagger UI CDN versionada. Dois upstreams demonstráveis locais: pequena API Go em /swagger/doc.json e Java em /v3/api-docs; registrar explicitamente que são demonstrações. Sem Try it out nem discovery dinâmico nesta fase. Nenhuma dependência de checkout Git remoto para instalar: fontes em ConfigMaps dentro de spec.source.helm.valuesObject.templates. Instalar pacotes no boot é aceitável para esta PoC, conforme modelo fornecido.

Uma única integração /extensions/swagger no Argo CD 3.5.1. Preservar configuração existente. Gateway deve verificar contexto fixo argocd:swagger-gateway / appset; ambas as publicações pertencem à mesma Application de demonstração. Restringir tráfego de entrada no gateway ao argocd-server por NetworkPolicy; sem confiar em headers de clientes arbitrários. Catálogo não inclui upstream/DNS interno. IDs simples, upstreams fixos, sem URL fornecida por usuário, timeout, limite de resposta, sem redirects. Health independente de contexto.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Catálogo | Contexto autorizado | 200, duas publicações, URLs relativas, sem upstream |
| Documentação | ID Go ou Java | UI universal e spec 200 com formatos Swagger 2 / OpenAPI 3 |
| Contexto ausente/incorreto | Catálogo/spec/UI | 403 |
| ID inválido/desconhecido | Contexto válido | 404 |
| Upstream indisponível/redirect/inválido/grande | Spec | 502 ou 504, sem divulgar URL interna |

</frozen-after-approval>

## Code Map

- swagger-gateway/README.md: arquitetura e critérios já lidos; manter histórico e acrescentar instruções executáveis e limitações.
- swagger-gateway/main.py, requirements.txt, templates/index.html: novos gateway e UI. HTML precisa funcionar via fetch autenticado + iframe srcdoc; navegação inicial não pode depender de headers num iframe.src. Swagger requestInterceptor envia headers de contexto em specs. Fornecer snippet de console no Argo CD para bootstrap sem nova UI Extension.
- swagger-gateway/demo/: fontes mínimas Go/Java que servem docs reais por HTTP, nenhum acesso externo.
- swagger-gateway/build_application.py: gerar application.yaml determinístico; incorporar código/config/fontes; checksum de código no Pod para rollout; evitar colisão de delimitadores Helm/Jinja.
- swagger-gateway/tests/: testes de contrato incluindo MockTransport para falhas de upstream.
- swagger-gateway/application.yaml: Application completo com Namespace, ConfigMaps, Deployments, Services, NetworkPolicy; sync automatizado para instalação autorizada, sem prune destrutivo.
- Cluster observado: contexto k3d-dev, projeto appset permissivo, Argo CD v3.5.1, sem proxy configurado. Operador principal fará patches de integração e aplicação depois de validar artefatos.

## Tasks & Acceptance

- [x] Implementar gateway, HTML universal, dependências fixadas e testes para matriz acima.
- [x] Criar demos Go/Java autocontidas e recursos com probes, requests/limits e sem RBAC de Kubernetes.
- [x] Gerar Application conforme modelo fornecido e validar renderização Helm raw 2.0.2.
- [x] Documentar aplicação, port-forward, acesso via Argo CD e limites de autorização da PoC.
- [x] Operador principal: aplicar Application, configurar proxy preservando ConfigMaps, aguardar Synced/Healthy e testar catálogo/spec/UI no cluster.

Given o manifesto, when aplicado em argocd, then Argo CD cria os recursos e os três Deployments ficam disponíveis. Given duas publicações no mesmo catálogo, when selecionadas, then usam um único gateway e a mesma UI, sem alterar argocd-cm. Given acesso pelo Argo CD autenticado com os headers obrigatórios, when buscar catálogo/spec, then responde; sem autenticação deve ser recusado. Given acesso direto port-forward para depuração, when enviar contexto correto, then funciona, mas esse acesso administrativo não constitui prova de autenticação Argo CD.

## Implementation Notes

Gateway estático, demos Go/Java, Application raw e três patches Argo CD implementados. Mantida autorização no contexto da Application de demonstração e NetworkPolicy. Revisão quick concluída com um achado corrigido; sem achados de código pendentes. Integração visual permanente e discovery continuam fora do escopo desta PoC; inspeção visual não pôde ser executada por ausência de navegador.

Autorização de execução e aplicação já fornecida pelo usuário; sem checkpoint adicional. A implementação por subagente está autorizada pelas instruções da skill bmad-build. Alterações de cluster permanecem com o operador principal.

## Plan Change Log

## Review Triage Log

- medium / patch: HTTPX descomprimia o chunk antes do limite de 1 MiB, permitindo uso excessivo de memória. Confirmado pelo revisor com gzip expandindo a 16 MiB. Corrigido solicitando identity e recusando Content-Encoding antes da leitura; cinco casos de regressão verificam corpo não consumido e stream fechado.

## Verification

- 37 testes passaram após a correção. Helm raw 2.0.2 renderizou 11 recursos; dry-run server passou. Application aplicado e integração proxy/RBAC configurada por merge patches dedicados.
- Primeiro teste integrado: Synced/Healthy; catálogo, HTML e specs de Go/Java 200 via Argo CD autenticado. Ausência de cookie/contexto recusada com 400; ID desconhecido 404. Outro pod teve acesso direto ao gateway recusado.
- Navegador indisponível na sessão (cua: Browser is not available: iab); inspeção visual do iframe/CDN fica explicitamente pendente.

- Testes de contrato Python, build determinístico, Helm template e dry-run server dos recursos.
- Application Synced/Healthy; catálogo, specs e health dos pods; fluxo autenticado do Proxy Extension se houver sessão disponível. Registrar separadamente qualquer validação visual que não tenha sido feita.
