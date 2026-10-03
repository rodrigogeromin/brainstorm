# Política de depreciação de releases

- Sessão principal: 29/09/2026 (America/Sao_Paulo).
- Registro inicial: 30/09/2026; reorganização analítica: 03/10/2026.
- Status: em exploração; publicação de releases já implementada.
- Tags: plataforma, shards, single-tenant, ConfigMap, lifecycle, Argo CD.

> Este documento é uma síntese de uma conversa com GPT, não uma transcrição nem uma política aprovada. **Registrado** identifica regras e preferências recuperadas; **proposta anterior** identifica sugestões daquela conversa; **recomendação desta revisão** identifica análise acrescentada em 03/10/2026. O detalhamento técnico de 30/09 foi preservado no apêndice como proposta para validação.

## 1. Síntese e direção recomendada

A publicação já cria releases imutáveis. Falta definir como preservar as necessárias e tratar as que deixaram de ser úteis, considerando centenas de aplicações, múltiplos consumers e mudanças independentes de publicação e implantação.

**Recomendação desta revisão:** validar primeiro a classificação por aplicação e seu dry-run; depois materializar metadata; só habilitar depreciação formal e exclusão quando seus contratos estiverem definidos. A prioridade é demonstrar quais releases podem perder proteção sem comprometer operação e rollback.

O ponto central da política é distinguir três ações:

| Ação | Resultado | Situação atual |
| --- | --- | --- |
| Classificar | Explicar proteção, retenção e candidatura de cada release. | Proposta detalhada no apêndice. |
| Deprecar | Declarar uma restrição de uso ou suporte, com regras conhecidas pelos consumers. | Significado e efeitos ainda não definidos. |
| Excluir | Remover fisicamente o ConfigMap e, se aplicável, outros artefatos. | Depende de garantias adicionais; não autorizada pela classificação isolada. |

Uma release antiga pode continuar necessária. Uma release candidata pode voltar a ser referenciada. Uma release marcada como deprecated só impede novas referências se houver um mecanismo que aplique essa restrição.

## 2. Contexto, problema e valor esperado

### O que já existe — registrado

- Plataforma com shards e single tenant, com a publicação praticamente implementada.
- ConfigMaps de release criados por Job em template Helm.
- Conteúdo imutável, com identidade completa no formato `v1.0.0-<commit>`.
- Consumers que referenciam releases e generator plugin como local desejado para o endpoint de reconcile.

### Problema a resolver

Falta um critério explícito para distinguir releases necessárias, histórico útil e excedentes. O mecanismo também precisa explicar e atualizar essa classificação quando há uma publicação ou mudança de consumer.

O volume real, custo do acúmulo e impacto operacional ainda não foram medidos. Portanto, a necessidade de excluir automaticamente é uma hipótese a validar, embora a necessidade de classificar esteja registrada.

### Beneficiários e necessidades — análise desta revisão

| Papel a validar | Necessidade | Evidência esperada |
| --- | --- | --- |
| Operação da plataforma | Entender por que uma release está preservada e recuperar falhas. | Plano com razões e resultado por objeto. |
| Equipes das aplicações | Publicar e migrar consumers sem perder versões necessárias. | Proteções mantidas nos cenários de publicação e migração. |
| Responsáveis pelos tenants | Preservar reativação e rollback conforme o contrato. | Definição de uso operacional e horizonte de recuperação. |

Esses papéis são inferidos do contexto; suas necessidades precisam ser confirmadas com os responsáveis.

## 3. Regras e preferências recuperadas

| ID | Regra ou preferência registrada | Consequência para a proposta |
| --- | --- | --- |
| R1 | Nunca remover release referenciada por consumer. | Retenção não pode retirar proteção por referência. |
| R2 | Nunca remover a última release da aplicação. | Definir o significado de última antes de habilitar exclusão. |
| R3 | Manter criação pelo Job no template Helm. | O lifecycle acompanha a publicação existente. |
| R4 | Disponibilizar endpoint no generator plugin, acionável após publicação e por outros meios. | Reconcile deve ser executável sob demanda. |
| R5 | Permitir políticas selecionáveis por flavor, preservando proteções. | Variação de retenção não flexibiliza R1 e R2. |
| R6 | Disponibilizar dry-run sem alterações reais. | O mesmo cálculo deve produzir um plano inspecionável. |
| R7 | Se o endpoint falhar, preferir manter releases. | Acúmulo temporário é aceitável. |
| R8 | Considerar feature flag para interromper o mecanismo. | Preferência operacional, ainda sem contrato fechado. |

No contexto de publicação foi registrada a annotation:

```yaml
argocd.argoproj.io/sync-options: Prune=false
```

Sua presença não resolve o protocolo de exclusão do lifecycle. Confirmar quais componentes podem remover releases e quem controla essa operação.

