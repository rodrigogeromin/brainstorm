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

## 11. Aprofundamento: algoritmo de classificação e remarcação

> Proposta detalhada acrescentada em 30/09/2026. Desenvolve o algoritmo recuperado; nomes novos de metadata, regras de empate e mecanismos de coordenação abaixo são sugestões para validação, não decisões anteriores.

### 11.1 O ConfigMap não descobre seu próprio estado

O lifecycle manager calcula o estado comparando todos os releases e consumers da mesma aplicação. Um ConfigMap isolado não informa se é latest ou se está em uso.

As fontes de verdade propostas são:
- Identidade da release: `data.version`, com identificador completo.
- Ordem de publicação: `metadata.creationTimestamp`.
- Referências de uso: campo `release` dos consumers, resolvido pelo mesmo contrato do generator.
- Retenção: política selecionada no servidor.

As labels de lifecycle são saída do cálculo. Não se deve acreditar em uma label antiga `latest=true` para decidir quem é latest hoje.

### 11.2 Contrato ilustrativo de entrada

Exemplo simplificado com campos diretos em data. Se os valores reais estiverem em YAML/JSON dentro de uma chave do ConfigMap, o parser precisa extrair os mesmos campos desse conteúdo.

Release:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: simulacao-release-a81f21c
  namespace: platform
  labels:
    type: release
    application: simulacao
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
immutable: true
data:
  version: v1.0.0-a81f21c
  image.repository: registry.example.com/simulacao
  image.tag: v1.0.0-a81f21c
```

Consumer:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: simulacao-cliente-1
  namespace: platform
  labels:
    type: consumer
    application: simulacao
data:
  tenant: cliente-1
  release: v1.0.0-a81f21c
```

O campo release contém a versão completa. O lookup não compara apenas `v1.0.0`, não tenta ordenar hashes e não exige que a versão seja igual ao nome do ConfigMap.

Para esta proposta, proteger também consumers desabilitados: enquanto a referência existir, preservar a capacidade de reativá-los.

### 11.3 Descoberta e validação

Para a aplicação simulacao, consultar:
- Releases com selector `type=release,application=simulacao`.
- Consumers com selector `type=consumer,application=simulacao`.

Ler todos os namespaces autoritativos definidos pela plataforma e todas as páginas de cada LIST. Uma página vazia ou incompleta não equivale à ausência de referências.

Construir os índices:

```text
releaseByVersion[version] = ConfigMap da release
consumersByVersion[version] = conjunto de namespace/nome dos consumers
```

Antes de aplicar alterações, validar:
1. Cada release possui versão e timestamp válidos.
2. Existe no máximo um ConfigMap por versão dentro da aplicação, no modelo de catálogo único.
3. Cada consumer possui uma referência resolvível.
4. Todas as referências apontam para releases existentes.
5. Todos os escopos e páginas foram lidos com sucesso.
6. Não há objetos em exclusão interferindo no cálculo.

Se houver catálogo replicado em vários clusters, o índice deve considerar a identidade lógica da release e todas as cópias. O algoritmo de catálogo único não deve ser aplicado silenciosamente a cópias duplicadas.

Referência ausente, parsing inválido ou leitura incompleta: retornar erro de validação e não marcar candidatas nem executar exclusão naquela rodada. Não interpretar erro como zero consumers.

### 11.4 Como calcular latest

Ordenar pelo timestamp de criação do objeto no catálogo autoritativo, em ordem decrescente:

```text
latestTimestamp = máximo(releases.creationTimestamp)
latestSet = releases com creationTimestamp == latestTimestamp
```

Normalmente latestSet contém uma release. Para empate, esta proposta protege todas as empatadas e informa ambiguidade. Isso evita inventar uma ordem cronológica com nome, hash ou UID.

Se for necessário exatamente um latest, o publisher deve fornecer uma ordem monotônica autoritativa, cuja atribuição também precisa de coordenação. Uma ordenação de nomes pode ser determinística, mas não demonstra qual publicação aconteceu por último.

A release enviada no trigger não é automaticamente latest: um evento antigo pode chegar depois de uma publicação mais recente.

Importante: recriar uma versão antiga gera um novo creationTimestamp. Nesse critério, ela passa a ser latest. Se isso não representar a semântica desejada, definir publicação lógica com sequência autoritativa antes de implementar.

### 11.5 Como calcular in-use

Percorrer todos os consumers e usar sua referência completa:

```text
para cada consumer:
    version = resolveReleaseReference(consumer)
    consumersByVersion[version].adicionar(namespace/nome)
```

Para cada release R:

```text
isLatest(R) = R pertence a latestSet
isInUse(R) = consumersByVersion[R.version] não está vazio
isProtected(R) = isLatest(R) OU isInUse(R)
```

Isso representa **referenciada na configuração desejada**. Não demonstra que o rollout já terminou ou que não existem pods executando uma release anterior.

