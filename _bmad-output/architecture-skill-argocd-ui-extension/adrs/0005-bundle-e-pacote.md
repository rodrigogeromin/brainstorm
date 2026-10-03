# ADR-0005 — Bundle único e pacote resources

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-5.

## Contexto

O host carrega arquivos com prefixo extension; o installer pesquisado exige resources no tar.

## Decisão

A entrega inicial produz um único extension-<name>.js autocontido quanto aos recursos próprios, com estilos incorporados; módulos do host permanecem externos. Sem chunks dinâmicos ou assets obtidos por URL na base inicial. package gera tar.gz com resources/extension-<name>.js e somente arquivos explicitamente permitidos. Exclui dev, HTML de preview, source maps de desenvolvimento, credenciais e dependências locais. A instalação disponibiliza o conteúdo ao argocd-server sob /tmp/extensions, preservando o prefixo extension. Método e imagem de instalação ficam condicionados ao ambiente escolhido.

## Alternativas consideradas

Chunks e CSS separados podem reduzir tamanho, mas exigem validar resolução de URLs; servem a uma evolução posterior.

## Consequências

Pacote simples de inspecionar e transportar. Crescimento de bundle pode motivar revisão deste ADR.

## Verificação e revisão

Vincula FR-9; build, package e instalação. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
