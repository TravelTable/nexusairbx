# NexusRBX conversational studio redesign research

**Status:** Implemented; automated release gates and current Edge responsive/reduced-motion QA passed; real attachment file-selection remains limited by Edge extension file access  
**Date:** 2026-08-13  
**Supersedes:** The purple 2D creator-workshop direction documented on 2026-08-12  
**Implementation state:** The core public, workspace, auth, onboarding, settings, pricing, Creator Store, and documentation surfaces now follow this direction. This document records both the research rationale and the implementation/validation result.

## 1. Executive verdict

Before this redesign, NexusRBX had a stronger product engine than its interface suggested. The inspected experience visually combined three competing products:

1. a marketing-style purple “creator workshop” empty state;
2. a developer IDE with two headers, a persistent project tree, and a permanent five-tool rail; and
3. a large onboarding coachmark layered over an already dense composer.

That hierarchy made a capable Roblox production system feel harder to understand than it is. On a 390px-wide viewport, the project sidebar and milestone card could consume almost the entire usable screen before the user reached the conversation. On desktop, project navigation, global controls, workspace controls, the right tool rail, the composer, and onboarding all competed for the same visual priority.

The redesign should preserve the engine and rebuild the chrome around one dominant idea:

> **NexusRBX is a conversational Roblox production studio. Conversation is the workspace; the Stage shows the work.**

The resulting product should combine:

- Lemonade's speed to first prompt;
- ChatGPT's conversational restraint and progressive disclosure;
- Higgsfield's confidence in presenting generated output;
- Roblox-native project context, review, recovery, and playtest evidence; and
- an original flat 2D Nexus construction language derived from the original rounded **N** mark.

The interface should be calm and almost monochrome when idle. Purple should appear only while Nexus intelligence is active, while an AI-authored change is selected, or while a construction path is being traced.

## 2. Research method and limits

Competitive research used the user's signed-in Microsoft Edge session and live product interfaces. During that research, no projects were created, no prompts were submitted, no account settings were changed, and no purchases were made. Asset generation occurred later as a separate production step recorded in §15.

Inspected surfaces:

