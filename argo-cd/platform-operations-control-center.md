# Brainstorm — Argo CD Platform Operations Control Center

> Status: Proposta / brainstorm  
> Data: 2026-10-13  
> Escopo: Argo CD Top Bar UI Extension, plataforma multicluster e multishard single-tenant.

## 1. Contexto e ponto de partida

A plataforma possui dois clusters de workloads, um cluster de controle com Argo CD, Istio multicluster e uma arquitetura de entrada via AWS ALB e NLBs por cluster. ConfigMaps dos tipos **global** e **cluster** representam parâmetros operacionais consumidos pela plataforma.

**Já implementado:**
- UI Extension na Top Bar do Argo CD para gerenciar ConfigMaps global e cluster.
- Operação de drain do tráfego de entrada pelo ALB.
- Operação de zerar réplicas de um cluster.
- Integração do frontend do Playground à extensão.

**Ainda não assumido como implementado:** orquestração transacional, preflight, auditoria, freeze, estratégias de tráfego, rollback e validação automatizada.

### Objetivo

Evoluir controles isolados para um **plano de controle operacional** capaz de solicitar, acompanhar, validar e auditar mudanças de estado da plataforma, sem confundir configuração desejada com efeito real.

## 2. Princípios

1. **Intenção em vez de botões isolados:** operações como Isolate Cluster e Restore Cluster encapsulam sequências verificáveis.
2. **Desired × Effective × Observed:** comparar ConfigMaps, infraestrutura/mesh e respostas reais.
3. **Fail-safe:** falhas não devem gerar operações parciais silenciosas; estados intermediários precisam ser visíveis e recuperáveis.
4. **Idempotência:** repetir uma requisição com a mesma chave não deve disparar ações duplicadas.
5. **Governança:** RBAC, vínculo com GMUD, identidade do operador, auditoria e trilha de alterações.
6. **Escopo explícito:** global, cluster, aplicação e consumer/shard.
7. **Separação de responsabilidades:** UI apresenta e solicita; backend coordena; reconcilers/controladores aplicam.
8. **Mínima complexidade:** aproveitar os mecanismos existentes antes de adicionar novos operadores.

## 3. Catálogo de capacidades

### 3.1 Traffic Control Center — P1

- Estratégias: Active-Active, Cluster 1 Only, Cluster 2 Only e Maintenance.
- Exibir separadamente **ingress por NLB/cluster** e **cluster onde o workload respondeu**.
- Mostrar alvos registrados/saudáveis no ALB, configuração do Istio e distribuição observada pelo Playground.
- Tratar distribuição 50/50 como meta sujeita à topologia, algoritmos de balanceamento e amostragem; não prometer percentuais exatos.
- Não assumir que drenar o NLB impede cross-cluster traffic dentro do mesh.

### 3.2 Preflight Checks — P0

Antes de isolar um cluster:
- Confirmar saúde e disponibilidade dos endpoints no cluster remanescente.
- Avaliar réplicas prontas, capacidade de escalabilidade, PDBs e workloads críticos.
- Validar sincronização/saúde relevantes do Argo CD e sinais do Datadog.
- Confirmar ausência de outra operação conflitante.
- Retornar checks com resultado PASS/WARN/BLOCK, evidência e timestamp.
- Permitir override excepcional somente com autorização e justificativa auditadas.

### 3.3 Live Cluster Health — P1

Painel por cluster com:
- ALB target health, entrada de requisições, taxa de erro e latência.
- Réplicas desejadas, prontas e disponíveis; shards ativos.
- Sinais Datadog, estados do Istio e observações do Playground.
- Indicadores de atualização e frescor de cada fonte.
- Separação entre falha de observabilidade e falha real do cluster.

### 3.4 Deployment Freeze — P1

- Freeze por cluster e, futuramente, por aplicação.
- Diferenciar bloqueio de deploy de bloqueio de tráfego.
- Implementar enforcement no caminho real de entrega/reconciliação, não apenas uma flag informativa.
- Definir exceções para correções emergenciais, permissões e expiração opcional.

