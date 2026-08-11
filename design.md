---
title: NexusRBX UI Design System
status: normative
owner: NexusRBX product and engineering
last_reviewed: 2026-08-03
repository_baseline: TravelTable/nexusairbx@26c0b182bac2d2dc09b1ab41068bd74f6399fdee
applies_to:
  - src/
  - public-frontend/
  - desktop-connector/
  - roblox-plugin/src/ui/
---

# NexusRBX UI Design System

This document is the design authority for NexusRBX product UI. It defines the target experience, visual system, interaction rules, responsive behaviour, component standards, and review criteria for the website, AI workspace, account surfaces, desktop connector, and Roblox Studio plugin.

The current codebase is evidence, not automatic precedent. Existing inconsistencies do not override this file. When a touched area conflicts with this document, move the touched area toward this document without performing an unrelated redesign.

## 1. How to use this document

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

Priority when rules conflict:

1. Correctness, security, and truthful representation of system state.
2. Accessibility and keyboard usability.
3. Product hierarchy and user control.
4. This design system and shared component behaviour.
5. Local visual consistency with an existing screen.
6. Decorative preference.

A cleaner-looking UI is not an improvement if it hides state, removes recovery, weakens review, or misrepresents what the agent or Studio connection can do.

### 1.1 Agent operating contract

Before changing NexusRBX UI, an implementation agent MUST:

1. Read this file.
2. Identify the surface family being changed.
3. Inspect the nearest existing shared primitive and the nearest comparable product pattern.
4. Identify every affected state: default, hover, focus, loading, empty, disabled, success, error, disconnected, and narrow viewport where relevant.
5. Reuse or extend a shared primitive before creating a local one.
6. Preserve existing data flow and runtime truth unless the task explicitly changes behaviour.
7. Verify keyboard operation, overflow ownership, long content, and reduced motion.

An implementation agent MUST NOT:

- Perform a broad redesign because one component needs fixing.
- preserve a known inconsistency merely because it already exists nearby.
- invent a new visual language for one page.
- add a dependency for a single visual effect when CSS or an existing primitive is sufficient.
- hide or collapse important runtime state to make a screen appear simpler.
- produce controls that look functional but are not wired to real behaviour.

### 1.2 Decision test

Every visible element should do at least one of the following:

- enable an action;
- communicate state;
- establish hierarchy;
- preserve orientation;
- prevent an error;
- provide recovery;
- show durable output.

If it does none of these, remove it.

## 2. Product definition

NexusRBX is a professional AI-assisted development environment for Roblox Studio. It helps creators inspect, plan, generate, debug, review, and apply Luau and project changes while keeping the exact Studio target and side effects understandable.

The product should feel like specialist developer tooling, not a gaming dashboard and not a generic AI chatbot with Roblox branding applied to it.

### 2.1 Target feeling

NexusRBX should feel:

- precise;
- capable;
- calm;
- technical;
- fast;
- trustworthy;
- dense without being cramped;
- approachable without being childish.

The interaction restraint may take cues from Apple, Cursor, VS Code, Linear, and Notion. Do not clone their visual styling. NexusRBX earns its identity through its Studio-aware workflow, exact state communication, typography, structure, and restrained blue accent—not through decorative novelty.

### 2.2 What NexusRBX is not

NexusRBX is not:

- a neon sci-fi interface;
- a Roblox game UI;
- a card-based analytics dashboard;
- a playful consumer chatbot;
- a collection of unrelated SaaS templates;
- a showcase for gradients, glow, glass, or animation;
- an excuse to place a sparkle icon beside every AI action.

### 2.3 Brand personality

Use this voice in product UI:

- Direct, not promotional.
- Confident, not absolute.
- Technical, not obscure.
- Helpful, not chatty.
- Honest about uncertainty, blocks, and side effects.

Avoid language such as “magic”, “revolutionary”, “supercharge”, “unleash”, “effortless”, and “perfect”.


## 2.4 Cursor-inspired product direction

NexusRBX should adopt the interaction discipline of modern editor-first tools such as Cursor without copying their brand, exact layout, or visual styling. The reference is behavioural: compact, quiet, contextual, and focused on the current file, conversation, or task.

The product MUST prioritise:

- a dense three-zone workspace with minimal decorative chrome;
- an editor-first mental model, even when chat is the active surface;
- compact controls that reveal labels or detail only when needed;
- persistent, synchronised project context across chat, files, code, activity, Studio target, and run state;
- restrained colour, with selection and status carrying meaning rather than decoration;
- stable pane geometry and predictable keyboard-driven navigation;
- one canonical representation of each state, mode, target, and object.

The product MUST NOT imitate Apple or Cursor through copied layouts, icons, proprietary interaction details, or platform-specific chrome. NexusRBX remains recognisable through its Studio-aware workflow, blue accent, runtime truth model, terminology, and approval system.

## 3. Scope and surface families

The same product identity applies across all NexusRBX surfaces, but density and presentation differ by context.

### 3.1 AI workspace

The workspace is a dense, desktop-grade tool. Conversation is the primary canvas. Navigation, code, files, activity, assets, and build details are contextual tools around it.

### 3.2 Public website, docs, pricing, and downloads

Public pages are more spacious and explanatory. They use the same semantic tokens, typography, icons, and component behaviour, but may use larger headings and more whitespace.

### 3.3 Account, billing, settings, support, and admin

These are conventional product surfaces. Clarity and predictable forms matter more than branded decoration.

### 3.4 Roblox Studio plugin

The plugin must feel native to Roblox Studio. It uses Studio theme colours for primary surfaces and maps NexusRBX semantic states into a compact native UI. It must not imitate the website’s glass or ambient effects.

### 3.5 Desktop connector

The connector is an operational utility. It should be compact, status-led, and native in behaviour. It shares semantic states and language with the website and plugin.

### 3.6 Generated Roblox content

This design system governs NexusRBX product chrome. It does **not** force generated game interfaces to look like NexusRBX. Generated Roblox UI follows the user’s requested style, the game’s existing design language, and Roblox platform constraints.

## 4. Core design principles

### 4.1 Tool first

The interface should prioritise the user’s project, conversation, code, and current work. Product chrome must recede when it is not needed.

### 4.2 Chat is primary; context is secondary

The default workspace is conversation-first. Files, code, activity, assets, and details live in the contextual dock and open only when requested or when the user chooses to inspect a surfaced result.

A new or empty chat MUST NOT open an empty code panel. New output may add an unseen badge, but it SHOULD NOT steal focus by automatically opening the dock.

### 4.3 Progressive disclosure

Expose common actions directly and place advanced configuration one layer deeper. A user should not need to understand manifests, target generations, source hashes, or connector protocols to begin, but those details must be available when they explain a block or conflict.

### 4.4 Honest state over optimistic appearance

The UI must represent backend and Studio truth, not infer it from a request, connection icon, streaming text, or local assumption.

Examples:

- “Connected” does not automatically mean ready to apply changes.
- A delivered command is not the same as an applied command.
- A cancelled request is not “cancelled” until the durable runtime confirms it.
- A timeout is not automatically a failure when execution is still being reconciled.
- A generated response is not a verified or safe implementation.

### 4.5 One concept, one control

The same setting or mode MUST NOT appear as two competing controls in the same region. For example, Plan is an operating mode; a separate “Plan first” toggle may exist only if it represents a genuinely independent setting. Duplicate controls create contradictory states and must be consolidated when touched.

### 4.6 One primary action per region

A dialog, card, composer, or page section should have one visually dominant action. Secondary actions remain neutral. Destructive actions use danger styling only when the action is actually destructive.

### 4.7 Dense, quiet, and synchronised

