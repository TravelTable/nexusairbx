# Phase 0 application and runtime inventory

## System map

NexusRBX is one product delivered through several independently built runtimes. The shared mental model should be applied across them, but their release and failure boundaries must remain explicit.

| Surface/runtime | Repository location | Framework and UI stack | Build / development | Production output and target | Authentication and API boundary | Sharing and versioning |
| --- | --- | --- | --- | --- | --- | --- |
| Nexus Workspace and authenticated web shell | `src/`, root `package.json` | React 18.3, Create React App 5, React Router 6, Tailwind 3, global CSS/CSS modules, Radix, Base UI, Monaco | `npm start`; local full stack: `npm run dev:local`; build: `npm run build:app` or root `npm run build` | `build/`; served by Vercel through `api/render.js` for SPA routes | Firebase client authentication; calls the Express API, Firebase auth callbacks, Stripe checkout/portal, and Studio bridge APIs | Shares `src/` UI/content/lib code with the public frontend and Electron renderer. Root app version is `0.1.0`; deployed as part of the web release. |
| Public website, pricing, downloads, docs, legal, SEO pages, public icon pages | `public-frontend/` | Next.js 16 App Router, static export, React 18 dependency resolution, shared root CSS/components | `npm run public:build`; no independent dev script is declared | `public-frontend/out/`, merged/served by the Vercel render function | Public/static by default; the header account island lazy-loads Firebase. Public icon generation reads production data during build. | Reuses root homepage content, navigation, financial plans, SEO, and analytics. No independent package version. |
| Hybrid production router/render shim | `api/render.js`, `server/productionRouting.js`, `vercel.json` | Vercel Node function plus deterministic route classifier | Included in root `npm run build`; tests: `npm run test:production-routing` and `npm run test:public-frontend` | Vercel; preferred host `www.nexusrbx.com` | Chooses Next static HTML, CRA shell, icon status, 404/410, canonical/noindex behaviour, and Firebase callback passthrough | Shared release with root web. This is the actual route-ownership source of truth. |
| NexusRBX Connector | `desktop-connector/` | Electron 35, Vite 6, React 18, TypeScript, Tailwind 3, copied Radix/shadcn-style primitives | `npm run check --prefix desktop-connector`; package with `package:win` or `package:mac`; fixture capture with `preview:capture` | `desktop-connector/dist/`; installers under `desktop-connector/release/`; generic update feed proxied at `/connector` | Browser sign-in creates a revocable desktop session; local worker talks to Studio MCP and selected backend APIs | Package version `0.3.6`; product name `NexusRBX Connector`; independent signed/notarised release. It also embeds a partially adapted Desktop Workspace, which is a product-role conflict requiring a decision. |
| Local Studio connector / Studio MCP client | `local-connector/` | Node 22 TypeScript CLI, MCP SDK 1.29; no visual renderer | `npm run dev --prefix local-connector`; `npm run check --prefix local-connector`; root helper `npm run mcp:local` | `local-connector/dist/`; invoked by the desktop app or CLI | Holds a revocable local/desktop session and talks to the official Studio MCP server plus Nexus backend | Version `0.3.6`; packaged into/alongside the Connector; independently testable. User-facing output is terminal status, prompts, and diagnostics. |
| NexusRBX Studio Plugin | `roblox-plugin/src/` | Luau/Roblox GUI with custom primitives and a fixed dark-plum palette | `npm run plugin:build`; tests: `npm run plugin:test`; local install: `npm run plugin:install` | Bundled `roblox-plugin/NexusRBXStudioBridge.plugin.lua` and `roblox-plugin/build/NexusRBXStudioBridge.rbxmx`; distributed through web download/local Studio install | Claims a paired backend Studio session, polls versioned commands, performs reads/writes, snapshots and verification in Studio | Source build ID is `nexusrbx-studio-0.15.1-ui-build.18-files-first`; independent Plugin/protocol compatibility. The README still names an older build and must not be treated as release authority. |
| Nexus backend | ignored nested repository `backend/` | Node 22, Express 4, Firebase Admin, Stripe 22.4, OpenAI 6.17, PostgreSQL, Redis, WebSocket | `npm start`; `npm run dev`; `npm test`; Studio protocol test per engineering notes | `backend/server.js`; `nixpacks.toml` is Railway-compatible and current staging documentation names Railway. Confirm the exact production service in operations before release. | Authoritative authentication enforcement, generation, tasks, agents, projects, billing, entitlements, Roblox OAuth/assets, Studio sessions/commands, desktop APIs, support and audit | Separate Git repository and release (`TravelTable/nexusrbx-backend`, version `1.0.0`) despite living inside the root working tree. Root Git ignores it. |
| Firebase billing functions | `backend/functions/` | Firebase Functions, Node 22, Firebase Admin, Stripe 18.5 | `npm run serve --prefix backend/functions`; deploy: `npm run deploy --prefix backend/functions` | Firebase Functions | Stripe/Firebase event handling separate from the Express runtime | Independent dependencies and deploy; its older Stripe SDK is a compatibility risk, not proof of incorrect behaviour. |
| Documentation and downloads surfaces | `public-frontend/app/docs`, `public-frontend/app/downloads`, shared content under `src/content` and `src/data` | Next static pages plus shared React content | Built by `npm run public:build` / root `npm run build` | Vercel static public output | Public; downloads also reference Plugin and Connector release artifacts | Not independently versioned; copy must track Plugin and Connector compatibility. |

