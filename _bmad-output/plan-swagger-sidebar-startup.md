---
title: 'Restore Swagger sidebar registration after Argo CD startup'
type: bugfix
ticket: ''
created: '2026-10-23'
status: done
baseline_revision: '55df1fa928130827aaae5e46124533472b171e53'
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="User authorized troubleshooting and existing publication/installation; autonomous repair within that scope">

## Intent

The user cannot see Swagger in the Argo CD sidebar after installing v0.2.0. Fix the startup registration race and deliver a verified v0.2.1 patch to the same installation. Argo CD 3.5.1 schedules React 19 createRoot rendering asynchronously; its App constructor subscribes to systemLevel events later. The current synchronous registration can emit before that subscription, losing the menu and route.

## Boundaries & Constraints

Always preserve the system-level profile, exact host contract, explicit gateway context, domain behavior, existing installer identity and other extensions. Record installation and simulated lifecycle testing separately from real browser verification. Never claim browser visibility from an HTTP shell or harness. Do not change backend, credentials, styling or resource access. Implementation agent only edits and verifies the local clone; operator owns commits, publication, installation and final observed evidence.

## I/O & Edge-Case Matrix

| Scenario | State | Expected behavior | Error |
|---|---|---|---|
| Early bundle | #app exists but is empty; host subscribes at commit | Wait, then emit one system registration after commit and create sidebar route | none |
| Ready host | #app already has children and listener | Register once immediately | none |
| Later mutations | Host children change after initial registration | No duplicate registration; observer disconnected | none |
| Missing host root | No #app exists | Explicit host-root error | Fail clearly |

</frozen-after-approval>

## Code Map

Target repository: `/tmp/argocd-swagger-ui-extension`, clean baseline above. No applicable AGENTS.md in target. Node/npm are already installed with node_modules present.

- `src/index.tsx` immediately calls register(HostPage), the defect.
- `src/argocd/register.ts` maps the audited signature and exports HostPage; preserve both responsibilities.
- Add `src/argocd/startup.ts`, based on the working reference at https://github.com/rodrigogeromin/argocd-system-ui-extension/blob/develop/src/argocd/startup.ts. Wait for document.getElementById('app').childElementCount > 0, or observe its direct childList with MutationObserver. Disconnect before registering; fail clearly on missing root. No arbitrary fixed delay or repeated registrations. The initial DOM commit occurs after the host constructor installed its listener.
- `dev/HostBundle.test.tsx` currently records mocked API arguments and manually draws sidebar; it misses lost events. Replace/extend with an event-driven host fixture that subscribes at host mount and consumes system events, then renders the actual registered component without props. Execute the real dist bundle both before and after host commit. Keep existing authenticated Go/Java switch assertions and external React/global checks. `dev/main.tsx` preview can stay domain-focused.
- Official audited sources local copies: `/tmp/swagger-system-host-app.tsx`, `/tmp/swagger-ui-host-audit/ui/src/app/index.tsx`, `/tmp/swagger-ui-host-audit/ui/src/app/shared/services/extensions-service.ts`. Constructor subscribes; service pushes and emits synchronously; App never replays registry.
- `package.json`/lockfile bump to 0.2.1. `extension-project.json` preserves schema/template provenance; add startup adaptation note, not fictional host capabilities. `references/host-audit.json` may record lifecycle audit with official sources.
- `README.md`, `docs/installation.md` explain race, corrected startup and latest version; retain historic v0.1/v0.2 installation evidence. Mark v0.2 menu failure as user reported. Don't assert v0.2.1 published/installed before operator observes it.
- `scripts/validate.mjs` runs typecheck/lint/test/build/package/production harness and produces hashed validation-report; evidence checker rejects stale artifacts.

## Tasks & Acceptance

- [x] Add regression first and demonstrate early-bundle failure against the old entry point. Add ready-root and duplicate mutation cases plus missing-root unit check.
- [x] Implement startup adapter and change entry point; preserve domain code. Update version/metadata/docs and regenerate evidence using validation.
- [x] Operator reviews diff and independent review, publishes tag v0.2.1 using existing workflow, checks release assets and checksum, dry-runs preserved strategic patch, applies and observes rollout and served bundle. Record actual evidence in a new installation JSON and docs follow-up.

Acceptance: Given either early or ready host loading, when the production bundle runs and host commits, then one Swagger link /swagger and its page exist, and authenticated catalog plus publication selection still work. Given the patched release installed, when rollout and pod/HTTP checks run, then checksum and exact served bundle match that release and other installers persist. Browser integration remains unverified if no browser is available.

## Implementation Notes

## Plan Change Log

## Review Triage Log

Quick independent reviewer: no findings. Matrix rows covered by passing startup units and early/ready production harness; no deferred findings. Full validation 49 unit/domain tests and 2 production bundle cases passed. Installed skill validator passed. Operator publication/installation remains in progress.

## Verification

From target clone: first show failing lifecycle regression with old bundle, then `npm run validate`, `npm run evidence:check`. Run installed skill validateProject against extension-project.json. No dependency changes are intended. Operator verifies published five assets, archive layout/hashes, deployment dry-run preservation, rollout, installer logs, pod bundle and served bytes; authenticated proxy smoke checks can reuse existing safe scripts without printing tokens. Real browser inventory currently empty; do not substitute simulated harness for visual integration.

Operator completion: v0.2.1 tag points to 53a71f5392178820985a479d2b0090c75fddc2aa; release and source CI succeeded. Published five assets verified. Strategic patch preserved other extensions; rollout 1/1 Ready, installer success, pod hash and exact served bytes match release. Authenticated proxy smoke checks passed; complete served bundle simulated startup passed. Evidence committed at d4cebbb; permanent checkout clean and evidence-current. Actual browser interaction remains not-run because no browser surface is available.
