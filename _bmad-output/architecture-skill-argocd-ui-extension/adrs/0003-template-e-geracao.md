# ADR-0003 — Template versionado e geração determinística

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-3.

## Contexto

O objetivo é repetibilidade entre pedidos independentes, com origem identificável.

## Decisão

Template e gerador determinístico são versionados juntos. A Skill coleta parâmetros e invoca o gerador; não reescreve build/empacotamento por improvisação. O contrato executável de geração, com esquema, defaults normalizados e tipos, pertence ao gerador e é compartilhado pela validação e pelos consumidores. Ele deve existir antes de implementar Skill e gerador independentemente; mudanças versionam schemaVersion. Fixtures importam os tipos únicos do adaptador do host. Cada projeto contém extension-project.json com schemaVersion, templateVersion, name, description, argoCdVersion, profile e registration; para resource-tab, registration contém group, kind e tabTitle. Destino é argumento da geração, não caminho absoluto persistido. Dados opcionais usam configuração explícita sem segredos. Destino existente interrompe a geração antes de escrever; autorização de alteração exige plano explícito. Atualizações nunca são automáticas.

## Alternativas consideradas

Geração livre por LLM é flexível, mas altera infraestrutura. Templates remotos sem revisão fixa comprometem reprodutibilidade.

## Consequências

Esquema e validação devem ser implementados juntos antes do primeiro scaffold; migração é trabalho separado.

## Verificação e revisão

Vincula FR-2 a FR-5; Template, gerador e Skill. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