Não há quantidade definitiva de histórico aprovada. A opção de conservar três releases foi discutida; o exemplo técnico usa duas **adicionais não protegidas**. São exemplos com semânticas que precisam ser distinguidas.

## 4. Vocabulário e fontes de verdade propostas

| Conceito | Definição de trabalho | Limite |
| --- | --- | --- |
| Identidade | Versão completa, incluindo commit. | Confirmar campo real e escopo de unicidade. |
| Latest | Última publicação no catálogo autoritativo. | `creationTimestamp` é uma implementação proposta, não decisão. |
| Referenciada / in-use | Pelo menos um consumer mantém referência à release. | Não prova que a release anterior deixou de executar. |
| Uso operacional | Release necessária a implantação, rollout, rollback ou reativação. | Fonte e critérios ainda precisam ser definidos. |
| Protected | Preservada por uma regra de proteção. | Latest e in-use são propriedades independentes. |
| Retained | Sem proteção obrigatória, mantida pela política de histórico. | Quantidade e/ou idade pendentes. |
| Candidate | Fora das proteções e da retenção no cálculo observado. | Não autoriza DELETE. |
| Deprecated | Release com restrição explícita de uso ou suporte. | Estado futuro, separado de candidate. |

**Proposta anterior:** reconciler stateless que lê releases e consumers e recalcula a classificação. Labels e annotations são saída desse cálculo; não substituem referências nem a ordem autoritativa de publicação.

O cálculo pode ser stateless, enquanto execução assíncrona, acompanhamento e futura carência exigem estado operacional. Esses requisitos não devem ficar ocultos sob o termo stateless.

## 5. Escopo e sequência de evolução recomendados

| Etapa proposta | Entrega | Condição para avançar |
| --- | --- | --- |
| 1. Descoberta e dry-run | Plano por aplicação, com razões, ambiguidades e falhas de leitura. | Escopo autoritativo e contratos reais de entrada confirmados. |
| 2. Classificação persistida | Atualização apenas da metadata gerenciada, com recuperação de falhas parciais. | Mesmas entradas geram a mesma classificação; remarcação validada. |
| 3. Depreciação formal | Regras de novas referências, suporte e eventual carência. | Semântica aprovada e mecanismo capaz de aplicá-la. |
| 4. Exclusão | Coleta coordenada, com revalidação e proteção do uso operacional. | Todos os caminhos de alteração de referências participam do protocolo. |

A proposta inicial não inclui mudança na publicação nem exclusão de imagens do registry. É necessário decidir se o escopo futuro alcança apenas ConfigMaps ou também imagens e outros artefatos.

## 6. Alternativas que precisam de decisão

### 6.1 O que significa latest?

| Alternativa | Vantagem | Limitação |
| --- | --- | --- |
| Maior `creationTimestamp` | Usa informação existente no catálogo. | Recriação de versão antiga a torna latest; empates precisam de tratamento. |
| Ordem lógica atribuída pelo publisher | Expressa ordem de publicação independentemente da recriação do objeto. | Exige contrato e atribuição coordenada. |
| Release explicitamente promovida | Separa publicação de escolha para consumo. | Introduz uma operação de promoção ainda não registrada como requisito. |

**Recomendação desta revisão:** escolher pela semântica de republicação desejada. Manter proteção de todos os empates na simulação enquanto não houver uma ordem autoritativa única. Não ordenar hashes para inferir cronologia.

### 6.2 Quanto histórico preservar?

| Alternativa | Benefício | Questão a validar |
| --- | --- | --- |
| N mais recentes do catálogo, além das proteções obrigatórias | Conjunto recente previsível. | Pode não manter versões extras sem uso quando as N já são protegidas. |
| N adicionais não protegidas | Reserva explícita de versões fora do uso atual. | Quantidade total varia com os consumers. |
| Janela de idade | Preserva um horizonte temporal de recuperação. | Volume depende da frequência de publicação. |
| Quantidade e idade combinadas | Combina reserva e horizonte temporal. | Definir se as regras se somam ou se restringem. |

**Recomendação desta revisão:** escolher a semântica antes do número. O exemplo do apêndice adota N adicionais não protegidas apenas para demonstrar o cálculo.

### 6.3 Marcação ou limpeza automática?

**Proposta anterior e recomendação mantida:** começar somente com classificação. Exclusão exige coordenação entre publisher, alterações dos consumers e coletor; serializar apenas reconciles não cobre esses outros escritores.

## 7. Fluxo e contrato operacional propostos

1. Identificar aplicação e escopo autoritativo.
2. Ler e validar releases e consumers, incluindo todas as páginas e namespaces necessários.
3. Calcular latest, referências, proteções e retenção usando a política selecionada no servidor.
4. Produzir plano com razões por release e indicação de entradas ambíguas ou inválidas.
5. Em dry-run, retornar o resultado sem mutações.
6. Em execução efetiva, aplicar somente metadata gerenciada e informar sucessos e pendências.
7. Reexecutar após conflitos ou falhas para convergir.

