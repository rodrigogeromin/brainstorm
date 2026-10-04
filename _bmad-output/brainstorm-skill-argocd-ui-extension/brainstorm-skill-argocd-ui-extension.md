---
type: brainstorm
title: Skill para construção de projetos Argo CD UI Extension
created: 2026-10-03
status: em-exploracao
---

# Skill para construção de projetos Argo CD UI Extension

> Registro histórico de 03/10/2026. A implementação evoluiu para schema v2/template 2.2.1. Consulte o [estado atual, uso e evidências](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md) antes de usar pendências ou restrições originais como descrição da skill instalada.


Pesquisa autônoma e avulsa. Objetivo registrado: velocidade e assertividade na criação recorrente de extensões. Orientação inicial: derivar a base de implementações existentes. Evolução em 03/10/2026: o usuário solicitou um padrão local baseado em organização React, com adaptação ao Argo CD.

## 1. Conclusão sustentada pela amostra e evolução da direção

Há implementações reutilizáveis e um template público. A amostra não revela uma estrutura universal de projeto: o contrato com o Argo CD é mais consistente do que nomes de pastas, ferramentas e dependências.

**Direção atual:** estabelecer uma base React única para a equipe, organizada por funcionalidades, e concentrar registro, contratos do host e build de extensão na integração com Argo CD. A pesquisa inicial passa a fundamentar esse template, em vez de selecionar uma árvore diferente para cada novo projeto.

O [padrão de projeto proposto](padrao-projeto.md) define diretórios, responsabilidades, preview local, bundle instalado, comandos e critérios de validação. Ele adapta a organização do Bulletproof React e os contratos observados no Rollout/Metrics; não afirma ser um padrão oficial do React ou Argo CD.

A pesquisa não encontrou, nesta amostra, uma skill pronta de Codex dedicada a esse fluxo. Isso não demonstra que ela inexista em outros catálogos.

## 2. Método e limites

Foram usados Six Thinking Hats para separar fatos e riscos, Solution Matrix para comparar implementações e Decision Tree Mapping para organizar critérios de seleção. Não foram geradas cem ideias especulativas: a restrição explícita pede práticas codificadas.

Amostra intencional do ArgoProj Labs, com documentação oficial como referência de contrato. Não é levantamento de todos os desenvolvedores. Pesquisa em 03/10/2026, com páginas servidas por cache em datas diferentes. Links de branch não fixam revisão; antes de copiar código, selecionar tag ou commit e conferir licença.

Foram lidos código, manifestos, scripts de package.json, documentação e uma correção já integrada. O acesso direto à API do GitHub expirou, e alguns arquivos não estavam disponíveis pelo navegador de pesquisa. Nenhum projeto foi compilado ou instalado; evidência documental não equivale a certificação de funcionamento.

## 3. Implementações examinadas