Workspace density comes from compact spacing, clear alignment, stable pane geometry, and progressive disclosure—not tiny text, permanent badges, nested borders, or decorative cards.

All workspace surfaces must feel like parts of one tool. Chat, editor, files, activity, assets, Studio target, and run state must use the same tokens, row heights, selection language, status terminology, and interaction model. The user should never need to reconcile conflicting representations of the same project state.

### 4.8 Editor-first interactions

Use established desktop editor patterns: trees, tabs, command search, split panes, drawers, keyboard shortcuts, inline rename, contextual actions, explicit selection, and persistent focus.

The interface should behave like a development environment rather than a collection of web pages. Navigation should preserve the current project, file, chat, target, and run context. Novel interaction is justified only when familiar editor patterns cannot express the workflow.

### 4.9 Recovery is part of the design

Every persistent error or blocked state must explain what happened, what is affected, and what the user can do next. Recovery is not an afterthought or a generic toast.

## 5. Design-system ownership

NexusRBX currently contains several styling layers. New work must converge on the following ownership model.

### 5.1 Canonical ownership

- `src/index.css` owns global semantic tokens, typography defaults, motion tokens, focus treatment, and global utilities.
- `tailwind.config.js` exposes semantic tokens to Tailwind. It must reference CSS variables rather than duplicate colour values.
- `src/components/shadcn/` and Radix own behavioural primitives such as dialogs, sheets, menus, tooltips, selects, switches, and focus management.
- `src/components/ui/` owns NexusRBX product wrappers and presentational primitives built on those behavioural foundations.
- `src/lib/icons.js` is the icon registry.
- Complex layout, container-query, or state-machine styling may live beside its component in a dedicated CSS file.
- `public-frontend/` must consume or mirror the canonical semantic system; it must not evolve an independent palette or type system.

### 5.2 New component rule

Before creating a component, check for an existing:

- Button;
- IconButton;
- Input or Textarea;
- Select or Menu;
- Dialog or Sheet;
- Tabs or Segmented control;
- Badge or Status indicator;
- Card or Panel;
- Empty state;
- Toast or Banner;
- Tooltip;
- Tree or List row.

When a shared primitive is missing, add it once at the shared layer. Do not implement a local menu, modal, tooltip, or button system inside a feature component when an existing behavioural primitive can support it.

### 5.3 Migration rule

Legacy components may remain until they are touched. When a feature is materially edited, migrate the edited component and its immediate repeated pattern toward the shared system. Do not turn a focused change into a repository-wide visual rewrite.

## 6. Colour system

NexusRBX supports complete dark and light appearances. The default `system` preference follows the operating system; explicit `dark` and `light` choices persist through settings. Every production web surface must consume semantic tokens so both resolved themes remain complete.

### 6.1 Canonical token direction

Raw palette values may appear in the central token definition. Product components MUST consume semantic tokens or shared component variants rather than raw hex values.

```css
:root {
  /* Brand and categorical colour */
  --nexus-blue: #0a84ff;
  --nexus-purple: #bf5af2;

  /* Base surfaces */
  --ds-bg-canvas: #050507;
  --ds-bg-workspace: #08090d;
  --ds-bg-sidebar: #0c0d12;
  --ds-surface-1: #111217;
  --ds-surface-2: #17181f;
  --ds-surface-3: #1d1f27;
  --ds-surface-overlay: rgba(17, 18, 23, 0.92);

  /* Interactive fills */
  --ds-fill-subtle: rgba(255, 255, 255, 0.035);
  --ds-fill-hover: rgba(255, 255, 255, 0.06);
  --ds-fill-active: rgba(255, 255, 255, 0.08);
  --ds-fill-selected: rgba(10, 132, 255, 0.14);

  /* Borders */
  --ds-border-subtle: rgba(255, 255, 255, 0.07);
  --ds-border: rgba(255, 255, 255, 0.10);
  --ds-border-strong: rgba(255, 255, 255, 0.16);

  /* Text */
  --ds-text: #f5f5f7;
  --ds-text-secondary: #c7c7cc;
  --ds-text-muted: #a1a1aa;
  --ds-text-subtle: #71717a;
  --ds-text-disabled: #52525b;

  /* Brand interaction */
  --ds-accent: #0a84ff;
  --ds-accent-hover: #409cff;
  --ds-accent-pressed: #0071e3;
  --ds-accent-foreground: #ffffff;
  --ds-accent-soft: rgba(10, 132, 255, 0.13);
  --ds-accent-border: rgba(10, 132, 255, 0.38);

  /* Semantic state */
  --ds-info: #64d2ff;
  --ds-success: #30d158;
  --ds-warning: #ffd60a;
  --ds-danger: #ff453a;
  --ds-plan: #bf5af2;
}

:root[data-theme="light"] {
  --ds-bg-canvas: #f5f5f7;
  --ds-bg-workspace: #ffffff;
  --ds-bg-sidebar: #f2f2f7;
  --ds-surface-1: #ffffff;
  --ds-surface-2: #f7f7f9;
  --ds-surface-3: #ececf1;
  --ds-text: #1d1d1f;
  --ds-text-secondary: #48484a;
  --ds-text-muted: #5e5e66;
  --ds-accent: #007aff;
  --ds-accent-hover: #0066d6;
  --ds-accent-pressed: #0055b3;
  --ds-info: #007a9e;
  --ds-success: #248a3d;
  --ds-warning: #9a6700;
  --ds-danger: #d70015;
  --ds-plan: #8e44ad;
}
```

These names define the target semantics. Existing `--ai-*`, `--nexus-*`, HSL, and `--ds-*` aliases may map to them during migration.

### 6.2 Accent rules

Blue is the canonical NexusRBX interaction accent. It must be used sparingly so the workspace remains quiet. Use it for:

- the primary action;
- focus-visible rings;
- current selection indicators;
- active workspace tools;
- live or actively running state;
- restrained brand highlights.

Do not use blue as a general decorative border, glow, background wash, or persistent highlight around ordinary content.

Purple is secondary and categorical. Use it for Plan mode, selected model context, or a deliberate secondary AI category. It is not the default secondary-button colour.

Decorative pink is retired. Do not introduce a third workspace accent without a documented semantic requirement.

### 6.3 Legacy colours

- `#00e0c2`, `#00f5d4`, and cyan/teal utilities are legacy brand colours. New work uses `--ds-accent`.
- `#3855f6` is a legacy blue variant. Normal product CTAs use the theme-resolved canonical accent.
- Raw `#0D0D0D`, `#090b12`, `#0b0d14`, and similar values should be replaced by semantic surface tokens when the component is touched.

### 6.4 Semantic colour rules

- Blue: live, active, selected, primary action.
- Green: completed, applied, verified success.
- Amber: waiting, degraded, warning, user attention required.
- Red: failed, invalid, destructive, target mismatch that prevents safe action.
- Light blue: information, queued external work, neutral connection detail.
- Purple: planning or AI mode category.
- Grey: idle, cancelled, unavailable, secondary information.

Colour MUST NOT be the only state signal. Pair it with a label, icon, shape, or position.

### 6.5 Dynamic themes

User-selectable theme colours MAY influence low-opacity ambient decoration, avatars, or non-semantic accents. They MUST NOT override:

- danger, warning, success, or information colours;
- focus-visible treatment;
- primary-action contrast;
- code syntax meaning;
- connection or execution truth.

Ambient theme glows should be hidden or substantially reduced once a chat contains content, and they should never sit behind code or reduce text contrast.

## 7. Surface and elevation model

Use depth to explain containment, not to decorate.

### 7.1 Surface levels

The workspace should read as a continuous editor environment rather than a stack of cards. Prefer shared background planes, dividers, tabs, and selected rows over boxed modules.


