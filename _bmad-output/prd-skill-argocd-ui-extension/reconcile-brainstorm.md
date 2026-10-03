# Extração de fontes para PRD — padrão/template/skill Argo CD UI Extension

Extração documental em 03/10/2026. Fontes locais: `_bmad-output/brainstorm-skill-argocd-ui-extension/brainstorm-skill-argocd-ui-extension.md` (B), `padrao-projeto.md` (P) e `.memlog.md` (M), todas no mesmo diretório. Não houve leitura de HTML, pesquisa externa ou verificação executável nesta extração. Afirmações upstream abaixo são evidências relatadas pelas fontes, não revalidadas.

## Fatos e estado atual

- Objetivo registrado: velocidade e assertividade na criação recorrente de extensões (B introdução; M goal).
- Pesquisa avulsa examinou amostra intencional ArgoProj Labs, com documentação oficial para contrato; não prova consenso de toda a comunidade. Nenhum projeto foi compilado ou instalado (B §2).
- Não há template executável ou skill implementada nesta rodada. Existe padrão documentado, explicitamente em proposta para validação (B §8/11; P abertura/conclusão).
- O contrato recorrente observado é React compartilhado pelo host, registro por `extensionsAPI`, JS `extension*.js` e instalação no `argocd-server`; árvores e gestores variam (B §3–5; M).
- Rollout fundamenta entrypoint React/TypeScript, registro de recurso e build Webpack; Metrics fundamenta UI separada de backend, proxy e RBAC; Assistant mostra build/pacote explícitos com dependências antigas que exigem investigação (B §3–4).
- React 19/Argo CD 3.5 exige cuidados com externals de ReactDOM/runtime JSX e compatibilidade de bibliotecas, segundo fontes relatadas. Não existe versão universal de React aprovada (B §6; P Dois ambientes).
- Installer aceita tar com `resources`, init container, nome/versão/URL e checksum opcional; tornar checksum obrigatório seria política local ainda não decidida. Controlador antigo `argocd-extensions` está depreciado (B §7).

## Decisões explícitas do usuário

1. Brainstorm autônomo e avulso; partir de plugins implementados e práticas codificadas, sem inventar padrão universal ou produzir cem ideias especulativas (M directions; B §2).
2. Evolução da direção: criar padrão local baseado em organização de projeto React, adaptando build e integração ao Argo CD para criação recorrente por skill (B §1/8/11; P abertura; M última direction).

A decisão de padronizar está confirmada. Não atribuir aprovação individual ao usuário para nomes de pastas, comandos, ferramentas ou versões técnicas.

## Propostas técnicas ainda não aprovadas individualmente

- Base React única para a equipe, organização por funcionalidades inspirada em Bulletproof React, `src/argocd` para contratos/registro e `dev` para preview (P Origem/Estrutura).
- Uma extensão por repositório/raiz, sem monorepo obrigatório; `src/index.tsx`, `app/Extension.tsx`, `argocd/register.ts` e `types.ts`, `features`, compartilhados opcionais, estilos isolados, `manifests`, `scripts/package.mjs`, `dist/resources` ignorado no Git (P Estrutura).
- TypeScript, Webpack e npm/package-lock são recomendações. Preferência já adotada pela equipe pode substituir npm, mudando gestor e lock juntos; versões exatas dependem de validação (P Estrutura/Parâmetros).
- CSS Modules ou contêiner com escopo próprio: escolher uma alternativa na validação. Evitar chunks dinâmicos na primeira versão até validar URLs no host (P Limites/Dois ambientes).
- Comandos locais propostos: `dev`, `typecheck`, `lint`, `test`, `build`, `package`. Nenhum está implementado; nomes ainda são contrato proposto (P Comandos).
- Experimentos e métricas de sucesso propostos, sem metas numéricas aprovadas: tempo até primeira renderização válida, correções manuais do scaffold, falhas de compatibilidade (B §9).
- Ideias antigas de selecionar estrutura/gestor da referência por projeto foram atualizadas pela direção posterior de padrão local único; preservar essa cronologia, sem tratar M como decisões técnicas finais (B §1/5/8; M ideas).

