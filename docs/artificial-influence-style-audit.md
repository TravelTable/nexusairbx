# Artificial Influence / UniCan visual system audit

Audited: 2026-08-23  
Reference: <https://artificial-influence.vercel.app/>  
Observed product title: **UniCan**  
Target product: **NexusRBX**

## Executive summary

The reference product is a near-black, prompt-first AI workspace. Its character is created less by gradients than by a consistent **soft-depth system**:

- near-black canvas and charcoal surfaces;
- high-radius cards and pill controls;
- 1px translucent white borders;
- three-layer shadows combining a white inset highlight with two black drop shadows;
- a single vivid pink action color;
- mostly neutral system typography, with DM Sans used selectively for large headings;
- short 150–200ms state transitions, plus a few slow ambient effects;
- a global 52px header, centered creation composer, gallery grids, and a fixed circular agent button.

The strongest idea for NexusRBX is the **flow**, not a literal brand transplant: lead with creation, keep model/options inside the composer, provide history and examples nearby, and use richer depth only on high-value actions. NexusRBX should retain its current Atkinson/Sofia typography and lavender identity instead of adopting the reference site's pink and generic system-sans voice.

## Audit method and confidence

The live site was inspected in the internal browser at 1280×720 and 390×844. Rendered DOM structure, computed styles, declared CSS variables, font faces, animation keyframes, responsive geometry, and representative routes were sampled.

Routes inspected:

- `/dashboard`
- `/chat` (redirected to `/onboarding` in the current account state)
- `/image`
- `/video`
- `/assets`
- `/templates`
- `/ai-influencer`
- `/studio`
- `/pricing`

A terms-confirmation overlay was present during parts of the inspection. It was not accepted or bypassed. The underlying rendered interface and styles remained measurable. Measurements below are therefore high confidence for the design system and representative flows, but this is not a claim that every authenticated state or every route was exhaustively exercised.

## 1. Experience and information flow

### Global shell

The desktop shell uses a fixed 52px top bar. It contains:

1. brand mark;
2. dense primary navigation: Agent, Image, Video, Audio, Library, Guides, Autopost, Studio, Canvas, Free Tools, Pricing;
3. search with a visible `Ctrl K` shortcut;
4. credits/plans access;
5. account control.

The header is visually quiet: no obvious solid panel, minimal borders, compact 14px labels, and strong use of pills for utility actions. The content scrolls beneath it.

At 390px the navigation collapses to:

- logo;
- a **Tools** pill;
- search icon button;
- credits/account controls.

The mobile header remains 52px high and avoids horizontal overflow.

### Dashboard flow

The dashboard follows a strong creation-first sequence:

1. centered headline: “What are we making today?” / rotating equivalent;
2. three-mode segmented control: Agent, Image, Video;
3. large prompt composer;
4. recent or reusable Characters;
5. searchable Tools grid;
6. Canvases/workflows;
7. extensive footer/site map.

This is the reference site's best transferable decision. The user is not asked to choose a complex tool before expressing intent. Tool selection is present, but subordinate to the prompt.

### Image creation flow

The image route combines:

- `HISTORY` and `EXAMPLES` as local navigation;
- large square example cards;
- action labels such as Edit example and Recreate example;
- an anchored prompt composer;
- model, aspect ratio, output count, resolution, enhancement, cost, attachment, and submit controls embedded inside the composer.

Measured example cards were about 617×617px at the inspected desktop width, with 22px corners. The composer was about 896×135px.

### Library flow

The library uses a title-first workspace with:

- Upload as the main action;
- History, Assets, Characters, Brands, and Collections tabs;
- a search field;
- content area beneath.

This separation is useful for NexusRBX: generated artifacts, imported Roblox assets, characters/presets, and project collections should be distinct filters within one Library rather than separate destinations.

### Templates flow

Templates uses:

- a large uppercase title;
- “Popular right now” followed by “All templates”;
- search;
- category chips for All, Photo, Video, and Slideshows;
- media-first 3:4 cards, measured around 240×320px;
- low-emphasis report/overflow controls.

