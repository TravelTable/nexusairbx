# NexusRBX design system — Linear product language

Date: 16 September 2026

Work item: coordinated public-surface redesign. React SPA (`src/`) and Next.js (`public-frontend/`) are **one visual product**. Tokens, primitives, and motion live in `src/design/` and are imported by both runtimes.

This is not a theme swap and not a purple-glass SaaS kit. The language is Linear’s restraint: graphite surfaces, thin low-contrast borders, compact controls, strong type, tight micro spacing with generous section spacing, muted secondary information, understated navigation, and short spatial micro-interactions. Nexus identity is a **5–10% purple accent**.

## Foundation

Canonical source: `src/design/nexus-foundation.css`. Compatibility aliases (`--ds-*`, shadcn HSL, `--ai-*` at `:root`) exist so existing call sites keep working. AI workspace **rebinds** these on `.ai-page` (see Protected surfaces).

### Surfaces

Small tonal steps only. No large purple fields.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `--nx-canvas` | `#08090A` | Page background |
| Depth / workspace | `--nx-depth` | `#0A0A0B` | Tools chrome, recessed wells |
| Primary | `--nx-card` / `--nx-work` / `--nx-surface` | `#101113` | Panels, menus, primary blocks |
| Secondary | `--nx-muted-surface` / `--nx-field` | `#141517` | Inputs, sidebar, inset |
| Raised | `--nx-raised-surface` | `#191A1D` | Hovered rows, elevated chips |
| Hover fill | `--ds-fill-hover` | `rgb(255 255 255 / 6%)` | ~5–7% white |
| Active fill | `--ds-fill-active` | `rgb(255 255 255 / 9%)` | ~8–10% white |
| Selected | `--nx-surface-selected` | purple wash 8–10% | Lists, tabs — not whole pages |
| Overlay | `--nx-surface-overlay` | `#101113` | Dialogs, popovers |

### Text

Not pure white everywhere.

| Role | Token | Value |
| --- | --- | --- |
| Primary | `--nx-text` | `#F5F5F6` |
| Secondary | `--nx-text-secondary` | `#C4C5C7` |
| Muted | `--nx-text-muted` | `#8B8D91` |
| Subtle / disabled | `--nx-text-disabled` | `#626469` |
| Inverse | `--nx-text-inverse` | canvas |
| Link | `--nx-text-link` | secondary (hover: purple strong) |
| Code | `--nx-text-code` | secondary |

Actionable text never uses disabled colour alone.

### Accent (Nexus purple)

| Role | Token | Value |
| --- | --- | --- |
| Default | `--nx-purple` | `#A855F7` |
| Hover | `--nx-purple-strong` | `#C084FC` |
| Pressed | `--nx-purple-muted` | `#9333EA` |
| Soft fill | `--nx-purple-soft` | `rgb(168 85 247 / 10%)` |
| Wash | `--nx-purple-wash` | `rgb(168 85 247 / 6%)` |
| Border | `--nx-purple-border` | `rgb(168 85 247 / 16%)` |
| Focus | `--nx-focus` | `rgb(168 85 247 / 35%)` |

**Allowed:** primary CTA fill, focus ring, selected row wash, one recommended-plan edge, status of “you are here” when it is the product action.

**Forbidden:** large purple surfaces, purple borders on every card, constant glow, purple headings, decorative purple backgrounds, purple nav chrome as default.

`--nx-purple-glow` is `none` on public surfaces.

### Borders

Prefer spacing and surface shift over outlining every section.

| Role | Token | Value |
| --- | --- | --- |
| Subtle | `--nx-rule-quiet` / `--nx-border-subtle` | `rgb(255 255 255 / 5%)` |
| Normal | `--nx-rule` / `--nx-border-normal` | `rgb(255 255 255 / 8%)` |
| Strong | `--nx-rule-strong` | `rgb(255 255 255 / 13%)` |
| Interactive | `--nx-border-interactive` | strong white, not purple |
| Focus | `--nx-border-focus` | purple |
| Error / success | `--nx-border-error` / `--nx-border-success` | semantic |

### Semantic status

Neutral, information, in-progress, success, warning, danger each have foreground / soft fill / border pairings (`--ds-info*`, `--ds-success*`, `--ds-warning*`, `--ds-danger*`).

## Typography

Stack: **Geist Variable** + **Geist Mono** (`--nx-font-sans`, `--nx-font-body`, `--nx-font-display`, `--nx-font-code`). Do not introduce a third family on public surfaces.

