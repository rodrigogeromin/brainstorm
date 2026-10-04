# Padrão e skill Argo CD UI Extension — estado atual

Atualizado em 04/10/2026. Skill implementada: schema v2, template 2.2.1. [Instruções executáveis](../../skills/argocd-ui-extension/SKILL.md) · [Apresentação](brainstorm.html) · [Pesquisa original](brainstorm-skill-argocd-ui-extension.md).

O produto é uma skill local para criar e adaptar projetos React/TypeScript hospedados no Argo CD. Ela reúne gerador determinístico, template, contratos por release, preview, build, pacote e validação. O agente implementa a funcionalidade solicitada; gerar o scaffold é apenas uma etapa.

A organização é uma convenção local baseada nas implementações pesquisadas, não uma árvore oficial do React ou Argo CD. Uso pessoal, projetos independentes e domínio definido por pedido. Recursos de backend/proxy são opcionais e separados da UI.

## Escopo e pontos de extensão

Os seis cenários da [documentação oficial de UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/) são representados por cinco perfis do manifesto:

| Cenário | Perfil | Método do host | Construção |
| --- | --- | --- | --- |
| Resource Tab | `resource-tab` | `registerResourceExtension` | Aba de recurso, com group/kind/tabTitle. Grupo core usa `""`; `"**"` inclui todos os grupos. |
| Application Tab | `resource-tab` | `registerResourceExtension` | Mesmo contrato, group `argoproj.io`, kind `Application`. |
| System Level | `system-level` | `registerSystemLevelExtension` | Página sem contexto de Application garantido. |
| Application Status Panel | `status-panel` | `registerStatusPanelExtension` | Resumo compacto e flyout opcional. |
| Top Bar Action Menu | `top-bar-action` | `registerTopBarActionMenuExt` | Label da ação controlada pelo host; UI completa no flyout. |
| App View | `app-view` | `registerAppViewExtension` | Visão de Application com application/tree. |

Props, argumentos opcionais e comportamento de montagem são verificados na versão exata. O componente Top Bar não cria outro botão nem repete o ícone que o host fornece. Main props e flyout props são contratos separados. `shouldDisplay` recebe Application quando previsto na assinatura.

Resource actions, health checks e config management plugins não são React UI extensions e ficam fora deste escopo. [Guia de construção por perfil](../../skills/argocd-ui-extension/references/profile-guide.md).

## Versões e runtime

Não existe versão única obrigatória. Existem presets auditados para releases específicas:

| Argo CD | React / ReactDOM | JSX e globals | Lockfile upstream |
| --- | --- | --- | --- |
| 3.0.0 | 16.14.0 | Classic; React e ReactDOM | ui/yarn.lock |
| 3.5.1 | 19.2.6 | Automatic; também ReactJSXRuntime | ui/pnpm-lock.yaml |
| 3.5.3 | 19.2.6 | Automatic; também ReactJSXRuntime | ui/pnpm-lock.yaml |

Em App View, `shouldDisplay` não existe no contrato 3.0.0 e existe nos presets 3.5.1/3.5.3. Tipos React também são fixados pelo contrato auditado. Produção externaliza o runtime fornecido pelo host; o preview usa dependências locais alinhadas, com render para React 16/17 e createRoot para 18/19.

Para outra release exata, `audit-host.mjs` coleta extension service, bootstrap, package.json e o lockfile existente, com fontes/hashes. O resultado permanece `contractReviewed:false`: o agente lê as fontes e registra o contrato. Também deve inspecionar o consumidor que monta a UI. Versões ou forks com assinatura/runtime diferentes exigem adaptar e testar schema, adapter e ferramentas; não há promessa de compatibilidade universal por aceitar SemVer. [Guia de versão/runtime](../../skills/argocd-ui-extension/references/version-guide.md).

## Estrutura implementada

```text
extension-name/
├── extension-project.json         # alvo, perfil, contrato e origem
├── src/
│   ├── index.tsx                  # registra; não monta root no host
│   ├── app/Extension.tsx          # composição e flyout quando aplicável
│   ├── argocd/                    # register, types e visibility
│   ├── features/                  # funcionalidades do pedido
│   └── styles/extension.css       # escopo da extensão
├── dev/                          # preview, fixtures, runtime e testes
├── references/                   # host-contract, schema e tipos de parâmetros
├── scripts/                      # setup-runtime, validate, evidence, inspect, package
├── webpack.config.cjs
├── tsconfig.json
├── package.json
├── package-lock.json
└── dist/                         # gerado: resources JS e tar.gz
```

