---
title: NexusRBX Dark Build Ledger Design System
status: normative
owner: NexusRBX product and engineering
last_reviewed: 2026-08-23
applies_to:
  - src/
  - public-frontend/
---

# NexusRBX Dark Build Ledger

This file is the normative visual and interaction authority for the NexusRBX web product. The current implementation is behavioural evidence, not visual precedent.

## Authority order

When requirements conflict, use this order:

1. Product correctness, security, accessibility, and truthful runtime state.
2. `docs/design/design-anti-guide.md`.
3. This document.
4. Route-specific specifications and tests.
5. Existing implementation only as evidence of behaviour that must be preserved.

The design is initially dark-only. Stored appearance preferences may remain for rollback compatibility, but the web UI must not expose a mechanically inverted light theme until one has been designed independently.

## Product concept

NexusRBX is a working Roblox project record. Requests, object paths, Studio targets, change sets, scripts, playtests, snapshots, run identifiers, and generated assets form its visual language.

The interface must still look specific to Roblox project creation and review when the logo is removed. It must not look like a generic AI, analytics, finance, or database product.

Internal direction name: **Dark Build Ledger**. This is not customer-facing copy.

## Preserved behaviour

Visual work must preserve:

- authentication, billing, checkout, and entitlement logic;
- project, conversation, script, task, and asset data structures;
- Studio targets, bridge capabilities, source hashes, snapshots, restore, review, and approval behaviour;
- task runtime, queue, cancel, retry, and clarification flows;
- asset generation, moderation, publishing, and ownership state;
- SEO metadata, canonical URLs, structured data, and truthful claims;
- analytics event meaning;
- keyboard navigation, focus containment, focus restoration, live regions, and accessible labels;
- controllers, services, and API contracts.

Preserving behaviour never requires preserving its existing visual treatment.

## Non-negotiable exclusions

The new system must not contain:

- gradients, gradient text, auroras, blobs, particles, decorative grids, glow, or neon borders;
- glass, blur, `backdrop-filter`, translucent application chrome, or soft floating panel shadows;
- ambient looping animation, pulsing status dots, hover lift, parallax, fade-and-rise page choreography, or shimmer skeletons;
- giant centred hero copy, the standard headline/subheading/two-CTA/screenshot hero, browser mockups, or oversized final CTA panels;
- equal feature-card grids, universal rounded cards, generic KPI tiles, or cards nested inside cards;
- pill navigation, pill filters, pill status, pill actions, or `9999px` radii outside literal radios, avatars, and plotted points;
- a neutral system in which purple is the universal action, link, chart, selected-state, and status colour;
- decorative icons beside headings, icon tiles, sparkle/robot/wand/brain motifs, or line icons as brand identity;
- terminal or code styling when the content is not real source, a real identifier, or a real log;
- a permanent generic sidebar/top-bar/canvas shell;
- pricing cards, a recommended badge, centred auth cards, or centred icon/heading/CTA empty states;
- a mobile layout produced by merely stacking or shrinking desktop columns;
- an exposed mechanically inverted light mode;
- Instrument Sans, JetBrains Mono, or runtime Google Fonts imports in migrated surfaces.

Functional icons, boundaries, monospace, overlays, circles, and motion are allowed only when their literal task requires them. An exception must not become a decorative language.

## Canonical palette

Raw values live only in `src/design/nexus-foundation.css`.

- Canvas: warm charcoal/plum-brown, never pure black, blue-black, or navy.
- Work fields: a small number of solid graphite/plum surfaces.
- Body copy: warm off-white.
- Purple: branded textual ink for route headings, phase words, active requests, project and artifact names, selected paths, and occasional identifiers.
- Semantic colours: reserved for literal information, success, warning, and failure, always paired with text or shape.
- Focus: high-contrast and visible on every interactive element.

Purple must not become a button fill, aura, generic link colour, or decorative background system.

## Typography

- Display and route headings: Sofia Sans Condensed Variable.
- Body and interface: Atkinson Hyperlegible Next Variable.
- Source, identifiers, paths, and logs only: Atkinson Hyperlegible Mono Variable.

Fonts are self-hosted through the build. Body copy is at least 16px on small screens. Headings normally stay between 28px and 58px. Do not use monospace for ordinary metadata or turn typography into the entire brand.

## Spacing and geometry

The canonical rhythm is 5, 9, 15, 23, 37, 59, and 95 pixels. Different shells use different density; the scale is not a demand for uniform spacing.

- Use open fields, alignment, background changes, indentation, and one-sided structural rules.
- Ordinary fields use square corners or 2–5px radii.
- Use a boundary only when it clarifies an input, table region, selected object, or focus.
- Avoid borders around every component.
- Touch targets remain at least 44px without forcing every visible control to the same height.

## Interaction and motion

Default state changes are immediate. Motion may explain a real expansion, takeover, stage resize, generated object, diff update, test run, or active operation. It must be short, interruptible, transform/opacity based, and have a reduced-motion equivalent.

Every action needs a distinct hover, pressed, focus-visible, disabled, loading, success, and error state where relevant. Errors state what failed, what remains safe, what is blocked, and whether retry is safe.

