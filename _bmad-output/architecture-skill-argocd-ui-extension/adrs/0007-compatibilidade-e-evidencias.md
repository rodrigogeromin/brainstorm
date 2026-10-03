# ADR-0007 — Compatibilidade por versão exata e evidência

Data: 2026-10-03. Status: Adotado do PRD [ADOPTED]. Identificador estável: AD-7.

## Contexto

O PRD distingue o intervalo desejado de compatibilidade demonstrada.

## Decisão

Fixar Argo CD exato >3.5.1 antes das dependências. Template registra versões e lockfile. Relatório identifica projeto, revisão do código gerado, versão e revisão do template, hash SHA-256 do bundle e pacote efetivamente instalados, alvo, ambiente e cada comando/check com passed, failed ou not-run. Preview e typecheck/build/package não provam integração. Só incluir versão na matriz testada após registro/renderização no host, inspeção do runtime, acesso a conteúdo em painel estreito e amplo com dimensões registradas e tema escuro quando disponível. Falha ou check obrigatório não executado impede conclusão da release inicial. Evidência vale somente para os hashes instalados e a versão exata testada; rebuild não herda validação sem confirmar identidade do artefato. Mudança de conteúdo exige nova validação integrada.

## Alternativas consideradas

Faixa semver aberta reduz trabalho de manutenção, mas produz uma promessa sem evidência.

## Consequências

Exige ambiente real para concluir; permite progresso local com validação integrada pendente.

## Verificação e revisão

Vincula FR-10, FR-11, NFR-1, NFR-2; validação. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
