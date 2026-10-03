# Exact host contract and evidence

Target: official tag v3.5.3. Upstream service declares `registerResourceExtension(component, group, kind, tabTitle, opts?)`, and resource props `resource: State`, `tree: ApplicationTree`, `application: Application`. Our adapter uses a readonly optional subset so absent contexts are safe. Host sources:

- https://github.com/argoproj/argo-cd/blob/v3.5.3/ui/src/app/shared/services/extensions-service.ts
- https://github.com/argoproj/argo-cd/blob/v3.5.3/ui/src/app/index.tsx
- https://github.com/argoproj/argo-cd/blob/v3.5.3/ui/src/app/shared/models.ts
- https://github.com/argoproj/argo-cd/blob/v3.5.3/ui/pnpm-lock.yaml

No upstream code is copied wholesale. The template externalizes react→React, react-dom→ReactDOM and react/jsx-runtime→ReactJSXRuntime. react-dom/client is preview-only; jsx-dev-runtime is unsupported in installed output. Production inspection uses Webpack's module list, not just minified text heuristics.

Local `validation-report.json` binds exact project source revision, template digest, bundle and tar hashes to tool versions and results. `evidence:check` rejects any mismatched identity. Integrated evidence must additionally identify installed hashes, actual 3.5.3 host, registration and rendering, runtime/global ownership, console errors, narrow/wide dimensions and scroll accessibility, dark theme when available. Keep it separate from the automatically generated local report. A source/build/package change requires revalidation. No integrated version can be certified by the local validator.

Installation is conditional on the user's chosen method. The archive provides resources/extension-name.js; installer must expose it at /tmp/extensions on argocd-server, with UI extensions enabled. Choose installer image/digest and manifests only after the environment is known and deployment requested. Never use simulated authentication or preview as integration proof.