Para remoção física, a plataforma precisa definir se também protege releases ainda implantadas, em rollback ou com rollout pendente. Uma mudança no consumer não encerra imediatamente o uso operacional anterior.

### 11.6 Política de retenção concreta para a simulação

Para tornar o exemplo executável conceitualmente, usar uma política ilustrativa:
- Proteger latest e todas as releases referenciadas.
- Preservar adicionalmente as duas releases mais recentes entre as não protegidas.
- Marcar as demais como candidate.
- Não excluir automaticamente nesta proposta inicial.

O valor dois é um exemplo, não uma decisão. Esta semântica preserva **duas releases adicionais não protegidas**, diferente de preservar apenas as duas mais recentes do catálogo inteiro.

Em empate na fronteira de retenção, preservar todas as releases com o mesmo timestamp da última retida. Isso pode exceder a quantidade nominal.

Tabela de decisão, na ordem abaixo:

| Condição | state | latest | in-use | reason |
| --- | --- | --- | --- | --- |
| Latest e em uso | protected | true | true | latest,in-use |
| Latest sem referência | protected | true | false | latest |
| Antiga em uso | protected | false | true | in-use |
| Sem uso dentro da retenção | retained | false | false | history |
| Sem uso fora da retenção | candidate | false | false | outside-retention |

Latest e in-use são propriedades independentes; state resume a decisão da política.

### 11.7 Pseudocódigo do cálculo

```python
def calculate_plan(releases, consumers, keep_unused=2):
    # Funções auxiliares validam esquema, duplicidade, leitura completa
    # e existência de toda referência antes de produzir um plano.
    by_version = validated_release_index(releases)
    references = validated_consumer_references(consumers, by_version)

    if not releases:
        return []

    latest_timestamp = max(r.creation_timestamp for r in releases)
    latest_versions = {
        r.version for r in releases
        if r.creation_timestamp == latest_timestamp
    }
    protected = latest_versions | set(references)

    unused = sorted(
        (r for r in releases if r.version not in protected),
        key=lambda r: r.creation_timestamp,
        reverse=True,
    )

    retained = set()
    if keep_unused > 0 and unused:
        cutoff = unused[min(keep_unused, len(unused)) - 1].creation_timestamp
        retained = {
            r.version for r in unused
            if r.creation_timestamp >= cutoff
        }

    plan = []
    for r in releases:
        latest = r.version in latest_versions
        consumer_ids = sorted(references.get(r.version, set()))
        in_use = bool(consumer_ids)

        if latest or in_use:
            state = "protected"
            reasons = []
            if latest:
                reasons.append("latest")
            if in_use:
                reasons.append("in-use")
        elif r.version in retained:
            state, reasons = "retained", ["history"]
        else:
            state, reasons = "candidate", ["outside-retention"]

        plan.append({
            "namespace": r.namespace,
            "name": r.name,
            "uid": r.uid,
            "resourceVersion": r.resource_version,
            "version": r.version,
            "latest": latest,
            "inUse": in_use,
            "state": state,
            "reasons": reasons,
            "consumerCount": len(consumer_ids),
            "consumers": consumer_ids,
        })
    return plan
```

O cálculo não usa as marcações antigas como entrada. Rodadas repetidas com o mesmo catálogo, consumers e política produzem a mesma classificação.

### 11.8 O que é escrito em cada ConfigMap

Contrato sugerido para materializar o plano:

```yaml
metadata:
  labels:
    lifecycle.platform.io/state: protected
    lifecycle.platform.io/latest: "false"
    lifecycle.platform.io/in-use: "true"
  annotations:
    lifecycle.platform.io/reason: '["in-use"]'
    lifecycle.platform.io/consumer-count: "1"
    lifecycle.platform.io/reconciled-at: "2026-09-30T21:30:00Z"
```

Atualizar somente as chaves de lifecycle gerenciadas pelo reconciler:
- Manter data, binaryData, immutable, labels de descoberta e anotações do Argo.
- Sobrescrever latest e in-use com true **ou false** em toda mudança de classificação.
- Atualizar state e reason; não apenas adicionar novas razões.
- Evitar PATCH se o estado semântico não mudou. Assim reconciled-at indica a última aplicação de uma mudança; o resultado da execução pode registrar verificações sem alteração.
- A lista completa de consumers pode ser retornada pelo endpoint. Para muitos consumers, não copiar a lista ilimitadamente para annotations; persistir contagem e razões.

Mesmo com immutable=true, metadata pode ser modificada. Referência: https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/

### 11.9 Exemplo completo de remarcação

Considere publicações em ordem A, B, C, D, E:
- A = v1.0.0-a111111
- B = v1.0.0-b222222
- C = v1.1.0-c333333
- D = v1.1.0-d444444
- E = v1.2.0-e555555

Consumers cliente-1 e cliente-2 referenciam B. Cliente-3 referencia D.

Com retenção de duas releases adicionais não protegidas:

