# Phase 0 route and surface map

## Production route ownership

`server/productionRouting.js` is authoritative for production ownership. `src/App.js` is the CRA client router after the SPA shell has been selected. `public-frontend/app/` is the Next static-export implementation. These sources overlap intentionally, so editing only one of them can create a local/production mismatch.

### Public Next routes

| Route(s) | Intended user and primary task | Entry and exit | Requirements and important states | Shared/protected status |
| --- | --- | --- | --- | --- |
| `/` | Visitor evaluates NexusRBX and enters the product | Search/direct/navigation → sign up, sign in, Workspace, pricing, docs, downloads | Public; header account island has auth loading/failure states | Header is shared. Entire body is protected, including homepage pricing. |
| `/pricing` | Visitor compares currently offered plans and chooses a checkout path | Header/homepage/upgrade prompts → `/subscribe` or auth | Public catalogue; monthly/annual state; team availability; catalogue/checkout mismatch is critical | Dedicated pricing may change. Uses shared financial plan/catalogue code. |
| `/downloads` | User installs the Studio Plugin or Connector and follows setup | Header/docs/onboarding → artifact/download, docs, Workspace | Public; platform selection, missing release, stale compatibility, and download failure matter | Shared header and product content; not protected. |
| `/docs` | Creator finds setup and workflow documentation | Header/downloads/support → a docs article or product surface | Public; search/empty/no-result and narrow navigation matter | Shared docs shell/header. |
| `/docs/account` | Manage account concepts | Docs index → settings/auth/support | Public documentation | Shared docs shell. |
| `/docs/api` | Advanced API guidance | Docs index → technical configuration/support | Public; advanced vocabulary is appropriate | Shared docs shell. |
| `/docs/assets` | Understand assets workflow | Docs index → assets/workspace | Public | Shared docs shell. |
| `/docs/basic-workflow` | Learn primary workflow | Docs/onboarding → Workspace | Public | Shared docs shell. |
| `/docs/changelog` | Inspect product changes | Docs/downloads → downloads/workspace | Public; release-version consistency matters | Shared docs shell. |
| `/docs/common-use-cases` | Select an example workflow | Docs/search → Workspace | Public | Shared docs shell. |
| `/docs/debugging-guide` | Recover from development failures | Docs/support/error links → Workspace/Plugin/Connector | Public; recovery language is trust-critical | Shared docs shell. |
| `/docs/faq` | Resolve common questions | Marketing/support → relevant product surface | Public | Shared docs shell. |
| `/docs/generating-your-first-script` | Complete first generation | Onboarding/docs → Workspace/Studio | Public; setup prerequisites must be accurate | Shared docs shell. |
| `/docs/getting-started` | Begin setup | Header/downloads → auth/onboarding/Workspace | Public; recommended Plugin path must dominate | Shared docs shell. |
| `/docs/installation` | Install supported integrations | Downloads/docs → Plugin or Connector setup | Public; platform/version/download failure states matter | Shared docs shell. |
| `/docs/projects` | Understand project organisation | Workspace help → Workspace | Public | Shared docs shell. |
| `/docs/prompting-guide` | Improve requests | Workspace/docs → Workspace | Public | Shared docs shell. |
| `/docs/reviewing-and-inserting-generated-code` | Review and apply output | Workspace/docs → change review/Studio | Public; apply/verification/snapshot claims must match runtime | Shared docs shell. |
| `/docs/safety-permissions-privacy` | Understand access and safety | Onboarding/settings/docs → auth/Roblox settings | Public; must match actual permission boundaries | Shared docs shell. |
| `/docs/script-generation` | Understand generation | Docs → Workspace | Public | Shared docs shell. |
| `/docs/studio-plugin` | Install/use recommended Studio companion | Downloads/onboarding/errors → Studio | Public; Plugin build/protocol compatibility matters | Shared docs shell. |
| `/docs/support-and-bug-reports` | Contact support effectively | Error/help → `/support` or `/contact` | Public; signed-in support transition matters | Shared docs shell. |
| `/docs/troubleshooting` | Diagnose connection/product failures | Workspace/Plugin/Connector/errors → recovery action | Public; layer-specific recovery is required | Shared docs shell. |
| `/docs/ui-generation` | Understand UI workflow | Docs → Workspace UI mode | Public; product availability/gates must be accurate | Shared docs shell. |
| `/docs/understanding-script-types` | Choose Roblox script type | Docs/generation → Workspace | Public | Shared docs shell. |
| `/legal`, `/legal/acceptable-use`, `/legal/cookies`, `/legal/refunds` | Find legal policy | Footer/account/billing → related route | Public, deliberately noindex | Shared legal shell. `/legal` has a real Next page in production, unlike the CRA client redirect. |
| `/legal/privacy`, `/legal/terms` | Read privacy/terms | Footer/auth/billing → return to prior surface | Public and indexable in the production classifier | Shared legal shell. |
| `/roblox-script-generator`, `/roblox-ai-scripter`, `/roblox-lua-script-generator`, `/roblox-studio-script-generator`, `/roblox-gui-maker` | Search visitor learns a specific supported workflow and starts a generation intent | Search → `/ai` through shared generation-intent storage | Public; empty submission, hydration, storage, and handoff failure matter | Shared `[slug]` implementation/data; not protected. |
| `/icons/:id` | Public visitor views an indexable published icon | Search/marketplace → icon action or marketplace | Public; route can be 200 indexable, 200 noindex, 404 unpublished/missing, or 410 gone according to backend status | Dynamic Next static output and render classifier. |
| unknown public path | Recover from a bad URL | Any bad link → homepage/docs/workspace | 404 noindex; must work in production and at narrow widths | Next not-found/production classifier. |