1. **Canvas** — application or page background.
2. **Workspace surface** — primary conversation or working area.
3. **Embedded surface** — input, row group, code block, compact card.
4. **Panel** — sidebar, dock drawer, settings section.
5. **Elevated overlay** — menu, tooltip, popover.
6. **Modal** — blocking decision or focused task.

A component should not skip multiple elevation levels without a reason.

### 7.2 Borders

Prefer a subtle 1px border over a shadow for ordinary separation. Stronger borders indicate focus, selection, conflict, or elevated overlays—not premium appearance.

### 7.3 Shadows

Use shadows only where the element physically overlays another layer:

```css
--ds-shadow-popover: 0 12px 36px rgba(0, 0, 0, 0.45);
--ds-shadow-drawer: -20px 0 52px rgba(0, 0, 0, 0.38);
--ds-shadow-modal: 0 24px 80px rgba(0, 0, 0, 0.48);
```

Cards in the normal document flow SHOULD NOT cast large shadows.

### 7.4 Blur and glass

Backdrop blur is allowed for a top-level sticky header, popover, or modal over moving content. It should not be the default card treatment.

Rules:

- Do not place multiple blurred layers over one another.
- Do not apply backdrop blur to a large scrolling container.
- Prefer opaque or near-opaque workspace panels for code readability.
- Do not use glassmorphism to compensate for weak hierarchy.

## 8. Typography

### 8.1 Font ownership

- The platform UI stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro`, `Segoe UI`, `system-ui`) owns UI, body, and display typography.
- Marketing hierarchy comes from size, weight, optical tracking, and spacing rather than a separate decorative display family.
- **JetBrains Mono** is for code, paths, identifiers, hashes, keyboard shortcuts, and fixed-width technical values.
- LobeHub/model marks may use their supplied brand assets, but no new general UI font may be added.
- Manrope, Sora, and Inter overrides are legacy and should migrate to the platform stack when touched.

### 8.2 Type scale

| Role | Size | Typical use |
| --- | ---: | --- |
| Micro | 10px | Nonessential metadata, tiny badge, short uppercase eyebrow |
| Compact | 11px | Secondary status, timestamp, dense helper text |
| Dense control | 12px | Tree rows, menus, compact buttons, tables |
| Dense body | 13px | Workspace supporting text, panel content |
| Standard body | 14px | Forms, normal product copy |
| Conversation | 15px | User and assistant message content |
| Small heading | 16px | Panel or card title |
| Section heading | 20px | Settings or page section |
| Page heading | 28–36px | Product page heading |
| Marketing display | 40–64px | Public hero only |

Interactive control labels SHOULD be at least 11px. Ten-pixel text is not acceptable for primary actions, form labels, or information required to complete a task.

### 8.3 Weight

- 400: body text.
- 500: secondary emphasis and ordinary controls.
- 600: labels, titles, selected rows.
- 700: primary button, important heading, compact status.
- 800 or 900: rare display or brand use only.

Do not use `font-black` as the default way to create hierarchy.

### 8.4 Case and tracking

Sentence case is the default.

Uppercase with wide tracking is limited to:

- short status badges;
- tiny metadata labels;
- table or panel eyebrows no longer than roughly 24 characters.

Do not use uppercase for ordinary buttons, navigation, menu items, form labels, or paragraph headings.

### 8.5 Line length and rhythm

- Assistant prose: target 60–78 characters per line where practical.
- Documentation prose: target 65–76 characters per line.
- Product helper copy: no more than two short sentences before progressive disclosure.
- Conversation line-height: approximately 1.6.
- Dense UI line-height: approximately 1.35–1.5.

## 9. Spacing and density

Use a 4px base grid with 2px and 6px allowed for optical micro-adjustment. Workspace surfaces should default to compact editor-like density. Public pages may remain more spacious.

Density must be synchronised across adjacent panes. Comparable rows, controls, headers, tabs, and status items should share heights and vertical rhythm rather than using feature-specific spacing.

### 9.1 Spacing scale

`2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Do not introduce arbitrary spacing such as 13px, 17px, or 29px for standard layout. Measured editor alignment, viewport calculations, and third-party integration may be exceptions.

### 9.2 Control heights

| Control | Height |
| --- | ---: |
| Tiny status or chip | 20–24px |
| Compact icon or tree action | 28px |
| Default workspace control | 32px |
| Form control | 36px |
| Prominent product control | 40px |
| Touch / marketing control | 44px minimum |
| Composer input | 44–144px auto-growing |
| Workspace tool-rail button | 38px inside a 48px rail |

### 9.3 Workspace density

- Tree rows: 31–34px.
- Menu rows: 32–40px depending on description.
- Panel padding: 12–16px.
- Compact card padding: 12px.
- Normal card padding: 16px.
- Page section spacing: 32–64px depending on surface.

### 9.4 Touch targets

On touch-oriented layouts, interactive targets MUST be at least 44×44px or have an equivalent hit area. Visual icons may remain 16–20px inside that area.

## 10. Radius, border, and shape

Use a restrained radius system:

```css
--ds-radius-xs: 4px;
--ds-radius-sm: 6px;
--ds-radius-md: 8px;
--ds-radius-lg: 12px;
--ds-radius-xl: 16px;
--ds-radius-pill: 999px;
```

Guidance:

- Tree and dense list rows: 4–6px.
- Buttons and inputs: 6–8px.
- Composer and standard cards: 12px.
- Large marketing cards and modals: 12–16px.
- Pills: only for true status chips, tags, or binary compact controls.

Workspace controls MUST NOT use oversized 20–32px radii. Rounded rectangles should not become decorative bubbles.

## 11. Icon system

`src/lib/icons.js` is the canonical icon registry. General product components import from that registry, not directly from another icon package.

### 11.1 Rules

- Use the Hugeicons Rounded visual family through the central registry.
- LobeHub icons are allowed for model/provider marks only.
- Do not mix unrelated outline, filled, and duotone icon styles in one surface.
- Default icon size: 16px.
- Compact icon: 14px.
- Rail or primary control icon: 18px.
- Large empty-state icon: 20–24px.
- Icons are supportive; text carries the meaning for important actions.
- Icon-only controls require an accessible name and, on desktop, a tooltip.
- Decorative icons use `aria-hidden="true"`.
- Do not use emoji as product icons.

### 11.2 Logo use

Use the official NexusRBX logo asset. Do not redraw it, place it in a different random gradient, or use it as a repeated decorative watermark.

## 12. Motion

Motion explains state change and spatial relationship. It should not make the product feel animated for its own sake.

### 12.1 Canonical motion tokens