- [Lemonade landing](https://lemonade.gg/), [dashboard](https://lemonade.gg/dashboard), project-creation modal, account/theme menus, sign-in flow, and [Roblox plugin listing](https://create.roblox.com/store/asset/85716018250741)
- [ChatGPT](https://chatgpt.com/) idle Chat and Work surfaces, collapsed and expanded navigation, project selection, and composer controls
- [Higgsfield image generation](https://higgsfield.ai/ai/image?model=nano-banana-pro), [assets](https://higgsfield.ai/asset/all), asset preview, [Canvas](https://higgsfield.ai/canvas), [Cinema Studio](https://higgsfield.ai/generate), a public project page, and a public project brief/workspace
- Pre-redesign NexusRBX at local `/` and `/ai`, including desktop and 390px behaviour
- Current repository routes, components, styling, icons, onboarding, Studio bridge, billing, asset, and public-frontend contracts
- Bing searches of Roblox creator discussions and current Roblox Studio AI capabilities
- Reddit discussions in `r/robloxgamedev`
- Roblox Developer Forum announcements and feature requests

Limit: Lemonade's generated project workspace could not be inspected without creating a project, so its plan, code, sync, and output behaviour remain unverified. This is recorded as unknown rather than inferred.

## 3. Competitive findings

### 3.1 Lemonade.gg — immediate, but shallow in the visible journey

#### Principle worth retaining

- One dominant act: the prompt is unquestionably the main action.
- Inspiration is placed near the composer to reduce blank-canvas anxiety.
- Generate and Continue remain disabled until valid input exists.
- Project creation is a small, focused step rather than a dashboard wizard.
- Roblox authentication is explicit and native to the product story.
- The site honours reduced-motion preferences.

#### Pattern worth adapting

- Use a small set of stable, selectable Roblox creation starters near the empty composer.
- Teach useful prompt structure through examples: player fantasy, core loop, genre, multiplayer shape, art direction, and first shippable system.
- Let the user begin immediately, then ask for project naming or Studio connection only when required.
- Keep transitions short—roughly 140–180ms for ordinary controls—and reserve longer choreography for the first product demonstration.

#### Pattern to avoid

- The landing page uses a fixed cinematic stage and image conveyor that makes ordinary exploration unpredictable.
- Visual proof is abundant but poorly explained; images do not establish provenance, affected systems, or whether a result worked.
- The public journey does not surface plans, diffs, Studio state, validation, recovery, or playtest evidence.
- The dashboard shows a bare multi-second “Loading user data...” state.
- Selecting a suggestion opens project creation unexpectedly rather than preserving a clear input-to-action relationship.
- At 390px, the 224px sidebar remains visible, leaving roughly 166px for the primary experience. Content is clipped rather than meaningfully reflowed.
- Several controls are under 44px and decorative text layers create duplicated accessible names.

#### Nexus-specific opportunity

Lemonade proves that starting must feel immediate. Nexus should match that speed while immediately communicating deeper control:

- selected Roblox place and project context;
- what Nexus inspected;
- a compact plan before meaningful writes;
- affected scripts, instances, UI, and assets;
- a reviewable multi-file change set;
- snapshot/recovery state;
- validation and playtest evidence; and
- a clear next conversational action.

### 3.2 ChatGPT — conversation as the interface

#### Principle worth retaining

- The idle screen is quiet, with the composer as the visual anchor.
- Navigation collapses to a compact rail and expands only when history or projects matter.
- Conversation uses natural document hierarchy rather than putting every assistant response in a large card.
- Controls appear progressively. Work mode adds project and tool context without turning the page into a conventional dashboard.
- Dark mode relies primarily on typography, spacing, and surface contrast rather than decorative colour.

#### Pattern worth adapting

- A restrained left project/history navigator that can collapse completely.
- A single composer whose advanced context, mode, model, and connection controls are disclosed only when invoked.
- Compact project context beneath or within the composer.
- Reading-width assistant responses with contextual actions close to the content they affect.
- Temporary controls that appear on hover/focus but remain keyboard reachable.

#### Pattern to avoid

- Do not copy ChatGPT's navigation labels, icons, proportions, or wording.
- Do not leave excessive empty space when a development task has useful project context to show.
- Do not hide the Roblox object graph, changes, or verification behind a generic chat transcript.

#### Nexus-specific opportunity

Conversation stays central, but the Stage opens only when a plan, script, diff, scene, UI, hierarchy, asset, or playtest result deserves visual space. Nexus should feel like conversation becoming construction, not ChatGPT with a Roblox badge.

### 3.3 Higgsfield — output deserves space

#### Principle worth retaining

- Generated output receives most of the screen once it exists.
- Asset history is browsable, grouped, and persistent.
- A selected asset opens into a large preview with a narrower metadata/action panel.
- Projects have briefs, folders, iteration history, and a resizable split.
- Canvas demonstrates how spatial relationships can be shown without turning every item into a dashboard card.

#### Pattern worth adapting

- The Stage should be resizable and fullscreen-capable.
- Artifact-specific actions should live beside the artifact: compare, approve, apply, restore, download, open in Studio, or continue iterating.
- Project briefs and iteration groups should be first-class outputs, not buried chat attachments.
- A created result should have a clear selected state and enough negative space to feel important.

#### Pattern to avoid

- Higgsfield's global navigation, mode selectors, upsells, and banners are visually overstuffed.
- Lime is used so broadly that it loses semantic meaning.
- Some generator states present giant empty loading/output areas with weak guidance.
- Canvas-style glow and gradients should not become Nexus's identity.
- Live inspected pages emitted a React hydration warning; Nexus should not trade visual ambition for runtime instability.

#### Nexus-specific opportunity

Use the same confidence for Roblox-specific artifacts: a scene preview, a precise script diff, a generated ScreenGui, the affected Explorer hierarchy, an asset pack, or a playtest report. Unlike a media app, the Stage must always preserve project context and change safety.

## 4. Roblox ecosystem and creator evidence

The competitive bar has moved. Roblox's current Assistant work includes a Data Model Search subagent, Playtest subagent, built-in MCP server, and one-toggle Quick Connect for supported external clients. Roblox explicitly describes keeping low-level exploration out of the main conversation and returning compact findings instead. It is also working on context compaction, multi-chat sessions, history, and stable instance identifiers.

Primary sources:

- [Data Model Search subagent and Quick Connect](https://devforum.roblox.com/t/assistant-updates-the-data-model-search-subagent-and-quick-connect-for-mcp-clients/4596579)
- [Script revert support request for MCP and Assistant edits](https://devforum.roblox.com/t/script-revert-support-for-mcp-and-assistant-edits/4545404)
- [Roblox Assistant full release](https://devforum.roblox.com/t/full-release-use-assistant-to-boost-your-productivity/3294217)

Design implication: “AI can see Studio” is no longer enough positioning. Nexus must make its higher-order workflow visibly better:

1. retain the full project brief and architecture intent;
2. make multi-file work understandable as one request-scoped change set;
3. show exactly what was inspected and what was changed without dumping raw tool noise into chat;
4. allow selective review, approval, and recovery;
5. connect changes to playtest evidence; and
6. preserve an iteration history that a creator can resume.

### Reddit creator themes

Sources:

- [“Is Roblox Studio assistant usable?”](https://www.reddit.com/r/robloxgamedev/comments/1ce5tji/is_roblox_studio_assistant_usable/)
- [“What's your honest experience using AI for game development?”](https://www.reddit.com/r/robloxgamedev/comments/1sd2hfv/whats_your_honest_experience_using_ai_for_game/)
- [Bing-indexed AI code-completion discussion](https://www.reddit.com/r/robloxgamedev/comments/12pnaj3/have_you_used_ai_code_completion_if_so_what_do/)

Recurring concerns:

- hallucinated Roblox APIs and incorrect client/server assumptions;
- no awareness of the Explorer tree, dependent scripts, shared RemoteEvents, or wider architecture;
- context loss across conversations and long tasks;
- silent removal of edge cases during refactors;
- changes that look valid but break a separate system;
- unclear working/stopped states;
- direct writes that are difficult to track or revert as a batch; and
- creators needing to understand and review their own systems rather than surrendering control.

Positive signals:

- creators value rapid proof-of-concept work and faster game-loop testing;
- project-aware MCP connections materially improve usefulness;
- scoped agents can search and playtest without flooding the main conversation;
- a maintained game-design document/project brief improves continuity; and
- the ideal role is a capable tool and teacher, not an opaque replacement for the creator.

These findings support a UI that makes context, scope, changes, and evidence visible while keeping raw tool mechanics progressively disclosed.

## 5. Current NexusRBX audit

### Preserve

- `src/pages/ai/useAiWorkspaceController.js`: authentication, billing, project context, Studio state, chat operations, artifacts, and task actions remain outside the visual shell.
- Conversation behaviour: streaming reconciliation, optimistic sends, retry, edit/rewind, checkpoints, pending turns, attachments, reports, and scroll restoration.
- Studio safety contracts: explicit place selection, capability distinction, targeted reads, `expectedSourceHash`, destructive snapshots, conflict recovery, manual review, validation, retry/cancel/amend/approve, and structured errors.
- Project tree behaviours: search, pins, expansion persistence, rename/move/delete, keyboard navigation, active-run restrictions, connection state, and context menus.
- Workspace panel mechanics: resizing, keyboard separator support, modal/inert behaviour, Escape, and focus restoration.
- Five onboarding milestones: idea, optional Studio connection, plan approval, change review/apply, and playtest verification.
- System/Light/Dark preference and prepaint mechanism.
- Instrument Sans for UI, JetBrains Mono for code, and the current `currentColor` line-icon foundation.
- Route ownership, public SEO/SSR, billing/catalog integrity, auth/business logic, downloads verification, and legal canonical behaviour.

### Refine

- Project navigation becomes narrower, quieter, and collapsible.
- Conversation uses a calm reading width and fewer bubble/container treatments.
- Studio connection becomes a compact context chip with clear blockers.
- Settings, docs, downloads, pricing, and billing keep their information architecture but inherit the monochrome system and reduced nesting.
- Assets and the Creator Store become contextual artifact/library surfaces launched from conversation or the Stage.
- Auth forms keep their logic but move into a simple one-column continuation surface.

### Rebuild

- The `/ai` outer shell and stacked header hierarchy.
- `ChatEmptyState`: remove “Creator workshop,” the build-path dashboard, and three oversized starter cards.
- `ChatComposer`: regroup attachment, context, operation mode, model, usage, Studio, queue, and send/stop through progressive disclosure.
- `WorkspaceShell`: replace the permanent Files/Code/Runs/Assets/Project rail with one contextual Stage plus secondary artifact destinations.
- Plan/task presentation: consolidate plan, work stream, details, validation, testing, and architecture into a coherent request lifecycle in the Stage.
- Onboarding delivery: replace the large purple coachmark with inline or collision-aware guidance.
- The public homepage: replace the cartoon workshop with a real product-led conversation-to-construction demonstration.
- Brand assets: rebuild the mark as true single-ink light/dark assets derived from the original N geometry.

### Remove after dependency verification

- Decorative float, shimmer, glow, and pulse effects unrelated to actual work.
- The permanent five-choice right rail as a primary navigation model.
- Marketing-scale feature cards inside the working product.
- Duplicate billing mutations in Settings.
- Legacy homepage image chains and unused cinematic variants.
- Duplicated and unused large public assets.
- CSS override archaeology in asset surfaces; consolidate rather than layer another generation.

## 6. Chosen information architecture

```text
┌──────────────┬─────────────────────────────────┬─────────────────────────┐
│ Projects     │ Conversation                    │ Stage                   │
│              │                                 │                         │
│ New          │ request                         │ plan / scene / UI       │
│ Active       │ concise Nexus response          │ script / diff / tree    │
│ Recent       │ request-scoped progress rail    │ assets / playtest       │
│ Saved        │ confirmations and next action   │                         │
│              │                                 │ contextual actions      │
│ Account      │ composer                        │                         │
└──────────────┴─────────────────────────────────┴─────────────────────────┘
```

Rules:

- Conversation owns the centre and remains usable with both side regions closed.
- The left navigator is support UI, not a second workspace.
- The Stage is hidden when no meaningful artifact exists.
- Selecting a plan, change set, script, scene, asset, or test result opens the appropriate Stage renderer.
- The Stage can collapse, resize on desktop, and become fullscreen.
- At tablet widths the Stage becomes a modal sheet/drawer; on mobile it becomes a full-screen layer with a clear route back to conversation.
- The composer remains anchored and usable at every viewport.

## 7. Interaction model

### Resting state

- near-monochrome surfaces;
- no continuous decorative movement;
- compact composer with one strong placeholder: “Ask Nexus to build, change, debug, or explain something…”;
- a few text-led Roblox starters, not a grid of marketing cards;
- Studio/project context visible only when authoritative;
- Stage closed unless the user reopens a relevant prior artifact.

### Active state

- a thin purple construction trace marks the active request and current step;
- the request-scoped progress rail moves through Understanding, Inspecting, Planning, Building, Testing, and Complete;
- completed steps collapse into quiet evidence;
- the Stage opens when a meaningful artifact is ready;
- related objects, files, or systems can be connected with precise lines or selection frames;
- when work completes, animation settles and most purple disappears.

### Composer disclosure

Always visible:

- prompt input;
- attach/reference entry;
- current operation label;
- send/stop.

Contextually visible:

- selected project/place/object/file chips;
- queued prompt state;
- plan-first state when meaningful;
- a single blocker or permission message.

Disclosed from menus:

- model and usage;
- Studio/Roblox advanced controls;
- detailed operating mode;
- attachment management;
- advanced context selection.

Existing runtime identifiers remain intact. The initial UI language should consolidate them into creator outcomes rather than exposing internal mode complexity.

## 8. Approved visual system baseline

### Typography

- UI and editorial: Instrument Sans.
- Code, identifiers, hashes, and logs: JetBrains Mono.
- Bricolage Grotesque is retired from application UI and should not drive the public visual identity. If retained at all, it is limited to rare campaign artwork, not product headings.

### Dark resting palette

| Token | Value | Purpose |
|---|---:|---|
| `--nexus-canvas` | `#0B0B0C` | application background |
| `--nexus-surface-1` | `#111214` | conversation/sidebar surface |
| `--nexus-surface-2` | `#17181B` | raised controls and Stage chrome |
| `--nexus-surface-3` | `#1D1F23` | hover/selected neutral state |
| `--nexus-border` | `#2A2C31` | quiet separators |
| `--nexus-border-strong` | `#3A3D44` | focus-adjacent structural border |
| `--nexus-text` | `#F5F5F3` | primary text |
| `--nexus-text-muted` | `#A6A8AE` | secondary readable text |
| `--nexus-text-subtle` | `#777A82` | tertiary labels; never critical copy |

### Light resting palette

| Token | Value | Purpose |
|---|---:|---|
| `--nexus-canvas` | `#F6F6F3` | application background |
| `--nexus-surface-1` | `#FFFFFF` | conversation/sidebar surface |
| `--nexus-surface-2` | `#EFEFEB` | raised controls and Stage chrome |
| `--nexus-surface-3` | `#E7E7E2` | hover/selected neutral state |
| `--nexus-border` | `#D6D6D0` | quiet separators |
| `--nexus-border-strong` | `#BDBDB6` | structural border |
| `--nexus-text` | `#111214` | primary text |
| `--nexus-text-muted` | `#5C5F65` | secondary text |
| `--nexus-text-subtle` | `#73767C` | tertiary labels |

### Semantic colour

- Active Nexus intelligence, dark: `#A78BFA`.
- Active Nexus intelligence, light: `#6D28D9`.
- Purple may appear as a trace, active edge, selected AI-authored change, or brief internal light. It is not a page fill.
- Success, warning, and danger retain restrained accessible colours and always pair colour with text/icon/state.

### Geometry

- Base radii: 6px controls, 10px grouped controls, 14px major surfaces, 18px modal/fullscreen sheets.
- Pills are reserved for chips, status, and segmented controls.
- Layout hierarchy should come from spacing and alignment before borders and backgrounds.
- Touch targets remain at least 44px; mobile text inputs remain at least 16px.

### Motion primitives

| Primitive | Duration | Use |
|---|---:|---|
| press | 90ms | button compression/release |
| reveal | 150ms | contextual controls and menus |
| dock | 220ms | sidebar/small panel docking |
| stage | 300ms | Stage open, collapse, renderer transition |
| construct | 520–800ms once | connection trace or assembly event |

Primary easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Motion uses opacity and transform where possible. Construction traces run once per meaningful state change and then settle. Reduced motion removes travel/assembly while retaining immediate state clarity.

## 9. Nexus icon and asset direction

The original high-resolution mark in repository history is a 1024×1024 rounded N made from one continuous folded stroke with soft corners and strong negative space. Its old purple-to-cyan gradient is not the new palette, but its silhouette is the correct visual DNA.

The newer purple square, sparkle, and coral dot treatment is not suitable for the new system. Preserve the N path and corner language; remove decorative sparkle/dot motifs.

### Functional icons

- Keep the repository's `currentColor` line-icon system.
- Standardise stroke, optical box, and corner treatment at 16, 20, and 24px.
- Use custom Nexus-derived SVGs only where they improve product meaning: Stage, construct, snapshot, Studio bridge, and completion.
- Never use raster generation for ordinary toolbar actions.

### Display icons

Display icons must be flat 2D graphics, not rendered product objects. Use confident vector-like shapes, controlled ink contours, subtle print/paper texture inside shapes, and almost no implied depth. The palette remains matte near-black, warm off-white, neutral grey, with an occasional flat purple construction route.

Avoid extrusion, bevels, realistic materials, isometric camera angles, glossy lighting, cast shadows, and 3D object rendering. A small layer offset or cut-paper overlap is acceptable only when it clarifies assembly.

At concept stage, **Build** was the master concept—three flat rounded N-derived pieces precisely docking into one complete form. After approval, Ask, Edit, Debug, Plan, Studio Connect, Assets, Snapshot, Publish, and Complete were created individually as a tested ten-file production family.

### Environmental asset briefs

| Asset | Placement | Ratio | Purpose |
|---|---|---:|---|
| World under construction | homepage product hero background | 16:9 | use a flat 2D cutaway/block-map illustration to show a grey blockout becoming a finished Roblox-like environment with one temporary purple construction route |
| Project X-ray | project-awareness chapter and Stage empty/demo state | 3:2 | use a crisp 2D exploded diagram to reveal systems, scripts, UI, lighting, and hierarchy relationships without fake labels |
| Blockout → finished | iteration chapter | 16:10 | use three consistent flat 2D states for a real before/intermediate/after slider with fixed framing and object placement |
| Interface assembly | UI-generation chapter | 4:3 | give real coded UI a flat geometric alignment plate without fake interface text or floating glass cards |
| Debug trace | debugging chapter/Stage demo | 3:2 | tell one calm 2D diagnostic story through related objects and a single trace |
| Nexus ↔ Studio bridge | Studio chapter | wide plate | use a flat split-workspace composition with room to composite real Nexus and Studio screenshots over a restrained transfer path |

Generated images must never fabricate Nexus UI. Product screenshots are captured from the real implementation. Environmental artwork should feel like editorial 2D construction diagrams or stylised game-world plates, not isometric 3D renders.

### Saved visual checkpoints

- Original mark DNA: `artifacts/design-research-2026-08-13/nexus-original-mark-1024.png`
- Flat Build icon study: `artifacts/design-research-2026-08-13/nexus-build-2d-v1.png`
- Higgsfield 2D world-under-construction plate: `artifacts/design-research-2026-08-13/nexus-world-under-construction-2d-higgsfield-v1.webp`
- Final flat project x-ray: `artifacts/design-research-2026-08-13/nexus-project-xray-2d-final-v1.png`
- Final three-state world transformation: `artifacts/design-research-2026-08-13/nexus-world-transformation-2d-final-v1.png`
- Final flat diagnostic trace: `artifacts/design-research-2026-08-13/nexus-debug-trace-2d-final-v1.png`
- Final interface-assembly plate: `artifacts/design-research-2026-08-13/nexus-interface-assembly-2d-final-v1.png`
- Final flat Nexus ↔ Studio bridge: `artifacts/design-research-2026-08-13/nexus-studio-bridge-2d-final-v1.png`
- Eight-world template contact sheet: `artifacts/design-research-2026-08-13/nexus-template-worlds-2d-contact-v1.webp`
- Full template source sheets: [sheet A](../artifacts/design-research-2026-08-13/nexus-template-worlds-sheet-a-2d-final-v1.png) and [sheet B](../artifacts/design-research-2026-08-13/nexus-template-worlds-sheet-b-2d-final-v1.png)
- Production display-icon reference board: [`docs/nexus-display-icon-system.md`](./nexus-display-icon-system.md)

The environmental plate is the approved direction to test in composition: straight-on editorial illustration, visible hand/print texture, a limited natural palette, and one flat purple construction route. It is a reference layer, not a fake product screenshot. The previously generated 3D/isometric studies are rejected and must not be used as implementation references.

## 10. Public landing experience

The product is the hero. The first viewport should show a quiet real Nexus composer and a believable request such as:

> Create a futuristic inventory UI that matches my existing game.

The live demonstration should progress through:

1. request received;
2. project context inspected;
3. compact plan formed;
4. Stage opens;
5. generated UI/change set appears;
6. review and playtest evidence become visible;
7. the interface settles with one continuation action.

The page should use a few experiential chapters rather than repeated feature cards:

- Describe it.
- Watch it take shape.
- Understand every change.
- Debug with context.
- Continue inside Studio.
- Built with Nexus.

Roblox relevance must be explicit in the first viewport. Creator upside should be framed honestly as faster iteration toward a compelling, testable, publishable game—not a guarantee of Robux or income.

## 11. Responsive and accessibility contract

Audit at 375, 768, 1024, 1200, and 1440px.

- Desktop: collapsible project navigator; conversation primary; Stage resizable and optional.
- Laptop/tablet: project navigator and Stage become mutually exclusive overlays or sheets where needed; they must not squeeze the composer into an unusable lane.
- Mobile: neither sidebar nor Stage starts open; Stage becomes a full-screen layer with a clear Back to conversation action.
- Composer always clears the safe area and virtual keyboard.
- Dialogs and modal panels trap focus, mark background inert, close with Escape, and restore trigger focus.
- All icon-only actions have accessible names.
- Dynamic AI/tool states use appropriate live regions without announcing every token.
- No information depends on purple alone.
- Visible focus remains high contrast in both themes.
- Reduced motion, reduced transparency, and high-contrast preferences remain supported.

## 12. Implementation sequence

1. Convert research decisions into central tokens, typography, and motion primitives.
2. Rebuild the application shell without altering route ownership or runtime contracts.
3. Refine conversation rendering and request-scoped progress.
4. Rebuild composer grouping with progressive disclosure.
5. Convert the right rail into the contextual Stage while preserving renderer/action contracts.
6. Refine project navigation and responsive overlays.
7. Replace coachmark onboarding with inline/collision-aware guidance.
8. Rebuild the public landing experience around a real product demonstration.
9. Rebuild the brand mark and integrate approved display/environment assets.
10. Restyle/refine auth, settings, billing, assets, Creator Store, docs, pricing, and downloads.
11. Run responsive, accessibility, reduced-motion, performance, and visual QA.
12. Capture real final product screenshots and remove superseded visual assets only after import verification.

## 13. Protected validation boundary

Visual assertions may be rewritten to enforce this monochrome system, but behavioural contracts must not be deleted. High-signal suites include:

- `src/styles/designContract.test.js`
- `src/styles/aiTheme.test.js`
- `AgentWorkspaceLayout.taskRuntime.test.jsx`
- `useAiWorkspaceController.layout.test.js`
- `WorkspaceShell.test.jsx`
- `ProjectTreeSidebar.test.jsx`
- `sidebarTreeModel.test.js`
- `ChatComposer.test.jsx`
- `ChatHeader.test.jsx`
- `ChatEmptyState.test.jsx`
- `MessageList.test.jsx`
- `QuickScriptWorkspace.test.jsx`
- onboarding tests
- Studio connection/target/control/validation tests
- `src/App.routes.test.js`
- public-frontend static contracts
- backend Studio protocol tests and syntax checks

Final delivery also requires real browser QA of landing, auth, onboarding, project navigation, conversation, attachments, Stage, Studio UI, loading, errors, settings, keyboard interactions, and reduced motion. A successful compile alone is not completion.

## 14. Design decision summary

Approved direction:

- default experience: professional, dark, nearly monochrome;
- support light and system themes with equivalent semantics;
- conversation-first shell;
- optional contextual Stage;
- restrained project navigator;
- purple only for active Nexus intelligence;
- original N silhouette as visual DNA;
- flat 2D graphic construction art, with no glossy or isometric 3D display objects;
- real Roblox project context, changes, and test evidence as the product's strongest visual proof;
- motion as construction and connection, never constant decoration.

Rejected direction:

- purple-themed pages;
- cartoon workshop styling;
- glassmorphism and blurred-gradient identity;
- permanent multi-tool rails;
- generic AI orb/sparkle language;
- dashboards made of feature cards;
- fictional product screenshots;
- 3D product-object icons and generic isometric environment renders;
- colour or motion without semantic purpose.

Final test:

> If the NexusRBX name disappears, the interface should still read as a purpose-built Roblox creation system: talk to the project, see what Nexus understands, review what changes, inspect the result, verify it, and keep building.

## 15. Implementation and validation record

Implemented on 2026-08-13:

- Rebuilt the shared public landing page around a functional prompt handoff and a coded, interactive prompt → inspect → plan → build → playtest → review demonstration. The displayed Arcade District project is illustrative, not a captured live Studio session.
- Replaced the 3D/isometric creator imagery with an original flat 2D ink, screenprint, and construction-paper world.
- Rebuilt `/ai` around one primary conversation, a narrow project/history navigator, and one contextual Stage for files, code, activity, assets, and project evidence.
- Made completed Studio activity quiet by default: successful tool runs collapse into one readable completion summary, while failed, blocked, and approval-required steps remain immediately visible. Raw execution detail stays available on demand.
- Replaced raw Studio target identifiers and empty manifest-source values in the run summary with creator-facing place labels, without changing the underlying run or safety data.
- Made Stage inline and resizable on large screens, modal below 1180px, and a full-screen sheet below 600px, with focus trapping/restoration and keyboard-complete menus.
- Simplified the composer through progressive disclosure while preserving attachments, modes, Studio controls, streaming, stop/retry, checkpoints, and saved project context.
- Rebuilt authentication and onboarding as restrained one-column continuation and non-modal milestone guidance.
- Flattened settings, pricing, billing, downloads, documentation, and Creator Store surfaces into the same neutral visual system. Public-facing marketing now leads with creator outcomes; Settings, Billing, and upgrade surfaces retain necessary model, usage, token, and balance terminology.
- Replaced the old logo exports and favicons with the original rounded Nexus N mark.
- Established and integrated a tested ten-file Nexus display-icon family for Ask, Build, Edit, Debug, Plan, Studio Connect, Assets, Snapshot, Publish, and Complete. Nine currently have live UI placements; Publish is packaged in the shared icon contract but is not yet placed on a live surface.
- Added optimized 2D project-x-ray, fixed-camera transformation, diagnostic-trace, interface-assembly, and Studio-bridge plates to the real homepage chapters; the coded hierarchy, change set, labels, and playtest ledger remain the authoritative UI over/alongside them.
- Turned the three-stage world artwork into an accessible Blockout → Structured build → Finished world comparison with explicit pressed state, live text, visible focus, and reduced-motion fallback.
- Added eight distinct 704×440 flat 2D genre-world thumbnails—Simulator, Tycoon, Obby, Combat, Social, Horror, Racing, and Adventure—to the real prompt-loading controls rather than presenting them as fixed product templates.
- Reduced the served hero from the 5504px source master to a 1920px, 128 KB WebP while retaining the full-resolution research original.
- Replaced the third-party glowing loader and JavaScript shimmer with Nexus-derived, reduced-motion-safe primitives, and removed verified unreachable 3D/legacy landing assets.
- Flattened the remaining live shared modal, tooltip, and script-action surfaces by removing decorative backdrop blur, overlay shadows, and zoom effects; functional streaming and scroll-edge cues remain because they communicate state.
- Kept purple for active intelligence, selected AI-authored work, construction traces, and focus—not static conversion buttons or idle chrome.

Saved current visual checkpoints:

- [`redesign-current-home-1440.png`](../artifacts/design-research-2026-08-13/redesign-current-home-1440.png)
- [`redesign-current-home-375.png`](../artifacts/design-research-2026-08-13/redesign-current-home-375.png)
- [`redesign-current-home-templates-375.png`](../artifacts/design-research-2026-08-13/redesign-current-home-templates-375.png)
- [`redesign-current-home-transform-375.png`](../artifacts/design-research-2026-08-13/redesign-current-home-transform-375.png)
- [`redesign-current-ai-1440.png`](../artifacts/design-research-2026-08-13/redesign-current-ai-1440.png)
- [`redesign-current-ai-375.png`](../artifacts/design-research-2026-08-13/redesign-current-ai-375.png)
- [`redesign-current-stage-1440.png`](../artifacts/design-research-2026-08-13/redesign-current-stage-1440.png)
- [`redesign-current-stage-375.png`](../artifacts/design-research-2026-08-13/redesign-current-stage-375.png)

Automated validation result:

- Microsoft Edge/Bing browser QA covered the landing page and workspace at 375, 768, 1024, and 1440px, plus desktop/mobile checks of settings, downloads, and Creator Store.
- No horizontal overflow or development error overlay was present on the checked redesign surfaces.
- Mobile Stage geometry, modal semantics, Escape handling, focus trapping, and launcher focus restoration were exercised in the browser.
- Stage view menus were verified with initial focus, Arrow Up/Down, Home, End, Escape, and trigger-focus restoration.
- Desktop Edge QA also exercised a populated, long-running AI conversation, the completed Studio-activity disclosure, creator-facing run context, and full-screen Stage geometry.
- Reduced-motion emulation was exercised in Edge; `prefers-reduced-motion: reduce` matched and animation/transition timing collapsed to the reduced-motion fallback.
- The attachment input, chooser launch, and accepted image/code/text file types were verified in Edge. A real file selection was not completed because the ChatGPT Edge extension is not currently allowed to access local file URLs.
- Frontend tests: 182 suites and 933 tests passed.
- Final AI-focused gate after the conversation cleanup: 35 suites and 178 tests passed.
- Public source/static contracts: 30 tests passed.
- Exported public HTML contracts: 20 tests passed.
- Production routing contracts: 24 tests passed.
- Studio protocol: 29 tests passed; backend syntax check passed.
- The integrated CRA + Next public export production build completed successfully and generated all 188 public static pages.

Accepted build warning: CRA reports a missing third-party `rehype-harden` TypeScript source map; compiled application code and the Next public export both complete successfully.

Browser QA limit: the local settings and Creator Store APIs were unavailable, so Edge exercised their explicit error/empty states rather than populated live data. Their component and static contracts pass, but populated production-data visual QA still requires a connected backend environment.

Asset-generation record: the first world plate and an exploratory x-ray were generated through the user's signed-in Higgsfield session in Microsoft Edge. The final x-ray, transformation, debug, interface-assembly, Studio-bridge, and template-world plates were generated with the built-in image-generation workflow after Higgsfield repeatedly returned generated labels or stalled during capture. All production versions were manually screened against the non-negotiable 2D rules and exported as optimized WebP assets. Prompts prohibited rendered 3D, extrusion, glossy materials, gradients, fake Nexus UI, fake labels, and purple wash; the high-resolution masters remain in the research artifact folder.

The interface-assembly and Studio-bridge imagery are background/editorial diagrams only. Real HTML labels and coded Nexus structures provide the authoritative content. No generated asset pretends to be a Nexus or Roblox Studio screenshot. The genre images are selectable prompt directions, not claims that Nexus is limited to eight fixed templates.

Current browser-evidence note: the saved Edge captures above document the current combined build, including the integrated lower-page plates, eight selectable genre-world thumbnails, the three-state transformation control, desktop workspace, and the 375×812 full-screen Stage. The attachment chooser limitation is recorded above rather than inferred as a pass.
