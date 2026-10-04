---
name: argocd-ui-extension
description: Create React and TypeScript Argo CD UI extensions from exact release-tag contracts, with local preview, build, packaging and evidence.
---

Create a new independent project with the bundled deterministic generator. It includes audited source-contract presets for Argo CD 3.0.0 and 3.5.3. Any other exact release can be used when its audited contract is supplied in the parameters. The five profiles are `resource-tab` (including Application with group `argoproj.io`, kind `Application`), `system-level`, `status-panel`, `top-bar-action`, and `app-view`.

Before generation, identify the exact Argo CD version and profile. For a release without a preset, inspect the exact official tag's `extensions-service.ts`, UI bootstrap, package manifest and lockfile, then include a `hostContract` object in the parameters with `sourceKind: "official"`, the tag, those four official GitHub source URLs, selected profile, method, source signature, component props, React globals, JSX mode and registration `argumentMap`. For a fork, use `sourceKind: "custom"`, identify its source tag/commit, and provide the equivalent source URLs; its manifest remains explicitly custom. The generator checks official tag/version equality (or custom source identity), required evidence paths, selected profile/method, global/JSX consistency and allowed argument mapping. The evidence object records the source audit; it does not establish host integration. If a tag is missing, a method is absent or a signature/global is unclear, stop before generation. Never infer from a nearby release. Resource actions and custom health checks are not React UI profiles.

The schema and normalizer validate exact SemVer and profile availability. Configure only fields supported by the selected profile in `registration`; do not silently choose a different profile. `backend.kind: "proxy"` records the optional backend proxy separately from UI registration and does not create a backend service. Do not put credentials in the project.

Write a temporary JSON parameter file, then run:

```sh
node <skill-directory>/scripts/generate.mjs <parameters.json> <new-destination>
```

The generated `extension-project.json` records exact version, profile, official tag and URLs, selected method signature, props, discovered React globals, JSX mode, registration mapping and template provenance. Existing paths, including dangling symlinks, are refused. Inspect the README and manifest. Customize domain UI under `src/features` and `src/app`; keep host access in the adapter and pass context into UI through props.

In the generated directory run `npm ci`, `npm run validate`, and `npm run evidence:check`. Review all report rows. The preview and production harness simulate host globals and registration; they do not prove host integration. Integration remains `not-run` until the generated bundle is installed and tested on the exact target release. Do not add a version to the integrated matrix based on local gates.

Report commands and results, target, profile, tag/source, source/bundle/package hashes and limitations. Do not install into a cluster, publish, push, or deploy unless requested. Existing generated projects remain on their original template and schema; this generator does not migrate them.
