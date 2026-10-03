---
title: Implementar skill de projetos Argo CD UI Extension
type: feature
ticket: ''
created: 2026-10-03
status: built
baseline_revision: ebc342af003418498bc0ddefb7c3b1704015d45e
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - /home/rvgerom/projetos/brainstorm/_bmad-output/prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md
  - /home/rvgerom/projetos/brainstorm/_bmad-output/architecture-skill-argocd-ui-extension/architecture-skill-argocd-ui-extension.md
---

<frozen-after-approval reason="pedido de implementação e condução autônoma já autorizados pelo usuário">

## Intent

**Problem:** O padrão pessoal está documentado, mas ainda não há uma skill que gere extensões funcionais sem refazer infraestrutura.

**Approach:** Entregar skill versionada no repositório, com template React/TypeScript, gerador determinístico, contrato executável único e validação reutilizável. Usar perfil resource-tab para Application, Webpack nas duas entradas, npm/lockfile e pacote tar.gz.

## Boundaries & Constraints

**Always:** FR-1–FR-12 e AD-1–AD-9. Contexto do host somente leitura; features independentes de globals; template versionado e geração sem sobrescrita; dependências fixas; pacote de um JS com CSS incorporado; React/ReactDOM/JSX externos em produção. Alvo inicial exato3.5.3, release oficial verificada, marcado não integrado até evidência no host. Dois pedidos independentes geram projetos verificáveis.

**Never:** Alterar cluster3.5.1 existente, publicar, push ou deploy sem pedido. Sem backend, autenticação fictícia como prova, SDK universal, dependências latest ou alegação de compatibilidade futura. Não instalar globalmente antes de artefato concreto.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Saída | Erro |
| --- | --- | --- | --- |
| Projeto novo | nome, descrição, destino,3.5.3 e perfil suportado | Projeto com origem, lock, fixtures e comandos | Nenhum |
| Nome inválido/versão/perfil fora da base | parâmetros não suportados | Sem arquivos escritos | Mensagem explícita e código não zero |
| Destino já existe, inclusive symlink | destino ocupado | Conteúdo preservado | Recusa antes de qualquer escrita |
| Dados ausentes | fixtures sem contexto | UI de estado vazio | Sem crash |
| Build/package alterado | hash diferente | Evidência anterior inválida | Sem ampliar matriz |
| Host indisponível | validação local | Relatório local e integração not-run | Sem declarar release completa |

</frozen-after-approval>

## Code Map

- `skills/argocd-ui-extension/` — nova skill distribuível; repo não tem código React.
- `_bmad-output/prd-skill-argocd-ui-extension/` — requisitos e suposições pessoais vinculantes.
- `_bmad-output/architecture-skill-argocd-ui-extension/` — limites e IDs estáveis; novas escolhas implementam as propostas.
- `brainstorms/2026-10-03-skill-argocd-ui-extension.md` — índice para documentação de implementação.
- `_bmad/render/` — saída temporária do workflow; excluir do versionamento.
- Ferramentas observadas: Node26.7.0/npm11.19.0, Docker29.1.3, cluster k3d-dev com Argo3.5.1. Não copiar secrets nem kubeconfig.

## Tasks & Acceptance

**Execution:**
- [x] `skills/argocd-ui-extension/scripts/contract.mjs` e esquema/tipos — validar/normalizar parâmetros antes do gerador e da Skill.
- [x] `skills/argocd-ui-extension/assets/template/` — implementar duas entradas, tipos/fixtures, contexto neutro e estilos com escopo; fixar toolchain conforme alvo.
- [x] `skills/argocd-ui-extension/scripts/generate.mjs` — cópia determinística parametrizada e origem verificável, sem sobrescrita.
- [x] `skills/argocd-ui-extension/assets/template/scripts/` — pacote allowlist, inspeção de bundle e relatório/hash/evidência sem certificação indevida.
- [x] `skills/argocd-ui-extension/SKILL.md`, `agents/openai.yaml`, referências — instalação, fluxo contextual e uso independente; nenhuma publicação automática.
- [x] `skills/argocd-ui-extension/tests/` — testes de integridade/colisão, parâmetros, registro, UI e invalidação da evidência.
- [x] `_bmad-output/implementation-skill-argocd-ui-extension/` — evidência de dois projetos, checks, revisão e pendências reais.
- [x] `brainstorms/2026-10-03-skill-argocd-ui-extension.md` — apontar implementação e resultados.