Criar componentes compartilhados e clientes API somente quando o domínio precisar. Não são gerados manifests de instalação ou backend automaticamente. Novos projetos usam npm; adoção de outro gestor exige adaptar ferramentas e lock, não apenas trocar o comando.

## Como usar com Amelia

Exemplo de pedido:

> Amelia, use a skill argocd-ui-extension para criar uma Top Bar no Argo CD 3.5.1 que abra um catálogo no flyout. O projeto será novo; use dados locais e valide o resultado.

A skill instalada fica em `~/.agents/skills/argocd-ui-extension`. O pedido deve informar o destino, versão exata, cenário e comportamento desejado. O agente pode levantar o contexto disponível e definir detalhes de implementação dentro desse escopo. Instalação, publicação e push são etapas solicitadas separadamente.

Fluxo de projeto novo:

1. Selecionar perfil e auditar o contrato da versão exata.
2. Escrever parâmetros JSON e executar `node <skill>/scripts/generate.mjs <parameters.json> <new-destination>`; destinos existentes são recusados.
3. Implementar a UI, fonte de dados, estados aplicáveis e testes de comportamento, preservando props somente leitura.
4. Executar os gates abaixo e revisar o relatório.
5. Quando solicitado, instalar o artefato e verificar a UI no Argo CD alvo.

```sh
npm run runtime:setup
npm ci
npm run validate
npm run evidence:check
```

`validate` executa typecheck, lint, testes, build/inspeção, pacote e harness de produção. `evidence:check` verifica a identidade de fontes, contrato, runtime e artefatos. `dev` abre o preview; não prova autenticação/RBAC ou integração real. [Guias de evidência](../../skills/argocd-ui-extension/references/host-and-evidence.md) e [instalação](../../skills/argocd-ui-extension/references/installation-guide.md).

## Projetos existentes e migração

A versão do template é proveniência: não precisa coincidir com a versão instalada da skill. Um projeto schema v2 com contrato válido não migra a cada atualização do template. Projetos v1 exigem migração explícita.

`migrate-manifest.mjs` escreve um manifesto separado, converte `top-bar-action-menu` em `top-bar-action` e o campo local `iconClassName` em `icon`, preserva origem/campos personalizados e invalida as evidências antigas. A assinatura upstream continua usando `iconClassName`. O script não troca a UI.

Após revisar o manifesto, incorporar schema, contrato e scripts por diff. Preservar componentes, dados, estilos, testes, toolchain, pacote e workflow de release próprios; corrigir os consumidores dos campos renomeados. Runtime setup aceita React em dependencies ou devDependencies. Rodar todos os gates novamente. [Procedimento completo de migração](../../skills/argocd-ui-extension/references/migration-guide.md).

## O que já foi verificado

| Evidência registrada | Resultado e limite |
| --- | --- |
| Suíte da skill | 21 testes Node passaram após as correções do catálogo; quick_validate passou. |
| Matriz do template 2.2.0 | Cinco perfis em React 16/Argo 3.0.0 e React 19/Argo 3.5.1 passaram os gates locais. |
| Correção 2.2.1 | Top Bar e Status Panel com flyout passaram validate/evidence nos dois runtimes; demais perfis passaram typecheck. Não confundir com nova execução completa dos dez cenários. |
| Catálogo funcional | Migração preservou UI/toolchain/workflow; quatro testes da UI e harness de produção passaram. A migração foi depois publicada no repositório do catálogo. |
| Catálogo instalado | [Registro de instalação persistente](https://github.com/rodrigogeromin/argocd-catalog-ui-extension/blob/21d74e708151a2dd4b6f6faab1db1ccb65127b1f/references/host-and-evidence.md) no Argo CD 3.5.1. Interação no navegador segue não verificada. |
| Exemplo informativo | [Observação manual de Application Tab](../../examples/argocd-informativo/integration-test.md) em 3.5.1, com manifesto alvo 3.5.3. Não certifica o alvo declarado. |

[Implementação e matriz original](../implementation-skill-argocd-ui-extension/implementation.md) · [Correções derivadas do catálogo](../implementation-skill-argocd-ui-extension/catalog-feedback.md).

Avaliar separadamente: aderência do manifesto, comportamento nos testes locais, persistência da instalação e interação real. Alias legado ou metadados ausentes não demonstram defeito de runtime por si só. Instalação persistente não prova renderização ou clique correto. O relatório local mantém `integration:not-run` e `releaseComplete:false`; só artefatos testados na versão exata podem entrar na matriz integrada.

A pesquisa, PRD e ADRs registram a evolução e as decisões originais; este documento resume a capacidade implementada em 04/10/2026.
