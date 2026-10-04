# Explicit, reviewable adaptation

Existing projects are unchanged by generation. When adaptation is explicitly requested, preserve their UI and customizations: back up or use an isolated checkout, audit the target tag, and produce a separate manifest:

```sh
node <skill>/scripts/migrate-manifest.mjs <old-manifest.json> <new-manifest.json> <reviewed-host-contract.json>
```

For a target-version upgrade, first prepare a separate copy of the original manifest. Set that copy’s argoCdVersion to the desired exact release (for example, 3.0.0 → 3.5.1), and append an origin.adaptations entry recording kind:"retarget", from:"3.0.0", to:"3.5.1" while preserving prior origin history. Supply that prepared copy as the source and the reviewed contract for the new target. The migration command preserves the source argoCdVersion; changing the supplied contract alone cannot retarget a project. Keep the original manifest untouched throughout.

The source stays intact. Destination collisions, missing explicit contracts and conflicting icon aliases fail. v1 top-bar-action-menu becomes top-bar-action; iconClassName becomes icon. Other manifest fields and provenance survive; new normalization validates supported registration fields. Local evidence/integration is invalidated and compatibility clears. No code is replaced by this command.

Generate a reference project into a new temporary destination using only GenerationParameters schema keys extracted from the migrated manifest (exclude schemaVersion, templateVersion, origin and compatibility). Compare its scripts, schema/types, executable contract, adapter, runtime setup and build config against the existing project. Update portable files by reviewed diff; merge host and flyout/visibility adapter changes into customized UI rather than copying Extension.tsx. Preserve custom features, styles, tests and origin history. Copy the concrete references/host-contract.json and authoritative parameters types/schema. Review the new manifest diff, then explicitly adopt it. Run runtime setup, npm ci, validate and evidence:check. Old validation-report.json is stale and must be regenerated; real integration requires the new exact artifacts/version to be tested again.