The Next App Router implements these through `page.jsx`, `docs/[slug]`, `legal/[slug]`, `[slug]`, `icons/[id]`, and `not-found.jsx`. The explicit production list prevents arbitrary slugs from becoming valid pages.

### CRA application routes

| Route | Intended user and primary task | Entry and exit | Authentication / connection requirements | Loading, error, and empty concerns | Shared/protected status |
| --- | --- | --- | --- | --- | --- |
| `/ai` | Creator describes, plans, generates, reviews, applies, verifies, and recovers work | Header/onboarding/SEO intent/project links → settings, billing, docs, Studio | Anonymous shell is allowed; a signed-in user with an active onboarding gate is redirected to connection setup. Studio is required only for Studio actions. | Auth/bootstrap, empty workspace, long history, stream, cancellation, reconnect, model unavailable, Studio disconnected/stale, partial work | Main Workspace; shared substantially with Electron. |
| `/onboarding` | Verified signed-in user records an idea, connects Roblox, and sets up Studio | Signup/connection gate/settings → return path or `/ai` | Requires Firebase user and verified email. Roblox and Studio become stage-specific requirements. | Saved-progress lookup, API failure/retry, OAuth callback error, partial setup, resume/pause | Standalone guided-launch shell. |
| `/settings` | Manage account, Nexus, usage, models, Roblox/Studio, appearance, privacy, help, admin | Account menu/Workspace → return via header/workspace | Anonymous users can access Appearance and see sign-in-required content elsewhere. Admin section is role-gated. | Per-section loading/save/error/success, entitlement and Roblox status failure, destructive actions | `SiteShell` account variant; also embedded/adapted in Electron. |
| `/billing` | Inspect plan, credits, renewal/payment state, and open billing actions | Account/settings/upgrade prompts → `/pricing`, `/subscribe`, Stripe portal, Workspace | Anonymous users receive an inline sign-in prompt. Signed-in users load entitlements. | Auth loading, entitlement loading/error/retry, cancellation/renewal/payment state | `SiteShell` account variant; shared/adapted in Electron. |
| `/subscribe` | Confirm plan intent and enter Stripe checkout/manage an existing subscription | Pricing/upgrade prompt → Stripe or billing | Requires a current signed-in Firebase user; anonymous intent is redirected to sign-in and preserved | Auth handoff, intent validation, entitlement check, existing subscription, checkout/portal error | Checkout shell; depends on catalogue and backend Stripe mapping. |
| `/signin` | Authenticate and resume intended destination | Header/protected action → return path/onboarding/Workspace | Public; local-development auth redirects directly to `/ai` | Provider/password errors, loading, callback, preserved return path | Shared auth shell/header treatment. |
| `/signup` | Create an account | Header/pricing → verification/onboarding | Public | Validation, provider/email conflict, loading, return path | Shared auth shell. |
| `/forgot-password` | Recover account access | Sign in → sign in | Public | Submission/loading/success/error | Shared auth shell. |
| `/verify-email` | Verify signed-in email before protected setup | Signup/onboarding/connect → return path | Signed-in account expected | Refresh/resend/loading/expired session/error | Shared auth shell. |
| `/connect-roblox` | Authorise/re-authorise Roblox and satisfy the account gate | Onboarding/gated Workspace/settings/OAuth callback → preserved return path | Requires signed-in, verified Firebase user | Connection check, callback success/error, permission denial, stale/upgrade status, retry, sign-out | Shared auth shell; account connection is distinct from Studio connection. |
| `/cli/authorize` | Authorise one local computer/Connector session | Connector browser launch → callback to Connector | Requires signed-in user and valid request parameters | Invalid request, auth redirect, authorisation failure, revocable-session explanation | Advanced connection surface. |
| `/downloads` | CRA development/fallback implementation of downloads | Header/docs → artifacts/docs | Public | Same release/download concerns as Next production owner | Production owner is Next. Keep behavioural parity. |
| `/contact` | Send or find contact path | Footer/help → confirmation/support | Public | Form validation, sending, failure, duplicate submission | Marketing shell. |
| `/support` | View/create support tickets | Settings/docs/account → ticket or product | Anonymous state asks the user to sign in; operations require verified auth | Empty ticket list, loading, create failure, attachment failure | Account shell; shared/adapted in Electron. |
| `/support/:ticketId` | Read/reply/close/reopen one ticket | Support list/deep link → support list | Authenticated ownership/support access | Missing ticket, permissions, loading, reply/attachment failure | Account shell; shared/adapted in Electron. |
| `/admin/support` | Support staff operate customer tickets | Staff navigation/deep link → ticket/admin | Verified support-agent gate; admin state passed to page | Auth/role loading, denied, queue empty, mutation errors | Account shell; internal/staff surface. |
| `/assets` | Browse project/account assets | Workspace/navigation → detail/Workspace | Connection gate applies to signed-in users whose onboarding gate is active; reads also have a feature gate | Disabled-platform state, list loading/error/empty/search | Tools shell. |
| `/assets/:assetId` | Inspect/apply one asset | Library/deep link → library/Workspace | Same gate and feature flag as library | Missing/unavailable asset, preview/load/apply errors | Tools shell. |
| `/icons-market` | Browse icon catalogue | Header/tools → icon detail/Workspace | Public client route | Search/filter empty, data loading/error | Tools shell; distinct from public SEO icon detail. |
| `/icons-market/:id` | Inspect an icon in the client catalogue | Marketplace/deep link → market/Workspace | Route itself is not wrapped in the Roblox gate | Missing icon, load/apply/download state | Tools shell. |
| `/tools/icon-generator` | Legacy entry to the icon marketplace | Old link → `/icons-market` | Connection gate may run before redirect | Gate/loading then redirect | Compatibility alias; do not present as a separate product. |
| `/script/:id` | Open a saved/generated script | Workspace/deep link → Workspace/project | Signed-in onboarding gate applies when active | Missing/unauthorised/loading/source state | Workspace shell. |
| `/debug/entitlements` | Inspect entitlement computation | Admin-only diagnostics → settings/billing | `AdminRoute` | Auth/role/loading/error | Internal; exclude from customer IA. |
| `/legal`, `/terms`, `/privacy` | Compatibility redirects | Legacy links → canonical legal route | Public | Redirect only | Production routing differs for `/legal`; test both owners. |
| `/legal/terms`, `/legal/privacy` | CRA fallback/client legal pages | Footer/deep link → prior surface | Public | Static loading only | Production owner is Next. |
| `*` | Client-side bad-route recovery | Bad in-app navigation → useful route | Public | 404 content and navigation | Production server normally classifies unknown paths before SPA. |

