# ADR-0007 — Compatibilidade por versão exata e evidência

Data: 2026-10-03. Status: Adotado do PRD [ADOPTED]. Identificador estável: AD-7.

## Contexto

O PRD distingue o intervalo desejado de compatibilidade demonstrada.

## Decisão

Cada geração identifica a versão SemVer exata, tag e fontes oficiais, assinatura, props, mapa de registro e globals React da release, por preset ou hostContract fornecido. Relatório identifica projeto, profile, tag/fontes, assinatura, props, globals, revisão do template, hash SHA-256 do bundle e pacote, ambiente e cada check com passed, failed ou not-run. Preview e build local não provam integração. Só incluir uma versão na matriz integrada após registro/renderização no host exato, inspeção do runtime, acesso em painel estreito e amplo e tema escuro quando disponível. Evidência vale somente para os hashes instalados; rebuild exige confirmação de identidade. Mudança de conteúdo exige nova validação integrada.

## Alternativas consideradas

Faixa semver aberta reduz trabalho de manutenção, mas produz uma promessa sem evidência.

## Consequências

Exige ambiente real para concluir; permite progresso local com validação integrada pendente.

## Verificação e revisão

Vincula FR-10, FR-11, NFR-1, NFR-2; validação. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
