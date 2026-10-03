---
title: Padrão, template e skill para Argo CD UI Extensions
status: final
created: 2026-10-03
updated: 2026-10-03
---

# PRD — Padrão, template e skill para Argo CD UI Extensions

## 1. Propósito e visão

Permitir que Rodrigo crie extensões React para Argo CD repetidamente, sem refazer organização, integração com o host, build e empacotamento. O produto reúne um padrão documentado, um template executável e uma skill que adapta esse template ao pedido e demonstra o que foi validado.

A aposta é que reutilizar uma base funcional reduz tempo e correções manuais sem esconder falhas de compatibilidade. O produto é para uso pessoal, sem necessidade de plataforma multiusuário ou distribuição pública inicial.

Este PRD define capacidades e resultados. O [brainstorm](../brainstorm-skill-argocd-ui-extension/brainstorm-skill-argocd-ui-extension.md) fundamenta a pesquisa; o [complemento técnico](addendum.md) preserva escolhas propostas. O [padrão existente](../brainstorm-skill-argocd-ui-extension/padrao-projeto.md) é insumo, não prova de implementação.

## 2. Usuário e contexto

Rodrigo precisa iniciar uma extensão, desenvolver sua UI e produzir um artefato que funcione dentro do Argo CD. Ainda não há uma extensão de domínio definida.

Uso confirmado: pessoal. Argo CD confirmado: **acima de 3.5.1**. A versão 3.5.1 não pertence ao intervalo solicitado; a abrangência declarada não significa compatibilidade já demonstrada com todas as versões futuras.

[ASSUMPTION A1: a skill será usada no Codex, com acesso a um diretório local de projeto.] Não há necessidade de jornadas extensas para um único operador; o fluxo é solicitar projeto, desenvolver, verificar e preparar instalação.

## 3. Vocabulário

- **Padrão:** convenções de organização e responsabilidades dos projetos gerados.
- **Template:** projeto executável que implementa o Padrão.
- **Skill:** instruções e recursos reutilizáveis que aplicam o Template ao pedido.
- **Projeto gerado:** extensão criada pela Skill a partir de uma versão identificada do Template.
- **Versão alvo:** versão exata de Argo CD selecionada para um Projeto gerado.
- **Preview:** execução local da UI com contexto simulado.
- **Pacote:** artefato instalável da extensão e seus recursos.
- **Validação integrada:** demonstração da extensão instalada no Argo CD da Versão alvo.

## 4. Escopo inicial e suposições

[ASSUMPTION A2: a primeira entrega cria Projetos gerados novos; adaptação de projetos existentes fica para evolução.] Isso concentra a validação na reutilização do Template.

[ASSUMPTION A3: o primeiro perfil será uma aba de recurso ou aplicação, com contexto fornecido pelo Argo CD; um exemplo neutro demonstrará os dados recebidos.] É um caso de validação, sem inventar uma extensão de negócio para Rodrigo. Páginas globais e outros pontos poderão ser acrescentados após validar esse perfil.

[ASSUMPTION A4: backend próprio e automação de publicação não fazem parte da primeira entrega.] O Padrão deve permitir integração posterior sem exigir um servidor em todo projeto.

[ASSUMPTION A5: uma Versão alvo exata, superior a 3.5.1 e disponível para teste, será fixada na implementação inicial.] Não escolher automaticamente a versão mais recente nem usar um intervalo aberto como evidência de compatibilidade.

## 5. Capacidades e requisitos

### 5.1 Padrão e Template

**FR-1 — Convenções reutilizáveis.** O Padrão deve definir localização e responsabilidade da composição da UI, funcionalidades, componentes compartilhados, integração com Argo CD, Preview, estilos, instalação e empacotamento.

**Verificação:** o Template segue as convenções; diretórios opcionais só existem quando usados. Cada adaptação local tem origem ou justificativa registrada.

**FR-2 — Template funcional.** Rodrigo pode obter uma versão identificada do Template com um exemplo mínimo do perfil inicial.

**Verificação:** instalação de dependências, verificação de tipos, build e empacotamento passam em checkout limpo no ambiente documentado. Versões de ferramentas e dependências e lockfile são registrados.

### 5.2 Criação pela Skill

**FR-3 — Descoberta dos parâmetros.** A Skill deve receber nome, descrição, destino, Versão alvo, ponto de extensão e, quando aplicável, group/kind e fonte de dados. Deve aproveitar valores já informados na conversa ou no projeto.

**Verificação:** parâmetros que alteram contrato ou compatibilidade não são inventados silenciosamente. Nome inválido, perfil indisponível ou versão sem suporte têm resposta explícita.

**FR-4 — Criação consistente.** A Skill deve produzir um Projeto gerado com identificação da versão do Template e ajustes do pedido.

**Verificação:** dois projetos com nomes diferentes seguem o mesmo Padrão e reutilizam build e empacotamento. Colisão no destino é informada; arquivos existentes não são sobrescritos sem autorização.

**FR-5 — Skill reutilizável.** Rodrigo pode instalar e invocar a Skill no ambiente definido em A1.

**Verificação:** frontmatter e recursos da Skill são válidos; dois pedidos independentes produzem projetos verificáveis sem depender da memória da conversa original. Instruções diferenciam criação, validação e ações externas.

### 5.3 Desenvolvimento e integração

**FR-6 — Preview da mesma UI.** Rodrigo pode executar a UI localmente usando contexto simulado, sem exigir uma instalação de Argo CD para cada ajuste visual.

**Verificação:** Preview e extensão instalada reutilizam os mesmos componentes. Fixtures cobrem contexto válido e dados ausentes; carregamento, vazio e erro são demonstrados quando aplicáveis. Simulação não é apresentada como Validação integrada.

