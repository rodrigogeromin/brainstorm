---
title: 'Generalizar skill para cenários e versões de Argo CD UI Extensions'
type: 'feature'
ticket: ''
created: '2026-10-03'
status: 'built'
baseline_revision: '349d591a978c4c4d4519f1f478a89ac0e597658d'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Skill fixa Argo CD 3.5.3 e resource-tab, embora Rodrigo precise criar diversos tipos de UI extension em versões diferentes. Isso faz a Skill recusar cenários válidos e pode induzir a uma alegação incorreta de compatibilidade.

**Approach:** Tornar versão-alvo exata e pontos de extensão entradas variáveis. Antes de gerar, a Skill consulta o contrato da tag oficial selecionada e escolhe apenas APIs, props e runtime demonstrados por essa fonte. Distingue capacidade documentada, build local, harness simulado e integração real por versão.

## Boundaries & Constraints

**Always:** Suportar os pontos de UI oficialmente disponíveis na versão examinada: resource tab (incluindo Application tab por `argoproj.io/Application`), system-level, status panel, top-bar action e app view, flyout quando a assinatura permitir; backend via proxy como capacidade opcional separada. Registrar fontes/tag e globals React descobertos. Preservar schema executável e geração determinística. Projetos existentes não migram nem se atualizam silenciosamente.

**Never:** Fixar 3.5.3, inferir APIs ou globals de uma versão próxima, afirmar suporte universal/futuro sem evidência, confundir proxy backend ou resource actions/custom health checks com pontos React de UI, instalar no cluster sem solicitação, ou alterar o comportamento de projetos já gerados.

## I/O & Edge-Case Matrix

| Cenário | Entrada/estado | Comportamento esperado | Erro |
|---|---|---|---|
| Versão/tag oficial válida | versão exata e profile presente | contrato fonte-específico registrado; scaffold compatível gerado | integração continua pendente até host real |
| Profile ausente naquela versão | release tag existe, método não existe | geração recusada para aquele profile; alternativas disponíveis informadas | nenhuma matriz de suporte é ampliada |
| Fonte/tag indisponível ou assinatura ambígua | sem evidência oficial suficiente | parar antes de gerar e apontar a fonte faltante | nunca recorrer a assinatura presumida |
| Build de fork/customização | versão sem fonte equivalente | pedir referência de código/contrato da instalação e rotular como custom | sem evidência, não declarar compatibilidade |

</frozen-after-approval>

## Code Map

- `skills/argocd-ui-extension/references/parameters.schema.json`, `parameters.d.ts` -- atualmente limitam versão e profile a 3.5.3/resource-tab; tornam-se contrato v2.
- `skills/argocd-ui-extension/scripts/contract.mjs`, `generate.mjs` -- normalizam, validam e gravam provenance; precisam receber contract evidence e profiles múltiplos sem aceitar alvo presumido.
- `skills/argocd-ui-extension/assets/template/src/argocd/register.ts`, `types.ts`, `src/index.tsx`, `webpack.config.cjs` -- adaptador/runtime atualmente resource-tab e externals 3.5.
- `assets/template/dev`, `scripts/{evidence,validate,inspect,package}.mjs`, testes -- fixtures, harness simulado, verificação dos artefatos e relatório de estado.
- `skills/argocd-ui-extension/SKILL.md`, `references/host-and-evidence.md`, `agents/openai.yaml` -- fluxo e descoberta hoje afirmam suporte apenas a 3.5.3.
- `_bmad-output/prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md` -- A3/A5, FR-3/7/11 e limites declaram um primeiro profile/target fixos.
- `_bmad-output/architecture-skill-argocd-ui-extension/architecture-skill-argocd-ui-extension.md`; ADR-0003, 0004, 0007 -- gerador/profile/compatibilidade têm as decisões hoje fixadas.
- `examples/argocd-informativo/` -- artefato gerado schema v1, manter intacto como demonstração v1 e compatibilidade histórica.
- Evidência oficial: docs UI extensions release 2.14, 3.0, 3.4 e 3.5; fonte tagueada `extensions-service.ts`, bootstrap UI e package/lock da versão; 3.5 atualiza runtime React 19 e o JSX runtime.

## Tasks & Acceptance

**Execution:**
- [x] Revisar PRD e arquitetura/ADRs -- substituir escopo fixo por profiles e target version-aware, definindo limites comprováveis.
- [x] Evoluir schema, tipos, normalização, generator e manifesto -- aceitar uma versão SemVer exata com contrato fornecido ou preset e um profile por geração; persistir assinatura, origem/tag e mapa de globals; versionar schema/template sem tocar nos gerados v1.
- [x] Modularizar scaffold de profiles -- implementar os cinco pontos UI documentados, condicionados ao contrato da versão; modelar proxy backend à parte; separar React/UI da chamada ao host.
- [x] Reconfigurar build, preview, inspeção, empacotamento e evidência -- derivar externals do contrato da versão, gerar harness por profile e apresentar integração por hash+versão.
- [x] Atualizar SKILL.md, guia, manifesto e testes -- instruir auditoria das fontes oficiais, bloquear APIs indisponíveis e manter uso portátil.
- [x] Validar contratos 3.0.0, 3.5.3 e um contrato fornecido para versão não preset; build e harness nos cinco profiles das duas releases preset; recusas e preservação do projeto de exemplo v1.

**Acceptance Criteria:**
- Given release oficial e profile cujo método exista no código dessa tag, when a Skill prepara o projeto, then o manifesto registra tag/fonte, assinatura, props e React globals e o scaffold chama a API correta.
- Given profile ausente, versão sem fontes ou assinatura ambígua, when a Skill valida os parâmetros, then ela interrompe sem criar destino e explica o bloqueio.
- Given versões com runtimes diferentes, when cada projeto é compilado, then os externals correspondem à evidência daquela tag e inspeção rejeita React/ReactDOM/JSX runtime embarcado indevidamente.
- Given cada um dos cinco profiles UI disponíveis, when o harness executa, then verifica registro, parâmetros, props e UI própria; flyouts/filtros são testados quando configurados.
- Given somente npm validate e preview passados, then integration permanece not-run e a versão não entra na matriz integrada.
- Given exemplo v1 já gerado, when o gerador v2 é atualizado, then seus arquivos e evidências permanecem inalterados.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| Verdict / route | Finding and evidence |
|---|---|
| medium / patch | `contract.mjs` anteriormente aceitava tokens opcionais fora da posição definida pela assinatura e podia passar `isMiddle` como `shouldDisplay`; a validação agora compara cada argumento e o teste dedicado rejeita esse mapa. |

## Design Notes

Separar API do Argo por um host adapter versionado evita prender as funcionalidades de domínio ao shape das props. O ponto decisivo é que documentação nem sempre reproduz a assinatura real (por exemplo, há conflito na assinatura de `registerSystemLevelExtension`); usar o source do tag-alvo como autoridade e registrar a evidência evita repetir o defeito da versão fixa.

## Verification

**Commands:**
- `node --test skills/argocd-ui-extension/tests/*.test.mjs` -- 14 tests pass (including optional-argument position rejection).
- `python3 /home/rvgerom/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/argocd-ui-extension` -- skill metadata valid.
- Fresh projects: `npm run build` and `npm run harness` passed for all five profiles on 3.0.0 and 3.5.3. A supplied-contract 4.2.1 project passed build, harness, `npm run validate`, and `npm run evidence:check`; integration remained `not-run`.
- The original `examples/argocd-informativo/` v1 tree is unchanged from baseline.
