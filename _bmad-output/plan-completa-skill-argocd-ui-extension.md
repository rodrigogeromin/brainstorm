---
title: 'Completar construção de Argo CD UI Extensions'
type: feature
ticket: ''
created: '2026-10-04'
status: built
baseline_revision: aa69ea5db406dc88b3fd91e4fccd83bee622ef43
route: full
route_source: pinned
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="escopo autorizado pelo pedido Adeque para mim e preferência persistente por execução autônoma">

## Intent

**Problem:** A skill oferece cinco registros, mas não entrega um fluxo completo e consistente para construir qualquer UI extension documentada. Projetos v1 passam checks antigos; o preset 3.0.0 referencia um lock inexistente e usa simulação React19 para um host React16; os componentes iniciais não abrem flyouts.

**Approach:** Completar o fluxo de descoberta, auditoria da tag, geração/adaptação, UI específica por perfil, validação e instruções de instalação. Cobrir Resource Tab, Application Tab (mesmo método), System Level, Status Panel com/sem flyout, Top Bar com flyout e App View, preservando diferenças reais entre releases. Oferecer migração explícita revisável de manifestos antigos e instruções para preservar código personalizado.

## Boundaries & Constraints

**Always:** Fontes oficiais na tag exata; métodos/assinaturas/props/globals da tag; React externo em produção; distinguir simulação local e integração real. Verificar lock real (yarn/pnpm/package-lock), não fixar pnpm para todas versões. Manter schema v2 com novos campos opcionais e incrementar templateVersion. Preservar projetos existentes sem alteração automática. Operar somente neste repositório e /tmp; preparar atualização da instalação após verificações.

**Never:** Inventar pontos de extensão ou afirmar suporte em releases sem o método; alterar o projeto service-catalog nesta etapa; instalar em cluster, publicar ou fazer push. Proxy pode ser consumido pela UI, mas backend não é novo perfil React.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado | Falha |
|---|---|---|---|
| Perfis | Cinco perfis nas tags 3.0.0/3.5.1/3.5.3 | Manifesto válido, registro e runtime corretos | Método ausente falha antes de escrever |
| Auditoria | Tag exata com yarn ou pnpm | Quatro fontes reais e hashes em destino novo | Sem tag/lock ou colisão: erro, sem saída parcial |
| Interação | Top bar ou status flyout habilitado | Controle acessível chama openFlyout; flyout mostra conteúdo | Sem contexto usa fallback; sem flyout não mostra controle |
| Visibilidade | Aplicação disponível/ausente | Hook shouldDisplay recebe application, comportamento customizável | Argumento indisponível rejeita opção |
| Migração | Manifesto v1 e contrato auditado | Arquivo v2 novo, alias/icon convertidos, integração limpa | Conflito/contrato ausente/saída existente rejeitados; origem intacta |
| Evidência | Runtime/configuração alterados | Checks rejeitam evidência obsoleta e contrato inválido | Não certifica integração |

</frozen-after-approval>

## Code Map

- `skills/argocd-ui-extension/scripts/contract.mjs`: schema2/template2.1; cinco perfis; presets3.0.0/3.5.3; obrigatoriedade incorreta de pnpm; maps fixos.
- `scripts/generate.mjs`: cópia determinística, destino exclusivo, hashes; copia contract/schema mas não parameters.d.ts. Preservar invariantes.
- `references/parameters.{schema.json,d.ts}`: manter consistentes; adicionar runtime opcional com versões exatas React/DOM e tipos; flyoutProps opcional.
- `assets/template/src/argocd/register.ts`, `types.ts`: mapear registro, introduzir hook de visibilidade que recebe aplicação; props separadas para flyout.
- `assets/template/src/app/Extension.tsx`, `dev/main.tsx`, `dev/*.test.tsx`: hoje tudo é painel genérico e preview React19; interações e preview devem corresponder ao perfil/runtime.
- `assets/template/scripts/{validate,evidence,inspect}.mjs`: gates portáveis; incluir runtime local/host na identidade.
- Fontes auditadas `/tmp/audit-v3.0.0-{extensions,index,package,yarn}`, `/tmp/audit-v3.5.1-{extensions,index,package,pnpm}`, `/tmp/audit-v3.5.3-{extensions,index,package,pnpm}`. React3.0=16.14.0; 3.5.1/3.5.3=19.2.6. Globals3.0=React/ReactDOM;19 adiciona ReactJSXRuntime. Ambos flyouts=application/tree.
- Tipos diretos auditados:3.0 @types/react16.14.15/@types/react-dom16.9.14;3.5.1/3.5.3 @types/react19.2.14/@types/react-dom19.2.3. App-view recebe application/tree em todas essas tags.

## Tasks & Acceptance

