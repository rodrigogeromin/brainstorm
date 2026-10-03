# ADRs — padrão e skill Argo CD UI Extension

[Índice de arquitetura e regras](architecture-skill-argocd-ui-extension.md) · [PRD](../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md)

Decisões adotadas derivam de requisitos ou contratos existentes; propostas são suposições revisáveis. Nenhuma decisão certifica implementação.

| ID | Registro | Status |
| --- | --- | --- |
| AD-1 | [UI por funcionalidades e adaptador do host](adrs/0001-camadas-e-contrato-do-host.md) | Proposto [ASSUMPTION] |
| AD-2 | [Duas entradas e runtime React do host](adrs/0002-duas-entradas-um-runtime.md) | Adotado do contrato upstream [ADOPTED] |
| AD-3 | [Template versionado e geração determinística](adrs/0003-template-e-geracao.md) | Proposto [ASSUMPTION] |
| AD-4 | [Perfil inicial de aba de Application](adrs/0004-perfil-inicial.md) | Proposto [ASSUMPTION] |
| AD-5 | [Bundle único e pacote resources](adrs/0005-bundle-e-pacote.md) | Proposto [ASSUMPTION] |
| AD-6 | [Estilos sob contêiner exclusivo](adrs/0006-isolamento-visual.md) | Proposto [ASSUMPTION] |
| AD-7 | [Compatibilidade por versão exata e evidência](adrs/0007-compatibilidade-e-evidencias.md) | Adotado do PRD [ADOPTED] |
| AD-8 | [Toolchain inicial React, TypeScript, Webpack e npm](adrs/0008-toolchain-inicial.md) | Proposto [ASSUMPTION] |
| AD-9 | [Operação local e backend opcional](adrs/0009-operacao-e-evolucao.md) | Misto: restrições adotadas; A1/A2/A4 [ASSUMPTION] |