```css
--motion-instant: 80ms;
--motion-fast: 120ms;
--motion-standard: 180ms;
--motion-panel: 240ms;
--motion-large: 300ms;
--ease-product: cubic-bezier(0.16, 1, 0.3, 1);
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

### 12.2 Usage

- Hover and colour response: 80–120ms.
- Small control state: 120–180ms.
- Menu or popover: 150–180ms.
- Drawer or sidebar: 220–240ms.
- Modal: approximately 220ms.
- Large route or onboarding transition: no more than 300ms.

### 12.3 Allowed properties

Prefer `opacity` and `transform`. Keep translation within 2–8px and scale within roughly 0.98–1.00.

### 12.4 Prohibited motion

- No bounce or elastic spring for ordinary product controls.
- No lateral movement of menu rows on hover.
- No repeated card lift in the workspace.
- No animated gradient borders.
- No continuous glow except a small live/running indicator.
- No fake progress animation detached from real work.
- No large layout animation that causes the conversation or editor to jump.

### 12.5 Reduced motion

All motion must respect `prefers-reduced-motion`. Functional state changes remain visible without animation.

## 13. Layering and z-index

Use a finite layer scale. Do not solve collisions with arbitrary values such as `z-[9999]`.

| Layer | Token / value | Use |
| --- | ---: | --- |
| Base | 0 | Page and normal content |
| Sticky | 20 | Headers and local sticky controls |
| Backdrop | 40 | Drawer or sheet backdrop |
| Drawer | 50 | Sidebar, context drawer, sheet |
| Popover | 60 | Menu, select, tooltip, command palette |
| Toast | 80 | Notifications |
| Modal | 100 | Dialog and blocking overlay |
| Tutorial | 120 | Deliberate onboarding spotlight |
| System | 140 | Rare app-wide emergency state |

Portalled components still use this scale.

## 14. Component standards

Every interactive component MUST define:

- default;
- hover where a pointer exists;
- active/pressed;
- focus-visible;
- disabled;
- loading where applicable;
- validation/error where applicable.

Disabled and loading are not interchangeable. A disabled control should not show a spinner unless work is actually happening.

### 14.1 Buttons

#### Primary

- Solid blue background.
- Dark foreground.
- One dominant primary action per region.
- Use a clear verb: “Apply to Studio”, “Create project”, “Save changes”.

#### Secondary

- Neutral surface or outline.
- White/secondary text.
- Purple is not the default secondary-button colour.

#### Ghost

- No persistent border.
- Used for compact navigation, low-risk actions, and icon controls.

#### Danger

- Red treatment only for destructive or stop actions.
- Destructive actions require a clear consequence and confirmation when not easily reversible.

#### Button rules

- Labels use sentence case.
- Avoid vague labels such as “Continue” when a specific verb is available.
- Loading labels should describe the in-progress action: “Applying…”, “Saving…”.
- Do not replace a stable button label with a spinner alone unless space is extremely constrained and an accessible name remains.
- Icon-only buttons need `aria-label` and a tooltip.
- Active press scale may reach 0.98; hover should not enlarge the button.

### 14.2 Inputs and forms

- Visible labels are required for settings, account, billing, and destructive forms. Placeholder text is not a label.
- Workspace search may use an accessible label and placeholder when the context is unambiguous.
- Inputs use a subtle surface, 1px border, and blue focus treatment.
- Error copy appears adjacent to the field.
- Helper text must be concise and remain visible when it explains a constraint.
- Preserve user-entered text after an error.
- Auto-focus only when the user explicitly opened a focused input task such as rename or command search.
- Textareas grow without moving critical controls off-screen.
- The chat composer grows from 44px to a maximum of 144px before internal scrolling.

### 14.3 Menus, popovers, and selects

- Use Radix/shadcn behaviour for focus, dismissal, collision handling, and keyboard navigation.
- Portals must remain inside the canonical layer scale.
- Menus open 6–8px from their trigger and remain inside the viewport.
- Escape closes and returns focus to the trigger.
- Clicking outside closes non-modal popovers.
- Menu rows do not translate or scale on hover.
- Destructive items are visually separated and use danger text.
- Nested menus are allowed only when they materially reduce a long flat list.
- Do not place a form-sized workflow inside a menu; use a popover, sheet, or dialog.

### 14.4 Tooltips

- Use tooltips for unlabeled icons, abbreviated technical values, or disabled-state explanation.
- Keep text short and direct.
- Tooltips are not the only location for information required to complete a task.
- Tooltips must be available on keyboard focus.

### 14.5 Tabs and segmented controls

- Use a segmented control for two to four peer modes within one task.
- Use tabs for sections of a panel or page.
- Do not use pills to represent deep navigation hierarchy.
- Selection uses fill, text, and where needed an indicator—not colour alone.
- Each state concept has one visible control per region.
- Changing a mode must update the related placeholder, capability explanation, and action behaviour consistently.

### 14.6 Badges, chips, and status indicators

Badges exist to communicate state or compact metadata. They are not decoration.

- Use no more than two prominent badges in a normal row or card header.
- Status labels use sentence case unless they are very short machine states.
- Removable chips include a clear remove control and accessible name.
- Context chips may truncate but expose the full name via tooltip/title.
- A status dot must have accompanying text or an accessible label.
- Numeric confidence is not decorative. Do not show a percentage unless it is calibrated, explained, and tied to evidence. Prefer “Verified”, “Needs review”, or “Blocked” when that is what the system actually knows.

### 14.7 Cards and panels

Use a card only when a bordered container improves grouping or represents a durable object with its own actions. The workspace should otherwise favour panes, rows, tabs, dividers, and inline groups.

A panel is part of the workspace shell. A card is an object inside a panel. Do not use cards to create page structure.

- Do not wrap every section in a card.
- Avoid cards nested inside cards. Use dividers and spacing inside an existing container.
- Ordinary cards remain flat with a subtle border.
- Interactive cards may change border/fill on hover but should not glow or dramatically lift.
- Durable output, approval, plan, audit, and artifact cards are valid because they represent an object with actions.

### 14.8 Dialogs, sheets, and drawers

- Dialogs are for focused decisions, blocking confirmation, or self-contained tasks.
- Sheets/drawers are for contextual tools and secondary navigation.
- Routine settings should not open a modal when an inline panel is clearer.
- Dialogs trap focus, support Escape where safe, and restore focus when closed.
- Destructive confirmation names the object and consequence.
- Content must fit within approximately 90vw and 85dvh, with one intentional scroll area.
- Mobile contextual drawers become full-screen sheets with a visible Back or Close action.

### 14.9 Toasts, banners, and inline messages

Use the least disruptive surface that fits the problem:

- Inline message: field or component-specific issue.
- Panel notice: persistent issue within a pane.
- Banner: system-wide or workflow-wide block.
- Toast: transient confirmation or background event.
- Dialog: decision required before proceeding.

Rules:

- Deduplicate identical toasts.
- Do not use a toast as the only representation of a persistent failure.
- Success toasts should be brief and disappear automatically.
- Actionable errors remain until dismissed or resolved.
- Do not show success confetti.

### 14.10 Loading and skeletons

- Keep the existing layout stable while content loads.
- Use a skeleton only when the loaded shape is known.
- Use a local spinner for a small action.
- Avoid full-screen loading when the rest of the product remains usable.
- Prefer a quiet opacity pulse over a bright sweeping shimmer.
- Streaming output must not cause repeated large layout shifts.

### 14.11 Empty states

An empty state answers:

1. What is empty?
2. Why might it be empty?
3. What is the next useful action?

Use one primary action at most. Do not blame the user.

Workspace empty states should be compact. The new-chat state may include up to three starter prompts, but it should not resemble a marketing hero after the user already understands the product. On short viewports, remove decorative logo/glow before removing useful actions.

### 14.12 Lists, trees, and tables

- Rows use consistent height and alignment.
- Selected rows use a subtle fill plus a stable indicator.
- Hover-only actions must also appear on keyboard focus and remain accessible on touch.
- Long names truncate; full values remain discoverable.
- Numeric data aligns consistently.
- Tables use sticky headers when the body scrolls.
- Avoid zebra striping in dense dark UI; rely on spacing, borders, hover, and selection.
- Primary scroll regions keep a visible thin scrollbar. Do not hide the scrollbar for a long tree or editor.

## 15. Workspace information architecture

The AI workspace follows an editor-first shell. Chat may be the active primary canvas, but the surrounding structure must behave like a development environment: persistent project context, stable panes, compact headers, keyboard navigation, and synchronised state.

The AI workspace has three primary zones:

1. **Navigation** — projects, general chats, and project chats.
2. **Primary work** — chat, prompt composer, and current conversational result.
3. **Contextual tools** — files, code, activity, assets, and details.

These zones must remain recognisable at every desktop size. They must also remain synchronised: selecting a project, chat, file, artifact, Studio target, or run in one zone updates the relevant context in the others without creating duplicate or contradictory selections.

### 15.1 Workspace shell

- The workspace fills the available dynamic viewport and owns page overflow.
- The shell uses continuous editor-style planes, thin dividers, compact headers, and restrained elevation.
- Pane boundaries remain stable during loading, streaming, selection changes, and drawer transitions.
- The current project, chat, file, Studio target, and active run form one synchronised workspace context.
- Context changes must propagate deliberately; hidden background state must not silently diverge from visible selection.
- Each pane owns at most one primary vertical scroll container.
- Use `min-width: 0` and `min-height: 0` throughout flex/grid boundaries.
- Avoid nested vertical scrolling unless a bounded popover or dialog genuinely needs it.
- Do not add a new CSS `zoom` dependency. The existing workspace zoom adapter is legacy implementation infrastructure; new components must lay out correctly at normal CSS sizing and browser zoom from 80% to 200%.

### 15.2 Canonical desktop dimensions

- Project sidebar: 272px on wide desktop.
- Project sidebar: 248px on compact desktop from 1200px to 1499px.
- Workspace tool rail: 48px.
- Context drawer: 520px default, 400px minimum, 720px maximum.
- Conversation shell: 1080px maximum.
- Assistant prose column: approximately 840px maximum.
- Composer: approximately 768px maximum.

These are stable product proportions, not values to duplicate as raw constants across components. Define them once where possible.

### 15.3 Left project sidebar

The sidebar is a project/chat tree, not a miscellaneous navigation drawer.

Required hierarchy:

- General chats are separate from project-bound chats.
- A divider separates General from Projects.
- Each project expands to its chats and relevant project items.
- Active runs remain visible without opening the chat.
- Search covers projects, chats, and creations/files.

Behaviour:

- Preserve expanded state, pins, and scroll where practical.
- Current project/chat selection expands into view.
- Row height remains 31–34px.
- Selected row uses a quiet fill plus a 2px blue indicator.
- Overflow actions appear on hover, focus, or touch—not as permanent clutter.
- Context-menu actions have an equivalent button/menu path.
- Keyboard tree behaviour supports arrows, Home, End, Enter, and Space.
- `Cmd/Ctrl+K` focuses sidebar search.
- `Cmd/Ctrl+N` starts a new chat in the current project context.
- Delete is disabled while an active run makes deletion unsafe; the UI explains why.

Responsive behaviour:

- At 1200px and above, the sidebar may remain in flow.
- Below 1200px, it becomes an overlay.
- Below 600px, it becomes a full-width navigation sheet.

### 15.4 Global workspace header

The global header is compact and utility-led. It should resemble an editor title bar or command strip, not a marketing navigation bar.

The global header owns:

- product identity;
- Quick Script versus Agent Build mode;
- model selection;
- Studio pair/connection entry point;
- account and global actions.

It must not become a second settings panel. Hide lower-priority labels before hiding critical controls. Prefer icon-plus-tooltip controls at compact widths, but keep state and destructive consequences explicit.

### 15.5 Chat header

The chat header owns:

- project breadcrumb;
- chat title and rename;
- compact current-work status;
- contextual Review/Plan entry when relevant;
- navigation button on layouts where the sidebar is overlaid.

Do not repeat every Studio detail in both the global header and chat header. A compact state may repeat only when it preserves orientation; detailed controls remain in one place.

### 15.6 Conversation

- User messages are right-aligned in a restrained bubble.
- Assistant responses are left-aligned and generally unboxed.
- The assistant identity appears once per grouped assistant turn, not beside every paragraph.
- Assistant prose uses the 840px reading column.
- Structured output may expand to the 1080px artifact width.
- User bubbles may use up to roughly 68% of the content width on desktop and 88–92% on narrow screens.
- Message actions appear on hover and focus without shifting the message.
- Editing or retrying a message must make the rewind/replace effect explicit.
- Switching chats preserves the appropriate draft and scroll position.

### 15.7 Assistant work and reasoning

The product may show verifiable progress, tool actions, files, approvals, and concise user-safe summaries of what the agent is doing.

It MUST NOT expose raw private chain-of-thought or imply that unverified model narration is an authoritative execution log.

Use language such as:

- “Inspecting Studio scripts”;
- “Preparing 3 file changes”;
- “Waiting for Studio approval”;
- “Verifying applied changes”.

A progress row must correspond to a real runtime event or tool action. Do not render a fixed fake checklist merely to make waiting feel productive.

### 15.8 Agent states in conversation

Pending work should show:

- the current real stage;
- target/context when relevant;
- any required user action;
- a scoped Stop action;
- expandable technical activity where useful.

Do not use an oversized animated loader when a compact status line is enough.

### 15.9 Chat composer

The composer is the primary action surface and remains visually stable.

Required behaviour:

- Auto-grow from 44px to 144px.
- Enter submits.
- Shift+Enter creates a new line.
- IME composition must not accidentally submit.
- Send is the primary blue action.
- During generation, Send becomes a clear red Stop action only when stopping is available.
- Prompt, attachments, selected context, mode, and target must not be silently lost after sign-in, upgrade, retry, or recoverable error.

Context:

- Show at most three context chips directly.
- Collapse additional items into a `+N` manager.
- Studio target, attachments, pending image uploads, and selected Roblox assets must be distinguishable.
- A removable context item has a visible and accessible remove action.

Controls:

- File/context add, operating mode, and Send/Stop are primary composer controls.
- Usage and advanced Studio/Roblox settings are secondary disclosures.
- Do not expose the same operating mode through two controls.
- Do not place every account, billing, model, Studio, and asset setting permanently inside the composer.

### 15.10 Operating modes

Canonical conversation modes are:

- **Agent** — autonomous project work with explicit side-effect controls.
- **Plan** — proposes and reviews a plan before execution.
- **Debug** — diagnoses and fixes a specific problem.
- **Ask** — read-only explanation and inspection.

Mode colours are category accents, not execution truth. A Plan-mode chip may be purple, but a failed Plan run is still red and a completed Plan is still green.

Changing mode updates its description, placeholder, available actions, and Studio capability explanation. Mode selection must not imply a premium tier unless the product entitlement actually gates that mode.

### 15.11 Quick Script and Agent Build

Quick Script and Agent Build are product-level workflows, not cosmetic tabs.

- Quick Script prioritises fast generation, copy, save, export, and deliberate Studio push.
- Agent Build prioritises durable conversation, project context, multi-file output, approvals, background runs, and contextual tools.
- Switching workflows must not silently discard work.
- Use consistent naming. Compact labels may say “Quick”; explanatory surfaces should say “Quick Script”.

### 15.12 Context dock

The right dock behaves like an editor auxiliary bar and panel system. It should feel structurally integrated with the workspace, not like a floating dashboard drawer.

The right dock contains one active panel at a time:

- Files;
- Code;
- Activity;
- Assets;
- Details.

Rules:

- The rail remains 48px wide.
- Rail buttons remain 38×38px with 18px icons.
- Unseen output uses a small badge, not automatic drawer opening.
- Escape closes the drawer.
- The drawer is resizable by pointer and keyboard on desktop.
- Double-clicking the resizer may reset to the default width.
- The selected panel persists while resizing.
- Below the wide breakpoint, the drawer overlays chat with a backdrop.
- On mobile, the selected tool becomes a full-screen sheet with a visible Back action.

### 15.13 Files and project tree

- Show placement-aware paths and script class where useful.
- Paths use the mono font.
- Dirty, synced, conflict, and read-only state must be explicit and not colour-only.
- Search filters the current tree without destroying selection.
- Long paths truncate from the middle or end according to which segment is most useful.
- Do not show thousands of rows without pagination or virtualisation.

### 15.14 Code editor

Monaco is the primary full editor.

- Use JetBrains Mono at a readable 12–14px size.
- Preserve line numbers, syntax, selection, and horizontal scrolling.
- Save, Save all, Revert, Refresh, and conflict actions appear only when relevant.
- Dirty state persists visibly until saved or reverted.
- A source-hash conflict must explain that Studio changed and offer refresh/review rather than silently overwriting.
- The same artifact should not open simultaneously in two competing editor metaphors. Within the full workspace, prefer the dock editor. A separate CodeDrawer is reserved for contexts outside that workspace or deliberate transient inspection.

### 15.15 Artifacts and durable output

An artifact card represents durable generated output, not every assistant reply.

An artifact should show:

- clear title;
- file count and types;
- run/apply state;
- unresolved asset count when relevant;
- QA or review state when real evidence exists;
- primary “Open in editor” action;
- secondary Refine or Export action when relevant.

Do not dump a full multi-file editor inside the chat. Small snippets are acceptable; durable multi-file output belongs in the workspace.

### 15.16 Activity and background agents

- Creating or switching chats must not stop background work.
- The sidebar shows active state and, when useful, run count for each chat.
- The Active Agents tray lists every nonterminal run, originating chat, current stage, target when relevant, and scoped Open/Cancel actions.
- A cancellation action affects only the selected run.
- A queued run and a running run must be visually different.
- Completed background work may raise a quiet badge/toast and should not force navigation.


### 15.17 Synchronised workspace state

The workspace must maintain one canonical source of truth for each of the following:

- current project;
- current chat;
- current file or artifact selection;
- current Studio target and connector session;
- current operating mode;
- current run and terminal state;
- current approval or review state.

Rules:

- A concept must not have competing active selections in different panes.
- A file opened from chat, search, activity, or an artifact must resolve to the same editor selection model.
- A Studio target change must update every visible target reference and invalidate stale approvals.
- A run opened from the sidebar, activity panel, or conversation must show the same stage and actions.
- Status labels, colours, icons, and terminology must be shared across website, connector, and plugin where the underlying state is the same.
- Local component state may control temporary presentation, but it must not invent or fork durable product state.
- When synchronisation is delayed, the UI must show reconciliation rather than presenting conflicting success states.

## 16. Truthful runtime and Studio state

The browser owns presentation and user intent. It does not advance or invent runtime truth.

### 16.1 Canonical run-state presentation

| Runtime state | Visual tone | Required meaning |
| --- | --- | --- |
| Idle | Muted | No active work |
| Queued | Info | Accepted, waiting for an execution slot |
| Planning | Purple | Preparing a plan, not yet applying changes |
| Running | Blue | Active backend/model/tool work |
| Waiting for user | Amber | A specific user decision or answer is required |
| Waiting for Studio | Amber | Backend work may continue, but a Studio-dependent step is blocked |
| Waiting for external service | Info | A named external dependency is pending |
| Verifying | Purple/info | Checking durable result or applied state |
| Completed | Green | Durable completion evidence exists |
| Failed | Red | Terminal failure with a recovery path or explanation |
| Cancelled | Muted | Durable cancellation confirmed |

Only the small running indicator may pulse. Labels and surrounding cards remain stable.

### 16.2 Studio state is multi-dimensional

The UI must distinguish:

1. connector presence: plugin, MCP, desktop connector, or combination;
2. transport health and last heartbeat;
3. exact selected place/universe/session;
4. target freshness or generation;
5. capability readiness for the requested operation;
6. review/apply policy.

“Studio live” may describe a healthy connector. “Ready to apply” requires a selected, fresh, capable target and the necessary authorisation.

### 16.3 Target communication

Before a mutation, the UI should make the bound target understandable. For high-risk or destructive actions, show:

- place name and ID where available;
- universe when ambiguity matters;
- connector/session when multiple sessions exist;
- number/type of changes;
- review mode;
- snapshot/recovery availability.

Changing target invalidates prepared approvals or writes. The UI must show that invalidation rather than silently rebinding work.

### 16.4 Connection loss

A connection-loss notice must state what is actually blocked.

Good:

> Studio disconnected. Nexus can keep planning and answering, but it cannot inspect or apply live changes until the same target reconnects.

Bad:

> Everything stopped.

### 16.5 Conflicts and uncertain execution

- `TARGET_CHANGED` and `TARGET_STALE` are blocking safety states, not generic network errors.
- Source conflicts offer refresh, compare, or review.
- An ambiguous acknowledgement uses “Confirming result…” or “Reconnecting to verify…” rather than success or failure.
- Technical IDs and protocol detail belong in an expandable details area, not the first line of the error.

### 16.6 Approvals and side effects

- Manual review should be explicit and easy to understand.
- Auto-push must never be enabled through a visually ambiguous toggle or silent default change.
- Approval cards show the target and the action being approved.
- Destructive work requires a recoverable snapshot where the runtime supports it.
- Approval buttons describe the effect: “Approve and apply”, not merely “Approve”.
- A target change after approval visibly invalidates that approval.

## 17. Error, warning, and recovery copy

Persistent error copy follows this structure:

1. **What happened.**
2. **What is affected.**
3. **What to do next.**

Example:

> Studio lost connection. Nexus can keep planning, but it cannot apply these changes. Reopen the plugin or reconnect the selected place.

Rules:

- Use plain language first.
- Name the affected object or action.
- Offer a direct recovery action when one exists.
- Preserve the user’s prompt, selection, and edits.
- Put raw codes, request IDs, and stack detail under “Technical details”.
- Never use “Something went wrong” as the entire message.
- Do not blame the user.

## 18. Responsive behaviour

Use behaviour-driven breakpoints. Prefer container queries inside the workspace.

### 18.1 Workspace ranges

| Range | Behaviour |
| --- | --- |
| 1500px and above | Sidebar and context drawer may remain in flow |
| 1200–1499px | Sidebar remains compact in flow; context drawer overlays |
| 600–1199px | Sidebar and context drawer overlay the conversation |
| Below 600px | Navigation and tools become full-screen sheets; no split editor/chat |

### 18.2 Responsive priorities

When space decreases:

1. Preserve the primary task and primary action.
2. Preserve state and recovery.
3. Hide duplicated labels.
4. Collapse secondary detail into disclosure.
5. Convert side-by-side panes into sheets.
6. Remove ambient decoration.

Do not shrink text or controls below the defined minimums to preserve a desktop layout.

### 18.3 Mobile rules

- Use `100dvh` or equivalent dynamic viewport handling.
- Respect safe-area insets.
- Keep the composer visible above the software keyboard.
- Context chips collapse before they wrap into multiple unusable rows.
- Do not rely on hover.
- Full-width sheets include a visible Back/Close control.
- User messages may use up to approximately 92% width.
- Code uses horizontal scroll and does not force the page wider.
- Touch actions remain at least 44px.

### 18.4 Short viewport rules

At low viewport height:

- remove decorative logo/glow from empty states;
- reduce vertical gaps;
- preserve starter actions and the composer;
- ensure modal actions remain visible;
- avoid a header stack that leaves too little working area.

## 19. Accessibility

Target WCAG 2.2 AA for all production product UI.

### 19.1 Keyboard

- Every action is keyboard reachable.
- Focus order follows visual order.
- Focus-visible is obvious and consistent.
- Escape dismisses the topmost dismissible layer.
- Menus, tabs, trees, dialogs, and selects follow their expected keyboard model.
- Pointer-resizable panes also support keyboard resizing.
- Hover-revealed actions appear on focus.

### 19.2 Focus

Use a 2px theme-resolved blue focus ring with sufficient offset and contrast against the current surface. Do not remove focus outlines without an equivalent visible replacement.

### 19.3 Contrast

- Normal text: target at least 4.5:1.
- Large text and meaningful UI graphics: target at least 3:1.
- Muted text below 4.5:1 is limited to nonessential metadata.
- Disabled appearance must remain understandable.
- Never place essential text over an ambient glow or image without a stable surface.

### 19.4 Semantics

- Use native controls when possible.
- Form inputs have labels.
- Icon-only buttons have accessible names.
- Status changes use a restrained `aria-live` region where necessary.
- Streaming updates should be aggregated so screen readers are not flooded.
- Trees, tabs, dialogs, and menus use correct roles and state attributes.
- Do not add `role="application"` broadly unless the entire region implements and documents an application-style keyboard model; it can interfere with normal screen-reader navigation.

### 19.5 Motion and sensory cues

- Respect reduced motion.
- Do not communicate state by colour, motion, or sound alone.
- Pulsing is limited to a small active indicator and stops in reduced-motion mode.

## 20. Content and naming

### 20.1 Product terms

- Product: **NexusRBX**.
- Assistant: **Nexus**.
- Use **AI**, not “Ai”.
- Use **Roblox Studio** on first mention, then **Studio**.
- Use **Luau** for Roblox code unless discussing Lua generally.
- Use **project**, **place**, **universe**, **session**, **connector**, and **artifact** accurately.

### 20.2 Labels

- Use sentence case.
- Start actions with verbs.
- Keep buttons concise.
- Avoid punctuation in short button labels.
- Use “Manual review”, “Auto-push”, “Studio live”, and similar labels consistently.
- Do not alternate between several names for the same workflow.

### 20.3 Status language

Status text should answer “what is happening now?”

Preferred:

- Queued;
- Planning;
- Inspecting Studio;
- Waiting for approval;
- Applying changes;
- Verifying result;
- Applied to Studio;
- Needs review;
- Reconnecting.

Avoid vague animation labels such as “Doing magic…” or “Almost there…” when the system cannot verify that claim.

### 20.4 Technical detail

The first layer of copy should be understandable to an ordinary Roblox creator. Advanced detail may reveal exact paths, IDs, hashes, connector types, and protocol state in a disclosure.

## 21. Public website and documentation

The public experience should look like a credible developer-tool company, not an AI landing-page template.

### 21.1 Public visual direction

- Same platform UI/JetBrains Mono typography system.
- Same canonical blue accent.
- Dark neutral surfaces with more whitespace than the workspace.
- Maximum content width around 1120–1200px.
- Real product screenshots, diagrams, or verified examples over generic 3D decoration.
- One strong product claim per hero.
- One primary CTA and one secondary CTA.

### 21.2 Marketing restraint

Avoid:

- giant multi-colour gradient headings on every section;
- glowing grid backgrounds on every page;
- floating neon cards;
- fake terminal output;
- unsupported speed, safety, or quality claims;
- invented customers, testimonials, ratings, or logos;
- repeated “AI-powered” badges;
- CTA colours that create a second brand system.

A single restrained gradient highlight may be used in the main marketing hero. It should not appear in normal product UI, docs, forms, or chat.

### 21.3 Product evidence

Claims should be supported by a real screenshot, workflow, benchmark, documentation, or clearly marked example. Beta limitations and review requirements should remain discoverable.

### 21.4 Documentation

- Reading column: approximately 65–76 characters.
- Clear heading hierarchy.
- Persistent navigation on larger screens.
- Code blocks include language, copy, and horizontal scroll.
- Warnings distinguish caution from destructive risk.
- No decorative card around every paragraph.

## 22. Account, billing, gates, and onboarding

### 22.1 Account and settings

- Use conventional forms and sections.
- Group settings by user intent, not backend service.
- Show current value and effect.
- Destructive account actions live in a clearly separated danger area.
- Saving state and validation are explicit.

### 22.2 Billing and plan gates

- Gate at the action boundary, not while the user is merely browsing or composing.
- Explain what the plan enables in concrete terms.
- Preserve the user’s work through sign-in or checkout.
- Do not blur content or use deceptive urgency.
- Upgrade is the primary action; “Not now” or Close remains available unless the action cannot proceed.
- Do not show several competing upgrade prompts in one flow.

### 22.3 Usage

Usage is secondary context, not the main composer action. It belongs in a compact disclosure unless low balance directly affects the next request.

### 22.4 Onboarding

- Prefer progressive inline guidance to a mandatory tour.
- Tours are skippable and do not reopen after dismissal without user request.
- Spotlight overlays must not block an essential recovery action.
- Do not teach every feature before the user has a project.
- Empty-state starters should demonstrate real NexusRBX tasks.

## 23. Roblox Studio plugin

The plugin is part of the same product but follows native Studio conventions.

### 23.1 Native first

- Use `Studio.Theme:GetColor` for backgrounds, text, input, and ordinary controls.
- Use Gotham/GothamBold or the current Studio-native type choice.
- Use compact 6px corners and 1px strokes.
- Use 10–12px internal spacing.
- Use native scrolling and keyboard behaviour.
- Do not reproduce website glass, backdrop blur, large ambient glow, or marketing gradients.

### 23.2 Plugin semantic colours

The plugin’s subdued brand palette maps to the website semantics:

- Primary/live blue: pairing, selected tab, live state.
- Purple: working/planning.
- Amber: connecting, reconnecting, confirming, warning.
- Green: completed/success.
- Red: wrong place, stale target, error, destructive action.
- Grey: unpaired, idle, disabled.

Studio theme surfaces remain dominant; semantic colour is an accent.

### 23.3 Plugin status

The plugin’s visible status is derived from a single state machine. Header, pill, banner, and actions must not contradict one another.

Canonical plugin states include:

- Not paired;
- Connecting;
- Live;
- Working;
- Reconnecting;
- Confirming;
- Wrong place;
- Target stale;
- Action needed.

Only connecting, working, reconnecting, or confirming may use a controlled pulse. Error states remain stable and readable.

### 23.4 Plugin layout

- Default floating size may remain approximately 420×620px.
- Minimum usable size is approximately 320×360px.
- Tabs group Connect, Agent, Activity, and Recovery.
- The unpaired state prioritises pairing and setup.
- Once paired, operational state and recovery are more important than repeated setup text.
- Primary plugin buttons are about 34px high; compact buttons about 28px.

### 23.5 Plugin actions

- Pair, Apply, Approve, Recover, and Disconnect must be unambiguous.
- Disabled controls expose the reason.
- Approval and recovery show the affected place and change where space permits.
- Never show “Live” while the plugin is reconnecting or targeting the wrong place.

## 24. Desktop connector

- Use the same connection and run-state language as the site and plugin.
- Prioritise current connection, selected target, health, and recovery.
- Keep the window compact and avoid public-site marketing elements.
- Native window behaviour, keyboard focus, and system menus take priority over web-style decoration.
- Do not invent another colour mapping for the same states.

## 25. Performance and implementation quality

Design quality includes responsiveness under real load.

### 25.1 Rendering

- Virtualise or paginate long project, file, asset, and activity lists.
- Avoid rerendering the whole conversation for a small status tick.
- Lazy-load Monaco, Mermaid, asset-heavy views, and other expensive tools where practical.
- Keep streaming updates batched enough to maintain smooth input and scrolling.

### 25.2 CSS and effects

- Use CSS transitions for simple state changes.
- Use Framer Motion only when coordinated presence or sequencing materially improves comprehension.
- Avoid large blurred layers over scrolling content.
- Do not leave permanent `will-change` on large elements.
- Animate transform/opacity rather than layout properties where practical.
- Avoid cumulative layout shift when data, avatars, code, or badges arrive.

### 25.3 Scroll ownership

- Page shell: fixed/contained.
- Sidebar tree: one vertical scroller.
- Conversation: one vertical scroller.
- Context drawer body: one vertical scroller per selected tool.
- Editor: Monaco owns code scrolling.
- Popovers/dialogs: bounded internal scroll only when needed.

### 25.4 Dependency discipline

Do not add another icon system, component framework, animation library, or CSS-in-JS solution for local convenience.

## 26. Visual QA and definition of done

A UI change is not complete because it looks correct in one screenshot.

### 26.1 Required state review

Test the states relevant to the component:

- empty;
- normal data;
- long text/path/title;
- loading;
- disabled;
- validation error;
- recoverable runtime error;
- disconnected/degraded Studio;
- active run;
- completed run;
- narrow width;
- short height;
- reduced motion;
- keyboard focus.

### 26.2 Viewport review

For material workspace changes, verify at least:

- 1440×900;
- 1280×800;
- 768×1024;
- 390×844;
- one short desktop viewport around 1280×720.

Also verify browser zoom at 80%, 100%, 125%, and 200% for the changed path where practical.

### 26.3 Interaction review

- Tab through the feature.
- Open and close all overlays by keyboard.
- Confirm focus returns correctly.
- Verify Escape closes only the topmost appropriate layer.
- Verify hover-only actions appear on focus and remain usable on touch.
- Verify async controls cannot be double-submitted accidentally.
- Verify navigation does not cancel unrelated background work.

### 26.4 Layout review

- No unintended page-level horizontal scroll.
- No clipped menu or tooltip.
- No hidden primary action.
- No nested competing vertical scrollbars.
- No content behind the composer or software keyboard.
- Long names truncate without hiding all identifying context.
- Drawer/sidebar transitions do not collapse the primary pane.

### 26.5 Accessibility review

- Accessible names exist.
- Labels and errors are associated correctly.
- Contrast is sufficient.
- State is not colour-only.
- Reduced-motion mode remains understandable.
- Live regions do not spam.

### 26.6 Code review

- Shared primitive reused or intentionally extended.
- No new raw component hex colours.
- No arbitrary z-index.
- No new icon-library import.
- No duplicate control for the same state.
- No fake status or unverified confidence.
- Tests cover changed behaviour.
- Production build and relevant targeted tests pass.

## 27. Prohibited patterns

The following patterns are not part of NexusRBX:

- Dashboard-style card grids inside the main workspace.
- Feature-specific spacing, row heights, or selection styles beside shared workspace primitives.
- Multiple visible representations of the same project, target, mode, or run state that can diverge.
- Floating decorative controls where a stable editor toolbar, rail, tab, or row action is clearer.
- Large branded headers that consume workspace height.
- Persistent explanatory copy where a tooltip, disclosure, or contextual status is sufficient.

- Raw hex colours scattered through feature components.
- New use of legacy turquoise/cyan values or non-semantic primary CTA colours.
- A different font on one page.
- Direct imports from random icon packages.
- Emoji used as controls.
- Giant gradient headings inside the product workspace.
- Accent-to-purple gradient borders around normal cards.
- Excessive glow, blur, or glass.
- Cards around every section.
- Cards nested repeatedly inside cards.
- Multiple dominant primary buttons in one region.
- Permanent badges for nonessential metadata.
- All-caps labels and `font-black` throughout the UI.
- Oversized pill radii on normal controls.
- Menu items that slide sideways on hover.
- Hover-only critical actions.
- Placeholder-only form labels.
- Bespoke dialog/menu/tooltip behaviour where Radix already provides it.
- Arbitrary `z-[9999]` layering.
- New layout dependence on CSS `zoom`.
- An empty code panel opened beside a new chat.
- Duplicate Plan/mode controls.
- Raw chain-of-thought presented as trustworthy progress.
- Fake progress steps.
- A “connected” indicator used as proof that writes are ready.
- Green success before durable completion evidence.
- Silent target rebinding.
- Destructive action without consequence and recovery.
- A full-screen blocker for a local recoverable issue.
- Upgrade prompts that discard the user’s work.
- Applying NexusRBX chrome to generated Roblox game UI by default.

## 28. Known legacy patterns to retire when touched

The repository currently contains valid product work alongside accumulated visual drift. When the relevant area is touched, migrate these patterns:

| Legacy pattern | Target |
| --- | --- |
| `#00e0c2`, `#00f5d4`, cyan, and teal used as brand accents | One theme-resolved canonical `--ds-accent` |
| Divergent public and product primary CTA colours | Canonical blue primary action |
| Manrope, Sora, or Inter overrides | Platform UI font stack |
| Raw dark hex values in JSX/CSS | Semantic surface tokens |
| `font-black uppercase tracking-widest` on ordinary UI | Sentence case and 500–700 weight |
| Custom local popovers and menus | Radix/shadcn behaviour with Nexus wrappers |
| Multiple Button/Card/Input systems | One product wrapper layer over behavioural primitives |
| Arbitrary high z-index | Canonical layer scale |
| Gradient text utility used broadly | Marketing hero only |
| Backdrop blur on ordinary cards | Opaque/subtle embedded surface |
| CSS zoom assumed by new components | Normal responsive layout, zoom-safe |
| Duplicate mode/Plan controls | One control per concept |
| Empty contextual panel opened by default | Dock closed; unseen badge instead |
| Raw model reasoning panel | User-safe work summary and verifiable activity |
| Dashboard-like workspace cards | Continuous editor panes, rows, tabs, and dividers |
| Feature-specific control density | Shared compact workspace dimensions |
| Divergent project/file/run selections | One synchronised workspace context |