**Proposta anterior:**

```http
POST /api/v1/applications/{application}/releases/reconcile
Content-Type: application/json
```

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

O trigger explica o acionamento; não define latest. `safe` é um nome ilustrativo sem política aprovada. O histórico também continha `POST /api/v1/releases/reconcile` e dry-run como flavor; a proposta mais recente usa aplicação no caminho e flag separada.

A resposta `202 Accepted` foi proposta, mas faltam identificador de execução, consulta, resultados parciais e destino de falhas. **Recomendação desta revisão:** só fechar o contrato assíncrono junto desse acompanhamento e do comportamento de dry-run.

Para centenas de aplicações, definir limite de concorrência, coordenação entre instâncias, repetição de eventos, retries e isolamento de falhas. Não há fila ou lock já decidido.

Acionamentos propostos: publicação, criação/alteração/remoção de consumer, manual e reconciliação periódica opcional. Eventos de implantação também serão necessários se uso operacional participar da proteção.

## 8. Riscos, hipóteses e como validar

| Hipótese ou risco | Validação proposta | Critério observável |
| --- | --- | --- |
| Os selectors encontram todos os consumers. | Mapear clusters, shards, namespaces e parser real. | Nenhuma referência conhecida fica fora da leitura. |
| Timestamp representa a ordem desejada. | Simular republicação antiga e empate. | Resultado coincide com a definição de latest aprovada. |
| Referência desejada basta para preservar operação. | Migrar consumer com rollout pendente e testar rollback. | Release ainda necessária continua protegida antes de qualquer coleta. |
| Labels podem ser usadas como fonte de verdade. | Interromper aplicação do plano no meio e ler pelo generator. | Metadata parcial não altera resolução autoritativa. |
| Falha equivale a ausência de uso. | Simular erro de LIST, parsing e referência ausente. | Rodada não cria novas candidaturas nem exclui objetos. |
| Repetição causa efeitos indevidos. | Repetir mesmas entradas e entregar evento antigo. | Classificação estável, sem PATCH semântico desnecessário. |
| Exclusão corre com criação de referência. | Exercitar todos os caminhos de escrita concorrentes. | Garantia demonstrada ou coleta mantida desabilitada. |
| Crescimento exige exclusão automática. | Medir catálogo, frequência de publicação e custo operacional. | Justificativa mensurável para a etapa de coleta. |

PATCH por objeto não torna a rodada inteira atômica. Controle de versão também não impede outro objeto de ganhar uma nova referência. O apêndice detalha esses limites com referências oficiais.

## 9. Decisões pendentes, em ordem de dependência

| ID | Decisão | Desbloqueia |
| --- | --- | --- |
| D1 | Onde está o catálogo autoritativo e quais consumers, namespaces e clusters entram na leitura? Há cópias da mesma release? | Descoberta e índices corretos. |
| D2 | Qual campo identifica a release e qual contrato resolve a referência? | Cálculo de uso. |
| D3 | Última publicação ou última promoção? Como tratar recriação e empates? | Proteção de latest. |
| D4 | Consumers desabilitados, rollout e rollback preservam quais releases? | Definição completa de proteção. |
| D5 | Retenção por quantidade, idade ou ambas? N total ou N adicional? | Política e exemplos definitivos. |
| D6 | Qual o schema de metadata e quem pode alterá-lo? | Persistência da classificação. |
| D7 | Quais policies existem, como são versionadas e quem pode selecioná-las? | Contrato de execução reproduzível. |
| D8 | Execução síncrona ou assíncrona? Como consultar, repetir e recuperar? | Endpoint e operação em escala. |
| D9 | O que deprecated muda e como impedir novas referências, se necessário? | Depreciação formal. |
| D10 | O que pode ser excluído e qual protocolo garante segurança entre escritores? | Coleta física. |

Nenhuma dessas decisões foi promovida a aprovação nesta revisão. Os nomes de campos, retenção de duas versões e regras de consumers desabilitados do apêndice continuam ilustrativos.

## 10. Próximos passos e critérios de encerramento do brainstorm

- [ ] Confirmar D1–D4 com exemplos reais de release, consumer e migração.
- [ ] Escolher D5 e executar uma tabela de simulação sobre um catálogo representativo.
- [ ] Definir D6–D8 e demonstrar dry-run, repetição e recuperação de falha parcial.
- [ ] Confirmar se há demanda medida para D9–D10; mantê-las como evolução se ainda não houver.
- [ ] Registrar responsáveis e datas das decisões tomadas.

