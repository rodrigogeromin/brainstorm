---
title: Padrão, template e skill para Argo CD UI Extensions
status: draft
created: 2026-10-03
updated: 2026-10-03
---

# PRD — Padrão, template e skill para Argo CD UI Extensions

## Propósito

Definir o que precisa ser entregue para criar projetos Argo CD UI Extension com velocidade e assertividade, a partir de uma organização React consistente e dos contratos reais de integração com Argo CD. Este rascunho está em descoberta; requisitos completos e escopo inicial aguardam a escolha de condução e o contexto adicional do responsável.

## Insumos

- [Brainstorm e pesquisa](../brainstorm-skill-argocd-ui-extension/brainstorm-skill-argocd-ui-extension.md).
- [Padrão proposto](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md).
- [Histórico de decisões](../brainstorm-skill-argocd-ui-extension/.memlog.md).

## Direção registrada

Criar um padrão local para projetos React integrados ao Argo CD e uma skill que facilite sua construção recorrente. Basear as escolhas em implementações existentes e referências verificáveis. A padronização foi solicitada; ferramentas, versões e demais propostas técnicas ainda não foram aprovadas individualmente.

## Entregas a detalhar

- Padrão documentado com responsabilidades e limites.
- Template executável que implemente o padrão.
- Skill que use o template para criar e validar projetos.
- Evidência de compatibilidade e reutilização em casos reais.

## Lacunas de descoberta

- Usuários, distribuição interna ou pública e contexto de adoção.
- Versão alvo do Argo CD e primeiro caso de extensão.
- Escopo: projetos novos, existentes ou ambos.
- Integração com backend e forma de instalação/publicação.
- Metas de velocidade e limites de ajustes manuais.

Detalhes de diretórios, bundler e comandos serão preservados em addendum.md como propostas de solução; o PRD concentrará comportamento e resultados verificáveis.