For NexusRBX, the analogous categories should be **Game systems, UI, Scripts, Worlds, NPCs, Assets, and Full starters**.

### Pricing flow

Pricing uses a centered uppercase 36/40px heading, a 4-option segmented control, and three equal cards.

Measured desktop plan card:

- width: 320px;
- height: 474px;
- minimum-height class: 460px;
- padding: 24px;
- radius: 22px;
- translucent card surface;
- medium three-layer shadow;
- hover: translate upward 2px and increase to large shadow;
- nested value panel: 270×111px, 12px padding, 18px radius.

On small screens, the cards become horizontally scrollable snap items. That is visually effective, though NexusRBX should also provide obvious pagination/position feedback so the additional plans are discoverable.

### Agent and persistent assistance

A fixed circular **Ask Agent** control sits in the bottom-right corner:

- 50–56px desktop diameter;
- 32px in the observed mobile state;
- pink fill;
- large depth shadow;
- icon-only visual with an accessible name.

For NexusRBX, this should not duplicate the main AI composer. A better role is “resume agent”, “open task activity”, or “explain this panel.”

## 2. Colour system

The site defines colours in CSS Lab/OKLab. Hex values below are practical sRGB approximations.

| Role | Declared value | Approx. hex | Usage |
|---|---:|---:|---|
| Canvas | `lab(2.75381% 0 0)` | `#0A0A0A` | Page background |
| Card / popover | `lab(7.78201% 0 0)` | `#171717` | Cards, menus |
| Muted surface | `lab(15.204% 0 0)` | `#262626` | Inputs, selected tabs, wells |
| Primary text | `lab(98.26% 0 0)` | `#FAFAFA` | Headings and body |
| Muted text | `lab(66.128% 0 0)` | `#A1A1A1` | Secondary labels |
| Ring | `lab(48.496% 0 0)` | `#737373` | Neutral focus/ring |
| Accent / primary | `lab(56.0434% 78.9689 -13.1201)` | `#F529A0` | CTAs, active states, agent button |
| Beta badge | `lab(90.0327% -24.1882 116.32)` | `#DBEE00` | Beta status |
| Chart tint 1 | `lab(77.6207% 35.3774 -9.68133)` | `#F8A7D3` | Data/decoration |
| Chart tint 2 | `lab(66.2571% 57.6667 -11.149)` | `#F872B7` | Data/decoration |
| Default border | `lab(100% 0 0 / 0.10)` | `rgba(255,255,255,.10)` | General separators |

Additional surface recipes use white at 4.5–7% for borders and neutral fills at 40–95% alpha. The result is a restrained ladder rather than many unrelated greys.

### Contrast character

- The canvas-to-card jump is deliberately subtle.
- Component boundaries depend on border plus shadow, not fill alone.
- Pink is rare enough to preserve its meaning as “do the thing.”
- Muted text is readable on the canvas, but 9–10px badge text is too small for normal informational content.

## 3. Typography

### Families

| Role | Family | Notes |
|---|---|---|
| Default UI | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", ...` | Used on almost the entire product |
| Large page/section headings | `"DM Sans", ui-sans-serif, sans-serif` | Observed on pricing and dashboard section headings |
| Brand/display token | `"Orbitron", "Orbitron Fallback"` | Declared at weights 600 and 700; used selectively |
| Code | system monospace stack | Rare |

Orbitron uses `font-display: swap`. The fallback includes ascent, descent, and size adjustments to limit layout shift.

### Measured type scale

| Role | Size / line-height | Weight | Tracking |
|---|---:|---:|---:|
| Hero | 48 / 48px | 700–800 | about `-1.2px` |
| Pricing H1 | 36 / 40px | 700 | tight |
| Section / card H2 | 24 / 32px | 600 | tight/default |
| Subheading | 18–20 / 28px | 500–600 | default |
| Body | 16 / 24px | 400 | default |
| Control / metadata | 14 / 20px | 500–700 | default |
| Small label | 12 / 16px | 500–700 | up to `0.6px` |
| Micro badge | 9–10px | 700–800 | up to `2.1px` |

Uppercase is used for major workspace headings and compact status labels. Body copy stays sentence case.