| Role | Size | Weight | Tracking / leading |
| --- | --- | --- | --- |
| Metadata | 11–12px | 400–500 | 0 |
| Labels | 12–13px | 550–600 | 0 |
| Controls | 13–14px | 500–550 | 0 |
| Body | 14–15px | 400 | line-height 1.5–1.65 |
| Large body | 16–18px | 400 | 1.55–1.65 |
| Small heading | 20–24px | 600–650 | -0.02em to -0.03em |
| Page heading | 32–48px | 600–650 | -0.03em to -0.04em |
| Marketing display | may exceed 48px | 600 | -0.035em |

Weights **700–900 are banned** on public UI. Headings are never purple.

## Layout

Spacing scale (4px rhythm): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 — `--nx-space-1` … `--nx-space-24`.

| Measure | Token | Value |
| --- | --- | --- |
| Compact content | `--nx-content-compact` | `1080px` |
| Reading | `--nx-content-reading` | `720px` |
| Header | `--nx-header-height` | `48px` (`52px` touch) |
| Control | `--nx-control-height` | `36px` (compact 32 / normal 40 / large 48) |
| Touch | `--nx-touch-target` | `44px` |

Section spacing uses 48–80px desktop, 40–48px tablet, 32–40px mobile. Micro UI (rows, tabs, fields) stays compact.

Breakpoints used across public CSS: 1100 / 900 / 820 / 720 / 640 / 420. Desktop is dense; laptop ~768px tall is a first-class pricing target; tablet/mobile may reflow and scroll.

Grid: 12-column mental model, but most product pages are a single reading column plus an optional 226–260px rail (docs, settings). Repeated records use **rows**, not card grids.

## Geometry

| Element | Radius |
| --- | --- |
| Controls, chips | `6px` `--nx-radius-control` |
| Inputs, buttons | `7–8px` `--nx-radius-field` |
| Panels | `8–10px` `--nx-radius-panel` |
| Cards | `10px` `--nx-radius-card` |
| Overlays | `10–12px` `--nx-radius-overlay` |
| Major frames | max `12–14px` `--nx-radius-feature` |
| Pills | `999px` only for avatars, status dots, toggles, true pills |

Shadows are restrained: inner 1px highlight optional; cards `0 8px 24px rgb(0 0 0 / 18%)`; overlays slightly deeper. No 40–80px haze.

## Components

Shared implementations: `src/components/ui/index.jsx`, `nexus-primitives.css`, `NexusSelect`, header frame, form/auth shells.

| Primitive | Behaviour |
| --- | --- |
| Button | 36–40px desktop; primary = purple fill; secondary = graphite + quiet border; ghost = text; press scale 0.98–0.99; 140–180ms |
| Icon button | same height; accessible name required |
| Field | 36–40px; 8px radius; subtle border; stronger purple focus; error/success borders; 16px text on coarse/mobile (no iOS zoom) |
| Nav / tabs | muted labels; selected = fill 6% + primary text, not a purple pill |
| Menu | 12px overlay radius; 2–4px enter; 160–220ms |
| Row / settings row | separator, not a card; 12–16px vertical padding |
| Panel | surface + 8–10px radius; used for discrete objects only |
| Dialog | 10–12px; 200–260ms; 4–6px max travel |
| Tooltip | compact, 6px radius |
| Status | colour + label; never colour alone |
| Header | 48px, graphite, one-pixel rule, no purple underline |

Focus: `:focus-visible` outline 2px purple, 2–3px offset. Do not simulate focus on pointer.

## Motion

Defined in `src/design/nexus-motion.css`. Public `:root` scale:

| Token | Duration | Use |
| --- | --- | --- |
| `--nx-motion-instant` | 100ms | press, color flick |
| `--nx-motion-color` / `--nx-motion-fast` | 140ms | hover color/border |
| `--nx-motion-control` | 160ms | buttons, tabs |
| `--nx-motion-elevation` | 160ms | hover lift |
| `--nx-motion-menu` / `--nx-motion-state` | 180ms | menus, state text |
| `--nx-motion-dialog` | 220ms | dialogs |
| `--nx-motion-spatial` / `--nx-motion-reveal` | 240–260ms | panels, larger reveals |

Easing: `--nx-ease-state` `cubic-bezier(0.22, 0.72, 0.24, 1)`; `--nx-ease-spatial` `cubic-bezier(0.2, 0.8, 0.2, 1)`.

Spatial travel: 1–2px buttons/cards, 2–4px menus, max ~6px panels. Press scale 0.98–0.99.

`prefers-reduced-motion: reduce` collapses animation/transition duration. Progress meaning stays in text. No 20–50px entrances. No page-specific looping decorations on public marketing chrome.