O brainstorm estará pronto para virar uma especificação da primeira etapa quando houver escopo autoritativo, definição de latest, proteções, semântica de retenção e cenários esperados aprovados. A entrega de classificação pode avançar sem uma política de exclusão pronta, desde que essa fronteira permaneça explícita.

## 11. Origem, histórico e referências

- Sessão “Política de depreciação”, de 29/09/2026, com antecedentes sobre ConfigMaps imutáveis e reconciliação sob demanda de setembro de 2026.
- 30/09/2026: registro estruturado e aprofundamento do algoritmo; sugestões técnicas preservadas no apêndice.
- 03/10/2026: reorganização por problema, regras, alternativas, riscos e decisões; novas recomendações identificadas no texto. Nenhuma nova decisão de produto aprovada.
- [API de ConfigMap — Kubernetes](https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/).
- [Conceitos da API e resource versions — Kubernetes](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions).

## Apêndice A — Proposta técnica de 30/09/2026

> Proposta detalhada acrescentada em 30/09/2026. Desenvolve o algoritmo recuperado; nomes novos de metadata, regras de empate e mecanismos de coordenação abaixo são sugestões para validação, não decisões anteriores.

### A.1 O ConfigMap não descobre seu próprio estado

O lifecycle manager calcula o estado comparando todos os releases e consumers da mesma aplicação. Um ConfigMap isolado não informa se é latest ou se está em uso.

As fontes de verdade propostas são:
- Identidade da release: `data.version`, com identificador completo.
- Ordem de publicação: `metadata.creationTimestamp`.
- Referências de uso: campo `release` dos consumers, resolvido pelo mesmo contrato do generator.
- Retenção: política selecionada no servidor.

As labels de lifecycle são saída do cálculo. Não se deve acreditar em uma label antiga `latest=true` para decidir quem é latest hoje.

### A.2 Contrato ilustrativo de entrada

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

### A.3 Descoberta e validação

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

### A.4 Como calcular latest

Ordenar pelo timestamp de criação do objeto no catálogo autoritativo, em ordem decrescente:

```text
latestTimestamp = máximo(releases.creationTimestamp)
latestSet = releases com creationTimestamp == latestTimestamp
```

Normalmente latestSet contém uma release. Para empate, esta proposta protege todas as empatadas e informa ambiguidade. Isso evita inventar uma ordem cronológica com nome, hash ou UID.

Se for necessário exatamente um latest, o publisher deve fornecer uma ordem monotônica autoritativa, cuja atribuição também precisa de coordenação. Uma ordenação de nomes pode ser determinística, mas não demonstra qual publicação aconteceu por último.

A release enviada no trigger não é automaticamente latest: um evento antigo pode chegar depois de uma publicação mais recente.

Importante: recriar uma versão antiga gera um novo creationTimestamp. Nesse critério, ela passa a ser latest. Se isso não representar a semântica desejada, definir publicação lógica com sequência autoritativa antes de implementar.

### A.5 Como calcular in-use

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

### A.6 Política de retenção concreta para a simulação

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

### A.7 Pseudocódigo do cálculo

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

### A.8 O que é escrito em cada ConfigMap

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

### A.9 Exemplo completo de remarcação

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

### A.10 Aplicação do plano e falhas parciais

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

### A.11 Por que candidate não autoriza DELETE sozinho

Uma release pode ganhar um consumer após o cálculo. Reler antes do DELETE reduz a janela, mas não elimina a corrida entre leitura de consumers e exclusão da release.

Pré-condições de UID/resourceVersion no DELETE impedem excluir uma cópia substituída ou alterada do objeto. Elas não impedem que um consumer diferente passe a referenciá-lo.

Portanto, a versão inicial proposta somente classifica. Para garantir exclusão segura, definir um protocolo compartilhado:
- Todas as mutações de referência de consumers e ações do coletor precisam participar da mesma coordenação por aplicação.
- Sob essa coordenação, validar estado atual, uso desejado e uso operacional definido pela plataforma antes de excluir.
- Se edições diretas puderem contornar a coordenação, a garantia forte não está atendida; manter exclusão desabilitada.
- Preservar proteção de latest, incluindo empates, e usar pré-condições do objeto.
- Definir se um período de carência é necessário; ele não substitui coordenação.

Um futuro estado deprecated pode servir para impedir novas referências antes de coletar, desde que o mecanismo de validação das referências participe do protocolo. Uma label isolada não cria esse bloqueio.

### A.12 Acionamentos necessários para manter o estado atualizado

Acionar reconcile:
- Após publicação de uma release.
- Após criação, alteração ou remoção de um consumer.
- Por acionamento manual.
- Periodicamente, se desejado, para reparar eventos perdidos.

Se o único gatilho for publicação, as marcações de in-use podem ficar antigas entre publicações. Isso é aceitável apenas como visualização eventual; nunca deve fundamentar exclusão sem recalcular.

### A.13 Cenários de validação do algoritmo

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
