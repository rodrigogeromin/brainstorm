---
name: argocd-ui-extension
description: Build and adapt React and TypeScript Argo CD UI extensions using exact host release contracts, with profile-specific UI, preview, packaging and validation.
---

Build the requested UI and its host registration, not just a scaffold. First inspect the destination. If `extension-project.json` exists, check its schema/template and validate it using this skill's `validateProject` export in `scripts/contract.mjs`; old project-local checks do not prove adherence to the installed skill. For requested adaptation, read [migration](references/migration-guide.md) and preserve domain code. For an existing repository without a manifest, generate into a new temporary directory and merge the scaffold by reviewed diff, preserving repository files.

For new projects use the bundled deterministic generator. It includes audited source-contract presets for Argo CD 3.0.0, 3.5.1 and 3.5.3. Other exact releases use a contract audited from their own sources. The five profiles are `resource-tab` (including Application with group `argoproj.io`, kind `Application`), `system-level`, `status-panel`, `top-bar-action`, and `app-view`. Read [profile construction](references/profile-guide.md) to choose the point and build the requested behavior.

Before generation, identify the exact Argo CD version and profile. Read [version/runtime](references/version-guide.md) for auditing a release without a preset or a fork. Inspect the exact source's extension service, UI bootstrap, package manifest and actual lockfile; include `hostContract` with tag, four source URLs, method/signature, main/flyout props, globals, JSX mode, argumentMap and resolved runtime versions. Runtime/flyout metadata remain optional in schema v2 for existing contracts, but new construction must record the audited runtime and flyout props when used. Official contracts use `sourceKind: "official"`; forks use `"custom"` and identify their source tag/commit. Never infer from a nearby release. If the host lacks the requested extension point, stop and report it. Resource actions, health checks and config management plugins are outside React UI extensions.

When an audited release differs from the bundled helper's argument mapping or runtime tooling, adapt the project's schema, adapter and tools to that source and verify them with its host harness. Do not falsify the contract or silently choose another profile. A future release is supported only after this work, not by its version number alone.

The schema and normalizer validate exact SemVer and profile availability. Configure only fields supported by the selected profile in `registration`; do not silently choose a different profile. `backend.kind: "proxy"` records the optional backend proxy separately from UI registration and does not create a backend service. Do not put credentials in the project.

Write a temporary JSON parameter file, then run:

```sh
node <skill-directory>/scripts/generate.mjs <parameters.json> <new-destination>
```

The generated `extension-project.json` records exact version, profile, official tag and URLs, selected method signature, props, discovered React globals, JSX mode, registration mapping and template provenance. Existing paths, including dangling symlinks, are refused. Inspect the README and manifest. Customize domain UI under `src/features` and `src/app`; keep host access in the adapter and pass context into UI through props.

Implement the domain UI, data strategy, loading/error/empty states and profile-specific behavior described in [profile construction](references/profile-guide.md). Extend adapter types from the target's official models for fields the feature needs. Replace scaffold assumptions in tests with assertions for the requested behavior; keep host registration, context immutability and production-runtime checks.

In the generated directory run `npm run runtime:setup`, `npm ci`, `npm run validate`, and `npm run evidence:check`. Review all report rows. The preview and production harness simulate host globals and registration; they do not prove host integration. Integration remains `not-run` until the generated bundle is installed and tested on the exact target release. Do not add a version to the integrated matrix based on local gates.

Report commands and results, target, profile, tag/source, source/bundle/package hashes and limitations. When installation is requested, read [installation](references/installation-guide.md) and use the actual environment and existing authorization. Do not install into a cluster, publish, push, or deploy unless requested. Existing projects are adapted through explicit migration and reviewed code diffs.