### NexusRBX recommendation

Do **not** copy the font stack. NexusRBX already has a more ownable combination:

- Sofia Sans Condensed for editorial/display moments;
- Atkinson Hyperlegible Next for UI/body;
- Atkinson Hyperlegible Mono for code.

Adopt the reference site's hierarchy—48/36/24/16/14—not its exact families. Use uppercase sparingly for workspace phases and route labels.

## 4. Spacing and geometry

The reference site is based on a 4px spacing unit: `--spacing: .25rem`.

### Practical spacing scale

| Token | Value | Typical use |
|---|---:|---|
| 0.5 | 2px | hairline alignment, tiny card lift |
| 1 | 4px | segmented control gap |
| 1.5 | 6px | icon/text gap, compact controls |
| 2 | 8px | inner control spacing |
| 2.5 | 10px | compact custom gap |
| 3 | 12px | common gap and compact padding |
| 4 | 16px | page gutter and card horizontal padding |
| 5 | 20px | medium grouping |
| 6 | 24px | card padding / section gap |
| 8 | 32px | major control grouping |
| 10 | 40px | section rhythm |
| 12 | 48px | large vertical section padding |
| 16 | 64px | page section separation |

Most common measured values were 6px and 12px gaps, `12px 16px` card padding, and 16/24/32/40/48/64px section spacing.

### Radius scale

| Value | Typical use |
|---:|---|
| 10–12px | compact square controls and small buttons |
| 18px | nested wells inside cards |
| 22px | prompt fields, gallery cards, pricing cards |
| 24px | tool tiles and modals |
| 28px | hero composer outer shell |
| 30px | large container variant |
| 9999px | pills, tabs, round icon buttons |

The site does not reserve large radii only for large objects. Tool tiles measured 168×68px still use 24px corners. That is a defining part of its soft, consumer-AI tone.

### Containers and measured geometry

- header: 52px high;
- dashboard composer: max-width 896px;
- composer outer radius: 28px;
- composer inner prompt area: about 875×116px;
- mode selector: 328×40px, 3px padding, 4px gap;
- mode tabs: minimum width 104px, height 32px;
- desktop textarea: about 865×60px;
- dashboard tool tile: 168×68px, 12×16px padding, 12px gap;
- template card: 240×320px;
- pricing card: 320×474px;
- mobile page gutter: generally 16px, with the hero composer visually inset about 35px at 390px;
- site max-width tokens include 48rem, 72rem, 36rem, 28rem, and 20rem.

## 5. Surface and card system

### Shadow scale

The component depth is unusually systematic.

```css
--shadow-s:
  inset 0 1px 2px rgba(255,255,255,.30),
  0 1px 2px rgba(0,0,0,.30),
  0 2px 4px rgba(0,0,0,.15);

--shadow-m:
  inset 0 1px 2px rgba(255,255,255,.50),
  0 2px 4px rgba(0,0,0,.30),
  0 4px 8px rgba(0,0,0,.15);

--shadow-l:
  inset 0 1px 2px rgba(255,255,255,.70),
  0 4px 6px rgba(0,0,0,.30),
  0 6px 10px rgba(0,0,0,.15);
```

This is closer to restrained claymorphism/soft UI than classic glassmorphism. Blur is used, but the white inset rim is the stronger visual signature.

### Card families

#### Tool tile

- transparent or near-transparent fill;
- 24px radius;
- 168×68px in the measured desktop grid;
- 12px icon/title gap;
- 12×16px padding;
- shadow appears/intensifies on hover;
- 200ms shadow transition;
- 2px focus ring.

#### Media/template card

- dark neutral surface (`#171717` to zinc-900 equivalent);
- 22px radius;
- image dominates the card;
- metadata and controls overlay or sit near the edge;
- hover actions reveal progressively;
- little or no resting shadow.

#### Pricing card

- translucent raised surface;
- 22px radius;
- 24px padding;
- medium resting shadow;
- 2px upward hover lift;
- large hover shadow;
- 200ms all-property transition.

#### Composer

