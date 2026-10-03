# ADR-0004 — Perfil inicial de aba de Application

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-4.

## Contexto

O PRD deixou aba de recurso ou aplicação como suposição; é necessário um caso concreto para testar o template.

## Decisão

O primeiro perfil é resource-tab, registrado para group argoproj.io e kind Application. O exemplo neutro mostra contexto recebido, sem funcionalidades de negócio. O adaptador aceita os props documentados application, resource e tree; fixtures seguem os mesmos tipos e tratam ausências. Perfis adicionais exigem adaptador, fixtures e evidência próprios. O pedido pode parametrizar group/kind quando o perfil for validado para outros recursos.

## Alternativas consideradas

Aba de recurso arbitrário exige escolher um domínio agora; página global muda o contrato inicial.

## Consequências

Permite validar sem inventar produto de negócio. Não declara suporte universal a todo recurso.

## Verificação e revisão

Vincula A3, FR-3, FR-7; primeiro perfil. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
