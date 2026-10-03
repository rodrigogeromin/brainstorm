# ADR-0009 — Operação local e backend opcional

Data: 2026-10-03. Status: Misto: FR-12/NFR-4 adotados; A1/A2/A4 herdadas como [ASSUMPTION]. Identificador estável: AD-9.

## Contexto

Uso pessoal e criação de projetos novos reduzem o escopo operacional inicial.

## Decisão

Geração, preview, verificações e pacote executam localmente. Push, publicação e deploy têm ações separadas solicitadas por Rodrigo. Sem backend obrigatório, autenticação simulada ou serviço de geração hospedado. Backend futuro requer decisão de fonte de dados, contrato, permissões/proxy e ciclo de entrega separado. Configuração acessível no browser é pública; segredos ficam fora do projeto gerado e do pacote. Argo CD permanece dono de navegação, autenticação e montagem globais.

## Alternativas consideradas

Plataforma de geração e backend padrão acrescentariam infraestrutura e decisões ainda sem caso real.

## Consequências

Cada projeto é independente. Não há sincronização automática nem SLA de plataforma.

## Verificação e revisão

Vincula A1, A2, A4, FR-12, NFR-3, NFR-4; execução e evolução. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