### 3.5 Operations Timeline e GMUD — P1

- Operação, solicitante, aprovação, GMUD, horário e motivo.
- Snapshot anterior, mudanças desejadas, resultados por etapa e evidências.
- Status: PENDING, PREFLIGHT, RUNNING, VERIFYING, SUCCEEDED, FAILED, PARTIAL, ROLLING_BACK.
- Histórico pesquisável por cluster, aplicação, período e identificador de operação.

### 3.6 Safe Restore / Rollback — P1

- Reverter configurações com base em snapshots versionados.
- Validar capacidade e readiness antes de recolocar um cluster no caminho de tráfego.
- Confirmar convergência e acompanhar janela de estabilização.
- Não prometer rollback atômico entre AWS, Kubernetes e Istio; utilizar compensações e revalidação.

### 3.7 Shard Operations — P2

- Enable/Disable de consumer.
- Release pinning por shard.
- Override de réplicas por consumer.
- Inspeção de release latest, in-use e deprecated.
- Diff de configuração resolvida, considerando precedência **consumer > cluster > global**.
- Controles granulares em tela dedicada; Top Bar permanece ponto de entrada global.

## 4. Operational Workflows

### 4.1 Isolate Cluster

1. Receber intenção e gerar operationId.
2. Executar preflight no cluster que permanecerá atendendo.
3. Verificar exclusividade/concorrência da operação.
4. Solicitar drain dos alvos do cluster de origem no ALB.
5. Aguardar confirmação da infraestrutura e observar drenagem/convergência.
6. Ajustar ConfigMap de cluster para zerar réplicas, preservando snapshot anterior.
7. Aguardar reconciliação, término controlado e atualização dos endpoints.
8. Validar que não há novas entradas pelo NLB drenado e que o comportamento efetivo está de acordo com a política.
9. Confirmar no Playground/Datadog a continuidade do serviço e ausência de regressões relevantes.
10. Persistir evidências e estado final.

**Atenção:** a ordem exata, os tempos de espera e os critérios de sucesso devem ser calibrados experimentalmente. Requisições em voo, deregistration delay, readiness e cross-cluster routing exigem tratamento explícito.

### 4.2 Restore Cluster

1. Verificar se o cluster está apto.
2. Restaurar capacidade/réplicas.
3. Aguardar pods prontos, endpoints e métricas estáveis.
4. Reanexar alvos ao ALB.
5. Verificar target health e distribuição efetiva.
6. Observar erros e latência durante janela de estabilização.
7. Registrar conclusão ou falha parcial.

### 4.3 Emergency Isolation

Fluxo acelerado, com critérios mínimos obrigatórios, permissão especial e auditoria reforçada. O modo emergencial não deve ignorar invariantes essenciais de segurança.

### 4.4 Traffic Validation

Executar amostragem controlada pelo Playground, comparar resultados com estado desejado e infraestrutura e gerar relatório de evidências por operação.

## 5. Desired × Effective × Observed

| Camada | Fontes | Pergunta |
|---|---|---|
| Desired | ConfigMaps global/cluster/consumer | O que foi solicitado? |
| Effective | ALB target groups, workloads, endpoints, Istio | O que está aplicado? |
| Observed | Playground, Datadog, respostas de API | O que está acontecendo? |

**Exemplo:** Cluster 1 marcado como drained no ConfigMap, mas o ALB ainda encaminha novas requisições ao NLB do Cluster 1: estado **DIVERGENT**.

**Outro exemplo:** NLB do Cluster 1 drenado, mas workloads do Cluster 1 ainda atendem requisições recebidas via Cluster 2: isso pode ser comportamento esperado do Istio multicluster, não uma falha do drain de ingresso. Exibir as duas dimensões separadamente.

Estados úteis: CONVERGED, CONVERGING, DIVERGENT, UNKNOWN e STALE. Definir tolerâncias, janela de observação e critérios específicos por operação.

## 6. Experiência de interface

**Top Bar:** resumo compacto de saúde, estratégia de tráfego e operações em andamento.

**Flyout:** cards por cluster, controles autorizados, preflight, histórico recente e links para detalhes.