- 28px outer halo wrapper;
- 2.5px animated border area;
- 22px inner input group;
- up to 96px ambient glow radii;
- model/options form an internal bottom toolbar;
- focus is communicated by glow/ring without changing layout.

#### Modal

- desktop width: up to 448px;
- width formula: `min(96vw, 28rem)`;
- 24px radius;
- 1px light ring;
- black 80% scrim;
- backdrop blur around 4px;
- 100ms fade and 95%→100% zoom;
- desktop footer splits actions left/right;
- mobile footer stacks full-width actions, primary first.

## 6. Button and control system

### Primary button

- pink background;
- very large/pill radius;
- 14/20px, weight 500–600;
- large three-layer depth shadow;
- hover increases or maintains elevation;
- active uses 95% scale, 1px downward movement, or reduced brightness depending on variant;
- disabled state reduces emphasis and prevents interaction.

### Secondary / outline pill

- charcoal fill around 40% opacity;
- border around 7% white;
- small shadow;
- height 36px;
- `6px 12px` padding;
- often 14px / 600.

### Ghost navigation button

- transparent background;
- no resting shadow;
- 32px height;
- 8px horizontal padding;
- 14px bold label;
- hover changes text to primary pink rather than adding a fill.

### Segmented control

- muted translucent track;
- 1px low-alpha white border;
- full pill radius;
- 3px inset padding and 4px gap;
- active segment gains fill, inset highlight, border, and small depth shadow;
- inactive segments remain transparent.

### Icon buttons

- 32, 36, 50, or 56px square;
- round or 12px radius;
- accessible names are present on the inspected controls;
- desktop control sizes are occasionally below the ideal 44px touch target, acceptable for pointer use but should be enlarged on touch layouts.

### Inputs

- transparent input over a muted recessed parent;
- textarea body at 14/19.25px on desktop and 16px on mobile;
- attachment and model controls live inside the input shell;
- focus ring is 3px and does not shift layout;
- placeholder carries too much instructional responsibility in some flows.

## 7. Effects and motion

### Timings

| Interaction | Duration | Easing |
|---|---:|---|
| Colour/background/border state | 150ms | `cubic-bezier(.4,0,.2,1)` |
| Shadow/elevation | 200ms | standard or ease |
| Spatial transform | 300ms | `cubic-bezier(0,0,.2,1)` |
| Composer glow/state | 500ms | standard |
| Modal enter/exit | 100ms | ease |
| Pulse | 2s infinite | `cubic-bezier(.4,0,.6,1)` |
| Shine | 12s infinite | linear |

### Observed motion vocabulary

- hover lift: 1–4px, most commonly 2px;
- hover scale: 1.01–1.06 for cards/media, up to 1.10 for isolated icons;
- active scale: 0.95;
- pressed vertical shift: 1px;
- modal: fade plus zoom from 95%;
- slow shine moves background position across the hero composer;
- pulse changes opacity to 0.5;
- spotlight enters from an offset position with scale 0.5→1;
- loading/utility keyframes include spin, ping, shimmer, cursor blink, equalizer pulse, and dashed-line motion;
- toast entry uses scale 0.8→1 plus opacity.

The CSS includes `prefers-reduced-motion` fallbacks. NexusRBX should retain that discipline and avoid copying the 12-second decorative shine into multiple components.

## 8. Responsive behaviour

### Desktop

- fixed 52px global bar;
- dense text navigation;
- centered hero composition;
- 896px prompt max width;
- multi-column tool and gallery grids;
- pricing plans side by side;
- fixed bottom-right agent action.

### Mobile at 390×844

- no horizontal overflow was observed;
- header remains 52px;
- primary navigation becomes a Tools control plus icon buttons;
- three mode tabs remain visible, each about 104×32px;
- composer becomes a single compact card;
- modal is about 320px wide;
- modal actions stack and become about 272×36px;
- lower dashboard content continues as a long vertical page;
- desktop 14px prompt type switches to 16px to avoid mobile focus zoom.

### Responsive risks

- a 32px floating action is undersized for touch;
- the top bar still contains several utility controls and may feel cramped below 390px;
- horizontal pricing snap needs a visible affordance;
- very large corner radii consume meaningful interior area on narrow cards;
- a long dashboard plus very large footer creates excessive travel on mobile.

