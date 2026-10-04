# __EXTENSION_NAME__

Generated Argo CD UI extension. Exact target release, profile, official source tag, API signature, props and host React globals are recorded in `extension-project.json`.

```sh
npm run runtime:setup
npm ci
npm run dev
npm run validate
npm run evidence:check
```

The local preview and simulated host harness do not prove integration. The evidence report binds source/template/artifact hashes, exact target, profile and host contract. Integration stays `not-run` until this exact bundle and package are installed and rendered on the exact release.

The generator supports audited resource tabs (including Application tabs), system-level, status-panel, top-bar action and app-view profiles. The adapter in `src/argocd` owns host registration; UI code receives host context through props. Domain work belongs under `src/features` and composition under `src/app`. Backend proxy capability is optional and separate from UI registration.

Production output is one `dist/resources/extension-__EXTENSION_NAME__.js` with scoped CSS. Host React globals and JSX mode derive from the recorded contract. The package contains only the extension resource. Choose an installer and environment-specific configuration before any cluster action; none is generated or applied automatically.

Template changes do not silently update generated projects. templateVersion records the scaffold origin; schema v2 contracts do not require it to match the installed template. Explicit migration preserves existing UI, tooling and provenance. Record domain adaptations in `origin.adaptations`; browser configuration is public and must never contain secrets.

Runtime setup aligns the audited React/DOM/types and JSX mode before dependency installation. Customize src/features and src/app; visibility lives in src/argocd/visibility.ts. For Status Panel, Open details calls host openFlyout; for Top Bar, the host action opens the flyout and the extension component supplies its noninteractive label. Preview models the host control and allows opening/closing the simulated flyout. Local checks do not establish integration.
