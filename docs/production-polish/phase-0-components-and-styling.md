# Phase 0 styling and component inventory

## Point-in-time inventory

The repository mixes mature shared work with several generations of styling. Counts below are audit indicators rather than architectural guarantees because generated files and tests are included differently by each package.

| Area | Files | Test files | Style files | Principal approach |
| --- | ---: | ---: | ---: | --- |
| Root `src/` | 730 | 240 | 51 | Tailwind utilities, global CSS, CSS modules, inline styles, Radix/Base UI, bespoke components |
| Next public frontend | 74 | 5 | 4 | Shared root tokens/components plus public-only CSS/modules |
| Electron Connector | 78 | 13 | 1 large stylesheet | Tailwind, CSS custom properties, hard-coded CSS, copied Radix/shadcn-style primitives |
| Local connector | 37 | 13 | 0 | Terminal output only |
| Studio Plugin | 69 | 19 | Luau UI across 57 source/build-related files | Roblox Instances, custom spacing/colour tables, fixed dark palette |
| Backend | 821 | 302 | n/a | API/runtime; user-facing strings and state contracts live in routes/services |

Across frontend sources, 18 stylesheets are CSS modules and 38 are plain/global CSS. Fifty source files contain inline style objects and 276 contain `className` usage. There is no styled-components dependency.

## Design-system layers found

| Layer | Location | Current role | Finding |
| --- | --- | --- | --- |
| Foundation tokens | `src/design/nexus-foundation.css` | `--nx-*` semantic-ish colours, spacing, radii, type, motion, shadows; shadcn compatibility; aliases into `--ds-*` elsewhere in the file | Strong starting point, but one global dark contract is applied to all routes and includes values outside the requested target system. It is not safe to change without homepage isolation. |
| Shared primitives CSS | `src/design/nexus-primitives.css` | Route headings, action links, fields, ledger rows, state marks, modal/menu surfaces | Useful migration layer, but several defaults are visually promotional: pill action, large route heading, large overlay radius, hover lift/shadows. |
| Shared motion | `src/design/nexus-motion.css` | State/elevation transitions, active control motion, composer/build signal, reduced-motion override | Includes a global active transform and broad element transitions. Reduced motion exists and must be preserved. |
| Tailwind base/components | `src/index.css` | Global body, scrollbars, focus helpers, fields, icon buttons, legacy utility abstractions | Contains both token-backed and hard-coded geometry; global selectors affect protected homepage and every application surface. |
| Legacy CRA CSS | `src/App.css` and route/component styles | Remaining Create React App and earlier UI generations | `App.css` still contains unused-looking CRA boilerplate. Route CSS ranges from token-backed to hard-coded. |
| Next public styles | `public-frontend/app` and public components | Static public page layout | Imports shared design and homepage code, so it is not a fully isolated design system. |
| Connector theme | `desktop-connector/src/renderer/styles.css` | `--connector-*` RGB variables, light/dark values, all Connector and older workspace styling | Independent token namespace, many literal colours/radii/shadows, one large stylesheet, and partially duplicated workspace styles. |
| Studio Plugin theme | `roblox-plugin/src/ui/BridgePanel.lua` | Luau `COLORS`, sizes, status state machine, tab/panel construction | Explicitly forces a dark plum palette independent of Studio theme. Uses Studio colour enum names only as lookup keys into fixed values. |
| 21st metadata | `.21st/design.json` | Historical design decisions and scanner configuration | Stale: describes Next as the main stack and references missing `src/app.css` instead of `src/App.css`; contains useful decisions but cannot be treated as authority. |

Fonts currently declared include DM Sans, Atkinson Hyperlegible Mono, Atkinson Hyperlegible Next, Instrument Sans, and Sofia Sans Condensed. The foundation chooses DM Sans for display, system UI for body, and Atkinson Hyperlegible Mono for code, while other routes and the Connector have their own stacks. A Phase 2 type migration must first determine which downloaded families are actually rendered and avoid changing protected homepage typography.

## Component-family inventory