## 9. Accessibility and UX findings

### Strengths

- semantic headings, tabs, buttons, comboboxes, and textareas were present;
- icon-only buttons generally had accessible names;
- focus-visible rings are defined at 2–3px;
- the layout avoids mobile horizontal overflow;
- mobile prompt text reaches 16px;
- reduced-motion styles exist;
- the modal uses a strong scrim and responsive action layout.

### Weaknesses / opportunities

- some 32–36px controls miss the preferred 44×44px touch target;
- 9–10px micro labels are too small outside decorative badges;
- placeholder-only instruction should be supplemented with a visible field label or persistent helper text;
- the navigation is dense and mixes content modes, studios, tools, and commercial links at one level;
- the persistent Ask Agent button can compete with page-specific primary actions;
- the terms modal lacks an obvious close/dismiss path other than signing out or accepting;
- decorative infinite animation should be limited to the active composer or loading state;
- extensive footer link lists duplicate navigation and add mobile length.

## 10. What NexusRBX should adopt

### High-value adoption

1. **Prompt-first home/workspace.** Let users describe the Roblox experience first, then choose Agent, Script, UI, World, or Asset mode.
2. **Composer-contained options.** Place model, project, Studio connection, scope, attachment, generation mode, and cost/status inside one bounded prompt surface.
3. **History + Examples near creation.** Reuse the image route's pattern for Script history, generated assets, game systems, and starter templates.
4. **One Library.** Filter Assets, Scripts, Models, UI, Characters, Worlds, and Collections inside a single artifact library.
5. **A small elevation scale.** Use only three shadows and three or four radii; do not invent depth per component.
6. **Short, consistent motion.** 150ms state, 200ms elevation, 240–300ms spatial movement.
7. **Responsive mode switcher.** Keep 3–5 top-level creation modes visible and collapse the rest into Tools.
8. **Media-first template cards.** Use game thumbnails/video previews, with tags and actions subordinate.

### Adopt selectively

- Use 18–24px radii on creation cards, templates, pricing, modals, and empty states.
- Keep editor panes, Monaco, property inspectors, logs, and tables at NexusRBX's existing 3–5px radii. Precision tools benefit from tighter geometry.
- Use depth for actionable or floating surfaces; keep dense data surfaces flat.
- Use a restrained glow only on the active composer, active Studio connection, or live agent run.
- Use the existing lavender accent rather than hot pink.

### Do not copy

- the generic system-sans brand voice;
- pink as the product accent;
- 24px radius on every small control;
- 32px mobile touch targets;
- an always-present AI button when the page already has a primary AI action;
- all-property transitions on large grids;
- a 12-second shine on more than one focal object;
- the overloaded one-level desktop navigation.

## 11. Recommended NexusRBX mapping

| Reference role | NexusRBX mapping |
|---|---|
| `#0A0A0A` canvas | keep `--nx-depth: #131012` for tools and `--nx-canvas: #1A1618` for site chrome |
| `#171717` card | `--nx-work: #211B1F` |
| `#262626` muted | `--nx-field: #2C232A` |
| `#FAFAFA` text | `--nx-text: #E8DED4` |
| `#A1A1A1` muted text | `--nx-text-muted: #958985` |
| `#F529A0` primary | `--nx-purple: #D6B8D7` |
| pink hover | `--nx-purple-strong: #E0BFE0` |
| pink pressed | `--nx-purple-muted: #B982B6` |
| neutral focus | `--nx-focus: #E0BFE0` |
| white 10% border | existing `--nx-rule-quiet: #3A3036` or `rgb(232 222 212 / 10%)` |

Recommended soft-depth extension:

