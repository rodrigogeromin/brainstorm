# Revisão adversarial da arquitetura

Data: 2026-10-03. Escopo: índice e ADRs 0001–0009. Stakes: ferramenta pessoal; não exige contratos de plataforma pública. Revisão documental, sem build ou validação no Argo CD.

## Resultado

As regras de runtime, entradas, recursos próprios e CSS já impedem os principais conflitos de integração. Duas lacunas merecem fechamento explícito antes da implementação correspondente; não exigem escolher a versão do cluster nesta etapa.

### AV-1 — Contrato de geração ainda não é compartilhável por implementadores independentes

**Severidade:** média. **Locais:** AD-3/ADR-0003 e Deferred.

**Contraexemplo:** o implementador do gerador interpreta `schemaVersion` como número e `registration` como objeto obrigatório; o implementador da Skill interpreta a versão como string e fornece `registration` parcial para aplicar defaults. Ambos preservam todos os campos enumerados e a intenção dos ADRs. Só na integração se descobre que não podem gerar um projeto. Similarmente, fixtures e UI podem escolher formas incompatíveis para `resource` enquanto cada lado declara respeitar os props documentados.

**Correção mínima:** manter o formato detalhado como pendência, mas declarar que a definição executável única de parâmetros/defaults e os tipos de props constituem um gate antes de desenvolver gerador, consumidor ou fixtures em paralelo. Um exemplo válido e casos inválidos compartilhados bastam; não é necessário um SDK. Resolver de forma conjunta também é válido para este uso pessoal.

**Avaliação da deferral:** segura para planejamento; insegura se os campos enumerados forem interpretados como contrato suficiente para implementação independente. A pendência existente já estabelece parte do gate, mas o consumidor Skill e os contratos de props devem ser incluídos.

### AV-2 — Evidência pode sobreviver indevidamente à troca do artefato

**Severidade:** média. **Locais:** AD-7/ADR-0007, AD-3 e AD-5.

**Contraexemplo:** uma unidade gera o relatório de integração para bundle A, identificado por projeto, versão do template e alvo; outra recompila ou altera fonte/configuração e empacota bundle B com as mesmas identificações. Cada unidade cumpre as regras atuais. A matriz continua aparentemente válida embora B não tenha sido carregado no host.

**Correção mínima:** vincular relatório ao hash do bundle/pacote instalado e à revisão do projeto/template usada; fonte, dependências ou configuração alteradas deixam a evidência anterior histórica e exigem repetir os checks afetados. Registrar o hash é suficiente, sem infraestrutura de atestação.

## Tentativas sem achados adicionais

- React embutido, `react-dom/client` externo presumido e jsx runtime ausente são excluídos por AD-2: imports adicionais precisam de contrato comprovado ou remoção.
- CSS separado, chunks omitidos e URLs relativas indevidas são excluídos por AD-5 na base inicial.
- Resets globais e portais sem escopo são excluídos por AD-6.
- Installer e versões exatas são pendências adequadas porque possuem responsável, momento e limites que impedem afirmar validação integrada.
- O perfil inicial `resource-tab` de Application é uma hipótese explícita; AD-4 e AD-7 exigem evidência real antes de declarar suporte.

Não há achado crítico. O fechamento das duas lacunas pode ser textual no índice e nos ADRs correspondentes.
