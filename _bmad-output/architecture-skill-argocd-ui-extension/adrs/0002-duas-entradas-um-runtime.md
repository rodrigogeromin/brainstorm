# ADR-0002 — Duas entradas e runtime React do host

Data: 2026-10-03. Status: Adotado do contrato upstream [ADOPTED]. Identificador estável: AD-2.

## Contexto

A documentação do Argo CD exige React compartilhado e explicita o runtime JSX desde 3.5.

## Decisão

dev/main.tsx monta a UI com dependências locais; src/index.tsx somente registra o componente no host. Produção externaliza react→React, react-dom→ReactDOM e react/jsx-runtime→ReactJSXRuntime conforme o contrato verificado da versão alvo. Outros imports de runtime requerem mapeamento comprovado ou remoção. A configuração de preview não aplica externals de produção.

## Alternativas consideradas

Uma única configuração de resolução para os dois ambientes conflita com a disponibilidade dos globals.

## Consequências

Preview continua independente; o bundle exige inspeção e teste no host. Não fixa a versão local do React antes de escolher o alvo.

## Verificação e revisão

Vincula FR-6, FR-7; preview e build instalado. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