**Execution:**
- [x] `SKILL.md`, `references/host-and-evidence.md`, novos guias por perfil/versão/migração/instalação: roteiro completo, lookup oficial, comandos e resultados concretos. Instruções para construir a UI solicitada, além do scaffold. Não ampliar para resource actions/health/CMP.
- [x] `scripts/audit-host.mjs`: baixar extension-service, bootstrap, package e lock existente da tag exata para novo diretório; registrar URLs/hashes/dependências em audit.json. Coletor não declara contrato automaticamente auditado; agente revisa fontes e preenche contrato.
- [x] `contract.mjs`, schema/tipos, `generate.mjs`: corrigir lock3.0; preset3.5.1; campos runtime/flyoutProps opcionais; runtime de presets auditado; aceitar lock real; assinatura determina argumentos sem impor argumentos não existentes. Copiar tipos/documento concreto de contrato para cada projeto.
- [x] Template: fluxo funcional de flyout, hook de shouldDisplay, preview que permite abrir/fechar flyout; runtime setup script reproduzível para alinhar React/tipos/testing-library/JSX/preview com contrato, atualizar lock via npm e preservar UI. React16 usa render/classic, React18/19 createRoot; harness não importa JSX inexistente.
- [x] `scripts/migrate-manifest.mjs`: saída exclusiva revisável, preservar campos/proveniência/customizações, mapear top-bar-action-menu/iconClassName, normalizar contrato exato, invalidar evidências/integração. Não substituir código customizado; guia orienta atualização portável/diff.
- [x] `tests/*.test.mjs`, testes gerados: regressões da matriz; full validate/evidence em projetos temporários React16 e React19 com flyout/visibilidade, demais perfis verificados por testes de geração e harness conforme necessário.
- [x] Atualizar registro de implementação/arquitetura atual sobre capacidade de migração explícita sem alterar decisões históricas silenciosamente; preparar resumo final preciso.

**Acceptance Criteria:**
- Given a documentação oficial, when a skill seleciona o ponto correto, then cada uma das seis categorias possui instruções e scaffold aplicável, incluindo Application via resource-tab.
- Given uma release sem preset, when o agente consulta a tag, then coleta lock real e constrói contrato explícito sem presumir compatibilidade futura.
- Given projeto existente, when pedido de adaptação é explícito, then preserva sua UI e revalida contrato/evidência na versão atual.

## Implementation Notes

Autorização: usuário pediu adequação completa, reiterando preferência por execução autônoma; continuar sem novo checkpoint de confirmação. Risco médio por afetar gerador e evidências reutilizados.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route / evidence |
|---|---|---|
| Optional flyoutProps causes generated preview TS2339/TS7006 | medium | patch: independent 2.14.0 consumer reproduced; optional HostContractInput cast fixes access. |
| Empty system props infer never[] in generated harness | medium | patch: five-profile matrix reproduced TS2345; typed contract cast fixes it; complete 3.5.1 matrix passed. |
| Topbar registration test selects flyout instead of visibility callback | medium | patch: index now derives from argumentMap; full topbar with shouldDisplay:false passed. |
| Contract provenance depends on JSON object key order | medium | patch: independent consumer and parent reproduction reject equivalent reordered object; use semantic deep equality, preserving array order. |
| Project validation fills missing registration id while runtime reads undefined | medium | patch: parent deleted id and validation accepted; require normalized registration to match actual manifest. |
| Migration cannot retarget through supplied contract alone | medium | patch: reviewer reproduced 3.0.0 ->3.5.1 failure; document a separate prepared input copy with target version and recorded retarget history; retain original source. |

## Verification

- `node --test skills/argocd-ui-extension/tests/*.test.mjs`
- `python3 /home/rvgerom/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/argocd-ui-extension`
- Em projetos /tmp: configuração de runtime, `npm ci`, `npm run validate`, `npm run evidence:check`.

### Execução 2026-10-04

17 regressões e quick_validate passaram. Gates completos React16 topbar/flyout/visibilidade e React19 status/flyout em /tmp passaram, incluindo evidence:check. Revisão final e sincronização da instalação a cargo do agente coordenador. Integração real continua not-run.

Verificação final após patches: 19 regressões passaram; os cinco perfis em 3.0.0/React16 e 3.5.1/React19 passaram nos seis gates e evidence:check. Matriz: `/tmp/argocd-complete-matrix-sL7eZY/matrix.json` (dependências dos runtimes já instaladas reutilizadas em diretórios temporários). Contrato oficial 2.14.0 sem flyoutProps e com chaves reordenadas passou em `/tmp/argocd-custom-fixed-woLYME/project`. Avaliação independente anterior construiu ConfigMap core 2.14.0, executou setup/ci/checks e verificou preview dark/mobile no Chrome. Todos os achados foram corrigidos; não houve deferimento novo.

Instalação sincronizada em ~/.agents/skills/argocd-ui-extension; diff sem diferenças e normalizador instalado verificado. Backup em /tmp/argocd-ui-extension-before-completion-20261004. Nenhuma alteração de cluster ou push.
