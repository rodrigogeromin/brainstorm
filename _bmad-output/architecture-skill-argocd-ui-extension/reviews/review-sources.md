# Revisão das fontes técnicas

Data: 2026-10-03. Escopo: índice de arquitetura e ADR-0001 a ADR-0009. Revisão documental; nenhum pacote, build ou instalação executado.

**Veredito:** adequado para planejamento. Nenhum achado alto ou médio. As escolhas próprias estão marcadas como suposições, e nenhuma versão exata de dependência ou compatibilidade futura foi fabricada.

| Decisões | Resultado da verificação |
| --- | --- |
| AD-1 | Camadas e tipos locais são proposta arquitetural coerente com UI reutilizada no preview; não apresentados como padrão oficial obrigatório. |
| AD-2 | Os três externals e os globals correspondem à documentação do runtime JSX. Separar montagem local de registro instalado é desenho do template; a fonte confirma React compartilhado e registro pelo host. |
| AD-3 | Geração determinística e esquema próprio são suposição explícita, derivada da repetibilidade exigida pelo PRD. Sem alegação de scaffold upstream existente. |
| AD-4 | A documentação confirma resource-tab, props application/resource/tree e aba de Application por group argoproj.io/kind Application. |
| AD-5 | Confirmados prefixo extension, entrega ao argocd-server em /tmp/extensions e resources no topo do tar do installer. Bundle único, CSS incorporado e ausência inicial de chunks são restrições propostas, não exigências gerais atribuídas ao Argo CD. |
| AD-6 | Escopo CSS é decisão própria. Rollout também evita estilos globais de argo-ui, sustentando o risco sem impor sua solução. |
| AD-7 | Não promete compatibilidade por faixa. Alvo exato, toolchain e validação integrada estão condicionados a evidência futura. |
| AD-8 | Rollout confirma Webpack/TypeScript, externals e CSS no JS. npm, duas entradas e comando typecheck independente são escolhas propostas; nenhum starter default é adotado como solução pronta. |
| AD-9 | Derivado do escopo pessoal e local do PRD. Backend e publicação permanecem decisões futuras. |

Fontes primárias abertas nesta revisão:

- [Argo CD UI Extensions](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/): registro, propriedades, aba de Application e carregamento dos arquivos.
- [React 19 Upgrade](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/ui-extensions-react-19-upgrading/): externals e globals desde 3.5; dependências ainda precisam ser compatíveis com React 19.
- [Rollout Webpack](https://raw.githubusercontent.com/argoproj-labs/rollout-extension/master/ui/webpack.config.js): configuração real de externals, transpileOnly e estilos incorporados.
- [Extension Installer](https://github.com/argoproj-labs/argocd-extension-installer): tar com resources e configuração do diretório de instalação. EXTENSIONS_DIR deve corresponder ao mount compartilhado; o documento adia os manifestos corretamente.

Limites preservados: links stable/master/main não são revisões fixadas; verificar tag/commit e licença antes de copiar código. A validação documental não certifica nenhuma versão do template ou da extensão.