| Family | Primary definition(s) and use | Duplication and states | Accessibility / hard-coded-value finding | Migration safety | Homepage body |
| --- | --- | --- | --- | --- | --- |
| Header/navigation | `src/components/site/SiteHeader.jsx`, `public-frontend/components/PublicHeader.jsx`, both around `src/components/universal/UniversalHeaderFrame.jsx`; navigation data in `src/content/universalNavigation.js` | Shared frame is a good seam; routing/account adapters remain separate. Desktop/mobile/account/site-index states exist. Duplicate command-menu keys currently warn in tests. | Escape and outside-click handling exist; complete arrow-key/menu focus semantics require manual validation. | Medium. Change adapters/frame together and test cross-frontend document navigation. | Header only is permitted; frame styling can still cascade into body. |
| Homepage content | `src/components/homepage/HomepageV2Content.jsx` and `HomepageCinematic.module.css`, plus prompt, feature, provider, video, Connector, pricing, footer components | Shared by CRA and Next. Contains its own motion and decorative icon choices. | Deliberate visual values should be baselined, not lint-rewritten. | Do not migrate visually. Add compatibility scope first. | Entire family is protected. |
| Button / icon button | `src/components/ui/button*`, `src/components/shadcn/*`, CSS helpers (`nx-text-action`, `nexus-icon-button`), many bespoke route buttons; copied Connector button | Multiple variants, heights, radii, pending/disabled conventions and direct `<button>` implementations | Disabled/pointer and focus patterns vary. Some `outline: none` sites have no proven replacement. Icon labelling is inconsistent. | Medium after usage matrix and wrapper compatibility tests. | Header may adopt; body instances must remain visually compatible. |
| Inputs / textarea / form fields | `src/components/ui/input*`, shadcn label/input/select, `.nexus-input`, auth/settings/composer bespoke fields; Connector copies | Native and Radix select implementations; validation/help/loading vary | Mobile 16px safeguard exists globally. Labels/error association and focus need component-level tests. | Medium; preserve form names, events, browser autofill, keyboard contracts. | Homepage prompt is protected. |
| Dialog / modal / alert dialog | Root Radix wrappers in `ui`/`shadcn`, bespoke drawers/sheets/modals; Connector copies | Several overlay/focus/escape implementations | Focus return and clipping require manual tests; large arbitrary overlays/radii recur. | High risk where a dialog confirms writes, restore, billing or deletion. | Homepage header menu only if invoked there. |
| Dropdown / popover / select / tooltip | Root Radix wrappers plus custom account/model/project menus; Connector copies | Parallel menu state and positioning logic | Keyboard and focus patterns are not uniformly tested; audit found focus suppression. | High for model picker, account menu and project controls. | Header menu only is permitted. |
| Tabs / segmented controls | Root Radix/custom segmented components; Settings sidebar; Workspace modes; Plugin custom tabs | Selected-state, narrow overflow and role conventions vary | Plugin keyboard support is platform/custom; web tab semantics must be audited. | Medium with adapter layer. | No body migration. |
| Card / panel / surface | `ui/card`, `.card-surface`, `.nx-ledger-row`, route-specific panels, Connector card; Plugin Frames | Multiple large-radius/shadow/glow generations | Primarily visual drift; nested regions sometimes lack semantic headings/landmarks. | Low behaviour risk but high protected-homepage regression risk. | Heavily used and protected. |
| Status / badge / alert / toast | `.nx-state-mark`, bespoke status pills, Base UI toast, installed toast component, Workspace activity, Connector health, Plugin `BRIDGE_STATES` | Semantic names and colours differ. Plugin still exposes “Wrong place” and “Target stale”; Connector has separate health vocabulary. | Colour-only distinctions and live-region behaviour need review. Do not make every streamed update assertive. | High semantic impact; build a canonical lifecycle map before migration. | Header auth state only. |
| Spinner / skeleton / loading | Nexus loaders, route Suspense fallback, bespoke spinners/skeletons across pages, Plugin pulses, Connector stages | Same spinner communicates unrelated lifecycle states; initial and background refresh often differ per route | Live-region verbosity and motion preferences vary. | Medium; preserve cancellation and disabled logic. | Body loading appearance is protected. |
| EmptyState / ErrorState | Several local definitions, including Settings and workspace-specific states; no single universal owner | Copy/action/retry policy is inconsistent and some instances are inline | Retry safety is domain-specific; generic consolidation cannot invent write semantics. | First consolidate visual shell, keep domain decisions in callers. | Homepage not a target. |
| Prompt composer | `src/components/ai/chat/ChatComposer*` (large), older/mode-specific controls, Electron adapter/styles | Attachments, modes, send/stop, draft and model controls are tightly coupled to controller state | Keyboard behaviour is tested in places but not one canonical contract. Large file and state surface make rewrite risky. | High; extract compatible primitives incrementally after Workspace state map. | No. |
| Model picker | Workspace/ribbon/model components and backend model data | Availability, entitlement and provider data arrive from multiple paths; tests expose capability-state mismatch | Compact interaction exists, but unavailable/read-only combinations are currently failing tests. | Blocked on authoritative availability model. | No. |
| Conversation/message/tool/plan/change UI | `src/components/ai`, `src/pages/ai`, PlanWorkspace, TaskProgressPanel, MessageList, CodeDrawer and StudioControls | Several large components present overlapping run/tool/progress information | Long content, list keys, announcements, focus, technical-detail disclosure and partial outcomes need focused tests. | High; map lifecycle contracts before visual consolidation. | No. |
| Settings rows/navigation | `src/pages/SettingsPage.jsx` and CSS (large monolith), shared controls | Local row/status/empty implementations; Electron adapts the same page | Per-setting loading/errors exist but consistency varies. | High coupling; extract rows without altering API calls. | No. |
| Pricing/billing plans | `src/components/billing/FinancialPlans`, Billing/Subscribe pages, shared JSON catalogue, backend copy | Homepage and dedicated pricing share view data; backend runtime is separately deployed | Commercial values are tested for copy parity but not live Stripe-object parity. | Blocked for value changes; visual work allowed only on non-homepage surfaces after fixtures. | Homepage pricing body protected. |
| Studio connection | `StudioPairControl`, `StudioControls`, connection hooks/services, Plugin panel, Connector health | Same reality is translated into several state vocabularies | Incorrect optimistic status would be trust-critical. One current StudioControls suite is red. | High; canonical state adapter before visual work. | No. |
| Snapshots/recovery | Workspace/Studio activity components, backend services, Plugin Recovery and confirmation UI | Recovery exists at local Plugin and backend/run layers | Restore consequences, partial outcomes, stale hashes and verification must not be flattened. | High; protocol and snapshot acknowledgement are invariants. | No. |
| Icons | `src/lib/icons.js` wrapper, direct Lucide imports, Hugeicons, Lobe provider icons, custom SVG/CSS and homepage emoji | Multiple packages and sizes/stroke conventions | Icon-only accessible names are not enforced. Emoji exist mainly in protected marketing content. | Consolidate new application UI first; do not alter protected body for uniformity. | Emoji/visuals remain protected. |

