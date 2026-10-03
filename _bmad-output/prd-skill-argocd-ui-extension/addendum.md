# Complemento técnico — propostas existentes

A fonte técnica é o [padrão proposto](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md). Este complemento preserva suas escolhas sem promovê-las a requisitos aprovados.

| Proposta | Situação |
| --- | --- |
| Organização React por funcionalidades e componentes compartilhados. | Direção de padronizar confirmada; árvore detalhada proposta. |
| src/argocd para registro e contratos do host; dev separado. | Proposta de implementação. |
| React/TypeScript e Webpack. | Fundamentados na amostra; versões e escolha final pendentes. |
| npm e package-lock. | Proposta local; preferência de Rodrigo prevalece. |
| dev, typecheck, lint, test, build e package. | Comandos propostos, ainda não implementados. |
| CSS Modules ou escopo sob contêiner. | Alternativas a decidir. |
| Uma extensão na raiz do repositório. | Proposta de organização inicial. |

O contrato oficial de [UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/) exige registro e integração com runtime do host; o [installer](https://github.com/argoproj-labs/argocd-extension-installer) documenta o pacote resources. A [migração React 19](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/) deve ser consultada para a versão alvo. Nenhuma compilação ou instalação foi executada nesta criação de PRD.

## Contexto confirmado para a implementação

Uso pessoal; intervalo desejado de Argo CD estritamente superior a 3.5.1. Fixar uma versão exata disponível para teste antes de selecionar React e demais dependências. Perfil inicial de aba, Codex local e ausência de backend próprio são suposições do PRD, não novas confirmações do usuário.

O exemplo neutro deve apresentar contexto de aplicação/recurso e ser substituível por uma funcionalidade real. Se instalação depender de Helm ou Kustomize, escolher o método que Rodrigo utiliza, sem gerar ambos obrigatoriamente.

Na revisão técnica, verificar lint e testes de comportamento, além de typecheck/build/package; preservar preview e recursos de produção separados. Ampliar a matriz de compatibilidade somente após nova evidência integrada.

## Detalhes preservados da reconciliação

Antes de reutilizar código upstream, registrar tag ou commit e conferir a licença. O entrypoint instalado registra componentes via `extensionsAPI`; a montagem com `createRoot` pertence ao preview. Manter acesso ao registro na camada de integração, passando contexto por props à UI.

O preview não reproduz autenticação real nem comprova permissões de backend. Para o installer pesquisado, produzir tar com diretório `resources`; a implementação deve decidir se usará bundle único ou chunks e demonstrar que todos os recursos carregam no host.