All lazy CRA routes share a full-viewport `Loading…` Suspense fallback. It is functional but too coarse for route-preserving loading and should be treated as an inherited baseline, not a target pattern.

## Redirects, host rules, deep links, and downloads

- `nexusrbx.com/:path*` permanently redirects to `https://www.nexusrbx.com/:path*`.
- `downloads.nexusrbx.com/` temporarily redirects to `https://www.nexusrbx.com/downloads`.
- `/privacy` and `/terms` permanently redirect to canonical legal routes at the Vercel layer and also have SPA compatibility redirects.
- `/__/auth/*` and `/auth/*` are valid non-indexable application prefixes; Firebase auth callbacks must remain outside public-page rewrites.
- `/connector/:path*` proxies the generic Connector release feed/artifacts from Vercel Blob and sends permissive GET/HEAD CORS headers.
- `/studio-plugin/*` receives no-cache/revalidate response headers so users do not silently retain an obsolete Plugin artifact.
- Public generation pages write a generation intent and then navigate to `/ai`; this storage-to-Workspace handoff is a cross-frontend deep link.
- `/cli/authorize` returns to a Connector-supplied callback after creating a separate revocable session; it must not expose the website token.
- Pricing and upgrade links hand off an intent to `/subscribe`, which may detour through `/signin` before Stripe.

