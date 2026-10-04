# Exact-release discovery and runtime

Presets are audited for 3.0.0, 3.5.1 and 3.5.3. 3.0.0 uses ui/yarn.lock, React/DOM 16.14.0, @types/react16.14.15, @types/react-dom16.9.14 and classic JSX. 3.5.1/3.5.3 use ui/pnpm-lock.yaml, React/DOM19.2.6, @types/react19.2.14, @types/react-dom19.2.3 and automatic JSX. Only the latter host bootstrap exports ReactJSXRuntime. All five methods exist in these tags; App View shouldDisplay is absent in 3.0.0.

For another release run:

```sh
node <skill>/scripts/audit-host.mjs <exact-version> <new-audit-directory>
```

The collector obtains extension-service, bootstrap, UI package manifest and the first existing pnpm/yarn/npm lock; audit.json binds official URLs, hashes and dependencies. Missing tags/sources/lock and occupied output paths fail before output creation. It records contractReviewed:false. Read all four files: transcribe the actual method signature, argument positions, component props, separate flyout props, globals and exact resolved React/DOM/type versions. Review lock resolutions, not just package ranges. Write the reviewed hostContract yourself; collection does not certify it. Stop when a requested method is absent.

After generation, run `npm run runtime:setup`, `npm ci`, `npm run validate`, `npm run evidence:check`. Setup requires explicit hostContract.runtime, aligns local dependencies/types/testing-library, JSX and preview, and updates package-lock with npm. React16/17 preview uses render; React18/19 uses createRoot. It updates runtime adapters, never domain UI. Review package/lock diffs. Unsupported major versions require further audited tooling work. React is always external in production.

Signature notation uses method(parameter, optional?) with exact parameter names/order and ? for optional/default parameters, without TypeScript type annotations. Keep the full source signature in audit notes; this normalized notation drives argument validation.
