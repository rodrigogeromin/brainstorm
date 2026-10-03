# ADR-0001 — UI por funcionalidades e adaptador do host

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-1.

## Contexto

O preview e o host precisam consumir a mesma UI, mantendo a integração substituível.

## Decisão

src/argocd é dono do registro e dos tipos de contexto do host. src/index.tsx conecta esse adaptador a src/app; app compõe features e components. Features não importam o entrypoint nem acessam extensionsAPI. Props do host são somente leitura; estado de interação pertence à UI. Tipos consumidos pela UI têm uma única definição em argocd/types.ts, sem SDK genérico.

## Alternativas consideradas

Acoplamento direto ao host simplifica o início, mas prejudica o preview. SDK genérico acrescentaria escopo sem três casos concretos.

## Consequências

Uma camada pequena de integração e dependências direcionadas; mudanças do host ficam concentradas.

## Verificação e revisão

Vincula FR-1, FR-6, FR-7; UI e integração. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
