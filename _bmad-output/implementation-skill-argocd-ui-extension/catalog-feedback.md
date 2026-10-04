# Correções a partir do catálogo funcional

Data: 2026-10-04. Projeto analisado via gh CLI: rodrigogeromin/argocd-catalog-ui-extension, branch develop, commit 366b98abf0704175b9ebf0bf0d9facf8276f979d. Checkout isolado: /tmp/argocd-catalog-skill-review. O repositório de trabalho do catálogo e sua branch remota não foram alterados.

## Diagnóstico

O catálogo v1 usa o perfil top-bar-action-menu, mas registra corretamente registerTopBarActionMenuExt, com label CatalogAction separado do flyout, globals React/ReactDOM/ReactJSXRuntime e runtime React 19.2.6 para Argo CD 3.5.1. A rejeição pelo schema v2 demonstra ausência de metadados atuais; isoladamente não demonstra defeito funcional.

Encontramos três falhas na skill: o template Top Bar inseria seção/botão dentro do título da ação do host; o validador exigia igualdade com a versão mais recente do template; runtime:setup assumia dependencies existente, incompatível com React em devDependencies no catálogo. Corrigidas em template 2.2.1, mantendo schema v2 e migração explícita de v1.

O componente Top Bar agora é um span; preview e harness modelam o botão/ícone do host e verificam clique, ausência de botão aninhado e flyout separado. A origem templateVersion não força migração e permanece preservada na migração; validatorTemplate registra adoção das ferramentas. Runtime setup preserva a seção das dependências e ferramentas customizadas. Evidência de runtime registra versões configuradas nas duas seções possíveis.

Fontes adicionais consultadas para composição da ação: ui/src/app/applications/components/application-details/application-details.tsx nos tags v3.0.0 e v3.5.1 (renderActionMenuItem usa ext.component como title e fornece action/iconClassName). As quatro fontes originais do contrato continuam exigidas; a skill também orienta consultar o consumidor do ponto escolhido.

## Validação

- 21 testes Node passaram, incluindo regressões de origem de template e setup com devDependencies sem dependencies. No teste isolado de setup, somente o acesso npm ao registry/lock é substituído; o script real é executado. O setup real com atualização npm foi executado no catálogo.
- quick_validate da skill passou.
- Template: validate e evidence:check passaram em Top Bar e Status Panel (flyout ativo) nos runtimes React 16/Argo 3.0.0 e React 19/Argo 3.5.1. Os outros três perfis passaram typecheck em ambos os runtimes. Dependências previamente instaladas da matriz anterior foram copiadas para os testes do template, sem claim de novo npm ci. Resultados: /tmp/argocd-catalog-template-check/results.json.
- Catálogo real, em cópia isolada: migração do manifesto, adoção de contrato/schema/scripts, correção de referências ao campo icon e runtime:setup → npm ci → validate → evidence:check passaram. Foram preservados Jest 30, webpack-dev-server 6, ts-loader 9.6.2 e script de pacote shell. Quatro testes da UI e um harness de produção passaram. Log: /tmp/catalog-migration-validation.log.
- git diff confirmou src/app, src/features, src/styles, workflow de release e package-lock.json idênticos ao commit original. Nenhuma UI customizada foi substituída pelo scaffold.

## Evidência de instalação

README e host-and-evidence.md remotos ainda descrevem instalação temporária. O usuário relata instalação persistente posterior. Sem inspeção da implantação ou interação no navegador nesta tarefa, não foi possível confirmar o artefato instalado ou seu comportamento real. A skill agora exige separar histórico, relato do usuário, persistência observada e teste de navegador. Relatórios locais continuam integration:not-run; gerar um bundle novo não certifica nem apaga a implantação anterior.

Não houve implantação, publicação ou push nesta etapa. A migração isolada serve como teste da skill, não como atualização automática do catálogo.

## Evolução posterior ao teste isolado

A migração foi aplicada e publicada no repositório do catálogo (commit 710f231); a documentação de instalação foi atualizada e publicada em 44b8858. O [registro posterior](https://github.com/rodrigogeromin/argocd-catalog-ui-extension/blob/21d74e708151a2dd4b6f6faab1db1ccb65127b1f/references/host-and-evidence.md) documenta instalação persistente por init container em Argo CD 3.5.1 e hashes do bundle. A interação no navegador continua sem evidência. As afirmações anteriores sobre ausência de alteração/inspeção dizem respeito ao teste isolado, não ao estado posterior do catálogo.
