# Especificação técnica — OPA com API AuthZEN e PEP Envoy Lua

**Status:** proposta arquitetural  
**Escopo:** autorização de requisições HTTP em Kubernetes/Istio  
**Idioma:** português (Brasil)

## 1. Resumo

Construir uma distribuição customizada do Open Policy Agent (OPA), em Go, que incorpore um plugin para expor a **AuthZEN Access Evaluation API** no mesmo processo e listener HTTP do OPA. O Envoy, operando como Policy Enforcement Point (PEP), utilizará um filtro Lua para construir requisições AuthZEN, consultar o OPA local e aplicar a decisão retornada. A lógica de negócio continuará implementada em Rego.

A proposta mantém dois containers existentes por Pod (proxy e PDP), sem mudanças no código das aplicações e sem adicionar um serviço intermediário.

> **Condição de implementação:** confirmar experimentalmente a possibilidade de registrar a rota AuthZEN no listener HTTP existente do OPA na versão selecionada. O registro de um plugin OPA não implica, por si só, capacidade de registrar rotas HTTP. Caso essa extensão não esteja disponível, avaliar patch mínimo e versionado do servidor OPA, ou reconsiderar a restrição de porta única. Não presumir que essa integração já esteja pronta.

## 2. Objetivos

- Implementar o contrato HTTP/JSON AuthZEN entre PEP e PDP.
- Preservar o OPA oficial como motor de avaliação de políticas Rego.
- Produzir um executável Go único com API OPA e endpoint AuthZEN na porta configurável (8181 por convenção).
- Manter a integração transparente às aplicações.
- Internalizar de forma auditável apenas o código necessário de uma implementação comunitária, quando tecnicamente e juridicamente viável.
- Garantir negação por padrão, identidade confiável, observabilidade e desempenho verificável.
- Publicar imagem OCI versionada, reproduzível e rastreável.

## 3. Não objetivos

- Substituir o motor Rego.
- Implementar todo o ecossistema AuthZEN na primeira versão.
- Criar um novo sidecar ou um gateway de autorização centralizado.
- Manter um fork integral do OPA, salvo necessidade técnica comprovada.
- Interpretar HTTP 200 como permissão sem examinar o campo `decision`.
- Aceitar identidade fornecida diretamente por headers controlados pelo cliente.

## 4. Arquitetura lógica

```text
Requisição HTTP
      |
      v
Istio / Envoy (PEP)
  - autenticação previamente aplicada
  - filtro Lua AuthZEN
      |
      | POST http://127.0.0.1:8181/access/v1/evaluation
      | Content-Type: application/json
      v
OPA customizado (PDP) — processo Go único
  - servidor HTTP OPA :8181
  - endpoint AuthZEN
  - validação de contrato
  - transformação para input Rego
  - avaliação local no motor OPA
      |
      v
  { "decision": true | false }
      |
      v
Envoy: prossegue ou responde 403
```

A API nativa `/v1/data/...` e o endpoint AuthZEN compartilham o motor de avaliação. A integração AuthZEN deve avaliar políticas em memória, sem realizar uma chamada HTTP do processo para si mesmo.

**Semântica:** HTTP 200 indica que a avaliação AuthZEN foi processada; `decision: false` significa negar. Erros de transporte, formato, avaliação ou resposta nunca devem autorizar acesso.

## 5. Contrato inicial

### 5.1 Requisição

```http
POST /access/v1/evaluation HTTP/1.1
Content-Type: application/json
Accept: application/json
```

```json
{
  "subject": { "type": "user", "id": "subject-123" },
  "resource": { "type": "api", "id": "/orders/123" },
  "action": { "name": "GET" },
  "context": {
    "http": {
      "method": "GET",
      "path": "/orders/123",
      "authority": "api.example.test"
    }
  }
}
```

O campo `context.http` é uma **extensão de domínio**, não um campo obrigatório da especificação AuthZEN. O modelo deve preservar a distinção entre campos padronizados e extensões locais. Definir uma política explícita de normalização de path, query string, host e método.

### 5.2 Resposta

```json
{ "decision": true }
```

ou

```json
{ "decision": false }
```

O PEP deve interpretar o JSON de maneira estrutural, rejeitar respostas inválidas e não ignorar obrigações/contextos adicionais que não saiba aplicar. Erros devem ter códigos HTTP e respostas compatíveis com a especificação adotada, sem expor dados sensíveis.

