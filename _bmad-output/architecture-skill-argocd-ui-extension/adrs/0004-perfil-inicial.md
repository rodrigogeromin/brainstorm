# ADR-0004 — Profiles condicionados à versão

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-4.

## Contexto

O PRD deixou aba de recurso ou aplicação como suposição; é necessário um caso concreto para testar o template.

## Decisão

Os profiles são resource-tab (incluindo Application via argoproj.io/Application), system-level, status-panel, top-bar-action e app-view, condicionados ao contrato da tag selecionada. Presets cobrem v3.0.0 e v3.5.3; outras releases precisam fornecer hostContract auditado com URL oficial, método, assinatura, props, globals e argumentMap. O adaptador resolve o mapeamento declarado, sem comparações com versões vizinhas. Método ausente ou assinatura ambígua bloqueia geração. Flyouts e filtros só são usados quando a assinatura aceita. Resource actions e custom health checks não pertencem a estes profiles React.

## Alternativas consideradas

Aba de recurso arbitrário exige escolher um domínio agora; página global muda o contrato inicial.

## Consequências

Permite validar sem inventar produto de negócio. Não declara suporte universal a todo recurso.

## Verificação e revisão

Vincula A3, FR-3, FR-7; primeiro perfil. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