## Duplicate primitive boundary

The root and Electron Connector each define button, card, collapsible, dialog, dropdown, input, select, separator, switch, and tooltip primitives. They also use different Lucide versions and token namespaces. This is not safe to solve by importing browser-only root primitives wholesale into Electron: the Connector has drag regions, native window controls, light/dark values, renderer IPC, packaging constraints, and a Firebase module firewall. Phase 2 should define a shared semantic contract first, then either:

1. share renderer-safe primitive source with platform adapters; or
2. keep two implementations that consume one documented token/state specification and common tests.

## Deterministic UI review findings

The `21st review src --json` pass reviewed 729 files and reported 50 errors, 56 warnings, and 377 informational/suggestion findings. The most useful categories were:

| Finding | Count | Interpretation |
| --- | ---: | --- |
| Hard-coded colour | 375 | Includes intentional literals in token files and protected marketing, plus real drift. Must be classified, not blindly replaced. |
| Focus outline suppression | 49 | Release-significant until every site is shown to have an equivalent visible `:focus-visible` treatment. |
| `transition-all` | 28 | May animate layout or unrelated properties; review per component. |
| Fixed-width responsive risk | 16 | Prioritise workspace drawers, menus, tables and narrow settings/billing surfaces. |
| `autoFocus` | 5 | Validate context and focus announcement, especially modal/onboarding flows. |
| Disabled pointer-only behaviour | 5 | Ensure native disabled/ARIA state and keyboard exclusion are correct. |
| Hover scale | 2 | Review motion and layout stability. |
| `overflow: hidden` risk | 2 | Verify focus ring and content clipping. |
| Image alt issue | 1 | Inspect whether the image is meaningful or decorative. |

Error hotspots were `CodeDrawer` (9), `PlanWorkspace` (5), the dropdown primitive (4), `AiComponents` (3), and `ProjectTreeSidebar` (3). Warning hotspots included `MessageList` (7), `StudioPairControl` (6), and `NexusRBXHeader` (5).

The review skill drove this inventory and risk classification. It did not author or change the UI.

## Homepage isolation requirement

The foundation and base styles are globally scoped (`:root`, `body`, `*`, generic controls and common surface classes). The protected homepage directly consumes `--nx-*` tokens and shared components, so a token value change can redesign it without touching a homepage file.

Before Phase 2:

- add an explicit homepage compatibility scope or immutable legacy token mapping;
- make body-only visual comparison separate from header comparison;
- prevent shared primitive migrations from selecting homepage descendants unless a compatibility wrapper preserves the baseline;
- retain current body typography, content, spacing, cards, animation, backgrounds, effects and pricing content;
- test both the CRA development representation and the Next production owner because they share content but not the same header/auth adapter.

## Maintenance conclusions

- The existing token system should be evolved, not replaced, but token names must become more semantic and surface layering less promotional.
- Component consolidation is viable only through adapters and state contracts; several domain-heavy components are too coupled for a one-shot rewrite.
- The focus system is not yet trustworthy because global helpers coexist with many outline suppressions.
- Root and Connector UI can share a visual/state specification without pretending their platform primitives are identical.
- Plugin polish must use actual Studio theme values where feasible rather than a fixed web palette mapped through enum names.
- `.21st/design.json` and the root CRA boilerplate README should be corrected as maintenance work, not used as product truth.
