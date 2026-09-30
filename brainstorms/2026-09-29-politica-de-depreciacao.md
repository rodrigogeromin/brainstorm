# Política de depreciação de releases

- Sessão principal: 29/09/2026 (America/Sao_Paulo).
- Registro estruturado: 30/09/2026.
- Status: em exploração; publicação de releases já implementada.
- Tags: plataforma, shards, single-tenant, ConfigMap, lifecycle, Argo CD.

> Síntese estruturada dos trechos e pontos recuperados da sessão, com antecedentes relacionados. Não é uma transcrição integral. Propostas do assistente são identificadas como propostas; detalhes não recuperados permanecem em aberto.

## 1. Contexto e problema

A plataforma com shards e single tenant já possui praticamente todos os níveis funcionais implementados. O aspecto pendente é a política de depreciação.

Os ConfigMaps de release são criados por um Job definido em um template Helm. Cada release tem conteúdo imutável e deve preservar seu histórico. A versão segue o formato `v1.0.0-<commit>`, em vez de uma sequência simples como `v1`, `v2`.

A discussão concentrou-se em:
- Determinar quais releases estão em uso e quais não estão.
- Determinar qual release é a latest.
- Materializar a classificação em metadata.
- Remarcar as releases quando uma nova publicação acontecer.
- Acionar o mecanismo por aplicação, considerando centenas de aplicações.

## 2. Regras e preferências registradas

| Item | Regra ou preferência |
| --- | --- |
| Release em uso | Nunca remover uma release referenciada por um consumer. |
| Última release | Nunca remover a última release da aplicação. |
| Publicação | Manter o Job no template Helm como mecanismo de criação. |
| Reconcile | Disponibilizar um endpoint no generator plugin, acionável após publicação e por outros meios. |
| Políticas | Permitir comportamentos selecionáveis por flavor, preservando as regras de proteção. |
| Simulação | Disponibilizar dry-run para calcular o resultado sem alterações reais. |
| Falha do endpoint | O comportamento desejado é manter as releases; o acúmulo temporário é aceitável. |
| Proteção operacional | Considerar uma feature flag para desativar o mecanismo durante correções. |

A anotação de preservação contra prune usada no contexto de publicação é:

```yaml
argocd.argoproj.io/sync-options: Prune=false
```

Um mínimo de releases históricas, por exemplo três, foi discutido como opção de retenção. Não há quantidade definitiva registrada.

## 3. Proposta: derivar o lifecycle do estado atual

A proposta recuperada foi usar um reconciler stateless: ler releases e consumers e recalcular a classificação. As marcações representam o resultado do cálculo, e não substituem as referências dos consumers.

### Release em uso

Derivar o conjunto de releases utilizadas das referências dos consumers da aplicação. Uma release pode ser utilizada por vários consumers.

O identificador completo, incluindo o commit, distingue as releases. O nome exato do campo de referência e as regras de resolução precisam acompanhar o contrato real dos ConfigMaps.

### Latest

A proposta foi selecionar a release com maior `metadata.creationTimestamp`.

Nesse critério, latest significa **última publicação registrada no Kubernetes**. O algoritmo não precisa ordenar lexicograficamente o commit nem interpretar o sufixo como contador.

### Proteção e retenção

| Classificação discutida | Significado |
| --- | --- |
| Latest / protected | Última release publicada, protegida contra remoção. |
| In-use / protected | Release referenciada por um ou mais consumers. |
| Retained | Release mantida pela política de histórico, mesmo sem uso atual. |
| Candidate / deprecated | Release fora das proteções e da retenção, candidata à etapa de depreciação ou limpeza. |

Latest e in-use podem ocorrer simultaneamente. Os termos candidate/deprecated foram recuperados da proposta; a enumeração final e a distinção entre deprecar e excluir ainda precisam ser fechadas.

## 4. Proposta de metadata

As labels de descoberta discutidas foram `type=release` e `application=<aplicação>`.

A proposta também incluiu:
- Label `lifecycle.platform.io/state`, com estados como `protected` e `retained`.
- Annotations para `in-use`, `reason`, `consumers` e `reconciled-at`.

Os nomes completos das annotations e o schema final não foram recuperados. Este registro não estabelece um contrato definitivo de metadata.

O objetivo é manter o conteúdo de release imutável e atualizar apenas a classificação operacional em metadata.

## 5. Fluxo de reconciliação proposto

1. Identificar a aplicação solicitada.
2. Listar seus ConfigMaps de release e consumers.
3. Ordenar as releases pelo critério de publicação.
4. Determinar latest e o conjunto de releases em uso.
5. Calcular as releases protegidas.
6. Aplicar a política de retenção às demais.
7. Gerar o plano de alterações.
8. Em dry-run, apresentar o plano sem executar mudanças.
9. Na execução efetiva, atualizar metadata via PATCH.
10. Executar limpeza apenas se essa etapa estiver habilitada pela política.