**Acceptance Criteria:**
- Given dois pedidos independentes, when gerar e instalar dependências em diretórios novos, then typecheck/lint/test/build/package passam sem editar build ou empacotamento.
- Given bundle instalado em harness de contrato do host, when registrar e renderizar com props reais tipadas, then globals compartilhados são usados e UI preserva contexto somente leitura.
- Given UI local em painel estreito/amplo, when renderizar estados válidos/ausentes, then conteúdo é acessível por rolagem e estilos não escapam.
- Given pacote gerado, when inspecionar tar e bundle, then somente resources/extension-name.js consta e runtime do host não está embutido.
- Given mudanças no artefato, when validar evidência, then hashes e revisão origem são conferidos e evidência obsoleta é recusada.
- Given Skill copiada isoladamente, when executar dois casos sem contexto da conversa, then recursos necessários resolvem localmente e instruções distinguem integração pendente.

## Implementation Notes

- Pesquisa taggeada3.5.3: `https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.3/ui/pnpm-lock.yaml`, `ui/src/app/index.tsx`, `ui/src/app/shared/services/extensions-service.ts`. Host expõe React, ReactDOM (react-dom, não client), ReactJSXRuntime, Moment. React-dom/client e jsx-dev-runtime não devem entrar no bundle instalado.
- Pins verificados no lock upstream: React/DOM19.2.6, types/react19.2.14, types/react-dom19.2.3, TS5.9.3, webpack5.106.2, cli5.1.4, dev-server5.2.4, style-loader4.0.0, css-loader7.1.4, html-webpack-plugin5.6.7, eslint/@eslint/js9.39.4, typescript-eslint8.60.1, globals15.15.0, Jest/jsdom29.7.0, ts-jest29.4.9, types/jest29.5.14, testing-library/react16.3.2/dom10.4.1/jest-dom6.9.1. ts-loader9.5.4 verificado no registry. Node26.7.0/npm11.19.0 são ferramentas disponíveis e devem ser fixadas/documentadas ou justificar ajuste suportado. Downloads podem exigir escalada por restrição de rede; não ocultar falhas.

- A condução autônoma e suposições já foram autorizadas. Não reabrir checkpoint de aprovação do plano; este registro implementa a autorização existente, conforme precedência do usuário. Integração externa só após resultado concreto e autorização específica quando necessária.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Unsupported target accepted after manifest edit | medium | patch | Reviewer reproduced argoCdVersion3.6.0 with successful validate/evidence; validator reads manifest without executable contract. Bundle remains3.5.3. Add shared-contract preflight to existing validation/evidence pipeline. |
| Failure report loses project identity | medium | patch | Parent observed lint-failure report with identity:null; validate only computes identity on all-pass. Preserve project/target/template/source and nullable missing artifact hashes. |

- Revisão adicional de dependências: WDS5.2.4 CSRF reproduzível por origem externa com preview aberto; verdict medium/patch. Pin atualizado para5.2.6 e lock regenerado mantendo outros diretos. Advisories restantes braces/uuid de dev avaliados sem caminho de atacante na base; nenhuma dependência de runtime sinalizada.
- Após patches: 7 testes Node, quick_validate e ci/typecheck/lint/3 Jest/build/package/1 harness/evidence de dois projetos novos passaram. Evidências e hashes foram substituídos pelo estado pós-revisão; UI/CSS/fixtures idênticos ao preview testado.

## Design Notes

Contrato e gerador não exigem dependências de runtime externas. Contrato do host será um subconjunto tipado somente leitura da fonte taggeada3.5.3. Revisão/template e hashes ligam evidência a conteúdo concreto. Relatório distingue harness simulado e instalação real.

## Verification

- `node --test skills/argocd-ui-extension/tests/*.test.mjs` — integridade e geração.
- `python3 /home/rvgerom/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/argocd-ui-extension` — frontmatter/recursos da Skill.
- Em dois projetos: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package` — sucesso, package somente allowlist.
- Preview/harness browser com viewport/painel estreito e amplo; registrar dimensões e limitações.
- `git diff --check` — sem erros de whitespace. Validação real permanece explícita até acesso/autorização de host3.5.3.