```css
--nx-radius-soft-sm: 12px;
--nx-radius-soft-md: 18px;
--nx-radius-soft-lg: 22px;
--nx-radius-soft-xl: 28px;
--nx-control-h-sm: 36px;
--nx-control-h-touch: 44px;
--nx-soft-shadow-s: inset 0 1px 2px rgb(255 255 255 / 12%), 0 1px 2px rgb(0 0 0 / 30%), 0 2px 4px rgb(0 0 0 / 15%);
--nx-soft-shadow-m: inset 0 1px 2px rgb(255 255 255 / 18%), 0 2px 4px rgb(0 0 0 / 30%), 0 4px 8px rgb(0 0 0 / 15%);
--nx-soft-shadow-l: inset 0 1px 2px rgb(255 255 255 / 24%), 0 4px 6px rgb(0 0 0 / 30%), 0 6px 10px rgb(0 0 0 / 15%);
```

The white inset strength is intentionally lower than the reference site. This preserves NexusRBX's darker, technical character.

## 12. Proposed NexusRBX component application

### Home / AI route

- Center a 760–896px creation composer.
- Modes: Agent, Script, UI, World, Asset.
- Keep the first three visible; put secondary generators in Tools on narrow screens.
- Add project and Studio connection selectors in the composer footer.
- Follow with Recent projects, Templates, Tools, and Active agent runs.

### Agent workspace

- Keep the current structural panes and Monaco surfaces flat.
- Apply soft depth to the prompt composer, approval cards, active run card, floating menus, and modal surfaces only.
- Use a subtle lavender ring for the currently executing agent.
- Do not animate the editor layout itself.

### Asset library

- Use 3:4 or square media cards with 18–22px corners.
- Resting state: no shadow; hover/focus: small shadow and 2px lift.
- Put asset type and source in compact labels; keep title at 14–16px.
- Reserve a 44px action target even if the visible icon is 16–20px.

### Pricing

- Adopt equal card heights, nested value wells, and the segmented billing selector.
- Keep NexusRBX's existing typography and semantic plan colours.
- Highlight one recommended plan through border and surface—not scale—so comparison remains stable.

### Modals and command menu

- Use 22–24px radius only for modals/command search in the soft-depth scope.
- Use 80% scrim and 4–8px backdrop blur with a reduced-transparency fallback.
- Enter at 160ms, exit at 100ms.
- Always provide Escape, close control, and focus restoration.

## 13. Existing NexusRBX implementation constraints

NexusRBX currently has an explicit **Dark Build Ledger** contract:

- 3px field radius and 5px overlay radius;
- no panel shadows;
- no backdrop blur;
- muted lavender, not decorative pink;
- a 5/9/15/23/37/59/95px spacing sequence;
- tests that lock the palette and ban decorative pink utilities/literals;
- tests that explicitly require flat header, modal, workspace, and conversion controls.

That means a broad visual adoption is not a CSS-only tweak. It is a product design decision requiring updates to:

- `src/design/nexus-foundation.css`;
- `src/design/nexus-primitives.css`;
- `src/styles/aiTheme.css`;
- design-contract tests;
- header visual contract tests;
- modal and tooltip contracts.

The safest route is a **scoped soft-depth layer** for creation-centric surfaces, leaving the core ledger/editor contract intact. The accompanying CSS files are deliberately placed in `docs/` as implementation references and are not imported into the shipped application.

## 14. Suggested rollout

### Phase 1 — no brand rewrite

- Add the prompt-first dashboard composition.
- Reorganize Tools, Templates, and Library flows.
- Keep the existing palette, fonts, small radii, and flat surfaces.

### Phase 2 — scoped depth pilot

- Introduce the soft-depth tokens behind `.nx-soft-depth`.
- Apply only to composer, template cards, pricing cards, command menu, and agent activity surface.
- Test with keyboard, reduced motion, reduced transparency, and 375/768/1024/1440px layouts.

### Phase 3 — evaluate

- Compare task start rate, prompt completion, tool discovery, time to first successful Studio change, and return-to-history usage.
- Expand the style only if it improves comprehension and perceived quality without reducing workspace density.

## 15. Deliverable code references

- `docs/artificial-influence-reference-tokens.css` contains the measured reference tokens and the recommended NexusRBX mapping.
- `docs/nexusrbx-soft-depth-recipes.css` contains original, scoped component recipes for a composer, buttons, cards, segmented controls, modal, and responsive/reduced-motion behaviour.

These files reproduce the design principles and measurements, not the site's source code.
