---
title: Converter Swagger Gateway UI para System Level
type: feature
ticket: ''
created: '2026-10-23'
status: built
baseline_revision: 1c23a26211f78bd602b5431a0f20395f382c00d5
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="Mudança solicitada na extensão existente; autorização de publicação/instalação persiste nesta sessão">

## Intent

Converter a Swagger Gateway UI de top-bar-action para system-level no Argo CD 3.5.1. Acessar pelo item Swagger no menu lateral, rota /swagger, como página completa sem selecionar Application. Manter catálogo, seleção Go/Java, HTML universal autenticado, tratamento de erros e cancelamento. Atualizar o repositório e, pelo operador principal, publicar e instalar v0.2.0 substituindo a instalação v0.1.0 da mesma extensão.

## Boundaries & Constraints

Trabalhar em /tmp/argocd-swagger-ui-extension. Operador principal fará git push/tag/release/cluster e sincronização de /home/rvgerom/projetos/argocd-swagger-ui-extension. Implementador não faz operações remotas/cluster nem commit. Nenhum gateway/RBAC muda.

System-level usa registerSystemLevelExtension(component, title, path, icon), não recebe Application/tree nem flyout. Configurar explicitamente no adapter o contexto fixo autorizado argocd:swagger-gateway / appset. O menu pode aparecer sem Application e o backend continua autorizando por sessão/RBAC. Não inventar Application corrente ou ampliar permissões. Registrar icon fa-book, pois o consumer acrescenta fa. Remover registro/controle de Top Bar da extensão, preservar o catálogo e a integração fetch + srcdoc e suporte ao base href. Nenhum segredo no frontend.

Manter schema v2, templateVersion e templateSha256 de origem e histórico de adaptações; migrar por cópia revisável e gerar referência determinística da skill. Atualizar host-contract, host-audit e manifest ao perfil correto com props/flyoutProps vazios. Preservar evidence de instalação histórica v0.1.0; o novo bundle continua sem certificação de browser até teste real. Versão do package/lock 0.2.0; workflow/assets/installer mantêm nomes e checksum. Não sobrescrever v0.1.0.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Página sem contexto host | Render system component sem props | Carrega catálogo com contexto PoC explícito |
| Navegação | Registro do bundle no host simulado | Exatamente um registro system-level para Swagger /swagger, sem Top Bar |
| Troca Go/Java | Seleção de publicação | HTML/spec proxy corretos, sem iframe antigo sobrescrever a seleção |
| Falha/vazio/cancelamento | 401/403, catálogo vazio ou unmount | Estados existentes preservados e request abortado |
| Subpath | base href /argocd/ | URLs de catálogo/HTML e spec rebaseadas corretamente |

</frozen-after-approval>

## Code Map

- extension-project.json: hoje perfil top-bar-action e contrato oficial v3.5.1; origem e adaptações devem sobreviver à conversão.
- /home/rvgerom/.agents/skills/argocd-ui-extension/SKILL.md e references/migration-guide.md/profile-guide.md: instruções aplicáveis (ler); scripts/generate.mjs, migrate-manifest.mjs e contract.mjs para referência/migração/validação.
- /tmp/swagger-system-host-app.tsx: fonte oficial v3.5.1 obtida pelo conector, consumer onAddSystemLevelExtension linhas 359-380. Cria nav item com title/path e iconClassName `fa ${extension.icon}`, rota envolve componente em Page e o renderiza sem props. Extensions service/React bootstrap/package/lock da mesma tag já auditados em /tmp/swagger-ui-host-audit e references/host-audit.json. Runtime permanece React/DOM 19.2.6 e types 19.2.14/19.2.3.
- src/argocd/register.ts: hoje HostFlyout e callback shouldDisplay; substituir por adapter do system component, injetando contexto explícito e basePath na UI. Centralizar acesso ao host aqui. src/index.tsx deve usar o novo adapter.
- src/argocd/gateway-context.ts: hoje resolve Application; tornar configuração explícita e imutável da PoC, sem host Application. src/argocd/visibility.ts pode ser removido quando sem uso.
- src/app/Extension.tsx: transformar label + ExtensionFlyout em página principal com catálogo; importar apenas tipos do adapter para respeitar lint.
- src/features/swagger/: preservar client e SwaggerCatalog; adaptar textos/README e layout se necessário, não reescrever domínio.
- dev/main.tsx, dev/Extension.test.tsx, dev/HostBundle.test.tsx: substituir wrapper botão/flyout por sidebar e página; validar render sem props e sem dependência de Application, registro exato e ausência de Top Bar. Preservar testes de dados, erros, cancellation e subpath. dev/Client.test.tsx e Release.test.tsx continuam passando.
- README.md, src/features/swagger/README.md, docs/installation.md: instruções de menu lateral /swagger e versão atual 0.2.0. Conservar registro histórico v0.1.0 identificado como tal, sem alegar instalação da v0.2.0 antes do operador.
- scripts/release-assets.mjs, workflows e deploy template: preservar fluxo existente. Atualizar exemplos de versão se necessário. Testes do helper podem usar fixtures 0.1.0 deliberadamente, sem mudanças mecânicas sem motivo.

## Tasks & Acceptance

- [x] Fazer migração por cópia, gerar referência system-level e revisar/adotar diferenças sem substituir domínio/tooling customizado.
- [x] Implementar página/adapter/configuração explícita e remover Top Bar/flyout específico.
- [x] Adaptar preview, testes, harness, docs e versão; executar runtime:setup, npm ci, validate, evidence:check.
- [x] Operador: revisão quick, validar com skill instalada, publicar v0.2.0 e instalar patch preservando demais extensões; conferir hashes/proxy e registrar evidência real separada.

Given nenhuma Application selecionada, when abrir Swagger no menu lateral, then catálogo carrega via contexto explícito autorizado. Given bundle produzido, when registrado, then usa exatamente registerSystemLevelExtension com título Swagger, path /swagger e icon fa-book. Given os assets v0.2.0 publicados, when instalados pelo mesmo init container/nome de arquivo, then substituem a UI anterior sem duplicar a extensão e sem alterar outras integrações.

## Implementation Notes

Autorização de continuidade do repositório e instalação existente já fornecida pelo usuário; sem checkpoint adicional. Risco médio: mudança do contexto de host exige manter a autorização server-side intacta. Delegação de implementação/revisão é exigida pelo workflow bmad-build.

## Plan Change Log

## Review Triage Log

Quick independente: nenhum achado. Ajustado previamente fallback de navegação do preview; /swagger e /swagger/ retornam HTML com Accept text/html.

## Verification

47 testes passaram; gates da skill, actionlint, evidências e smoke de deep link passaram. CI de main e release v0.2.0 aprovados. Cinco assets publicados conferidos, dry-run preservou outras extensões, upgrade terminou 1/1 Ready. Hash no pod e bundle servido correspondem à release; bundle Swagger Top Bar anterior ausente. Proxy autenticado confirmou catálogo/HTML/specs Go e Java. Browser indisponível, integração visual permanece explicitamente not-run.

- Validação do projeto pelo contract.mjs da skill instalada, npm run runtime:setup, npm ci, npm run validate e npm run evidence:check.
- Revisar diff e matriz de testes. Source/artifact hashes renovados; relatório integrado permanece not-run para novo artefato.
- Operador executa release, confirma cinco assets/checksum, dry-run + patch/rollout, hash no pod e bundle servido, catálogo/specs autenticados. Browser indisponível deve ser explicitamente marcado, nunca tratado como integração visual concluída.
