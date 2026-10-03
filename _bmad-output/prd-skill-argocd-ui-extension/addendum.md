# Complemento técnico — propostas existentes

A fonte técnica é o [padrão proposto](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md). Este complemento preserva suas escolhas sem promovê-las a requisitos aprovados.

| Proposta | Situação |
| --- | --- |
| Organização React por funcionalidades e componentes compartilhados. | Direção de padronizar confirmada; árvore detalhada proposta. |
| src/argocd para registro e contratos do host; dev separado. | Proposta de implementação. |
| React/TypeScript e Webpack. | Fundamentados na amostra; versões e escolha final pendentes. |
| npm e package-lock. | Proposta local; preferência da equipe prevalece. |
| dev, typecheck, lint, test, build e package. | Comandos propostos, ainda não implementados. |
| CSS Modules ou escopo sob contêiner. | Alternativas a decidir. |
| Uma extensão na raiz do repositório. | Proposta de organização inicial. |

O contrato oficial de [UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/) exige registro e integração com runtime do host; o [installer](https://github.com/argoproj-labs/argocd-extension-installer) documenta o pacote resources. A [migração React 19](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/) deve ser consultada para a versão alvo. Nenhuma compilação ou instalação foi executada nesta criação de PRD.