## Requisitos observáveis candidatos ao PRD

Os itens abaixo operacionalizam a proposta documental; permanecem sujeitos à definição do escopo e validação.

| ID | Comportamento/entrega verificável | Fonte |
|---|---|---|
| R1 | Gerar projeto a partir de template validado, parametrizando nome, descrição, destino, versão Argo CD, ponto de extensão, group/kind quando aplicável, dados e instalação. | P Parâmetros |
| R2 | Entregar primeira funcionalidade pequena, fixtures, build/pacote verificáveis e instruções de instalação. | P Parâmetros |
| R3 | Entrypoint instalado registra no host sem `createRoot`; features não acessam `window.extensionsAPI` diretamente; contexto passa por props. | P Limites |
| R4 | Preview monta a mesma UI com React local e fixtures; bundle instalado usa runtime do host, com configurações de entrada separadas. | P Dois ambientes |
| R5 | Externals e dependências são compatíveis com versão alvo; pacote não embute módulos do host e não contém HTML/mocks/fixtures de dev. | P Dois ambientes/Validação |
| R6 | Build produz `extension*.js` e recursos necessários; pacote tar inclui diretório `resources` reconhecido pelo installer. | B §5/7; P Comandos |
| R7 | Estilos ficam restritos à extensão; instalação real preserva layout e navegação do Argo CD. | P Limites/Validação |
| R8 | Executar verificação de tipos separadamente quando transpiler não faz isso; verificar typecheck, build e pacote. | P Dois ambientes/Validação |
| R9 | Preview cobre estados aplicáveis de carregamento, vazio e erro; testes são de comportamento dos componentes e integrações. | P Comandos/Validação |
| R10 | Backend só integra fluxo quando necessário, com ciclo separado; proxy/acesso negado são verificados no ambiente real e coerência dos headers/contexto é validada pelo backend. | B §4/7; P Estrutura/Validação |
| R11 | Demonstrar renderização instalada na versão alvo e reutilização em segundo projeto sem reconstruir infraestrutura de build/instalação. | B §9; P Validação |
| R12 | Comandos locais não publicam nem fazem deploy automaticamente; publicação/deploy dependem de pedido específico. | P Comandos |

## Limites de escopo documentados

- Não criar backend obrigatório, SDK próprio, abstração genérica de todas as APIs ou framework React completo com autenticação/roteamento/layout globais (P Origem/Limites).
- Preview não simula autenticação real e não certifica permissões de backend (P Limites).
- Não copiar loaders, bibliotecas de domínio, gestores, instruções `force` ou dependências antigas indiscriminadamente; referência em branch não fixa revisão e código reutilizado requer tag/commit e licença conferidos (B §2/4/5).
- Pesquisa não prova funcionamento nem inexistência de skill pronta fora da amostra (B §1/2).

## Pendências e decisões necessárias

1. Versão ou versões alvo de Argo CD e respectiva estratégia/matriz de compatibilidade.
2. Primeiro caso real e ponto de extensão: recurso, aplicação, global ou outro; group/kind quando necessário.
3. Fonte de dados, backend existente e permissões aplicáveis.
4. Método de instalação/publicação adotado, incluindo Helm/Kustomize quando relevante.
5. Preferência da equipe para gestor/lock e escolha final de toolchain, estilos e versões exatas.
6. Tag/commit das referências e validação de licenças antes de copiar código.
7. Metas numéricas para velocidade, correções manuais e compatibilidade.
8. Executar extensão mínima e segundo projeto antes de consolidar template/skill; não confundir proposta documentada com entrega implementada.

## Fontes externas relatadas mais relevantes

- https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- https://react.dev/learn/build-a-react-app-from-scratch
- https://github.com/argoproj-labs/rollout-extension/blob/master/ui/src/index.tsx
- https://raw.githubusercontent.com/argoproj-labs/rollout-extension/master/ui/webpack.config.js
- https://github.com/argoproj-labs/rollout-extension/pull/104
- https://github.com/argoproj-labs/argocd-extension-metrics
- https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/
- https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/
- https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- https://github.com/argoproj-labs/argocd-extension-installer