Migration should be incremental and tested. Do not perform a blind global replacement of colours or component classes.

## 29. Repository reference map

Use these paths as implementation anchors:

- Global tokens and utilities: `src/index.css`
- Semantic aliases: `src/styles/aiTheme.css`
- Tailwind exposure: `tailwind.config.js`
- Product primitives: `src/components/ui/`
- Behavioural primitives: `src/components/shadcn/`
- Icon registry: `src/lib/icons.js`
- Workspace composition: `src/pages/ai/AgentWorkspaceLayout.jsx`
- Context dock: `src/components/ai/workspace/WorkspaceShell.jsx` and `.css`
- Project/chat tree: `src/components/sidebar/ProjectTreeSidebar.jsx` and `.css`
- Chat shell: `src/components/ai/ChatView.jsx`
- Chat header: `src/components/ai/chat/ChatHeader.jsx`
- Composer: `src/components/ai/chat/ChatComposer.jsx`
- Messages and artifacts: `src/components/ai/chat/MessageList.jsx`, `MessageBubble.jsx`, and `AssistantBubble.jsx`
- Operating modes: `src/components/ai/chatConstants.jsx`
- Public frontend: `public-frontend/`
- Studio plugin UI: `roblox-plugin/src/ui/BridgePanel.lua`
- Runtime truth and UX state contract: `docs/agent-runtime-v2.md`

These files are starting points, not permission to preserve every local style they contain.

## 30. Governance

### 30.1 Changes to the system

A new shared colour, radius, motion value, or component variant requires a reusable semantic reason. “This page looked better with it” is not enough.

When a design decision changes:

1. update this document;
2. update the canonical token or primitive;
3. migrate affected new/touched surfaces;
4. add or update tests where behaviour changes.

### 30.2 Exceptions

An exception must be deliberate, local, and documented in code or the relevant design decision. It must not silently create a second system.

### 30.3 Final review question

Before shipping, ask:

> Does this make NexusRBX easier to understand, safer to control, faster to use, and more consistent without adding visual noise?

If the answer is no, the change is not finished.