| Referência | Evidência acessível | Prática útil | Limite |
| --- | --- | --- | --- |
| [Example Extension](https://github.com/argoproj-labs/argocd-example-extension) | Repositório marcado como template público. | Candidato para iniciar scaffold. | Build e fontes não recuperados suficientemente. |
| [Rollout Extension](https://github.com/argoproj-labs/rollout-extension) | UI, entrypoint, Webpack e PR de compatibilidade. | Integração de recurso, React compartilhado, distribuição e instalação. | Lógica específica de Rollouts não deve virar obrigação de toda extensão. |
| [Metrics](https://github.com/argoproj-labs/argocd-extension-metrics) | Estrutura e manifestos/documentação. | UI separada de backend, proxy, RBAC e configuração de serviço. | Build completo não inspecionado; requisito mínimo histórico não garante compatibilidade atual. |
| [Assistant](https://github.com/argoproj-labs/assistant-for-argocd) | package.json e documentação de desenvolvimento. | Build e pacote explícitos; backend via proxy. | Dependências e instruções antigas exigem validação. |
| [Ephemeral Access](https://github.com/argoproj-labs/argocd-ephemeral-access) | Citado no guia oficial de migração React 19. | Outra referência de correção de compatibilidade. | Não houve inspeção suficiente do código nesta rodada. |

## 4. O que o código mostra

### Rollout: integração de recurso e contrato do bundle

O [entrypoint](https://github.com/argoproj-labs/rollout-extension/blob/master/ui/src/index.tsx) recebe application, tree e resource, adapta os dados ao RolloutWidget e registra uma aba para `argoproj.io/Rollout`. Também consulta recursos pela API do Argo CD. Isso demonstra que uma UI pode usar contexto e API existentes sem exigir um backend novo.

O [Webpack](https://raw.githubusercontent.com/argoproj-labs/rollout-extension/master/ui/webpack.config.js) usa TypeScript/TSX, saída para window e externals de React, ReactDOM e runtime JSX. Há regras específicas para evitar importar estilos globais de argo-ui. Não universalizar esses loaders: eles respondem às dependências daquele projeto.

### Metrics: UI com dados de serviço externo

O [projeto Metrics](https://github.com/argoproj-labs/argocd-extension-metrics) mantém UI e servidor de métricas separados. O servidor consulta Prometheus; a UI renderiza resultados. A instalação configura proxy extension, permissão de invoke e endereço de backend. Sua UI fica em uma pasta aninhada de extensions, diferente de `ui/` do Rollout.

**Inferência para a skill:** incluir orientação de proxy quando houver backend, sem gerar um servidor obrigatório para toda extensão.

### Assistant: comandos reproduzíveis, com ressalvas

O [package.json](https://github.com/argoproj-labs/assistant-for-argocd/blob/main/package.json) possui build por Webpack/ts-node e empacotamento tar do diretório resources. Sua documentação usa Yarn e descreve cópia para um Argo CD em execução durante desenvolvimento.

A indicação de instalação com force e menção a React antigo são sinais de contexto específico, não boas práticas universais. Devem ser investigadas antes de virar instruções da skill.

## 5. Contratos recorrentes e decisões variáveis

| Aspecto | Base observada | Tratamento na futura skill — recomendação |
| --- | --- | --- |
| Registro | `extensionsAPI` e componente React. | Escolher ponto de extensão conforme a tela desejada. |
| Runtime | React do host; correções reais para React 19. | Validar externals e bibliotecas contra a versão alvo. |
| Artefato | JS com prefixo extension, instalado no servidor. | Verificar saída e conteúdo do pacote. |
| Distribuição | Installer por init container; pacote resources. | Reutilizar o contrato do installer. |
| Backend | Metrics e Assistant usam proxy. | Configurar apenas quando necessário. |
| Pastas | ui, src ou extensions aninhado. | Adotar a árvore local documentada em padrao-projeto.md; origem e adaptação explícitas. |
| Package manager | Yarn no Assistant/Metrics; pnpm-lock no Rollout. | Proposta local de npm e package-lock; preferência da equipe pode substituir ambos. |
| Bibliotecas visuais | Dependências específicas de domínio. | Copiar somente as necessárias à extensão. |

A [documentação de UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/) define registro e entrega de JS no argocd-server. A assinatura da API precisa ser conferida na versão alvo, especialmente quando exemplos e assinaturas publicados divergem.

## 6. Compatibilidade é parte da construção

A [correção Rollout #104](https://github.com/argoproj-labs/rollout-extension/pull/104) foi integrada e externaliza ReactDOM e runtime JSX. O [guia oficial de React 19](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/) estabelece esse cuidado a partir de Argo CD 3.5 e alerta para dependências ainda incompatíveis.

Portanto, copiar um exemplo que compila não demonstra que ele carregará no host. A skill precisa conhecer a versão de Argo CD e verificar o bundle e a renderização real. Não selecionar uma versão universal de React nesta pesquisa.

## 7. Instalação e acesso a backend

O [Extension Installer](https://github.com/argoproj-labs/argocd-extension-installer) documenta tar com diretório resources, instalação por init container e configuração por nome, versão e URL. Checksum é suportado, mas opcional no contrato upstream. A exigência de checksum nos projetos da equipe seria uma decisão local.

O [guia de Proxy Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/) documenta autenticação, autorização e headers de contexto. O backend também precisa validar a coerência desse contexto com a requisição. Não assumir que o token do usuário será encaminhado ao serviço.

O antigo [argocd-extensions](https://github.com/argoproj-labs/argocd-extensions) está depreciado e aponta para o installer. Seu controlador antigo não é a base recomendada.

## 8. Como transformar a evidência em skill

A skill deverá gerar projetos a partir do [template local proposto](padrao-projeto.md), validado na versão alvo, e adaptar nome, ponto de extensão e fonte de dados. A organização React será reutilizada; o contrato do host continuará específico da versão.

A mudança de direção foi solicitada pelo usuário. Os nomes de diretórios e comandos são propostas explícitas, baseadas nas referências, e ainda dependem de validação executável. Não foi criada uma skill ou implementação do template nesta rodada.

## 9. Experimentos e critérios de sucesso propostos

| Experimento | Evidência esperada |
| --- | --- |
| Extensão mínima para recurso, derivada do registro do Rollout. | Aba correta carrega sem conflito de runtime. |
| Extensão com backend, usando contrato de proxy do Metrics. | Dados chegam e acesso negado é tratado corretamente. |
| Empacotar e instalar em ambiente de desenvolvimento. | Installer encontra o JS e extensão aparece após carregamento. |
| Criar um segundo projeto com a mesma skill. | Partes comuns são reutilizadas sem refazer build e instalação. |

Medir tempo até primeira renderização válida, correções manuais de scaffold e falhas de compatibilidade. Não há meta numérica aprovada ainda.

## 10. Pendências e próximo passo

- Versão ou versões de Argo CD usadas pela equipe.
- Primeiro caso real: aba de recurso, aplicação, página global ou outro ponto.
- Fonte dos dados e existência de backend.
- Método de instalação e publicação já adotado.
- Referência/tag a fixar após validação executável.

**Direção recomendada:** validar a estrutura React proposta com uma extensão mínima na versão da equipe, depois extrair o template executável para a skill. Rollout fundamenta registro/build; Metrics fundamenta integrações com backend quando necessárias.

## 11. Evolução registrada

Em 03/10/2026, o usuário pediu a criação de um padrão local a partir da reflexão de que uma UI Extension é um projeto React adaptado ao host. A decisão de padronizar está registrada. A proposta técnica está em [padrao-projeto.md](padrao-projeto.md); implementação, ferramentas exatas e compatibilidade ainda precisam de validação.
