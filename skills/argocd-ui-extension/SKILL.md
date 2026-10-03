---
name: argocd-ui-extension
description: Create new React and TypeScript Argo CD UI extension projects from a versioned local template, with preview, build, package and validation evidence. Use for resource-tab extensions targeting exact Argo CD 3.5.3.
---

Create a new independent project with the bundled generator; do not recreate build or packaging infrastructure. This base supports only exact **3.5.3**, resource-tab, `argoproj.io/Application`, host-props. Host integration is pending and the tested integrated matrix is empty.

Collect name, description, destination, exact Argo CD version and extension profile from the request/context. Explain the Application defaults and tab title; reuse given values. Missing contract/compatibility inputs require clarification; do not silently pick another version/profile. `scripts/contract.mjs` owns normalization and validation; [parameter schema](references/parameters.schema.json) and [types](references/parameters.d.ts) describe input. No secrets in configuration.

Write a temporary JSON parameter file, then run the absolute resolved skill-local command:

```sh
node <skill-directory>/scripts/generate.mjs <parameters.json> <new-destination>
```

Example parameters:

```json
{"name":"context-inspector","description":"Read-only Application context","argoCdVersion":"3.5.3","profile":"resource-tab","registration":{"tabTitle":"Context"}}
```

Existing paths, including dangling symlinks, are refused before generation writes. Do not authorize overwrites implicitly. Inspect the generated README and extension-project.json. Customize requested domain UI under src/features and src/app, preserving readonly host props, scoped styles and the two entrypoints. Record adaptations in origin.adaptations.

In the generated directory run `npm ci`, `npm run validate`, `npm run evidence:check`. A failed command prevents claiming success. Inspect the package allowlist and use preview with valid/absent fixtures at narrow/wide panel sizes. Report dimensions and limitations. `npm run dev` binds localhost only. The host runtime harness is a simulation, not installation evidence.

Report project/template revisions, target, environment, command results, source/bundle/package hashes and integration not-run until actual host evidence exists. Read [host and evidence guidance](references/host-and-evidence.md) before real installation/compatibility work. Do not alter a 3.5.1 host or claim later versions supported. No deploy, push, publication or global skill installation is implied.

The skill is portable: copy this entire folder into the user's Codex skills directory only when installation is requested; all generator resources resolve relative to the skill folder. Generated projects contain their own scripts/lockfile and need no access to the original skill.
