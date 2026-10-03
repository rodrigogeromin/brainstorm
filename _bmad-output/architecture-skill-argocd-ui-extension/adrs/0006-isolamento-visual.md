# ADR-0006 — Estilos sob contêiner exclusivo

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-6.

## Contexto

O Argo CD compartilha a página com a extensão; isolamento precisa funcionar inclusive com CSS importado.

## Decisão

Cada extensão usa contêiner com identificador derivado do nome validado. Todos os seletores e nomes de animação próprios são exclusivos; seletores ficam sob o contêiner. Não aplicar reset global nem alterar body, html ou layout do host. Portais permanecem dentro do contêiner ou usam escopo equivalente verificado. Não introduzir biblioteca visual com CSS global no template mínimo. Layout respeita área disponível e mantém conteúdo excedente acessível por rolagem.

## Alternativas consideradas

CSS Modules é alternativa válida, mas sozinho não impede resets globais. Escolhe-se escopo explícito na base mínima.

## Consequências

Menos dependências iniciais; revisão de estilos deve incluir portais e terceiros, além de classes próprias.

## Verificação e revisão

Vincula FR-8; UI e estilos. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