## Shared code boundaries

- `src/components/site/UniversalHeaderFrame.jsx` and `src/content/universalNavigation.js` are the structural shared-header seam used by the CRA `SiteHeader` and Next `PublicHeader` adapters.
- `src/components/homepage/HomepageV2Content.jsx` is rendered by both web frontends and is the protected homepage-body boundary.
- `src/data/billingCatalog.v2.json` feeds root/shared pricing UI. The backend runs from a separate copy at `backend/shared/billingCatalog.v2.json`; parity is tested but runtime deployment remains independent.
- The Electron renderer imports substantial UI from the root `src/` tree, including Workspace, Settings, Billing, and Support surfaces, while maintaining its own primitive set and transport adapters.
- `local-connector` is consumed as a file dependency by `desktop-connector`.
- The Studio protocol is defined and versioned in `backend/src/lib/studioToolProtocol.js`; Plugin capabilities and build attestation must agree with it.

## Backend boundaries relevant to UI

`backend/server.js` exposes these user-facing API groups:

- session streaming and auth: `/api`, `/api/auth`;
- desktop: `/api/desktop/v1`;
- support/admin/security: `/api/support`, `/api/admin/support`, `/api/security`, `/api/audit`;
- tools and content: `/api/tools`, `/api/icons`, `/api/collections`, `/api/models`, `/api/share`;
- generation and task lifecycle: `/api/generate*`, `/api/tasks`, `/api/v2`, workflow and artifact routes;
- user content: `/api/scripts`, `/api/projects`, `/api/attachments`, `/api/project-bindings`, `/api/model-files`, `/api/ui-builder`, `/api/ui-designs`, `/api/workspace`;
- account/commercial: `/api/user`, `/api/onboarding`, billing/checkout/portal routes, Stripe webhook;
- Roblox and Studio: `/api/roblox`, `/api/roblox/model-uploads`, `/api/studio`;
- updates and client diagnostics: `/api/updates`, `/api/client-log`.

Authentication, verified-email checks, rate limits, Studio mutation limits, and admin/support gates are applied at different router boundaries. UI refactors must not infer one universal permission model.

## Release and local-development topology

- Root web deploy: Vercel (`vercel.json`) with a hybrid static/SPA render function.
- Connector release: Electron Builder; Windows NSIS and universal macOS targets; update feed behind the web `/connector` proxy.
- Plugin release: generated Luau and RBXMX artifacts with checksum/build attestation; the build does not publish automatically.
- Backend: independently deployed Node service using Nixpacks; staging documentation identifies Railway, but production ownership must be confirmed outside the repo.
- Firebase Functions: independent Firebase deployment.
- Local development: `scripts/local-ai-dev.js` starts the Express backend on 5001, public Next frontend on 4173, CRA on 3000, local auth, and worker support.

## Ownership conclusions

| Capability | Primary implementation owner | Secondary consumer or adapter |
| --- | --- | --- |
| Public navigation and account entry | Shared header/navigation in `src/` | CRA and Next adapters |
| Homepage body | Shared homepage components in `src/components/homepage` | CRA and Next routes; protected from redesign |
| Workspace conversation/project experience | Root `src/pages/ai` and `src/components/ai` | Electron Desktop Workspace adapters |
| Pricing presentation | Shared `FinancialPlans` plus frontend catalogue | Homepage and dedicated Next pricing route |
| Billing/entitlements enforcement | Backend catalogue and billing routes | Web/Electron billing surfaces |
| Studio command contract | Backend protocol and services | Plugin and local Connector clients |
| Normal Studio user experience | Studio Plugin | Workspace connection controls |
| Advanced/local connection health | Connector and local connector | Workspace/Plugin health summaries |
| Docs/downloads | Next public frontend | Shared product/version content |

No surface can be safely redesigned as if these dependencies were absent.