## 6. Estrutura do projeto Go

```text
opa-authzen/
├── cmd/
│   └── opa-authzen/
│       └── main.go
├── internal/
│   └── authzen/
│       ├── config.go
│       ├── factory.go
│       ├── plugin.go
│       ├── handler.go
│       ├── models.go
│       ├── validation.go
│       └── evaluation.go
├── config/
│   └── opa.yaml
├── policies/
│   └── authzen.rego
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── security/
│   └── performance/
├── build/
│   └── Dockerfile
├── .github/workflows/
│   ├── ci.yaml
│   └── release.yaml
├── go.mod
├── go.sum
├── Makefile
├── UPSTREAM.md
├── LICENSE
├── NOTICE
└── README.md
```

| Componente | Responsabilidade |
|---|---|
| `main.go` | Inicializar runtime OPA e registrar extensões |
| `factory.go` | Fábrica e integração com o mecanismo de plugins |
| `plugin.go` | Ciclo de vida, health e status do plugin |
| `handler.go` | Endpoint HTTP AuthZEN e respostas |
| `models.go` | Modelos de requisição e resposta |
| `validation.go` | Validação, limites e campos obrigatórios |
| `evaluation.go` | Avaliação Rego no runtime compartilhado |
| `UPSTREAM.md` | Origem, commit-base, licença e modificações do código internalizado |

### 6.1 Integração com OPA

1. Fixar uma versão suportada do módulo OPA em `go.mod`.
2. Verificar a API de registro de plugins e o mecanismo efetivo de extensão de rotas HTTP.
3. Registrar o endpoint AuthZEN no mesmo servidor HTTP, caso suportado; caso contrário, registrar explicitamente a limitação e adotar uma solução compatível.
4. Compartilhar o estado de políticas, bundles e configuração com o runtime OPA.
5. Preservar comandos e opções essenciais de execução (`run --server`, `--addr`, `--config-file`) mediante testes de compatibilidade.
6. Não presumir que a configuração do plugin abaixo é uma API oficial do OPA: trata-se de um contrato proposto, sujeito à implementação.

### 6.2 Configuração proposta

```yaml
plugins:
  authzen:
    path: authzen
    decision: allow

decision_logs:
  console: true

status:
  console: true
```

A rota `/access/v1/evaluation` deve ser estável e separada da configuração do caminho interno da decisão Rego. O plugin deve validar configuração inválida na inicialização.

## 7. Integração Envoy / Istio

O PEP será implementado como filtro Lua em `SIDECAR_INBOUND`, antes do filtro router, com um cluster Envoy apontando para `127.0.0.1:8181`. O script poderá ser distribuído por ConfigMap e montado no container `istio-proxy`.

Responsabilidades do Lua:
1. Obter identidade de metadados autenticados ou header criado e protegido por componente confiável.
2. Extrair método, path e contexto permitido.
3. Gerar JSON válido, com escaping e limites de tamanho.
4. Executar `httpCall` aguardando a decisão (corrotina, sem bloquear a thread de rede).
5. Interpretar estruturalmente a resposta AuthZEN.
6. Prosseguir apenas em `decision: true` válido; responder 403 para negação e erro apropriado para indisponibilidade.
7. Não incluir tokens ou segredos em logs.

**Controle crítico:** testar a ordem dos filtros em relação a JWT/RBAC e verificar que falhas de inicialização, execução Lua, ausência do filtro ou falha de distribuição da configuração não criam bypass. Um `pcall` ao redor de `httpCall` não comprova sozinho fail closed. É necessário um controle adicional ou mecanismo de implantação que impeça tráfego quando a proteção não estiver efetiva.

Não reutilizar um parser JSON artesanal não auditado em produção; selecionar uma estratégia de parsing validada e testar payloads adversariais.

## 8. Segurança

- **Fail closed:** timeout, erro HTTP, corpo inválido, ausência de identidade, resposta ambígua, erro de avaliação ou falha do filtro devem resultar em não autorização.
- **Autenticação:** a origem do `subject` deve ser verificável; rejeitar headers de identidade fornecidos pelo cliente.
- **Privilégios mínimos:** executar o processo como usuário não root, com filesystem somente leitura e capacidades Linux reduzidas.
- **Rede:** limitar o listener à interface apropriada; considerar que containers de um Pod compartilham namespace de rede.
- **Proteção de dados:** minimizar atributos enviados, nunca registrar bearer tokens; aplicar retenção aos logs de decisão.
- **Supply chain:** versões fixadas, SBOM, varredura de vulnerabilidades, assinatura OCI, procedência do build e revisão de dependências.
- **Proveniência:** preservar LICENSE/NOTICE e atribuições exigidas por licenças de terceiros; registrar commit e diferenças em `UPSTREAM.md`.
- **Compatibilidade:** documentar a versão exata da especificação AuthZEN implementada e os campos de extensão.