AI workspace pins the **previous** 150/200/280ms set locally so chat, drawers, and artifacts do not pick up the public scale.

## Purple usage rules

1. One primary CTA per view may be solid purple.
2. Focus rings may be purple.
3. Recommended pricing plan may use a stronger 1px purple-tinted border, a slightly raised surface, and ≤1.01 scale — not a glow slab.
4. Selected nav is graphite fill, not purple wash, except workspace mode tabs (protected).
5. Body copy, headings, and icons default to graphite text.
6. If an accent is used twice in a component, remove one.

## Protected surfaces and scoping

### Homepage hero

`HomepageV2Content` wraps **only** `AiProvidersBand` + `Hero` (connector card, morphing promise, hero prompt, hero animation) in `data-nexus-protected-homepage-body="true"` / `.page`. `HomepageCinematic.module.css` rebinds foundation tokens to the approved hero baseline (`#0a0a0a`, `#b45cff`, 18–24px radii, 1160px measure). **Do not restyle that band via global CSS.**

From `VideoShowcase` (“See what creators build with NexusRBX”) downward, including footer, uses the Linear product tokens via `.product` (outside the freeze).

`HomepagePrompt.module.css` is shared with the hero — leave it unchanged.

### AI workspace (`/ai`, desktop studio)

Agent, UI, and Assets stay on the isolated workspace visual system (`nexus-workspace.css`, `aiTheme.css`, `aiTheme.css` freeze). Shared token changes at `:root` are rebound on `.ai-page`, `.nexus-studio-page`, and `.nexus-studio-root` to the pre-redesign dimensional values.

Do not target `.ai-page` descendants from public CSS. Do not restyle `WorkspaceRibbon` or agent chrome as part of this programme.

`/onboarding` and `/script/:id` stay on workspace-adjacent styling.

### Account, settings, billing, support

These are product software, not marketing.

- Layout: sidebar + reading column. Selected rail = graphite hover fill and a 2px muted tick, never a purple wash or glow bar.
- Overview/status: heading, short description, CTA row, then a definition-list of facts. No purple slab, no floating score card.
- Repeated settings are **rows** with a 1px rule. Panels are only a top border, not elevated cards.
- Kickers, eyebrows, and section icons stay muted graphite.
- One primary purple CTA per view is allowed (e.g. Open workspace).
- Billing uses the same row/separator language; plan selection still follows the compact product-selector rules.
- Support tickets are a list of rows with subject, preview, meta, and status — not cards. Headings are primary text.

## Pricing — no desktop scroll

`/pricing` (Next.js) is a **product selector**, not Linear’s marketing pricing page and not a SaaS landing.

Desktop/laptop (`min-width: 900px` and `min-height: 700px`): the catalog fills `calc(100dvh - var(--nx-header-height))` and **must not** introduce page scroll. Content: heading, one short sentence, monthly/annual toggle, up to three plans in a row, plan name, price, period, Nexus credits, one differentiator, CTA, tiny legal line. Recommended plan: stronger border, slightly raised surface, tiny scale, restrained purple. No FAQ, testimonials, giant comparison, or marketing footer on this route.

Mobile/tablet may scroll. Homepage compact `FinancialPlans` is an inline split selector (one framed pair, credit meters, no feature checklist) and may scroll with the page. It must not use two disconnected marketing cards.

## Architecture

- Semantic tokens first; page CSS consumes tokens, it does not invent palettes.
- Route/surface scopes: `[data-shell]`, `[data-nexus-surface]`, `.product`, `.ai-page`.
- No blind global `button`/`a` restyles beyond existing focus and reduced-motion.
- Dead page-specific hex and 18–24px radii on public CSS are migrated to tokens.

## Anti-patterns

- Excessive purple (headings, orbs)
- Giant radii (18–24px marketing cards)
- Unnecessary cards around list/table data
- Random gradients
- Inconsistent spacing (off the 4px scale)
- Page-specific tokens and leftover `--sub-*` / `--pricing-*` hex
- Decorative borders around every section
- Oversized buttons (52px+ marketing CTAs)

## Acceptance evidence

- Token contract: `scripts/design-guard.mjs`, `src/styles/designContract.test.js`
- Homepage freeze: `src/styles/headerVisualContract.test.js`, `HomepageCinematic.layout.test.js`
- AI isolation: `src/styles/aiTheme.test.js` plus freeze block in `aiTheme.css`
- Visual QA: public routes at 1440 / 1024 / 768 / 390; pricing at ~768px height with no vertical scroll