**FR-7 — Contrato do host.** O Projeto gerado deve registrar o componente no ponto escolhido e consumir o runtime disponibilizado pelo Argo CD da Versão alvo.

**Verificação:** bundle não inclui cópias dos módulos que devem ser fornecidos pelo host. A UI aparece no ponto configurado em Validação integrada, sem erros de carregamento ou runtime atribuíveis à extensão.

**FR-8 — Convivência visual.** A UI deve limitar seus estilos à extensão e funcionar com dimensões variáveis do painel disponível.

**Verificação:** instalação não altera navegação ou estilos globais do host; conteúdo continua acessível em pelo menos uma dimensão estreita e uma ampla do painel, com largura e altura registradas no resultado. Conteúdo excedente permanece acessível por rolagem. Tema escuro é verificado quando disponível na Versão alvo.

### 5.4 Entrega e evidência

**FR-9 — Pacote instalável.** Rodrigo pode gerar o Pacote com o bundle e os recursos necessários, seguindo o método de instalação escolhido.

**Verificação:** pacote contém resources e JS com prefixo extension; não contém dependências de desenvolvimento, fixtures ou credenciais. Recursos referenciados carregam no host. O método adotado e seus comandos constam na documentação.

**FR-10 — Resultado de validação.** A Skill deve executar as verificações disponíveis e relatar comandos, resultados e limitações.

**Verificação:** falha interrompe a declaração de sucesso; ausência de cluster é registrada como Validação integrada pendente. Compilação bem-sucedida não é descrita como compatibilidade comprovada.

**FR-11 — Compatibilidade identificada.** Cada versão do Template e Projeto gerado deve declarar Versões alvo testadas e dependências relevantes.

**Verificação:** versão fora da matriz testada é identificada como não validada; a Skill não certifica versões futuras por comparação numérica. Uma alteração de versão exige nova validação antes de ampliar a matriz.

**FR-12 — Guia de uso e continuidade.** Rodrigo deve receber instruções para Preview, validação, Pacote e instalação, além da localização do código específico da funcionalidade.

**Verificação:** um segundo projeto pode ser criado seguindo o guia sem reconstruir manualmente a infraestrutura comum. Publicação, push e deploy são executados somente quando solicitados.

## 6. Qualidade e limites

- **NFR-1 — Reprodutibilidade:** checkout limpo usa lockfile e versões documentadas. Novas gerações não mudam dependências implicitamente.
- **NFR-2 — Evidência:** a validação registra Projeto gerado, Template, Versão alvo e ambiente usados; falhas e verificações não executadas ficam visíveis.
- **NFR-3 — Manutenção:** UI de domínio pode mudar sem reescrever registro, build e empacotamento; correções no Template chegam por versões identificadas, sem atualizar projetos existentes silenciosamente.
- **NFR-4 — Integridade:** geração preserva arquivos do usuário; recursos de desenvolvimento e credenciais não entram no Pacote.

Sem backend obrigatório, SDK genérico, catálogo público, suporte universal a todos os pontos de extensão ou promessa de compatibilidade futura automática. Não há SLA empresarial ou requisito multiusuário para este uso pessoal.

## 7. Sucesso e critérios de conclusão

- **SM-1 — Reutilização:** dois Projetos gerados distintos concluem FR-2, FR-4, FR-9 e FR-12 sem ajustes manuais em build ou empacotamento.
- **SM-2 — Compatibilidade:** o exemplo inicial passa FR-7 e FR-8 na Versão alvo exata. A release inicial não é concluída apenas com Preview.
- **SM-3 — Velocidade:** registrar tempo do pedido com parâmetros completos até Pacote validado e comparar com uma criação manual equivalente. Meta quantitativa será definida após a primeira medição, sem atraso obrigatório na entrega.
- **SM-C1 — Correções posteriores:** registrar falhas no host e correções manuais após geração. Reduzir tempo não compensa omitir verificação ou acumular falhas de runtime.

Concluído quando Padrão documentado, Template e Skill executáveis, dois projetos reproduzíveis e Validação integrada do exemplo estiverem disponíveis. Este PRD é planejamento; esses resultados ainda não foram executados.

## 8. Pendências com responsável e momento

| Item | Responsável | Quando fechar | Impacto |
| --- | --- | --- | --- |
| Versão alvo exata superior a 3.5.1 e ambiente de teste. | Rodrigo, com implementador. | Antes de fixar dependências e validar host. | Bloqueia certificação integrada; não bloqueia planejamento. |
| Método de instalação usado por Rodrigo. | Rodrigo. | Antes de produzir manifestos de instalação. | Template pode preparar Pacote enquanto isso. |
| Gestor de pacotes e versões da toolchain. | Implementador, respeitando preferência de Rodrigo. | Na construção do Template. | Escolhas técnicas no complemento. |
| Primeira extensão de negócio. | Rodrigo. | Ao usar a Skill para um caso real. | Não bloqueia o exemplo neutro. |
| Metas quantitativas de velocidade. | Rodrigo. | Após baseline de SM-3. | Não substitui requisitos de correção. |

## 9. Índice de suposições

- A1 (§2): execução da Skill no Codex com projeto local.
- A2 (§4): projetos novos na primeira entrega.
- A3 (§4): perfil de aba e exemplo neutro.
- A4 (§4): backend e publicação fora da primeira entrega.
- A5 (§4): versão exata fixada na implementação, dentro do intervalo confirmado.

Suposições autorizadas como método de elaboração, não confirmação individual das escolhas. Rodrigo pode revisá-las antes de orientar a implementação.