A marcação de deprecated e a exclusão são etapas distintas a esclarecer na implementação.

### Exemplo de remarcação

| Momento | Release A | Release B |
| --- | --- | --- |
| A publicada | Latest; protegida. | Ainda não existe. |
| B publicada; consumer segue em A | Deixa de ser latest; continua protegida por uso. | Passa a ser latest; protegida. |
| Consumer migra para B | Retida ou candidata, conforme a política. | Latest e em uso; protegida. |

Publicar B não torna A automaticamente removível. É necessário recalcular uso e retenção.

## 6. Endpoint e payload recuperados

Uma proposta anterior utilizava `POST /api/v1/releases/reconcile` com seleção por flavor.

Na sessão principal, a proposta passou a identificar a aplicação no caminho:

```http
POST /api/v1/applications/{application}/releases/reconcile
Content-Type: application/json
```

Payload recuperado da sessão:

```json
{
  "trigger": {
    "type": "release-published",
    "release": "v1.0.0-a81f21c"
  },
  "policy": "safe",
  "dryRun": false
}
```

| Campo | Papel na proposta |
| --- | --- |
| application no caminho | Delimitar a aplicação reconciliada. |
| trigger | Registrar o evento que motivou a execução. |
| trigger.release | Identificar a release cuja publicação motivou o acionamento. |
| policy | Selecionar a política; `safe` foi o exemplo discutido. |
| dryRun | Calcular sem materializar alterações quando true. |

A proposta recuperada inclui resposta assíncrona `202 Accepted`. O schema de resposta, o mecanismo de acompanhamento e a definição exata de `safe` permanecem em aberto.

Há duas formas de configurar simulação no histórico: flavor de dry-run na discussão anterior e `dryRun` separado no payload mais recente. O contrato final deve consolidar essa evolução.

## 7. Centenas de aplicações e acionamentos

O requisito explicitado foi suportar muitas aplicações e diversos acionamentos do lifecycle manager.

O endpoint por aplicação delimita o escopo do trabalho. A resposta assíncrona foi proposta, mas não foram recuperados detalhes suficientes para afirmar que fila, locks ou deduplicação já foram definidos.

Pontos a fechar:
- Como coordenar chamadas simultâneas para a mesma aplicação.
- Como permitir processamento de aplicações diferentes.
- Como tratar repetição de eventos e tentativas após falha.
- Como limitar concorrência e acompanhar execuções.
- Como lidar com publicação ou mudança de consumer durante o reconcile.

## 8. Resiliência e acionamento

A intenção registrada é manter o mecanismo acionável sob demanda, inclusive após o Job publicar uma release, sem depender exclusivamente desse gatilho.

Se o endpoint estiver indisponível, a retenção das releases é preferível à exclusão indevida. Uma nova execução poderá recalcular o estado.

A preferência por feature flag permite interromper o mecanismo enquanto um problema é corrigido. As proteções de latest e in-use devem valer independentemente do flavor.

O objetivo de conservar tudo diante de falhas ainda exige definir o comportamento para falhas parciais durante uma execução; o registro não afirma que atualizações de vários ConfigMaps sejam atômicas.

## 9. Questões em aberto

- O critério de creationTimestamp atende republicações de versões antigas? Como desempatar timestamps iguais?
- Quais namespaces e consumers compõem o escopo autoritativo de cada aplicação?
- Como tratar referência de consumer a uma release ausente?
- Consumers desabilitados continuam protegendo suas releases?
- Quais são os nomes definitivos de labels e annotations?
- Quais estados são exclusivos e quais propriedades são independentes?
- Qual a definição de cada policy/flavor e sua versão?
- Quantas releases históricas preservar?
- Depreciação apenas marca ou também permite exclusão? Existe período de espera?
- Como revalidar uso/latest antes de qualquer exclusão?
- Como garantir execução consistente diante de concorrência e leituras incompletas?
- Qual o contrato da resposta assíncrona e de consulta de execução?
- Como aplicar feature flag, retries e recuperação de falhas parciais?

## 10. Próximos passos

- [ ] Fechar o contrato de metadata e os estados.
- [ ] Validar o critério de latest e seu desempate.
- [ ] Consolidar policy/flavor e dryRun no contrato HTTP.
- [ ] Definir o escopo de leitura dos consumers.
- [ ] Definir coordenação por aplicação e acompanhamento assíncrono.
- [ ] Implementar primeiro cálculo e dry-run.
- [ ] Validar remarcação após publicação e migração de consumers.
- [ ] Validar invariantes de proteção antes de habilitar exclusão.

## Origem

Sessão “Política de depreciação”, de 29/09/2026, com antecedentes relacionados às discussões de ConfigMaps imutáveis e reconciliação sob demanda de setembro de 2026. Perguntas adicionais desta organização são apresentadas como questões em aberto, não como decisões da sessão.