## 9. Observabilidade

Instrumentar contadores de decisões permitidas/negadas, erros por categoria, timeouts, respostas inválidas e latência de avaliação. Medir separadamente tempo no PEP, transporte local e avaliação Rego quando possível. Logs estruturados devem incluir identificador de correlação não sensível, versão do plugin e resultado, sem dados de autenticação.

## 10. Testes e critérios de aceite

### Contrato
- Permitir quando `decision=true` e negar quando `decision=false`, ambos com HTTP 200.
- Validar payloads mínimos, opcionais e inválidos conforme versão escolhida da especificação.
- Testar campos extras, duplicados, valores inesperados, Unicode, tamanhos máximos e respostas com contexto/obrigações.

### Integração
- Um único processo OPA, com API nativa e AuthZEN acessíveis na mesma porta configurada.
- Avaliação das políticas em memória, sem loopback HTTP interno.
- Injeção transparente em workloads selecionados; aplicações sem mudanças.
- Confirmação da ordem dos filtros de autenticação e autorização.

### Resiliência
- OPA indisponível, reinício, lentidão, política ausente, falha de configuração, falha do Lua e respostas malformadas.
- Comprovação automatizada de que não há bypass de autorização.

### Desempenho
- Benchmark A/B contra a integração `ext_authz` existente.
- Comparar throughput, latência p50/p95/p99, CPU, memória, conexões e timeouts.
- Executar cenários com Rego simples e com políticas que consultam dependências externas.
- Estabelecer limites quantitativos de aceitação a partir da baseline medida, não de estimativas.

### Entregáveis
- Executável Go compilável e imagem OCI.
- Endpoint AuthZEN funcional e política Rego de exemplo.
- Filtro Lua e manifesto Istio de referência.
- Testes automatizados de contrato, integração, segurança e carga.
- Documentação de build, configuração, upgrade, rollback e origem de código.

## 11. Fases de implementação

1. **Viabilidade do runtime:** validar extensão de rotas do OPA, versão de Go e porta compartilhada.
2. **PDP mínimo:** implementar endpoint AuthZEN, validação, avaliação Rego e testes de contrato.
3. **PEP:** implementar Lua com identidade confiável, parsing robusto e comportamento seguro.
4. **Integração Kubernetes/Istio:** ConfigMap, montagem, EnvoyFilter, health checks e rollout gradual.
5. **Hardening:** testes adversariais, observabilidade, supply chain e fail closed comprovado.
6. **Homologação técnica:** benchmarks comparativos, documentação e rollback.

## 12. Riscos e decisões em aberto

| Tema | Decisão pendente |
|---|---|
| Extensão HTTP do OPA | Confirmar API real de registro de rota no listener existente |
| Código de terceiros | Avaliar internalização, licença, dependências e manutenção |
| Parsing Lua | Selecionar parser auditado ou outra abordagem segura |
| Identidade | Definir fonte autenticada e ordem de filtros |
| Fail closed | Demonstrar proteção contra falhas do filtro e de configuração |
| AuthZEN | Fixar versão da especificação e política para campos opcionais |
| Performance | Estabelecer SLOs após benchmark |
| Evolução | Definir compatibilidade entre versões do filtro Lua e plugin Go |

## 13. Referências

- [AuthZEN — OpenID Foundation](https://openid.net/wg/authzen/)
- [Open Policy Agent](https://www.openpolicyagent.org/docs)
- [OPA — Plugins](https://www.openpolicyagent.org/docs/extensions)
- [Envoy — Lua HTTP filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter)
- [Istio — EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/)
- [Implementação comunitária de referência — opa-authzen-plugin](https://github.com/kanywst/opa-authzen-plugin)

---

**Resultado esperado:** um PEP Envoy que consome efetivamente a API AuthZEN de um PDP OPA customizado, com código auditável, implantação transparente, compatibilidade controlada e negação segura comprovada.
