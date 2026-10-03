# Reconciliação do PRD com o brainstorm

Revisão documental em 03/10/2026 do PRD completo e addendum contra brainstorm-skill-argocd-ui-extension.md, padrao-projeto.md e .memlog.md. Sem pesquisa adicional ou execução de template.

## Resultado

O PRD preserva a direção de padrão React adaptado ao Argo CD, template executável e skill reutilizável. Mantém preview e integração separados, runtime do host, pacote resources/extension*.js, isolamento visual, evidência integrada e criação de segundo projeto. As escolhas detalhadas continuam propostas no addendum.

As confirmações posteriores do usuário prevalecem sobre as fontes antigas: uso pessoal, Argo CD estritamente acima de 3.5.1 e nenhuma extensão de negócio definida. Versão exata continua pendente de implementação. O exemplo neutro e o perfil inicial são suposições autorizadas para elaborar o PRD, identificadas como tais. Dimensões variáveis do painel, rolagem e tema escuro são critérios novos explícitos no PRD, sem serem atribuídos à pesquisa original.

## Gaps reais restantes

| Gap | Evidência original | Tratamento recomendado |
| --- | --- | --- |
| Proveniência de código reutilizado não explicita tag/commit e conferência de licença. | Brainstorm §2 exige referência fixada e licença antes de copiar. FR-2 identifica versão do Template, mas isso não substitui procedência upstream. | Registrar no complemento ou checklist de construção, antes de copiar código. |
| Limites internos da integração não estão preservados explicitamente. | Padrão: entrypoint não chama createRoot no host; features não acessam extensionsAPI; contexto passa por props. FR-1/FR-7 cobrem resultado geral. | Conservar estes limites no desenho técnico/template; não são bloqueio para PRD de capacidades. |
| Autenticação simulada pode ser interpretada além do permitido. | Padrão: dev não simula autenticação real nem prova permissões. FR-6 distingue preview de validação integrada, mas não explicita esse limite. | Registrar limite no guia de preview antes da implementação. |
| Contrato detalhado do pacote e chunks permanece para desenho técnico. | Padrão prevê tar resources, exclusão de HTML/mocks e cautela com chunks dinâmicos. PRD cobre resources, fixtures e carregamento real, sem formato tar/chunks explícitos. | Fixar formato do installer adotado e estratégia de recursos no template validado. |
| Parâmetro descrição foi omitido da lista FR-3. | Padrão lista nome, descrição, destino, versão, ponto, dados e instalação. | Ajuste pequeno futuro na descoberta de metadados; instalação já tem pendência e guia próprios. |

## Reduções de escopo e pendências aceitáveis

Backend/proxy/RBAC foram adiados por A4; requisitos de contexto, autenticação e acesso negado da pesquisa devem retornar se backend entrar no escopo. Não constituem ausência da entrega inicial assumida. Lint e testes de comportamento estão preservados no addendum, embora não sejam critério enumerado de FR-2; devem compor a revisão técnica.

A definição de versão exata, ambiente, instalação, toolchain e metas quantitativas já tem responsável e momento no PRD. A ausência de uma extensão real não bloqueia o exemplo neutro. Não há promessa indevida de compatibilidade futura ou implementação já concluída.

## Síntese

Nenhum conflito relevante com a direção atual do usuário. Os gaps restantes são majoritariamente rastreabilidade e detalhamento técnico; o principal cuidado antes de copiar implementação é fixar procedência e verificar licença. PRD e addendum não foram alterados nesta reconciliação.
