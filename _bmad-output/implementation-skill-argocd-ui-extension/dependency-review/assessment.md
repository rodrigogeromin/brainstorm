# Avaliação das dependências

A auditoria original reportou 36 pacotes (34 high, 2 moderate), propagados a partir de cinco advisories, todos de desenvolvimento. Auditoria com omit=dev: zero. A única alteração de dependência após revisão foi webpack-dev-server5.2.4 →5.2.6, mantendo React/DOM19.2.6 e todos os outros pins diretos.

A versão5.2.6 remove os três advisories próprios de WDS: [CSRF](https://github.com/advisories/GHSA-f5vj-f2hx-8m93), [interceptação HMR com proxy](https://github.com/advisories/GHSA-mx8g-39q3-5c79) e [Host/Origin malformado](https://github.com/advisories/GHSA-m28w-2pqf-7qgj). CSRF é relevante mesmo com bind localhost; corrigido antes da entrega.

A auditoria posterior ainda conta36 pacotes por duas causas transitivas:

- [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): stack-exhaustion ao interpretar padrões de braces profundamente aninhados. Parâmetros da geração não alimentam padrões glob; configuração de testes/build usa padrões estáticos e nomes restritos. Nenhum caminho de entrada de atacante foi demonstrado nesta base. O advisory não informa versão corrigida. Atualizar Jest major reduziria parte da árvore, mas não eliminaria a cadeia WDS/chokidar e introduziria mudança sem necessidade para corrigir um caminho atualmente alcançável.
- [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq): buffer inválido em v3/v5/v6. SockJS nesta árvore usa v4 sem buffer; condição não observada nesse consumidor. A correção exigiria mudar a faixa major que SockJS declara, portanto não foi aplicada por override indiscriminado.

Essas bibliotecas de ferramentas não entram no pacote instalado. O bundle inspecionado contém somente UI, runtimes de CSS e referências aos globals do host. Os alertas restantes ficam visíveis; esta avaliação vale para a base atual. Reavaliar se a Skill passar a aceitar padrões não confiáveis, código externo ou proxy de desenvolvimento. Não houve audit fix --force nem atualização silenciosa dos demais pins.