## Non-URL surfaces

### NexusRBX Studio Plugin

The Plugin is a dock/floating widget rather than a route hierarchy. Its current tabs are Tools, Activity, Recovery, and Settings. Primary entry is the Studio toolbar button; exits are opening Nexus web/download guidance or closing the widget. Relevant state gates are:

- unpaired, pairing, connecting, live/ready, degraded, session expired;
- correct place, different place, stale context, unsupported build/protocol;
- idle, queued, waiting for approval, applying, verifying, complete, failed;
- local snapshot available, restore confirmation, restore conflict/keep-user-edits, restored, restore failure;
- narrow dock, floating widget, long target/error/result text;
- automatic apply on/off and manual pull.

The Plugin uses a paired Studio token rather than browser Firebase auth. Studio writes must continue to use the versioned command contract, snapshots, expected hashes when known, and explicit acknowledgements.

### NexusRBX Connector

The Electron app switches surfaces inside one renderer rather than using public URL routes:

- sign in / browser authorisation;
- connecting;
- connected/healthy;
- offline or backend unavailable;
- degraded;
- Studio not detected / multiple sessions;
- MCP unavailable;
- diagnostics;
- settings and updates;
- “Open desktop workspace” and the embedded Workspace/Settings/Billing/Support routes.

The main process owns local lifecycle, credentials, update state, Studio/MCP discovery, and diagnostics. The embedded Workspace uses renderer transport adapters and is explicitly not approved for public cutover according to `docs/desktop-feature-parity.md`.

### Local connector CLI

The CLI has no visual route but does expose user-facing terminal states for browser sign-in, invalid/expired session, Studio/MCP discovery, connection, command execution, timeout, and diagnostics. These strings are part of the cross-surface vocabulary audit.

## Journey handoff map

| User stage | Primary surface | System feedback required | Typical handoff |
| --- | --- | --- | --- |
| Describe | Public intent form or Workspace composer | Draft/prompt accepted; connection is not falsely required | Workspace conversation |
| Plan | Workspace conversation/plan UI | Proposed scope and next action | Build/generation |
| Generate | Workspace stream and task lifecycle | Model, progress, cancellation, reconnect | Change review or generated artifact |
| Review | Workspace plan/files/change set | Targets, operations, risk, snapshot/verification plan | Plugin/Studio apply |
| Apply | Plugin plus Workspace activity | Waiting, approval, write acknowledgement, partial outcome | Verification |
| Verify | Plugin/Studio results plus Workspace | Tests/readback actually run and result confirmed | Improve or complete |
| Improve/Recover | Conversation, history, snapshots, Plugin Recovery | Consequences, reversible state, retry safety | New plan/generation or restore |

Today this journey is distributed across several components and status vocabularies; the map documents ownership but does not claim that the UI already presents it coherently.
