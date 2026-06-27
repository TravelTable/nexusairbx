# NexusRBX Public Frontend Architecture

## Route Ownership

NexusRBX now uses an incremental public frontend rather than a root-level rewrite.

- `public-frontend/` is a Next.js App Router static-export app for indexable public pages.
- The existing React app remains the owner of client-heavy authenticated surfaces such as `/ai`, account, billing, project editor, Studio-connected workspaces, auth callbacks, and shared script modals.
- The Vercel function in `api/render.js` routes migrated public pages to `public-frontend/out` and routes private/app pages to the existing CRA shell.
- The production route classifier in `server/productionRouting.js` remains the source of truth for unknown-route `404`, missing-icon `404`, and non-indexable app routes.

Migrated in this phase:

- `/`
- `/docs`
- `/roblox-script-generator`
- `/roblox-ai-scripter`
- `/roblox-lua-script-generator`
- `/roblox-studio-script-generator`
- `/roblox-gui-maker`

Still owned by the existing app in this phase:

- `/ai`
- `/signin`
- `/signup`
- `/billing`
- `/settings`
- `/script/:id`
- `/tools/icon-generator`
- `/icons-market`
- `/icons/:id`
- Firebase auth callback paths such as `/__/auth/handler`

## Shared Package Structure

- `src/lib/seo.js` provides the shared canonical origin, absolute URL helpers, Next-compatible metadata defaults, noindex support, Open Graph defaults, Twitter metadata, and structured-data helpers.
- `src/lib/generationIntent.js` remains the shared generation intent contract between public pages and the authenticated AI workspace.
- `src/lib/productAnalytics.js` remains the central product analytics layer. Public client components dynamically import it after hydration and fall back to Vercel Analytics if Firebase analytics is unavailable.
- `public-frontend/components/` contains public-only client islands and server-safe public UI. These components reuse the existing NexusRBX visual language but do not import the authenticated editor. Account state is isolated in `PublicAccountState.jsx` so landing pages do not import Firebase auth at the server-rendered header boundary.

## Deployment Flow

The root build runs both applications:

1. `react-scripts build` creates the existing authenticated application shell in `build/`.
2. `next build public-frontend` creates static public HTML and assets in `public-frontend/out/`.
3. `vercel.json` includes both `build/**` and `public-frontend/out/**` in the render function bundle.
4. `api/render.js` serves migrated public routes directly from the Next static export, serves `_next` assets from `public-frontend/out`, and falls back to the CRA shell for app routes.

Rollback procedure:

1. Remove the affected public route from the migrated route map in `api/render.js`.
2. Redeploy. The existing CRA shell resumes ownership of those URLs.
3. Keep `server/productionRouting.js` active so canonical and 404 behavior remains correct during rollback.

## Authentication Integration

The public frontend does not replace Firebase authentication.

- Sign-in and sign-up URLs stay `/signin` and `/signup`.
- The authenticated workspace stays `/ai`.
- The public header renders as server/static markup. A small account-state client island lazy-loads the existing Firebase client after hydration and links authenticated users to the workspace.
- Auth callbacks remain valid non-indexable app routes and are not handled by the public frontend.

## Data-Fetching Strategy

This phase is static-first.

- Homepage content is static and generated at build time.
- Docs content is static and generated at build time.
- Search landing pages are static and generated from explicit page data in `public-frontend/data/searchLandingPages.js`.
- Interactive prompt submission stores a generation intent in `sessionStorage` through the existing shared contract, then navigates to `/ai`.
- Future marketplace and icon pages should fetch public icon data at build time or through ISR-compatible route generation once the migration moves beyond static export.

## Caching Rules

- Static exported HTML can be cached by the CDN as public content.
- `_next/static` assets are content-hashed and safe for long-lived immutable caching.
- Authenticated app routes are served as non-indexable app shell responses and should not be treated as canonical public pages.
- Missing icons and unknown public routes return `404 noindex`; permanently deleted assets may move to `410` only when reliable deletion state exists.

## Preview And Production Routing

- Non-www production host redirects are configured in `vercel.json` and scoped to `nexusrbx.com`.
- Preview deployments and local development are not redirected to production `www`.
- Migrated public pages are served by path, not host-derived canonicals.
- Canonicals always begin with `https://www.nexusrbx.com`.

## Rollout Notes

The migration intentionally avoids mass-producing keyword-swapped SEO pages. New landing pages must have distinct examples, supported request types, Studio guidance, debugging notes, limitations, FAQs, metadata, and generator-mode defaults before being added to the sitemap.
