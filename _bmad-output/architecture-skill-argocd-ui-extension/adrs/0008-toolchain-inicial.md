# ADR-0008 — Toolchain inicial React, TypeScript, Webpack e npm

Data: 2026-10-03. Status: Proposto [ASSUMPTION]. Identificador estável: AD-8.

## Contexto

O Rollout fornece exemplo concreto de Webpack e externals; o padrão já propõe esta cadeia.

## Decisão

Usar React/TypeScript com Webpack para as duas entradas e npm com package-lock.json. Manter comandos dev, typecheck, lint, test, build e package; typecheck é independente da transpilação. Uma configuração comum e ajustes por ambiente pertencem ao Template. Fixar versões exatas de Node, npm, compilador, bundler, loaders e bibliotecas compatíveis com o host antes do primeiro build; nenhum latest é resolução de release. Preferência posterior de Rodrigo por outro gestor exige substituir gestor e lock juntos.

## Alternativas consideradas

Vite react-ts é um starter atual, mas seus defaults de SPA não resolvem sozinhos o bundle hospedado. Dois bundlers acrescentam manutenção. Copiar o Rollout inteiro importaria dependências de domínio.

## Consequências

Escolha inicial sujeita à prova executável. Não há versões inventadas nem template já compilado.

## Verificação e revisão

Vincula FR-2, FR-6, FR-9; infraestrutura do Template. Aplicar os critérios desses requisitos do [PRD](../../prd-skill-argocd-ui-extension/prd-skill-argocd-ui-extension.md). Este registro não relata execução já concluída. Rever quando o contrato do host, o perfil ou a hipótese que motivou a decisão mudar; registrar substituição sem reutilizar IDs.

Origem e evidência: [fontes e pendências do índice](../architecture-skill-argocd-ui-extension.md#fontes). Raciocínio registrado também no [histórico](../.memlog.md).
