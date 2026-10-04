# Build the requested UI

Select the registration from the exact tag before designing the UI. Look up the official [UI extension guide](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/) for discovery, then verify signatures and props in the target tag. The guide's current examples cannot establish older-release compatibility.

| Requested UI | Profile and registration | UI to implement |
| --- | --- | --- |
| Resource details tab | resource-tab, group/kind/tabTitle | Render resource-specific fields from resource, plus application/tree context. Core group is `""` (e.g. ConfigMap); `"**"` matches all groups including core. |
| Application tab | resource-tab, group argoproj.io, kind Application | Build the Application view with the same resource adapter. |
| System page | system-level, title/path/icon | Build an independent page; no application/resource/tree props are guaranteed. Obtain data via explicitly configured APIs if required. |
| Application status panel | status-panel, title/id, optional flyout | Implement a compact summary; flyout:true adds Open details through host openFlyout. With flyout:false there is no action. |
| Application top bar | top-bar-action, title/id/icon/isMiddle/flyout | Render a compact noninteractive action label; the audited host owns the clickable control, icon and flyout opening. Place the full UI in the flyout. Do not nest another button or duplicate the icon. |
| Application view | app-view, title/icon | Build a complete Application view with application/tree. v3.0.0 has no shouldDisplay callback. |

Start with the generated components, then implement the user's domain requirements under `src/features` and `src/app`. Replace placeholder text and context summaries, define loading/empty/error states, and consume props without mutation. Keep registration in `src/argocd/register.ts`. Customize `src/argocd/visibility.ts` to evaluate the application argument; absence of context needs an explicit domain fallback. Main component props and flyout props differ: the audited flyouts receive application/tree, without openFlyout/resource.

Preview: `npm run dev`; use `?fixture=absent`, `?theme=dark`, `?width=390px` and `?height=844px`. Open and close the flyout and exercise visibility with available/absent application fixtures. Add tests for the requested UI behavior, navigation, context handling and accessible controls, then run full gates. A generic scaffold alone is not completion of a domain UI request.

Choose dataSource host-props, argocd-api, proxy or external-api to record the UI data strategy. For API-backed UI implement a typed client with base-href-aware same-origin Argo session requests, existing RBAC behavior, request cancellation, loading/empty/error states and explicit response validation. Proxy selection requires separately configured backend routing; external APIs require the environment’s authentication/CORS contract. Keep credentials out of frontend source and manifests.

For top-bar-action, inspect `ui/src/app/applications/components/application-details/application-details.tsx` at the exact tag in addition to the API service. In the audited 3.0.0/3.5.1/3.5.3 implementation, `renderActionMenuItem` uses the extension component as the menu title and owns the action. Preview and harness must model that wrapper, click its control, verify no nested interactive controls or duplicate icons, and then render the separately registered flyout. A standalone component render cannot verify this composition. For other profiles inspect their consumer and model the corresponding container rather than assuming all profiles have the same layout.
