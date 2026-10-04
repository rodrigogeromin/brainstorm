# Implementação e evolução — Argo CD UI Extension

Estado em 04/10/2026: schema v2/template 2.2.1, cinco perfis e auditoria por release. [Uso e capacidade atual](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md) · [Correções e 21 testes](catalog-feedback.md). Os resultados abaixo preservam cada etapa; os sete testes e o alvo fixo da entrega inicial não descrevem a skill atual.

## Entrega inicial — template 1.0.0

Skill distribuível: `skills/argocd-ui-extension/`. Template 1.0.0, contrato/schema 1, alvo exato Argo CD 3.5.3. Integração real **not-run**; matriz integrada vazia; release inicial não concluída (SM-2).

Entregues contrato executável consumindo schema único, tipos de entrada, template React/TypeScript e Webpack nas duas entradas, lock npm, gerador determinístico e portátil, adapter readonly de Application resource-tab, fixtures válido/ausente, CSS exclusivo com rolagem, inspeção de módulos, tar allowlist, relatório/hash e invalidação da evidência. O scaffold neutro é síncrono e não precisa de estados de loading/erro remoto.

## Reutilização e verificações

Dois pedidos independentes foram gerados em diretórios novos, com os parâmetros preservados nas pastas desta evidência. Projetos finais: `/tmp/argocd-ui-extension-reviewed-p9hmck79/context-inspector` e `/tmp/argocd-ui-extension-reviewed-p9hmck79/application-summary`. Nenhum arquivo de build/empacotamento desses projetos finais foi editado após geração. Cada pasta de evidência preserva parâmetros, origem, relatório e pacote instalável. Reproduzir com o gerador da Skill e os respectivos `parameters.json`; destino deve ser novo.

Ambos passaram npm ci (790 dependências), typecheck, lint, 3 testes Jest de UI/registro/imutabilidade, build, pacote e 1 harness Jest do bundle minificado com globals compartilhados e props congelados. `npm run evidence:check` passou em ambos. Node v26.7.0/npm11.19.0/Linux; todas as dependências diretas fixas e transitivas via lock. Os reports contêm source/template revision e SHA-256 reais dos bundles/tars, comandos/status/código de saída. O tar contém somente `resources/extension-<name>.js`; Webpack stats confirmam JSX externo e ausência de runtime React/DOM/client/dev embutido.

`node --test skills/argocd-ui-extension/tests/*.test.mjs`: **7 testes passaram**. Cobrem validação sem escrita, colisões arquivo/symlink, determinismo/Skill copiada isoladamente, lock/integridade, invalidação por source/bundle/package/template e checks ausentes/falhos; ampliação indevida da matriz é recusada. `quick_validate.py`: **Skill is valid**. O lint impede imports runtime do adapter e acesso direto extensionsAPI dentro da UI.

## Preview em browser

Chrome headless real, sem erros Runtime: painel **320×240** no viewport390×844, scrollHeight503 e acesso ao fim; painel **1100×600**, viewport1280×800, tema escuro; painel320×240 com contexto ausente. Sem overflow horizontal. `browser-results.json` e screenshots preservam resultados. O preview foi servido em127.0.0.1:18080 (8080 já ocupado). `browser-source-identity.json` confirma UI/CSS/fixtures idênticos ao projeto final; o segundo muda nome/título/descrição conforme pedido. Esses resultados são locais e não demonstram estilos do host real.

## Ocorrências e limites

O sandbox bloqueou DNS npm (ENOTFOUND), fork Node/tar e listen local (EPERM); comandos necessários foram repetidos com escalada autorizada. O primeiro scaffold scratch revelou importação de tipos jest-dom e globals CJS do mock faltantes; corrigidos no template antes da geração final, e todos os checks foram repetidos. O npm reporta depreciações de dependências fixadas/upstream (eslint, glob, uuid e bibliotecas jsdom); não houve substituição silenciosa dos pins. npm ci usou cache em/tmp e --ignore-scripts para download/reprodutibilidade nesta rodada.

Não foram alterados cluster3.5.1, secrets/kubeconfig, nem houve push, publicação, deploy ou instalação global nesta implementação. Método de instalação/imagem do installer continua condicionado ao ambiente; o README documenta resources sob/tmp/extensions e requisito de validação real3.5.3. Harness simula registro/renderização e globals; não certifica autenticação ou host Argo CD. Tempo medido de geração/validação é evidência operacional, sem comparação manual equivalente (SM-3 permanece sem baseline comparável).

