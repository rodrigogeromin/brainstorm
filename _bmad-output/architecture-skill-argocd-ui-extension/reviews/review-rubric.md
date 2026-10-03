# Revisão independente — reconciliação, good-spine e editorial

Data: 2026-10-03. Escopo: índice de arquitetura e ADR-0001 a ADR-0009, confrontados com PRD final, complemento e padrão proposto. Revisão documental; não houve execução do template ou validação integrada.

## Veredito

A arquitetura cobre os requisitos e fixa os principais contratos entre UI, adaptador, preview, gerador e pacote. Adequada para orientar a implementação após um ajuste de precisão no status de AD-9. Nenhum achado crítico ou alto.

## Achados

### R-1 — Médio: AD-9 herda suposições sem preservar seu status

**Local:** AD-9 no índice e ADR-0009, campo Status.

A decisão está marcada integralmente como `Adotado do PRD [ADOPTED]`, embora vincule A1, A2 e A4. O PRD distingue essas hipóteses das confirmações do usuário. Uso local no Codex, prioridade para projetos novos e ausência de backend inicial são escolhas autorizadas como suposições, não confirmações individuais. A legenda do índice torna essa diferença relevante para o implementador.

**Correção sugerida:** identificar AD-9 como proposta que herda A1/A2/A4 e preservar explicitamente o caráter adotado apenas dos requisitos confirmados, como ações externas solicitadas e integridade do pacote. É suficiente status misto com descrição clara; não exige nova decisão ou pergunta ao usuário.

### R-2 — Baixo: termo técnico incorreto na toolchain

**Local:** AD-8 e ADR-0008: `typecheck é independente da transpiração`.

**Correção sugerida:** substituir `transpiração` por `transpilação`. Não muda a decisão.

## Reconciliação de entradas

| Entrada | Resultado |
| --- | --- |
| Uso pessoal, Argo CD estritamente >3.5.1, ausência de extensão de negócio | Preservados no escopo, AD-4, AD-7 e pendências. Não há promessa de suporte futuro. |
| FR-1 a FR-5: padrão, template, parâmetros, geração e instalação da skill | Cobertos por AD-1/AD-3/AD-8; distribuição local permanece explícita e tem momento para fechamento. A definição única do esquema impede divergência entre gerador e validação. |
| FR-6 a FR-8: mesma UI, runtime e convivência visual | Cobertos por AD-1/AD-2/AD-4/AD-6/AD-7, incluindo props, fixtures, painel estreito/amplo e tema escuro aplicável. |
| FR-9 a FR-12: pacote, resultados, compatibilidade e continuidade | Cobertos por AD-3/AD-5/AD-7/AD-9. Referências ao PRD preservam dois projetos, guia e critérios de conclusão. |
| NFR-1 a NFR-4 e SM-1 a SM-3/SM-C1 | Reprodutibilidade, evidência, manutenção e integridade explícitas; baseline/meta ficam adiados sem suprimir correção e teste integrado. |
| Complemento e padrão React pesquisado | A arquitetura resolve alternativas antes abertas: contêiner CSS, bundle único e Webpack/npm. São propostas marcadas; não apresenta escolhas como padrão universal upstream. Mantém revisão/licença para cópia de código. |

## Good-spine

- Paradigma nomeado, fronteiras e direção de dependências legíveis; tipos do host têm proprietário único e props são somente leitura.
- ADs possuem Binds, Prevents e regras verificáveis por inspeção do código, pacote ou evidência do host. Nenhuma regra contradiz os requisitos.
- Deferred tem responsável, momento e limite. Versões exatas, instalação e esquema detalhado precisam fechar antes das unidades dependentes; não são decisões deixadas livres para implementações incompatíveis.
- O envelope operacional está coberto: execução local, pacote, instalação separada, ambiente de teste, evidência, backend eventual e publicação solicitada. Não introduz provedor ou serviço desnecessário.
- Não existe código de extensão a ratificar; o padrão anterior permanece proposta. Fontes upstream estão identificadas e a revisão alvo antecede dependências. Esta revisão não revalidou independentemente páginas web.
- Árvore e ferramentas têm caráter inicial; contratos duráveis permanecem nos ADs. O índice declara que finalização documental não comprova template funcional.

## Editorial — artefatos humanos

Estrutura dos ADRs consistente: contexto, decisão, alternativas, consequências e verificação. IDs estáveis e links para PRD/índice facilitam navegação. Prosa suficientemente curta para uso pessoal. Além de R-2, nenhum ajuste editorial necessário para a entrega.

As seções de verificação são deliberadamente compartilhadas com o PRD: não relatam testes executados e não inflacionam a evidência disponível.
