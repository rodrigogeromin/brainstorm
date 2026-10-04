# Skill para construção de projetos Argo CD UI Extension

- Data: 03/10/2026.
- Status: skill implementada; schema v2/template 2.2.1, geração e migração verificadas localmente. Integração real exige evidência por artefato e release.
- Modalidade: pesquisa e brainstorm autônomos, avulsos.

Objetivo: acelerar a criação recorrente de extensões com práticas verificadas em projetos existentes.

O [registro completo da pesquisa](../_bmad-output/brainstorm-skill-argocd-ui-extension/brainstorm-skill-argocd-ui-extension.md) compara Rollout, Metrics, Assistant e o template público do ArgoProj Labs, diferencia evidência de recomendação e define os experimentos necessários antes de criar a skill.

A [memória da sessão](../_bmad-output/brainstorm-skill-argocd-ui-extension/.memlog.md) preserva as descobertas e a orientação do usuário.

[Apresentação do estado atual](../_bmad-output/brainstorm-skill-argocd-ui-extension/brainstorm.html).

Evolução: [padrão implementado, uso e evidências atuais](../_bmad-output/brainstorm-skill-argocd-ui-extension/padrao-projeto.md), com organização por funcionalidades e integração específica com Argo CD.

Planejamento: [PRD final](../_bmad-output/prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md) e [índice dos ADRs](../_bmad-output/architecture-skill-argocd-ui-extension/README.md). As escolhas propostas estão identificadas; compatibilidade exige validação executável no host.

## Implementação local

Atualizado em 04/10/2026. Cinco perfis cobrem os seis cenários oficiais de UI; presets exatos 3.0.0/3.5.1/3.5.3 e auditoria para outros alvos. Migração preserva UI, ferramentas e origem.

Skill, template e gerador versionados em [skills/argocd-ui-extension](../skills/argocd-ui-extension/SKILL.md). [Resultados e evidências de dois projetos](../_bmad-output/implementation-skill-argocd-ui-extension/implementation.md): checks locais/harness e preview passaram; integração real no Argo CD 3.5.3 permanece not-run e a release não está certificada.

As [correções derivadas do catálogo](../_bmad-output/implementation-skill-argocd-ui-extension/catalog-feedback.md) registram 21 testes e a migração de um projeto funcional. O catálogo tem instalação persistente documentada em 3.5.1; a interação no navegador continua não verificada. Não há certificação geral de versões futuras.
