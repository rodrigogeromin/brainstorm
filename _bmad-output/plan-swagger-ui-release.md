---
title: Publicação de releases da Swagger UI Extension
type: feature
ticket: ''
created: '2026-10-23'
status: built
baseline_revision: e6a8fbeb606b98e3b586b680e95eb6092e5f689f
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="Continuação autorizada da construção/publicação do repositório; usuário pediu workflow conforme referência">

## Intent

Adicionar publicação de releases ao repositório rodrigogeromin/argocd-swagger-ui-extension, usando como referência explícita o release.yml de rodrigogeromin/argocd-system-ui-extension na branch develop. Hoje só existe validate.yml, que gera artifacts de CI. O resultado deve permitir publicar pacote instalável, checksum, patch de instalação, evidências e manual por tag v + package.json.version.

## Boundaries & Constraints

O repositório alvo de trabalho é /tmp/argocd-swagger-ui-extension, clone de trabalho gravável do projeto; não implementar no repositório brainstorm. O operador principal sincronizará o projeto persistente em /home/rvgerom/projetos/argocd-swagger-ui-extension e fará commit/push no GitHub depois de verificar. Não criar ou enviar tags, não disparar release real nem alterar cluster nesta tarefa. Preservar código da UI e gateway.

Seguir o modelo indicado: push tags v*, contents write restrito ao job de publicação, concurrency por ref sem cancelamento, checkout e setup-node, validação de tag antes de npm ci, validate/evidence:check antes de publicar, preparo de assets, gh release create com verify-tag/generate-notes. Usar Node 26.10.0 via .nvmrc e npm 11.19.1 do projeto, Actions fixados nos mesmos commits já usados no validate.yml. Variáveis de tag/repository devem entrar por env, sem interpolação de conteúdo não confiável em shell.

A release deve anexar dist/swagger-gateway.tar.gz, dist/checksums.txt, dist/argocd-server-patch.yaml, validation-report.json e docs/installation.md. Patch estratégico do Deployment padrão argocd/argocd-server adiciona init container exclusivo argocd-extension-installer-swagger-gateway, imagem oficial v1.1.0 fixada no mesmo digest conferido da referência, URLs imutáveis da tag atual, checksum habilitado e volume tmp compartilhado com servidor. Não trocar nem remover outras extensões. Documentar adaptação se /tmp já usar volume com nome diferente, fonte Helm/GitOps, segurança/CSP e pré-requisitos separados do gateway/proxy/RBAC. Metadados locais continuam integration not-run.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Release válida | Tag igual a v + versão, build validado | Assets corretos para este repo/tag, checksums conferem com pacote real |
| Identidade incompatível | Tag diferente, versão inválida ou repository inválido | Falhar antes de publicar; helper também rejeita diretamente |
| Asset faltando | Tar ausente | Preparo falha, nenhuma publicação |

</frozen-after-approval>

## Code Map

- .github/workflows/validate.yml: CI existente main/PR/manual, Actions checkout 3d3c42e5aac5ba805825da76410c181273ba90b1, setup-node 949feb2413d6458794dcd2491c4babbbce0c15c1; manter.
- package.json e .nvmrc: nome swagger-gateway, versão 0.1.0, Node 26.10.0 e npm 11.19.1; npm run validate encadeia tipos/lint/test/build/package/harness.
- scripts/package.mjs: cria dist/swagger-gateway.tar.gz, único membro resources/extension-swagger-gateway.js.
- scripts/evidence.mjs: source hash cobre scripts/dev/references; reexecutar validate e evidence:check após adicionar helper/testes. Relatório registra build local e harness separado de integração.
- .github/workflows/release.yml: criar publicação adaptada ao projeto.
- scripts/release-assets.mjs e deploy/argocd-server-patch.yaml: gerar checksum real e patch com identidade da release; nunca executar Kubernetes aqui.
- dev/Release.test.tsx: testes Node de fluxo do helper com fixtures temporárias (tag/repo inválidos, checksum, URLs, asset ausente). Usar Jest já existente; não acrescentar dependência para testar YAML.
- README.md e docs/installation.md: ensinar criação/envio de tag depois de package version bump, assets, download/aplicação do patch após revisão, preservar outras extensões, proxy e RBAC separados. Nenhuma declaração de release ou integração real já executada.

## Reference Evidence

Referência release.yml (SHA 3caf8bd29b8233dcfc0f1d149c045dbfcd2d5ca2) lida pelo conector GitHub, além de scripts/release-assets.mjs, docs/installation.md e deploy/argocd-server-patch.yaml. A referência prepara patch por substituição da versão/repo e publica argo-rollouts-installer.tar.gz; adaptar nome a swagger-gateway.tar.gz.

Template da referência usa quay.io/argoprojlabs/argocd-extension-installer:v1.1.0@sha256:6cc786ba4dc96ba81d5010fbf92adabef15aff89753a55e22b8d829cd8b6e2a8. Env: EXTENSION_NAME, EXTENSION_VERSION, EXTENSION_URL, EXTENSION_CHECKSUM_URL e EXTENSIONS_DIR=/tmp/extensions/resources. Volume tmp emptyDir montado em /tmp no init e servidor. securityContext nonroot uid1000, no escalation, readOnlyRootFilesystem, dropALL. requests 10m/32Mi, limits200m/128Mi. O install.sh oficial v1.1.0 foi lido: busca o checksum correspondente ao basename do tar, extrai resources/* e copia para EXTENSIONS_DIR. Não depende de nome legado argo-rollouts.

## Tasks & Acceptance

- [x] Criar workflow, helper de assets e patch estratégico de instalação para Swagger.
- [x] Cobrir a matriz com testes de comportamento e validar YAML sintaticamente.
- [x] Documentar publicação por tag e instalação com preservação do ambiente.
- [x] Executar validate/evidence:check, smoke do helper e revisão quick; operador publica commit/workflow, sem criar tag.

Given uma tag correspondente à versão, when o workflow roda, then todos os checks precedem a publicação dos cinco assets. Given tag incompatível, when validada, then não se publica release. Given pacote válido, when preparado, then checksum corresponde e patch aponta para repo/tag corretos com checksum habilitado. Given main push sem tag, when CI roda, then só validate.yml dispara.

## Implementation Notes

Risco médio porque release publica artefatos executáveis; validação e checksums devem impedir identidade incorreta. Execução da mudança solicitada e atualização do repositório já autorizadas; sem checkpoint adicional. Delegação permitida pelas instruções da skill bmad-build. Nenhuma iniciativa nova: continuação do repositório já criado nesta sessão.

## Plan Change Log

## Review Triage Log

Revisão quick independente: nenhum achado. Sem pendências ou itens diferidos.

## Verification

Executados: validate (48 testes de domínio/helper + 1 harness de produção), evidence:check, 18 testes específicos do helper, actionlint v1.7.12 dos dois workflows, parse YAML e assertions de trigger/ordem, preparo com tar real e checksum. Digest do installer confirmado no registry oficial. Nenhuma tag/release/instalação real executada.

- npm run validate; npm run evidence:check; testes do helper e smoke de geração para versão atual.
- Parse YAML do workflow/patch com PyYAML BaseLoader no operador principal; actionlint se disponível. Não instalar ferramentas sem necessidade.
- Conferir pacote/checksum, git diff --check, revisão independente do fluxo e confirmar push/CI de main; registrar que workflow de release não foi executado pois nenhuma tag será criada.
