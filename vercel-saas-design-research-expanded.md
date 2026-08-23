# Visual Design Research: 173 Early-Stage SaaS Products on Vercel

> A design-only field guide to the public visual systems, page composition, typography, colour, spacing, component geometry, interaction states and responsive behaviour of the 173 products in the accompanying Vercel SaaS directory. Source review conducted 21–22 August 2026; expanded 23 August 2026.

## Scope and accuracy

This version deliberately removes most long-form product analysis and treats each website as a design reference. Every entry retains a one-sentence interface context, then documents the visible design character and turns it into a practical reconstruction specification.

The qualitative observations come from the original public-page review. Hex colours, spacing values, font pairings, grid widths, radii and shadow values are **rebuild approximations** chosen to reproduce the observed direction consistently; they are not represented as an extraction of each site’s private source tokens. Exact font files, computed CSS and breakpoint values should be verified from a fresh browser inspection before a pixel-identical recreation.

## How to use this file

Use **Visual character** to understand why the interface feels the way it does. Use **Reconstructed palette**, **Typography**, and **Spacing, grid and proportion** as a buildable starter system. Use **Design decision** to separate the distinctive elements worth retaining from the first issues to fix. The repeated structure is intentional so websites can be compared directly.

## Portfolio-level design map

- **Theme direction:** 114 light, 57 dark and 2 explicit dual-theme reconstructions.
- **Density:** 91 compact/product-dense, 66 balanced and 16 spacious/editorial systems.
- **Most common primary accent families:** blue (89), green (27), purple (10), teal (9), orange (8), indigo (6), gold (5), cyan (5).
- **Shared spacing logic:** nearly every successful system can be rebuilt on a 4px base, with 8/12/16/24/32px doing most component work and 64/96/128px controlling section rhythm.
- **Shared type logic:** one neutral sans-serif should carry body and UI; a serif, geometric display face or monospace should be introduced only when it communicates an actual editorial, technical or domain distinction.
- **Shared hierarchy rule:** one filled primary action, one quieter secondary action, and clearly non-interactive badges. Repeating the same pill treatment for navigation, filters, statuses and conversion controls destroys hierarchy.

## Contents

1. [AI infrastructure, developer tools and agent software](#ai-infrastructure-developer-tools-and-agent-software)
2. [Data, BI and analytical workspaces](#data-bi-and-analytical-workspaces)
3. [Work, writing and personal productivity](#work-writing-and-personal-productivity)
4. [Marketing, creator, commerce and customer-facing tools](#marketing-creator-commerce-and-customer-facing-tools)
5. [Founder, finance, accounting and procurement](#founder-finance-accounting-and-procurement)
6. [Legal, compliance and insurance](#legal-compliance-and-insurance)
7. [Property, construction, logistics and field operations](#property-construction-logistics-and-field-operations)
8. [Health, fitness and appointment businesses](#health-fitness-and-appointment-businesses)
9. [Education and student tools](#education-and-student-tools)
10. [Restaurants, hospitality, events and travel](#restaurants-hospitality-events-and-travel)

---

## AI infrastructure, developer tools and agent software

### 1. [Fake API for Devs](https://fakeapifordevs.vercel.app/)
*Category: Developer infrastructure / mock APIs · Access: Open; no signup · Reviewed 22 Aug 2026*

**Interface context:** Fake API for Devs is a working mock-data service for frontend developers, prototypers and educators who need credible API responses before a backend exists.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make realistic API experimentation feel immediate, safe and implementation-ready.

**Observed direction:** Light neutral surfaces, restrained accents, crisp borders and developer-oriented monospace blocks.

The landing page uses a bright, documentation-led layout with a conventional top navigation and a hero that leads directly to “Try APIs.” Below it, domain cards and an accordion make the large catalogue browsable without turning the page into an endpoint dump. The strongest evidence of product maturity is the embedded playground: endpoints occupy a left rail; parameters, body and advanced controls form the central work area; and code/response tabs keep output inspectable. Compact controls for delay, error state, page size and seed are well grouped, while copy buttons and language tabs support an actual developer loop. The hierarchy remains clear despite high density. The main weakness is the amount of marketing, catalogue and tooling content on one long page; stronger separation between browsing and executing would reduce scanning cost on small screens.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Product promise → domain catalogue → sandbox → setup guide → supporting links.

#### Surfaces, components and interaction

- **Geometry:** 6–10px cards; 4–8px controls.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Endpoint rail, parameter forms, seed/error controls, code tabs, response viewer and copy actions.
- **Required states:** Selected endpoints, editable bodies, delayed/error responses, loading feedback and copied-code confirmation.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve readable code scrolling and label every compact control; collapse the endpoint rail predictably. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** The embedded, configurable playground and concrete route counts.
- **Change first:** Separate catalogue discovery from execution and make mobile code/output comparison less vertical.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 2. [AI Command Center](https://aicommandcenter.vercel.app/)
*Category: LLM operations / gateway · Access: Open demo; self-hostable · Reviewed 22 Aug 2026*

**Interface context:** AI Command Center presents a self-hosted gateway and operations console for teams running multiple language-model providers.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Frame LLM operations as a serious command layer rather than another analytics add-on.

**Observed direction:** Near-black canvas, teal signal color, editorial display type and compact monospaced metadata.

The site has a distinctive near-black editorial identity. A thin header, small uppercase navigation and teal diamond mark give way to an oversized serif headline; italic teal emphasis separates it from generic infrastructure landing pages. Faint radar-like line art supplies depth without competing with the copy. The product proof arrives as a dark dashboard containing time-range and currency controls, KPI tiles for spend, requests, tokens and p50 latency, followed by charts and operational cards. Dense numerical content uses compact sans/monospace treatments while the marketing layer is intentionally spacious. This contrast makes the product feel both premium and technical. The main usability risk is pacing: the enormous hero postpones the instrumentation that proves the claim, and some muted gray text sits close to low-contrast territory. Bringing one live cost/routing signal above the fold would strengthen the conversion story.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#5EEAD4` |
| Secondary accent | `#14B8A6` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(3.5rem, 7vw, 7rem) / 0.94–1.02`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Strategic promise → operating dashboard → gateway capabilities → installation → roadmap.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#5EEAD4` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** KPI tiles, cost charts, range selectors, trace rows, provider cards and code snippets.
- **Required states:** Time/currency filtering, alert severity, route status, selected prompt version and copied setup code.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Increase muted-text contrast and let dense charts/tables scroll without shrinking labels. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The memorable editorial/operations contrast and credible demo instrumentation.
- **Change first:** Surface product proof earlier and clarify which dashboard controls are interactive in the demo.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 3. [EvalPulse](https://model-evals-framework.vercel.app/)
*Category: Model evaluation / benchmarking · Access: Open demo; open source · Reviewed 22 Aug 2026*

**Interface context:** EvalPulse is an open-source evaluation workspace for teams choosing models against their own production prompts.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Turn model selection into an evidence-based comparison on a team’s real work.

**Observed direction:** Light analytical canvas, blue accents, neutral cards and restrained chart colors.

EvalPulse follows a clean analytics-product pattern. The landing page balances a concise hero and two calls to action with an immediately visible product preview, then moves through step cards, capability blocks and implementation code. In the demo, category buttons sit above a compact suite summary; two scatter/relationship charts lead into a dense, eight-column leaderboard. Blue accents link navigation, filter selection and chart emphasis, while light cards and thin rules keep the numerical page legible. The hierarchy works well: overview metrics answer “what ran,” charts answer “where are the trade-offs,” and the table supports precise comparison. Seeded-data labeling is a strong trust cue. Weaknesses are familiar to compact BI surfaces: table columns become difficult on narrow screens, and colored points need redundant shape or labels so comparisons do not depend on color alone.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Value proposition → workflow → public demo → implementation guidance → open-source path.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Suite summary, category chips, comparison plots, model leaderboard, code blocks and disclaimers.
- **Required states:** Active category, benchmark progress, empty suite, failed case and selected model detail.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide table scrolling/sticky labels and non-color encodings for plotted model series. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The seeded-data disclosure and overview-to-detail analytical progression.
- **Change first:** Explain metrics inline and add a focused comparison drawer for two or three models.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 4. [Open Application Protocol](https://opa-dev.vercel.app/)
*Category: Agent/application protocol · Access: Open playground · Reviewed 22 Aug 2026*

**Interface context:** Open Application Protocol is an experimental specification for making application capabilities discoverable and invocable by AI systems at runtime.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make an emerging machine-readable integration protocol understandable and testable.

**Observed direction:** Airy light canvas, fine borders, cool accents and syntax-highlighted technical artifacts.

The main page is a polished technical explainer with a quiet light background, compact top navigation and a large centered proposition followed by two clear calls to action. Three numbered steps create an understandable discovery-to-invocation narrative. A syntax-highlighted manifest block provides the most persuasive artifact, with tool cards and principles grids adding breadth below. The playground intentionally strips the interface back: a simple header, title, paste/fetch tabs and a primary Validate action keep attention on the document. This separation between education and execution is effective. The visual system relies on white space, fine borders, small badges and restrained blue/purple accents, giving it standards-document credibility. It would benefit from richer error-state examples and a visible sample manifest in the playground; an empty validator can feel less approachable than the excellent landing-page explanation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#7C3AED` |
| Accent family detected | blue, purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(3.5rem, 7vw, 7rem) / 0.94–1.02`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Protocol premise → three-step model → manifest example → principles → playground.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Manifest code block, tool cards, principle tiles, paste/fetch tabs and validation output.
- **Required states:** Empty input, fetching, valid manifest, field-level error and copied example.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep code horizontally scrollable, preserve heading order and expose validation errors programmatically.

#### Design decision

- **Preserve:** The strong split between conceptual education and a minimal validator.
- **Change first:** Preload an editable example and show a structured, actionable validation-error view.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 5. [Agent Weaver](https://gemini-hack-ruddy.vercel.app/)
*Category: Multi-agent developer workspace · Access: Open demo · Reviewed 22 Aug 2026*

**Interface context:** Agent Weaver is a hackathon-stage software-engineering environment that coordinates five specialised AI agents around one codebase.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make coordinated agents feel like a tangible engineering team with shared institutional memory.

**Observed direction:** Dark navy surfaces, cool blue/violet gradient, bright white type and outlined cards.

The landing page uses a dark navy canvas and a focused, centered hero. A small hackathon pill introduces the context before the headline “5 AI Agents. One Shared Brain,” whose blue-to-violet gradient supplies the main visual signature. Three adjacent calls to action—See Demo, Open Dashboard and Get Started—map cleanly to evaluation, inspection and adoption. A sparse header keeps only the product mark and GitHub link visible. Feature cards begin immediately below the fold, using outlined dark surfaces and colored icon wells to maintain the technical tone. The page is clear and energetic, though the equal visual weight of three hero actions slightly diffuses the preferred route. It could also prove the coordination model earlier with one compact run timeline or shared-memory artifact instead of relying primarily on claims above the fold.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#A78BFA` |
| Accent family detected | blue, violet |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Hackathon context → core promise → three entry routes → capabilities → local setup.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Agent cards, shared-memory views, run/dashboard links, setup commands and integration chips.
- **Required states:** Agent active/idle, annotation pending/verified, memory updated, Git conflict and run failure.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack hero actions with one clear primary and avoid gradient-only emphasis on key text. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The succinct “five agents/one brain” framing and direct demo access.
- **Change first:** Show an authentic collaboration trace above the fold and reduce CTA competition.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 6. [TraceAgent](https://traceagent.vercel.app/)
*Category: Agent observability / tracing · Access: Open; open source · Reviewed 22 Aug 2026*

**Interface context:** TraceAgent is a self-hosted observability layer for AI agents.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make deep agent tracing approachable while retaining open-source documentation credibility.

**Observed direction:** White/dotted canvas, navy text, warm gold accents and a distinctive investigator mascot.

TraceAgent adopts a documentation-first identity rather than a conventional dark observability aesthetic. A white header contains a charming investigator-cat mark, Docs/SDK/Examples/Blog navigation, GitHub and theme controls, plus a keyboard-hinted search field. A persistent top banner states that the project is in active development. The hero uses a pale dotted background, a large navy headline and a substantial illustrated detective cat, creating warmth and memorability around a technical problem. Gold accent pills echo the mascot without overwhelming the interface. The observed landing surface explains the product clearly, although the illustration occupies more first-screen space than an actual trace. Showing a compact event timeline alongside the mascot would bridge personality and proof. Search, theme and docs conventions should translate well responsively, provided the hero art becomes secondary rather than forcing excessive vertical scroll.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#B58A16` |
| Secondary accent | `#E7C75A` |
| Accent family detected | gold |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Development status → promise → capabilities → integration code → SDK/docs paths.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#B58A16` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Trace timeline, event rows, artifact detail, search, code snippets and package cards.
- **Required states:** Live recording, paused run, failed event, expanded payload and empty trace.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce decorative hero art on small screens and retain keyboard-search cues with proper labels. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The candid status banner and memorable documentation-oriented visual voice.
- **Change first:** Put a legible real trace beside the hero claim to accelerate technical evaluation.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 7. [Sentinel](https://sentinel-cal-hacks-2026.vercel.app/)
*Category: AI-agent security scanner · Access: Open demo; hackathon build · Reviewed 22 Aug 2026*

**Interface context:** Sentinel is a repository-scanning prototype focused on risks created by agentic software.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Explain agent-specific repository risk as connected, remediable attack paths.

**Observed direction:** Observed dark blue/purple gradient grid; recommended high-contrast severity and neutral report surfaces.

The live URL resolved during review, but the screenshot service captured only its dark blue-to-purple grid/gradient background; substantive foreground content did not render in that pass. Accordingly, the reliable visual observation is limited to a security-oriented dark atmosphere with a faint technical grid, not the scanner’s control layout. That background can support bright risk badges and graph edges well, but it also risks making a data-heavy report feel decorative if contrast and spacing are not tightly managed. For a repository security workflow, the most useful structure would be repository context and scan status first, followed by severity totals, attack-path diagrams and fixable findings; this is a recommendation, not a claim about the inaccessible surface. The development-stage page should also distinguish demonstrated detections from planned checks and avoid implying production-grade coverage.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#09070E` |
| Primary surface | `#14101D` |
| Raised / alternate surface | `#1D1629` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#332540` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#C084FC` |
| Accent family detected | blue, purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Repository input → scan progress → severity overview → attack paths → fixes.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #332540; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Repo picker, scan status, severity badges, path graph, finding drawer and patch guidance.
- **Required states:** Unscanned, cloning/scanning, partial failure, finding selected and remediation verified.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Never encode severity only by color; provide a linear alternative to path diagrams. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The focused agent-security scope and explicit hackathon-stage framing.
- **Change first:** Ensure the public demo renders deterministically and expose a representative read-only report.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 8. [Certo](https://certo-amd-hackathon.vercel.app/)
*Category: AI-agent trust audit · Access: Demo; login optional · Reviewed 22 Aug 2026*

**Interface context:** Certo audits an AI agent for security, reliability and optimisation issues, then turns the results into an explainable Trust Score, remediation plan and shareable certificate.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Convert complex agent assurance into an inspectable score and shareable trust artifact.

**Observed direction:** Bright white canvas, pale grid, blue/cyan gradient accents and soft report-card borders.

Certo uses a polished light SaaS layout with a shield mark, centered navigation and a dark “Try demo” button. The hero places a small trust/security/optimisation pill above a very large headline; blue-to-cyan gradient type highlights “you can trust” without compromising the surrounding black text. Two actions separate active evaluation from passive inspection, and the “sample audit—no login” wording is excellent reassurance. A faint gridded background and cool glow add technical texture, while an audit-report card enters at the fold with a visible Gold status, connecting the claim to an artifact. The design feels credible and restrained. The largest opportunity is to foreground how a score is calculated and how uncertainty is represented; certificate styling can otherwise make a prototype metric seem more authoritative than its evidence.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#0891B2` |
| Accent family detected | blue, cyan, gold |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Promise → demo/sample audit → scoring method → improvement loop → standards → pricing.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Trust-score card, finding list, remediation steps, standard mappings and certificate preview.
- **Required states:** Audit queued/running, checks passed/failed, score recalculated and certificate issued.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair status colors with words/icons and keep score methodology reachable from every report. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The no-login sample route and early visibility of the audit artifact.
- **Change first:** Show scoring confidence and evidence provenance before promoting certificate sharing.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 9. [AgentReady](https://agentready-mu.vercel.app/)
*Category: AI crawlability audit · Access: Open; no signup · Reviewed 22 Aug 2026*

**Interface context:** AgentReady audits a public website from the perspective of AI crawlers such as ChatGPT, Claude and Perplexity.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make AI crawlability feel like an inspectable technical audit, not speculative marketing.

**Observed direction:** Black terminal canvas, green signal color, monospaced metadata and sharp borders.

The interface is deliberately terminal-like: black background, bright green accent, monospaced labels and square-edged bordered panels. A sparse header lists What We Check, Pricing, Guides and Support before a prominent Free Scan action. The left side of the hero carries the oversized “Your next visitor isn’t human” statement, supporting copy and a full-width URL input; the right side summarises the audit surface, crawler registry and output chain inside three stacked cells. This split converts an abstract SEO concern into specific counts and deliverables. Green is used consistently for the headline emphasis and primary action. The aesthetic is memorable, though small gray monospace copy is hard to read and the dense two-column hero will require careful stacking. The scanner should retain labels, not only green, for pass states.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#4ADE80` |
| Secondary accent | `#16A34A` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Threat framing + URL scan → audit scope → crawler registry → outputs → pricing/guides.

#### Surfaces, components and interaction

- **Geometry:** 6–10px cards; 4–8px controls.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#4ADE80` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** URL field, scan CTA, audit summary cells, crawler table, finding rows and generated-file previews.
- **Required states:** Validating URL, crawling, scored findings, blocked page and file ready to copy.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Increase muted-copy contrast, stack audit cells logically and announce scan progress. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The precise counts, revision disclosure and instantly usable no-signup input.
- **Change first:** Soften terminal density for nontechnical buyers and clarify paid-report differences earlier.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 10. [OpenHive](https://openhivemind.vercel.app/)
*Category: Shared memory for coding agents · Access: Open; no signup · Reviewed 22 Aug 2026*

**Interface context:** OpenHive is a shared, searchable memory of coding-agent solutions.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Present collective agent memory as a simple search utility anyone can connect in minutes.

**Observed direction:** Warm white canvas, amber accent, black primary actions and lightly bordered chips.

OpenHive uses an unusually calm light aesthetic for agent infrastructure. A small orange outlined hexagon and wordmark sit in a simple header with Search, About, GitHub and a dark Get Started button. The centered hero states “Your agents already solved this,” then places the solution count inside a pale amber highlight. A large bordered search field is the dominant interaction, reinforced by example chips for deadlocks, merge conflicts, Webpack memory, JWT expiry and Redis invalidation. The next section, “Connect your agent,” appears immediately after a divider and promises a snippet-based setup. Generous white space and modest typography make the utility approachable. The main weakness is trust: before searching, users see little about answer provenance, freshness or validation. Search results should make those qualities conspicuous.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#D97706` |
| Secondary accent | `#EA580C` |
| Accent family detected | amber, orange |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.25rem, 4vw, 4rem) / 1.02–1.10`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Search promise → example queries → agent connection → contribution/about.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#D97706` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Search field, query chips, solution cards, integration snippets and provenance metadata.
- **Required states:** Search suggestions, loading, no result, solution expanded and snippet copied.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep the search target large, chips wrappable and result provenance readable by screen readers. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The immediate search-first experience and concrete problem examples.
- **Change first:** Expose source, validation, age and compatibility signals on every solution result.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 11. [LogLens](https://v0-build-log-lens-platform.vercel.app/)
*Category: Developer observability / browser-log analysis · Access: Open dashboard · Reviewed 22 Aug 2026*

**Interface context:** LogLens turns noisy browser console output into an investigative workspace for frontend developers and support engineers.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Compress chaotic client logs into a legible path from signal to diagnosis.

**Observed direction:** Near-black surfaces, grey gradient display type, fine panel borders and selective status colour.

The landing page is almost entirely black, using a very large grey-gradient headline and two high-contrast calls to action as the focal point. A restrained top navigation and an embedded dark product frame at the fold keep the page oriented toward the application rather than illustration. The visual language suits observability: dense rows, status accents and code-like content feel native to debugging work, while the spacious hero prevents the brand from initially feeling intimidating. In the product preview, hierarchy depends heavily on contrast between panels and subdued text; that looks polished on a large screen but risks losing timestamps and secondary metadata. The page would benefit from one annotated example that connects a detected pattern to the developer action it enabled. No login wall interrupted the reviewed path.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Product claim → open dashboard → analysis capabilities → local/MCP workflow.

#### Surfaces, components and interaction

- **Geometry:** 6–10px cards; 4–8px controls.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Log stream, pattern groups, anomaly markers, correlation view, filters and detail drawer.
- **Required states:** Ingesting, empty stream, anomaly found, group expanded, filtered and analysis failed.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve code wrapping, keyboard filter access and sufficient contrast for secondary log metadata. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The serious debugging aesthetic and immediate view of the real interface.
- **Change first:** Add an annotated before/after investigation and make low-emphasis text easier to scan.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 12. [AgentFlare](https://agent-flare.vercel.app/)
*Category: Agent cost observability · Access: Partial; managed signup · Reviewed 22 Aug 2026*

**Interface context:** AgentFlare is a monitoring and budget-control layer for LangChain and LangGraph agents.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make runaway agent spend visible and stoppable before it becomes an incident.

**Observed direction:** Dark warm surfaces, orange alert accent, compact navigation and high-contrast primary action.

The live capture exposed a near-black to brown page shell with an orange mark, compact navigation and a bright primary action. Much of the central hero foreground did not render during review, so detailed claims about the intended typography or dashboard composition would be unreliable. What is observable is a warm, incident-oriented palette that distinguishes the product from the blue-purple norm of AI tooling, plus a concise header that keeps signup prominent. That restraint fits a monitoring product, but the degraded public state weakens trust: a buyer evaluating cost controls needs immediate evidence such as a spend chart, run table, budget rule and paused status. The page should also show how Slack alerts and framework instrumentation fit together before asking for access. These recommendations are based on the visible shell and stated workflow, not an inspected authenticated screen.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#FB923C` |
| Secondary accent | `#60A5FA` |
| Accent family detected | orange, blue, purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Cost-control promise → framework setup → dashboard evidence → alerts → signup.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#FB923C` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Spend trend, run table, budget rule, pause control, agent status and Slack alert preview.
- **Required states:** Healthy, nearing limit, limit exceeded, paused, resumed and integration disconnected.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Never encode budget severity by colour alone; expose exact values and labelled controls. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive incident-response palette and narrow operational promise.
- **Change first:** Fix the missing hero content and publish a readable, annotated dashboard preview before signup.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 13. [MCPWatch](https://mcpwatch.vercel.app/)
*Category: MCP server monitoring · Access: Documentation open; dashboard login · Reviewed 22 Aug 2026*

**Interface context:** MCPWatch monitors Model Context Protocol servers for uptime, latency, error rate, token use and cost.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Give MCP operators a dependable health and cost cockpit.

**Observed direction:** White background, green health accent, bold centred headline and light dividers.

The landing page uses a clean white canvas, a green accent and a familiar SaaS header. Its oversized centred headline, long explanatory paragraph and single dominant action make the value proposition easy to find, but the above-the-fold composition is very sparse. No product dashboard is visible in the initial viewport, so an observability buyer must take charts, alerting and cost attribution on trust or navigate into documentation. The green health colour is appropriate, although a monitoring system also needs a disciplined amber/red severity scale and non-colour cues. The straightforward navigation lowers cognitive load and the documentation-first access is useful for technical evaluation. A compact live status module—uptime, p95 latency, latest incident and monthly tokens—would turn the page from a generic promise into product proof without exposing customer data.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#D97706` |
| Accent family detected | green, amber, red |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Monitoring promise → metrics covered → documentation/setup → dashboard login.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Endpoint list, uptime chart, latency distribution, error log, cost summary and alert rules.
- **Required states:** Online, degraded, offline, checking, alert acknowledged and endpoint misconfigured.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair every severity colour with text/icon labels and keep charts keyboard-explainable. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The focused protocol language and open technical documentation.
- **Change first:** Put a safe live-status example and alert configuration preview above the login boundary.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 14. [HAM](https://ham-pro.vercel.app/)
*Category: AI coding-agent analytics · Access: Partial · Reviewed 22 Aug 2026*

**Interface context:** HAM is an observability product for organisations using AI coding agents.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Turn coding-agent consumption into accountable engineering operations data.

**Observed direction:** White surfaces, black typography, green actions and monospace analytical labels.

HAM uses a bright white, minimal split hero. A large left-aligned statement—“Observability for AI coding agents”—sits beside a compact engineer-activity card that resembles the intended dashboard. Green is used for the primary action and positive status, while monospace labels give model, repository and session metadata a technical cadence. The right-side preview is the strongest part of the page: table-like rows and small summary figures explain attribution faster than abstract AI imagery would. The composition is calm and credible, though the dense miniature data may be difficult to read at the captured scale. A product like this should make privacy boundaries explicit near the preview: managers need to know whether it records prompts, code or only usage metadata. On mobile, the preview should follow the promise rather than squeeze into a two-column layout.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Leadership problem → activity preview → attribution dimensions → optimisation → access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Engineer table, repository filter, session drawer, model breakdown, cost trend and context warning.
- **Required states:** Connected, syncing, over budget, anomalous session, filtered and insufficient data.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reflow tables into labelled cards and provide textual summaries for every trend. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The real-looking activity card and restrained enterprise tone.
- **Change first:** Clarify captured data/privacy and enlarge the most important dashboard evidence.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 15. [Tavrix Insights](https://tavrix-insights.vercel.app/)
*Category: Workflow and agent analytics · Access: Partial · Reviewed 22 Aug 2026*

**Interface context:** Tavrix Insights analyses automated workflows and agent runs across duration, errors, tokens, cost and volume.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Help automation operators locate the step responsible for time, errors or spend.

**Observed direction:** White canvas, blue accent, simple sans-serif hierarchy and minimal decoration.

The reviewed page is extremely sparse: a white canvas, blue wordmark and navigation, a small centred icon, short title and subtitle, and one blue call to action. A subsequent “Why” section relies on plain text bullets. This makes the proposition readable and fast, but it does little to demonstrate a product whose value should be inherently visual. There is no above-the-fold funnel, run table, step timeline or cost chart to explain how Tavrix differs from generic logs. The understated layout could work as documentation, yet the dated spacing and low information density make the SaaS feel less mature than its metric model. A compact workflow trace with one slow step highlighted would establish both hierarchy and utility. Motion is not required; meaningful data states would create stronger credibility than decorative animation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Core promise → reasons to monitor → supported metrics → access/integration.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Workflow list, step timeline, duration chart, token/cost totals, error drawer and alert rule.
- **Required states:** Running, completed, failed, slow-step flagged, filtered and no history.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use labelled severity states, readable chart summaries and touch-friendly timeline expansion. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The direct language and uncluttered entry point.
- **Change first:** Replace generic bullet proof with a specific workflow trace and one actionable diagnosis.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 16. [Lakon](https://lakonai.vercel.app/)
*Category: LLM context and prompt optimisation · Access: Open; no account · Reviewed 22 Aug 2026*

**Interface context:** Lakon is a browser-based utility for reducing the token overhead of long AI sessions.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make context reduction measurable, reversible and safe to reuse.

**Observed direction:** A neutral editing canvas with strong before/after contrast and restrained optimisation colour.

The live route resolved, but the reviewed capture rendered as an empty white viewport, so there is no reliable visual evidence from which to assess the application’s layout, controls or typography. This may be a client-rendering fault rather than the intended design, but it is still the first-run experience an evaluator can encounter. For this product, the most useful interface would make the transformation inspectable: original and compressed text side by side, token counts before and after, preserved facts highlighted and a clear copy action. Confidence indicators or a “what was removed” diff would address the central trust problem. Privacy should be stated next to the input, not buried below it. These are design recommendations inferred from the documented workflow, not claims about UI that was not visible.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Explain compression → input context → inspect result → export snapshot → methodology/privacy.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Source editor, compressed output, token comparison, preservation diff, copy and reset actions.
- **Required states:** Empty, analysing, compressed, low-confidence, copied and processing error.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep both versions reachable sequentially on mobile and announce token changes in text.

#### Design decision

- **Preserve:** The no-account, single-purpose utility and emphasis on recurring-session cost.
- **Change first:** Resolve the blank public render and expose fidelity, privacy and model-support evidence.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 17. [Atlas AI](https://atlas-ai-bot.vercel.app/)
*Category: Browser automation and personal AI assistant · Access: Open browser tools; bot has a free tier · Reviewed 22 Aug 2026*

**Interface context:** Atlas AI combines a library of more than 30 browser utilities with a Telegram-based assistant.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Unite instant browser utilities with a persistent assistant without blurring permissions.

**Observed direction:** Dark atmospheric canvas, teal highlights, restrained glow and crisp functional surfaces.

The reviewed capture showed a near-black canvas with blurred teal and brown light fields plus a small moon control; the main foreground content did not render reliably. The atmospheric gradient implies a premium, nocturnal AI brand, but it does not provide enough observable evidence to judge navigation, tool discovery or the Telegram setup flow. That degraded state is especially costly for a broad toolbox: users need visible categories, a search surface and a clear distinction between tools that run locally and actions delegated to the bot. A representative tool card and a phone-shaped assistant preview would explain the two modes quickly. The page should also foreground permission and retention boundaries for memory, logging and browser automation. These recommendations follow the stated capabilities; they are not descriptions of an unseen authenticated interface.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#5EEAD4` |
| Secondary accent | `#14B8A6` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Choose browser tools or Telegram assistant → discover capability → configure → review history.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#5EEAD4` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Tool search, category cards, bot setup, reminder composer, memory controls and activity log.
- **Required states:** Tool ready, running, permission requested, bot connected, reminder scheduled and failure.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce glow behind text, provide visible focus states and label every automation permission. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The distinctive dark ambience and low-friction open tools.
- **Change first:** Fix foreground rendering and clearly explain how the toolbox and persistent bot relate.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 18. [Promptdrop](https://prompt-drop.vercel.app/)
*Category: Content-to-Markdown conversion · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** Promptdrop converts PDFs, web pages and YouTube material into cleaned Markdown for use in prompts, notes or retrieval pipelines.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn messy source material into prompt-ready Markdown with visible savings.

**Observed direction:** Black canvas, red grid, magenta gradient emphasis and neutral editor panels.

The page uses a black background overlaid with a red grid, a strong wordmark and a pink-to-red gradient headline. Two calls to action sit beneath the promise, followed by three compact metrics that give the hero measurable weight. Navigation is simple and the high-contrast palette makes the converter feel fast and technical. The grid and saturated glow are memorable, but they compete with long-form reading; the extraction workspace should move to calmer neutral panels once users begin inspecting Markdown. The ideal product surface is a two-stage form with obvious source tabs, progress feedback and a split preview of source metadata and cleaned output. Token savings are a natural success metric and deserve a prominent, plainly labelled comparison rather than decorative counters alone.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#09070E` |
| Primary surface | `#14101D` |
| Raised / alternate surface | `#1D1629` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#332540` |
| Primary accent | `#E879F9` |
| Secondary accent | `#F87171` |
| Accent family detected | magenta, red, pink |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Conversion promise → source selection → extraction → clean preview → copy/export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #332540; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#E879F9` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Source tabs, URL/file input, progress steps, Markdown editor, token count and copy button.
- **Required states:** Waiting for source, extracting, cleaning, partial result, unsupported source and copied.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce animated/glowing background intensity and keep output controls sticky on mobile. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The memorable technical identity and precise three-source proposition.
- **Change first:** Pair the dramatic hero with a calmer, evidence-rich conversion preview and privacy note.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 19. [Hearth](https://get-hearth.vercel.app/)
*Category: Local-first AI runtime and assistant · Access: Preview; open source · Reviewed 22 Aug 2026*

**Interface context:** Hearth is a Windows-first, local AI environment designed to keep inference, files and workflows on a user’s own device.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Make a private local AI stack feel coherent, capable and welcoming to install.

**Observed direction:** Deep black-purple field, violet highlights, glass-like panels and bright neutral type.

Hearth has one of the most resolved visual systems in this set. A black and deep-purple canvas carries a compact version announcement, conventional navigation and an install action. The split hero places a large, confident promise and local-first badge on the left, while a detailed desktop application frame on the right supplies immediate product proof. Small feature chips explain CLI, phone, MCP and headless modes without forcing a long paragraph. Subtle violet glow adds depth but does not overwhelm the interface screenshot. The hierarchy works because the brand surface is spacious and the software surface is dense. Potential weaknesses are legibility at smaller widths and platform expectations: “Windows-first” and hardware requirements should be adjacent to the install CTA. Reduced-motion behaviour should be available if the background or app frame animates.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#09070E` |
| Primary surface | `#14101D` |
| Raised / alternate surface | `#1D1629` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#332540` |
| Primary accent | `#C084FC` |
| Secondary accent | `#A78BFA` |
| Accent family detected | purple, violet |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Preview status → local-first promise → application proof → operating modes → install/docs.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #332540; translucent fill near rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Use `#C084FC` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Version banner, install CTA, desktop frame, feature chips, requirements and documentation links.
- **Required states:** Compatible, downloading, installed, model loading, offline-ready and unsupported hardware.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack the product frame below the promise, respect reduced motion and publish text requirements. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The excellent balance between atmospheric brand and concrete software evidence.
- **Change first:** Place Windows/hardware compatibility and preview limitations directly beside installation.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 20. [AI Guardian](https://ai-guardian-mauve.vercel.app/)
*Category: LLM request security · Access: Beta waitlist; demo material open · Reviewed 22 Aug 2026*

**Interface context:** AI Guardian is a security proxy for applications that call language models.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Present prompt-injection protection as a simple, inspectable layer in the request path.

**Observed direction:** White navigation, saturated blue grid hero, pale-blue emphasis and clean security panels.

The page has a crisp white header above a royal-blue hero patterned with a fine grid. A very large white and pale-blue headline creates immediate category recognition, with two contrasting CTAs beneath it. A horizontal feature strip introduces trust attributes, and the top of a product card enters the fold, helping the page feel like software rather than a security manifesto. The system is visually confident and consistent with infrastructure security, though the oversized hero could make benchmark and integration detail feel secondary. A security buyer needs to see a request trace showing input, detected pattern, applied rule and resulting action. Severity should use text and icons in addition to colour. Waitlist language should also distinguish what works today from what belongs to the planned cloud dashboard.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Threat → base-URL integration → detection evidence → policy controls → beta access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Request trace, risk badge, matched rule, allow/block action, policy editor and incident log.
- **Required states:** Scanning, allowed, warned, blocked, false-positive reviewed and service unavailable.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair severity colours with labels, keep traces horizontally navigable and support reduced motion. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The confident security identity and unusually concrete integration hook.
- **Change first:** Put benchmark methodology and a full inspected request trace ahead of the waitlist pitch.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 21. [Nevros](https://nevros-ai.vercel.app/)
*Category: Adaptive AI operating system · Access: Private beta / waitlist · Reviewed 22 Aug 2026*

**Interface context:** Nevros presents an adaptive AI workspace that combines browser automation, connected services, persistent memory and reusable workflows.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Make a persistent multi-tool agent feel like a new operating layer, not another chat box.

**Observed direction:** Near-black field, white type, translucent panels and restrained futuristic glow.

Nevros uses a near-black, futuristic interface with techno-styled uppercase labels and a compact pill-shaped navigation. The hero is split: an intentionally staggered, oversized headline occupies the left, while a transparent session/workflow mockup on the right shows the product as a system of connected steps. A white waitlist pill provides the clearest action. The composition is distinctive and appropriately ambitious, but the experimental typography and dark translucency reduce scan speed. The product mockup offers useful evidence, although several controls are too small to explain at hero scale. A labelled three-step automation—trigger, agent action and required approval—would communicate the operating model more clearly. Keyboard focus, high-contrast text and reduced-motion support will matter if the glowing layers or workflow connectors animate.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0B1017` |
| Primary surface | `#111923` |
| Raised / alternate surface | `#192431` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A394A` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(3.5rem, 7vw, 7rem) / 0.94–1.02`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Operating-system thesis → example workflow → memory/connectors → trust → beta waitlist.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #2A394A; translucent fill near rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Goal composer, workflow graph, session timeline, connector states, approvals and memory manager.
- **Required states:** Planning, running, waiting for approval, connected, disconnected, remembered and failed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Simplify staggered type on narrow screens and keep every workflow state text-labelled. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The distinctive system-level identity and visible workflow proof.
- **Change first:** Translate broad claims into one legible end-to-end task with explicit human control.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 22. [Vortex Runtime](https://vortex-nxtjs.vercel.app/vortex-runtime)
*Category: Agent runtime for commerce operations · Access: Private validation / beta · Reviewed 22 Aug 2026*

**Interface context:** Vortex Runtime is a self-hosted environment for commerce agents that take operational actions such as updating or coordinating business systems.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Convey powerful commerce automation with visible staging, approval and reversibility.

**Observed direction:** White canvas, purple system accent, crisp borders and technical terminal surfaces.

The page uses a clean white background with purple branding, a compact navigation and small status badges. Its split hero keeps a large commerce-OS statement on the left and places a purple terminal-like runtime mockup on the right. “In private validation” is visible rather than hidden, and an n8n import callout grounds the pitch in an existing workflow ecosystem. The terminal preview makes the runtime feel technical, but a terminal alone cannot show the human approval experience that differentiates Vortex. A staged-action card with change summary, affected system, risk, approve and rollback controls would be stronger product proof. The restrained palette and generous spacing support trust; denser operational screens should retain that clarity while surfacing audit metadata. The current page is polished for its stage, though still more architectural than task-oriented.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#C084FC` |
| Accent family detected | purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Commerce problem → governed runtime → import path → self-hosting → private validation.

#### Surfaces, components and interaction

- **Geometry:** 6–10px cards; 4–8px controls.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#7C3AED` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Action queue, change preview, approval card, audit log, rollback control and connector list.
- **Required states:** Proposed, awaiting approval, executing, completed, failed and rolled back.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Present state labels beyond colour and keep destructive/approval actions well separated. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The honest stage disclosure and concrete n8n migration hook.
- **Change first:** Show the human approval and rollback interface, not only runtime output.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 23. [Cognivern](https://cognivern.vercel.app/)
*Category: Governance for financial AI agents · Access: Open demo; no signup · Reviewed 22 Aug 2026*

**Interface context:** Cognivern governs agents that can spend, swap, stake or transfer assets.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make financial-agent authority bounded, reviewable and provable.

**Observed direction:** Pale grid, black typography, blue governance accent and clean request cards.

The landing page sits on a very light blue-white grid with a huge centred black-and-blue headline, two CTAs and a small live-governance status pill. At the fold, an “incoming agent request” card shows the product’s crucial moment: a proposed action entering an approval system. This is excellent narrative sequencing because the brand promise and operational evidence reinforce each other. The cool palette feels technical and trustworthy without defaulting to dark “crypto” styling. The main opportunity is to enrich the request card with policy result, amount, destination, rationale and irreversible-risk cues; those details are the product. High-stakes approval actions should be separated spatially and require accessible confirmation. The demo access is a meaningful strength, though production-readiness claims should stay distinct from the public sandbox.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Risk statement → governed action example → policies/audit → demo API → adoption.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Incoming request, policy result, approval control, transaction detail, audit timeline and API key state.
- **Required states:** Submitted, policy passed, policy denied, awaiting human, approved and executed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use explicit risk language, confirmation steps and non-colour policy outcomes. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The immediately visible agent-request card and accessible public demo.
- **Change first:** Surface richer decision context and clearly separate sandbox evidence from production guarantees.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 24. [n8n Workflow Assistant](https://n8n-workflow-chatbot.vercel.app/)
*Category: Workflow-template discovery assistant · Access: Open; no signup · Reviewed 22 Aug 2026*

**Interface context:** n8n Workflow Assistant provides semantic search across more than 1,900 n8n automation templates.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Help users move from an automation goal to a viable n8n template in one search.

**Observed direction:** Pale cool canvas, blue-purple gradient emphasis, white metric cards and friendly type.

The page uses a very light blue-white background and a blue-to-purple gradient hero. A centred CTA and explicit “no signup” note sit beneath the product statement, followed by three stat cards that quantify the template corpus. The header’s prominent “Hire Me” label competes with the product identity and makes the experience feel like a personal showcase. Otherwise, hierarchy is direct and friendly. The key product surface should be the search result: title, matched intent, connected apps, complexity, setup time and a link to the source template. Search suggestions and a visible example query would reduce blank-page hesitation. The colourful hero is approachable, but result cards should use quieter surfaces so users can compare technical metadata efficiently.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#7C3AED` |
| Accent family detected | blue, purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Search promise → corpus proof → query → ranked templates → source/setup.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Intent field, example chips, result cards, app badges, match rationale and template link.
- **Required states:** Empty query, searching, results ranked, no match, result expanded and source unavailable.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep search prominent, make badges text-readable and announce ranked result counts.

#### Design decision

- **Preserve:** The open no-signup path and quantified template coverage.
- **Change first:** Separate the consultancy header from the product brand and show a fully annotated result.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 25. [Thawr Studio](https://aiappbuilder.vercel.app/)
*Category: No-code AI application builder · Access: Examples open; account required to build · Reviewed 22 Aug 2026*

**Interface context:** Thawr Studio lets creators describe an AI application, configure a multimodal chain of tasks, publish it and charge users per run.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Turn a described AI workflow into a testable, publishable and sellable application.

**Observed direction:** Neutral builder canvas, clear node/task accents and a separate customer-preview surface.

The live URL resolved, but the reviewed viewport was blank white, so there is no defensible visual assessment of the intended landing page or builder. That public rendering failure is material for a product whose value rests on visual authoring. The builder should make the chain model concrete through a central canvas or ordered task stack, a configuration inspector and a live preview. Multimodal inputs need obvious type labels, and per-run pricing should be previewed alongside estimated model cost to prevent accidental loss. Open example apps are an important acquisition surface; each should disclose the task chain and expected output before signup. These are recommendations derived from the described workflow, not observations of UI that was unavailable during review.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Example gallery → create → configure chain → test → price → publish/monitor.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Prompt brief, task stack, model/input settings, live preview, cost estimator and publish panel.
- **Required states:** Draft, validating chain, generating, failed step, ready to publish and live.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Offer a linear mobile task view and label every connector, model and required input.

#### Design decision

- **Preserve:** The end-to-end build-to-monetise ambition and browseable examples.
- **Change first:** Fix the blank render and demonstrate the real authoring canvas before requiring an account.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 26. [Platoona](https://platoona-next.vercel.app/)
*Category: Natural-language business automation · Access: Early access; signup · Reviewed 22 Aug 2026*

**Interface context:** Platoona turns natural-language prompts into automations across Slack, Gmail, Notion, HubSpot, Google Sheets, GitHub and hundreds of other services.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make cross-service automation feel describable while retaining explicit operational control.

**Observed direction:** Bright neutral canvas, multicolour connector identity, rounded controls and calm system surfaces.

The visible shell uses a white background, a colourful mark reminiscent of connected workplace tools, centred navigation and clear Login/Get Started actions. The main hero foreground rendered extremely faintly in the reviewed capture, preventing reliable assessment of its intended headline, examples or product screenshot. The clean header suggests an approachable productivity brand, but the degraded central state leaves the automation model unexplained. A strong public page should place one concrete prompt beside the generated trigger/action sequence, then show a confirmation step before connected accounts are touched. Connector logos can establish breadth, but permissions and run history should carry equal visual weight. The following recommendations are based on the stated workflow and visible header, not on an authenticated builder.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Example prompt → generated workflow → connectors/permissions → run evidence → early access.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Prompt composer, trigger/action stack, connector picker, approval summary, run log and retry control.
- **Required states:** Drafting, generating, connection required, awaiting confirmation, running and failed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide a linear workflow reading order and label connector permissions in plain language.

#### Design decision

- **Preserve:** The friendly workplace identity and prominent access actions.
- **Change first:** Repair low-visibility hero content and show one complete, inspectable automation before signup.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 27. [Demovio](https://demovio.vercel.app/)
*Category: AI interactive-demo generation · Access: Prelaunch; interactive demo open · Reviewed 22 Aug 2026*

**Interface context:** Demovio converts a screenshot, Figma frame or wireframe into clickable HTML for sales demos, product validation and lead capture.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Show that a static design can become a convincing, shareable demo in minutes.

**Observed direction:** White canvas, purple accents, bold centred type and framed browser previews.

The light page uses purple accents, a launch countdown strip and a scarcity-labelled pre-order pill above a very large centred headline. Pre-order and “try live demo” actions are paired, and a browser frame begins at the fold, giving the page real product evidence. The purple system is coherent and the demo CTA is the right evaluation path. However, countdown and scarcity cues dominate more than a developer-stage product can comfortably substantiate; they may reduce trust for professional buyers. The generated prototype should be the visual hero, with source image and interactive result shown side by side. If the browser frame animates, controls and reduced-motion alternatives should be available. The page is polished, but its sales urgency currently outruns its technical proof.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#C084FC` |
| Accent family detected | purple |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Input formats → generated demo proof → edit/embed/lead capture → prelaunch offer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#7C3AED` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Upload/import, generation progress, clickable preview, hotspot editor, embed settings and lead form.
- **Required states:** Source uploaded, generating, preview ready, hotspot editing, published and generation failed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Ensure generated hotspots are keyboard reachable and respect reduced-motion preferences.

#### Design decision

- **Preserve:** The open live-demo route and above-the-fold product frame.
- **Change first:** Reduce scarcity pressure and replace it with fidelity, editing and responsive-output evidence.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 28. [AI Draft to Image](https://ai-draft-to-image.vercel.app/)
*Category: HTML-to-image design utility · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** AI Draft to Image turns generated HTML into a visual canvas that can be refined and exported as a high-resolution PNG.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Convert AI-generated markup into a polished image without screenshot workarounds.

**Observed direction:** Airy cool neutrals, blue-violet emphasis, large transformation-led headline and canvas chrome.

The public page uses a very pale blue-white field and a large centred statement: “From Clunky AI HTML to 4K Masterpiece.” Black type transitions into blue-violet emphasis, while supporting copy sits beneath it. The capture contains an unusually large amount of empty space above the hero and no visible navigation, which makes the layout feel unfinished or vertically misaligned. The headline communicates the transformation clearly, but a split visual of messy source and polished export would do more work than the superlative language. The actual editor should privilege the canvas, with compact controls for viewport, scale, background and export rather than recreating a general-purpose design app. A visible dimension/file-size summary would make “4K” actionable.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#7C3AED` |
| Accent family detected | blue, violet |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Before/after promise → import HTML → refine canvas → preview dimensions → export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** HTML input, render viewport, canvas controls, asset warnings, dimension picker and PNG export.
- **Required states:** Empty, rendering, external asset blocked, editing, export ready and export failed.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep controls labelled, preserve logical tab order and offer numeric adjustments alongside drag. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** The clear HTML-to-4K transformation and frictionless open access.
- **Change first:** Correct the excessive top whitespace and show a genuine before/after canvas above the fold.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 29. [ToolKit](https://toolcit.vercel.app/)
*Category: Browser-based utility suite · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** ToolKit collects browser-based utilities for local development, creator tasks, file conversion and text processing in one searchable catalogue.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make a broad set of small utilities fast to find, safe to trust and consistent to use.

**Observed direction:** Dark navy canvas, subtle star texture, compact header and neutral functional panels.

The reviewed shell has a dark navy star-field background and a substantial application header with logo, Home, Categories, Favorites, a badged “What’s New,” FAQ, search, settings and theme controls. The main catalogue foreground did not render in the capture, so individual tool cards and task screens could not be assessed reliably. The visible navigation is more complete than many early utility sites, though the number of header destinations is high before a user has selected a task. Search should be the dominant first action, followed by category tiles and recently used tools. Each tool needs a consistent privacy label—local, network request or uploaded—beside its launch action. The decorative star field gives the suite personality, but it should recede behind dense utility forms.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Search/recent → categories → tool page → result/export → favourites/history.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Global search, category cards, favourite control, privacy badge, tool form and output panel.
- **Required states:** Suggested search, tool loading, processing, result ready, favourited and unsupported file.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse secondary navigation, retain labelled search and avoid texture behind form text. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The repeat-use features and breadth-oriented catalogue structure.
- **Change first:** Resolve missing catalogue content and standardise privacy and processing disclosures per tool.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 30. [Silo](https://siloeditor.vercel.app/)
*Category: Browser-native LaTeX workspace · Access: Waitlist; roadmap in development · Reviewed 22 Aug 2026*

**Interface context:** Silo is a browser-based LaTeX writing workspace positioned as a private alternative to Overleaf.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make private, AI-assisted technical writing feel familiar to existing LaTeX users.

**Observed direction:** White academic canvas, green status, purple action and understated product typography.

Silo’s page is almost deliberately plain: a white canvas, small “silo editor” wordmark, theme toggle, green early-access pill and a long email field with a purple waitlist button. The central line—“private Overleaf alternative”—is specific, and three compact trust claims sit below it before a product gallery begins. The restraint suits academic tooling, yet the page feels text-heavy and under-resolved compared with the ambitious workspace promise. The waitlist field is visually dominant while editor evidence arrives too late. A wide screenshot showing file tree, LaTeX source, compiled preview and AI action would explain the product immediately. Trust claims should link to precise local/BYOM architecture rather than remain slogans.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#16A34A` |
| Accent family detected | purple, green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Private-Overleaf promise → product workspace proof → trust architecture → roadmap → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#7C3AED` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Project tree, source editor, PDF preview, compiler log, model selector and collaboration state.
- **Required states:** Editing, compiling, compile error, synced, offline, AI suggestion and conflict.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide keyboard-first editing, high-contrast compiler errors and a sequential small-screen view. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The clear category comparison, honest roadmap and low-hype tone.
- **Change first:** Move editor proof above the email capture and substantiate privacy/BYOM claims technically.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 31. [AnswerLens](https://answerlens-xi.vercel.app/)
*Category: Answer-engine optimisation auditing · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** AnswerLens audits a homepage for readiness in AI answers and citations.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn AI visibility uncertainty into an evidence-backed, prioritised homepage audit.

**Observed direction:** Dark navy surfaces, teal analytical accents, compact score cards and restrained charts.

The page uses a near-black navy canvas with teal accents, a navigation bar and a sample-report action. Its split hero combines audit copy and a URL field on the left with a visible report card on the right. The report shows a score of 78, horizontal bars and discrete findings, which is strong product proof. In the reviewed capture, much of the foreground appeared unusually low contrast—possibly a fade-animation timing issue—so fine text was hard to read. Even if transient, that compromises a page built around diagnostic clarity. The report should label which checks are deterministic, show evidence and make remediation priority more meaningful than a single score. The overall composition is effective; it simply needs stronger contrast and transparent methodology.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#5EEAD4` |
| Secondary accent | `#14B8A6` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Why visibility matters → URL scan → score/findings → remediation → sample methodology.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#5EEAD4` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** URL input, scan progress, score summary, category bars, evidence rows and fix guidance.
- **Required states:** Validating, crawling, scored, partial crawl, blocked and report ready.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Increase text contrast, avoid animation-hidden content and provide textual chart values. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The excellent side-by-side sample report and immediate open scan.
- **Change first:** Explain scoring confidence and separate objective technical checks from inferred recommendations.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 32. [Ranklisted](https://promptpeek.vercel.app/)
*Category: Brand visibility monitoring for AI search · Access: Free scan open; monitoring requires an account · Reviewed 22 Aug 2026*

**Interface context:** Ranklisted measures how a brand appears across ChatGPT, Claude, Gemini and Perplexity, including category position and competitor references.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make cross-model brand visibility measurable with enough market context to be useful.

**Observed direction:** White canvas, purple emphasis, rounded form surfaces and simple black typography.

Ranklisted uses a bright white page with a purple accent, an eye-shaped logo and a sparse header ending in a free-check CTA. The centred hero highlights one phrase in purple, then immediately presents the scan form with labelled inputs for brand, URL, category and competitors. That form-first approach is excellent: users see both the required effort and the analytical model before committing. Rounded fields and generous spacing make the setup approachable, though competitor entry can become unwieldy on mobile. The visual system is polished but conventional; actual output evidence—a model-by-model citation table or visibility trend—would create differentiation. Methodology and expected scan duration should sit close to submission so users understand what the service will query and retain.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#C084FC` |
| Accent family detected | purple |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Visibility promise → contextual scan form → model comparison → competitors → monitoring account.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#7C3AED` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Brand form, competitor chips, scan progress, model matrix, citation evidence and trend chart.
- **Required states:** Form incomplete, scanning models, partial provider failure, results ready and monitoring enabled.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Let competitor chips wrap, label progress per model and retain inputs after errors. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The unusually concrete above-the-fold scan configuration.
- **Change first:** Add a sample evidence table and explain prompt sampling, variability and data retention.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 33. [Thought API](https://stealth-marketing-two.vercel.app/)
*Category: Human-opinion API for AI agents · Access: Private beta · Reviewed 22 Aug 2026*

**Interface context:** Thought API is a privacy-preserving opinion market that lets AI agents ask questions of real people.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Give agents an explicit, auditable path to human judgement.

**Observed direction:** Warm neutral canvas, forest green, large editorial headline and structured market cards.

The page has a warm white background, forest-green accents and a simple navigation. A huge centred headline—“Opinion markets for AI Agents (tied to real humans)”—states the unusual product plainly. Directly beneath it, a live market card exposes closing time, response options and distribution bars. This is excellent proof because it teaches the market primitive without requiring a diagram. The restrained green system feels more civic and human than typical AI infrastructure branding. The next layer should explain provenance: number and makeup of respondents, confidence, incentive and privacy treatment. Bars need numeric labels and non-colour differentiation. The landing page already has a strong information hierarchy; it should resist adding generic AI imagery and instead deepen the visible market record.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Human-signal thesis → live market → API workflow → privacy/quality → beta access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Question composer, market options, close time, respondent metadata, result bars and API response.
- **Required states:** Draft, recruiting, collecting, closed, insufficient sample and result delivered.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Label bar values, avoid colour-only options and disclose sample/confidence in text.

#### Design decision

- **Preserve:** The highly specific headline and immediately visible real-market primitive.
- **Change first:** Surface respondent quality, consent, aggregation and confidence beside every result.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 34. [ClipLocal](https://cliiplocal.vercel.app/)
*Category: Local selected-text rewriting · Access: Open interactive demo · Reviewed 22 Aug 2026*

**Interface context:** ClipLocal is a local text-rewriting assistant demonstrated through an email workflow.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make private rewriting feel native to text selection, with local execution always visible.

**Observed direction:** Pale cool canvas, cyan-teal accents, rounded application panels and compact status controls.

ClipLocal appears as an application rather than a marketing page. A pale cool background and cyan-teal accent frame a header with Drafts, Templates and Library, plus local Ollama status, history, notifications, account and logout controls. The centred demo offers two actions and a three-step progress strip, reinforcing a guided test. The app-like shell adds credibility, but it also exposes unfinished details: several header icons render as broken icon-font text, and account/logout controls are confusing in an ostensibly open local demo. Navigation is broader than the core rewrite task requires. A selected-text popover showing action, preview, replace and undo would be the strongest product evidence. Local model readiness should be a plainly worded status, not just a coloured pill.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#0891B2` |
| Secondary accent | `#14B8A6` |
| Accent family detected | cyan, teal |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Local readiness → guided email demo → rewrite action → preview/replace → history/templates.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#0891B2` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Selection popover, rewrite choices, diff preview, replace/undo, Ollama status and local history.
- **Required states:** Model ready, model missing, generating, previewing, replaced and undone.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Fix semantic icons, expose keyboard invocation and announce local-model/error states. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The interactive demonstration and conspicuous local runtime status.
- **Change first:** Repair broken icons and focus the shell on the selected-text rewrite before secondary modules.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---


## Data, BI and analytical workspaces

### 35. [DATAWISE](https://datawise-nine.vercel.app/)
*Category: Client-side data analysis workspace · Access: Open; no account · Reviewed 22 Aug 2026*

**Interface context:** DATAWISE is a client-side workspace for exploring CSV, TSV, JSON and SQLite data without creating an account.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make private, immediate data exploration feel powerful without enterprise setup.

**Observed direction:** Cinematic black field, pink-red hero artwork, white type and restrained analytical panels.

The landing page uses a cinematic black canvas with a subtle grid and a luminous pink-red blossom tree occupying the right side. White branding and navigation remain crisp, but the expected hero content on the left did not render in the reviewed capture, likely because of a loading or animation issue. The artwork is memorable and unusually expressive for analytics software; however, it currently communicates atmosphere more strongly than data work. A small, legible workspace preview or upload card should anchor the visual spectacle in the actual workflow. Inside the application, chart choice and AI recommendations should use calmer neutral surfaces and strong data-density conventions. Reduced-motion support and a non-decorative first-run path are important if the tree or grid is animated.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#F472B6` |
| Secondary accent | `#F87171` |
| Accent family detected | pink, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Privacy/open access → upload → profile → chart/recommend → report/export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#F472B6` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** File dropzone, schema summary, chart gallery, recommendation panel, canvas and report builder.
- **Required states:** No data, parsing, profiled, chart selected, unsupported field and export ready.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide a low-motion mode, text chart summaries and a sequential mobile analysis flow. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive visual identity and unusually broad local-file proposition.
- **Change first:** Fix missing hero foreground and put an unmistakable upload/workspace proof above the artwork.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 36. [SupplySense AI](https://supplysense-ai.vercel.app/)
*Category: Inventory and supply-chain analytics · Access: Open upload demo; no signup · Reviewed 22 Aug 2026*

**Interface context:** SupplySense AI converts CSV or XLSX inventory data into an operational health assessment.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Turn ordinary inventory files into a rapid, explainable action list.

**Observed direction:** Dark navy/indigo gradient, lavender emphasis, white type and dense dashboard panels.

The landing page uses a dark navy-to-indigo field with a large centred promise: “Supply chain intelligence in 60 seconds flat.” Lavender emphasis, a concise “No ERP · No Setup · 60 Seconds” pill and paired Upload/Live Demo actions create a strong hierarchy. A dashboard browser frame enters the fold, giving the speed claim visible product support. The visual system is polished and appropriate for operational intelligence, though “60 seconds” should adapt gracefully when files are large or messy. In the workspace, KPI cards should lead into sortable risk tables and explainable calculations rather than generic AI prose. High-risk items need symbols and labels beyond red. The live-demo route is a particularly good choice because it lets users understand outputs before sharing their own data.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#C4B5FD` |
| Secondary accent | `#818CF8` |
| Accent family detected | lavender, indigo, red |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(3.5rem, 7vw, 7rem) / 0.94–1.02`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Speed promise → upload/live demo → validation → inventory health → recommended actions.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#C4B5FD` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** File mapper, KPI cards, ABC chart, risk table, item drawer and AI brief.
- **Required states:** Uploading, column mismatch, calculating, analysis ready, low-confidence and export.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair risk colour with text/icons and convert wide inventory tables into labelled mobile rows. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The compelling live demo and domain-specific analytical proof.
- **Change first:** Expose formulas, assumptions and validation warnings alongside every recommended action.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 37. [CogniUX](https://cogniux.vercel.app/)
*Category: Customer-feedback analysis · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** CogniUX analyses CSV or pasted text feedback for sentiment and themes, with an optional OpenAI-assisted mode.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Let a researcher move from raw feedback to themes and sentiment in one screen.

**Observed direction:** Light-grey background, white rounded cards, restrained controls and readable form labels.

The live site opens directly into a simple application on a light-grey canvas. Two large white rounded cards sit side by side. The left card contains an upload zone, text area, OpenAI checkbox, Analyze control and sample-data link; the right is an empty “Analysis Results” surface with a Save as PDF action. This is admirably direct, with no marketing detour, but hierarchy is underdeveloped. “Save” appears before results exist, the OpenAI option lacks a nearby privacy consequence, and the empty results card offers little guidance about expected charts or evidence. Progressive disclosure would help: disable export until output exists, show required CSV columns before upload, and populate the right card with an illustrative empty-state skeleton. The straightforward layout should remain; it needs trustworthy analytical detail rather than decoration.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Input/source choice → AI/privacy option → analysis → evidence/themes → PDF export.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** File dropzone, paste area, field mapper, sentiment summary, theme cards and quote drawer.
- **Required states:** Empty, validating, analysing, results ready, insufficient text and export available.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack input before results, disable premature actions and label model-data handling explicitly. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The no-friction application-first experience and sample CSV.
- **Change first:** Strengthen empty states, confidence/evidence and the distinction between local and OpenAI processing.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 38. [DocuThinker](https://docuthinker.vercel.app/)
*Category: AI document understanding workspace · Access: Partial; guest uploads available · Reviewed 22 Aug 2026*

**Interface context:** DocuThinker provides a multipurpose workspace for uploaded documents: summarisation, chat, sentiment analysis, rewriting, translation and voice output across several file formats.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Present many document transformations as one premium, continuous reading workspace.

**Observed direction:** Near-black warm field, amber glow, italic editorial display type and translucent document imagery.

The landing page is near-black with brown undertones, amber-orange glows and a large italic serif hero. Translucent document shapes float around the statement “Every document, instantly understood,” while Login and Get Started actions sit in the header. The art direction is more editorial than dashboard-like and successfully makes document work feel premium. An orange sphere overlaps part of the copy in the reviewed view, creating a contrast and readability risk. The page also delays concrete evidence of how chat, translation and voice coexist. A product frame with document outline on the left, source preview in the centre and operation/output panel on the right would turn the many capabilities into a coherent workspace. Motion should respect reduced-motion preferences, especially for floating objects.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#FBBF24` |
| Secondary accent | `#FB923C` |
| Accent family detected | amber, orange |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Universal document promise → guest upload → operation workspace → privacy/limits → account.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#FBBF24` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Upload queue, document outline, source viewer, operation picker, chat/output panel and export.
- **Required states:** Uploading, parsing, ready, generating, unsupported file, guest limit and deleted.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Prevent decorative overlap, respect reduced motion and keep source/output reading order explicit. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive literary art direction and guest evaluation path.
- **Change first:** Show the actual multi-operation workspace and place precise storage/model disclosures near upload.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 39. [StarkBI](https://starkbi.vercel.app/)
*Category: Conversational business intelligence · Access: Waitlist; demo open · Reviewed 22 Aug 2026*

**Interface context:** StarkBI connects business data sources and uses conversation to generate dashboards, detect anomalies and explain changes.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make business data answerable in conversation without obscuring metric provenance.

**Observed direction:** White/pale-blue surfaces, blue gradient emphasis, large centred type and crisp dashboard cards.

The page uses a polished white-to-pale-blue canvas, small logo/navigation and a waitlist action. A compact “AI-powered dashboard generation” badge sits above a massive centred promise: “From data to dashboard in 5 minutes,” with the key phrase rendered in blue gradient. The spacing and type hierarchy are strong, but the initial viewport is almost entirely proposition; product proof appears below the fold. For a BI product, one visible dashboard with a question, generated chart and anomaly note would be more persuasive than extra gradient text. The visual restraint is suitable for business users and can support dense analytical panels later. Any generated metric should expose source, definition and refresh time through an easy details affordance rather than relying on AI confidence language alone.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Five-minute promise → demo dashboard → source connection → question/anomaly → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Source connectors, question field, generated chart, metric definition, anomaly card and refresh status.
- **Required states:** Connecting, syncing, asking, generating, ambiguous metric, stale source and result ready.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide chart summaries, disclose freshness in text and preserve query/result reading order. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The highly legible, business-friendly hierarchy and open demo route.
- **Change first:** Bring a complete query-to-dashboard example above the fold and expose semantic definitions.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 40. [Quantara](https://quantaraai.vercel.app/)
*Category: AI-assisted data analysis and reporting · Access: Live demo · Reviewed 22 Aug 2026*

**Interface context:** Quantara converts Excel, CSV and SQL data into dashboards, insights, reports and recommendations.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Make analytical transformation feel clear, optimistic and creatively differentiated.

**Observed direction:** Pink-purple illustrated landscape, translucent glass navigation, mixed editorial type and white text.

Quantara’s landing page is visually singular: an illustrated pink-purple sunset landscape fills a large rounded viewport, with glass-like navigation over it. A huge white headline mixes serif and sans-serif styles—“Turn Your Data Into Clear, AI-Powered Insights”—and treats the product almost like a cinematic destination. This is memorable and far less generic than a grid of blue BI cards. It also risks obscuring utility: contrast varies over the illustration, and no actual dashboard or upload step is visible in the first composition. The spectacle should transition quickly into a neutral product frame where charts, source fields and recommendations can be read precisely. If the scene parallax-scrolls or animates, reduced motion is essential. The brand is a strength; product evidence must catch up.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#DB2777` |
| Secondary accent | `#7C3AED` |
| Accent family detected | pink, purple, blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Emotional promise → live demo → data input/profile → dashboard/insight → report/export.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #E7E1D7; translucent fill near rgba(15,23,42,0.035); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Primary actions use `#DB2777` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Source picker, profile summary, chart canvas, insight cards, recommendation evidence and report builder.
- **Required states:** Connecting, profiling, field ambiguity, generating, insight ready and export failed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Guarantee text contrast, disable parallax on request and provide textual chart interpretation. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The unusually memorable illustrated identity and public live demo.
- **Change first:** Put a legible analysis workflow immediately after the cinematic hero and explain generated choices.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 41. [Performlytics](https://performlytics.vercel.app/)
*Category: Natural-language performance analytics · Access: Dashboard preview · Reviewed 22 Aug 2026*

**Interface context:** Performlytics lets a business ask questions in plain English across Excel, CSV, Stripe, HubSpot, Postgres and Segment data, then receive dashboards and narrative explanations.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make multi-source business analysis feel as immediate as asking a colleague.

**Observed direction:** Near-black navy, purple-blue points, white uppercase display type and blue editorial accent.

The landing page uses a near-black navy field scattered with subtle purple and blue dots. A huge left-aligned uppercase statement—“ASK YOUR DATA ANYTHING. IN PLAIN ENGLISH.”—mixes strong sans-serif lines with an italic blue serif “ANYTHING.” Supporting copy and CTAs follow below, while the header provides a Book Demo action. The editorial treatment is energetic and differentiated, though the headline’s line breaks and overlap feel awkward at the captured viewport. Product UI is not the dominant first impression, so the page needs a compact question-and-answer example with source chips and a result chart. The star-like background should remain decorative and low contrast behind body text. Dense analytical surfaces should use more restrained typography than the expressive brand layer.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#C084FC` |
| Accent family detected | blue, purple |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Plain-language promise → example answer → source connections → governance → demo.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Question composer, source chips, generated chart, narrative, formula details and follow-up thread.
- **Required states:** Connecting, asking, clarifying ambiguity, generating, source conflict and result saved.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Prevent headline overlap, provide chart summaries and expose source status without colour alone. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive editorial voice and clear plain-English proposition.
- **Change first:** Pair the dramatic hero with one sourced, reproducible analytical answer above the fold.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 42. [Ask Data](https://ai-bi-dashboard-seven.vercel.app/)
*Category: AI spreadsheet analytics · Access: Open interface · Reviewed 22 Aug 2026*

**Interface context:** Ask Data is an open interface for analysing CSV files with natural-language questions and generated charts.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Move a user from file to understandable analytical question with almost no setup.

**Observed direction:** Dark navy canvas, cyan-green gradient emphasis, crisp bordered dropzone and compact header.

The page opens directly into a dark navy interface. Logo, language, theme and sign-in controls sit in a compact header. A centred “Your data. AI insights.” headline uses a cyan-green gradient, followed by a large upload dropzone with supported formats and a 10 MB limit. Sample data and dataset-comparison paths are visible, making the empty state unusually actionable. The input-first hierarchy is excellent and avoids generic marketing. The broad dropzone dominates appropriately, though privacy and retention should be stated inside or directly beneath it. Once data is loaded, the same clarity should continue through schema preview, question history and chart evidence. Cyan-green accents must not become the only indicator for success or comparison differences.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#22D3EE` |
| Secondary accent | `#4ADE80` |
| Accent family detected | cyan, green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Upload/sample/compare → schema check → ask → chart/evidence → refine/export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#22D3EE` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Dropzone, sample dataset, comparison selector, question field, chart and calculation drawer.
- **Required states:** Empty, uploading, parsing, ready, asking, ambiguous column and result generated.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Announce upload progress, label gradient states and provide table/text equivalents to charts. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The excellent actionable empty state and open application-first route.
- **Change first:** Put retention, schema interpretation and calculation provenance beside the relevant controls.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 43. [Sheet2SaaS](https://sheet2saas.vercel.app/)
*Category: Spreadsheet-to-application builder · Access: Marketing preview; login required · Reviewed 22 Aug 2026*

**Interface context:** Sheet2SaaS turns a spreadsheet into a searchable web application, adding AI cleaning, charts, cloud synchronisation and row-level portals.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Make the leap from spreadsheet to controlled software feel immediate and understandable.

**Observed direction:** White grid, charcoal header, gold accent and editorial serif-led headline.

The page combines a dark charcoal header and gold accent with a white grid-pattern hero. A serif statement—“Turn Spreadsheets into Software instantly”—sits above two CTAs, while a black-and-gold feature ticker spans the bottom of the initial view. The result feels like a retro financial publication rather than a conventional no-code tool, which is distinctive but can also appear dated. The grid usefully references spreadsheets, yet no generated app is visible above the fold. A before/after composition—source sheet beside searchable portal—would make the transformation tangible. Gold should remain an accent rather than carry low-contrast body text. Because login blocks the builder, a guided interactive sample would materially improve evaluation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#E7C75A` |
| Secondary accent | `#B58A16` |
| Accent family detected | gold |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Spreadsheet pain → generated app example → configure/sync → permissions → login.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#E7C75A` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Sheet connector, field mapper, view builder, search/filter, row portal and sync status.
- **Required states:** Connecting, mapping, sync conflict, previewing, published and permission denied.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Maintain gold contrast, label grid-derived fields and offer keyboard-operable view configuration. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive spreadsheet-inspired editorial identity.
- **Change first:** Add an ungated before/after sample and foreground row permissions and sync behaviour.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 44. [Sheet2Report](https://sheet2report.vercel.app/)
*Category: Spreadsheet-to-report generation · Access: Open; no account · Reviewed 22 Aug 2026*

**Interface context:** Sheet2Report converts Excel or CSV files into Gemini-assisted analysis, charts and a downloadable PDF report.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn a raw spreadsheet into a credible, shareable analytical report with minimal ceremony.

**Observed direction:** White/pale-blue canvas, blue primary action, large centred type and dark product frame.

The landing page is crisp white with a faint cool-blue cast. A small early-access announcement precedes a large centred product promise, a blue primary CTA and a secondary changelog action; “100% free” is stated clearly. A dark video or product frame enters at the fold, balancing the spacious hero with evidence. The design is polished and legible, though visually generic compared with the specificity of the workflow. An actual report page, with one chart and its linked spreadsheet evidence, would be more persuasive than a video frame alone. Upload privacy and Gemini processing should be disclosed at the point of action. The early-access and changelog cues are useful stage signals and should remain visible.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Early-access status → upload promise → generation preview → report evidence → changelog.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** File upload, schema confirmation, analysis plan, chart preview, narrative editor and PDF export.
- **Required states:** Uploading, validating, generating, warning, report ready and export error.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** State AI processing clearly, provide chart alt summaries and keep source evidence reachable. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The transparent no-account offer, early-access label and direct changelog.
- **Change first:** Show a full report excerpt tied to source data and explain Gemini/data-retention boundaries.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 45. [SheetCodeCrest](https://sheetcodecrest.vercel.app/)
*Category: Local spreadsheet profiling and dashboards · Access: Open basic tier · Reviewed 22 Aug 2026*

**Interface context:** SheetCodeCrest profiles CSV, XLSX, JSON and TSV files, generates insights and charts, assembles a dashboard and supports export.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Give e-commerce teams a calm, private path from files to a useful dashboard.

**Observed direction:** Warm white dotted field, sage accent, editorial serif headline and lightly bordered cards.

The page uses a warm white dotted background, muted sage green and a serif-led headline: “Take control of your e-commerce data.” Two actions invite analysis or a dashboard preview, followed by four small metric claims—file types, insights, manual work and security—and an upload area at the fold. The calm palette stands apart from typical neon AI analytics and fits a privacy-conscious workflow. Some claims, especially “0 manual work” and “100% secure,” feel broader than a development build can prove and should be qualified. The small metrics add structure but not much evidence; a visible profiled column list, chart and business finding would be stronger. The upload surface should explain local processing and browser-memory limits directly.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** E-commerce promise → trust/coverage → upload → profile/insights → dashboard/export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** File dropzone, quota status, field profile, chart recommendations, dashboard canvas and export.
- **Required states:** Quota available, uploading, profiling, unsupported type, dashboard ready and limit reached.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Explain local processing in text, ensure dotted texture stays subtle and stack metric cards. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The calm differentiated palette and immediate preview/upload choices.
- **Change first:** Replace absolute claims with verifiable disclosures and show one end-to-end analytical example.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 46. [SaaSMetrics](https://saasmetric.vercel.app/)
*Category: Subscription metrics and revenue analytics · Access: Private beta; active development · Reviewed 22 Aug 2026*

**Interface context:** SaaSMetrics connects to Stripe and calculates subscription KPIs including MRR, churn, cohorts and revenue recognition.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make subscription performance immediately legible while preserving financial calculation trust.

**Observed direction:** Near-black navy, bright white type, violet gradient emphasis and clean metric cards.

The landing page is near-black navy with a very large centred “SaaS Metrics, Simplified” headline; the final word carries a violet gradient. A small “Benchmark your startup” badge adds context, while Connect Stripe and View Demo actions give both commitment and evaluation paths. The composition is simple and confident, with strong contrast and little clutter. Connection security and requested Stripe permissions, however, are not prominent enough for the dominant CTA. A safe demo should show MRR movement, cohort retention and the exact calculation drawer for one metric. The dark brand layer can transition into lighter or more structured dashboard surfaces for extended reading. Benchmarks also require clear sample size, segment and freshness, not just an attractive percentile.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#A78BFA` |
| Secondary accent | `#7C3AED` |
| Accent family detected | violet |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Metrics promise → demo → Stripe permissions → dashboard/cohorts → methodology/benchmark.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#A78BFA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Connection scope, MRR bridge, churn detail, cohort heatmap, customer ledger and formula drawer.
- **Required states:** Demo, connecting, syncing, data mismatch, metric ready and connection revoked.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide table equivalents for heatmaps and label benchmark context in text. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The clear dual path of Stripe connection or safe demo.
- **Change first:** Put permission, security and calculation methodology directly beside the primary CTA and KPIs.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 47. [ESG360](https://esg-360.vercel.app/)
*Category: ESG and supply-chain compliance dashboard · Access: Open dashboard; AI chat in beta · Reviewed 22 Aug 2026*

**Interface context:** ESG360 is a prototype workspace for tracking environmental, social and governance performance across suppliers, targets, compliance and reports.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Unite sustainability evidence, supplier risk and reporting work in one operational cockpit.

**Observed direction:** White canvas, organic green palette, hand-drawn leaf imagery and structured dashboard navigation.

The page opens as a landing-dashboard hybrid on white. A dense top navigation includes Dashboard, Suppliers, Analysis, Compliance, Report, AI Chat with a beta badge, Settings, search and avatar controls. The hero uses a hand-drawn green-leaf illustration with “ESG360,” supporting copy and green buttons layered over it. This immediately establishes category and exposes the product map, but text crosses the illustration and loses contrast in places. The navigation demonstrates breadth yet may overwhelm a first-time evaluator. A role-based dashboard with current score, overdue evidence, supplier risk and target progress would make priorities clearer. The organic green identity is fitting, though charts and compliance states must avoid equating green with “good” without explicit labels and source dates.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Dashboard → suppliers → analysis → compliance → report → beta assistant/settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** ESG scorecards, target tracker, supplier table, evidence status, report builder and assistant panel.
- **Required states:** On track, at risk, evidence missing, overdue, report draft and assistant uncertain.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Fix hero contrast, collapse navigation by priority and never rely on green/red alone. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The visible end-to-end product map and approachable sustainability identity.
- **Change first:** Replace the illustrative hero emphasis with sourced, dated operational priorities and framework context.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 48. [Niche Founder](https://niche-signal.vercel.app/en)
*Category: Market and niche research · Access: Sample demo open; fuller research gated · Reviewed 22 Aug 2026*

**Interface context:** Niche Founder mines Reddit, G2 and forums for underserved product niches, recurring pain points and competitor gaps, then summarises an opportunity score.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Convert scattered customer pain into a traceable, comparable niche decision.

**Observed direction:** Use a neutral research canvas, strong evidence hierarchy and restrained opportunity colour.

The route resolved during review, but the captured page was entirely white, leaving no reliable visible interface to evaluate. That is a material quality issue for a product selling research confidence, even if caused by client rendering rather than the intended design. The sample should lead with a niche summary and then expose the evidence trail: pain-theme clusters, dated quotations or paraphrases, source/community mix, competitor table and a transparent score breakdown. Gated depth is reasonable, but visitors need enough open detail to assess research quality before paying or signing in. These design recommendations follow the product’s stated research workflow; they are not observations of UI that was unavailable in the live capture.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Market query → source coverage → pain themes → competitors → score → save/unlock.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Query form, source chips, theme clusters, evidence drawer, competitor matrix and score breakdown.
- **Required states:** Collecting, low coverage, analysis ready, source unavailable, gated detail and saved.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep evidence reachable from every score and express rankings in text as well as charts. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The multi-source research thesis and open sample path.
- **Change first:** Resolve the blank public render and make provenance more prominent than the composite score.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 49. [NicheShot](https://nicheshot.vercel.app/)
*Category: Niche go-to-market planning · Access: Open · Reviewed 22 Aug 2026*

**Interface context:** NicheShot turns a niche description into a distribution playbook covering content, channels, communities and a seven-step launch plan.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Replace vague founder marketing advice with a concrete, sequenced distribution starting point.

**Observed direction:** White header, deep-blue patterned hero, bright blue emphasis and bold conversion type.

NicheShot uses a white header above a dark blue hero with a subtle constellation pattern. A free badge, simple navigation and Try Free action frame a very large statement: “Stop Guessing. Find Your First 100 Users in 30 Seconds.” A blue-highlighted phrase and a social-proof pill claiming use by 2,847 indie hackers add urgency, while explanatory copy sits near the bottom. The hierarchy is energetic and conversion-focused, but the absolute speed and user-count claims need substantiation to avoid feeling like launch-page theatre. A sample playbook card—audience, community, content idea and reason—would demonstrate product quality more effectively. The constellation texture is attractive and sufficiently subtle; generated plans should shift to a clearer task-oriented layout.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Outcome promise → niche input → sample playbook → seven-step plan → try/open use.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Niche brief, audience cards, channel rationale, community list, task checklist and save/export.
- **Required states:** Empty, generating, low-specificity prompt, plan ready, task complete and regenerate.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep the constellation decorative, label progress and avoid oversized text crowding mobile. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The high-energy clarity and immediate open-use path.
- **Change first:** Qualify acquisition claims and show cited, evidence-rich recommendations above generic social proof.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 50. [Hypothesis](https://hypothesis-nine.vercel.app/)
*Category: Simulated audience-message testing · Access: Open experiment · Reviewed 22 Aug 2026*

**Interface context:** Hypothesis tests launch copy against simulated audience agents grounded in public communities such as Hacker News, Reddit, DEV and Product Hunt.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Give launch copy a fast, clearly bounded synthetic critique before public posting.

**Observed direction:** White canvas, green emphasis, large editorial type and compact evidence panels.

The page uses a clean white canvas with a small logo, How It Works and FAQ navigation, and a Try Free action. A huge left-aligned “Hear the comments before you post” headline uses green emphasis, followed by concise copy and a “Try it now” CTA. “Free. No signup. Nothing stored.” appears directly beside the action, providing unusually useful reassurance. A product frame enters the fold and shows a verdict, interested percentage, confidence and comment-style output with a sidebar. This is strong product proof and excellent sequencing. The design should be careful with percentage precision: confidence and interest need methodological explanation and should not visually outrank qualitative feedback. The restrained style suits an experiment and avoids overclaiming through decoration.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Bounded promise → no-storage reassurance → input/audience → simulated feedback → methodology.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#16A34A` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Copy editor, audience selector, run progress, verdict, comment stream, confidence and grounding details.
- **Required states:** Empty, simulating, low-confidence, feedback ready, rerun and source unavailable.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Explain percentages in text, preserve comment reading order and announce simulation progress.

#### Design decision

- **Preserve:** The excellent privacy note, open access and immediate real-interface preview.
- **Change first:** De-emphasise false numerical precision and keep synthetic feedback explicitly distinct from user research.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---


## Work, writing and personal productivity

### 1. [BrainMate](https://brain-mate.vercel.app/)
*Category: AI productivity workspace · Access: Signup required · Reviewed: 22 Aug 2026*

**Interface context:** BrainMate presents an AI-assisted workspace for organising tasks, projects, notes and team activity in one place.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make a broad AI workspace feel approachable, trustworthy and quick to adopt.

**Observed direction:** Light, spacious SaaS presentation; strong display headline; restrained supporting colour and generous whitespace.

The observed landing page follows a conventional, polished SaaS hierarchy: a restrained top navigation with Login and Sign Up, a large “Get More Done with BRAINMATE” hero, a prominent free-trial CTA, then alternating benefit sections. The product name is treated as the main brand asset, while concise section headings—Project Management, Work Together and Your work everywhere—make the long page easy to scan. Content density stays low, with ample spacing and discrete feature blocks rather than a large capability grid. The hierarchy is clear and action-oriented, but the page reveals little of the actual product mechanics; prospective users must infer the workspace from copy and supporting visuals. The strongest UX decision is the early, repeated route into the product. The weakest is differentiation: much of the public composition and language resembles established all-in-one work tools, so a concrete assistant interaction or live read-only workspace would make the proposition more ownable. Responsive behaviour was not exhaustively tested, though the linear section structure should collapse cleanly.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero → productivity benefits → collaboration/data assurances → team proof → final CTA → legal footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Top navigation, hero CTA, feature sections, assurance panel, team section and repeated conversion block.
- **Required states:** Public navigation and CTA states are visible; meaningful workspace states sit behind signup.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Linear sections are mobile-friendly in principle; preserve strong heading order and visible focus treatment.

#### Design decision

- **Preserve:** Clear hierarchy, concise benefit labels and the prominent data-ownership message.
- **Change first:** Show one real assistant-to-task flow and an annotated dashboard before asking for an account.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 2. [Checkinout](https://checkinout.vercel.app/)
*Category: Routine tracker · Access: Open landing; account optional · Reviewed: 22 Aug 2026*

**Interface context:** Checkinout is a recurring routine and daily-task tracker intended to make repeated check-ins feel lighter than maintaining a full project manager.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn daily task tracking into a calm, low-friction ritual.

**Observed direction:** White navigation, photographic dark hero, cyan highlight and rounded blue primary action.

Checkinout’s hero is visually stronger than its sparse content. A dark, blurred desk-and-laptop photograph fills the opening panel, giving the page a calm work context while supporting large white type. The word “Checkinout” receives a bright cyan accent inside the otherwise white headline, creating an immediate focal point. The top bar stays white and uncluttered: a dark wordmark with cyan/green accents sits left, while a rounded blue Sign in control, translation icon and moon-mode icon sit right. Body copy and the blue Get Started CTA are left aligned over the image rather than centred, which feels purposeful and more editorial than a stock launch template. Below, the FAQ accordion keeps the page short and reduces visual noise. The visual confidence is ahead of the information design: visitors see little product evidence, no sample routine and no clear explanation of how a check-in differs from an ordinary checklist. The language and theme controls are promising accessibility cues, but icon-only actions need reliable labels and focus states.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#0891B2` |
| Secondary accent | `#2563EB` |
| Accent family detected | cyan, blue, green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Compact header → single-message hero → FAQ → lightweight social/footer links.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#0891B2` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Wordmark, theme/language controls, CTA button, image hero and accordion rows.
- **Required states:** Sign-in, theme and translation controls are visible; tracker states are not demonstrated publicly.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Maintain text contrast over imagery; label icon controls and keep accordion targets comfortably sized. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** The confident asymmetrical hero and unusually concise landing-page footprint.
- **Change first:** Add a three-item sample routine with completed, missed and rescheduled states.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 3. [Onzy](https://nudgeup-ten.vercel.app/)
*Category: Wellbeing productivity coach · Access: Login required (beta) · Reviewed: 22 Aug 2026*

**Interface context:** Onzy is framed in the source material as a gentle productivity and wellbeing coach that converts an unstructured brain dump into small actions and timely nudges.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Provide a low-friction, private doorway into a gentle coaching product.

**Observed direction:** Centred, minimal auth composition with conventional form styling and low distraction.

The live surface is a focused authentication card rather than a marketing page. “Onzy — Sign In” and a centred Onzy heading establish the product immediately, followed by a Google button and a tab-like choice between Sign in and Create account. Email and password fields are stacked in the expected order, with an explicit show-password control, primary Sign in action and Forgot password recovery route. Terms, Privacy and Do Not Sell links sit below the account controls. That familiar sequence minimises cognitive load and is appropriate for a private beta, but it provides no preview of the promised brain-dump, tiny-action or nudge experience. The strongest UX quality is completeness: social sign-in, account switching, password visibility and recovery are all accounted for. The main weakness is confidence-building. A user arriving from an uncontextualised link must authenticate without seeing what data will be captured, what a nudge looks like or how the wellbeing posture differs from task software. A compact, non-interactive product illustration beside the form would retain the gated beta while explaining the value.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand → social auth → sign-in/create-account choice → credentials → recovery → policies.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** OAuth button, tab switcher, email/password fields, visibility toggle and primary submit.
- **Required states:** Sign-in and account-creation states are present; coaching, error and nudge states remain unobserved.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Single-column form should scale well; preserve explicit labels, keyboard order and password-toggle naming.

#### Design decision

- **Preserve:** The complete, unsurprising authentication flow.
- **Change first:** Add a public one-screen preview and a concise explanation of data handling before authentication.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 4. [Don't Ask Me](https://dont-ask-me.vercel.app/)
*Category: Socratic learning · Access: Open with optional account · Reviewed: 22 Aug 2026*

**Interface context:** Don't Ask Me is a deliberately opinionated AI tutor designed to resist simply giving answers.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Make active reasoning feel rebellious, demanding and more desirable than instant answers.

**Observed direction:** Dark canvas, blurred glass navigation, particle motion and wide high-impact display type.

The page commits to a dark, confrontational personality. A fixed rounded-pill navigation uses backdrop blur over a particle-treated background, while the hero gives the terse “Stop Outsourcing Your Brain.” line most of the viewport. Expanded display lettering creates a wide, emphatic silhouette; the inspected assets identify a variable Zalando Sans Expanded face, so this typography is observable rather than inferred. Sections then move through Why, Key Features, audience fit and Pricing using contained cards and short, sharp labels. Socratic Mode, Smart Hints, Emergency Answer and Extreme Mode read almost like game mechanics, an effective hierarchy for a learning tool that wants to feel demanding rather than institutional. Repeated Try It Now and waitlist actions remain visible without overpowering the argument. The particle field and dark glass treatment give the product character, though they can also compete with reading and may be costly on lower-powered devices. Repeated generic testimonial names/content would weaken trust if still present in production. The design would benefit from one genuine tutor exchange showing question, hint and learner response states.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Provocation → philosophy → mechanics → audiences → Free/Pro comparison → conversion.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #2A2E35; translucent fill near rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Pill nav, hero statement, feature cards, mode labels, pricing cards and waitlist forms.
- **Required states:** Tutor modes and hints are described; the public page should demonstrate their conversational progression.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Offer reduced motion, preserve contrast through blur and ensure the expanded headline wraps gracefully. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The unusually clear product stance and memorable feature naming.
- **Change first:** Replace abstract claims with an accessible, step-by-step Socratic conversation preview.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 5. [NoteInk](https://noteink-sigma.vercel.app/)
*Category: Local-first notes · Access: Open · Reviewed: 22 Aug 2026*

**Interface context:** NoteInk is a privacy-first notebook that runs in the browser, works offline and stores notes locally rather than requiring an account.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Communicate immediate, private note-taking with no account or cloud dependency.

**Observed direction:** Spacious, utility-led landing page with restrained colour and modular card rhythm.

The live landing page opens with “Take Notes Instantly” and two clear routes: Start Taking Notes and Learn More. Its structure is conventional but disciplined: hero, six capability cards, a three-step setup explanation, use-case cards and a final CTA, followed by a full footer. The layout keeps the local-first promise near the top instead of burying privacy in legal copy, which is excellent prioritisation for this audience. Cards break the feature set into digestible chunks without turning the page into a dense dashboard. The observed snapshot did not expose the editor itself, so exact toolbar, document-list and export states remain unverified. Visually, the page relies more on spacing, typography and repeated rectangular modules than on dramatic imagery. That restraint suits an offline notebook, though it also makes the product feel similar to other minimal note apps. A small live editor embedded in the hero—preloaded with Markdown and an obvious “stored on this device” status—would convert the central promise into visible proof. Offline state, local-storage limits and export feedback should also be explicit.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero actions → feature grid → three steps → use cases → final CTA → footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** CTA pair, capability cards, numbered steps, use-case cards and export-oriented messaging.
- **Required states:** Editor, offline, storage-full and export states are central but not publicly demonstrated.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Card grids should collapse to one column; surface keyboard shortcuts and editor semantics. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The immediate start action and prominent privacy/local-first narrative.
- **Change first:** Place an editable sample note and visible local-storage indicator in the public experience.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 6. [Brieflytics](https://brieflytics.vercel.app/)
*Category: Project status automation · Access: Prelaunch waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Brieflytics proposes an automated daily status brief assembled from the tools a software team already uses.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make cross-tool status reporting feel automatic, trustworthy and team-neutral.

**Observed direction:** Clean B2B page, logo-led integration proof, screenshot panels and restrained conversion forms.

The public page uses a familiar top navigation—Home, how it works, audience routes and contact—then moves quickly into an automation-led hero and waitlist field. A strip of recognisable tool logos provides instant ecosystem context before longer explanation, an efficient design choice for an integration product. Product screenshots punctuate the PM and developer sections, helping the otherwise abstract “summary of work” promise feel more concrete. The page also includes a contact form and newsletter capture, giving prelaunch visitors more than one commitment level. Content hierarchy is serviceable, but the copy and interface show unfinished seams: success and error strings in German appear amid otherwise English content, which reads as an incomplete localisation pass. The visual system appears assembled from common SaaS sections rather than a distinctive reporting metaphor. A better hero artefact would be a legible daily brief with source badges, confidence/citation affordances and a blocker state, allowing visitors to evaluate information quality rather than merely recognising integration logos. Form feedback must be consistently localised before broader release.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/waitlist → integrations → workflow → PM and developer routes → contact/newsletter.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Tool-logo strip, product screenshots, audience sections, email capture and contact form.
- **Required states:** Waitlist/contact feedback is visible; brief generation, source tracing and empty states are untested.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep integration labels readable without relying on logos; associate every form message with its field. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Early ecosystem clarity and the separate PM/developer explanations.
- **Change first:** Fix localisation leakage and demonstrate a source-linked brief with uncertainty and blocker handling.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 7. [Sentient](https://sentient-ten.vercel.app/)
*Category: Ambient work memory · Access: Private-beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Sentient describes an ambient memory layer that connects activity across work tools into a graph of people, commitments and context.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn fragmented work history into a calm, proactive and privacy-conscious memory layer.

**Observed direction:** Concept-led SaaS composition with graph imagery, separated problem statements and trust sections.

The page builds its narrative around fragmentation. Early sections name “scattered info,” “forgotten commitments,” “lost context” and “overhead,” then answer those pains with a memory graph and proactive insights. That problem-to-system progression is appropriate for a technically unfamiliar category: it explains why a graph matters before selling graph features. Privacy receives its own section rather than a footer footnote, helping counter the natural concern created by an always-aware assistant. A comparison block and FAQ close the informational loop before the private-beta CTA. However, live inspection revealed conspicuous development residue: lorem ipsum appears in the hero and several FAQ answers repeat unfinished draft text. Those defects undermine a product whose central promise is precise, contextual recall. Visually, the graph concept could support a strong signature, but the public evidence does not yet show enough real nodes, provenance or temporal relationships to assess the system’s clarity. A read-only memory trace with source links and a “why this surfaced” explanation would be more persuasive than broad benefit copy.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Fragmentation pains → memory model → proactive outcomes → privacy → comparison → FAQ → beta.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Problem cards, memory-graph visual, insight panels, comparison block, accordion and waitlist CTA.
- **Required states:** Surfacing, provenance, correction and privacy controls are described but not directly available.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Graphs need non-visual equivalents; every insight should expose source and recency in text.

#### Design decision

- **Preserve:** The strong problem framing and early privacy emphasis.
- **Change first:** Remove all placeholders and show a realistic, source-linked memory event with user correction.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 8. [TypeZen](https://typezen-tau.vercel.app/)
*Category: AI writing assistant · Access: Early-access waitlist · Reviewed: 22 Aug 2026*

**Interface context:** TypeZen is an AI writing product aimed at creators and small teams.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Present an AI writing suite as familiar, complete and scalable from solo creator to business.

**Observed direction:** Conventional clean SaaS styling, large centred hero, repeated cards and strong pricing numerals.

The observed page is a long, standardised SaaS funnel. A simple TypeZen wordmark anchors navigation links for Features, Pricing and Testimonials, with Join Waitlist kept as the header action. The hero centres “Write smarter, faster, and better with AI,” then a sequence of similarly weighted feature sections explains Smart AI Writing, Personalized Tone, SEO Optimization, Content Templates and Goal-Oriented Writing. Pricing is presented as three parallel cards with conspicuous monthly figures and repeated Get Started buttons. The abundance of testimonial entries creates social-proof density, but many repeat generic names such as Jhon Doe, Michael Brown and Olivia Smith; this feels like seed content rather than credible evidence. The multi-column footer is comprehensive yet reinforces the impression of a template filled ahead of product readiness. Visual hierarchy is clear and predictable, which reduces learning cost, but almost nothing conveys the texture of writing: no cursor, revision, tone comparison, SEO feedback or document state. Naming inconsistency further weakens polish. The design should privilege an editor demonstration and real before/after prose over volume of generic testimonial cards.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Centered hero with copy width near 720–880px and product proof directly below.
- **Page sequence:** Hero → five capability sections → testimonial field → three-tier pricing → CTA → large footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Header CTA, feature blocks, testimonial cards, pricing cards and resource-link columns.
- **Required states:** Waitlist and pricing actions are visible; editing, rewriting and tone-feedback states are absent.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse pricing cleanly; avoid testimonial carousels that hide content from keyboard users.

#### Design decision

- **Preserve:** Straightforward hierarchy and scannable capability labels.
- **Change first:** Resolve naming/testimonial placeholders and replace them with a tangible, accessible editor walkthrough.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 9. [Flow7](https://flow7-two.vercel.app/)
*Category: Focus awareness · Access: Early-access waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Flow7 calls itself a calm performance-awareness layer for disciplined independent workers.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Reframe productivity from planned intention to quietly recorded evidence.

**Observed direction:** Restrained high-contrast palette, disciplined spacing, terse type hierarchy and minimal ornament.

The page has a notably austere voice. “Evidence over intention.” is the hero and recurring organising principle, supported by direct statements such as “You work hard. But memory is a flawed metric” and “Switch from forecasting to recording.” Uppercase micro-headings—START SETUP-FREE, TAG THE EXECUTION, VIEW THE EVIDENCE—turn the three-step sequence into a disciplined protocol. The palette appears restrained and high-contrast, while typography, spacing and rule-like separation carry more weight than illustration. Repeated Request Early Access buttons are placed at natural decision points. Comparison cards for task managers, traditional trackers and habit trackers clarify category boundaries, and the concise FAQ avoids inflating a deliberately narrow product. This is one of the stronger brand-to-product alignments in the set: the landing page itself feels measured and free of performative busyness. The trade-off is emotional distance; without a legible screenshot or sample day, “evidence” remains an abstraction. A compact timeline showing tagged deep work, interruption and reflection would prove both the product and the calm-density claim.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Thesis → flawed-memory problem → three-step protocol → analysis → comparisons → FAQ → access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Hero statement, numbered/labelled steps, evidence panels, comparison cards and FAQ rows.
- **Required states:** Tracking and analysis are described; tagging, pause and correction states need public demonstration.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve the spare rhythm on small screens; never encode evidence categories by colour alone.

#### Design decision

- **Preserve:** The focused language, category boundaries and calm visual restraint.
- **Change first:** Add one real day timeline with editable tags, gaps and reflection output.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 10. [Echo](https://echo-website-kappa.vercel.app/)
*Category: Support knowledge automation · Access: Private-beta application · Reviewed: 22 Aug 2026*

**Interface context:** Echo turns repeated customer-support emails into a maintained knowledge base for founder-led SaaS teams.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Show founders a credible path from recurring inbox pain to self-maintaining support content.

**Observed direction:** Clean B2B layout, high-contrast copy, restrained panels and product UI as primary imagery.

Echo uses a problem-led, evidence-heavy funnel. “Stop being your own support team” opens the page, followed immediately by a bounded beta message and email application. A “See Echo in action” module presents three tab controls—Dashboard, Draft Articles and Knowledge Base—while the selected dashboard shows recurring questions detected automatically. This is a strong information-design choice: the core object and its lifecycle are visible before the feature list. The page then diagrams inbox-to-article progression, names four founder pain points and explains the threshold/draft/review sequence in concrete steps. A full comparison table contrasts traditional KBs, ChatGPT + Zapier and Echo across article creation, freshness, frequency awareness, grounding and founder time. That table is unusually effective but may become difficult to scan on mobile without a stacked alternative. Security and outcome sections balance mechanism with trust and value. The page’s weakness is repetition in its application forms and some overlong explanatory sections. Still, it credibly looks like a focused product rather than a generic AI wrapper.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Problem/beta → tabbed product preview → workflow → pain → comparison → security/outcomes → apply.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Email capture, dashboard tabs, recurring-question rows, process diagram, comparison table and metrics.
- **Required states:** Preview tabs are visible; threshold, draft review, publish and source-inspection states should remain explicit.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Give the comparison table a labelled stacked mobile mode; maintain keyboard-operable preview tabs.

#### Design decision

- **Preserve:** The concrete lifecycle preview and rigorous competitive comparison.
- **Change first:** Reduce duplicate application surfaces and expose one source-email-to-article audit trail.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 11. [Timeloom](https://timeloom.vercel.app/)
*Category: Build-in-public timeline · Access: Open toy version; account optional · Reviewed: 22 Aug 2026*

**Interface context:** Timeloom is a public timeline for a person’s technical or product-building journey.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make documenting a technical journey feel public, personal and community-built.

**Observed direction:** Sparse developer aesthetic, subtle grid backdrop, straightforward type and small social accents.

The page is compact and developer-centred. A Timeloom wordmark leads a sparse header with social icons plus Login and Signup. The hero—“Craft your tech journey timeline on Timeloom”—is followed by two routes, Claim your username and Toy Version, then an inline username-availability field. That field is an effective conversion component because it makes the eventual public identity tangible before registration. A background grid and lightweight timeline mockup evoke a technical canvas without overwhelming the message. The lower “Wanna’ help in building Timeloom?” section is divided into three honest participation cards: Building in public, Open for contributions and Open for feedback, each linked to the relevant external channel. This composition is more credible than manufactured testimonials for an early project. The public snapshot does not reveal actual timeline editing, event types or empty states, so the core experience remains partly inferred. Copy punctuation and phrasing are personable but could be polished, and icon-only links need labels. A populated example timeline would immediately communicate the content model.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Header → timeline proposition → username claim/toy route → contribution and feedback invitations.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Wordmark, availability input, paired CTAs, timeline mockup and three participation cards.
- **Required states:** Username checking is visible; timeline creation, editing and public-view states are not shown.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve input/button association; add text labels to social icons and clear availability announcements. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** The honest build-in-public framing and immediate username affordance.
- **Change first:** Add a finished example timeline plus a clear model for milestones, links and revisions.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 12. [Shipnote](https://shipnote.vercel.app/)
*Category: Client feedback · Access: Early access with public demo · Reviewed: 22 Aug 2026*

**Interface context:** Shipnote centralises visual client feedback for web projects.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Turn vague, scattered client comments into visibly anchored work items.

**Observed direction:** Warm editorial landing canvas paired with neutral, compact dashboard UI and status accents.

The strongest element is product evidence. The hero “They clicked it. You see it. You fix it.” sits above an interface preview with sidebar items for Activity, Settings and Projects, filters for All/Open/In Progress/Resolved, feedback rows and threaded replies. Later, a demo of the Folia store overlays a client toolbar and numbered feedback pins on the page itself, allowing the interaction model to be understood without prose. Sections then unpack captured metadata, status changes, script installation, surveys, video feedback, time tracking, invoices, teams and annotation. A warm beige-and-black, editorial palette gives the marketing page personality while the embedded product UI stays utilitarian and legible. The weakness is scale: the page attempts to communicate nearly every planned module, creating a very long scroll and diluting the crisp pin-to-resolution story. Some advanced features feel adjacent rather than essential. Motion cues around pins and toolbar states help, but should respect reduced-motion settings. The public demo is a major strength and should remain the centre of the narrative.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/dashboard → scattered-feedback problem → live page demo → core loop → extended operations → access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Page pins, client toolbar, feedback rows, filters, thread, metadata panel, recorder and status control.
- **Required states:** Pin placement, reply and resolution are shown; include loading, duplicate, offline and permission states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Make pins keyboard reachable and screen-reader labelled; provide alternatives to image/video feedback. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The tangible Folia demo and complete pin-to-thread-to-status model.
- **Change first:** Shorten the marketing page and visually separate core feedback from optional agency operations.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 13. [Romancery](https://romancery.vercel.app/)
*Category: Fiction planning · Access: Open tools; account for saving · Reviewed: 22 Aug 2026*

**Interface context:** Romancery is a planning system made specifically for romance novelists.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Give romance writers a genre-native planning space that feels encouraging rather than technical.

**Observed direction:** Literary plum/burgundy mood, warm surfaces, expressive headings and optional dark appearance.

Romancery feels written from inside its niche. The page foregrounds romance-specific language and presents its planning concepts as named tools rather than abstract “AI writing” features. Free and Pro cards are simple to compare, and the low $9 price is visually easy to locate. Tool cards for tropes, hooks and beat sheets provide useful entry points for visitors who are not ready to create a full project. The overall mood appears literary, using a plum/burgundy family and a dark-mode control rather than generic startup blue; this is an observed broad palette impression, not a claim about exact colour values. Long-form founder context and FAQ content build trust, though they add scroll length. The core planner itself was not opened in a saved account, so beat-board density, drag states and scene navigation remain unverified. A sample novel could demonstrate how beats, arcs and scenes cross-reference each other. The design’s greatest strength is semantic specificity; its primary risk is that decorative romance styling could outweigh manuscript-scale information needs.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.25rem, 4vw, 4rem) / 1.02–1.10`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Genre promise → method → free tools → planner benefits → Free/Pro → founder story → FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Beat cards, trope/hook utilities, pricing cards, founder narrative, FAQ and theme control.
- **Required states:** Public generators are available; saved projects, scene editing and cross-linking require an account.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep manuscript text readable; never encode beat progress only through colour or position. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Romance-specific vocabulary, modest pricing clarity and genuinely useful free entry tools.
- **Change first:** Offer a read-only sample manuscript plan demonstrating beat, scene and character relationships.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 14. [Mandalverse](https://lab-mandalverse.vercel.app/)
*Category: Goal planning · Access: Open editor; signup for AI/cloud features · Reviewed: 22 Aug 2026*

**Interface context:** Mandalverse is a visual goal-planning tool based on Mandal-Art: a central objective is expanded into eight surrounding themes, which can themselves become nested nine-cell plans.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Translate one ambitious goal into a visually balanced hierarchy of concrete actions.

**Observed direction:** Repeating nine-cell geometry, spacious canvas, branch colour accents and zoom-based scale.

The defining interface is the nested 3×3 grid, not a marketing funnel. A central card carries the primary goal while eight peer cards create a balanced ring of supporting ideas. Zoom and canvas movement allow one cell to become another full Mandal-Art, giving hierarchy a spatial form that is more memorable than a conventional outline. Repeated cell geometry creates strong consistency, and colour accents can help users distinguish branches, though those colours need accompanying text and breadcrumb cues. The infinite-canvas model creates predictable UX risks: it is easy to lose orientation, small text can become unreadable, and keyboard or screen-reader traversal is harder than on a linear page. Because the site was degraded during review, exact toolbar order, autosave feedback and mobile gestures are not asserted here. A persistent minimap, clear zoom percentage, visible save state, undo history and “return to root” action are essential. The product is visually distinctive; its success will depend on making spatial depth feel controlled rather than endless.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Root goal → eight themes → recursively nested plans, supported by canvas-level navigation.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#16A34A` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Editable cells, nested-grid canvas, zoom controls, breadcrumbs/minimap, save state and AI expansion.
- **Required states:** Editing and expansion are central; loading, conflict, autosave and orientation recovery need prominence.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide list/outline parity, keyboard traversal and text alternatives to the spatial representation. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The immediately recognisable Mandal-Art geometry and recursive planning model.
- **Change first:** Strengthen wayfinding, recovery and non-spatial access; the reviewed site was intermittently degraded.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 15. [AutoApply](https://autoapply-tool.vercel.app/)
*Category: Freelance job automation · Access: Partial; account for applications · Reviewed: 22 Aug 2026*

**Interface context:** AutoApply helps freelancers reuse a résumé-style profile to find and apply to suitable work across more than fifteen job boards.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make high-volume freelance discovery feel controlled, transparent and economically worthwhile.

**Observed direction:** Conversion-led SaaS layout, stat numerals, step cards and an interactive calculator as visual anchor.

The landing page balances aggressive automation claims with unusually visible safeguards. A compact stat strip—15+ boards, one setup, 100+/day and no passwords—turns the proposition into scannable numbers. The four-step sequence then reduces a potentially risky system into familiar actions. Feature/value cards are followed by an interactive income calculator with select controls, a slider and Conservative, Typical and Strong scenarios; this is a useful engagement device because it lets visitors test assumptions rather than accept a single ROI claim. Responsible-use copy and the restricted-platform assist mode are important trust components and should remain near, not below, the primary CTA. The page still risks overpromising through volume metrics, and the calculator’s model needs transparent assumptions and screen-reader output. The actual application review queue, match explanations and failure states were not available without an account. Those are the most important product views: users need to see why a role matched, what will be submitted and where human approval occurs.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/stats → four-step workflow → value stack → earnings calculator → responsibility → signup.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Board badges, profile steps, scenario calculator, slider, disclaimer and application CTA.
- **Required states:** Public calculator works; match, review, submission, restriction and failure states are account-gated.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Announce calculator changes and expose assumptions; ensure slider has keyboard and numeric input parity. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** No-password messaging, responsible-use disclosure and scenario-based rather than single-number ROI.
- **Change first:** Publicly show an explainable match and explicit human-approval checkpoint.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 16. [Reple](https://reple.vercel.app/)
*Category: AI reply assistant · Access: Free tier; extension onboarding · Reviewed: 22 Aug 2026*

**Interface context:** Reple is a browser-based reply assistant for marketplace and messaging conversations.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Bring drafting help into existing conversations without breaking the user’s workflow or trust.

**Observed direction:** Should be compact and host-neutral, with a clear Reple boundary and restrained action hierarchy.

The product’s most important design challenge is contextual presence: it must feel native beside someone else’s conversation without impersonating that host interface. The public positioning makes the supported channels and “read context, draft reply” loop easy to understand, but a degraded live review meant the current landing-page layout and installed extension panel could not be fully observed. A strong implementation should use a compact side panel or inline composer with a clearly branded boundary, show exactly which messages are in context, and keep the generated reply visibly provisional. Tone controls, regenerate, shorten and insert actions would form the core action cluster, with undo after insertion. Privacy and permission disclosure must precede browser access, especially for private client conversations. The no-API-key promise reduces setup friction but should not substitute for explaining where text is processed. This entry is therefore partly inference, explicitly so: its niche is compelling, but the public surface needs a reliable visual demo and transparent context indicator to earn trust.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Supported channels → context capture → draft → revise → insert, plus privacy and plan limits.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Extension panel, context indicator, generated-reply field, tone controls and insert/undo actions.
- **Required states:** Installation and generation are described; permission, no-context, error and inserted states were inaccessible.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keyboard-first composer use is essential; disclose selected context in readable text.

#### Design decision

- **Preserve:** The channel-specific proposition and low-friction no-API-key onboarding.
- **Change first:** Restore reliable public access and show a permissions-to-insert walkthrough; this page was degraded in review.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 17. [FocusGuide](https://focusguide.vercel.app/)
*Category: Voice productivity suite · Access: Partial; account required · Reviewed: 22 Aug 2026*

**Interface context:** FocusGuide combines voice planning with a broad set of study and personal-productivity tools.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make a broad personal productivity suite feel hands-free and unified through voice.

**Observed direction:** Polished modular dashboard visuals, card-based previews, friendly accents and clear product labels.

The page makes breadth visible through a horizontal strip of named tools: Daily Planner, Pomodoro, Habit, Mindmaps, Goals, Advanced Notes, Analytics, Voice AI, Study Logger and Ambient Sounds. This is excellent for discoverability but also signals the central design risk—an overcrowded suite. A dashboard image establishes the shell, then three voice steps use small, focused interface fragments including listening state, generated task content, timer and streak card. Those micro-previews are more persuasive than broad feature copy because they connect speech to concrete objects. Category sections, a comparison table and testimonial carousel extend the sales case before Essential/Voice Pro pricing. Visual hierarchy appears polished and modular, with cards and segmented product imagery doing most of the work. The main weakness is prioritisation: planner, study system, mind map and wellness audio could each be products, and the landing page does not clearly define the default home or primary user journey. Voice permissions, transcription correction and silent fallback deserve more attention than secondary feature breadth.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Voice promise → tool strip → three-step capture → categories → comparison → proof → pricing.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Voice recorder, transcript/task preview, planner, timer, streak card, tool navigation and pricing cards.
- **Required states:** Listening and generated output are shown; permission denial, correction and ambiguous-command states need emphasis.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide full non-voice parity, visible transcripts and keyboard control for every productivity tool. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Concrete voice micro-previews and named-tool discoverability.
- **Change first:** Define one primary daily loop and subordinate secondary modules within the navigation.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 18. [WriterPad](https://writerpad.vercel.app/)
*Category: Writing templates · Access: Open · Reviewed: 22 Aug 2026*

**Interface context:** WriterPad is a free, no-signup collection of fill-in writing tools that runs in the browser.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Deliver polished short-form writing through structured prompts with no account friction.

**Observed direction:** Clean utility aesthetic, strong editorial hero and repeatable low-decoration tool cards.

“Your words, written well.” is a confident but quiet hero that sets up the utility grid below. Popular templates appear as individual cards with category labels, character limits and an explicit Open action, allowing users to assess effort and output type before entering a form. A three-step explanation keeps onboarding simple and reinforces that the user supplies structured content rather than handing control to a chat agent. The page’s information density is well judged: twenty-five tools could become a directory wall, but popularity and category metadata provide useful scanning anchors. The design uses typography, spacing and repeatable cards rather than decorative illustration, appropriately matching a practical browser tool. The main opportunity is retrieval as the library grows: search, filtering, recent tools and favourites would reduce repeated browsing. Template forms should show progress, required versus optional fields, live output length and a clear local-data status. The no-signup claim is strong and should remain visible within tools, not only on the landing page.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Promise → popular templates → full categories → three-step use → privacy reassurance.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Tool cards, category badges, character limits, fill-in forms, generated preview and copy/export actions.
- **Required states:** Entry is open; forms should support validation, generation, copy confirmation and local-data clearing.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Cards and forms suit one-column mobile use; preserve labels, counters and explicit error text. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Immediate access, visible effort cues and the bounded-template model.
- **Change first:** Add search/recent tools and repeat the local-storage status inside every template.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 19. [ReplyCraft](https://replycraft-amber.vercel.app/)
*Category: Review response generator · Access: Open with daily allowance · Reviewed: 22 Aug 2026*

**Interface context:** ReplyCraft generates business responses to Google reviews.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make professional public-review responses fast, safe and commercially useful for small businesses.

**Observed direction:** Clean marketing canvas, prominent metrics, modular cards and high-visibility conversion actions.

The hero claim—“Turn every review into growth engine”—puts commercial outcome ahead of AI novelty. A metrics band adds visual proof, followed by a three-step flow that makes generation feel routine rather than technical. Two prominent tool cards keep the product family intentionally small, while three pricing cards establish a route from casual use to recurring business use. The generator itself is the critical component: review text, rating/context, tone choice, generated response and copy action should form one visible vertical sequence. The public daily allowance is a good try-before-buy mechanism, though remaining uses and reset time must be explicit to avoid surprise. Visually, the page follows a familiar clean conversion layout, with cards and large figures supplying rhythm; its niche message does more differentiation than the aesthetic system. The copy contains a small grammatical rough edge in the hero, which should be corrected for a writing product. More importantly, example outputs should demonstrate handling of praise, mixed feedback and serious complaints without sounding formulaic.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Outcome hero → evidence → three steps → tools → pricing → FAQ → final CTA.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Review input, context/tone selectors, output panel, copy control, allowance meter and pricing cards.
- **Required states:** Open generation is available; include low-confidence, sensitive-review, quota and copy-success states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep long review/output text reflowable; announce generation and copy completion. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Narrow use case, open trial and simple three-step explanation.
- **Change first:** Polish copy and publish diverse before/after examples with an escalation path for risky reviews.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---


## Marketing, creator, commerce and customer-facing tools

### 20. [PilotDrop](https://pilot-drop.vercel.app/)
*Category: Product-launch workspace · Access: Open with free credits · Reviewed: 22 Aug 2026*

**Interface context:** PilotDrop is an eleven-step launch workspace that takes a product from research through positioning and campaign assets.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Give first-time sellers an end-to-end, guided launch method rather than disconnected AI generators.

**Observed direction:** Bright, energetic utility UI, frequent emoji, modular forms and progress-oriented controls.

PilotDrop behaves more like a public application than a conventional landing page. A breadcrumb-like eleven-step rail runs across the top, with the credit counter acting as a persistent capacity indicator. The page then combines marketing proof, comparison, stats and pricing with fully rendered work areas containing text fields, selects, sliders, upload controls, generate buttons and export actions. Each module is understandable in isolation, and the progressive sequence gives a novice a ready-made launch method. The trade-off is extreme vertical length and density: the whole product, sales story and pricing funnel coexist on one page, so context switches from persuasion to work and back again. Emoji are used heavily as navigational and decorative markers; they add friendliness but reduce visual consistency and can crowd labels. Forms need stronger completion, validation and generated-output states, plus a persistent indication of where work is saved. A fixed stepper with completion status and optional compact mode would better support returning users.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Eleven ordered launch steps layered with proof, comparisons, pricing and export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Step rail, credit meter, research forms, calculators, generators, upload area and export summary.
- **Required states:** Input/output surfaces are visible; strengthen saved, running, exhausted-credit, validation and retry states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert the wide step rail to an accessible disclosure/list; do not use emoji as sole labels. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The complete guided method and unusually open product surface.
- **Change first:** Separate marketing from workspace, reduce page length and add durable progress/resume cues.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 21. [CanSell](https://hatchery-bot.vercel.app/)
*Category: Ecommerce sales assistant · Access: Open generator/demo; account for embed · Reviewed: 22 Aug 2026*

**Interface context:** CanSell turns an ecommerce store into a conversational sales agent.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Let a merchant experience an on-brand sales agent before investing in setup.

**Observed direction:** Friendly ecommerce SaaS presentation with the URL field and chat panel as dominant artefacts.

The store-URL field is rightly the hero’s centre of gravity. Sample-store pills reduce blank-page anxiety and invite safe exploration, while the crawl/loading state makes the system’s work legible instead of jumping mysteriously to a result. The subsequent chat demo shows the shopper-facing object, and a clearly separated Embed action marks the transition from experiment to deployment. This input → processing → conversation → installation hierarchy is much stronger than leading with a feature grid. Below it, four steps, before/after comparisons and testimonials create a conventional sales funnel around a concrete product interaction. The main design risk is false certainty: a crawl can miss variants, policies or inventory context, so the interface should show sources, coverage and unresolved questions. The bot should also distinguish product discovery from support and escalate when it lacks evidence. Loading progress, empty catalog, unsupported platform and recrawl states deserve explicit treatment. Visually, the demo carries the brand more effectively than generic testimonial cards and should remain the primary proof.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Store input/sample → crawl progress → chat result → four steps → proof/features → embed/account.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** URL field, sample pills, progress state, product-aware chat, source context and embed control.
- **Required states:** Loading is visible; add crawl coverage, no-results, stale catalog, escalation and recrawl states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep chat reading order linear; announce crawl progress and label suggested questions as buttons. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The hands-on sample-store route and understandable input-to-embed sequence.
- **Change first:** Expose catalog coverage and sources so generated answers can be trusted.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 22. [PostOtter](https://growsocial.vercel.app/)
*Category: Social media automation · Access: Partial; social connections required · Reviewed: 22 Aug 2026*

**Interface context:** PostOtter promises to produce twenty-one social posts each week from a company’s existing brand and website: seven each for X, Instagram and TikTok, including eight videos and thirteen images.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Sell a predictable weekly content engine with minimal configuration and human review before publishing.

**Observed direction:** Dark high-contrast canvas, terse typography, numerical hierarchy and compact glyph accents.

The landing page is dark, assertive and numerically driven. “21 posts a week. Without you.” is both headline and product specification, followed by the 7/7/7 channel split and the eight-video/thirteen-image mix. Compact sections use small glyph-like markers and short paragraphs, creating a dense rhythm without a large amount of decorative illustration. The single Autopilot price is refreshing: one plan keeps the decision aligned with the singular product promise. “Drafts first” is an important safety affordance and should remain visually adjacent to connection/publishing actions. What is missing publicly is the review queue where this promise succeeds or fails. A strong queue would group content by channel and week, show source material, flag repeated ideas and require explicit approval before scheduling. Connection permissions, expired tokens, rejected media and platform-specific cropping are also essential states. The strong monochrome posture creates character but must maintain contrast for secondary copy and not turn every statistic into equal visual priority.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Weekly-output promise → channel/media breakdown → brand ingestion → drafts-first safeguard → price → FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Brand-source input, channel connectors, weekly queue, draft cards, media previews and approval controls.
- **Required states:** Connections are gated; token, draft, edit, approval, schedule and publish-failure states are critical.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Avoid tiny secondary text; give video/image previews alt text and a list-view equivalent. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** Singular pricing, memorable quantity promise and explicit drafts-first posture.
- **Change first:** Publish a read-only weekly review queue with provenance and platform-specific previews.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 23. [UniCan](https://artificial-influence.vercel.app/)
*Category: AI creative studio · Access: Free credits with account · Reviewed: 22 Aug 2026*

**Interface context:** UniCan is a broad AI marketing studio that combines conversational prompting with a node-based canvas for UGC, influencer-style ads, CGI, static graphics, image, video and audio generation.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Present a single, energetic environment for many forms of AI-assisted marketing production.

**Observed direction:** High-density creative SaaS system, visual proof gallery, tabbed catalogues and vivid generated imagery.

The page demonstrates ambition through abundance. Its top navigation contains Agent Beta, Image, Video, Audio, Library, Guides, Autopost, Studio, Canvas, Free Tools and Pricing, immediately signalling a platform rather than one generator. The hero pairs “Introducing vibe marketing” with a product screenshot, after which a sixteen-image proof gallery establishes visual range. Tabs divide tools into agents, generators, workflows and automations, while model-provider cards explain the underlying capability ecosystem. Pricing is comparatively simple—free credits, Starter and Plus—but the footer again expands into a large free-tool directory. This density makes UniCan feel active and capable, yet discovery is difficult: Studio, Canvas, Agent and individual generators compete at the same level. A task-led entry (“make a UGC ad,” “remix a product shot”) would be easier for new users than product taxonomy. Galleries also need consistent captions, aspect-ratio handling and accessible alt text. The floating AI chat widget is on-brand but risks competing with primary creation CTAs.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Platform hero → showcase → tool-type tabs → model ecosystem → workflows → pricing → free-tool directory.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Prompt chat, node canvas, asset gallery, generator cards, model cards, credit meter and plan selector.
- **Required states:** Account gates creation; support queued, failed, variant, remix, credit and provenance states consistently.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide list alternatives to canvas/visual galleries; caption media and expose generation status in text. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Breadth of visible examples and the conversational-plus-canvas distinction.
- **Change first:** Replace taxonomy-first navigation with task-first onboarding and reduce competing top-level destinations.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 24. [Clario](https://clario-hub.vercel.app/)
*Category: Content repurposing · Access: Free tier with signup · Reviewed: 22 Aug 2026*

**Interface context:** Clario takes one source—pasted text or a URL—and repurposes it for multiple platforms.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Turn a single piece of content into a controlled family of platform-specific outputs.

**Observed direction:** Polished card-based SaaS presentation, numbered section cues, tabbed mock workspace and compact metrics.

The landing page makes the product structure visible early. A numbered navigation—Features and subsequent sections—supports a long scroll, while the hero “Your content, repurposed for every platform” sits beside a simulated application card. Tabs for Summarizer, Remix, Chat and Brand Voice give the card a believable workspace hierarchy; URL/text input choices explain ingestion without a separate diagram. Later sections mix feature lists and cards, then show a Brand Voice panel with percentage metrics. The live demo is especially useful: a format selector feeds a code/text-like result view with Copy, Export and Regenerate controls, exposing the repeated action loop. The interface is polished and modular, though “Clario” is a crowded product name and the generic SaaS visual language does not strongly differentiate it. Percentage voice scores need plain-language explanations and should not imply scientific precision without evidence. Output format, platform constraints and source fidelity should remain visible while editing.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Source/result hero → capability modules → brand-voice evidence → live format demo → pricing.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Source tabs, URL/text field, mode tabs, output-format selector, result viewer and copy/export/regenerate actions.
- **Required states:** Live demo shows generation actions; add source errors, unsupported URL, partial output and revision history.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep tabs keyboard-operable and scores text-described; allow long output to reflow without horizontal scroll.

#### Design decision

- **Preserve:** The early workspace model and directly usable result controls.
- **Change first:** Explain voice scores and keep source/platform constraints attached to each generated output.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 25. [SnapBrand](https://snapbrand-snowy.vercel.app/)
*Category: Brand identity generator · Access: Open; account for saving · Reviewed: 22 Aug 2026*

**Interface context:** SnapBrand generates an initial brand kit from a business name, industry and short description.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Give small businesses a tangible, editable starting point for identity creation in minutes.

**Observed direction:** Bright approachable layout, preview-led colour swatches, typography samples and friendly emoji accents.

The generator is placed near the hero and uses three obvious inputs—brand name, business type and description—followed by a single Generate action. Beside it, a finished kit preview demonstrates the likely reward. The inspected example visibly labels colours including `#6366F1`, `#8B5CF6` and `#F8FAFC`; these exact values belong to the sample output, not necessarily the site theme. This is good expectation setting because it shows both swatches and usable tokens. Industry blocks broaden relevance, while three steps and emoji-led feature cards keep the rest of the page accessible to non-designers. Free/Pro cards make saving or higher-volume generation the natural commercial boundary. The weakness is that a palette plus type sample can look more complete than it is. Brand identity also needs logo behaviour, imagery, contrast checking, tone and export formats. Generated suggestions should disclose editable versus fixed fields, and every swatch needs a text label and contrast information.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Three-field generator → kit preview → industries → three steps → features → Free/Pro.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Business inputs, Generate action, palette tokens, type specimen, preview cards, save/export and pricing.
- **Required states:** Generation is open; saving is gated. Add variation, edit, contrast-warning, export and history states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Label every swatch with value/meaning; never communicate brand roles through colour alone.

#### Design decision

- **Preserve:** Immediate generator access and the concrete token-level preview.
- **Change first:** Expand beyond palette/type and distinguish an exploratory concept from a production-ready brand system.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 26. [ToneGuide](https://toneguide.vercel.app/)
*Category: Brand voice governance · Access: Open audit; product waitlist · Reviewed: 22 Aug 2026*

**Interface context:** ToneGuide audits public copy against a desired brand voice.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make brand voice measurable and correctable without turning writing into a black-box score.

**Observed direction:** Purple/indigo SaaS palette, annotation-led editor mock, clear score cards and compact feature modules.

The strongest design decision is showing critique rather than merely claiming consistency. In the hero mock, problematic phrases are marked inline, a numeric score provides an overview and the Copilot rewrite creates an explicit before/after state. The free URL field offers a low-friction way into that model. Subsequent cards split the system into voice radar, content checks, Copilot and image review, followed by three steps, testimonials and a waitlist. The visual language appears purple/indigo, polished and conventionally SaaS, with annotated copy and score panels supplying product-specific identity. The score jump is easy to understand, but it risks false precision; users need dimensions, examples and rationale, not just one composite number. Inline annotations should support severity, rule source, ignore/accept and team discussion. Radar charts require a textual alternative and can exaggerate small differences. The current funnel is compelling, but a sample audit with expandable explanations would do more for trust than generic social proof.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#C084FC` |
| Secondary accent | `#818CF8` |
| Accent family detected | purple, indigo |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Audit input/hero result → checks and rewrite capabilities → three steps → proof → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#C084FC` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** URL field, annotated copy, voice score, radar, rewrite comparison, rule controls and CTA.
- **Required states:** Public audit is open; support crawling, processing, no-copy, accepted exception and rescan states.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair radar/colour annotations with text; make every flagged phrase keyboard navigable. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The observable before/after critique loop and low-friction website audit.
- **Change first:** Replace opaque scoring with dimension-level evidence and editable team rules.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 27. [Creo](https://creo-seven.vercel.app/)
*Category: AI media engine · Access: Account and credits required · Reviewed: 22 Aug 2026*

**Interface context:** Creo identifies itself as an AI content engine for creators and founders, centred on producing media through a credit-based account.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Present a creator/founder media engine whose output and economics are understandable before signup.

**Observed direction:** Not reliably observable on the reviewed live surface.

The reviewed surface was materially degraded: it resolved and supplied a product title, but did not expose enough rendered content to analyse layout, palette, navigation, cards or real interaction states with confidence. That absence is itself a consequential UX result. A visitor cannot judge what “content engine” means, how credits are spent, whether outputs are image, text or video, or what distinguishes Creo from a crowded generation market. The product needs a stable public shell before aesthetic refinement matters. At minimum, it should show one task-specific workflow, a sample result gallery, credit cost beside each action, and a transparent path from prompt to editable asset. Account-gated creation is reasonable; account-gated comprehension is not. Any rich media should include text descriptions, aspect ratios and reduced-motion controls. This review makes no inference about the current visual system because the live evidence was insufficient.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Needed: task selection → source/prompt → generation → variants → edit/export, with credits always visible.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Needed: generator chooser, prompt/source inputs, media preview, variant history, credit meter and export.
- **Required states:** Account/credit access is known; landing, loading, failure and output states were inaccessible.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Media creation should have text alternatives, status announcements and keyboard-operable controls. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The concise creator-and-founder audience statement.
- **Change first:** Restore a stable public product explanation and sample workflow; the page was degraded during review.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 28. [WixelQ](https://wixel-q.vercel.app/)
*Category: QR-code utility · Access: Open · Reviewed: 22 Aug 2026*

**Interface context:** WixelQ is an open QR-code generator intended to turn text or a URL into a downloadable code without requiring an account.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make a dependable QR code in one screen with no registration or unnecessary workflow.

**Observed direction:** Current visual system was not reliably observable; favour neutral utility surfaces and high preview contrast.

A QR tool succeeds through immediacy and error prevention, not a long marketing funnel. The ideal—and expected from the public description—centres a labelled content field beside a live code preview, with download and perhaps size, margin, colour or error-correction controls secondary. Because WixelQ’s live rendering was degraded during this pass, the current palette, typography and precise form arrangement are not asserted. The key UX requirement is to protect scan reliability: unsafe contrast, insufficient quiet zone or excessive styling should trigger visible warnings, and every preview should offer a local test state before download. Format and resolution need plain labels, while copied or downloaded confirmation should be announced. If analytics or dynamic codes are not part of the product, the page should say so rather than borrowing enterprise QR language. An open, privacy-conscious, one-screen experience would be the right differentiator.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Content input → live preview → safe customisation → scan check → download.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** URL/text field, QR preview, size/format options, safety warnings, test and download controls.
- **Required states:** Open access is confirmed; rendering, invalid input, low contrast and download states were degraded.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep labels explicit, announce preview updates and provide the encoded content as selectable text.

#### Design decision

- **Preserve:** The open, single-purpose proposition.
- **Change first:** Ensure reliable public rendering and make scan-safety feedback a first-class part of the generator.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 29. [QuickSwipe](https://quickswipe.vercel.app/)
*Category: News consumption · Access: Early-access waitlist · Reviewed: 22 Aug 2026*

**Interface context:** QuickSwipe is an early-beta news product that repackages stories into short, swipeable summaries for mobile consumption.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make current events feel as fluid as short-form video without stripping away provenance.

**Observed direction:** Sparse, mobile-first launch page with large headline, three feature blocks and little decoration.

The launch page is notably sparse. “News That Never Stops” dominates the hero, followed by three evenly weighted features—Lightning Fast, AI-Powered and Mobile First—and a newsletter/waitlist form. A minimal footer ends the experience without pricing, testimonials or a manufactured product ecosystem. That restraint fits an early beta, but it leaves the most consequential design questions unanswered. A reels-style news interface must show source, publication time, update/correction state and a route to the full article without interrupting the swipe rhythm. Progress indicators and topic labels can help orientation, while autoplay motion should be optional. The landing page should preview at least three cards: breaking news, a multi-source summary and a corrected/updated story. A checkbox adjacent to email capture needs an explicit label and purpose. The current page communicates pace but not trust; for news, source transparency is more important than generic AI speed.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero proposition → speed/AI/mobile benefits → newsletter/waitlist → minimal footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Future swipe card, source line, topic chip, progress cue, full-story link and preference controls.
- **Required states:** Only waitlist capture is public; loading, swipe, save, update and source-expansion remain unseen.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Support reduced motion, buttons as alternatives to gestures and readable, non-autoplay summaries.

#### Design decision

- **Preserve:** The concise launch footprint and immediately understandable consumption metaphor.
- **Change first:** Show a source-rich feed preview and prioritise correction/provenance states over generic speed claims.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 30. [Kivo](https://kivoapp.vercel.app/)
*Category: Audio newsletter briefing · Access: Beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Kivo converts newsletter clutter into a personalised daily audio briefing.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Turn newsletter overload into a calm, curated listening ritual.

**Observed direction:** Restrained editorial atmosphere, generous whitespace, muted contrast and large numbered steps.

Kivo’s landing page is editorial rather than dashboard-heavy. “From clutter to clarity” provides a calm transformation message, followed by a short knowledge philosophy instead of an aggressive list of AI capabilities. Four feature blocks establish the value, while large numbered steps—Label, Compress, Delivered—create a memorable linear model. A restrained black/cream impression, ample whitespace and serif-like editorial cues make the product feel closer to a thoughtful publication than an inbox utility; this broad stylistic reading does not assert an exact font or colour value. That alignment is a strength for an audio briefing product. However, visitors cannot yet inspect the audio object itself. A sample player should expose duration, chapter markers, newsletter sources, playback speed and a transcript, with each summarised point linked back to its origin. The design should also distinguish skipped newsletters from failed ingestion and allow users to tune depth versus duration. The current page is elegant, but its promise would become credible through one transparent sample episode.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Clutter-to-clarity thesis → philosophy → four features → Label/Compress/Delivered → beta CTA.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Newsletter selector, briefing queue, audio player, chapters, transcript, source links and preferences.
- **Required states:** Beta is gated; ingestion, processing, playback, skipped-source and correction states are unobserved.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Transcripts and full playback controls are essential; never make audio the only access path. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The calm editorial tone and clear three-stage mental model.
- **Change first:** Embed a sourced sample briefing with chapters, transcript and personalisation controls.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 31. [OmniPost](https://project-sdcnx.vercel.app/)
*Category: Multichannel publishing · Access: Free-beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** OmniPost is a creator publishing hub for preparing, scheduling and analysing content across multiple social platforms.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Give creators one operational home for creating and distributing content across channels.

**Observed direction:** Familiar dashboard shell, modular upload/schedule cards, colourful platform accents and marketing feature grids.

The product mockup is the clearest part of OmniPost. Its left sidebar gives a conventional creator-workspace map, the central upload card establishes the primary action and an Upcoming Posts panel makes scheduling tangible. Feature cards and a three-step explanation then support the same loop, while a referral waitlist with leaderboard adds a lightweight growth mechanic. The problem is repetition: the page repeats core features and the three-step story multiple times, then adds reviews, future analytics, video analysis, deals, trends and coaching before pricing. A visible unfinished loading skeleton further exposes development state. This creates an impression of breadth but weakens the single publishing narrative. The dashboard shell itself is sensible; the landing page should trust it more. A platform-specific composer preview, calendar state and post status legend would communicate readiness better than another feature row. Referral rank also needs clear privacy and opt-out handling. On mobile, the sidebar should become a labelled navigation drawer rather than icon-only tabs.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/mock dashboard → features → steps → referral waitlist → future modules → pricing.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Sidebar, upload/composer, asset library, calendar, upcoming-post list, account connectors and leaderboard.
- **Required states:** Public mock only; include draft, scheduled, published, failed, disconnected and per-platform validation states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use labelled mobile navigation; ensure calendar and leaderboard have list alternatives. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** The coherent dashboard map and clear $9/$19 pricing direction.
- **Change first:** Remove duplicated sections, fix placeholders and focus the story on compose-to-publish before adjacent tools.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 32. [Kleer HQ](https://kleerhq.vercel.app/)
*Category: Creator operations · Access: Beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Kleer HQ positions itself as an operating system for creators and agencies, bringing brand deals, contracts, invoices, income tracking and AI-assisted administration into one workspace.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make the commercial side of creator work feel organised, professional and less administratively heavy.

**Observed direction:** Not reliably observable; the live surface was degraded beyond an accessibility skip link.

The live page was degraded enough that palette, typography, navigation and component styling could not be observed with confidence. The accessible skip link is a positive baseline signal, but it is not sufficient product evidence. For this category, the ideal information architecture is relatively clear: pipeline and due dates at home; Brands/Deals, Deliverables, Contracts, Invoices and Income as primary destinations; and an assistant as a contextual tool rather than a separate novelty tab. Deal cards should join commercial value, deliverable status and next action, while invoices need sent, viewed, overdue and paid states. Financial figures require strong privacy, locale and currency handling. A public read-only workspace populated with one fictional partnership would communicate much more than broad “creator OS” language and remain safe for a beta. This entry is based on the confirmed product proposition plus reasoned design requirements, not an invented view of the inaccessible interface.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Recommended: home → deals/deliverables → contracts → invoices/income → contacts → assistant/settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Deal pipeline, deadline list, contract record, invoice table, income chart and contextual admin assistant.
- **Required states:** Waitlist only observed; model draft, sent/viewed, overdue, paid, disputed and renewal states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve the skip link; tables and charts need labelled mobile/list alternatives and currency context. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The operations-first niche rather than another content generator.
- **Change first:** Restore a reliable public preview and demonstrate one end-to-end fictional sponsorship workflow.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 33. [Tipply](https://tipply-coming-soon.vercel.app/)
*Category: Creator monetisation · Access: Coming-soon waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Tipply is a planned creator monetisation platform combining tips, subscriptions, personalised creator pages, stream overlays and eventually merchandise.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make direct creator support feel celebratory for fans and operationally clear for creators.

**Observed direction:** Friendly creator imagery, modular feature cards, playful overlay potential and approachable CTA styling.

The page uses a creator-first hero followed by feature cards for pages, overlays, fees, subscriptions, tips and merch. Splitting the process into creator and supporter flows is an important information-design choice: monetisation products often describe only setup and ignore the payer experience. Creator-type tabs paired with imagery help visitors project the product into streaming, art or other niches, while the FAQ and waitlist close the page conventionally. The public composition appears friendly and image-led rather than financial, which lowers intimidation but must not obscure fees, payout timing or refund policy. In-product, the central artefacts should be a clear earnings dashboard, editable supporter page and real-time overlay preview. Payment success, failure, chargeback, recurring renewal and disconnected-stream states are essential. Animation is appropriate for alerts, but reduced-motion and audio controls must be first-class. Merch is a future breadth signal that should stay subordinate until tipping and subscriptions are visibly complete.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Hero → monetisation modules → creator/supporter flows → creator-type examples → FAQ → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Creator page editor, tip/subscription checkout, fee disclosure, earnings view and overlay preview.
- **Required states:** Coming-soon only; define payment, renewal, refund, moderation, stream and alert states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Make overlays configurable for motion/audio; checkout needs full keyboard and screen-reader support.

#### Design decision

- **Preserve:** The two-sided workflow explanation and creator-type contextualisation.
- **Change first:** Put fee/payout transparency and a real overlay simulator ahead of future merchandise.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 34. [EXEQ](https://exeq.vercel.app/)
*Category: Artist management · Access: Private-beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** EXEQ is a roster operating system for music managers.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Give artist managers a premium, culturally credible command centre rather than a corporate CRM.

**Observed direction:** Black/white editorial contrast, large uppercase display type, motion labels and restrained data accents.

“RUN YOUR ROSTER WITHOUT THE CHAOS” opens an assertive, editorial page whose product preview immediately displays monthly revenue, deals and artists. A marquee-like label line adds movement, then a “Now vs EXEQ” matrix translates scattered management work into an integrated system. Six feature modules—roster, pipeline, inbox, task, splits and signals—pair copy with hover-driven previews. The site’s own language describes the aesthetic as editorial, premium and closer to a product studio than enterprise software; the observed black/white, high-contrast treatment supports that claim. A manifesto and FAQ reinforce the point of view before the beta form. This is a strong brand fit for music, though hover-only previews must have tap and keyboard equivalents. Large uppercase type creates authority but can reduce reading comfort in longer passages. Financial and split data also need calmer, denser table views inside the actual app. The public command-centre mock is persuasive; one deal moving from offer to signed split would make it operationally complete.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Roster-chaos hero → command centre → Now/EXEQ contrast → six modules → manifesto → FAQ → beta.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Roster table, artist status, deal pipeline, inbox, task queue, split ledger and growth signal.
- **Required states:** Hover previews are public; add keyboard/tap parity plus deal, signature, payment and conflict states.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Avoid hover dependency, moderate all-caps passages and provide tabular alternatives for financial visuals. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The genre-credible editorial identity and concrete command-centre preview.
- **Change first:** Demonstrate one complete deal lifecycle and ensure dense operational screens remain calmer than the marketing page.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 35. [KrafSyte](https://krafsyte.vercel.app/)
*Category: Small-business commerce · Access: Partial; future features visible · Reviewed: 22 Aug 2026*

**Interface context:** KrafSyte is aimed at Malaysian small businesses that need a simple online catalogue and public business page.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Help Malaysian microbusinesses publish a credible, shareable catalogue with very little setup.

**Observed direction:** Not reliably observable; favour mobile-first merchant imagery, clear product cards and locally appropriate formats.

Because the reviewed surface was degraded, no exact palette, font or card arrangement is claimed. The product’s design opportunity is nevertheless specific: onboarding should begin with business identity and one product, then produce a previewable mobile catalogue and QR code before asking for advanced setup. Catalogue cards need price, availability, variant and contact/order actions; a public page needs WhatsApp-friendly sharing and clear merchant identity. A lightweight dashboard should prioritise products, page appearance, QR/share and enquiries, keeping future commerce modules labelled as such rather than mixing planned and live functionality. Malaysia introduces practical requirements around Bahasa Melayu/English content, Ringgit formatting, mobile performance and low-bandwidth sharing. QR creation should include print-safe sizing and scan testing. A reliable public sample merchant would make the niche immediately tangible and expose the experience without sensitive information.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Business setup → products → public-page preview → QR/share → enquiries/orders → future commerce.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Product form/card, catalogue preview, page theme, QR generator, share actions and enquiry list.
- **Required states:** Partial access is known; catalogue empty, sold out, draft/published, QR and enquiry states need clarity.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Optimise for low bandwidth and bilingual text; label currency and QR content explicitly. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The Malaysian small-business focus and catalogue-before-full-commerce scope.
- **Change first:** Restore reliable public access and publish a complete fictional merchant demo; this review was degraded.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 36. [ClientFlow](https://clientflow-one.vercel.app/)
*Category: Client portals · Access: Early access; demo coming soon · Reviewed: 22 Aug 2026*

**Interface context:** ClientFlow is a white-labelled client portal for agencies.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Let agencies deliver a branded, calm client experience while retaining operational control.

**Observed direction:** Premium spacious landing page, wide-letter wordmark, polished dashboard imagery and restrained metrics.

The widely tracked “C L I E N T F L O W” wordmark gives the hero a premium agency tone, while the nearby metric trio makes the dashboard feel populated. Large product images then walk through portal, tracking, file and approval surfaces, supported by a three-step workflow. Custom branding, security and recent activity receive dedicated sections, which is appropriate for client-facing software where confidence matters as much as project data. The page’s major weakness is repetition: feature marquees and workflow loops recur several times, producing an unusually long scroll while the actual demo remains unavailable. The design would be stronger if it used one fictional agency/client project to connect dashboard, files, approval and activity log. Within the product, client-facing views must be visibly simpler than agency administration. Approval items need version, requester, due date, comments and explicit approved/changes-requested states. Large screenshots should have captions and meaningful alt text rather than serving as the only explanation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/stats → portal/project/files/approval walkthrough → branding/security/activity → pricing → early access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Client list, project status, file/version browser, approval card, activity log and branding settings.
- **Required states:** Demo is coming soon; define invited, viewed, commented, changes requested, approved and expired states.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Caption screenshots; give file and approval tables mobile list views with clear status text. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Strong agency positioning and attention to both branding and audit history.
- **Change first:** Remove repeated sections and replace them with one coherent, openly inspectable client journey.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 37. [Splendor AI Automation](https://splendoraiautomation.vercel.app/)
*Category: Ecommerce revenue operations · Access: Private beta application · Reviewed: 22 Aug 2026*

**Interface context:** Splendor AI Automation presents an ecommerce revenue-operations platform that detects sales leakage and coordinates recovery actions.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make hidden ecommerce revenue loss visible, prioritised and recoverable through coordinated automation.

**Observed direction:** Data-forward, institutional presentation with metric blocks, alert cards, product imagery and dense tables.

The landing page adopts the visual language of an institutional analytics product: large headline metrics establish the outcome, dense cards enumerate leakage, and a multi-column trend table supplies specific-looking evidence. Product thumbnails and geographic labels keep that table from becoming purely numerical. This is an impressive amount of interface thinking for a beta, and the alert-driven dashboard suggests a useful rhythm of detect, prioritise and recover. The weakness is cumulative density. Twelve leak cards, an expansive capability checklist, setup content, intelligence data and the application form compete within one long narrative; the platform can appear broader than its demonstrated workflow. A tighter walkthrough could follow one failed-payment cohort from alert to projected value, recommended action, approval and measured recovery. Labels should distinguish live business data, model estimates and illustrative figures, especially where revenue and ROAS are prominent. The trends table needs filtering, sortable headings, pinned identifiers and a compact mobile alternative. Beta eligibility, data connections and permissions also deserve a plain-language explanation beside the application CTA.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Revenue overview → leak categories → recommended actions → trend intelligence → setup → beta application.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** KPI strip, leak card, alert queue, recovery workflow, trend table, filters and integration status.
- **Required states:** Define detected, estimated, approved, running, recovered, dismissed and failed-action states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert wide tables to labelled list cards on small screens; never rely on colour alone for urgency or growth. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The unusually concrete dashboard evidence and quantified, action-oriented framing.
- **Change first:** Reduce breadth in the landing narrative and demonstrate one complete recovery loop with data provenance.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 38. [Alchemyst](https://alchemyst-updated.vercel.app/)
*Category: Configurable AI employees · Access: Partial; role waitlists · Reviewed: 22 Aug 2026*

**Interface context:** Alchemyst proposes configurable “digital employees” for recurring business roles.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make configurable AI labour understandable by packaging capabilities as recognisable business roles.

**Observed direction:** Persona-led editorial imagery, prominent role names, spacious story sections and card-based role selection.

Full-width character imagery and named role cards give an abstract AI proposition a memorable human frame. Separating Maya, Moh and Leela by job function also makes browsing faster than presenting a generic feature matrix: a buyer can begin with the employee they need. The strongest product-design opportunity is behind that metaphor. Each card should reveal mandate, permitted tools, reporting line, approval boundaries, example output and escalation behaviour before asking someone to “hire” or join a waitlist. At present, repeated generic statements, an “Additional Info (if required)” heading and the browser title “Create Next App” visibly undermine the polished portraits and signal an unfinished build. The page would benefit from one realistic day-in-the-life timeline for Maya—lead discovered, context assembled, draft prepared, manager approval requested and CRM updated—along with clear sample-data labelling. Human likenesses should never imply capabilities that the interface cannot evidence. Role CTAs also need consistent wording and status so “Hire” is not confused with immediate production access.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand promise → featured employee → role catalogue → operating model → team/partners → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Employee profile, capability/permission summary, example activity timeline, output preview and waitlist form.
- **Required states:** Distinguish available, waitlist, configuring, awaiting approval, working, escalated and paused.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve role identity without relying on portraits; provide descriptive text and logical heading order on mobile. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The memorable named-persona system and direct mapping from agent to business function.
- **Change first:** Remove scaffold copy, correct page metadata and show verifiable work, limits and supervision for every role.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 39. [AICS](https://aics-web.vercel.app/)
*Category: Multi-agent customer support · Access: Open interactive demo; beta offer · Reviewed: 22 Aug 2026*

**Interface context:** AICS is an Indonesian multi-agent customer-support system that exposes unusually detailed product evidence on its public site.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Demonstrate trustworthy multi-agent support by exposing both the customer answer and the system’s reasoning trail.

**Observed direction:** High-information technical layout with demo panels, state badges, diagrams, comparison tables and code output.

The live trace is the page’s defining design decision. Instead of asking visitors to trust a broad “AI support” claim, it surfaces which agent acted, how confident it was and what state changed. Suggested prompts lower the cost of exploring the demo, and the industry tabs make a technical architecture legible through concrete customer questions. Developer JSON and five-agent diagrams sit alongside commercial pricing, so both evaluators and implementers receive meaningful detail. That breadth also makes the page exceptionally long and dense: demo, scenarios, architecture, comparisons, pricing, founder story and status can feel like several documents concatenated. A sticky local index or audience switch—“See the customer experience” versus “Inspect the system”—would improve orientation. Confidence needs a short interpretation guide, and traces should collapse by default while preserving a plain-language summary. Demo data, simulated outcomes and live status require persistent labels rather than one-time disclaimers. The realistic transparency is a strength; editing and progressive disclosure would make it feel more controlled without hiding the engineering depth.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Interactive demo → industry scenarios → agent architecture → developer response → comparison → pricing/status → beta.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Prompt suggestions, conversation surface, agent trace, confidence indicator, state viewer, JSON panel and pricing table.
- **Required states:** Show idle, routing, agent working, low confidence, handoff, resolved, errored and demo-data states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse traces and JSON accessibly; provide text explanations for diagrams and horizontal-table alternatives. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The open, inspectable demo and unusually honest separation of simulated evidence from customer results.
- **Change first:** Add audience-based navigation and progressive disclosure so the strongest proof is not buried by page length.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 40. [Starts Now](https://starts-now-online1.vercel.app/)
*Category: Website-trained AI chatbots · Access: Partial; public demo, account required to build · Reviewed: 22 Aug 2026*

**Interface context:** Starts Now lets a business train a chatbot on its website or uploaded documents, customise the widget and install it with one script tag.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Get a source-grounded support and lead-capture bot from business content to live channels with minimal setup.

**Observed direction:** Technical-but-friendly landing style using code-like labels, geometric markers, demos and concise configuration examples.

The page blends a developer-tool tone with a no-code workflow. Comment-like labels such as “// How it works,” geometric step markers and the one-line embed idea imply technical credibility, while plain forms and industry tiles keep the proposition approachable for non-developers. The self-trained live demo is the best proof surface because it lets visitors test answer quality before creating an account. The WhatsApp section expands the product without changing the core mental model: one knowledge source, two customer channels. The main design risk is breadth. Many industry cards repeat the same promise and can dilute the stronger three-step story. A focused interactive builder preview—source ingestion status, cited answer, appearance controls and lead record—would reveal more than additional vertical examples. Grounding claims should be represented in the widget through source links, uncertainty and human-handoff states. QR connection needs explicit expiry and device feedback. The installation snippet should support copy confirmation and clearly separate test from production configuration.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Value proposition → three-step setup → capabilities → WhatsApp extension → industries → live demo → pricing/FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Source importer, training status, widget customiser, grounded chat, embed snippet, QR connector and lead inbox.
- **Required states:** Cover crawling, processing, ready, source missing, uncertain answer, handoff, copied code and QR expiry.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep chat keyboard-operable; label widget controls, source citations and QR alternatives for screen readers. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The clear source-customise-embed sequence and an openly testable bot trained on the product site.
- **Change first:** Replace repetitive industry proof with a compact, inspectable builder and visible grounding safeguards.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 41. [Siftly](https://ai-hr-application.vercel.app/)
*Category: Autonomous recruiting operations · Access: Waitlist · Reviewed: 22 Aug 2026*

**Interface context:** Siftly describes an autonomous hiring platform in which five AI agents collaborate across job-description creation, résumé scoring, candidate outreach, scheduling and calendar invitations.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Compress repetitive hiring operations while keeping multi-agent decisions understandable and reviewable.

**Observed direction:** Technical automation aesthetic with bold metrics, role cards, system badges and a timestamped terminal-style log.

The terminal-like `agent_activity.log` is the most distinctive surface. Timestamped candidate, recruiter, screener, outreach and scheduler events turn a vague autonomy claim into a readable sequence, while the five role cards divide the system into understandable responsibilities. Metrics above the fold are strong attention anchors, though “zero clicks” risks suggesting the removal of necessary human judgement rather than mere administration. For a hiring product, the interface should visibly include review thresholds, override controls, consent, retention and an audit trail for every score and message. Résumé scoring is described on a 0–100 scale with reasoning and criteria; the design must reveal evidence, missing information and policy constraints instead of allowing a single number to dominate. The activity log should offer plain-language summaries, filtering by candidate and severity, and a pause/escalate control near automated actions. Technology badges help developers assess the prototype but matter less than a sample recruiter workspace. The waitlist asks users to identify as HR/recruiter, founder, candidate or other; tailoring the follow-up view to those roles would make that segmentation useful.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Outcome metrics → three-step flow → five agents → live activity evidence → stack → role-based waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Job brief, criteria editor, score/evidence card, outreach approval, scheduling panel, calendar event and audit log.
- **Required states:** Define pending review, approved, contacted, replied, scheduled, low confidence, overridden, paused and failed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Translate log colour/status into text; keep tables and timelines navigable by keyboard and readable on mobile. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The transparent event stream and clear allocation of responsibilities across specialised agents.
- **Change first:** Add visible human governance, bias checks and candidate-data controls before celebrating fully autonomous throughput.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 42. [HuntLy](https://huntlylanding.vercel.app/)
*Category: AI-assisted technical recruiting · Access: Beta waitlist · Reviewed: 22 Aug 2026*

**Interface context:** HuntLy is an AI hiring assistant for technical teams.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Help lean technical teams move from an informal hiring brief to an evidence-backed shortlist faster.

**Observed direction:** Conventional polished SaaS landing layout with statistics, comparison cards, product screenshots and tiered pricing.

HuntLy uses a familiar SaaS structure—hero, outcome statistics, before/after comparison, feature modules, product imagery, roadmap, pricing and application—which makes a broad recruiting product easy to scan. The natural-language search proposition is strongest when paired with ranked-profile and analytics mockups: together they suggest the path from query to shortlist rather than isolated AI features. The page nevertheless repeats performance claims and feature ideas across a long scroll, while sensitive promises such as bias reduction receive less explanation than they need. A better centrepiece would be one fictional engineering role with a visible search query, ranking criteria, candidate evidence, recruiter adjustment and final shortlist. Upcoming authentication and question-generation features should be visually separated from working beta capabilities. Candidate cards need provenance, consent status, last-updated time and reasons for ranking; analytics should distinguish pipeline facts from model predictions. Pricing is unusually concrete for a waitlist product, but the tiers should map to inspectable limits. A concise beta-status banner and sample workspace would improve trust more than additional headline statistics.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/waitlist → before and after → search/ranking/dashboard features → roadmap → pricing → application.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Natural-language query, criteria controls, ranked candidate card, résumé viewer, shortlist and pipeline analytics.
- **Required states:** Separate live, beta and upcoming features; show searching, no match, uncertain rank, saved, contacted and withdrawn.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide mobile list views and text reasons for ranks; do not encode candidate status or score by colour alone. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The clear technical-recruiting niche and connection between conversational search, ranking and analytics.
- **Change first:** Consolidate repeated claims and surface ranking evidence, consent and human adjustment in a public sample workflow.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 43. [ArcWorker](https://arc-worker.vercel.app/)
*Category: Stablecoin work marketplace · Access: Invitation-only private beta · Reviewed: 22 Aug 2026*

**Interface context:** ArcWorker calls itself a liquidity layer for digital work, connecting organisations that need microtasks, freelance work or AI-training labour with workers paid instantly in USDC.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make globally distributed digital work programmable while keeping task verification and settlement visible to both sides.

**Observed direction:** Protocol-oriented presentation with status indicators, split-audience cards, code blocks, campaign data and wallet feeds.

The dual entry cards solve an important marketplace problem: workers and hiring organisations can immediately choose a relevant path. Protocol-status language, an SDK code sample and transaction-like cards create a credible infrastructure tone, while the campaign-validation panel and wallet/task feed turn settlement into visible product moments. The site also combines several difficult concepts—labour marketplace, verification, stablecoin payment, global payout and yield—which can overwhelm users or blur which party assumes each risk. A role-specific journey would help: a hirer creates a bounded campaign and funds escrow; a worker completes a task, sees verification evidence and receives settlement. Financial information needs exceptional precision. The displayed APY should include timestamp, variability, eligibility, fees and jurisdictional constraints, and “secured” or audited claims should link to inspectable evidence. Task values and wallet balances require sample-data labels. The page contains a “gloabl payouts” typo, a small but costly trust defect in a financial product. Product interfaces should prioritise payment status, dispute/appeal and identity/region restrictions above protocol marketing.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Network status/hero → Earn or Hire → SDK/solutions → yield → three-step settlement → enterprise/talent views → invite.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Campaign builder, escrow/funding status, task feed, verification record, dispute flow, wallet and settlement receipt.
- **Required states:** Show draft, funded, in progress, submitted, disputed, verified, settled, failed and region-restricted states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Wrap code safely, provide structured transaction summaries and pair every status colour with text and timestamps. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The clear two-sided entry point and concrete code, campaign and wallet surfaces.
- **Change first:** Correct trust-eroding copy and add dated, jurisdiction-aware evidence for yield, custody, audits and payment claims.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---


## Founder, finance, accounting and procurement

### 1. [Buildory](https://buildory-online.vercel.app/)
*Category: Founder operations · Access: Waitlist — coming Q2 2026 · Reviewed 22 Aug 2026*

**Interface context:** Buildory is a pre-launch operating workspace for early-stage founders.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Turn an undeveloped, multi-part founder platform into one clear early-access proposition.

**Observed direction:** White ground, near-black type, vivid violet accent, bold Inter display type, and generously rounded controls.

Observed at desktop width, Buildory is a notably restrained single-screen launch page. A small brand mark and “Coming Q2 2026” label give way to a very large, bold Inter headline, with the line break between “Needs” and “One Platform” providing the dominant visual rhythm. The canvas is white, copy is near-black, and violet is used consistently for the logo, subtle decorative marks, and the rounded waitlist button. A short centered form—work-email field plus CTA—is immediately followed by overlapping avatar illustrations and the founder-count proof point. Four low-density feature tiles sit in a single row beneath the hero, each pairing a short title with an uppercase functional label. The page has no conventional navigation and almost no scroll depth, which keeps the launch goal unambiguous. Its strength is confident hierarchy with very little noise; its weakness is that the four product claims remain abstract, with no screenshot, workflow, or credibility detail to help a founder picture the actual workspace. The clickable outer container and sparse semantic landmarks also deserve an accessibility pass.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#09070E` |
| Primary surface | `#14101D` |
| Raised / alternate surface | `#1D1629` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#332540` |
| Primary accent | `#A78BFA` |
| Secondary accent | `#7C3AED` |
| Accent family detected | violet |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand/status → promise → waitlist → social proof → four capability summaries → minimal footer.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px low-contrast border using #332540; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#A78BFA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Oversized hero, email capture, primary CTA, avatar stack, and four compact feature tiles.
- **Required states:** Required email validation and waitlist submission are the only meaningful public states observed.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** The short layout should stack cleanly; verify feature-card wrapping, focus visibility, error messaging, and the semantics of the clickable wrapper. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The singular conversion goal, strong headline scale, and disciplined violet accent.
- **Change first:** Add one believable workspace preview and expand each pillar with a concrete founder task or outcome.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 2. [ZERINIX](https://zerinix.vercel.app/)
*Category: Founder planning and market intelligence · Access: Private beta / early-access request · Reviewed 22 Aug 2026*

**Interface context:** ZERINIX presents itself as a premium AI strategy workspace for founders before they spend capital, hire, or pitch.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Position founder diligence as a serious, protected strategic workspace rather than a disposable chatbot.

**Observed direction:** Black canvas, white/gray type, mint accent, Geist typography, hairline borders, translucent panels, and fully rounded CTAs.

ZERINIX uses a long, highly polished dark landing page that feels closer to an investor-facing product brief than a generic AI launch template. The inspected page uses Geist, a black ground, white typography, muted gray secondary text, and a bright mint-green accent reserved for status indicators and pill-shaped CTAs. A 72-pixel, medium-weight hero establishes an unusually calm hierarchy; the adjacent scripted “AI strategy session” demonstrates streaming steps, a founder prompt, and the report-building sequence without requiring interaction. Subsequent sections alternate broad editorial statements with crisp card grids for plans, diligence, memory, and governed usage. A four-part “Positioning / Competition / Revenue / Roadmap” strip and three pricing cards make the eventual information architecture legible. Navigation anchors Platform, Pricing, FAQ, and Security, with “Developer Login” visibly secondary to “Request Early Access.” There is no stock imagery—the visual storytelling comes from product-like panels, fine borders, soft translucent surfaces, diagrams, and numerous small SVG details. The page is information-rich but coherent across substantial scroll depth. Its main weakness is repetition: similar dark cards and multiple access CTAs reduce distinction between sections, and smaller gray copy may become tiring on the near-black surface.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#4ADE80` |
| Secondary accent | `#16A34A` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Global anchors → product thesis/demo → platform modules → founder workflows → process → pricing → FAQ/security → final access CTA.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #2A2E35; translucent fill near rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Primary actions use `#4ADE80` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Simulated AI session, report cards, capability grids, plan cards, FAQ accordion, status chips, and paired primary/secondary pills.
- **Required states:** Streaming/progress states are represented in the demo; public actions resolve to access requests or developer login.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve the editorial reading order when grids collapse; verify contrast of muted copy, keyboard operation of FAQ items, and reduced-motion handling. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The boardroom tone, mint restraint, and unusually specific product simulation.
- **Change first:** Shorten repeated sections, clarify current versus planned features, and expose one redacted sample report.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 3. [Apex AI](https://apex-neiia.vercel.app/)
*Category: Private-market portfolio intelligence · Access: Private beta / connected-workspace login · Reviewed 22 Aug 2026*

**Interface context:** Apex AI is a conversational portfolio-intelligence layer for NEIIA’s private-market Deal Room, aimed particularly at investors in Nigeria’s energy economy.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make sophisticated private-market analysis feel conversational, grounded, and operationally safe.

**Observed direction:** Pale green-white canvas, forest text, emerald actions, white cards, Inter typography, and restrained rounded geometry.

The page is visually specific to institutional investing rather than dressed as a general AI assistant. Its light, slightly green-tinted background, very dark forest typography, saturated green CTAs, and pill buttons establish a credible finance palette without falling into navy-blue convention. Inter is used with a heavy 60-pixel hero. The compact header carries the NEIIA mark, an Apex beta label, four anchor links, and a strong “Launch Apex” action. Most persuasive is the hero’s large conversation panel: it combines a command-like prompt, a plain-language answer, three KPI tiles, and an actionable concentration warning. Further down, six signal cards, a full sample-conversation report, a three-step connection flow, beta metrics, and an FAQ build progressively from capability to evidence. There are no photographic assets; cards, rules, symbols, and portfolio numbers do the work. A dark-green beta band creates a useful tonal break before the lighter FAQ and footer. The hierarchy is excellent and the copy is unusually concrete. The main UX risk is that repeated launch links suggest immediate access even though a private workspace is required, while the lengthy sample analysis could benefit from collapsible detail on narrower screens.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#059669` |
| Accent family detected | green, emerald, blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Branded nav → conversational proof → signal taxonomy → sample report → three-step setup → beta status → FAQ → institutional footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Chat panel, KPI tiles, signal cards, recommendation block, process steps, beta-stat band, FAQ rows, and pill CTAs.
- **Required states:** The mockup shows thinking/response and completed action states; the real chat is gated behind a connected Deal Room.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack KPIs and signal cards without separating labels from values; keep finance notation readable and expose accordion state to assistive technology. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The real-number examples, sector-specific tone, and green institutional identity.
- **Change first:** Label gated CTAs more explicitly and let users expand or collapse the long sample output.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 4. [RealMargin](https://realmargin.vercel.app/cfo)
*Category: Cash-flow and profit intelligence · Access: Partial — seven-day trial onboarding; dashboard login gated · Reviewed 22 Aug 2026*

**Interface context:** RealMargin CFO is an Australian small-business finance assistant delivered through WhatsApp rather than a new dashboard.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Sell “no new dashboard” by making the familiar WhatsApp conversation the entire product story.

**Observed direction:** Light neutral canvas, black type, purple primary actions, Geist typography, broad whitespace, and fully rounded buttons/bubbles.

RealMargin’s compact page is unusually disciplined: three principal sections fit into roughly one and a half desktop screens. A soft light-gray canvas, near-black Geist type, and a vivid purple action color create a consumer-fintech feel. The hero’s 74-pixel, regular-weight headline is split into two blunt statements—“Your AI CFO” and “In your WhatsApp”—with an Australian provenance chip above and pricing reassurance beneath the primary pill CTA. The central visual is a carefully composed WhatsApp-style conversation mockup, not a generic screenshot. Alternating message bubbles demonstrate proactive alerts, a user question, an explanatory answer, and a forward-looking hiring scenario, giving the product more credibility than a feature checklist would. Three numbered steps below are concise and evenly weighted. The final dark panel flips to white type and repeats the offer with a purple button, while the existing-user login is deliberately low contrast. This page’s strength is that product, channel, audience, and price are understood immediately. Its weakness is equally clear: security, bank-connection consent, alert cadence, and the handoff from public page to onboarding are only lightly explained, which matters for a product asking to read financial data.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#C084FC` |
| Accent family detected | purple |

#### Typography

- **Display face:** `Geist`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Local provenance → channel-first promise → trial CTA → conversation proof → three-step setup → price close → existing-user link.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#7C3AED` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Provenance chip, hero CTA, WhatsApp transcript, numbered setup row, pricing close, and quiet sign-in link.
- **Required states:** Public states are CTA hover/focus and onboarding navigation; the mock chat depicts notification, question, analysis, and follow-up-offer states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep bubble reading order and speaker distinction when stacked; provide textual equivalents for any decorative chat icons and strong focus indicators. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The short page, concrete financial dialogue, transparent price, and single purple action color.
- **Change first:** Add a visible trust/security block and preview the exact consent and connection steps before trial entry.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 5. [Kontu](https://kontu.vercel.app/)
*Category: AI bookkeeping and accounting · Access: Beta waitlist; sign-in gated · Reviewed 22 Aug 2026*

**Interface context:** Kontu is an AI-assisted accounting system that combines receipt extraction, bank-transaction classification, anomaly detection, and local-tax configuration with a full double-entry ledger.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Present an affordable, automation-first replacement for established accounting suites.

**Observed direction:** Dark surfaces, white type, violet/gold accents, luminous panels, rounded cards, and icon-led feature blocks.

Kontu is a long, high-density launch page that tries to prove breadth before the product is open. The observed hero is dark with white display type and a strong “Your books. Automated.” headline; violet and warm gold accents distinguish automation, pricing, and calls to action. An animated-looking receipt-processing panel sits beside the opening copy and exposes vendor, date, amount, tax, and created-expense states. A six-card AI grid is followed by a denser twelve-item accounting matrix, a before/after switching argument, a phone-shaped mobile preview, an accountant-partner banner, tiered pricing, and the final waitlist form. This gives buyers unusual visibility into the proposed module map. Navigation covers Features, Pricing, migration, accountant partners, and sign-in. Icons and compact cards keep the 5,700-pixel page scannable, though the density is closer to a complete product catalogue than a focused beta narrative. Some displayed metrics (“2+ core features,” “18% uptime SLA,” and “0s receipt scan time”) read as fallback or calculation defects and materially weaken trust. The design is energetic and component-rich, but typography and accent usage need firmer consistency across its many sections.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#A78BFA` |
| Secondary accent | `#E7C75A` |
| Accent family detected | violet, gold |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Product nav → AI demo → AI functions → complete module map → switching case → mobile/partner offers → pricing → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#A78BFA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Receipt processor, feature cards, capability matrix, comparison cards, phone mockup, pricing tiers, toggle, and beta form.
- **Required states:** The demo represents scanning and expense-created states; monthly/annual pricing and waitlist inputs are the main public controls.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse dense matrices into a logical task sequence, preserve label/value relationships, and ensure luminous text and controls meet contrast targets. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The breadth made visible through real accounting vocabulary and the mobile/firm segmentation.
- **Change first:** Fix implausible metrics, reduce section repetition, and distinguish shipped, beta, and planned modules.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 6. [LedgerSync](https://ledgersync-landing.vercel.app/)
*Category: Bank-to-ERP automation for accounting firms · Access: Pre-launch waitlist · Reviewed 22 Aug 2026*

**Interface context:** LedgerSync proposes a bank-to-ERP automation layer for accounting and bookkeeping firms, especially those serving Nordic and European clients.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make invisible financial-data plumbing feel safe, legible, and immediately valuable to accounting teams.

**Observed direction:** White canvas, warm charcoal text, teal emphasis, Inter typography, fine gray rules, rounded operational cards, and restrained status color.

LedgerSync has the visual clarity of a mature B2B integration product. A white background, warm charcoal copy, teal accent, Inter typography, and moderate 10-pixel corner radii give it a trustworthy accounting tone. The 78-pixel hero uses a small green “sync” dot inside the headline, while an inline work-email field and teal waitlist button convert without leaving the page. Directly below, a substantial fake workspace is rendered with left navigation, summary copy, and a five-row client table showing transaction volume, named ERP, and status chips such as Synced, Syncing, and Review. That preview is followed by an integration-name strip, then three alternating explanation/diagram sections for bank connection, categorization, and firm oversight. Small transaction rows, a bank-to-ledger flow, and operational KPIs make the proposed workflow concrete. The final security cards, FAQ, and repeated email capture complete a conventional but polished funnel. At more than 6,300 pixels the page is long, yet distinct diagram types prevent monotony. Weaknesses are mostly product-state related: “Sign in” points back to the waitlist, several legal/footer links are inert anchors, and claimed performance figures need substantiation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#14B8A6` |
| Secondary accent | `#16A34A` |
| Accent family detected | teal, green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Anchor nav → waitlist hero → firm-dashboard proof → integration coverage → three workflow benefits → setup steps/KPIs → security → FAQ → final capture.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#14B8A6` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Inline email form, sidebar/table mockup, integration strip, transaction mapping rows, sync flow, KPI cards, security cards, and FAQ.
- **Required states:** Illustrations cover connected, live, synced, syncing, and needs-review states; the real public interaction is waitlist capture.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert the wide client table to labeled records on small screens, retain status text beyond color, and fix inert or misleading links. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The exceptionally concrete dashboard preview, clear exception-handling model, and restrained teal system.
- **Change first:** Validate public metrics, route sign-in correctly, and mark illustrative interfaces and future integrations explicitly.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 7. [AICountant](https://ai-countant.vercel.app/)
*Category: Chat-native AI bookkeeping · Access: Early-access request; account sign-in gated · Reviewed 22 Aug 2026*

**Interface context:** AICountant turns Telegram, Discord, and web chat into a receipt-to-ledger workflow for small businesses in the United States and Canada.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make bookkeeping feel as immediate as messaging while retaining visible human control.

**Observed direction:** Near-black surfaces, warm-white type, mint primary accent, muted purple support color, Geist typography, and fine outlined cards.

The observed page uses a near-black canvas, off-white Geist type, bright mint actions, and occasional purple-muted copy to create a precise “financial developer tool” mood. Its opening chat mockup is particularly effective: a receipt appears as a familiar message, followed by extracted fields, a 94% confidence label, and Confirm, Edit, and Flag controls. That single sequence communicates capture, machine uncertainty, human approval, and ledger creation before the broader feature grid begins. The rest of the page is much longer—roughly ten desktop sections—covering the three-step process, chat channels, jurisdiction handling, review tools, integrations, trust principles, FAQs, and a final email form. Compact dark cards, outlined chips, and line icons keep the density coherent, while explicit statements about explainability and “guidance, not guarantees” temper the AI promise. The principal weakness is narrative length: similar automation and review concepts recur in several sections, pushing key matters such as data retention and export ownership far down the page.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#C084FC` |
| Secondary accent | `#7C3AED` |
| Accent family detected | purple |

#### Typography

- **Display face:** `Geist`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Channel-first hero → receipt conversation → three-step workflow → capabilities → integrations → trust → FAQ → early access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#C084FC` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Chat transcript, confidence chip, approval buttons, ledger row, feature grid, integration badges, trust cards, and email form.
- **Required states:** Captured, extracting, low/high confidence, duplicate warning, edit, flag, approve, queued, and exported states are represented.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve transcript order on narrow screens, label confidence independently of color, and expose receipt imagery with useful alternative text. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The specific receipt example and explicit approval model.
- **Change first:** Shorten repeated sections and surface retention, permissions, and deletion policies beside the first trust claim.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 8. [FlashLedger](https://v0-flash-ledger-mvp-architecture-tswigt.vercel.app/)
*Category: AI ledger review and reporting · Access: Open upload MVP; sign-in present · Reviewed 22 Aug 2026*

**Interface context:** FlashLedger is a compact browser MVP for turning an uploaded general ledger into an AI review and a configurable report.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Provide the shortest possible route from ledger file to AI-assisted review.

**Observed direction:** Deep navy ground, white text, bright cyan emphasis, system sans-serif, low-radius panels, and restrained borders.

Unlike a marketing funnel, FlashLedger opens directly onto the product. The entire observed desktop interface fits in one viewport: a dark navy surface, white system type, cyan brand accent, slim header, and a centered operational panel. Three equal tabs establish the workflow immediately, with Upload Ledger active and AI Review and Report Builder awaiting data. Within the selected tab, Upload File and API Connection provide a second level of segmentation. The generous dashed drop zone, accepted-format note, integration-name row, and full-width Start AI Analysis button create a logical top-to-bottom path. Disabled styling correctly prevents premature analysis, although its contrast is subtle against the already dark panel. This economy is the design’s strength; there are no testimonials or inflated metrics between a visitor and the task. Its weakness is insufficient reassurance at the point of risk. File-size limits, expected ledger columns, processing/privacy behavior, deletion policy, and a downloadable sample are absent. The generic browser title “v0 App” also signals that metadata and launch polish remain unfinished.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#22D3EE` |
| Secondary accent | `#0891B2` |
| Accent family detected | cyan |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Header → three-stage workflow tabs → source-method tabs → upload zone → integrations → analysis action.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#22D3EE` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Stage tabs, method switcher, drag-and-drop input, format guidance, integration list, and disabled primary button.
- **Required states:** Empty, drag-over, file selected, invalid file, uploading, analyzing, review ready, and report-ready states should form the core state model.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack long integration names, keep tabs keyboard-operable, announce upload progress/errors, and increase disabled-state distinction. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The direct-to-product entry and one-screen discipline.
- **Change first:** Add a sample file, schema and size guidance, privacy notice, richer empty states, and proper page metadata.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 9. [Finuera](https://finuera.vercel.app/)
*Category: AI financial document analysis · Access: Partial — public product page; account and VedAI workspace gated · Reviewed 22 Aug 2026*

**Interface context:** Finuera is an AI financial-analysis concept built around “VedAI,” an assistant that accepts CSV files, PDFs, and photos, then converts them into charts, patterns, and question-driven insights.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Present financial analysis as approachable, modern, and conversational rather than spreadsheet-heavy.

**Observed direction:** Dark neutral ground, cobalt accent, white type, rounded display lettering, diffuse glow, and bordered cards.

Finuera uses a near-black canvas, white copy, cobalt-blue actions, and rounded Comfortaa typography. The 52-pixel hero—“Master Finance with AI-Powered Insights”—is centered and spacious, followed by clear account and VedAI calls to action. Four capability cards create the first scannable layer; an “Under the hood” section then groups the VedAI layer, modern stack, and data handling before a three-step upload/analyze/decide sequence. Navigation is compact—Features, Technology, Pricing, Log In—and a working light/dark switch is an unusually useful piece of public interaction. The page remains visually consistent through roughly 3,600 pixels of scroll and avoids stock photography, relying instead on typography, icon cards, soft blue glows, and fine boundaries. That restraint also reveals the main gap: there is no real chart, extracted table, conversation, or result state to demonstrate what “living charts” and “focused insights” mean. Several calls to action do not expose a destination, so the funnel feels less complete than the surface treatment.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Promise/actions → capability cards → technical layer → three-step workflow → closing VedAI CTA.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Navigation, theme toggle, hero CTA pair, four-card grid, technology cards, and process steps.
- **Required states:** Theme switching and account navigation are observable; upload, analysis, chart, anomaly, and assistant states are only described.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Retain logical card order, test rounded display type at small sizes, and ensure the theme switch has a programmatic name and persisted state. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The calm pacing, compact navigation, and focused three-step explanation.
- **Change first:** Replace one abstract section with a credible end-to-end document and chart example, and fix non-routing CTAs.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 10. [Velqen](https://bennettai.vercel.app/)
*Category: AI finance operations toolkit · Access: Open tools; login available · Reviewed 22 Aug 2026*

**Interface context:** Velqen collects several finance-operations utilities on one public page.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Act as a friendly toolbox for discrete accounting-data tasks rather than a monolithic finance suite.

**Observed direction:** Warm ivory background, black typography and controls, large display scale, rounded image cards, and simple form panels.

The visual system is warmer and more editorial than most finance tools: an off-white canvas, dark Arial text, oversized 72-pixel headings, black controls, and photographic cards. “Pick Your AI Tool” introduces three large image-led options, but the page then repeats each function as a working upload section, producing nearly 4,000 pixels of vertical task UI. Invoice extraction uses a PDF drop zone; classification exposes its required CSV schema beside the file control; reconciliation places two source selectors before a disabled Start action. This openly inspectable utility layer is Velqen’s strongest design choice because it converts broad AI claims into tangible inputs. However, hierarchy is inconsistent. Every tool receives near-hero headline scale, the navigation appears duplicated in the accessibility snapshot, and card styling shifts between editorial imagery and utilitarian form panels. Disabled database/report actions are present without enough explanation, making it hard to distinguish unfinished functionality from unmet prerequisites.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Global nav → tool chooser → invoice OCR → classification → reconciliation → report/database extensions.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Image tool cards, file pickers, schema guidance, two-source reconciliation form, disabled actions, and report preview.
- **Required states:** Empty, selected file, invalid schema, parsing, classified, unreconciled, matched, and report-generated states need consistent treatment.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce heading scale on mobile, remove duplicate navigation semantics, label every file input, and announce disabled prerequisites. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** Public access to concrete tools and the classification field specification.
- **Change first:** Consolidate repeated introductions, unify tool-card and form styling, and explain data handling and unavailable actions.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 11. [SaaSOrder](https://saasorder-main.vercel.app/)
*Category: Enterprise technology procurement · Access: Public product tour; buyer workspace gated · Reviewed 22 Aug 2026*

**Interface context:** SaaSOrder is a technology-procurement marketplace and operating platform.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make complex multi-vendor buying feel like one governed enterprise storefront.

**Observed direction:** White ground, charcoal type, hot-pink primary accent, very heavy Inter display type, pills, screenshots, and logo-rich sections.

SaaSOrder looks like a mature enterprise marketplace at first glance. A white canvas, heavy Inter headlines, charcoal body text, and hot-pink pill actions give the 64-pixel hero a distinctive commercial edge. The navigation is extensive but understandable, separating Platform, Catalog, Customers, Partners, Pricing, News, and Contact. Procurement and Monetization tabs segment the two-sided proposition, followed by substantial product screenshots and a four-stage journey from catalog and vetting through compliance, consolidated PO, and optimization. Clickable category cards, vendor-logo bands, six benefit blocks, an FAQ, and repeated demo actions make the offering unusually broad and inspectable. The cost of that breadth is an 8,000-pixel page with several overlapping value sections. At capture, animated proof counters displayed zero for vendors, clients, annual spend, and savings; copy also alternated between 50+ and 500+ verified vendors. Those inconsistencies undermine an otherwise confident design. Some footer destinations were inert anchors, another sign that the polished surface is ahead of completion.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#F472B6` |
| Secondary accent | `#DB2777` |
| Accent family detected | pink |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Multi-page nav → two-sided hero → platform tabs/screens → four-stage journey → categories/vendors → benefits → FAQ → demo close.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#F472B6` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Buyer/vendor tabs, dashboard screenshots, journey cards, category tiles, vendor strip, trust badges, FAQ, and demo CTA.
- **Required states:** Tab selection, category exploration, catalog search, compliance routing, order approval, renewal alerts, and demo submission are central.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse the large nav deliberately, give screenshots useful text alternatives, and ensure animated counters retain meaningful fallback values.

#### Design decision

- **Preserve:** The differentiated pink identity and concrete procurement journey.
- **Change first:** Reconcile vendor claims, repair zero counters and inert links, and shorten overlapping benefit sections.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 12. [CarbonFlow](https://corbon2.vercel.app/)
*Category: Carbon accounting and sustainability compliance · Access: Partial — public tour; account workspace gated · Reviewed 22 Aug 2026*

**Interface context:** CarbonFlow is a Scope 1, 2, and 3 emissions-accounting platform positioned specifically for Indian small and midsize companies.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Translate carbon compliance into a locally relevant, supplier-centered operating workflow.

**Observed direction:** Dark navy foundation, white type, green environmental/data accents, Inter typography, gradients, and compact status cards.

CarbonFlow uses a deep navy canvas, white Inter typography, green highlights, and India-specific language to avoid the generic “green SaaS” feel. A 72-pixel “India’s Most Intelligent Carbon Platform” headline sits above compliance badges and an immediate free-start action. Six feature cards explain supplier links, calculations, reporting, security, and local scale; a four-step sequence then leads into a detailed dashboard illustration showing 247 suppliers, 48,210 tonnes of Scope 3 emissions, a reduction indicator, and row-level status chips. That concrete operating view is the page’s most persuasive asset. Two canvases and layered gradients add energy without depending on stock images. The page also surfaces industry chips and named reporting frameworks, giving buyers clear relevance signals. Trust suffers in a few visible places: captured counters read as zero, while “100% free forever,” “thousands of businesses,” and certification-style language are asserted without adjacent evidence. The design should distinguish measured customer data, illustrative figures, compatibility, and formal certification much more carefully.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#4ADE80` |
| Secondary accent | `#16A34A` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** India-first hero → frameworks/industries → six capabilities → four-step process → dashboard proof → trust → CTA.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#4ADE80` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Compliance badges, industry chips, capability grid, process steps, KPI dashboard, supplier table, testimonial, and signup action.
- **Required states:** Supplier invited, submitted, verified, overdue, calculation complete, exception, report generated, and audit exported should be explicit.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert supplier tables to labeled mobile cards, pair every status color with text, and provide reduced-motion handling for counters/canvases. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The Indian compliance specificity and supplier-level dashboard preview.
- **Change first:** Repair counter fallbacks, qualify illustrative metrics, and separate framework support from certification or regulatory approval.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---


## Legal, compliance and insurance

### 13. [Veylan](https://veylan.vercel.app/waitlist)
*Category: AI governance, security and compliance · Access: Waitlist · Reviewed 22 Aug 2026*

**Interface context:** Veylan is positioning an AI cybersecurity and compliance team for European SaaS companies.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Qualify serious European SaaS teams while making a broad compliance platform feel cohesive.

**Observed direction:** Deep navy, white type, blue actions, compact framework chips, clean grotesk typography, and softly bordered panels.

The waitlist page is compact but substantially more considered than a generic email capture. Near-black navy, white Plus Jakarta Sans/Inter type, and a clear blue accent establish a serious European-security tone. The hero explains cohort onboarding and shows four framework chips before a two-column form. That form collects full name, work email, company, job title, company size, multi-select compliance interests, an open challenge, and privacy consent. The breadth will yield useful qualification data, and the interest chips make the offering tangible; it also creates considerable commitment before visitors see product evidence. Below, a short explainer clarifies the AI-team metaphor and an additional newsletter form leads into a large, conventional footer. The visual hierarchy is strong, with a large promise, concise benefit list, bounded form panel, and restrained status color. The primary weakness is sequencing: a screenshot, sample evidence workflow, or control-to-audit example would earn the long form. Some secondary gray text on the dark canvas also warrants contrast testing.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Full product nav → waitlist promise/benefits → qualification form → platform summary → newsletter → footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Framework badges, benefit list, two-column fields, multi-select chips, consent control, primary submission, and newsletter capture.
- **Required states:** Default, selected framework, validation error, consent missing, submitting, accepted, and waitlisted states should be explicit.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse fields in a meaningful order, make chips true labeled controls, preserve visible focus, and increase muted-copy contrast. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The EU-specific framework focus and concrete interest selection.
- **Change first:** Put a real control/evidence example before the form and reduce required fields for first contact.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 14. [LegalFlow](https://legal-flow-neon.vercel.app/)
*Category: AI legal workflow demonstrations · Access: Open demo · Reviewed 22 Aug 2026*

**Interface context:** LegalFlow is a small collection of openly inspectable AI workflows for legal practice.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Let practitioners evaluate narrowly scoped legal AI automations without onboarding friction.

**Observed direction:** Dark navy surface, white Geist type, blue active control, gray borders, and compact application spacing.

LegalFlow opens as a compact dark application rather than a landing page. A near-black navy background, white Geist type, blue selected state, and fine slate boundaries organize the roughly one-screen workspace. The strongest element is the top three-part workflow selector: Client Update, Billing Narratives, and Deadline Extractor read as mutually exclusive tools rather than conventional navigation. In the active view, sample-matter buttons sit above a large textarea and a disabled Run Client Update Workflow action; a corresponding output panel begins empty. An “Under the hood” strip explains model, privacy, call count, and streaming behavior in plain language. This transparency is unusually useful for a legal AI prototype and makes the empty state feel intentional. The trade-off is product polish. The brand heading is only about 16 pixels, there is almost no orientation copy, and the technical maker/source footer carries nearly as much visual weight as the task. Without running a sample, the result format and error/retry design remain invisible.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand → workflow tabs → sample/input and output workspace → implementation/privacy facts → technical footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Segmented workflow control, sample chips, textarea, disabled run action, output pane, and “Under the hood” facts.
- **Required states:** Empty, sample loaded, ready, streaming, complete, copied, error, and cleared states are the essential sequence.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack input above output on small screens, announce streamed results, and make tab, chip, and disabled states keyboard-legible. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** Open access, task specificity, and visible no-storage/model disclosures.
- **Change first:** Strengthen brand/orientation hierarchy and show a safe example result without requiring user-provided text.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 15. [LexAI](https://lexai-app.vercel.app/onboarding)
*Category: AI legal practice management · Access: Open onboarding preview; operational data is demonstrative · Reviewed 22 Aug 2026*

**Interface context:** LexAI exposes a five-step onboarding flow inside a broad legal-practice application shell.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Onboard a legal practice while previewing the breadth of the eventual operating system.

**Observed direction:** Cream workspace, deep green rail, orange selection accent, dark system type, cards, and conventional app spacing.

This is the most application-like legal product in the set. A warm cream content area is paired with a deep green sidebar, dark text, and an orange active accent. The 40-pixel welcome heading leads into four benefit cards and a clear Get Started button, while a five-stage progress indicator explains the onboarding journey. The full left rail remains visible throughout, grouping Dashboard, Cases, Documents, AI Tools, Business, and Admin; nested items reveal a remarkably complete proposed information architecture. That authenticity is a strength because the onboarding does not float in an abstract marketing frame. It is also the chief weakness: dozens of destinations compete with the current step before a new user has configured a practice. Later step controls are detectable in the same document structure, including feature checkboxes and firm fields, so progressive disclosure should be verified rather than assumed. Small emojis appear beside otherwise polished iconography, and the dummy “DU” profile reinforces prototype status. The warm palette is distinctive and avoids default legal blue.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#EA580C` |
| Secondary accent | `#16A34A` |
| Accent family detected | orange, green, blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Persistent grouped sidebar + five-step practice setup + completion actions.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#EA580C` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Progress stepper, welcome cards, firm profile form, feature checkboxes, AI trial, next-step checklist, and user avatar.
- **Required states:** Not started, current, completed, validation error, skipped, sample analysis, and onboarding complete should be distinct.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert the rail to a labeled drawer, maintain step names beyond numbers, group checkboxes semantically, and avoid emoji-only meaning. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The credible module map and differentiated warm legal palette.
- **Change first:** Hide or mute nonessential navigation during setup and clarify which tools are live, optional, or forthcoming.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 16. [DealGuard](https://guard-deal.vercel.app/)
*Category: AI contract risk review · Access: Free public beta; paid plans coming soon · Reviewed 22 Aug 2026*

**Interface context:** DealGuard is an AI contract-review service aimed at people who want a fast warning before signing.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Interrupt risky signing behavior and convert urgency into an immediate contract check.

**Observed direction:** Black canvas, white heavy type, fluorescent yellow primary controls, red risk indicators, and bold rounded cards.

DealGuard is deliberately loud: a near-black background, white Arial type, fluorescent yellow actions, and a 104-pixel hero make “Stop signing contracts blind” impossible to miss. A central contract-analysis mockup quickly supports the provocative promise with a large risk score, red-flag cards, clause excerpts, and suggested language. The following three-step sequence and benefit cards are brief, while pricing makes the product state unusually transparent—free beta now, paid tiers later. Rounded yellow buttons and compact security badges establish a consistent interaction language against the severe canvas. This is memorable and conversion-focused, but the same volume can reduce credibility for a high-stakes legal task. Exact timing claims, an unlimited-free offer, and alarm-oriented copy need evidence. The legal disclaimer is appropriately present but located late. Privacy, terms, and contact destinations appeared as inert footer anchors at review, which is especially damaging when contracts may contain confidential material.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#FACC15` |
| Secondary accent | `#F87171` |
| Accent family detected | yellow, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** High-impact promise → review mockup → three steps → benefits → beta/future pricing → disclaimer/footer.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#FACC15` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Upload CTA, contract viewer, numeric risk score, red-flag cards, suggested edit, pricing tiers, and waitlist action.
- **Required states:** Upload, scanning, clause detected, risk graded, suggestion expanded, report exported, and failure should be explicitly sequenced.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Scale the extreme headline fluidly, pair severity color with text, support document keyboard navigation, and keep the disclaimer close to upload. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The concrete result mockup and transparent beta-versus-coming-soon pricing.
- **Change first:** Repair trust/legal links, foreground confidentiality handling, and soften unsupported speed or certainty claims.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 17. [Perfectly Legal AI](https://plai-landing-page-one.vercel.app/)
*Category: Collaborative deal and agreement infrastructure · Access: Private-beta application · Reviewed 22 Aug 2026*

**Interface context:** Perfectly Legal AI proposes a shared system for drafting, negotiating, approving, signing, and managing agreements across internal teams and counterparties.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Reframe agreements from files into durable, collaborative infrastructure for modern deals.

**Observed direction:** Warm white, near-black text, thin oversized display type, monochrome illustrations, broad whitespace, and compact black actions.

This is an unusually editorial legal-tech launch page. A warm off-white canvas, near-black system type, very light-weight 88-pixel hero, and sparse black buttons establish a quiet, premium identity. The page tells a long chronological story—Exchange, Record, Documents, Digital, System—using five large illustrations to argue that dealmaking has outgrown files. A subsequent manifesto explains shared and private layers, followed by six capabilities and a legacy/present/forward comparison. The restrained palette and generous spacing support the conceptual argument, and accessible image descriptions clearly identify each historical stage. At roughly 10,000 pixels, however, the narrative is exceptionally long before the private-beta form. Several themes recur verbatim, and there is no interface evidence to ground the “system” in an actual clause, approval, or visibility model. The seven-field form asks name, company, site, title, organization type, and intended use, which is reasonable for a selective beta but feels heavy after such a dense story. One CTA in the capture lacked a destination.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Minimal nav → manifesto hero → illustrated deal evolution → system definition → capabilities → category comparison → practitioner proof → beta form.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Historical stage carousel/sequence, editorial essays, capability list, comparison columns, qualification form, and repeated access CTA.
- **Required states:** Organization-private, shared, drafting, proposed, approved, executed, and obligation-active states need tangible representation.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve chronology when illustrations stack, constrain long line lengths, label all form fields explicitly, and keep light type readable.

#### Design decision

- **Preserve:** The differentiated editorial voice and clear shared-versus-private premise.
- **Change first:** Halve repetition, show one realistic deal-room workflow, and repair any non-routing access action.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 18. [DocuLegis](https://doculegis.vercel.app/)
*Category: AI legal document analysis · Access: Partial — public upload surface plus waitlist · Reviewed 22 Aug 2026*

**Interface context:** DocuLegis is a legal document-analysis prototype that accepts PDF, DOCX, and TXT files up to 10 MB.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Offer a low-friction path from legal file to AI risk questions.

**Observed direction:** Dark slate, white Inter type, bright blue action color, bordered utility cards, and restrained line icons.

DocuLegis presents a compact, utility-first surface on a dark slate background with white Inter text and bright blue emphasis. The 36-pixel “Welcome to DocuLegis” heading is modest; most attention goes to a large bordered upload card stating supported formats and the 10 MB limit. An adjacent or subsequent AI-assistant input is visibly disabled until a document exists, a useful prerequisite state that prevents false affordance. Three small feature blocks then summarize analysis, risks, and insights before a separate email waitlist card and footer. The blue action and restrained iconography keep the interface legible through only about 2,000 pixels of scroll. The main issue is product-state clarity: a visitor can seemingly upload a confidential contract while also being told to join a waitlist, with no explanation of whether the processor is live, local, temporary, or demonstrative. Several unlabeled icon controls appeared in the interaction tree. Generic feature language and the absence of an example result make the open upload feel riskier than necessary.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0B1017` |
| Primary surface | `#111923` |
| Raised / alternate surface | `#192431` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A394A` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.25rem, 4vw, 4rem) / 1.02–1.10`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Navigation → upload workspace → gated assistant → three capabilities → waitlist → footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A394A; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** File drop zone, format/size note, confidentiality copy, disabled question input, feature cards, and email capture.
- **Required states:** Empty, drag-over, invalid/oversize, uploading, analyzing, ready, question streaming, answer, and deletion confirmation are required.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Name icon controls, announce upload and analysis progress, link the assistant’s disabled reason, and maintain strong boundary contrast. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The stated file limits and honest disabled-until-upload behavior.
- **Change first:** Clarify launch status and retention before the upload, then provide a safe sample document and result.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 19. [Kesi Smart](https://kesi-smart.vercel.app/)
*Category: AI litigation and legal-practice operations · Access: Public product tour; demo by request · Reviewed 22 Aug 2026*

**Interface context:** Kesi Smart is a broad legal operating platform spanning litigation, prosecution, and advisory work.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Present one enterprise system as credible across distinct litigation, prosecution, and advisory workflows.

**Observed direction:** White ground, dark slate text, cobalt/indigo actions, large people imagery, soft feature panels, and Geist Sans typography.

Kesi Smart uses a conventional but polished enterprise palette: white canvas, dark slate Geist Sans, cobalt/indigo actions, and occasional soft-tinted panels. A 72-pixel “Navigate Justice with Intelligent Clarity” hero and two large legal-professional images create immediate authority. Six capability summaries lead into three more detailed module sections, followed by security controls, a four-step onboarding path, quantified outcomes, an extensive FAQ, and a large footer. At almost 7,000 pixels, the page contains enough detail for different legal personas, and the module language is much stronger than generic AI copy. Images break up card-heavy sections and the security block appears before conversion. The weakness is evidentiary and editorial: 99.5% accuracy, 15+ hours saved, 98.7%, 75%, 40% revenue improvement, and “thousands” of users are asserted without visible methodology. Eleven FAQs and repeated CTAs make the later page feel inflated. Several buttons had no detectable destination, while multiple footer links were inert.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#4F46E5` |
| Accent family detected | indigo |

#### Typography

- **Display face:** `Geist`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero/metrics → features → three vertical modules → security → onboarding → outcomes → FAQ → demo/footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#818CF8` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Hero image, metric pair, feature cards, module narratives, security tiles, process steps, FAQ, and demo CTA.
- **Required states:** Matter status, assignment, document analysis, research result, approval, deadline, audit event, and client update need interface proof.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve module hierarchy, provide useful image alternatives, ensure FAQ controls expose state, and avoid numeric proof conveyed only visually. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The detailed legal vocabulary and clear module segmentation.
- **Change first:** Substantiate or remove outcome claims, shorten the FAQ, and fix missing destinations before soliciting demos.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 20. [E360](https://lvmt.vercel.app/)
*Category: Legal case, time and invoice management · Access: Public product tour; signup/login gated · Reviewed 22 Aug 2026*

**Interface context:** E360 is a cloud practice-management system for individual lawyers and law firms.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Explain an end-to-end legal practice workflow to both solo lawyers and multi-role firms.

**Observed direction:** White surface, gray Montserrat text, blue primary actions, multicolor feature accents, rounded buttons, and illustrative graphics.

E360 has the recognizable feel of an earlier Bootstrap-era SaaS site: a white canvas, medium-gray Montserrat copy, saturated blue actions, eight-pixel buttons, and colorful cyan, violet, and pink feature headings. The 48-pixel hero states “Case Management made easier,” accompanied by an illustration and immediate Join Now action. Three feature columns for Client, Case, and Lawyer are followed by a practice/finance advantage section. The five-step guide is the strongest part of the 7,800-pixel page because it names exact fields, roles, and daily tasks; pricing then uses a monthly/annual switch and three clear plan cards. This operational specificity offsets dated styling. Completion issues remain conspicuous: “Priorties” and “pratice” copy errors, a duplicated word in the advantages section, and a review carousel containing generic sample names and filler copy. Several empty/unlabeled carousel buttons and tiny tracking-image assets also weaken accessibility and trust. The pricing toggles’ selected state needs clearer text.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#0891B2` |
| Accent family detected | blue, cyan, violet, pink |

#### Typography

- **Display face:** `Montserrat`; use it for the hero and major section statements only.
- **Body/UI face:** `Montserrat`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Navigation/hero → three entities → practice advantages → five setup steps → pricing → reviews → footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Feature columns, process timeline, role descriptions, monthly/annual toggle, tier cards, testimonial carousel, and signup CTAs.
- **Required states:** Role creation, client/case setup, timer/manual entry, invoice drafted/sent/paid, and trial expiry should be visible.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack the long process logically, label carousel controls, expose pricing selection programmatically, and verify decorative image handling.

#### Design decision

- **Preserve:** The unusually detailed five-step practice workflow and clear solo/team packaging.
- **Change first:** Remove demonstration testimonials, correct copy, modernize spacing/type hierarchy, and show a real case-to-invoice screen.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 21. [EarCodeX](https://earcodex.vercel.app/)
*Category: Insurance administration · Access: Open prototype · Reviewed 22 Aug 2026*

**Interface context:** EarCodeX presents an operating layer for South African insurance brokers, administrators, and insurers.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Establish a locally grounded, audit-oriented operating system for complex insurance administration.

**Observed direction:** Deep navy, white/slate text, gold emphasis, oversized uppercase display type, documentary photography, and crisp line icons.

The landing page commits to a high-contrast enterprise aesthetic: a near-black navy ground, white and cool-slate copy, restrained gold accents, and a very large uppercase hero. It is a long, densely sectional page, but repeated module groupings make the breadth legible. Photography of Black insurance professionals and South African infrastructure gives the product a specific identity rather than the usual anonymous fintech treatment. The page moves from industry problems to a module map, operational scenarios, a live-platform frame, and deeper platform links. Small status labels, icon-backed capability cards, and horizontal groupings suggest an assurance console rather than a consumer claims app. The design feels credible when it names binder contracts, reconciliation, and audit trails; it feels less settled when “prototype—active development” sits beside language presenting the system as already fully operational. Some primary-looking buttons lack destinations, and a temporary voice-retrieval link is visibly unfinished. The floating assistant also competes with the main demo path.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#E7C75A` |
| Secondary accent | `#B58A16` |
| Accent family detected | gold |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Development notice → promise and proof → operational problems → modules → platform preview → integrations and audit story → demo/contact.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#E7C75A` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Capability cards, workflow bands, product frame, navigation mega-menu, evidence statements, photography panels, and assistant launcher.
- **Required states:** Make prototype, planned, available, processing, exception, reconciled, and audit-ready states explicit.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Retain readable contrast, reduce hero scale on narrow screens, give icon-only controls names, and avoid obscuring content with the assistant. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns. Provide accessible names and at least 40×40px touch targets for icon controls.

#### Design decision

- **Preserve:** South African specificity and the unusually complete insurance-operations module map.
- **Change first:** Reconcile prototype/live-product language, repair inactive CTAs, remove temporary links, and show one claims-to-reconciliation journey in detail.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 22. [SiteSherpa WHS Dashboard](https://ss-website-sigma.vercel.app/platform/dashboard)
*Category: Workplace health and safety · Access: Detailed preview; demo gated · Reviewed 22 Aug 2026*

**Interface context:** SiteSherpa’s WHS dashboard page describes real-time, multi-site workplace-safety oversight for construction, mining, government, manufacturing, transport, facilities, and regulated operations.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make live, multi-site compliance feel calmer and more actionable than weekly spreadsheet reporting.

**Observed direction:** Warm neutral background, dark teal text, restrained accents, generous whitespace, rounded product imagery, and straightforward sans-serif type.

The page uses a warm off-white canvas with deep forest-teal typography and an understated, mature safety-software tone. A medium-weight 60-pixel hero leads into compact badges—Real-time, Multi-site, Exportable, Role-based views—before a dashboard image gives the claims a tangible anchor. The hierarchy is strong: six concrete dashboard outcomes are followed by a numbered four-step flow, then a summary checklist, adjacent platform modules, industries, and a broad trust-oriented footer. A large navigation system exposes the platform’s real breadth, from SWMS AI and voice reporting to permits, contractors, documents, observations, and inductions. That depth is reassuring, though 80-plus links create cognitive overhead for someone evaluating this one feature. Repeated “Book a demo” actions are clear, and cookie choices are unusually direct (“Accept” and “Decline”). The page’s principal weakness is that most interface evidence is concentrated in one image; important overdue, trend, role, and drill-down states are described rather than interactively demonstrated.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#14B8A6` |
| Secondary accent | `#5EEAD4` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Platform navigation → outcome-led hero → dashboard capabilities → four-step ingestion/calculation flow → field benefits → related modules → trust/footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#14B8A6` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Status badges, dashboard screenshot, capability blocks, numbered steps, checklist, industry links, demo CTAs, and cookie notice.
- **Required states:** Show normal, warning, overdue, expired, assigned, acknowledged, closed, exported, and role-filtered views.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse the mega-navigation carefully, preserve dashboard-image legibility, maintain heading order, and include descriptive image alternatives and keyboard-visible menus. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Calm palette, concrete field vocabulary, and the clear flow from incoming events to exportable evidence.
- **Change first:** Add an open, redacted dashboard tour and reduce duplicated navigation choices on feature pages.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 23. [Contractor Ready](https://compliance-checks.vercel.app/for-contractors)
*Category: Contractor readiness and compliance · Access: Partial; start-free CTA · Reviewed 22 Aug 2026*

**Interface context:** Contractor Ready helps small operational teams determine whether workers, vehicles, machinery, equipment, and company documents are ready before a job starts.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Give dispatchers a quick, defensible answer to “can this crew and equipment start?”

**Observed direction:** Pale slate surface, navy copy, teal action color, small-radius cards, compact system type, and minimal ornament.

This is an unusually compact SaaS page: a light slate canvas, deep navy text, teal primary action, simple system typography, and almost no decorative media. The nav immediately separates Clubs, Contractors, Document expiry, Sign in, and Start free. The hero—“Know whether every worker and asset is ready before work starts”—is followed by pain points, the status model, and a credible dispatch scenario. That operational sequence is the visual and narrative core, even though the page does not show an actual product screenshot. Dense information is handled as short, bordered explanation blocks rather than illustration-heavy marketing. The result feels fast and honest, with local service categories such as plant hire, cleaning, landscaping, and facilities management making the audience concrete. The legal disclaimer is a trust strength. Weaknesses are mostly evidentiary: a QR/calendar feature is described without an interface example, the demo route is an external email action, and inconsistent “ContractorReady” spacing slightly undermines polish.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#5EEAD4` |
| Secondary accent | `#14B8A6` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Audience navigation → readiness promise → fragmented-process pains → status framework → dispatch example → calendar sharing → scope disclaimer → start/demo.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#5EEAD4` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Readiness chips, requirement groups, crew/asset rows, exception callouts, scenario card, calendar/QR block, and legal-scope notice.
- **Required states:** Ready, expiring, action needed, not ready, unconfigured, evidence requested, accepted, and scheduled should be visually distinct.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep status meaning textual as well as colored, support keyboard review, and ensure dense crew/asset comparisons remain scannable on phones. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Operational specificity, compactness, and the explicit limit on what the product certifies.
- **Change first:** Add a redacted readiness screen, convert the demo email into an on-site explainer, and standardize product naming.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 24. [CALTRACK](https://caldimwebsite.vercel.app/products/caltrack)
*Category: Field-service workforce operations · Access: Preview access · Reviewed 22 Aug 2026*

**Interface context:** CALTRACK is a planned CALDIM Software Division product for service dispatch, payroll automation, GPS time capture, mileage and route logging, customer booking, and labour-compliance workflows.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Extend an engineering-services brand into an integrated field-work and payroll product.

**Observed direction:** Corporate navy, bright neutral surfaces, strong logo presence, clean sans-serif hierarchy, line icons, and consistent rectangular sections.

CALTRACK sits inside a conventional corporate site rather than a standalone startup microsite. A full navigation system—Home, About, Services, Products, Industries, Contact—provides organizational context, while a “System Overview” introduces six capability blocks. The visual language is restrained and industrial: a dark/navy-led brand treatment, high-contrast light sections, logo-forward header and footer, simple line icons, and tidy feature groupings. That consistency makes the concept feel connected to an engineering services business. The page is concise enough to scan and the repeated preview-access CTA accurately signals development status. However, it does not expose a real dispatch board, mobile clock-in view, route map, payroll exception, or booking form. Benefit statements dominate evidence, and absolute language around compliance and errors raises expectations beyond what the visible preview supports. A more product-led page would connect one scheduled job through GPS proof, approved hours, mileage, and payroll export.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Corporate navigation → product overview → six planned capabilities → outcome claims → preview-access/contact CTA → company footer.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Capability cards, overview copy, benefit metrics, product navigation, contact actions, and corporate trust information.
- **Required states:** Scheduled, dispatched, en route, arrived, clocked in, exception flagged, supervisor approved, and payroll exported need visible definitions.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Maintain touch-sized navigation and CTAs, pair GPS/status colors with labels, and keep long corporate menus manageable on mobile. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Clear development-stage CTA and the coherent connection to CALDIM’s wider service portfolio.
- **Change first:** Replace absolute outcome promises with evidenced targets and add a connected desktop/mobile workflow preview.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---


## Property, construction, logistics and field operations

### 25. [Logiset](https://logiset.vercel.app/)
*Category: Fleet management · Access: Public tour; demo request · Reviewed 22 Aug 2026*

**Interface context:** Logiset is a logistics control system for dispatching trips, monitoring vehicles, planning maintenance, and understanding fleet economics.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Present fleet work as a live, measurable system rather than a collection of calls and spreadsheets.

**Observed direction:** Near-black canvas, white hierarchy, indigo-blue signals, bold display type, fine dividers, and technical SVG interface frames.

The landing page uses a near-black field, crisp white type, and saturated indigo-blue accents to create a control-room mood. A very large, bold hero sits above a narrow telemetry strip containing a vehicle, utilisation, ETA, alert count, and “system operational” message. That strip is an effective bridge from marketing promise to product behaviour. Farther down, a densely composed dashboard frame mixes KPI cards, fleet rows, route information, maintenance warnings, and an activity feed; the SVG-built interface stays sharper than a decorative screenshot. Sections then isolate Trip Dispatch, Fleet Status, Analytics, and Maintenance, reducing an otherwise broad system into understandable operational jobs. Small all-caps labels and fine grid lines reinforce precision, although the dark palette and compact secondary text could become tiring at real dispatching density. The long page repeats value claims more often than it demonstrates interaction, and the zero-state headline metrics risk looking broken before animation completes.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#60A5FA` |
| Accent family detected | indigo, blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero telemetry → operating problems → dispatch and fleet platform → analytics → maintenance → network/activity evidence → demo.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#818CF8` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Fleet KPI strip, vehicle table, status chips, route map, alert cards, maintenance queue, activity feed, and demo CTA.
- **Required states:** Available, dispatched, en route, delayed, arrived, maintenance due, overdue, alert acknowledged, and trip closed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep telemetry labels readable on small screens, provide non-colour status cues, and offer table alternatives when dense views stack. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The operational hero strip and the strong connection between dispatch, maintenance, and cost.
- **Change first:** Stabilise animated counters, increase small-text contrast, and expose one redacted trip workflow with drill-down and exception handling.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 26. [CaseWorks](https://caseworks-gestao-de-obras.vercel.app/)
*Category: Construction operations · Access: Dashboard preview; fuller system gated · Reviewed 22 Aug 2026*

**Interface context:** CaseWorks is a Portuguese-language construction operating system that brings planning, site execution, purchasing, and finance into one project record.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Unite office, field, schedule, supply, and cash information in one dependable construction record.

**Observed direction:** Dark navy surfaces, bright white hierarchy, orange action color, blue status accents, compact sans-serif type, and structured data panels.

The site adopts a deep navy background with white text, restrained blue status accents, and a bright orange primary action. The contrast gives the system an industrial, premium feel while making the contact path unmistakable. Its hero statement—putting the whole project, from site to cash, in one system—quickly establishes scope, then a substantial dashboard preview provides more credibility than a typical module-only construction page. Progress figures, dates, service counts, and planned-versus-actual bars are arranged in a compact managerial hierarchy. Subsequent sections use a clear Plan, Execute, Control progression and separate desktop/office from mobile/field contexts before presenting the broader module catalogue. That sequencing suits buyers who need both an executive overview and operational breadth. The page is long, however, and the eighteen-module inventory becomes repetitive without task-level examples. Some module tabs behave like presentation selectors rather than a true product tour, and the dashboard does not visibly demonstrate delays, approvals, or cost exceptions.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#FB923C` |
| Secondary accent | `#60A5FA` |
| Accent family detected | orange, blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Whole-project promise → sample dashboard → company credibility → Plan/Execute/Control → office and field views → module catalogue → contact.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#FB923C` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Progress dashboard, schedule bars, KPI tiles, module tabs, capability grids, mobile/desktop frames, WhatsApp action, and lead form.
- **Required states:** Planned, in progress, delayed, blocked, awaiting material, inspected, approved, invoiced, and paid.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve chart labels and planned/actual distinctions on phones, avoid color-only progress meaning, and label tab controls for keyboards. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Concrete sample-project data and the field-versus-office framing.
- **Change first:** Shorten repeated module copy and add an open workflow showing a site update flowing into schedule and financial variance.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 27. [SistemaBox](https://sistemaboxpaginaoficial.vercel.app/)
*Category: Farm management · Access: Public tour; free-trial CTA · Reviewed 22 Aug 2026*

**Interface context:** SistemaBox is a Brazilian agricultural-management platform covering finance, inventory, spraying, fertigation, labour, packing and harvest, statistics, monitoring, and certification.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Make a broad farm back office understandable as modular, traceable workflows from inputs to packing and certification.

**Observed direction:** Agricultural green cues, light content surfaces, field photography, compact screenshots, numbered modules, and friendly line icons.

The long-form page combines agricultural photography with screenshots and a large icon-led capability catalogue. A farm-oriented green visual direction and bright neutral content surfaces keep the product recognisable without making the interface feel rustic. The strongest information choice is the numbered nine-module sequence: each operational area receives a clear name and bounded explanation, so a grower can map existing responsibilities to the system. Benefits such as multi-farm access, signatures, audits, and unlimited users appear before the certification list and pricing tiers, moving from operational value to compliance and purchase. Dashboard and login images provide some product evidence, but they are too limited to judge the density or hierarchy of daily work. Seventy-plus SVG elements and repeated benefit blocks make the page visually busy, while several contact and trial CTAs resolve to the same lead-capture destination. The certification logos are valuable trust cues, though the page should distinguish supported record structures from formal certification or endorsement.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Platform promise → digital-operation benefits → nine modules → certification support → plan comparison → trial/demo contact.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Module cards, benefit grid, dashboard image, certification marks, pricing tiers, contact form, and repeated trial actions.
- **Required states:** Draft, signed, applied, harvested, packed, stock low, inspection due, nonconformity open, and audit evidence complete.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Give certification images descriptive alternatives, keep long module lists collapsible, and ensure icon meaning is repeated in text.

#### Design decision

- **Preserve:** The specific certification context and complete farm-workflow vocabulary.
- **Change first:** Clarify endorsement boundaries, consolidate repeated CTAs, and show a traceable crop-lot journey across inventory, application, harvest, and audit.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 28. [Botea Pay](https://botea-pay.vercel.app/partners)
*Category: Maritime ticketing and fleet operations · Access: Public partner page; dashboard gated · Reviewed 22 Aug 2026*

**Interface context:** Botea Pay is a French-language operating and sales platform for maritime companies on Lake Kivu.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Give Lake Kivu operators a credible route from manual ticket sales to measurable, digital vessel operations.

**Observed direction:** Bright SaaS surfaces, clear sans-serif hierarchy, simple line icons, service-tier labels, and compact pricing blocks.

The page is structured as a concise partner pitch rather than a consumer booking journey. A direct “Digitise your maritime company” hero is followed by feature bands for dashboard visibility, digital ticketing, vessel management, and service classes, then pricing and a start-now action. Iconography carries much of the visual explanation: thirty-plus SVG elements replace photography and keep attention on operational concepts such as QR validation, reservations, and statistics. This yields a lightweight, modern SaaS feel and avoids the stock-tourism imagery common in transport sites. The hierarchy is easy to scan, but the public layer does not show a rendered timetable, boarding manifest, seat or capacity state, refund flow, or actual dashboard. Pricing is useful qualification, though moving from a plan card to email creates a discontinuity. For this geography, offline and low-connectivity boarding behaviour is also a consequential state that the design does not visibly explain.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Partner promise → dashboard outcomes → QR ticketing → fleet and class management → pricing → email/start action.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Departure inventory, QR ticket, scanner state, vessel card, class selector, fill-rate KPI, revenue summary, and plan comparison.
- **Required states:** Available, nearly full, sold out, booked, paid, ticket issued, scanned, duplicate scan, cancelled, and departed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Design scanner feedback for sunlight and weak networks, keep QR alternatives available, and pair all class/status colors with text. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Geographic and operator specificity plus the compact partner-page structure.
- **Change first:** Add an open redacted boarding flow, explain offline synchronisation, and replace the pricing-to-email jump with a transparent onboarding step.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 29. [Lab360°](https://smart-inventory-and-resource-manage.vercel.app/)
*Category: Educational laboratory operations · Access: Public feature page; role dashboards gated · Reviewed 22 Aug 2026*

**Interface context:** Lab360° is an all-in-one management concept for educational laboratories.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Turn fragmented academic-lab records into a shared, accountable resource and maintenance system.

**Observed direction:** Bright educational presentation, card-based sections, friendly icons, numbered solution markers, and clear role labels.

The landing page is organised as a teaching narrative: challenge cards establish six recognisable lab problems, numbered solution sections introduce unified assets, maintenance, analytics, and role access, and audience-specific blocks then translate the platform for administrators, technicians, and faculty. Icons and emoji-like illustrations make a technically broad system approachable, while the “360°” name and numbered progression reinforce completeness. Content density is handled through repeated cards rather than tables, which helps first-time scanning but leaves the actual management interface largely abstract. Detailed record fields—serial number, warranty, AMC, vendor, service and complaint data—are a strong sign that the concept understands asset operations. Yet QR scanning, timetable collisions, experiment approval, photo-based issue reporting, and audit history are described without visible interaction states. “AI analytics” is also less concrete than the maintenance and asset modules. The public page would benefit from one realistic dashboard frame that unifies these otherwise persuasive capabilities.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Platform promise → six challenges → four solution pillars → administrator/technician/faculty benefits → get-started route.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Asset record, QR label/scanner, booking calendar, maintenance ticket, photo evidence, audit log, role dashboard, and analytics card.
- **Required states:** Available, reserved, checked out, overdue, under service, warranty expiring, complaint open, approved, and audit logged.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Support keyboard calendar use, textual QR fallbacks, descriptive photo evidence, and status cues beyond icon or color. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Role-specific storytelling and the unusually detailed asset/maintenance field model.
- **Change first:** Replace generic AI language with specific outputs and expose a sample equipment record from booking through maintenance resolution.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 30. [InvictusERP](https://invictus-erp.vercel.app/)
*Category: Manufacturing ERP · Access: Public module map; workspace gated · Reviewed 22 Aug 2026*

**Interface context:** InvictusERP presents a manufacturing-first enterprise system spanning sales, purchasing, finance, fixed assets, statutory work, maintenance, warehouses, and bill-of-material forecasting.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Provide a unified manufacturing record linking commercial demand, materials, production assets, finance, and statutory obligations.

**Observed direction:** Not reliably observable in the live review; establish high-contrast neutral surfaces, restrained semantic colors, and dense but readable data type.

The reviewable public evidence is an information-architecture proposition rather than a dependable visual product tour. Grouping capabilities around sales, purchases, finance, assets, statutory work, maintenance, warehouses, and BOM forecasting signals broad ERP ambition and gives a prospective manufacturer useful vocabulary. It also exposes the design challenge: these modules contain very different entities, time horizons, and exception types, and a flat catalogue alone cannot show how they connect. Because the deployment failed to render consistently in the review session, palette, typography, component styling, navigation behaviour, and responsive quality could not be responsibly assessed. A stronger public layer would show one connected manufacturing scenario—forecast demand, calculate material needs, raise a purchase order, receive stock, issue components, record production, and post cost—rather than asking buyers to infer cohesion from module names. Development-stage honesty and a visible system-status message would also be preferable to an unstable or blank experience.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Role-based home → demand and sales → planning/BOM → purchasing → warehouse → production/maintenance → finance and statutory reporting.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** BOM tree, forecast table, purchase order, goods receipt, stock ledger, work order, asset register, maintenance queue, and journal trail.
- **Required states:** Draft, approved, ordered, partially received, allocated, in production, variance flagged, posted, and closed.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Prioritise keyboard-driven tables, persistent labels, downloadable alternatives, and mobile approval/exception views rather than shrinking full ERP grids. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The manufacturing-specific breadth and explicit inclusion of maintenance and statutory work.
- **Change first:** Restore reliable public rendering and demonstrate a connected, redacted order-to-production workflow before expanding marketing claims.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 31. [EstateFlow](https://estateflowapp.vercel.app/)
*Category: UAE real-estate CRM · Access: Demo; early access · Reviewed 22 Aug 2026*

**Interface context:** EstateFlow is an early-access CRM for Dubai and UAE real-estate agencies.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Sell a locally adapted, always-on lead engine to UAE agencies through speed, pipeline value, and compliance context.

**Observed direction:** Luxury editorial imagery, oversized display headlines, compact parenthetical labels, numbered chapters, neutral product panels, and prominent performance figures.

This is an exceptionally long, sales-led landing page with an editorial real-estate treatment: oversized split headlines, parenthetical section labels, numbered feature chapters, luxury-property photography, and many sharply stated outcome figures. The page moves from missed-lead pain through before/after economics, ten automations, a dashboard mock, source integrations, a second-by-second intake timeline, a revenue calculator, a day-in-the-life comparison, UAE-specific use cases, compliance, and a demo form. The strongest product evidence is the dashboard composition: four KPI cards sit above recent leads with 1–100 scores, location, bedroom type, budget, and Hot/Warm/Golden Visa/New tags. The timed intake sequence also makes automation legible. However, the page is much longer than necessary and repeats speed, follow-up, and revenue messages. Luxury stock imagery adds atmosphere but less proof than the interface frame. Numerous quantitative claims dominate the hierarchy and need clearer sourcing or “illustrative scenario” labels.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Lost-lead problem → outcome comparison → automation catalogue → dashboard → lead-source flow → calculator/timeline → UAE workflows → compliance → demo.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Lead inbox, score badge, KPI card, pipeline stages, listing match, WhatsApp timeline, payment reminder, revenue calculator, and demo form.
- **Required states:** New, scored, hot, warm, assigned, contacted, visit booked, negotiation, cold, re-engaged, and closed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce headline scale, keep calculator controls keyboard operable, label status beyond color, and avoid loading every large image before core content. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The concrete dashboard sample, timed intake explanation, and UAE-specific workflow vocabulary.
- **Change first:** Cut repeated claims, label hypothetical metrics clearly, and let prospects explore a short redacted lead-to-visit flow before the form.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 32. [PlotCRM](https://plotcrm.vercel.app/)
*Category: Plot-sales CRM · Access: Signup · Reviewed 22 Aug 2026*

**Interface context:** PlotCRM is an India-focused real-estate workspace for selling land plots.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Make plot sales feel clear, mobile, and personal for Indian agents without presenting a generic property CRM.

**Observed direction:** Oversized editorial headline, spacious neutral sections, concise sans-serif copy, property photography, and minimal feature groupings.

The page is concise and editorial compared with a typical feature-grid CRM site. A large “Land / In Motion” hero, restrained navigation, and generous empty space establish a property-brand mood before a short mission statement explains the operational promise. Three compact capability blocks—Plot inventory, Lead pipeline, and WhatsApp ready—do most of the product positioning. A second “Intelligence where it counts” section adds AI search, listing copy, analytics, brochures, and galleries, accompanied by a real-estate professional image. The sequence ends quickly with paired Sign in and Create account actions. This brevity gives the page confidence and makes the niche immediately clear, but it provides almost no interface evidence: buyers cannot see a plot map, availability matrix, site-visit calendar, pipeline, or brochure output. The cinematic headline and photography therefore carry more weight than the software. The two account CTAs are appropriately direct, though a sample inventory view would reduce the commitment required to understand the product.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand hero → mission → three core workflows → AI/analytics differentiators → account entry.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#16A34A` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Plot card, availability grid or map, lead record, site-visit scheduler, WhatsApp share sheet, brochure builder, gallery, and conversion summary.
- **Required states:** Available, held, booked, sold, visit scheduled, follow-up due, hot lead, brochure shared, and payment pending.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve the spacious reading order on phones, provide map/list parity, label plot status textually, and make media galleries swipe- and keyboard-friendly. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Memorable hero language, sharply defined Indian plot-sales niche, and short conversion path.
- **Change first:** Add a redacted inventory-and-lead preview and show how dimensions, availability, visit, and WhatsApp sharing connect.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 33. [Moment](https://v0-new-project-2fqiyompxuf.vercel.app/)
*Category: Real-estate brokerage operating system · Access: Private beta; demo or waitlist · Reviewed 22 Aug 2026*

**Interface context:** Moment is a private-beta operating-system concept for real-estate agents, teams, and brokerages.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Turn brokerage data into a daily, prioritised operating rhythm for prospecting, client retention, content, and team leadership.

**Observed direction:** Clean application chrome, restrained neutral surfaces, crisp sans-serif hierarchy, score and temperature accents, rounded metric cards, and sparse marketing copy.

Moment uses a polished product-led landing structure: a short private-beta banner and concise hero are immediately followed by a large application frame rather than decorative marketing art. A left rail lists Dashboard, Contacts, Activities, Contests, Content, Portals, and Vendors, while the contacts view combines summary KPIs with ranked people. Each row pairs a Hot/Warm score with a plain-language AI reason—equity up, nearby sales, ownership duration—which makes the intelligence more interpretable than a bare score. Subsequent feature sections embed realistic mini-interfaces for homeowner value, equity and market updates, content production, and team performance. Audience cards for Agents, Teams, and Brokerages clarify how the same system expands by organisational scale. The page is still claim-heavy, and some statistics are repeated as proof without visible methodology. “AI operating system” also overstates what the public demo can substantiate, but the interface examples create a coherent product model and the private-beta language sets an honest access expectation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Private-beta hero → contact dashboard → AI briefings → homeowner portals → content studio → team performance → audience tiers → waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Navigation rail, contact score row, AI rationale, equity card, market update, content composer, leaderboard, goal tracker, and portal preview.
- **Required states:** Cold, warm, hot, contacted, briefing ready, portal invited, portal active, content draft, scheduled, goal at risk, and goal achieved.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Make score rationale readable without hover, pair temperatures with text, support keyboard tables, and convert multi-column dashboards into prioritised mobile summaries. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Product-first hero, explanatory lead signals, and clear Agents/Teams/Brokerages segmentation.
- **Change first:** Source or qualify headline metrics and provide one click-through demo connecting an AI briefing to outreach and logged activity.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 34. [Brokerra](https://brokerra.vercel.app/landing)
*Category: Indian property-broker CRM · Access: Trial and login; roadmap visible · Reviewed 22 Aug 2026*

**Interface context:** Brokerra is an AI-assisted CRM for Indian property brokers, centred on preventing leads from going cold.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Translate informal broker follow-up habits into a visible daily queue and revenue pipeline for Indian property sales.

**Observed direction:** Bold sales headlines, bright dashboard cards, emoji-like problem symbols, semantic heat/status accents, rupee-led proof points, and dense section rhythm.

The landing page follows a dense, conversion-oriented SaaS pattern, but local currency and broker scenarios give it specificity. A large “Stop Losing Property Leads” hero sits alongside an application preview with 284 total leads, 47 hot, 13 overdue, and nine follow-ups. Four problem cards use emoji-style symbols, percentages, rupee examples, and direct language to frame WhatsApp chaos, forgotten calls, lost commissions, and poor visibility. Feature sections then introduce AI follow-up intelligence, a seven-stage Kanban board, conversion charts, a lead timeline, and exports. A numbered three-step onboarding sequence, testimonials, monthly/annual pricing toggle, and repeated free-trial actions create a complete sales funnel. Hierarchy is strong but crowded: aggressive monetary claims, many metrics, social proof, and repeated CTAs compete with the actual product. The roadmap disclosure on the pricing card is commendable, though other “AI” functions would benefit from equally explicit maturity labels.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Lost-lead promise → dashboard proof → problem cards → features → three-step workflow → testimonials → pricing/roadmap → trial.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Follow-up queue, lead heat score, seven-stage Kanban, activity timeline, source chart, conversion funnel, pricing toggle, and roadmap label.
- **Required states:** New, hot, warm, cooling, overdue, contacted, visit booked, negotiation, won, lost, exported, and integration coming soon.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve overdue priority on mobile, label heat beyond color, make Kanban keyboard operable, and ensure pricing toggles expose selected state. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** Indian brokerage vocabulary, visible dashboard example, and candid WhatsApp roadmap note.
- **Change first:** Reduce unsupported social-proof density, distinguish live from planned AI features, and offer a redacted trial tour before account creation.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 35. [HomePilot](https://v0-homepilot.vercel.app/)
*Category: Rental search and renter intelligence · Access: Demo / passport creation · Reviewed 22 Aug 2026*

**Interface context:** HomePilot is an AI rental coach for apartment seekers who want help finding suitable listings and presenting themselves as credible applicants.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make a stressful rental search feel guided, measurable, and winnable.

**Observed direction:** Bright neutral canvas, cool AI accents, Inter typography, rounded cards, and green status signals.

The reviewed landing page uses a familiar polished AI-SaaS structure, but its renter-specific data keeps it from feeling generic. A large promise-led hero moves quickly into a simulated dashboard, where the renter score, listing photography, price, and acceptance percentages establish the primary information model before the feature copy begins. Inter-based typography, bright surfaces, cool blue-to-purple accents, rounded cards, compact badges, and green success cues create an optimistic financial-product tone. Six feature cards and a numbered three-step sequence make a broad proposition scannable, while security and privacy claims sit near the conversion section. “Create Renter Passport” is the useful primary action; “View Demo” gives cautious visitors a lower-commitment path. The main weakness is evidentiary: predictive odds, scam detection, and compliance labels are prominent, but the public surface does not show how confidence is calculated or distinguish sample data strongly enough. A small methodology preview would make the interface more trustworthy.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#2563EB` |
| Accent family detected | green, blue, purple |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Promise → dashboard proof → capabilities → three-step workflow → trust → conversion.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Renter-score panel, property cards, match badges, alert tiles, feature cards, and CTA pair.
- **Required states:** Define monitoring, new-match, risk-warning, profile-incomplete, applying, and application-result states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack listing cards cleanly; pair every colour-coded score with text and support reduced motion. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The product mock and renter-passport concept, which communicate value faster than the surrounding claims.
- **Change first:** Label demo data, explain probability inputs, and substantiate security claims close to where they appear.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 36. [Foyer](https://fracct.vercel.app/foyer)
*Category: Property management and marketplace · Access: Coming soon · Reviewed 22 Aug 2026*

**Interface context:** Foyer presents an AI-positioned property dashboard intended to put day-to-day housing needs in one place.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Introduce a broad housing hub with an approachable, premium pre-launch identity.

**Observed direction:** White canvas, dark editorial type, blue emphasis, soft borders, rounded panels, and light shadows.

The page is an airy, editorial launch surface led by oversized two-colour headings: dark text provides the base while a theme-blue accent isolates important phrases. Content alternates between white space, large illustration or animation panels, and rounded cards with pale borders and restrained shadows. Responsive classes show deliberate desktop/mobile reflow, including stacked sections, a mobile menu, and image sizes that step down across breakpoints. The strongest visual move is the scale of the hero—“Real estate at your fingertips” reads as a confident brand statement—followed by distinct owner and partner pathways. Yet the page remains more mood board than product evidence. Several image labels are generic “animation” descriptions, some management language repeats across sections, and the AI positioning is not demonstrated through a recognisable decision, recommendation, or automation. Soft “Learn about” actions compound that ambiguity. One annotated dashboard frame, even with sample data, would establish what Foyer actually consolidates and give the otherwise attractive card system a functional centre.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(3.5rem, 7vw, 7rem) / 0.94–1.02`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Brand promise → owner capabilities → partner proposition → contact / early-interest actions.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Oversized headline blocks, animated media cards, capability panels, partner cards, and contact CTA.
- **Required states:** Design clear coming-soon, waitlist-confirmed, owner-selected, partner-selected, and launch-notification states.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Retain the mobile reflow; replace generic image alt text and provide motion-reduction controls. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The spacious hierarchy and clear visual separation between owner and partner audiences.
- **Change first:** Add a labelled product preview, specify the AI job, remove repetitive copy, and sharpen the primary conversion action.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 37. [Gruta House](https://grutahouse.vercel.app/)
*Category: Real-estate CRM and brokerage websites · Access: Public tour; signup for workspace · Reviewed 22 Aug 2026*

**Interface context:** Gruta House is a Brazilian real-estate platform combining lead capture, listing management, CRM, sales pipelines, automation, and branded public property pages.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Help Brazilian brokers see one system for winning leads, managing deals, and publishing a credible brand.

**Observed direction:** Bold sales-led typography, property photography, high-contrast cards, metric panels, and varied template previews.

This is a high-energy, conversion-heavy real-estate page with more product evidence than most early concepts. A prominent results-led hero is followed by large proof statistics, icon-led capability cards, a tangible four-metric dashboard preview, and a gallery of nine named site designs ranging from minimal and magazine-like to luxury and dark variants. Property imagery and template thumbnails suit the market, while repeated preview/select controls make customisation feel actionable. The drawback is density: software modules, a VIP WhatsApp group, a temporary-offer countdown, marketing services, social proof, locations, and signup prompts all compete within one long scroll. Portuguese and English appear together in visible interface copy, and the dashboard uses a dollar symbol despite the Brazilian focus; both make the experience feel unfinished. Large performance claims and urgency mechanics also need clear sourcing. The dashboard preview and template chooser should become the main narrative, with services and community content demoted to secondary paths.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Outcome promise → proof → product modules → website gallery → community/services → offer → signup.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** KPI cards, funnel preview, feature grid, template selector, property imagery, countdown, and WhatsApp CTA.
- **Required states:** Define template preview/selected, lead-stage, listing-status, automation-running, and offer-expired states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep template names visible on small screens; avoid relying on thumbnails or urgency colour alone. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The dashboard proof and broad template gallery, which make both operational and public-facing value concrete.
- **Change first:** Unify language and currency, reduce competing CTAs, source headline metrics, and remove or clarify artificial urgency.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 38. [LeadNexis](https://lead-nexis.vercel.app/)
*Category: Multi-tenant real-estate CRM · Access: Public tour / free trial · Reviewed 22 Aug 2026*

**Interface context:** LeadNexis is a modular CRM for real-estate agencies, channel partners, and sales teams.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Communicate operational completeness and configurability to growing real-estate sales organisations.

**Observed direction:** Neutral card surfaces, glass-like layering, rounded icon tiles, gradient accents, and light/dark themes.

LeadNexis uses a dense but orderly enterprise-SaaS visual system. A direct hero, top navigation by Features, Modules, Security, and Support, and paired sign-in/free-trial actions establish the hierarchy immediately. Below, a large matrix of translucent rounded cards maps one capability to one icon tile, short explanation, and supporting checklist. Soft borders, backdrop blur, subtle shadows, and hover lift add depth; orange-to-rose accents in the light treatment and blue-to-purple accents in dark mode prevent the feature inventory from becoming visually flat. Detailed stage names, inventory concepts, permission counts, and campaign functions provide stronger domain credibility than abstract “all-in-one” copy. Still, the page asks visitors to absorb many modules before showing a coherent daily workflow, and decorative gradients can make every section seem equally important. A single annotated agency workspace—lead arrives, unit is matched, deal advances, commission resolves—would improve comprehension and validate the card claims.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dual light/dark |
| Page canvas | `#FFFFFF / #090A0C` |
| Primary surface | `#F8FAFC / #111317` |
| Raised / alternate surface | `#F1F5F9 / #181B20` |
| Primary text | `#0F172A / #F7F8FA` |
| Secondary text | `#64748B / #9BA3AF` |
| Subtle text / metadata | `#94A3B8 / #6F7782` |
| Borders / dividers | `#E2E8F0 / #2A2E35` |
| Primary accent | `#EA580C / #60A5FA` |
| Secondary accent | `#E11D48 / #C084FC` |
| Accent family detected | orange, rose, blue, purple |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Platform promise → proof metrics → module matrix → security/support → trial conversion.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #E2E8F0 / #2A2E35; translucent fill near rgba(15,23,42,0.035) / rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Primary actions use `#EA580C / #60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Module cards, stage checklists, permission indicators, Kanban concept, analytics summaries, and CTA pair.
- **Required states:** Specify lead-stage transitions, drag feedback, permission denial, module disabled, sync delay, and empty analytics.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse the feature matrix by workflow; retain labels with icons and visible keyboard focus on hoverable cards. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The domain-specific module detail and modular architecture, which signal a serious operational product.
- **Change first:** Add an end-to-end workspace demo, prioritise core modules, and reduce equal visual weight across secondary features.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 39. [Renthuzz](https://renthuzz.vercel.app/)
*Category: Landlord operations and rent collection · Access: Partial; building in public · Reviewed 22 Aug 2026*

**Interface context:** Renthuzz is landlord software designed specifically for small Philippine rental portfolios.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Replace improvised Philippine landlord admin with one simple, trustworthy daily control room.

**Observed direction:** Charcoal surfaces, lime action colour, warm text, rounded dark cards, grotesk display, and mono utilities.

The dark charcoal interface, warm off-white text, electric-lime accent, and pairing of a broad grotesk display style with monospace utility labels give Renthuzz a memorable, locally confident identity. Its hero immediately contrasts the product with Excel, then places a tall dashboard visual beside concrete setup assurances. Metric tiles use pesos, occupancy counts, overdue totals, and a GCash event rather than generic SaaS data; this is the page’s strongest design decision. Numbered “old way” pain cards, six feature panels, a short setup sequence, pricing cards, founder note, and FAQ create a thorough but lengthy narrative. Fine low-opacity borders and secondary text look elegant on the dark surface, although prolonged dark-page density and very small muted labels may reduce readability. The bilingual promise is not made tangible through a visible language control. Showing the proof-review interaction—or a short non-animated sequence from upload to approval—would turn the strongest product differentiator into observable evidence.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Local pain → dashboard proof → replacement workflow → features → setup → pricing → founder/FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Collection metrics, occupancy panel, GCash proof card, maintenance board, pricing tiers, and FAQ accordion.
- **Required states:** Define proof pending/approved/rejected, bill unpaid/partial/paid, maintenance stages, and tenant notified states.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Raise muted-text contrast, keep tap targets generous, offer reduced motion, and expose a real language switch. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The Philippine specificity, sample property dashboard, and candid building-in-public voice.
- **Change first:** Demonstrate proof verification, shorten the long scroll, and ensure small lime/grey status details remain legible.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 40. [Rentinent](https://rentinent.vercel.app/)
*Category: Landlord–tenant accounting and portals · Access: Public tour; portals gated · Reviewed 22 Aug 2026*

**Interface context:** Rentinent is a synced landlord-and-tenant workspace for invoices, balances, rent, utilities, partial payments, audit history, and reporting.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Make shared rental finances legible and reduce disputes through one synchronised source of truth.

**Observed direction:** Calm finance-like neutrals, semantic status colours, rounded bento panels, compact labels, and theme support.

The landing page borrows the visual discipline of modern accounting software: a constrained content shell, calm semantic colour tokens, rounded bento panels, compact financial labels, and a dashboard mock dense enough to feel credible without overwhelming the hero. The invoice progression is particularly effective because it shows a difficult reconciliation concept as a simple sequence with amounts and status changes. Later sections split owner and tenant capabilities, then move into pricing cards, FAQs, and conversion. Quick-action buttons, portal navigation concepts, invoice-status components, and light/dark mode support suggest a component system extending beyond the marketing page. Inspectable styles also provide visible-focus treatment, minimum touch-target sizing, and reduced-motion handling—good foundations, though not a substitute for a full accessibility audit. The biggest design issue is offer clarity: a $19 Personal price and “early access lifetime free” language appear together, which may leave visitors unsure what they will pay. Sample currency and financial-health logic also need explanation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Core question → financial dashboard → capabilities → payment lifecycle → dual portals → pricing → FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Health-score card, collection KPIs, invoice stepper, quick actions, portal summaries, and pricing toggle.
- **Required states:** Define invoice issued/partial/cleared/overdue, reconciliation error, tenant invited, code expired, and sync pending.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Preserve focus rings, 44-pixel targets, reduced motion, and textual status when panels collapse on mobile. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The invoice lifecycle and paired portal framing, which explain the product’s differentiator with unusual clarity.
- **Change first:** Resolve early-access pricing ambiguity, label sample data, and explain how the health score and allocations are calculated.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 41. [StockFlow](https://stock-flow-six-vert.vercel.app/)
*Category: Inventory management · Access: Open live demo; account required for a workspace · Reviewed: 22 Aug 2026*

**Interface context:** StockFlow is an inventory workspace for products, categories, suppliers, purchase orders, stock alerts, reports and teams.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Give small teams one dependable view of stock health, exceptions and accountable movement.

**Observed direction:** Familiar admin-dashboard density with KPI cards, charts, alert lists, activity rows and data tables.

The demo uses a conventional operations-dashboard hierarchy: persistent module navigation, a page title, four headline metrics, a seven-day movement chart, alert and activity panels, a top-products ranking and a detailed table. That progression moves cleanly from health to exceptions to evidence. Low-stock items pair names and SKUs with explicit quantities and “Low” or “Out” text, a sound choice for accessibility and rapid scanning. Recent activity includes actor and time, reinforcing the audit-log promise. The breadth of the navigation—inventory, suppliers, purchase orders, alerts, reports, team and settings—does make a small-screen collapse strategy essential. The demo’s product table is useful but should expose reorder threshold, supplier and last movement, or link directly into an item drawer. Charts need accessible summaries and clear units. Offline mode also requires visible sync status, conflict handling and a “last synced” timestamp; the public demo does not show those critical states. Exact palette and type choices were not reliably captured in the degraded browser pass, so this review does not claim them.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Dashboard → products/categories → inventory → suppliers/orders → alerts/reports → team/settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Stock KPI, movement chart, product table, low-stock card, purchase order and audit entry.
- **Required states:** Define in stock, low, out, incoming, adjusted, offline, syncing, conflicted and failed import.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Turn wide tables into labelled item cards; provide chart summaries and text for every stock status. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The open, populated demo and strong health-to-exception dashboard sequence.
- **Change first:** Make offline synchronisation and reorder decisions as inspectable as the headline inventory metrics.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 42. [LogiFlow](https://logiflow-lake.vercel.app/)
*Category: Logistics control tower · Access: Partial; public product simulation, account required for operations · Reviewed: 22 Aug 2026*

**Interface context:** LogiFlow is an India-focused logistics control tower for road, rail, air and sea shipments.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Help Indian logistics teams detect disruption early and coordinate a response from one operational surface.

**Observed direction:** Control-room presentation with live event text, KPI blocks, risk labels, tabbed product views and calculator inputs.

The page opens like a control room: delay risk, active alerts, ETA confidence and weather impact are followed by a scrolling stream of shipment events. Its in-page demo uses five explicit view tabs and shows on-time rate, active and at-risk shipments, revenue protected, performance trends and status-labelled route rows. The calculator’s three inputs—monthly volume, cargo value and delay rate—translate operational pain into estimated savings, a strong bridge from product evidence to purchase intent. The problem/outcome sections are repetitive, however, and the very long page makes the actual control-tower preview arrive late. Some public counters render as zero while later copy claims hundreds of teams, which creates an avoidable credibility conflict. Prediction screens should surface confidence, contributing weather or congestion evidence, data freshness and an explicit human approval boundary. A map must have a list equivalent, and risk cannot rely solely on colour. The India-specific examples and monetary formatting should remain, but illustrative shipments, savings and testimonials need prominent sample labels.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Network health → problems/outcomes → capabilities → savings calculator → setup → product simulation → proof/FAQ.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#16A34A` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Shipment row, multimodal map, risk alert, ETA evidence, reroute approval, LogiBot answer and cost calculator.
- **Required states:** Show on track, watch, at risk, delayed, rerouting, awaiting approval, delivered and stale-data states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Pair map and chart views with tables; use text, severity and timestamps in addition to colour. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The deep India localisation and concrete linkage between operational risk and financial impact.
- **Change first:** Resolve contradictory counters and move a labelled, evidence-rich control-tower walkthrough much earlier.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 43. [AI Supply Guardian](https://ai-supply-guardian.vercel.app/)
*Category: SME supply-chain risk assistant · Access: Degraded public preview; working product access unverified · Reviewed: 22 Aug 2026*

**Interface context:** AI Supply Guardian proposes a lightweight supply-chain assistant for SMEs without an ERP.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Convert fragmented supplier updates into structured, explainable risk and a prioritised response for SMEs.

**Observed direction:** Degraded live view; indexed evidence suggests chat answers, severity badges, supplier rows and feature/phase cards.

The indexed content reveals a useful end-to-end information pattern: incoming supplier message, structured extraction, impact assessment, recommended next steps and updated supplier status. That is more actionable than a generic chat window. Question cards, answer sections, severity labels and supplier rows appear to organise the examples, while feature and phase blocks separate monitoring, email processing, dashboards and the SME proposition. Because the live surface was degraded, exact palette, typography, spacing, navigation and responsive behaviour could not be observed and are not inferred here. The product’s central design challenge is explainability. “Low risk” should expose buffer assumptions, affected orders, confidence and the data timestamp, with a clear path to correct the assessment. Pasted email content may contain commercially sensitive information, so retention, redaction and model-use controls belong beside the input. Sample dates shown in indexed scenarios are historical relative to review and must be labelled as demo data. The roadmap should distinguish functioning modules from planned phases, and every automated update needs confirmation and rollback.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Supplier input → extracted facts → business impact → risk explanation → actions → monitoring dashboard.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Email analyser, evidence panel, risk badge, affected-order list, action plan and supplier health row.
- **Required states:** Define unanalysed, processing, low/medium/high risk, missing context, corrected, acknowledged and resolved.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Spell out severity and confidence; keep extracted email evidence keyboard-readable and redactable. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The coherent email-to-impact-to-action demonstration and deliberately lightweight SME positioning.
- **Change first:** Restore an inspectable live surface and clearly label sample dates, privacy controls and planned versus working features.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 44. [Pluton](https://pluton-chi.vercel.app/)
*Category: AI architectural and civil design infrastructure · Access: Early-access request; indexed demo only during review · Reviewed: 22 Aug 2026*

**Interface context:** Pluton presents an AI-powered CAD and BIM environment for architects and civil engineers.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Compress concept-to-document workflows without obscuring engineering constraints, provenance or professional responsibility.

**Observed direction:** Indexed evidence shows an industrial system voice, uppercase hierarchy, technical labels, glyphs, prompts and timestamped gallery cards.

The indexed presentation has a strong technical-editorial voice: all-caps headings, slash-prefixed labels such as capability matrix and product demo, numbered modules, geometric glyphs, generation timestamps and prompt-like captions. Gallery cards connect plain-language instructions to distinct infrastructure outputs, while the workflow and integration list answer professional handoff questions. This system-language aesthetic suits an engineering tool, but the live render returned no inspectable body in the single check, so exact colours, fonts, imagery quality, motion and responsiveness are not claimed. The product also makes unusually consequential claims—real-time code compliance, structural analysis, sub-second generation and high accuracy. Design must separate generative assistance from validated engineering output, showing model version, jurisdiction, assumptions, unresolved violations, solver status and professional sign-off. A before/after parameter edit with a drawing diff would demonstrate the parametric promise better than additional headline metrics. Gallery imagery needs scale, units and project status, while exports require compatibility/version information and failure states.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Hero metrics → capability matrix → product demo → design gallery → workflow/integrations → early-access request.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Brief composer, parametric model viewer, constraint panel, violation list, version diff, drawing set and export status.
- **Required states:** Show generating, incomplete, constraint conflict, analysis pending, violation, reviewed, signed off and export failed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide text alternatives for drawings and diagrams; keep units, warnings and diffs readable beyond colour cues. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The focused architecture/civil niche and clear bridge from natural-language brief to professional export formats.
- **Change first:** Replace unsupported performance theatre with inspectable assumptions, validation evidence and a genuine parameter-change walkthrough.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 45. [CleanOps](https://cleanops-eight.vercel.app/)
*Category: Field-service management for cleaning operations · Access: Demo role picker indexed; downstream screens degraded · Reviewed: 22 Aug 2026*

**Interface context:** CleanOps is a German-language field-service management product for Austria and Germany.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Let every cleaning-service stakeholder evaluate and operate a workspace tailored to their responsibilities.

**Observed direction:** Only the indexed gate was observable: initial-based role tiles, concise German labels and purpose subtitles.

Starting the demo with a role choice is a strong enterprise-software decision. Initial tiles and short German labels make a complex permission model browsable before login, and the paired role/purpose copy communicates why each workspace should differ. It also lets evaluators inspect the perspective that matters to them instead of entering a generic super-admin dashboard. The limitation is evidentiary: downstream screens were not accessible in the single pass, so this review cannot assess actual navigation, density, palette, typography, tables, forms or mobile field workflows. The role picker should make “demo data” persistent and explain what actions are disabled. Once inside, the active role needs a visible badge and a return-to-role-selector control to prevent mistaken interpretations. Cleaners and supervisors require touch-sized, low-connectivity flows; dispatch and billing can support denser desktop tables. Customer and employee data must be clearly fictional, and permission differences should be demonstrated through available actions, not merely hidden navigation. Austrian/German date, address, currency and terminology variants also warrant explicit localisation tests.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Login or demo → role selection → role workspace → jobs/quality/billing/customer functions, presently unverified.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Role card, active-role badge, schedule, assignment, quality check, invoice/report and customer request.
- **Required states:** Define demo, read-only, assigned, en route, started, inspected, rejected, invoiced and permission-denied.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Prioritise touch and offline resilience for field roles; use plain status text and locale-correct formats. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The rare role-first demo that acknowledges the product’s many distinct operational audiences.
- **Change first:** Restore inspectable downstream demos and show persistent sample-data, permission and active-role context.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 46. [JobDocs](https://jobdocs.vercel.app/)
*Category: Contractor document management · Access: Waitlist; iOS-first product · Reviewed: 22 Aug 2026*

**Interface context:** JobDocs is an offline-first iPhone document hub for solo contractors.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Replace scattered job-site paperwork with an offline, one-handed path from capture to invoice readiness.

**Observed direction:** Problem-led mobile narrative with compact status snippets, checklist progress, alerts, pricing cards and a comparison table.

The landing narrative is unusually specific to a solo operator: scattered camera-roll permits, expired certificates and software priced for 50-person firms lead directly into capture, checklist, expiry and billing workflows. Compact evidence snippets—“5 of 7 documents received,” an expiry warning, a Ready to Invoice card and Mail-to-share flow—make the promised app tangible without a full dashboard. A detailed competitor table and transparent pricing strengthen evaluation, though the page becomes long and claim-heavy before the final waitlist form. The core mobile experience should centre a job card with missing-document count, next expiry and invoice readiness, then allow one-handed scan/import actions. Offline storage is a compelling trust signal, but users need backup state, device-loss warnings, OCR confidence and a way to correct names, dates and checklist matches. GPS collection must be consented and visible per photo. The comparison table needs a narrow-screen pattern, and emoji-like feature symbols should have text alternatives. Exact visual palette and typography were not captured, so the review focuses on the observable content hierarchy.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Pain points → capture/checklist/expiry/photo/export features → comparison → three-step setup → pricing → FAQ/waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Job card, scan/import sheet, OCR review, trade checklist, expiry alert, photo markup and completion export.
- **Required states:** Show scanning, OCR uncertain, unmatched, missing, expiring, expired, complete, ready to invoice and backup stale.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use large field controls, text labels for icons and a stacked mobile alternative to the competitor table. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The sharp solo-contractor focus, offline model and direct bridge from compliance paperwork to billing.
- **Change first:** Shorten the landing page and make correction, backup, consent and OCR-confidence states explicit before launch.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---


## Health, fitness and appointment businesses

### 1. [Lumen](https://lumen-getcare.vercel.app/)
*Category: Health operations · Access: Public product experience · Reviewed: 22 August 2026*

**Interface context:** Lumen presents an AI-assisted healthcare operations layer intended to reduce the administrative work surrounding patient care.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Make healthcare operations feel calm, trustworthy and human while keeping clinical work clearly in the foreground.

**Observed direction:** Use deep ink, white and desaturated sage as the core palette; reserve a brighter sage for primary actions. Pair an editorial display face with a highly legible UI sans serif.

The interface uses an unusually calm healthcare palette: deep ink and charcoal create authority, while muted sage green and soft grey-green surfaces make it feel humane instead of sterile. A large editorial headline, restrained portrait and medical imagery, translucent navigation and rounded pill actions establish a premium, contemporary tone. The landing page moves through philosophy, capabilities, a three-step journey, impact and a final call to action. That sequence is easy to scan and the generous spacing keeps a potentially complex system approachable. The page’s rounded cards and soft contrast are coherent, although repeating the pill treatment on nearly every control reduces hierarchy. The product would become more credible with one detailed workflow—such as referral to reviewed note—shown at full size. Accessibility should include strong text contrast over imagery, visible keyboard focus, reduced-motion support and non-colour status cues. HIPAA, SOC 2 and outcome metrics should be linked to evidence or marked as targets while the service remains in development.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#4ADE80` |
| Secondary accent | `#16A34A` |
| Accent family detected | green |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Overview → care problem → coordinated capabilities → representative workflow → governance and security → outcomes → contact or pilot.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#4ADE80` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Translucent top bar, editorial hero, capability cards, workflow timeline, care-context panel, evidence strip, governance card and pilot CTA.
- **Required states:** Show loading, incomplete intake, flagged risk, clinician review, approved and failed-sync states. Never imply that generated content is final clinical advice.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Collapse the workflow into a vertical timeline below tablet width; maintain 44-pixel targets, AA contrast, semantic headings and keyboard-visible focus. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The sage-and-ink identity, spacious pacing and emotionally intelligent positioning.
- **Change first:** Replace abstract claims with a real end-to-end product view, publish evidence for compliance claims and differentiate primary actions from decorative pills.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 2. [MediRoute](https://medios-sygnix.vercel.app/)
*Category: Family health management · Access: Public beta narrative · Reviewed: 22 August 2026*

**Interface context:** MediRoute describes a family health operating system for India: one place for records, medication, appointments, emergency context and coordination across relatives.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Position MediRoute as the dependable shared health layer for a family, not as another collection of disconnected health utilities.

**Observed direction:** Keep royal blue as the action colour, violet for intelligence and cyan for connected data; use neutral slate for the majority of surfaces so gradients remain meaningful.

This is a large, energetic landing page built from blue, violet and cyan gradients on white and pale-slate surfaces. Rounded cards, chip labels, phone frames and dashboard mockups give the product a familiar modern-SaaS language, while monospace accents help the data and roadmap sections feel operational. The hero—“One Family. One Health. One Operating System.”—is specific and memorable. Role tabs and visual device frames help convert a broad promise into recognisable use cases. The weakness is volume: roughly fifteen sections cover problems, features, roles, architecture, recognition, metrics, roadmap, FAQs and enrolment, so several messages compete for attention. A visitor should be able to understand the primary job in one screen and explore detail on demand. Reduce decorative gradients, consolidate repeated benefit cards and label all prototype metrics or sample records as such. For health data, the permissions model deserves a prominent visual of its own rather than being buried among feature claims.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#7C3AED` |
| Accent family detected | blue, violet, cyan |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Family problem → one shared record → role-based journeys → permissions and consent → key modules → roadmap → beta application.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Family switcher, member avatar rail, record timeline, medication card, emergency card, role tabs, consent matrix, source/provenance label and roadmap status badge.
- **Required states:** Include invitation pending, permission requested, access revoked, document processing, uncertain extraction, stale record and emergency-access audit states.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Make the member switcher thumb-reachable on mobile, provide text labels beside icons, never encode record status only by colour and support large text without clipped device mockups. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The India-specific framing, strong headline and useful role-based explanation.
- **Change first:** Shorten the landing page, foreground consent and provenance, and distinguish live, beta and planned features and metrics with a consistent status system.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 3. [GutVault](https://gutvault.vercel.app/)
*Category: Personal health tracking · Access: Open, local-first PWA · Reviewed: 22 August 2026*

**Interface context:** GutVault is a private, offline-first symptom and habit tracker aimed at people managing IBS and other recurring gut-health patterns.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Create a quiet personal instrument that feels safe enough for sensitive daily use and fast enough to log in seconds.

**Observed direction:** Neutral slate canvas, white cards, emerald action and status accents, system or highly legible sans-serif typography, optional true dark mode.

The visual system is intentionally modest: white and slate surfaces, an emerald accent, rounded cards and optional light/dark presentation. That understatement suits a private utility and makes the “your data, your device” message feel credible. The landing page uses a concise hero, feature summary, four-step explanation, privacy section and a small technology story. Product charts and PWA cues make it feel more real than a conceptual waitlist, though some visualisations may appear in loading form before client data exists. The green status language works for positive or complete states but must be paired with labels for colour-blind users. The next design step should be a first-run experience that explains local storage, backup and device loss in plain language. A symptom diary also needs low-friction repeated entry: large targets, remembered defaults and an honest empty state will matter more than decorative animation.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#059669` |
| Secondary accent | `#16A34A` |
| Accent family detected | emerald, green |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.25rem, 4vw, 4rem) / 1.02–1.10`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today’s check-in → recent pattern → calendar/history → insights → export/backup → privacy and settings.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#059669` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** One-tap severity scale, symptom chips, meal/trigger entry, daily timeline, trend card, local-storage notice, export sheet and backup reminder.
- **Required states:** First entry, skipped day, incomplete check-in, insight unavailable, offline, export complete, storage nearly full and restored-from-backup.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Optimise for one-handed phones, minimum 44-pixel controls, text alternatives for charts, haptic-optional feedback and reduced-motion preferences. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The local-first promise, sparse interface and transparent early-version language.
- **Change first:** Explain backup/device-loss consequences during onboarding, make chart provenance explicit and avoid medical-causation language in correlation views.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 4. [MedScribe](https://med-scribe-ai-iota.vercel.app/)
*Category: Clinical documentation AI · Access: Public product concept · Reviewed: 22 August 2026*

**Interface context:** MedScribe proposes an ambient documentation platform that turns a clinical conversation into a transcript, a structured draft and an editable SOAP note.

#### Visual character

**Archetype:** Institutional trust interface.

**Design objective:** Convey technical capability while making review, traceability and clinician control the most prominent product behaviours.

**Observed direction:** Dark navy base with cyan for capture, violet for machine processing and green only for human-approved output; use a neutral sans and a mono face for timestamps and provenance.

The page leans into a dark, technical aesthetic: near-black blue surfaces, luminous cyan and violet gradients, glass panels, glowing pills and a diagram that maps voice to transcript to AI to SOAP note. That treatment communicates sophisticated infrastructure and makes the processing pipeline understandable at a glance. Eleven or so sections create depth, but the repeated glow and gradient treatments can make critical safety information look equivalent to marketing decoration. A clinical tool benefits from visibly sober review mechanics—source-linked transcript segments, uncertainty markers and a clear “reviewed by clinician” event. The architecture section is useful for technical buyers, while the hero needs a more tangible editable-note preview for clinical buyers. Small light text on dark gradients should be checked carefully for AA contrast, and motion around waveforms must respect reduced-motion settings. Unsupported “99%” style accuracy or diagnosis-improvement claims should be replaced with test methodology and limitations.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#22D3EE` |
| Secondary accent | `#A78BFA` |
| Accent family detected | cyan, violet, green, blue |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Capture → transcript → structured draft → clinician review → EHR export, followed by security, integrations, validation and pilot access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#22D3EE` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Recording status bar, speaker-labelled transcript, linked note editor, uncertainty flag, provenance jump-link, review checklist, export history and audit log.
- **Required states:** Microphone denied, connection lost, speaker uncertain, low-confidence phrase, recording paused, draft generated, edited, approved and export failed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep recording controls persistent, provide non-audio capture feedback, ensure transcript/editor keyboard parity and never rely on glow or colour alone. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The clear processing diagram, distinctive technical identity and focus on reducing documentation burden.
- **Change first:** Put the editable review workflow ahead of architecture, publish validation details and make safety limitations and clinician sign-off impossible to miss.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 5. [Tymely](https://tymely.vercel.app/)
*Category: Clinic queue and appointment operations · Access: Public page; workspace gated · Reviewed: 22 August 2026*

**Interface context:** Tymely is an operations dashboard for Indian clinics that combines appointments, walk-in queues, patient records, earnings and WhatsApp communication.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Give a clinic receptionist immediate control of today’s flow while letting doctors and patients see only the context relevant to them.

**Observed direction:** Charcoal and deep neutral surfaces, emerald primary action, amber waiting/attention and red escalation; bold display type for marketing, compact sans/mono for operations.

Tymely uses a dramatic near-black canvas with emerald highlights, white type and large, confident headlines. Dark product screens and queue cards blend directly into the marketing page, creating a convincing “single operational surface” effect. Monospace labels and compact status chips give live queues and earnings an instrument-panel character, while rounded containers keep it friendly. The page covers the chaos of current workflows, core features, a three-step adoption story, rescheduling, testimonials, FAQs and conversion. It is polished, but a dozen sections and several similar dashboard views make the page longer than the product’s simple value proposition needs. Emerald is used extensively for action, success and decoration; those roles should be separated. A public interactive queue demo with obviously synthetic data would communicate the product more efficiently than additional social proof. WhatsApp consent, notification delivery and patient privacy should be visible product states, not only backend assumptions.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#34D399` |
| Secondary accent | `#FBBF24` |
| Accent family detected | emerald, amber, red |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today dashboard → queue → appointments → patient record → messaging → earnings/reports → staff and clinic settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#34D399` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Live queue lane, appointment card, arrival toggle, doctor availability strip, WhatsApp delivery state, reschedule drawer, patient summary and daily reconciliation card.
- **Required states:** Scheduled, confirmed, arrived, waiting, in consultation, no-show, rescheduled and complete; include offline and notification-failed states.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide a dense desktop view and a simplified role-specific phone view; maintain high contrast, large queue actions, icon labels and keyboard shortcuts with visible focus. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The bold dark identity, India-specific workflow and tangible product imagery.
- **Change first:** Shorten the page, distinguish semantic colours, surface consent and delivery states and offer a safe interactive queue sample.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 6. [ClinicFlow LK](https://clinicflowlk.vercel.app/)
*Category: Clinic management · Access: Public tour and demo request · Reviewed: 22 August 2026*

**Interface context:** ClinicFlow LK is a Sri Lanka-focused system for small clinics that coordinates booked appointments, walk-in patients, doctor availability, health records, reminders and operational reporting.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Be the practical, reassuring operating layer for a small clinic, with minimal setup and no enterprise-software intimidation.

**Observed direction:** White and soft-grey backgrounds, navy information hierarchy and teal primary actions; use amber and red sparingly for operational attention.

The site uses a conventional but well-controlled B2B healthcare system: white and pale-grey surfaces, navy text, a teal primary colour and gently rounded cards. The restrained palette feels dependable and keeps the interface from competing with operational content. A dashboard mockup grounds the hero, followed by current problems, benefits, six feature cards, a four-step implementation flow, audience segments and an FAQ. The hierarchy is clearer and less theatrical than many AI healthcare pages. Its opportunity is differentiation: several cards look like standard SaaS feature tiles, while the uniquely Sri Lankan details—walk-ins, local messaging channels, clinic size and connectivity—could be shown through richer scenarios. Screens should use synthetic data and visibly label it. Forms need clear privacy language, and local language support, intermittent connectivity and accessible queue announcements deserve a place in the design system.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#14B8A6` |
| Secondary accent | `#D97706` |
| Accent family detected | teal, amber, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today → appointments and walk-ins → doctors → patients/records → communication → reports → administration.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#14B8A6` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Mixed queue board, doctor status, appointment form, patient summary, message template, delivery receipt, daily report and onboarding checklist.
- **Required states:** Walk-in added, slot overbooked, doctor delayed, patient notified, record locked, sync delayed and report empty.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Design reception views for desktop/tablet and doctor actions for phones; support keyboard operation, localisable strings, high contrast and text-plus-icon status. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The calm teal/navy palette, logical section sequence and small-clinic focus.
- **Change first:** Demonstrate regional workflows rather than generic feature cards, explain privacy at collection points and design explicitly for low-bandwidth and multilingual use.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 7. [VetFlow](https://vetflow-saas.vercel.app/)
*Category: Veterinary practice management · Access: Public page and trial CTA · Reviewed: 22 August 2026*

**Interface context:** VetFlow is a Portuguese-language, multi-tenant practice-management concept for Brazilian veterinary clinics.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Deliver a professional veterinary command centre that respects the emotional pet/owner relationship without sacrificing operational density.

**Observed direction:** Deep navy canvas, sky-blue primary, violet secondary and neutral greys; keep magenta decorative. Pair a friendly sans with mono only for IDs and timestamps.

The presentation uses a near-black navy base with sky blue, violet and occasional magenta highlights. A terminal-like product mockup, monospaced details and luminous cards create a capable technical impression without falling into a playful “pet app” cliché. The page is short—hero, features, pricing and final CTA—which makes the offer easy to understand. Four pricing tiers occupy a large proportion of the experience, however, while the day-to-day clinic workflow is represented more abstractly. A veterinary team needs to see how a phone call becomes an appointment, a consult, a prescription and a reminder. Bringing that scenario forward would add confidence. The darker surfaces need contrast testing at smaller sizes; icons should be labelled, and the monthly/annual switch must expose its state to assistive technology. Trust would also improve through concrete LGPD data-retention and access explanations rather than a compliance badge alone.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#A78BFA` |
| Accent family detected | blue, violet, magenta |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today’s agenda → patients/pets → owners → clinical record → reminders → finance → inventory/staff → settings and privacy.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#60A5FA` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Pet-owner identity card, species/weight/vaccine summary, consult note, appointment timeline, reminder composer, invoice status and consent/access log.
- **Required states:** New pet, owner with multiple pets, vaccine overdue, reminder sent/failed, note in draft/reviewed, invoice partial and record access restricted.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Prioritise consult actions on tablet, keep identity visible while scrolling and provide text-plus-icon clinical statuses, AA contrast and keyboard-complete pricing controls. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The mature dark identity, compact product story and veterinary-specific multi-tenant positioning.
- **Change first:** Give the product workflow more space than pricing, show real veterinary record structure and turn LGPD from a badge into visible controls and policy detail.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 8. [Setri](https://setri-web.vercel.app/en)
*Category: Strength-training tracker · Access: Public story and waitlist · Reviewed: 22 August 2026*

**Interface context:** Setri is a strength-training tracker positioned as an antidote to noisy fitness software.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Keep the interface out of the lifter’s way during a session, then make progress satisfying and understandable afterwards.

**Observed direction:** Warm paper or true black canvas, high-contrast ink/white text, one restrained training accent and thin neutral borders; editorial display type for story, robust sans for the app.

Setri moves between warm off-white pages and dark in-app screenshots. Black/ink typography, thin warm-grey borders, generous whitespace and high-radius cards give the marketing surface an editorial quality, while light/dark tags let the interface imagery speak for itself. The page is organised as story, values, screenshot gallery, goals and waitlist. A personal “built by a lifter” voice provides more credibility than synthetic testimonials. The overall restraint is excellent, though the image carousel should remain fully usable without drag gestures or animation, and screenshots need descriptive alternative text. The waitlist is a proportionate final action. The app preview would be stronger with one annotated logging sequence showing taps per set and what happens when the user changes an exercise mid-session. Progress views should avoid implying certainty from small samples and provide non-visual summaries for charts.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Start workout → active session → exercise history → progress → templates/program → goals → settings and export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Exercise search, last-set reference, set row, rest timer, plate calculator, session summary, personal-record marker, trend chart and data export.
- **Required states:** Empty plan, active/resting, set complete, edited history, offline, personal best, deload and insufficient data for a trend.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** One-thumb inputs, large numeric controls, screen-awake option, haptics toggle, chart descriptions and reduced motion; never require precise swipes. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The founder-led candour, editorial restraint and “train first” principle.
- **Change first:** Demonstrate the core logging loop, expose data portability early and define chart uncertainty and accessibility standards before adding social or AI features.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 9. [Forge](https://forge-orcin.vercel.app/)
*Category: Training and performance workspace · Access: Beta access gate · Reviewed: 22 August 2026*

**Interface context:** Forge is an early training product presented through an application shell rather than a conventional marketing page.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Turn training plans and performance history into an action-oriented athlete workspace, with a beta experience that feels purposeful rather than empty.

**Observed direction:** Neutral slate and white for the workspace, a forged-metal blue or ember accent for brand distinction, restrained gradients and a clear type scale.

The page uses familiar dashboard conventions: a fixed sidebar, pale slate background, white cards, blue primary actions, rounded corners and soft shadows. Gradient cards add some brand energy, but the foundation currently resembles an uncustomised component-library starter. The “Welcome to Forge” message and access form are easy to use, yet a first-time visitor is presented with application chrome before learning what the product helps them accomplish. Empty or locked destinations can feel like missing content instead of an intentional beta boundary. The design should either offer a synthetic demo workspace or convert the unauthenticated view into a focused preview. A compact example—today’s session, weekly load and progress signal—would reveal the product much faster. The beta form needs clear success, duplicate-email, failure and privacy states, and the sidebar must collapse gracefully on mobile.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Public preview → beta request; authenticated: Today → Training → Plan/library → Progress → Profile and settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Today card, active-session panel, training block, load chart, goal status, beta-access form, locked-feature explanation and sample-data toggle.
- **Required states:** No plan, session scheduled/in progress/completed, history importing, metric unavailable, beta requested/approved and login error.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Replace the sidebar with labelled bottom navigation on narrow screens; preserve focus order, 44-pixel controls, semantic form errors and chart summaries. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The direct app-like entry point and simple core navigation.
- **Change first:** State the target user and core job before the access gate, show a complete sample day and replace generic starter styling with a distinct Forge system.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 10. [Runday](https://rundays.vercel.app/)
*Category: Salon, studio and wellness operations · Access: Public prototype and waitlist · Reviewed: 22 August 2026*

**Interface context:** Runday is a built-in-public operating-system concept for salons, studios and wellness businesses.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Make a service business feel calmly in control of its day while showing staff only what they need to act on.

**Observed direction:** Cream paper, white working surfaces, ink blue-grey text and saturated teal action; serif for editorial framing, sans for operations and numbers.

The design is one of the most distinctive in the directory. Warm cream and white form an editorial canvas; dark blue-grey ink, thin beige borders and bright teal actions create a confident but welcoming system. Serif headings give the product a crafted service-business character, while the embedded UI uses a practical sans serif. Prototype panels, role toggles, roadmap elements, competitive problem statements, FAQs and a waitlist create exceptional depth across roughly nine sections. The tradeoff is cognitive load: visitors are asked to absorb product, thesis, roadmap and market education in one scroll. A “See the product / Read the thesis” split would preserve both modes. The owner/staff switch is a useful interaction pattern and should include clear selected semantics, keyboard support and persistent context. Data export and portability deserve first-class product UI because they are already part of the brand promise.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#14B8A6` |
| Secondary accent | `#2563EB` |
| Accent family detected | teal, blue |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Today → calendar → clients → team/pay → inventory → revenue → locations; public site split into Product, Principles, Roadmap and Waitlist.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#14B8A6` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Role switcher, day schedule, appointment drawer, practitioner card, payout summary, stock alert, location selector, roadmap badge and export centre.
- **Required states:** Unconfirmed, checked in, in service, no-show, completed, staff unavailable, product low, payout pending and feature planned/prototype/live.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use agenda cards rather than a compressed calendar on phones; expose role-toggle state, support keyboard calendar navigation and use text with all status colours. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The editorial identity, candid product thinking and visible role-specific prototypes.
- **Change first:** Separate product demo from founder thesis, make development status consistent and turn portability into a concrete workflow rather than only a principle.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 11. [BookEase PH](https://book-ease-demo.vercel.app/)
*Category: Appointment booking and business administration · Access: Fully open interactive demo · Reviewed: 22 August 2026*

**Interface context:** BookEase PH is a particularly complete front-end demonstration of appointment software for Philippine salons and wellness businesses.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Let a customer book confidently in minutes and let a small-business operator manage the resulting day without training.

**Observed direction:** Friendly neutral surfaces, one dependable brand colour, semantic success/warning/error tokens and a fully specified light/dark theme with equal contrast.

The interface prioritises practical completeness over a high-concept brand. Light and dark themes, rounded neutral cards, clear service imagery and familiar booking controls make it immediately learnable. Its strongest design move is continuity: a visitor can follow the public booking steps and then see the administrative objects that would support them. Multiple calendar views demonstrate thoughtfulness about differing operator preferences, and local payment methods make the concept genuinely regional. Because the page also explains implementation details and portfolio features, it can feel like product documentation layered onto a marketing page. Separate “Try the demo” from “Read the case study” to keep the customer story clean. Every demo screen should prominently state that data is local/sample data, and destructive actions need reset/undo feedback. On small devices, dense calendars should default to agenda view rather than squeezing a desktop grid.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dual light/dark |
| Page canvas | `#FFFFFF / #090A0C` |
| Primary surface | `#F8FAFC / #111317` |
| Raised / alternate surface | `#F1F5F9 / #181B20` |
| Primary text | `#0F172A / #F7F8FA` |
| Secondary text | `#64748B / #9BA3AF` |
| Subtle text / metadata | `#94A3B8 / #6F7782` |
| Borders / dividers | `#E2E8F0 / #2A2E35` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Customer: choose service → staff → time → details → payment/confirmation. Admin: overview → calendar → bookings → clients → services → reminders → settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px theme-aware border using #E2E8F0 / #2A2E35; match surface hierarchy in both modes rather than inverting mechanically.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07) / 0 16px 50px rgba(0,0,0,0.28)`.
- **Controls:** Primary actions use `#16A34A` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Stepper, service card, availability grid, staff selector, payment chip, confirmation receipt, calendar switcher, client profile and reminder template.
- **Required states:** Slot held/expired, double-book prevention, payment pending, booking confirmed/rescheduled/cancelled, reminder queued/sent/failed and demo reset.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Default phones to agenda view, label step progress, announce availability changes, support reduced motion and ensure all controls work at 320 pixels and by keyboard. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The end-to-end openness, Philippine payment context and documented responsive/accessibility intent.
- **Change first:** Separate product demo from portfolio commentary, label sample/local data everywhere and define production-grade concurrency, permissions and notification states.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 12. [RadiGo](https://radigo.vercel.app/)
*Category: Salon and barbershop scheduling · Access: Public tour; dashboard gated · Reviewed: 22 August 2026*

**Interface context:** RadiGo is a scheduling and floor-operations concept for salons and barbershops, organised around chairs rather than generic meeting slots.

#### Visual character

**Archetype:** Layered glass enterprise SaaS.

**Design objective:** Turn the physical salon floor into an instantly readable schedule, while making customer booking feel lightweight and welcoming.

**Observed direction:** Dark operator canvas, indigo brand action, emerald strictly for available/confirmed, amber for delays and red for conflicts; use a lighter customer-facing theme if helpful.

The landing page uses deep navy and slate surfaces with emerald and indigo accents, translucent panels, luminous status elements and many pill-shaped labels. A live social/status ticker and schedule mockups create momentum, while comparison panels make the operational improvement tangible. Sections cover the before/after problem, process, features, testimonials, dashboard, consumer booking, FAQ and CTA. The page feels credible when it shows chairs, staff and queues, but less distinctive when it returns to generic feature badges. Emerald currently performs several jobs—brand, success, availability and decoration—which can cause ambiguity in a live floor view. The two-audience architecture also needs stronger separation: customer booking should feel simple and public; the operator console can remain dense and dark. Reduce badge repetition, enlarge schedule labels and demonstrate an exception such as a late stylist or walk-in inserted into a nearly full day.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#34D399` |
| Accent family detected | indigo, emerald, amber, red |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Public booking → confirmation/status; operator: Floor now → Queue → Calendar → Staff/chairs → Clients → Reports → Settings.

#### Surfaces, components and interaction

- **Geometry:** 16–24px panels; 10–14px controls.
- **Borders and layering:** 1px border using #263247; translucent fill near rgba(255,255,255,0.055); backdrop blur 16–24px.
- **Shadow:** `0 20px 70px rgba(0,0,0,0.22); use blur only on large non-scrolling panels`.
- **Controls:** Primary actions use `#818CF8` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Chair map, live queue, staff availability row, walk-in quick-add, booking card, delay alert, QR entry screen and occupancy/revenue summary.
- **Required states:** Available, held, occupied, cleaning/reset, running late, walk-in waiting, no-show and chair/staff conflict.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Convert the floor map to a sorted chair list on phones, provide large walk-in actions, text-plus-colour states, keyboard-operable schedules and reduced-motion ticker behaviour. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The chair-first niche model, strong dark visual identity and paired operator/customer preview.
- **Change first:** Separate the two audiences, reduce decorative pills and show how the system handles real operational exceptions rather than only the happy path.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---


## Education and student tools

### 13. [Ed-admin](https://edadmin.vercel.app/)
*Category: Education ERP · Access: Public module catalogue; platform access gated · Reviewed: 22 August 2026*

**Interface context:** Ed-admin presents a broad education-management suite spanning finance, academics and administration.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Help a complex institution quickly identify the modules, evidence and deployment path that apply to it without reducing the platform’s breadth.

**Observed direction:** Institutional navy or deep blue, white working surfaces and one optimistic education accent; use restrained radii and a clear, readable enterprise sans-serif scale.

The marketing experience has the feel of an established corporate education site rather than a contemporary minimal launch page. Large audience blocks, module grids, case-study content, integration marks, testimonials and an exceptionally image-heavy page build institutional credibility. The hero—“The Complete Package for Your Institution”—states breadth but not the decisive outcome. A high density of centred text, logos and similarly weighted sections makes prioritisation difficult; more than one hundred images also increase performance and accessibility risk. The three-audience segmentation is the correct organising device and should become the main navigation lens. Once an institution type is selected, the page could reveal a tailored module map and one realistic workflow. Product screens should outweigh decorative partnership marks. All logo imagery needs meaningful alternative text or should be marked decorative, and carousels must be pausable and keyboard operable.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Choose institution type → priority outcomes → connected modules → representative workflow → implementation/integrations → evidence → demo.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Audience selector, module dependency map, role view, workflow storyboard, integration directory, case-study card, implementation timeline and demo form.
- **Required states:** Module available/configurable/custom, integration connected/planned, implementation phase, permission denied and report processing.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Replace giant module grids with searchable accordions on mobile, lazy-load media, expose carousel controls and maintain a logical heading hierarchy. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The breadth, multi-audience framing and institutional proof.
- **Change first:** Reduce logo and image density, personalise the module story by audience and elevate actual product workflows above generic corporate content.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 14. [EduMyles](https://edumyles.vercel.app/)
*Category: African school operations · Access: Public page; waitlist or trial · Reviewed: 22 August 2026*

**Interface context:** EduMyles is an Africa-focused school-management platform for admissions, fee collection, attendance, examinations, parent communication and related administration.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Present a locally relevant school operating system that feels ambitious enough for administrators and simple enough for everyday staff and parent use.

**Observed direction:** Forest green for institutional trust, warm gold for emphasis, cream for editorial sections and white for product surfaces; use a versatile sans with strong numeric glyphs.

The visual identity is strong and culturally grounded without leaning on cliché: a deep forest-green base, warm gold accent, green action colour and cream content sections. Dashboard and phone mockups appear throughout a long, fourteen-section page, balanced by stakeholder roles, module summaries, an ROI calculator, mobile narrative and geographic context. Rounded cards and bold display type give it a modern SaaS profile. The page demonstrates depth, but it sometimes treats every module, statistic and audience as equally important. The calculator is an excellent conversion tool if assumptions are editable and results are explicitly illustrative. Sample dashboards and claims such as learner counts or improvement rates should be labelled. Small schools may arrive on low-bandwidth mobile devices, so the many mockups should load progressively and retain useful text when images do not. Gold-on-cream contrast and small dashboard type require careful testing.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#B58A16` |
| Secondary accent | `#16A34A` |
| Accent family detected | gold, green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** School challenge → role outcomes → connected modules → mobile workflow → implementation → transparent ROI → regional support → trial.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#B58A16` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** School switcher, admissions pipeline, fee ledger, attendance sheet, exam/report card, parent message, role selector, ROI calculator and deployment checklist.
- **Required states:** Fee due/partial/paid, student absent/excused, result draft/published, message queued/delivered and data sync delayed.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Design parent and teacher tasks mobile-first, support offline/delayed sync, localisable strings, large tables with row summaries and text labels for every status. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The forest-and-gold identity, regional focus and practical stakeholder/ROI framing.
- **Change first:** Prioritise the highest-value workflows, make calculator assumptions transparent and separate verified adoption data from illustrative demo metrics.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 15. [XensEdu+](https://xedu-eight.vercel.app/)
*Category: School management · Access: Public overview; setup required · Reviewed: 22 August 2026*

**Interface context:** XensEdu+ is positioned as a flexible management platform for schools, kindergartens, madrasahs and colleges.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Provide one configurable education platform whose terminology and complexity adapt to the institution and user role.

**Observed direction:** Adopt a calm institutional neutral palette with a single primary accent and a documented semantic status scale; keep administrative surfaces denser than public portals.

The available surface communicates a modern multi-module school product, but its JavaScript-only delivery makes the experience fragile for search, previews, assistive technologies and slow connections. A product serving many institution types should not ask every visitor to infer which capabilities apply. Begin with a prominent institution-type selector, then reveal a concise role-and-workflow preview for that context. Screenshots should be annotated rather than displayed as unreadably small dashboard mosaics. The visual system should distinguish public/student-facing experiences from dense administrative ones while retaining a shared brand. Because the rendered design could not be reliably extracted during this review, exact colours, typefaces and component measurements should be documented directly in the project repository rather than reverse-engineered here. Stable metadata, server-rendered headings, a useful no-script summary and consistent focus management would materially improve the public design.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Institution type → role → relevant workflows; product: Overview → Admissions → Students → Academics → Fees → Communication → Reports → Settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Institution/role selector, admissions funnel, fee status table, student profile, class roster, guardian portal card, module switcher and configuration preview.
- **Required states:** Application pending/accepted, fee due/partial/paid, student active/archived, result draft/published and module unavailable/not configured.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Server-render the public narrative, include a no-script fallback, make tables transform into labelled records and support keyboard-complete portal navigation. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The inclusive multi-institution scope and modular platform premise.
- **Change first:** Make the public build semantically inspectable, tailor content immediately by institution type and publish a canonical design-token and component reference from the source project.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 16. [PTE Memories](https://ptememories.vercel.app/about)
*Category: Exam preparation and community knowledge · Access: Open, built in public · Reviewed: 22 August 2026*

**Interface context:** PTE Memories is a community-driven resource for collecting, verifying and organising remembered PTE exam questions and experiences.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Build a transparent, searchable community memory while making freshness, uncertainty and moderation visible at every step.

**Observed direction:** White/near-black base, indigo primary and yellow highlight; use plain, readable typography and compact mono metadata for dates or IDs.

The page uses a clean high-contrast palette anchored by indigo and a bright yellow accent, with straightforward editorial sections rather than elaborate mockups. The founder story, product statistics, six principles, status/roadmap content and community CTA form a persuasive narrative. Development status is treated as content, which is excellent. The weakness is that the about page shows more motivation than actual discovery mechanics; a sample searchable memory card with date, task type, confidence and verification provenance would connect the story to the product. Statistics need definitions and update timestamps. Yellow should remain an accent rather than body-text colour, and all roadmap markers need a text label in addition to colour. The no-account position should be reflected in unobtrusive contribution and moderation flows rather than dark-pattern prompts.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#FACC15` |
| Accent family detected | indigo, yellow |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Search/browse → memory detail → related patterns → contribute → verification/moderation → transparent roadmap/about.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#818CF8` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Search and exam-task filters, memory card, confidence/provenance label, duplicate cluster, correction history, contribution form, moderation state and roadmap board.
- **Required states:** Unverified, corroborated, disputed, outdated, duplicate, under review and published; explain each state in plain language.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep filters in an accessible drawer on phones, announce result counts, provide form autosave and use labels—not colour alone—for verification. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The founder candour, open-access ethos and public roadmap.
- **Change first:** Put a working discovery sample on the page, define every metric and verification level and communicate the limitations of recalled exam content.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 17. [JE HUB](https://jehub.vercel.app/)
*Category: Student notes marketplace and community · Access: Beta-test waitlist · Reviewed: 22 August 2026*

**Interface context:** JE HUB imagines a student marketplace where learners upload, discover and earn recognition for useful study notes.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make high-quality student notes fast to discover and visibly trustworthy, with rewards supporting contribution rather than overshadowing learning.

**Observed direction:** Dark neutral canvas, purple brand/action, amber reward and blue information; limit gradients to hero/reward moments and use a highly legible sans for study content.

The brand adopts a youth-oriented dark interface: near-black surfaces, vivid purple, amber and blue accents, glass cards, gradients and floating animated elements. The visual energy suits student community and rewards, but many motifs compete at once. Cards, chips, gradients and animations repeat across roughly eight sections, creating excitement without always clarifying the core act of finding a useful note. The hero should make search or a note preview the main interaction; rewards can follow once utility is established. Purple can carry brand actions, amber can denote reward and blue can signal academic navigation, but these roles should remain stable. Motion needs a reduced setting, glass surfaces require robust contrast and waitlist forms need visible error/success feedback. Previewed notes should include author, course, institution/year, page count, update date and moderation status.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#C084FC` |
| Secondary accent | `#FBBF24` |
| Accent family detected | purple, amber, blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Search/discover → note detail/preview → author/course collection → save/download → contribute → rewards/profile → moderation.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#C084FC` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Search bar, subject/course filters, note card, page preview, trust metadata, author profile, upload stepper, reward ledger and report action.
- **Required states:** Upload processing, metadata incomplete, pending review, approved, disputed, removed, saved and download unavailable.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Reduce floating motion, preserve contrast over glass, support keyboard previews and filters, and provide structured text metadata before document imagery. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The energetic student identity, community premise and clear beta invitation.
- **Change first:** Make search and a real note sample the hero, reduce competing gradients and define moderation, intellectual-property and quality signals before scaling rewards.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 18. [Sabi Learn](https://synapsebot.vercel.app/)
*Category: AI-assisted skills learning · Access: Public product page · Reviewed: 22 August 2026*

**Interface context:** Sabi Learn is a Nigeria-specific learning concept built around a simple promise: “Learn a skill.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make practical learning feel culturally familiar, achievable and guided, with clear evidence of progress.

**Observed direction:** Warm light surfaces, dark ink, gold for milestones and violet for AI assistance; friendly display type plus an extremely readable lesson sans.

The page uses a compact brand system with ink and card surfaces, a warm gold and a violet accent, rounded containers and a display/body type pairing. Seven sections are enough to explain the headline, four tools, four-step process, FAQs and CTA without the sprawling repetition common in learning sites. The plain-English copy is the primary design asset. Gold can represent achievement and violet can represent AI guidance, provided both remain accessible against their backgrounds. The feature cards would gain credibility from a concrete lesson sequence—prompt, learner response, feedback and next practice—rather than icon-led descriptions. Claims about course count, learners or success rates should be linked to a source or explicitly shown as targets/sample values. Empty, incorrect, uncertain and “ask a human” states need as much attention as celebratory completion.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#B58A16` |
| Secondary accent | `#7C3AED` |
| Accent family detected | gold, violet |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Choose skill → diagnostic/goal → lesson → guided practice → feedback → review/streak → certificate or next skill.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#B58A16` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Skill card, lesson player, practice prompt, hint ladder, feedback panel, mastery meter, saved vocabulary/concept card and help escalation.
- **Required states:** Not started, in progress, needs review, mastered, answer uncertain, connection interrupted and mentor/help requested.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse multi-column cards to one column below 720px and keep the primary CTA visible without forcing a sticky bar. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Mobile-first lessons, low-bandwidth text mode, downloadable content where permitted, captioned media, clear language and progress not conveyed by colour alone. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The concise structure, Nigerian voice and memorable “Sabi it” positioning.
- **Change first:** Replace generic feature cards with an end-to-end lesson demo, substantiate adoption metrics and define safeguards for incorrect or low-confidence AI feedback.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 19. [Studentra](https://studentra.vercel.app/)
*Category: AI student assistant · Access: Public beta page · Reviewed: 22 August 2026*

**Interface context:** Studentra is an India-focused AI assistant that brings planning, study support and academic organisation into a single student product.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Help a student convert academic ambiguity into a small, realistic next action without creating additional pressure.

**Observed direction:** Clean white canvas, blue primary action, green completion and amber attention; reduce decorative gradients and use one consistent sans family for calm continuity.

Bright blue, green and orange accents sit on white surfaces, with Poppins-style headings, Inter-like body text, occasional serif moments, gradients, rounded cards and frequent emoji. The result is optimistic and accessible to a student audience, but also close to a familiar startup template. Eleven sections and several near-identical forms or CTAs create unnecessary repetition. The page would be more memorable if the design used an actual study-plan artefact as its visual anchor and allowed the learner to manipulate one task. Emoji can humanise headlines, but should not replace semantic icons or accessible labels. Strong quantitative claims and beta testimonials need clear sourcing. A student product must also model overdue tasks and imperfect weeks without shame: red failure-heavy states or streak loss can undermine the promised reduction in anxiety.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#16A34A` |
| Accent family detected | blue, green, amber, orange |

#### Typography

- **Display face:** `Poppins`; use it for the hero and major section statements only.
- **Body/UI face:** `Poppins`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today → plan → subjects/materials → assistant → progress → settings; public page: problem → defining workflow → evidence → beta CTA.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Today focus card, syllabus importer, task breakdown, realistic-time estimate, study session, assistant citation panel, weekly reflection and workload adjustment.
- **Required states:** Unplanned, scheduled, started, completed, overdue, rescheduled, overloaded week and AI response uncertain/unavailable.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** One clear mobile priority, reduced-motion mode, labelled emoji/icons, readable line length and non-punitive text for missed tasks.

#### Design decision

- **Preserve:** The India-specific audience, upbeat tone and broad aspiration to reduce student overwhelm.
- **Change first:** Choose and demonstrate one signature workflow, remove repeated forms, reduce template-like decoration and source all metrics/testimonials.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 20. [The Study Lab](https://sb-ui-next-js.vercel.app/)
*Category: Multimodal study tools · Access: Public beta and pricing · Reviewed: 22 August 2026*

**Interface context:** The Study Lab is a beta learning workspace that transforms source material into multiple study formats.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Let a learner turn one trusted source into several useful study modes while preserving traceability to the source.

**Observed direction:** Near-white canvas, teal primary, coral secondary and dark readable type; use Cabin or a similarly friendly sans and reserve colour for mode/status distinction.

Cabin-like typography, a near-white base, teal action colour and coral accent create a friendly educational identity. The page’s greatest strength is its real demonstration content; the weakness is that the many output formats are stacked into a long scroll alongside repeated testimonials, feature lists and pricing. Turn the photosynthesis example into a tabbed or stepped interactive lab so visitors can switch between summary, map, quiz and audio while retaining the source. Teal and coral provide good differentiation but need consistent semantics; coral should not simultaneously mean decorative energy and error. Audio requires transcripts, download size and playback state, while mind maps need a linear accessible alternative. Pricing should state generation limits and data handling plainly. Generated questions should expose linked source passages and an edit/report action.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FAFAFA` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F3F4F6` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E5E7EB` |
| Primary accent | `#14B8A6` |
| Secondary accent | `#5EEAD4` |
| Accent family detected | teal |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Add material → choose transformation → review/edit output → practise/listen → save/export → source library and account.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E5E7EB; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#14B8A6` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Source viewer, mode tabs, generation progress, citation link, summary editor, mind-map canvas plus outline, quiz card, audio player and export sheet.
- **Required states:** File unsupported, processing, partial result, source mismatch, regeneration, user-edited, audio unavailable and usage limit reached.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep source and result switchable on phones, provide transcripts and map outlines, label progress and ensure all generated media can be paused and navigated by keyboard. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The tangible photosynthesis demonstration, approachable colours and multimodal learning premise.
- **Change first:** Consolidate the long page into one interactive demo, reduce repeated social proof and make citations, correction and privacy integral to every generation mode.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 21. [GetAhead](https://get-ahead-five.vercel.app/)
*Category: Teacher assessment assistance · Access: Free during beta · Reviewed: 22 August 2026*

**Interface context:** GetAhead is a teacher-facing assessment assistant that accepts an answer sheet, proposes marks and feedback, generates questions and surfaces class-performance patterns.

#### Visual character

**Archetype:** Editorial product storytelling.

**Design objective:** Reduce teacher marking effort while making evidence, rubric alignment, uncertainty and human responsibility visible.

**Observed direction:** Paper and graphite neutrals, blue for actions/links and amber for review attention; editorial display face on marketing pages and utilitarian sans in grading tools.

The marketing site uses an editorial graphite, ink and paper system with a restrained blue action colour, optional light/dark appearance and relatively sharp document-like details inside rounded containers. Display and body typography create authority without the usual AI glow. Seven sections show product screens, audience context, three real surfaces, accuracy methodology, a three-step process and FAQs. The public methodology is the design standout: it turns trust into a navigable part of the interface. The product should now demonstrate the correction loop—teacher adjusts a suggested mark, adds a reason and sees the system retain that audit trail. Paper imagery and dense grading tables need mobile alternatives. Any confidence indicator must use calibrated language and cannot substitute for the rubric. Student data retention, deletion and school-level permissions should appear beside upload actions.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#2563EB` |
| Secondary accent | `#D97706` |
| Accent family detected | blue, amber |

#### Typography

- **Display face:** `Instrument Serif`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Upload/assessment → processing → question/response review → suggested mark against rubric → teacher decision → class insights → audit/export.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Document viewer, rubric rail, evidence highlight, mark suggestion, confidence explanation, teacher override, feedback editor, cohort chart and methodology link.
- **Required states:** Unreadable page, answer boundary uncertain, rubric missing, suggestion ready, teacher changed/approved, moderation required and export complete.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use switchable document/rubric panels on small screens, keyboard annotations, high-contrast highlights, screen-reader evidence links and non-colour uncertainty labels. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The honest methodology, restrained editorial identity and teacher-control framing.
- **Change first:** Show the full override/audit loop, publish data-governance detail at upload and ensure all insight views communicate sample size and limitations.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 22. [ithrion AI](https://ithrionai.vercel.app/)
*Category: Mathematics-to-LaTeX productivity · Access: Quick converter open; add-on in private beta · Reviewed: 22 August 2026*

**Interface context:** ithrion AI is a focused utility for converting natural-language mathematics or handwriting into clean, editable LaTeX, with a quick converter available publicly and a richer editor or Docs/Slides add-on in private beta.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make mathematical expression capture feel instantaneous while ensuring every ambiguity is easy to find and correct.

**Observed direction:** High-contrast monochrome base, one precise blue/violet action accent, neutral mono for LaTeX and readable sans for guidance; minimal radii and decoration.

The public experience is minimal and tool-like: numbered 01/02/03 modules, uppercase labels, an editorial monochrome structure and restrained action styling. The lack of decorative feature grids is a strength. The hierarchy immediately communicates conversion, editor and add-on, although the quick converter should be the unmistakable hero interaction rather than only a textual example. A split input/output field with live syntax highlighting would demonstrate value in seconds. Error states deserve first-class design: unsupported handwriting, ambiguous fractions, unmatched delimiters and low-confidence symbols should be highlighted locally rather than producing a plausible but wrong formula. Copy, download and insert actions need visible success feedback. On mobile, a camera/import flow can replace a cramped dual-pane editor, with a clear crop and review step.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#7C3AED` |
| Secondary accent | `#2563EB` |
| Accent family detected | violet, blue |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** spacious. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Viewport gutters:** 20px mobile; 32px tablet; 48–64px desktop. **Section rhythm:** 104–144px. **Card padding:** 24–36px. **Grid gaps:** 24–36px. **Header height:** 68–80px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Quick convert → review/edit → copy/export; expanded editor → document history/templates → integrations and beta access.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#7C3AED` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Natural-language/handwriting input, rendered preview, LaTeX editor, symbol-confidence underline, syntax error message, copy/insert button and format selector.
- **Required states:** Empty example, processing, ambiguous symbol, invalid syntax, rendered, copied, integration unavailable and privacy/offline notice.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Stack input and preview with a sticky switcher, expose MathML or spoken maths, support complete keyboard editing and announce render errors without stealing focus.

#### Design decision

- **Preserve:** The narrow utility, numbered structure and visual restraint.
- **Change first:** Put a working input/output demo above the fold, design granular ambiguity states and show the mobile handwriting-to-reviewed-expression flow.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 23. [Kasama](https://kasama-sigma.vercel.app/)
*Category: Filipino student-life organiser · Access: Open/partial; premium planned · Reviewed: 22 August 2026*

**Interface context:** Kasama brings academic planning and personal wellbeing into one Filipino student-life dashboard.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Be a supportive student companion that unifies daily responsibilities without making the learner feel surveilled or judged.

**Observed direction:** Calm neutral surfaces, one reassuring primary accent and gentle, semantically separate academic, money and wellbeing colours; use approachable sans typography and avoid alarm-heavy dashboards.

Kasama has an unusually broad personal-data model for a student app. Its design should resist putting tasks, grades, finances, mood and sleep into one equally dense dashboard. Start with a calm “today” view and progressive disclosure: the student chooses which modules appear, while sensitive wellbeing signals remain private and descriptive rather than diagnostic. GWA and money figures need clear periods and definitions; mood and sleep need compassionate language and opt-out controls. A distinct Filipino voice, local currency, academic-calendar vocabulary and relevant examples can make the product memorable without relying on decorative cultural shorthand. Because the rendered interface could not be reliably inspected through the available browser session, the project should publish server-rendered product metadata, a no-script overview and an internal canonical DESIGN.md for exact colour, typography and component tokens.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#60A5FA` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Today → tasks/calendar → academics/GWA → money → wellbeing → habits → reflection/settings, with modules individually configurable.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#2563EB` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Today focus, deadline card, academic-period selector, GWA calculator, budget snapshot, private mood check-in, sleep trend, habit control and weekly reflection.
- **Required states:** Empty module, overdue/rescheduled, grade estimated/final, budget near limit, check-in skipped, trend unavailable and premium feature planned/locked.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Server-render the public description, make the app mobile-first, support local formats/language, provide chart summaries and never use colour or streaks to shame missed entries. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The holistic Filipino student focus, companion positioning and modular breadth.
- **Change first:** Establish one calm daily hierarchy, explicitly separate live and premium/planned functions and make the public build semantically robust enough for accessibility and search.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---


## Restaurants, hospitality, events and travel

### 24. [Valley SaaS](https://5seasons.vercel.app/)
*Category: Restaurant and canteen operations · Access: Public tour; manager portal gated · Reviewed: 22 August 2026*

**Interface context:** Valley SaaS is a multi-tenant operating system for restaurants and canteens, combining menus, QR storefronts, kitchen orders, staff operations, analytics and multiple locations.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Give multi-location food operators a premium, readable command centre while keeping ordering and kitchen work exceptionally fast.

**Observed direction:** Near-black operator canvas, charcoal layers, white type and a controlled lavender/indigo action colour; semantic green/amber/red reserved for operations.

The design uses an almost black base with raised charcoal cards, white text and a likely lavender primary accent. Manrope/Inter-style UI typography, rounded 24-pixel cards, subtle borders and a video-led hero create a premium enterprise product character. Five substantial sections make the page feel concise despite the platform’s breadth. Command-centre and analytics imagery are visually convincing, but the dark styling can hide whether screens are real, animated concept frames or sample states; each should be labelled. Tenant-security claims need precise explanations rather than abstract “isolated” language. The page would benefit from one light-background customer storefront moment to contrast with the manager console and clarify the public/operator boundary. Demo testimonials or logos must be marked as illustrative until they represent real customers.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#C4B5FD` |
| Accent family detected | indigo, lavender, green, amber |

#### Typography

- **Display face:** `Manrope`; use it for the hero and major section statements only.
- **Body/UI face:** `Manrope`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Organisation → location → Today/orders → menu/storefront → kitchen → staff → analytics → settings/integrations.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#818CF8` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** Sparse 16–18px line icons; let typography and imagery carry identity rather than decorating every card.
- **Core component set:** Location switcher, order stream, KDS ticket, menu availability, staff shift card, revenue/throughput metric, tenant banner and storefront preview.
- **Required states:** New/accepted/preparing/ready/served/cancelled, item sold out, location offline, role restricted and sync delayed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Give kitchen screens large touch targets and audio-plus-visual alerts, collapse management grids by location and maintain high contrast at tiny data-label sizes. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The premium dark system, concise story and credible command-centre framing.
- **Change first:** Show one end-to-end order journey, label sample/concept states and substantiate tenancy, integration and customer-proof claims.
- **Specification confidence:** High for visual direction; medium for exact token values.

---

### 25. [TableTap](https://gettabletap.vercel.app/)
*Category: Independent restaurant operations · Access: Public page; trial required for app · Reviewed: 22 August 2026*

**Interface context:** TableTap proposes a unified stack for independent restaurants: QR ordering, a kitchen display, point of sale, an AI waiter and voice-driven inventory.

#### Visual character

**Archetype:** Developer utility / technical console.

**Design objective:** Maintain one source of truth from guest order to kitchen fulfilment and inventory, with a purpose-built interface for every role.

**Observed direction:** Shared restaurant brand tokens with distinct modes: light guest surface, high-contrast kitchen surface and neutral management surface; one primary action plus strict semantic statuses.

The central design challenge is role separation. A guest scanning a table code needs a light, branded menu with immediate allergen and order feedback; a cook needs a durable, high-contrast ticket queue; a manager needs configuration and reporting. Presenting all three as one generic dashboard will weaken the product. The marketing page should anchor itself in a single dinner-service story and let visitors switch role perspectives at each handoff. “AI waiter” and voice inventory require clear scope, confirmation and recovery: recommendations should never conceal price or allergen information, and a spoken stock change should be repeated visually before it posts. Server-rendered headings and useful metadata would make the public page more reliable for search, accessibility and link previews. Product screenshots should state whether data is interactive, sample or planned.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#16A34A` |
| Secondary accent | `#4ADE80` |
| Accent family detected | green |

#### Typography

- **Display face:** `Geist Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Geist Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Guest: Menu → cart → order/payment → status. Staff: Tickets → tables → exceptions. Manager: Menu → inventory → staff → reports → settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#16A34A` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** QR table context, menu item/allergen card, modifier sheet, order receipt, KDS ticket, table map, voice confirmation, stock ledger and role switcher.
- **Required states:** Table invalid, item sold out, modifier required, order submitted/accepted/preparing/ready, payment failed and voice input uncertain.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Large kitchen touch targets, guest text scaling, allergen labels beyond icons, audible alerts with visual equivalents and fully keyboard-operable management tables. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The independent-restaurant focus and genuinely connected full-stack premise.
- **Change first:** Make the role architecture explicit, demonstrate one live order journey and publish a robust server-rendered public overview plus honest live/beta/planned labels.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 26. [TechDine](https://techdine.vercel.app/)
*Category: Indian restaurant OS · Access: Public demo surface · Reviewed: 22 August 2026*

**Interface context:** TechDine is an Indian restaurant operating-system concept covering QR ordering, kitchen tickets, inventory and GST-aware billing.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make Indian table service, kitchen routing, stock and GST billing one reliable transaction chain.

**Observed direction:** White or dark-neutral work surfaces with blue primary action; green/amber/red reserved for operational status, clear numeric typography and minimal decorative gradients.

The live metadata exposes a bright blue brand direction, which is suitable for a dependable operational tool but risks making the interface feel like generic payment software unless food-service context is visible. The landing page should lead with an active table-to-kitchen-to-bill storyboard and include Hindi/English or other relevant localisation examples. A restaurant demo must show exception handling: an unavailable item, split bill, void, kitchen delay and GST invoice correction communicate far more credibility than ideal-state metrics. Dense POS controls should not be shrunk into phone mockups; use a full-width interactive sample and role-specific responsive views. The client-rendered public surface should gain semantic server-rendered headings, usable link metadata, no-script content and reduced reliance on animation. Blue should remain action/brand, with separate semantic colours for order stages.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#F7F9FC` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#EEF3F8` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#DCE4EE` |
| Primary accent | `#2563EB` |
| Secondary accent | `#16A34A` |
| Accent family detected | blue, green, amber, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Tables/orders → KDS → billing/payments → menu/inventory → shifts/staff → reports → tax/business settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #DCE4EE; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#2563EB` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Table map, QR session, order editor, KDS ticket, item availability toggle, split-bill panel, GST invoice preview, payment state and day-close summary.
- **Required states:** Order held/sent/accepted/preparing/ready, item 86’d, payment partial/failed, bill voided, invoice corrected and printer/network offline.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Tablet-first POS, large wet/greasy-hand targets, high-contrast KDS, multilingual labels and non-colour order-stage indicators. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The focused Indian restaurant scope and connection between ordering, kitchen, inventory and billing.
- **Change first:** Show operational exceptions, document tax/localisation details and make the public demo semantically accessible and inspectable without a fragile client-only load.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 27. [Tabzel](https://tabzel.vercel.app/)
*Category: Restaurant digital presence and menu operations · Access: Trial/demo · Reviewed: 22 August 2026*

**Interface context:** Tabzel is a highly developed French restaurant platform centred on a digital menu that preserves human table service rather than replacing it.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Extend a restaurant’s hospitality into a clear, multilingual digital menu while preserving staff-led service and one source of menu truth.

**Observed direction:** Warm cream canvas, brown ink, orange primary and peach supporting surfaces; reserve strong orange for action/selection and use restrained, high-radius cards.

The identity is warm and hospitable: saturated orange, cream and pale peach surfaces, brown text, large rounded containers and confident bold type. Full-screen device imagery and rounded pills make the product feel approachable and contemporary. The public page is also enormous: roughly twelve sections, many interface images and a very high count of pill-shaped elements repeat the same product richness from different angles. The colour system is coherent, but overusing orange for actions, decoration and active state reduces signal. The most persuasive journey is “operator changes an unavailable dish → guest menu updates → print/kiosk stays consistent”; make that interactive and reduce surrounding repetition. Dietary and allergen information must be textually precise, easy to audit and never inferred solely by AI imagery or translation. Language selection, kiosk navigation and menu filters need strong keyboard and screen-reader behaviour.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#EA580C` |
| Secondary accent | `#FB923C` |
| Accent family detected | orange |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Guest: Venue → menu → category/filter → dish detail → service/contact. Operator: Menu → availability/schedule → translations → channels → team → insights.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Use `#EA580C` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Venue header, category rail, dietary filter, dish card, allergen block, language selector, availability scheduler, channel preview, role permissions and review link.
- **Required states:** Available/sold out/scheduled, translation missing/reviewed, allergen update pending, channel out of sync and kiosk offline.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Mobile-first guest menu, scalable dish type, labelled allergens, focus-visible filters, non-gesture carousels and accessible multilingual announcements. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The warm restaurant-specific identity, service-preserving position and unusually rich shared-menu system.
- **Change first:** Compress the marketing page, turn one synchronisation workflow into the centrepiece and clearly separate brand orange from semantic operating states.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 28. [Pangat](https://pangat-main.vercel.app/)
*Category: Indian restaurant management · Access: Free-trial CTA · Reviewed: 22 August 2026*

**Interface context:** Pangat is an India-focused restaurant suite that spans QR table ordering, kitchen and waiter coordination, payroll, reporting, live status and subscription management.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Coordinate the whole dining line—from QR order to kitchen, waiter, payment and back office—within a recognisably Indian product.

**Observed direction:** Warm off-white and charcoal neutrals, orange primary brand/action, independent green/amber/red operational states and strong numeric/tabular typography.

Pangat uses a warm near-white canvas, orange as its dominant action/brand colour, neutral greys and heavily rounded cards and pills. The hero includes a miniature kitchen-display view, immediately signalling real restaurant work. Eight sections cover the connected flow, features, intelligence, pricing and conversion. The visual system feels energetic and locally relevant, but orange is asked to signal brand, active controls and operational attention. Establish a separate semantic palette for kitchen stages and errors. The AI capabilities appear broad relative to the demonstrated workflow; the page should visually label each one as live, beta or concept and show the input/evidence behind any forecast. Subscription and tenant-security claims need precise documentation. Small text inside mini dashboards should be enlarged or replaced with an annotated crop, particularly on phones.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#EA580C` |
| Secondary accent | `#16A34A` |
| Accent family detected | orange, green, amber, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Live service → tables/orders → kitchen → menu/inventory → staff/payroll → customers/reviews → reports/AI → billing/settings.

#### Surfaces, components and interaction

- **Geometry:** 14–18px cards; 999px pills.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#EA580C` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Service pulse, table map, KDS ticket, waiter task, menu stock switch, payroll summary, report card, AI recommendation with evidence and plan-status badge.
- **Required states:** New/accepted/cooking/ready/served, waiter requested, item unavailable, forecast insufficient data, payroll draft/approved and subscription grace/expired.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Role-specific mobile views, large KDS controls, text-plus-colour states, multilingual-ready labels and readable alternatives to tiny dashboard mockups. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The “whole pangat” identity, warm visual language and product-specific kitchen/operations imagery.
- **Change first:** Separate brand and status colours, label feature maturity and show how AI recommendations are derived, reviewed and dismissed.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 29. [SmartServe](https://smart-serve-puce.vercel.app/)
*Category: AI-assisted restaurant operations · Access: Open role-based demos · Reviewed: 22 August 2026*

**Interface context:** SmartServe is an ambitious restaurant operating system with separate surfaces for customers, staff, managers and owners.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Translate one restaurant event stream into clear, role-specific actions, escalating exceptions without drowning operators in metrics.

**Observed direction:** Dark neutral console, one cool primary action, strict semantic status colours, readable sans plus mono for IDs/times; enforce a minimum operational text size.

SmartServe is designed like a real operations console: near-black surfaces, modular dashboard cards, strict borders, compact mono labels, uppercase data captions and dense responsive grids. The aesthetic conveys control and makes it plausible as multi-location command software. Eleven sections explore roles, live sync, KPIs, forecasting, the copilot, the operating system and infrastructure. Tiny type—sometimes visually around ten pixels—and a large amount of simultaneously visible data create an accessibility and decision-load risk. The role explorer is the best navigation device and should become the backbone of the marketing page. Demo numbers need a persistent “sample data” label. Every chart needs a plain-language conclusion and sample window, while alerts should prioritise urgency and owner. Glowing/animated metrics must pause under reduced-motion preferences.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0B1017` |
| Primary surface | `#111923` |
| Raised / alternate surface | `#192431` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A394A` |
| Primary accent | `#4ADE80` |
| Secondary accent | `#16A34A` |
| Accent family detected | green |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Role entry → Today/Live → exceptions → orders/service → people → inventory → insights/forecast → locations → administration.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A394A; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#4ADE80` with high-contrast text; secondary actions stay transparent with a 1px border. Inputs should be 38–44px high in dense workspaces and 44–48px on marketing pages, with explicit labels, monospace only for technical values, and visible focus rings.
- **Iconography:** 16–18px line icons with 1.5px strokes; squared terminals/code glyphs; filled colour only for active or severity states.
- **Core component set:** Role switcher, live event stream, priority alert, service KPI, forecast card with interval, copilot recommendation, owner/location matrix and sample-data banner.
- **Required states:** Normal/warning/critical, acknowledged/assigned/resolved, forecast low confidence, recommendation dismissed/accepted and data delayed.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Replace dense grids with priority stacks on mobile, keep minimum 12–14-pixel data labels, offer chart summaries, keyboard shortcuts and visible focus. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The convincing operations-console aesthetic, role-based demos and live-event concept.
- **Change first:** Increase small type, establish alert priority/ownership, persistently label sample data and put operational action before predictive spectacle.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 30. [Ronda](https://ronda-test.vercel.app/)
*Category: Bar and restaurant operations · Access: Public test/demo deployment · Reviewed: 22 August 2026*

**Interface context:** Ronda is a Spanish-language bar-management product built around QR ordering, a kitchen display, table control, reporting and staff roles.

#### Visual character

**Archetype:** Data-dense analytical SaaS.

**Design objective:** Give a busy bar a fast, unmistakable rhythm from QR order through preparation, floor service and close.

**Observed direction:** Slate-950/900 base, purple brand/action, green success, amber delay and red conflict; condensed display face for short marketing lines, Barlow-like sans for operations.

The page has a bold nightlife character. Dark slate surfaces, a vivid purple primary, green status accents and Bebas Neue/Barlow-style condensed typography produce large uppercase statements and compact operational cards. Only a few sections are needed to explain QR, kitchen, admin and the three-step journey, so the page moves quickly. The visual language is differentiated and appropriately energetic, although oversized condensed headlines can dominate smaller screens and lose legibility at long line lengths. Green currently appears as a positive status; warnings and conflicts need equally coherent text-plus-colour treatments. Screens should include realistic Spanish labels, tax/price formatting and a clearly synthetic venue. A kitchen display requires strong sound/visual alert parity, and drag-and-drop table controls need keyboard or action-menu equivalents.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#0D0A08` |
| Primary surface | `#17110D` |
| Raised / alternate surface | `#211812` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#38291E` |
| Primary accent | `#C084FC` |
| Secondary accent | `#4ADE80` |
| Accent family detected | purple, green, amber, red |

#### Typography

- **Display face:** `Inter`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** compact. Use a 4px base and this working scale: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- **Viewport gutters:** 16px mobile; 24px tablet; 32–40px desktop. **Section rhythm:** 56–80px. **Card padding:** 16–20px. **Grid gaps:** 12–20px. **Header height:** 56–64px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Split hero, usually 5/7 or 6/6, collapsing to copy-first on mobile.
- **Page sequence:** Live tables → orders → KDS → floor/tasks → billing → shift/report → menu/staff settings.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #38291E; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#C084FC` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** Table map, QR session, order ticket, preparation timer, waiter call, modifier/substitution, split bill, shift close and role badge.
- **Required states:** Open/occupied/requesting/closing table; new/accepted/preparing/ready/delayed/void order; staff offline and printer/network unavailable.
- **Motion:** Keep interaction motion restrained: 140–200ms for hover/focus, 220–320ms for drawers or modals, no large scroll hijacking, and full `prefers-reduced-motion` support.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Scale condensed headlines down early, provide text with every status, large kitchen targets, visible focus and non-drag routes for all table actions. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive bar-energy identity, Argentine language and compact no-new-hardware proposition.
- **Change first:** Demonstrate exception handling, restrain display type on mobile and define a complete semantic status and accessibility system for live service.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 31. [RAEV](https://raev.vercel.app/)
*Category: Event discovery and coordination · Access: Coming-soon waitlist · Reviewed: 22 August 2026*

**Interface context:** RAEV is a coming-soon event product that combines local and global discovery, group coordination, ticketing ambitions and gamified participation.

#### Visual character

**Archetype:** Contemporary product-led SaaS.

**Design objective:** Make discovering and coordinating a real-world event exciting without compromising event credibility, pricing clarity or social privacy.

**Observed direction:** Dark or neutral discovery canvas that lets event imagery lead, one vivid brand accent and separate semantic states for availability, warning and ticket status; limit game effects.

A gamified event interface can easily become visually louder than the events it serves. RAEV should give photography, time, venue and social context priority, then layer streaks, badges or points as optional reinforcement. The landing page needs a working discovery sample—city, date, vibe and group availability—with one event detail showing verified organiser, total price and attendance context. Group planning should not expose precise friend location or availability by default. Ticket states must distinguish reservation, purchase, transfer, cancellation and waitlist, with unambiguous recovery. The client-only public build should add server-rendered headings, metadata and a meaningful no-script summary so search engines and assistive technology can understand the offer. Any event imagery, organiser counts or social activity shown in prototypes should be clearly marked as sample content.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#090A0C` |
| Primary surface | `#111317` |
| Raised / alternate surface | `#181B20` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#2A2E35` |
| Primary accent | `#60A5FA` |
| Secondary accent | `#2563EB` |
| Accent family detected | blue |

#### Typography

- **Display face:** `Space Grotesk`; use it for the hero and major section statements only.
- **Body/UI face:** `Inter`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1180–1280px max-width container.
- **Grid:** 12-column desktop grid; 6-column tablet; single-column mobile.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Discover → event detail → group/plan → ticket → day-of status → memories/profile/rewards; organiser trust and support accessible throughout.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #2A2E35; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Use `#60A5FA` for one dominant action per section, neutral outline treatment for secondary routes, 44–48px control heights, 8–12px control radii and a 2px visible focus ring.
- **Iconography:** 16–20px neutral line icons with consistent stroke weight; reserve filled icons for selected navigation and status emphasis.
- **Core component set:** City/date/vibe filters, event card, organiser verification, price breakdown, group availability poll, ticket wallet, safety/report action and optional reward progress.
- **Required states:** Verified/unverified, tickets available/low/sold out, invited/joined/declined, payment pending/failed, event changed/cancelled and refund status.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Server-render core content, caption imagery, provide map/list equivalence, respect reduced motion and keep social/location sharing opt-in with clear audience labels. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The community-led event premise and local-to-global ambition.
- **Change first:** Put a trusted event and coordination demo before gamification, define ticket/support states and make the public deployment semantic and resilient.
- **Specification confidence:** Medium-low; use as a rebuild brief and verify against a fresh screenshot before pixel matching.

---

### 32. [Travellingo](https://src-ui.vercel.app/)
*Category: Collaborative AI trip planning · Access: Early access · Reviewed: 22 August 2026*

**Interface context:** Travellingo is an early-access trip planner combining a live assistant, local suggestions, group coordination and a place to retain travel memories.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Turn an AI-assisted idea into a practical, jointly owned itinerary that remains useful during the trip and meaningful afterwards.

**Observed direction:** Deep navy navigation, white planning canvas, indigo primary and map/category accents; use readable sans typography and let destination imagery appear only where informative.

The visible page metadata points to a dark navy base with a white and indigo interaction system, a familiar palette for an AI travel assistant. To avoid a generic chatbot feel, maps, day structure and shared decisions should become the principal visual language. A prompt can begin the experience, but the result should resolve into an itinerary that people can drag, vote on, annotate and verify. Every recommendation needs an origin, freshness and practical details such as travel time, hours and price range. Group edits require authorship and undo history. During travel, critical information must remain available offline; memories can adopt a more photographic layout after the trip. The client-only marketing surface should be server-rendered enough to expose its headline, key workflow and accessibility structure before application scripts load.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#818CF8` |
| Secondary accent | `#4F46E5` |
| Accent family detected | indigo |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 1240–1320px outer container; prose measures held to 680–760px.
- **Grid:** 12-column outer grid with deliberately narrow text columns and wide media breaks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Trip prompt → draft itinerary → map/day planning → group decisions → bookings/documents → live trip → shared memories.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#818CF8` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Assistant composer, day timeline, map/list toggle, recommendation source card, vote/comment, collaborator presence, conflict history, offline pack and memory entry.
- **Required states:** Draft/generated/edited, suggestion stale/closed, collaborator conflict, booking unverified/confirmed, sync pending and offline data ready/outdated.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Provide map-list equivalence, keyboard reorder controls, authorship labels, offline-first critical details and a reduced-motion alternative to animated itinerary generation. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur.

#### Design decision

- **Preserve:** The plan-to-memory scope, group-planning ambition and live-assistant entry point.
- **Change first:** Make itinerary objects—not chat—the centre, expose recommendation sources and make the public page semantic, fast and understandable before JavaScript loads.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 33. [YatriAI](https://yatri-travelai.vercel.app/)
*Category: India-focused itinerary generation · Access: Early-access waitlist · Reviewed: 22 August 2026*

**Interface context:** YatriAI is an India-focused personalised itinerary builder that asks prospective travellers to join an early-access waitlist.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Make India trip planning locally intelligent and operationally realistic, not merely inspirational.

**Observed direction:** Warm white base, saffron/orange primary, slate text, and restrained blue/green category accents; reduce gradients and use destination imagery with factual captions.

The page uses a light canvas, orange action accents, rounded two- and three-extra-large cards, colourful gradient sections and abundant emoji. Blue and green informational blocks create friendly variety, and the problem/solution/three-step structure is easy to follow. The result is upbeat but close to a generic AI waitlist template, especially because the most important artefact—the itinerary itself—is not the dominant visual. Replace some emoji-led benefit cards with a real route map and day card showing travel time, source, opening hours, budget and an alternative for disruption. Statistics and “local data point” claims need qualification. Orange should remain a booking/action colour rather than appear on every decorative highlight. Form confirmation, duplicate signup and privacy states should be explicit, and image-heavy destination sections need useful alternatives.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Light |
| Page canvas | `#FCFBF8` |
| Primary surface | `#FFFFFF` |
| Raised / alternate surface | `#F5F2EC` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Subtle text / metadata | `#98A2B3` |
| Borders / dividers | `#E7E1D7` |
| Primary accent | `#EA580C` |
| Secondary accent | `#2563EB` |
| Accent family detected | orange, blue, green |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `ui-monospace / SFMono-Regular` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.025em to -0.045em on headings; normal tracking for body and controls.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** 960–1120px outer container; primary task panel 640–880px.
- **Grid:** Centered single-task composition with supporting 2–3-column proof blocks.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Traveller constraints → generated route → day-by-day detail → alternatives → budget/transport → save/share → booking handoff and waitlist/account.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px border using #E7E1D7; use background shifts before shadows to create hierarchy.
- **Shadow:** `0 8px 30px rgba(15,23,42,0.07); avoid shadow on every card`.
- **Controls:** Primary actions use `#EA580C` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Constraint form, India map, day card, travel-time leg, local insight/source, budget ledger, weather/disruption alternative and share view.
- **Required states:** Generating, missing constraints, recommendation unavailable/stale, route too dense, transport changed, saved and waitlist confirmed/duplicate.
- **Motion:** Use 120–180ms UI transitions; stream rows or progress in place without shifting layout. Reserve pulse for active processing and provide a non-animated progress/status label.

#### Responsive and accessible behaviour

- **Responsive:** Give charts a minimum readable height and provide a text/table equivalent. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Use a linear day agenda beside an optional map, labelled emoji only, accessible forms and text alternatives for all route and destination visuals.

#### Design decision

- **Preserve:** The India-specific positioning, welcoming tone and simple early-access journey.
- **Change first:** Replace generic growth cards with one evidence-rich itinerary, reduce decorative variety and substantiate or clearly qualify scale, booking and data claims.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

### 34. [Bridge](https://bridge-travel-ai.vercel.app/)
*Category: Vibe-based travel planning and creator recommendations · Access: Beta demo and waitlist · Reviewed: 22 August 2026*

**Interface context:** Bridge is a travel-planning concept that turns a traveller’s imagined “vibe” into an itinerary, drawing on routes and recommendations associated with creators.

#### Visual character

**Archetype:** Friendly consumer or service workflow.

**Design objective:** Bridge inspiration and executable travel plans while preserving creator attribution, price transparency and traveller control.

**Observed direction:** Deep navy canvas, orange primary action, violet for assisted generation and green only for verified/available states; use bright white text with tested dark-mode contrast.

The site has a polished prelaunch palette: deep navy and raised dark-blue surfaces, vivid orange action, violet intelligence accents and green status markers. A trip form gives the hero more substance than a static prompt, while a ticker, role-specific waitlist and creator content create the feeling of an active ecosystem. Seven sections must carry traveller value, product mechanics, metrics, creator monetisation and editorial content, so the primary journey can become diluted. There is also a visible unresolved dynamic-year token in some metadata/title output, which should be fixed because it undermines the otherwise premium finish. Animated metrics initially resolving from zero need static accessible values and reduced-motion behaviour. The itinerary should display source creator, last checked time, estimated versus verified price and an alternative, with attribution persisting into saved/share views.

#### Reconstructed palette

| Role | Rebuild value |
|---|---|
| Theme | Dark |
| Page canvas | `#070A12` |
| Primary surface | `#0E1420` |
| Raised / alternate surface | `#151E2E` |
| Primary text | `#F7F8FA` |
| Secondary text | `#9BA3AF` |
| Subtle text / metadata | `#6F7782` |
| Borders / dividers | `#263247` |
| Primary accent | `#FB923C` |
| Secondary accent | `#A78BFA` |
| Accent family detected | orange, violet, green, blue |

#### Typography

- **Display face:** `Plus Jakarta Sans`; use it for the hero and major section statements only.
- **Body/UI face:** `Plus Jakarta Sans`; `400 body; 500–600 UI; 600–750 headings`.
- **Technical face:** `Geist Mono` for code, IDs, metrics or timestamps—not for explanatory prose.
- **Hero scale:** `clamp(2.75rem, 5.5vw, 5.5rem) / 0.98–1.08`. **Section heading:** `clamp(1.9rem, 3.2vw, 3.25rem) / 1.05–1.15`. **Body:** `15–17px / 1.55–1.70`. **UI labels:** `12–14px / 1.35–1.50`.
- **Tracking:** -0.035em to -0.055em on large display text; 0.06–0.10em on small uppercase labels.
- **Measure:** keep marketing paragraphs near 55–72 characters; dense app copy near 45–65 characters; avoid full-width body text.

#### Spacing, grid and proportion

- **Density:** balanced. Use a 4px base and this working scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- **Viewport gutters:** 20px mobile; 28–32px tablet; 40–48px desktop. **Section rhythm:** 80–112px. **Card padding:** 20–28px. **Grid gaps:** 16–28px. **Header height:** 64–72px.
- **Container:** Application shell up to 1440–1600px; marketing content capped near 1200–1280px.
- **Grid:** 12-column marketing grid; 240–280px sidebar plus fluid work area where applicable.
- **Hero composition:** Copy-led hero with one dominant action and early product evidence.
- **Page sequence:** Traveller: Imagine/form → generated itinerary → verify/edit → save/share → booking handoff. Creator: Explain value → apply → route studio → attribution/analytics/revenue.

#### Surfaces, components and interaction

- **Geometry:** 12–16px cards; 8–12px controls; 999px status chips.
- **Borders and layering:** 1px low-contrast border using #263247; mostly flat fills with selective raised panels.
- **Shadow:** `0 16px 50px rgba(0,0,0,0.28), used sparingly`.
- **Controls:** Primary actions use `#FB923C` in 44–52px controls with plain-language labels. Secondary actions should be quieter text or outline buttons; reserve pills for filters, statuses and compact choices rather than every action.
- **Iconography:** 18–20px rounded line icons with 1.75px strokes; simple pictograms that remain readable beside plain-language labels.
- **Core component set:** Vibe prompt, constraint chips, itinerary timeline, creator-source card, price verification label, alternative suggestion, collaborator/share view, creator route card and role-specific waitlist.
- **Required states:** Generating, source missing, price estimated/verified/stale, creator attribution pending, itinerary edited, waitlist confirmed and revenue metric unavailable.
- **Motion:** Use 160–240ms control transitions and 10–20s ambient loops. Keep glow, ticker or background movement decorative; pause it under `prefers-reduced-motion` and never animate critical values from zero without a static equivalent.

#### Responsive and accessible behaviour

- **Responsive:** Replace wide tables with sticky first columns or labelled record cards; never shrink text below 12px. Collapse side rails into a drawer or horizontal selector while preserving the active context. Give charts a minimum readable height and provide a text/table equivalent. Stack the hero copy before the product image or form at narrow widths. Test at 360, 390, 768, 1024 and 1440px.
- **Accessibility:** Keep the trip form linear on mobile, expose static metric values, honour reduced motion, label all status colours and provide itinerary/map information in structured text. Keep normal text at or above 4.5:1 contrast and avoid placing fine gray type over gradients or blur. Do not encode status or series identity by colour alone; pair colour with labels, icons, shapes or patterns.

#### Design decision

- **Preserve:** The distinctive creator-informed premise, dark orange/violet identity and useful interactive hero.
- **Change first:** Prioritise the traveller product over ecosystem content, fix unresolved metadata, cite market/pricing claims and keep creator provenance attached to every recommendation.
- **Specification confidence:** Medium; palette families are observed, numeric values are reconstruction targets.

---

## Closing comparison rules

When borrowing from these products, copy the structural reason behind a choice rather than its decoration. A dark canvas is useful when it supports dense monitoring, not because “AI products are dark.” A serif is useful when it creates editorial authority, not as a luxury shortcut. Glass effects are useful when they clarify layers, not when every panel is translucent. The strongest redesign usually keeps one distinctive visual idea, reduces competing accents, normalises spacing, and moves real product evidence closer to the first viewport.
