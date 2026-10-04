# ADR-0003 — Template versionado e geração determinística

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-3.

## Contexto

O objetivo é repetibilidade entre pedidos independentes, com origem identificável.

## Decisão

Template e gerador determinístico são versionados juntos. Schema v2 aceita SemVer exata e os profiles resource-tab, system-level, status-panel, top-bar-action e app-view. Presets cobrem v3.0.0 e v3.5.3; outras releases aceitam hostContract auditado como parâmetro. O gerador valida tag/versão exatas, fontes oficiais, profile, método, props, globals/JSX e mapeamento antes de criar destino. extension-project.json preserva esse contrato junto com schemaVersion, templateVersion, parâmetros e registration. Proxy é opcional e separado da UI. Destino existente interrompe a geração antes de escrever; projetos v1 não são migrados nem atualizados automaticamente.

## Alternativas consideradas

Geração livre por LLM é flexível, mas altera infraestrutura. Templates remotos sem revisão fixa comprometem reprodutibilidade.

## Consequências

Esquema e validação devem ser implementados juntos antes do primeiro scaffold; migração é trabalho separado.

## Verificação e revisão

Vincula FR-2 a FR-5; Template, gerador e Skill. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
