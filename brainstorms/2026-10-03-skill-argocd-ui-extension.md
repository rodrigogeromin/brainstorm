# Skill para construção de projetos Argo CD UI Extension

- Data: 03/10/2026.
- Status: pesquisa concluída; PRD e decisões de arquitetura documentados, implementação pendente.
- Modalidade: pesquisa e brainstorm autônomos, avulsos.

Objetivo: acelerar a criação recorrente de extensões com práticas verificadas em projetos existentes.

O [registro completo da pesquisa](../_bmad-output/brainstorm-skill-argocd-ui-extension/brainstorm-skill-argocd-ui-extension.md) compara Rollout, Metrics, Assistant e o template público do ArgoProj Labs, diferencia evidência de recomendação e define os experimentos necessários antes de criar a skill.

A [memória da sessão](../_bmad-output/brainstorm-skill-argocd-ui-extension/.memlog.md) preserva as descobertas e a orientação do usuário.

[Visão visual da pesquisa](../_bmad-output/brainstorm-skill-argocd-ui-extension/brainstorm.html).

Evolução: [padrão React proposto para os projetos](../_bmad-output/brainstorm-skill-argocd-ui-extension/padrao-projeto.md), com organização por funcionalidades e integração específica com Argo CD.

Planejamento: [PRD final](../_bmad-output/prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md) e [índice dos ADRs](../_bmad-output/architecture-skill-argocd-ui-extension/README.md). As escolhas propostas estão identificadas; compatibilidade exige validação executável no host.

## Implementação local

Skill, template e gerador versionados em [skills/argocd-ui-extension](../skills/argocd-ui-extension/SKILL.md). [Resultados e evidências de dois projetos](../_bmad-output/implementation-skill-argocd-ui-extension/implementation.md): checks locais/harness e preview passaram; integração real no Argo CD 3.5.3 permanece not-run e a release não está certificada.
