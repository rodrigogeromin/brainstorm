# __EXTENSION_NAME__

Generated resource-tab for **exact Argo CD 3.5.3**, `argoproj.io/Application`.
Node 26.7.0, npm 11.19.0, GNU tar. Exact dependency versions are locked.

```sh
npm ci
npm run dev
npm run validate
npm run evidence:check
```

`validate` runs typecheck, lint, tests, production build and package, then records source/template/artifact SHA-256 identities and checks in `validation-report.json`. Failures stop the success declaration. npm ci is a separate prerequisite. Integration is **not-run**; neither preview nor harness is host certification. The integrated compatibility matrix starts empty.

Preview: `http://127.0.0.1:8080/?width=320px&height=240px`, `?fixture=absent`, `?width=1100px&height=600px&theme=dark`. The same Extension component is registered by `src/index.tsx`. Only `dev/main.tsx` mounts its own React root. Change functionality under `src/features/`, composition in `src/app/`, host contract only in `src/argocd/`. No backend, loading or remote-error states are needed for synchronous supplied props.

Production provides one `dist/resources/extension-__EXTENSION_NAME__.js` with embedded scoped CSS. React, ReactDOM and JSX runtime belong to the host. `npm run package` creates deterministic `dist/__EXTENSION_NAME__.tar.gz` containing only that resources JS. No source maps, fixtures, dependencies or credentials are packaged.

To install later, choose the environment-specific installer/image and mount/extract resources into `/tmp/extensions` on argocd-server; keep the `extension-` prefix and enable UI extensions per the official exact-version operator documentation. No manifests or cluster mutation are generated because the installation method is not selected. Deployment, publication and push require a separate request.

Before adding 3.5.3 to an integrated matrix, record actual host version/environment, installed bundle and archive hashes, source/template revision, registration/rendering with real props, browser errors, shared React runtime inspection, panel dimensions (narrow and wide), scroll access and dark theme when available. All required checks must pass. Any source/build/package change invalidates that evidence unless identical hashes and revision are reconfirmed. Do not claim future-version compatibility.

Origin and normalized parameters are in `extension-project.json`. Template corrections do not silently update generated projects. Record domain adaptations in its origin.adaptations array; browser configuration is public and must never contain secrets.
