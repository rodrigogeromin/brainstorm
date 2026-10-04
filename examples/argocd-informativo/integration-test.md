# Teste de instalação no Argo CD local

Data: 2026-10-03 (America/Sao_Paulo)

O projeto e seu contrato continuam direcionados ao Argo CD **3.5.3**. O cluster disponível durante o teste executava **3.5.1** (`argocd/argocd-server-856bb58656-wqtqk`). A instalação abaixo foi um teste manual de carregamento no 3.5.1, autorizado por Rodrigo; ela não adiciona 3.5.1 à matriz certificada pela skill.

Foi copiado `dist/resources/extension-argocd-informativo.js` para `/tmp/extensions/extension-argocd-informativo.js` no container `argocd-server`. O pod permaneceu Ready e não houve rollout. A cópia é efêmera: desaparece se o pod for recriado.

O endpoint `/extensions.js` do serviço ativo respondeu com 6.137 bytes e continha integralmente os 5.944 bytes do bundle compilado. O arquivo servido continha o texto informativo e a chamada `registerResourceExtension`. O pacote de distribuição contém apenas `resources/extension-argocd-informativo.js`.

A validação automatizada e o harness de globals passaram. Rodrigo confirmou visualmente que a aba aparece vinculada ao recurso `Application` na UI. O relatório local mantém `integration.status: not-run` e `releaseComplete: false` porque o alvo registrado é exatamente 3.5.3 e a observação manual foi feita em 3.5.1; esse teste não certifica 3.5.3 nem amplia a matriz de compatibilidade da skill.

Referência do contrato para Argo CD 3.5: [UI Extensions](https://argo-cd.readthedocs.io/en/release-3.5/developer-guide/extensions/ui-extensions/). A documentação especifica bundles em `/tmp/extensions`, resource tabs via `extensionsAPI.registerResourceExtension` e o grupo/tipo `argoproj.io`/`Application` para uma aba no nível de Application.