Revisão independente concluída: contrato reaplicado ao manifesto editado, identidade preservada em relatórios de falha e servidor de preview atualizado para5.2.6. Dois projetos foram gerados novamente e todos os checks repetidos após as correções. Avaliação de dependências em [dependency-review/assessment.md](dependency-review/assessment.md); alertas transitivos de desenvolvimento permanecem documentados. Pendência material: instalação e checks FR-7/FR-8 reais em host3.5.3, com hashes instalados, ambiente, erros de browser, runtime compartilhado, dimensões estreita/ampla, rolagem e tema escuro disponíveis. Nenhuma versão futura é certificada.

## Complementação — 2026-10-04, template 2.2

Implementados guias de construção por perfil (Application via resource-tab), versões/runtime, migração e instalação. Coletor audit-host busca as quatro fontes reais com lock existente, URLs/hashes/dependências e contractReviewed:false. Presets 3.0.0/3.5.1/3.5.3 corrigem lock e runtime; parâmetros opcionais runtime/flyoutProps mantêm schema v2. Projetos recebem tipos de parâmetros e documento concreto do contrato. Core resources aceitam group vazio. O registro segue assinatura/mapa exatos e disponibiliza hook shouldDisplay(application).

Flyouts funcionais em status/topbar; preview abre/fecha e filtra props pelo contrato. Setup reproduzível alinha React/DOM/tipos/testing-library/JSX/preview e lock npm sem modificar UI. Harness clássico não importa JSX runtime ausente. Evidência inclui runtime declarado/instalado e rejeita React/DOM/tipos incompatíveis. Migração explícita produz manifesto novo, converte aliases, preserva campos/proveniência e limpa integração; atualização de código requer diff.

Verificação: 17 testes node passaram; quick_validate.py aprovou a skill. Em /tmp/argocd-complete-3.0.0, React16.14.0 topbar com flyout/visibilidade; em /tmp/argocd-complete-3.5.1, React19.2.6 status com flyout: runtime:setup, npm ci, validate (typecheck/lint/test/build/package/harness) e evidence:check passaram. Harness exerce openFlyout, componente registrado de flyout e callback com application/undefined. Matriz de geração cobre cinco perfis nas três tags.

Não houve instalação em cluster, publicação, push ou alteração de service-catalog. Integração real permanece not-run. npm ci relatou 36 vulnerabilidades transitivas (2 moderadas/34 altas) no toolchain de desenvolvimento existente; nenhuma correção automática com breaking changes foi aplicada nesta complementação. Projetos existentes permanecem intactos. Sincronização da instalação da skill fica para a etapa final após revisão.

Revisão final: corrigidas inferência never[] em system-level, acesso a flyoutProps opcional, seleção do callback topbar, comparação de contrato sensível à ordem de chaves e aceitação de registros incompletos. Retarget documentado com cópia preparada e histórico preservado. Entrada da skill verifica projetos antigos com validador atual antes da adaptação; README executa runtime:setup antes de npm ci. Props de flyout são registradas somente nos perfis que o usam.

Resultado final: 19 regressões e quick_validate passaram. Os dez cenários (cinco perfis em React16/3.0.0 e React19/3.5.1) passaram em typecheck/lint/test/build/package/harness e evidence:check; matriz local em /tmp/argocd-complete-matrix-sL7eZY/matrix.json reutiliza instalações de dependências previamente alinhadas pelos setups. Consumidor independente criou ConfigMap core em 2.14.0 sem preset e verificou preview dark/mobile com contexto ausente no Chrome. Caso pós-correção sem flyoutProps e com contrato reordenado passou em /tmp/argocd-custom-fixed-woLYME/project. Nenhum achado novo ficou deferido; integração real não é certificada por estes resultados.

Skill sincronizada em /home/rvgerom/.agents/skills/argocd-ui-extension e igualdade integral verificada com diff; normalização instalada confirmou template2.2.0, top-bar-action v3.5.1, React19.2.6 e quatro fontes. Backup anterior em /tmp/argocd-ui-extension-before-completion-20261004. Suíte final de 19 testes passou fora do sandbox após bloqueio de processo Node isolado. Tipos de parâmetros aceitam SemVer com prerelease conforme schema; metadados de descoberta também incluem adaptação.
