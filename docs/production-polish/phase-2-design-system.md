# Phase 2 — design-system foundation

Date: 11 September 2026

Work items: `NX-P0.2-01`, `NX-P0.4-01`, `NX-P0.5-01`, `NX-P0.9-01`

## Foundation contract

`src/design/nexus-foundation.css` remains the compatibility source and now exposes semantic aliases for canvas, layered surfaces, text, borders, accent, semantic states, focus, and control geometry. `src/design/nexus-primitives.css` owns shared control sizing and motion behaviour. Existing `--nx-*` values remain available during migration so page work does not require a destructive rewrite.

| Family | Contract |
| --- | --- |
| Surfaces | canvas → surface → elevated/overlay; interactive, hover, selected, and disabled are explicit roles |
| Text | primary, secondary, muted, disabled, inverse, link, code, and status roles; actionable text may not use disabled colour |
| Borders | subtle, normal, strong, interactive, focus, error, and success roles; borders precede heavy shadows |
| Accent | purple is used for primary action, focus, and selective emphasis—not as the universal background |
| States | neutral, information, in-progress, success, warning, and danger have foreground/background/border pairings |
| Geometry | restrained small/medium/large/control radii; full rounding reserved for avatars/status dots/toggles |
| Controls | compact 32px, normal 40px, large 48px; coarse pointers receive a 44px minimum target |
| Focus | a shared outline plus offset, visible on selected/dark surfaces and protected from motion suppression |

The spacing scale is 4/8/12/16/20/24/32/40/48/64. Typography retains the existing Nexus font stack and maps page, section, panel, body, label, helper, status, code, and numeric roles onto semantic variables. No homepage-body typography was migrated.

## Protected-homepage compatibility boundary

`HomepageV2Content` marks the protected body with `data-nexus-protected-homepage-body="true"`. `HomepageCinematic.module.css` rebinds every global foundation and pricing variable the body currently consumes to its baseline value inside `.page`. The header is outside this boundary and can use shared navigation tokens.

This is an intentional compatibility layer, not a new homepage theme. A source contract test prevents removal of the marker and scoped variable set. Body-only before/after visual comparison is the release gate.

## Core primitives

`src/components/ui/index.jsx` now provides a shared contract for Button, IconButton, Input, Textarea, Select, Dropdown, Tooltip, Modal/Dialog, Popover, Tabs, Card/Panel, Badge, Status, Alert, Toast, Spinner, Skeleton, EmptyState, ErrorState, PageHeader, Sidebar/Header/Navigation adapters, SettingsRow, FormField, and SectionHeader where those families already have a safe shared implementation.

| State | Required behaviour |
| --- | --- |
| Default/hover/active | Semantic surface and border; no decorative glow required |
| Focus | `:focus-visible`, visible ring/outline, no focus-on-pointer simulation |
| Disabled | Native disabled semantics where possible; no pointer events; not communicated by colour alone |
| Loading | Label remains understandable; busy state is exposed; repeat activation is prevented |
| Error | Field association or alert semantics, actionable copy supplied by the domain caller |
| Mobile | Content wraps; icon buttons retain labels for assistive tech; coarse target minimum applies |
| Long content | Text may wrap/truncate only when the full value is available through context/tooltip/details |
| Motion | Shared animation is removed under `prefers-reduced-motion`; progress meaning remains in text |

Static informational alerts do not use live-region semantics. Dynamic domain states choose `status`/`alert` deliberately so streaming content does not produce constant announcements.

## Migration strategy

The implementation keeps compatibility aliases and page adapters rather than deleting every local component at once. New and modified product surfaces use the semantic roles and shared primitives. Existing specialized editors, Monaco, Radix components, Plugin Luau controls, and Connector renderer components retain purpose-built wrappers until their interaction contracts can be migrated independently.

## Acceptance and evidence

- Semantic aliases and standard control heights exist in shared CSS.
- Shared primitives define loading, disabled, focus, long-content, and assistive semantics.
- Coarse-pointer and reduced-motion rules are centralized.
- The design guard prevents new arbitrary values from silently expanding the design language.
- Homepage body is isolated from global token evolution.
- Root unit tests, style contracts, design guard, build, responsive screenshots, and body diff form the final evidence set.

## Changed files and rollback

Primary files: `src/design/nexus-foundation.css`, `src/design/nexus-primitives.css`, `src/components/ui/index.jsx`, `src/components/ui/toast-1.tsx`, `src/styles/aiTheme.test.js`, `src/styles/headerVisualContract.test.js`, `src/components/homepage/HomepageV2Content.jsx`, and `src/components/homepage/HomepageCinematic.module.css`.

Rollback order: first revert component consumers, then shared primitive additions, then semantic aliases. Do not remove the homepage compatibility boundary while any global token differs from the Phase 0 baseline. No persisted data, API, auth, billing, or protocol migration is involved.

## Deferred work and risks

- Automated contrast tooling cannot validate Roblox Studio theme rendering; interactive Studio review remains a release gate (`Plugin`, P0 before Plugin release).
- Some specialized legacy controls remain explicit adapters instead of one implementation (`Frontend`, P2).
- Design-guard enforcement reports existing debt but deliberately does not mass-rewrite it (`Design system`, P2).