**Operations Detail:** timeline de etapas, evidências, logs, estado atual, ação de recuperação e vínculo com GMUD.

**Playground integrado:** distribuição de entrada e de execução, zona, nó, pod, subset, shard, erros 503 e histórico de amostras.

**Help contextual:** botão de ajuda abrindo flyout com README em Markdown, documentação da feature, pré-requisitos, riscos e procedimentos de recuperação.

Evitar ações destrutivas sem confirmação, mostrar claramente ambiente/cluster-alvo e distinguir dados reais de dados simulados.

## 7. Arquitetura proposta

```text
Argo CD Top Bar UI Extension
           |
           v
Platform Operations API
  - AuthN/AuthZ e RBAC
  - Operation state machine
  - Preflight e validações
  - Idempotência / lock por escopo
  - Auditoria e vínculo GMUD
  - Snapshots e compensações
           |
           +--> ConfigMaps / Argo CD
           +--> AWS ALB / Lambda existente
           +--> Istio / Kubernetes
           +--> Datadog / Playground
```

A UI não deve ser o executor confiável de workflows longos. O backend precisa sobreviver ao fechamento do navegador, suportar consulta de progresso e evitar operações concorrentes incompatíveis.

**Contrato conceitual:**
- `POST /operations` — criar operação por intenção, alvo, parâmetros, GMUD e idempotencyKey.
- `GET /operations/{id}` — consultar estado, etapas e evidências.
- `POST /operations/{id}/cancel` — solicitar cancelamento quando seguro.
- `POST /operations/{id}/recover` — solicitar compensação/recuperação autorizada.
- `POST /operations/preflight` — simular checks sem mutação.

Exemplo de intenção:

```json
{
  "type": "ISOLATE_CLUSTER",
  "target": {"cluster": "cluster-1"},
  "reason": "Manutencao programada",
  "changeId": "GMUD-EXEMPLO",
  "idempotencyKey": "operacao-exemplo-001",
  "dryRun": true
}
```

Os endpoints são propostas, não contratos já existentes.

## 8. Roadmap

| Prioridade | Entrega | Critério de aceite resumido |
|---|---|---|
| P0 | Preflight de drain | Bloqueia operação quando cluster remanescente não atende critérios |
| P0 | Desired × Effective × Observed | Evidencia convergência ou divergência, inclusive ingress vs workload |
| P1 | Restore Cluster | Recupera capacidade e tráfego com verificações |
| P1 | Histórico + GMUD | Operação rastreável com evidências e responsável |
| P1 | Traffic Strategy + Freeze | Controles explícitos com enforcement |
| P2 | Shard Operations | Operações por consumer com validação de precedência |

## 9. Riscos e questões abertas

1. Qual fonte é autoritativa para cada estado e qual o SLA de reconciliação?
2. Como lidar com falhas parciais entre AWS, ConfigMaps e mesh?
3. Quais operações são mutuamente exclusivas e em qual granularidade?
4. Como definir thresholds para taxa de erro, latência e capacidade?
5. Como comprovar ausência de tráfego sem confundir amostragem com garantia absoluta?
6. Qual mecanismo de enforcement de freeze é compatível com o GitOps existente?
7. Como o RBAC do Argo CD e do proxy extension será aplicado no backend?
8. Quais políticas exigem GMUD, aprovação ou break-glass?
9. Como preservar os ConfigMaps de release imutáveis enquanto seus metadados de lifecycle evoluem?
10. Quais etapas precisam de timeout, retry e compensação?

## 10. Próximo experimento recomendado

**Transformar o drain atual em uma operação verificável de ponta a ponta.**

Entregáveis:
- Preflight antes de drenar.
- OperationId e timeline.
- Verificação de ALB target health.
- Verificação de réplicas/endpoints.
- Validação de ingress vs execução pelo Playground.
- Relatório de convergência com evidências e erros.
- Procedimento de restore testado.

**Valor:** a plataforma deixa de apenas solicitar isolamento e passa a demonstrar, com evidências, que o isolamento pretendido aconteceu.