| Release | Referências | Latest | State inicial | Motivo |
| --- | --- | --- | --- | --- |
| A | Nenhuma | false | retained | history |
| B | cliente-1, cliente-2 | false | protected | in-use |
| C | Nenhuma | false | retained | history |
| D | cliente-3 | false | protected | in-use |
| E | Nenhuma | true | protected | latest |

Ao publicar F = v1.2.0-f666666, sem mudar consumers:

| Release | Latest após F | State após F | Alteração |
| --- | --- | --- | --- |
| A | false | candidate | Sai da retenção. |
| B | false | protected | Continua em uso. |
| C | false | retained | Continua no histórico. |
| D | false | protected | Continua em uso. |
| E | false | retained | Perde latest, passa ao histórico. |
| F | true | protected | Torna-se latest. |

A deixa de ser retida porque E e C passam a ser as duas releases não protegidas mais recentes.

Depois, se cliente-1 sair de B mas cliente-2 permanecer, B continua in-use. Só quando **todas** as referências saírem de B, ela perde a proteção por consumer.

Se cliente-3 migrar de D para F, os não protegidos mais recentes passam a ser E e D: D vira retained e C vira candidate. A classificação de uma release pode mudar devido à alteração de um consumer de outra release.

### 11.10 Aplicação do plano e falhas parciais

Calcular e validar todo o plano antes de escrever. dry-run retorna esse plano sem PATCH.

Na execução efetiva:
1. Serializar reconciles por aplicação; permitir aplicações diferentes em paralelo com limite.
2. Aplicar metadata com controle otimista baseado no resourceVersion lido.
3. Em conflito, reler entradas e recalcular; não sobrescrever cegamente.
4. Se um PATCH falhar, registrar os objetos aplicados e pendentes.
5. Reexecutar para convergir. Nenhuma exclusão acompanha a rodada parcialmente aplicada.

PATCH de múltiplos ConfigMaps não é uma transação. Por um curto período, zero ou duas releases podem aparecer marcadas como latest durante a troca. O algoritmo e o generator devem derivar latest da fonte autoritativa, não exigir unicidade instantânea das labels.

O lock do reconciler não bloqueia automaticamente o Job publisher nem alterações dos consumers. resourceVersion de uma release protege aquela release, não a configuração de outro objeto.

Referência para controle de versões: https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions

### 11.11 Por que candidate não autoriza DELETE sozinho

Uma release pode ganhar um consumer após o cálculo. Reler antes do DELETE reduz a janela, mas não elimina a corrida entre leitura de consumers e exclusão da release.

Pré-condições de UID/resourceVersion no DELETE impedem excluir uma cópia substituída ou alterada do objeto. Elas não impedem que um consumer diferente passe a referenciá-lo.

Portanto, a versão inicial proposta somente classifica. Para garantir exclusão segura, definir um protocolo compartilhado:
- Todas as mutações de referência de consumers e ações do coletor precisam participar da mesma coordenação por aplicação.
- Sob essa coordenação, validar estado atual, uso desejado e uso operacional definido pela plataforma antes de excluir.
- Se edições diretas puderem contornar a coordenação, a garantia forte não está atendida; manter exclusão desabilitada.
- Preservar proteção de latest, incluindo empates, e usar pré-condições do objeto.
- Definir se um período de carência é necessário; ele não substitui coordenação.

Um futuro estado deprecated pode servir para impedir novas referências antes de coletar, desde que o mecanismo de validação das referências participe do protocolo. Uma label isolada não cria esse bloqueio.

### 11.12 Acionamentos necessários para manter o estado atualizado

Acionar reconcile:
- Após publicação de uma release.
- Após criação, alteração ou remoção de um consumer.
- Por acionamento manual.
- Periodicamente, se desejado, para reparar eventos perdidos.

Se o único gatilho for publicação, as marcações de in-use podem ficar antigas entre publicações. Isso é aceitável apenas como visualização eventual; nunca deve fundamentar exclusão sem recalcular.

### 11.13 Cenários de validação do algoritmo

| Cenário | Resultado esperado |
| --- | --- |
| Nova publicação com evento antigo entregue depois | Latest continua sendo a publicação mais recente do catálogo. |
| Dois consumers usam a mesma release | Proteção permanece até ambos deixarem de referenciá-la. |
| Consumer desabilitado mantém referência | Release permanece protegida nesta proposta. |
| Consumer referencia release ausente | Falha de validação; nenhuma candidata ou exclusão nova. |
| LIST falha ou falta página/namespace | Rodada abortada, sem tratar falha como ausência de uso. |
| Duas releases empatam no timestamp máximo | Ambas protegidas como latest; ambiguidade reportada. |
| Rodada repetida sem mudança | Mesmo plano sem PATCH semântico desnecessário. |
| PATCH falha no meio | Resultado parcial reportado; nova rodada converge; sem DELETE. |
| Consumer muda após leitura | Recalcular; labels podem ficar temporariamente antigas. |
| Consumer migra, rollout ainda usa imagem anterior | Uso operacional deve ser protegido antes de permitir GC. |
