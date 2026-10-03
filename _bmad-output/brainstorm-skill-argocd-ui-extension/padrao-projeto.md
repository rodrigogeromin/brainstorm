# Padrão proposto de projeto React para Argo CD UI Extension

Data: 03/10/2026. Status: proposta para validação executável.

Direção solicitada pelo usuário: estabelecer um padrão de projeto React adaptado ao Argo CD, para criação recorrente por skill. A decisão de padronizar está registrada; nomes, ferramentas e detalhes abaixo são recomendações, ainda não escolhas aprovadas individualmente.

## Princípio

A extensão contém componentes React, código de domínio e um ponto de entrada que os registra no host. O Argo CD controla a montagem no ambiente real. O projeto deve separar a UI reutilizável da integração com esse host, permitindo desenvolvimento local sem alterar o contrato de entrega.

React oferece alternativas de ferramentas, sem estabelecer uma árvore universal. A [documentação React](https://react.dev/learn/build-a-react-app-from-scratch) contempla construção sem framework quando há restrições específicas. Aqui, o host e o formato do bundle são essas restrições.

## Origem das escolhas

| Escolha proposta | Base |
| --- | --- |
| Código em src, organizado por funcionalidades e componentes compartilhados. | [Bulletproof React: estrutura de projeto](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). |
| React/TypeScript, entrypoint de extensão e build Webpack. | [Rollout: configuração de build](https://raw.githubusercontent.com/argoproj-labs/rollout-extension/master/ui/webpack.config.js). |
| Registro de componente na API do host. | [Argo CD: UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/). |
| Empacotamento com resources e instalação via init container. | [Extension Installer](https://github.com/argoproj-labs/argocd-extension-installer). |
| Proxy e configuração de backend quando necessários. | [Metrics](https://github.com/argoproj-labs/argocd-extension-metrics). |

A separação src/argocd e dev é uma adaptação local dessas referências. Não é uma estrutura publicada pelo Argo CD. Não copiar integralmente um framework React: roteamento, autenticação e layout globais já pertencem ao host.

## Estrutura

Uma extensão é um projeto na raiz do repositório. Sem monorepo obrigatório.

```text
extension-name/
├── src/
│   ├── index.tsx                 # entrada do bundle instalado no Argo CD
│   ├── app/
│   │   └── Extension.tsx         # composição da tela e providers necessários
│   ├── argocd/
│   │   ├── register.ts           # registro no ponto de extensão escolhido
│   │   └── types.ts              # contratos do host para a versão alvo
│   ├── features/
│   │   └── feature-name/
│   │       ├── components/
│   │       ├── api/              # opcional: acesso a dados dessa funcionalidade
│   │       ├── hooks/            # opcional
│   │       └── types.ts          # opcional
│   ├── components/               # opcional: UI realmente compartilhada
│   └── styles/                   # estilos limitados à extensão
├── dev/
│   ├── index.html
│   ├── main.tsx                  # monta a mesma UI no ambiente local
│   └── fixtures/                 # contexto simulado de aplicação/recurso
├── manifests/                    # apenas o método de instalação escolhido
├── scripts/
│   └── package.mjs              # gera pacote conforme contrato do installer
├── webpack.config.js
├── tsconfig.json
├── package.json
├── package-lock.json             # proposta de npm; alternativa deve trocar gestor e lock juntos
├── README.md
└── dist/                         # gerado e ignorado pelo Git
    └── resources/
        └── extension-name.js
```

A árvore define onde colocar cada responsabilidade, sem obrigar pastas vazias. Testes de comportamento ficam junto dos arquivos envolvidos; dev/fixtures não é conteúdo de produção. Backend próprio, se necessário, tem ciclo separado; não integra o scaffold mínimo automaticamente.

O uso de npm é uma proposta de simplicidade para novos projetos. A pesquisa anterior encontrou gestores diferentes, sem consenso. Se a equipe já usa pnpm ou Yarn, essa preferência deve prevalecer antes de gerar o template.

## Limites entre responsabilidades

- index.tsx registra a extensão; não chama createRoot no DOM do Argo CD.
- app compõe as funcionalidades e recebe o contexto necessário por props.
- argocd concentra registro e tipos específicos do host. Helpers de API/proxy entram aqui somente quando necessários.
- features concentra componentes e lógica de cada funcionalidade. Não lê window.extensionsAPI diretamente.
- components contém somente elementos utilizados por mais de uma funcionalidade.
- dev monta Extension com fixtures e um runtime React local; não simula autenticação real nem prova permissões do backend.
- styles não altera body, layout ou estilos globais do Argo CD. CSS Modules ou escopo sob um contêiner próprio são alternativas; escolher uma no template validado.

Esses limites permitem reutilização sem introduzir um SDK próprio ou uma abstração genérica para todas as APIs do Argo CD.

## Dois ambientes, uma UI

| Ambiente | Entrada | React | Objetivo |
| --- | --- | --- | --- |
| Desenvolvimento local | dev/main.tsx | Dependência local compatível com a versão alvo. | Iterar componentes e estados da UI com fixtures. |
| Extensão instalada | src/index.tsx | Runtime fornecido pelo host. | Registrar e renderizar a UI dentro do Argo CD. |

A configuração Webpack deve tratar as duas entradas separadamente. O build da extensão externaliza os módulos expostos pelo host; a preview local resolve suas próprias dependências. HTML e mocks de desenvolvimento não entram no pacote instalado.

A partir de Argo CD 3.5, seguir o [guia de compatibilidade React 19](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/) para react, react-dom e react/jsx-runtime. Não impor esses mesmos globals sem verificar versões anteriores. Bibliotecas de UI também precisam ser compatíveis.

O build final deve gerar JS extension*.js e incluir os recursos que efetivamente usa. Na primeira versão do template, evitar chunks carregados dinamicamente até validar resolução de URLs dentro do host. TypeScript deve ser verificado separadamente se a transpiração do build não verificar tipos.

## Comandos que a skill deverá manter

Nomes abaixo são o contrato local proposto, não comandos já implementados.

| Comando | Resultado |
| --- | --- |
| npm run dev | Preview local da mesma UI com fixtures. |
| npm run typecheck | Verificação TypeScript sem emissão. |
| npm run lint | Verificação das convenções aplicáveis. |
| npm test | Testes de comportamento dos componentes e integrações. |
| npm run build | Bundle de extensão com externals para a versão alvo. |
| npm run package | Tar com resources, pronto para o installer. |

A publicação de releases e o deploy exigem pedido específico; esses comandos não publicam automaticamente.

## Parâmetros mínimos da futura skill

Nome, descrição, diretório destino, versão alvo do Argo CD, ponto de extensão, group/kind quando aplicável, fonte de dados e instalação adotada. A skill reutiliza o template validado e preenche essas diferenças.

Ela deve entregar uma primeira funcionalidade pequena, build e pacote verificáveis, fixtures de desenvolvimento e instruções de instalação. Versões exatas da toolchain e dependências só entram após validação do template; não usar latest como garantia de compatibilidade.

## Validação antes de consolidar o template

1. Criar uma extensão mínima que use props reais do ponto escolhido.
2. Confirmar preview local e estados de carregamento, vazio e erro aplicáveis.
3. Executar typecheck, build e empacotamento; verificar que o pacote exclui dev e que os módulos do host não foram embutidos.
4. Instalar em Argo CD da versão alvo e demonstrar renderização, estilos isolados e navegação preservada.
5. Quando houver backend, verificar proxy e comportamento de acesso negado no ambiente real.
6. Criar um segundo projeto e demonstrar reutilização sem refazer build e instalação.

O padrão é concreto e documentado, mas ainda não é um template executável, uma skill criada ou uma garantia de compatibilidade. A versão do Argo CD e o primeiro caso real continuam pendentes para essa próxima etapa.