## Shared primitives

The canonical presentation layer lives in `src/components/universal/` and `src/design/`.

Use shared primitives such as:

- `UniversalBrand`, `UniversalHeaderFrame`, and `UniversalSiteIndex`;
- `TextAction`, `StateMark`, `StructuralRule`, `RouteHeading`, and `ProjectPath`;
- `LedgerRow`, `RecordList`, `FieldFrame`, `OpenDisclosure`, and `ContactSheet`;
- `ModalFrame`, `TakeoverSurface`, `ErrorRecord`, and `LoadingRecord`.

Do not introduce a generic `Card` as the centre of the system. Framework adapters may provide navigation, current route, identity, and analytics, but they must not duplicate presentation markup or tokens.

## Five task-specific shells

### Public

Routes: `/`, `/pricing`, `/downloads`, `/docs`, `/legal`, SEO landing pages, and public contact.

The public shell explains, proves, and routes. Its header is solid, edge-to-edge, text-led, and compact. Primary navigation is `BUILD`, `TOOLS`, `DOCS`, and `PRICING`. Secondary destinations live in a full site index and footer.

### Workspace

Routes: `/ai` and workspace-context script views.

The workspace uses a ribbon, compressed project index, request field, attached workbench, and contextual embedded evidence stage. It does not show the public marketing header.

### Tools

Routes: icon generation, assets, asset detail, and Creator Store.

Tools use open work fields, project context, a task-specific result stage, contact sheets, and asset records rather than a repeated header/card/form/result template.

### Account

Routes: settings, billing, subscribe, support, tickets, and admin support.

Account screens are records and documents with text indexes, ruled form groups, ledgers, and operational tables.

### Authentication

Routes: sign in, sign up, password recovery, and verification.

Auth uses an open split composition with meaningful Nexus project evidence, not a centred form card.

## Route requirements

### `/ai`

Preserve `useAiWorkspaceController` and all runtime truth. Recompose into:

1. Workspace ribbon: project, mode, Studio target, active run, account.
2. Project index: compressed edge index; expanded text tree or full-height medium-screen takeover.
3. Request field: work ledger, not bubbles or cards.
4. Evidence stage: embedded 38–46% field with `FILES`, `CODE`, `RUN`, `ASSETS`, and `PROJECT` lenses.
5. Workbench composer: attached field with `BUILD`, `SCRIPT`, and `ASK` text modes.

Mobile uses distinct `PROJECT`, `REQUEST`, `EVIDENCE`, and `WORKBENCH` task states with preserved context and predictable back behaviour.

### Homepage

Open with a real request becoming a Roblox project. Use a project/world cutaway, object names, change marks, and the real prompt field. Continue as one build narrative that changes composition across request, project read, construction, code, playtest failure, correction, and review. Genres form one selectable build atlas, not equal cards. Finish with reviewed state and a new request field, not a giant CTA panel.

### Pricing

Use an access ledger: plan rows on desktop and open definition lists on mobile. Monthly/yearly is a labelled choice, Team seats are inline, billing terms remain visible, and there is no recommended badge.

### Docs, SEO, downloads, and legal

Docs use a text document index and actual code only. SEO pages open with real example request/output records, limits, failure/recovery, truthful FAQ disclosures, and a related text index. Downloads are release records. Legal pages use strong document hierarchy and readable measure.

### Tools and assets

The icon generator is an asset desk: brief left, large result field right, plain advanced disclosure, contact-sheet output, and a publishing record. Asset library views are contact sheet, compact record list, and pack record. Filters are labelled fields, not chips. Asset detail uses one large asset and one metadata ledger.

### Account, auth, support, and admin

Settings uses a text index and ruled form groups. Billing uses current-plan, usage, payment, and invoice ledgers. Support is a case record with project and evidence. Admin uses dense operational records rather than ornamental KPI rows.

## Responsive and accessibility gates

Verify at 320px, 412px, 834px, 1136px, and 1512px, at 200% zoom, with reduced motion, and with increased contrast where supported.

All important content and actions must remain keyboard reachable. Preserve skip links, semantic headings, visible focus, modal and takeover focus containment, focus restoration, Escape handling, labels, descriptions, live regions, non-colour status cues, minimum touch targets, and screen-reader names.

Purple is never the only indicator of selection or state.

## Definition of done

The revamp is complete only when:

1. One canonical foundation powers both React and Next.js surfaces.
2. The old light inversion is no longer exposed.
3. Public, workspace, tool, account, and auth shells are distinct but recognisably NexusRBX.
4. `/ai` is a Roblox request-and-evidence workspace rather than a generic AI dashboard.
5. Major routes have migrated away from card, pill, glass, generic hero, and decorative icon conventions.
6. The design guard blocks reintroduction of banned patterns in migrated UI.
7. Keyboard, screen-reader, responsive, zoom, contrast, and reduced-motion behaviour are verified.
8. Removing the logo still leaves a product visibly authored for Roblox project creation, review, and Studio handoff.

Final rejection test: if this exact system could move into a generic AI database, finance, or analytics product without major redesign, it has failed.
