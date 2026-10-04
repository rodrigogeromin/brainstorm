# Assess before adapting

Separate three conclusions: whether the code implements the target host API, whether metadata meets the current schema, and what deployment/browser evidence exists. A functional v1 project can use `top-bar-action-menu` while the schema v2 name is `top-bar-action`: both refer to `registerTopBarActionMenuExt`; this naming correction is not an Argo CD API change. Missing hostContract means missing machine-readable evidence, not proof that registration is broken. Inspect adapter, runtime externals, host rendering container and existing interaction tests before proposing changes.

`templateVersion` and origin hashes describe where a project came from. Do not force a rebuild or replace those values just because a new skill template was released. Schema v2 projects with a valid explicit contract/registration remain acceptable regardless of their template origin version. A v1 manifest still requires explicit schema migration. No validation of metadata alone establishes runtime correctness.

# Explicit, reviewable adaptation

Existing projects are unchanged by generation. When adaptation is explicitly requested, preserve their UI and customizations: back up or use an isolated checkout, audit the target tag, and produce a separate manifest:

```sh
node <skill>/scripts/migrate-manifest.mjs <old-manifest.json> <new-manifest.json> <reviewed-host-contract.json>
```

For a target-version upgrade, first prepare a separate copy of the original manifest. Set that copy’s argoCdVersion to the desired exact release (for example, 3.0.0 → 3.5.1), and append an origin.adaptations entry recording kind:"retarget", from:"3.0.0", to:"3.5.1" while preserving prior origin history. Supply that prepared copy as the source and the reviewed contract for the new target. The migration command preserves the source argoCdVersion; changing the supplied contract alone cannot retarget a project. Keep the original manifest untouched throughout.

The source stays intact. Destination collisions, missing explicit contracts and conflicting icon aliases fail. v1 top-bar-action-menu becomes top-bar-action; iconClassName becomes icon. The original templateVersion remains provenance; origin.adaptations records the validatorTemplate adopted. Other manifest fields and provenance survive; new normalization validates supported registration fields. Local evidence/integration is invalidated and compatibility clears. No code is replaced by this command.

Generate a reference project into a new temporary destination using only GenerationParameters schema keys extracted from the migrated manifest (exclude schemaVersion, templateVersion, origin and compatibility). Compare its scripts, schema/types, executable contract, adapter, runtime setup and build config against the existing project. Update portable files by reviewed diff; merge host and flyout/visibility adapter changes into customized UI rather than copying Extension.tsx. Preserve custom features, styles, tests and origin history. Copy the concrete references/host-contract.json and authoritative parameters types/schema. Review the new manifest diff, then explicitly adopt it. Run runtime setup, npm ci, validate and evidence:check. Old validation-report.json is stale and must be regenerated; real integration requires the new exact artifacts/version to be tested again.

## Preserve a working custom project

The service-catalog case has a custom `CatalogAction` label, catalog flyout, Jest 30, preview configuration, React in devDependencies and a GitHub prerelease workflow. Preserve those choices. Do not replace its domain UI, harness or entire package.json with the generated example. Merge executable validation/evidence/schema and runtime setup; add `runtime:setup` to existing scripts; update registration.iconClassName references to registration.icon where consumed in adapter, preview and all tests/harness (use rg to find every reference). Keep the upstream API parameter name iconClassName in signatures. Align declared dependencies in their existing section, preserve package version and review lock changes. A generated adapter is a reference, not a mandatory replacement for an already correct custom adapter.

Keep old origin hashes and adaptation history; record the new validator/template tool adoption separately. Run existing domain interaction tests as well as production harness. Compare custom UI/styles/data and release workflow against the original checkout after migration. Document the tested upstream commit and changed files.

Installation and browser interaction are separate facts. Preserve historical installation records and attribution even when local build evidence is regenerated; mark only the new artifact's integration as unverified. Do not repeat stale statements about a temporary bundle when installation was subsequently made persistent. If persistence is user-reported but not inspected, say so; do not invent a Deployment, image, hash or observed browser result.
