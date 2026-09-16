# Linear redesign — Phase 1 implementation map

Internal scratch. Authoritative visual contract: `docs/production-polish/phase-2-design-system.md`.

## Runtimes (one product)

- React SPA `src/` via `src/index.js` → `nexus-foundation.css` + `nexus-primitives.css` + `nexus-motion.css`
- Next.js `public-frontend/` via `app/layout.jsx` importing the same three files after `globals.css`

## Routes

### SPA (`src/App.js`) — restyle

- marketing: `/`, `/downloads`, `/contact`, `*`
- account: `/settings`, `/billing`, `/support`, `/support/:ticketId`, `/admin/support`, `/debug/entitlements`
- auth: `/signin`, `/signup`, `/forgot-password`, `/verify-email`, `/connect-roblox`, `/cli/authorize`
- checkout: `/subscribe`
- legal: `/legal/terms`, `/legal/privacy`
- tools: `/tools/icon-generator` (redirect), `/assets`, `/assets/:assetId`, `/icons-market`, `/icons-market/:id`

### SPA — protected / leave alone

- `/ai` Agent, UI, Assets (and desktop workspace). Pin tokens so public graphite does not leak.
- `/onboarding` workspace-adjacent Guided Launch — preserve.
- `/script/:id` workspace shell — preserve.

### Next.js `public-frontend/app`

- `/` homepage (same HomepageV2Content)
- `/pricing`, `/downloads`, `/docs`, `/docs/[slug]`, `/legal`, `/legal/[slug]`
- `/icons/[id]`, `/[slug]` SEO landings, `not-found`

Shared header: `UniversalHeaderFrame` used by SPA `SiteHeader` and Next `PublicHeader`.

## Token files

- Canonical: `src/design/nexus-foundation.css`
- Motion: `src/design/nexus-motion.css`
- Primitives: `src/design/nexus-primitives.css`
- Public extras: `src/index.css`, `public-frontend/app/globals.css`
- Enforcement: `scripts/design-guard.mjs`, `src/styles/designContract.test.js`

## Protected boundaries

1. **Homepage hero band** — `data-nexus-protected-homepage-body="true"` on `.page` wrapping **only** `AiProvidersBand` + `Hero` (prompt, connector card, morph animation). Frozen baseline tokens stay in `HomepageCinematic.module.css`. Header is outside.
2. **AI workspace** — `.ai-page` / `.nexus-studio-root` / `.nexus-studio-page`. Freeze current `--nx-*`, `--ds-*`, `--ai-*`, `--pc-*` in `src/styles/aiTheme.css` (not scanned as a duplicate-token target). `nexus-workspace.css` stays AI-only.

## Leakage strategy

- Do **not** add new unscoped `button, a, .card` rules that can hit `.ai-page`.
- Homepage freeze remains local to `.page` (CSS module).
- Lower homepage lives in `.product` **outside** `.page` so it inherits the new :root graphite tokens.
- Shared primitives consume semantic tokens; AI rebinds those tokens locally.
- `design-guard` treats `nexus-workspace.css` as an AI surface (no public token rewrite there).

## Shared components (careful)

| Component | Protected use | Public use | Approach |
| --- | --- | --- | --- |
| UniversalHeader | No (header allowed) | Yes | Restyle Linear |
| HomepagePrompt | Hero (protected) | Final CTA | Do not change module CSS; CTA inherits old prompt chrome |
| ConnectorReleaseCard / AiProvidersBand | Hero only | — | Untouched |
| FinancialPlans | Homepage below fold | `/pricing` | Restyle; compact vs catalog layouts |
| HomepageFooter | Below fold + downloads/pricing | Yes | Restyle |
| ui/index Button, Input | Maybe settings | Yes | Token-driven; AI rarely uses these |
| NexusSelect | Contact, settings | Yes | Compact geometry |
| editorialUi.js | Contact, 404 | Yes | Neutral type, 8px fields |

## Anti-patterns to remove on public surfaces

Purple headings, 18–24px radii, 1160/72 marketing grid, glass/glow orbs, grid-pattern backgrounds, oversized buttons, page-specific hex, cards for list data.
