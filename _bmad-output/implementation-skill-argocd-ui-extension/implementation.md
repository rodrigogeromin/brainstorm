# Implementação local — Argo CD UI Extension

Skill distribuível: `skills/argocd-ui-extension/`. Template 1.0.0, contrato/schema 1, alvo exato Argo CD 3.5.3. Integração real **not-run**; matriz integrada vazia; release inicial não concluída (SM-2).

Entregues contrato executável consumindo schema único, tipos de entrada, template React/TypeScript e Webpack nas duas entradas, lock npm, gerador determinístico e portátil, adapter readonly de Application resource-tab, fixtures válido/ausente, CSS exclusivo com rolagem, inspeção de módulos, tar allowlist, relatório/hash e invalidação da evidência. O scaffold neutro é síncrono e não precisa de estados de loading/erro remoto.

## Reutilização e verificações

Dois pedidos independentes foram gerados em diretórios novos, com os parâmetros preservados nas pastas desta evidência. Projetos finais: `/tmp/argocd-ui-extension-reviewed-p9hmck79/context-inspector` e `/tmp/argocd-ui-extension-reviewed-p9hmck79/application-summary`. Nenhum arquivo de build/empacotamento desses projetos finais foi editado após geração. Cada pasta de evidência preserva parâmetros, origem, relatório e pacote instalável. Reproduzir com o gerador da Skill e os respectivos `parameters.json`; destino deve ser novo.

Ambos passaram npm ci (790 dependências), typecheck, lint, 3 testes Jest de UI/registro/imutabilidade, build, pacote e 1 harness Jest do bundle minificado com globals compartilhados e props congelados. `npm run evidence:check` passou em ambos. Node v26.7.0/npm11.19.0/Linux; todas as dependências diretas fixas e transitivas via lock. Os reports contêm source/template revision e SHA-256 reais dos bundles/tars, comandos/status/código de saída. O tar contém somente `resources/extension-<name>.js`; Webpack stats confirmam JSX externo e ausência de runtime React/DOM/client/dev embutido.

`node --test skills/argocd-ui-extension/tests/*.test.mjs`: **7 testes passaram**. Cobrem validação sem escrita, colisões arquivo/symlink, determinismo/Skill copiada isoladamente, lock/integridade, invalidação por source/bundle/package/template e checks ausentes/falhos; ampliação indevida da matriz é recusada. `quick_validate.py`: **Skill is valid**. O lint impede imports runtime do adapter e acesso direto extensionsAPI dentro da UI.

## Preview em browser

Chrome headless real, sem erros Runtime: painel **320×240** no viewport390×844, scrollHeight503 e acesso ao fim; painel **1100×600**, viewport1280×800, tema escuro; painel320×240 com contexto ausente. Sem overflow horizontal. `browser-results.json` e screenshots preservam resultados. O preview foi servido em127.0.0.1:18080 (8080 já ocupado). `browser-source-identity.json` confirma UI/CSS/fixtures idênticos ao projeto final; o segundo muda nome/título/descrição conforme pedido. Esses resultados são locais e não demonstram estilos do host real.

## Ocorrências e limites

O sandbox bloqueou DNS npm (ENOTFOUND), fork Node/tar e listen local (EPERM); comandos necessários foram repetidos com escalada autorizada. O primeiro scaffold scratch revelou importação de tipos jest-dom e globals CJS do mock faltantes; corrigidos no template antes da geração final, e todos os checks foram repetidos. O npm reporta depreciações de dependências fixadas/upstream (eslint, glob, uuid e bibliotecas jsdom); não houve substituição silenciosa dos pins. npm ci usou cache em/tmp e --ignore-scripts para download/reprodutibilidade nesta rodada.

Não foram alterados cluster3.5.1, secrets/kubeconfig, nem houve push, publicação, deploy ou instalação global nesta implementação. Método de instalação/imagem do installer continua condicionado ao ambiente; o README documenta resources sob/tmp/extensions e requisito de validação real3.5.3. Harness simula registro/renderização e globals; não certifica autenticação ou host Argo CD. Tempo medido de geração/validação é evidência operacional, sem comparação manual equivalente (SM-3 permanece sem baseline comparável).

Revisão independente concluída: contrato reaplicado ao manifesto editado, identidade preservada em relatórios de falha e servidor de preview atualizado para5.2.6. Dois projetos foram gerados novamente e todos os checks repetidos após as correções. Avaliação de dependências em [dependency-review/assessment.md](dependency-review/assessment.md); alertas transitivos de desenvolvimento permanecem documentados. Pendência material: instalação e checks FR-7/FR-8 reais em host3.5.3, com hashes instalados, ambiente, erros de browser, runtime compartilhado, dimensões estreita/ampla, rolagem e tema escuro disponíveis. Nenhuma versão futura é certificada.
