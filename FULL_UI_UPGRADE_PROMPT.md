# NEXUSRBX — STUDIO-FIRST UI GENERATOR + PINEVEX STATE PREVIEWS

## Your assignment

You are the implementation lead, not a brainstorming assistant. Upgrade the existing NexusRBX UI generator, its browser interface and its Studio integration. Implement the specification and the embedded source files below across the actual repositories. Finish the integration; do not deliver another plan, a static mockup, disconnected helper modules, or screenshots with invented results.

Use available coding subagents with non-overlapping ownership. One main integrator owns request identity, Studio targeting, source revision fences and final tests. If subagents are unavailable, perform the same work sequentially. Do not claim parallel work that did not happen.

The required experience is:

**Prompt → actual Roblox UI, assets and Luau in Studio → observed GUI readback → Pinevex redraw in Nexus → different state previews → image-based critique → repairs to the real Studio implementation.**

This is a 2D UI upgrade. Do not build a general Roblox emulator, WASM Luau host, 3D/ViewportFrame simulator, or remote Studio render farm in this release.

## 1. Binding product decisions

1. Studio remains authoritative for the applied implementation. The saved Luau files and actual GUI objects are the production output. A renderer-friendly tree is a derived read-only projection, never a second independently generated design.
2. Pinevex only paints a tree. It does not run LocalScripts, Activated callbacks, purchases, RemoteEvents or game logic. Do not enable its optional Luau export and replace our production code with it.
3. Different UI states are supported. A dropdown or scenario chip can show Default, Shop open, Item selected, Loading, Empty, Error, Confirmation open, and similar requested states. These use restricted overrides on a COPY of the captured tree and are labelled **Simulated state**. They do not change Studio or prove the original callback works.
4. An observed runtime capture after the actual Roblox interaction is separate. It has its own capture identity and provenance. Pinevex still redraws it; it is not a Roblox screenshot. Never label a Pinevex PNG “pixel-identical,” “Roblox-rendered,” or “gameplay verified.”
5. Agent mode does the implementation without routine design/architecture questions. Plan drafts and waits for the explicit Build action. Ask answers read-only. An explicitly requested exception changes that turn's behavior, not all subsequent history.
6. No generated source, raw renderer JSON, confidence scores or security narration in normal Agent chat. Actual source is in Code/Files. Real blockers get a short actionable state outside the conversation wall.
7. Keep real ownership checks, source hashes, snapshots, idempotency, billing and cancellation. Do not expose them as a cumbersome normal workflow. Do not bypass a missing Studio target or manufacture a successful receipt.
8. Preserve the current paid-generation requirement. The latest inspected frontend/backend commits retire free AI generation. This UI project must not restore an earlier Free allowance or rewrite the billing product.
9. Do not silently use GPT-5 mini or a legacy mini alias for automatic UI planning/generation/repair. Inherit the run's server-resolved model policy. An explicit, entitled selection remains explicit; do not silently replace it either. The vision reviewer must actually support images, with a separately configured role only where needed and accounted for.
10. Browser state switches, viewport switches and reopening cached previews must not trigger new AI generation or new Studio mutations.

## 2. Repository baseline and concrete integration context

Inspect current HEAD before editing. These are the revisions examined for this brief, not an instruction to reset the user's working tree:

- Frontend/plugin: `TravelTable/nexusairbx` at `1cc802781db240342caf1023c0bf5d3a89bcb2a5`.
- Backend: `TravelTable/nexusrbx-backend` at `ec1225c9b498eb8f041dae3bba13e98f181021e0`.
- Pinevex: `whutdev/pinevex-renderer` at `db292aca2b319c7204f494175c59ed9bd9552930`.

Backend and frontend are separate repositories. The frontend's ignored `backend/` working directory is not automatically committed with frontend changes. Do not remove the ignore rule to paper over that. Report both commit SHAs and both deployment revisions when a release is authorized.

Existing frontend symbols/files inspected:

- `src/pages/ai/ui/UiCreatorWorkspace.jsx`: existing UI workspace, CreationPromptComposer, layers, inspector, draft accept/discard, checkpoints, compile/apply workflow, Studio receipts and asset controls. Refactor this page; do not make a disconnected demo route.
- `src/pages/ai/ui/RobloxUiPreview.jsx`: currently translates UI document nodes to DOM/CSS, uses the app's body font, and simulates declared actions/tweens in JavaScript. This is not an engine-fidelity preview. Replace its default preview responsibility, not all unrelated editor features.
- `src/lib/uiDesignApi.js`: `/api/ui-designs` CRUD, generate, accept/discard draft, compile, hooks and checkpoints.
- `src/lib/studioUiReceipt.js`: inspect the real receipt format and keep readback authoritative.
- `src/components/ai/chat/CreationPromptComposer`: reuse the existing composer, model selection, attachment and stop behavior.
- Existing BuildWorkspace/Monaco and artifact revision readers: reuse these for Code rather than rendering Lua inside chat.

Existing backend:

- `src/routes/uiDesigns.js`: UI design ownership-scoped records, paid-plan gating, revision-based edits, generation, drafts, hooks, compile and checkpoint routes. The compile route returns `compiled`, `studioReady`, unresolved assets and updated document. Compilation is not evidence of successful Studio application.
- `src/lib/uiDocument.js`: normalization, validation, compiler and current contact-sheet renderer.
- `src/services/UiDesignGenerationService.js`: current structured generation and evaluation path. Replace or extend its generation/review responsibilities; do not leave the new visual evaluator unreachable.
- `src/services/StudioAgentService.js`, Studio transport/router/protocol and the current task runtime: reuse the authoritative execution path for mutation and recovery.
- Existing asset registry, WorkspaceArtifactService, JobService, billing/model gateway: use them. Do not add a second wallet, a second task scheduler, or an untracked provider client.

Current UI generation is document-first. A normalized UI document may remain a deterministic authoring/compiler IR. It must be reconciled with actual Studio readback, not shown as “synced” before it has been applied. Preserve unsupported/unrelated existing Studio objects rather than round-tripping them through a lossy document and deleting them.

## 3. What the Pinevex audit actually found

The upstream project is a Python/Skia renderer, not an npm/browser runtime. Run a pinned private render service. Do not send user projects to its public demonstration deployment.

Two important defects/behaviors must be handled:

- `api/index.py`'s demo preview code changes the root position/anchor, sets `_crop`, and crops the result. Its request preparation also postprocesses input and fetches icons. Do NOT directly proxy `/preview.png` or `/render` as the authoritative full-viewport path. The supplied private wrapper calls `ui_engine.renderer.render_json` directly, preserves the requested viewport and does no postprocessing or code export.
- Upstream `tree_to_pinevexobject.py` drops `UIGridLayout` pixel offsets; the renderer's grid solver also reads only two scale terms. The supplied adapter preserves four UDim2 terms, and `renderer/patch_grid.py` patches every matching measurement/paint/collection axis in the audited renderer blob. It verifies the original Git blob SHA and refuses an unknown upstream source. Run the REAL grid smoke test before enabling this path.

Other limits are deliberately not hidden: AutomaticSize includes heuristics; UISizeConstraint is not implemented by the audited importer; aspect-constraint semantics, global Z ordering, some flex/grid behavior and font metrics need comparison fixtures. Maintain a compatibility matrix and warnings. Do not call a successful PNG render a parity test.

Retain upstream Apache-2.0 notices and third-party notices. Review dependency/font redistribution rights for the actual deployment. Do not commit or return users' font files as project downloads.

## 4. Interface specification

Keep the application's visual language: near-black surfaces, readable neutral text, thin borders, restrained accent use. No large purple execution cards, giant evidence sidebar, confidence meters or permanent idle agent panels.

Desktop layout:

```
Existing Nexus navigation / project and Studio connection
┌────────────────────────────┬──────────────────────────────────────────┐
│ Conversation               │ Preview   Code       Device   State      │
│                            ├──────────────────────────────────────────┤
│ Concise real build updates │                                          │
│ and requested discussion   │         Rendered 2D UI viewport          │
│                            │                                          │
│                            │                                          │
│ Thin activity line         ├──────────────────────────────────────────┤
│ Existing shared composer   │ Default · Shop open · Error · Reset      │
└────────────────────────────┴──────────────────────────────────────────┘
```

- Preview is the main working surface. Code opens actual artifact files/revisions with Monaco; retain existing valid edit/save/conflict controls.
- Integrate the supplied UiPreviewPane into the real UiCreatorWorkspace. Do not nest another full application header around it.
- Layers/properties become an optional drawer opened by a small control. Existing features such as assets, history/checkpoints and exports remain reachable but are not permanently competing sidebars.
- Use a desktop conversation width around 320–380px with a resizable boundary. This is a design starting point; test small laptops.
- On phones use Chat / Preview / Code views, the same composer, a compact toolbar and 44px interactive controls. No horizontally overflowing property panels.
- Viewports come from server-owned presets: desktop, tablet, phone portrait, phone landscape. Their exact size/inset profiles are explicit and versioned. A browser-resized runtime snapshot is a responsive simulation, not a new observed runtime capture.
- One unobtrusive provenance label: Studio snapshot redraw, Runtime snapshot redraw, Simulated state, or Capture needed. A limitation disclosure is collapsed by default.
- When a source revision changes, the old image must not be presented as the new revision. On renderer failure, preserve the last image for the SAME identity with an explicit error. Switching projects must never flash another project's image.
- Support keyboard-only operation, meaningful alt text, reduced motion, mobile viewport changes and browser zoom.
- The included component provides state selectors/chips. Do not pretend clicking a PNG fires arbitrary Luau. Optional click hotspots are an enhancement only after tested hit regions and state transitions exist. They must be labelled preview actions, not gameplay actions.

## 5. Authoring, code and Studio behavior

Use one actual implementation. For newly generated UI, prefer a persistent project-owned ScreenGui tree under StarterGui, with stable `NexusUiNodeId` attributes, native UI instances and actual LocalScript/module behavior. This makes edit-time previews possible without running arbitrary code in the browser.

Implement requested UI behavior in the real controller: open/close, tabs, list selection, loading, empty/error states, disabled actions and cleanup. Keep purchase/inventory/currency authority in the real server path; preview fixtures cannot authorize these operations.

Attach source file revisions and hashes to the build. Persist all actual code before publishing file references. After final Studio writes, read back affected scripts and the GUI subtree. Do not set “Synced” from a compilation response or an enqueue acknowledgement.

`UiSnapshotSerializer.lua` is a read-only serialization module, NOT a plugin command already registered in this repository. You must integrate it with the plugin's build layout and dispatch tables rather than assuming Roblox runtime `require()` can import a filesystem file.

Add a typed `read_ui_snapshot` protocol capability through the actual backend protocol, plugin dispatcher, version manifest and local transport adapter. The server resolves an authorized root and selected target; the browser supplies a root selection reference, not an arbitrary executable source string. Keep non-supporting plugins honestly unavailable.

Capture modes:

- **studio_edit:** observe the actual authored ScreenGui subtree, including hidden descendants and modifiers. No mutation or code execution in the serializer.
- **studio_runtime:** observe the real player's PlayerGui in the correct Play/client context, after the real UI code has run. Only advertise this when the connected transport can truly observe that context.
- A UI created only by a LocalScript is NOT visible by reading StarterGui in edit mode. Show Runtime capture needed, or have the user start Play through supported controls. Never invent its objects from script text and label them observed.

The serializer returns the tree and capture limitations. The backend must wrap that result with trusted `snapshotId`, `designId`, `projectId`, `sourceRevision`, target session, command receipt and capture mode after verifying the receipt. Client-supplied capture metadata is not authoritative.

Capture complete trees with a node/byte budget; incomplete traversal cannot become a complete synced capture. Hash actual property values. Preserve false, zero, empty text, hidden GUI instances, UDim scale AND offsets, Color3, FontFace, sequences, layout/modifier properties and scroll positions. Unknown properties/classes are explicit limitations, not silently dropped success.

Manual changes in Studio invalidate the captured tree hash. Code changes invalidate the source revision. Keep those identities distinct. Preserve unrelated existing UI, user-authored hooks and source changes; use targeted merge/conflict handling, not overwriting an entire root to refresh a preview.

## 6. State previews

State changes must operate on a fresh copy of the captured baseline, never accumulate accidental mutations from the previously selected scenario.

Example persisted state record:

```json
{
  "schemaVersion": 1,
  "id": "shop-open",
  "label": "Shop open",
  "baseTreeHash": "server-computed-capture-hash",
  "sourceRevision": "actual-source-revision",
  "patches": [
    {"nodeId": "shop-overlay", "property": "Visible", "value": true}
  ]
}
```

The placeholder hashes above illustrate the schema; production values must be actual server-computed identities.

Only typed visual overrides are accepted. No Source, Parent, class changes, executable strings, arbitrary URLs, RemoteEvents or browser-to-Studio side effects. A variant cannot create an absent popup. If the popup is dynamically instantiated in Play, obtain a runtime capture that contains it.

For new generated UI, emit a small state/interaction manifest from the same compiler/controller design so preview scenarios are not independently invented. This still describes intended presentation, not proof that arbitrary user-written callbacks execute correctly. Existing arbitrary Luau may use manually supplied visual variants or observed runtime captures; do not claim automatic reverse engineering of all script behavior.

Bind states to both the captured tree hash and source revision. After changes, explicitly rebase validated stable-ID patches or regenerate the state manifest. Reject stale references; never silently apply them to a different screen. Retain previous versions for history, not as the current preview.

Support Reset, default/closed and requested popup/tab/loading/error/empty states. Use state chips/dropdown immediately. For a later optional hotspot layer, use renderer-resolved coordinates for the displayed viewport/revision, scale pointer coordinates correctly and respect hidden nodes, clipping and overlays. Do not use stale absolute Studio bounds for a resized browser simulation. Keyboard state selection remains available.

## 7. Backend API, data and lifecycle: mandatory production integration

The supplied routes and runner are concrete modules. The persistence/admission adapters below must be implemented using the real repository services. These names describe REQUIRED interfaces; they are NOT claims that such methods already exist in the project.

Mount the new router under the existing `/api/ui-designs` prefix with the existing authentication, verified-user, paid-access and resource-limit middleware. Preserve compatibility with old UI document endpoints.

### API contract

- `GET /:designId/preview-manifest`: authorized project/design identity, current source revision, latest complete capture, available states, server-owned viewport presets and capture/renderer capability state.
- `POST /:designId/previews`: ONLY `{snapshotId, sourceRevision, stateId, viewportId}` plus Idempotency-Key. Server loads and validates all other data. Returns `{jobId, status: queued|running|ready}`. Same exact request key with different input is a conflict; reconnecting never launches a duplicate Studio build.
- `GET /:designId/previews/:jobId`: scoped durable preview state. When ready, `preview` includes `projectId`, `designId`, `snapshotId`, `sourceRevision`, `treeHash`, `stateId`, `stateLabel`, `viewportId`, viewport dimensions, renderer/font versions, imageHash, warnings and provenance.
- `GET /:designId/previews/:jobId/image`: authenticated exact private PNG bytes. No public storage URLs or credentials in browser props.
- Integrate a capture request endpoint/action with the actual Studio queue. Its mutation policy is read-only; requesting a runtime capture does not magically grant Play control. Return the real command identity and expose unsupported capability honestly.

### Durable service responsibilities

Implement a UiPreviewService providing `manifest`, `enqueue`, `readJob` and `readImage` to the supplied route factory. Verify design ownership AND current project access for every method, including image/cache reads. Existing Team/project membership rules still apply.

Suggested storage within the existing design namespace:

- immutable `captures/{captureId}` metadata, tree blob reference and source/capture identity;
- versioned `states/{stateId}` or a versioned state-manifest document;
- `previews/{jobId}` with request identity, source/capture/state/viewport identities, lifecycle, lease/fence and private image reference;
- private image/tree blobs in the existing storage service; do not put multi-megabyte tree/source/base64 arrays in Firestore documents.

Use the existing durable queue, leases and cancellation/supersession fences. The supplied `createUiPreviewJobRunner` plugs into that queue. It must not create a second in-memory-only scheduler.

Bind its adapters as follows:

- `loadSnapshot(job)`: read an immutable, complete, owned capture selected during admission; verify target and source binding. Never trust a browser tree.
- `loadState(job)`: exact saved state/version for that design and capture. Missing non-default state is an error.
- `resolveImages(...)`: map actual Image properties to authorized original asset content. Return scoped image bindings plus normalized PNG bytes and their hashes. Fetch through the existing asset service; no renderer fetches. Unavailable/private/unpublished assets are warnings, not substituted thumbnails.
- `renderer.describe/render`: the supplied private client, with the configured service credential and audited renderer pin.
- `readCache`: same authorized scope and identical cache key. Store normalized image bytes/refs independently from mutable task state.
- `isCurrent`: real lease/cancellation/deletion/source-revision fence, not `async () => true`.
- `storeResult`: put PNG in private storage, then transactionally recheck job lease, project access, source revision and supersession before publishing. A stale worker may retain a cache blob but cannot replace the latest preview. Return the documented job manifest, not raw PNG in Firestore.

States: queued → running → ready, failed, cancelled or superseded. Render failure must not falsely fail a previously applied Studio build, and render success must never set `task.completion.canComplete` or pass gameplay checks. Superseded jobs do not replace newer previews.

Cache key includes owner/project/design, source revision, actual variant tree, viewport/insets, materialized asset hashes, renderer adapter revision and font-set digest. Per-user namespace is the safe starting point; no cross-tenant shared private-asset cache. An old preview can remain in history with its old identity.

Deduplicate queued/running jobs by authorized content identity as well as request idempotency. The provided frontend reconnects by requesting the same references; service admission must reconnect/deduplicate rather than charge/generate again. Keep preview render resource quotas separate from LLM credits.

Initially render only the active state/viewport eagerly. Generate the small acceptance matrix lazily or during a bounded build-review step, not all state × viewport combinations on every keystroke. Debounce rapid changes. Two private renderer subprocesses per container are the supplied starting concurrency, not a throughput guarantee.

## 8. Renderer integration and 2D fidelity

Use the included private FastAPI wrapper and pinned Docker build. The supplied Dockerfile bootstraps from upstream requirements, which are not hashes-locked. Before production, lock the dependencies with hashes and pin the base-image digest after successful tests. Do not treat a mutable dependency build as reproducible.

The upstream render service is not the client-facing API. Keep it private, authenticated and resource-limited. Disable runtime egress; pre-materialize scoped image bytes. Use separate worker processes and temporary asset manifests so Pinevex's module-level asset caches do not leak between users.

The supplied wrapper:

- calls `render_json` without upstream postprocessing, recentering, cropping or export;
- accepts only approved 2D tree types and scoped image keys;
- verifies normalized image content hashes and bounds;
- creates one temporary image-manifest directory per render;
- has a bounded child process lifetime and CPU limit;
- fingerprints the actual font files and reports missing requested variants;
- never sends font files to the user.

Preserve a full output viewport. A 1280×720 request must yield 1280×720 pixels, not a cropped panel image stretched by CSS. Parent-relative layout must not become viewport-relative. Do not substitute the Nexus application font for the captured FontFace without a visible limitation.

The adapter is a reviewed starting subset, not a complete Roblox renderer. Extend it and the fork for unsupported behaviors using paired fixtures. In particular, patch/test grid offsets, honor intentional empty labels and false visibility, test stroke/gradient interactions, list/grid ordering, CanvasPosition, rich text, image atlas/nine-slice rules, text bounds and safe areas.

Do not silently drop a relevant captured property. The serializer reports unsupported classes and unreadable properties. Propagate these warnings all the way to the preview. If a newly supported property is added, include its canonical encoding, adapter mapping and real renderer/Studio tests in the same change.

## 9. Generation and visual quality loop

Upgrade the generator, not just its preview panel.

- Keep user-selected model identity through planning, generation and repairs. Auto roles use a configured capable model, not a hardcoded mini. Reuse entitlement and provider-capability resolution; verify requested/resolved/actual model at the provider boundary.
- New source is complete, versioned and organized. Do not create a UI module without a mounting LocalScript, disconnected buttons, fake assets, TODO handlers or placeholder money systems.
- Existing assets should be reused when suitable. Generate/resolve 2D icons or backgrounds through the current asset pipeline only when useful. Browser preview materialization and Roblox experience permission checks are separate requirements.
- Introduce an internal design brief: user journey, key screens, hierarchy, design tokens, spacing, typography, state list and acceptance criteria. This is build context, not another mandatory chat questionnaire.
- Separate independent work where useful: layout/art, controller/state bindings and QA can be prepared concurrently with shared IDs/interfaces. One integrator writes Studio. Do not create multiple agents for a trivial text edit.
- Apply to the intended Studio project under the existing authorized run. Snapshot/undo remains internal. Read back the actual implementation, then capture and render it.
- Send actual PNG images to an image-capable reviewer. JSON/SVG text alone must not be called a visual observation. The current contact-sheet path can remain a fallback authoring tool, clearly not Studio readback.
- Use the supplied `runUiVisualReview` runner inside the canonical build step. Its adapter must resolve private image bytes, invoke the real model, meter usage and persist review records. Do not run it whenever the user changes a preview state.
- Review returns bounded, image-bound issues, not executable operations. Repairs go through the actual Studio generation/edit path with expected source revision. Recapture and rerender after each applied repair.
- Default to at most two targeted repair cycles, optionally up to three under the run budget. Do not create an unlimited critique loop or eat all credits chasing tiny antialiasing differences.
- Missing fonts/images or unsupported renderer behavior should not cause the AI to rewrite otherwise valid Studio UI to match a broken preview. Surface renderer-limited review and preserve the implementation.
- “Visual review passed” means the available preview images passed the reviewer criteria. It is not proof of callback execution, purchase logic, mobile safe-area parity or pixel equality.

## 10. Required tests and acceptance

Do not claim completion from the supplied unit tests alone. Implement and run the actual repo integration/browser/Studio tests below.

### Existing regression coverage

Run the repository's relevant paid-access, model routing, mode routing, chat projection, UI CRUD/generation/compiler, asset registry, Studio transport and cancellation tests. Preserve no-code-in-Agent-chat and Plan/Ask read-only behavior.

### Supplied-module tests

The code bundle includes a Node suite and Python suite. They exercise snapshot/state identity, non-mutation, limits, projection fields, grid patch behavior, private-render transport, cache identity, cancellation, stale results and bounded visual repair. Python uses a fake drawing function for wrapper tests. These are NOT Pinevex integration tests, React interaction tests or Studio tests.

Commands from the bundle root:

```
node --test backend/tests/uiPreview.test.cjs
python -m unittest discover -s renderer/tests -v
```

### Real renderer tests

Build the private container at the pinned commit and apply the guarded grid patch. Run `renderer/smoke_renderer.py` against it. Then add real PNG assertions for closed/open popup visibility, exact viewport dimensions, pixel/scaled grid padding, list layout, multiple strokes, cropped/sliced images and supported fonts. The smoke script is included but was not run in the authoring environment.

Fail deployment if the renderer build identity differs from the adapter, font runtime is unavailable, or the pixel-offset grid smoke fails. Do not fall back to the public demo endpoint.

### React/API integration tests

- New UI Agent request reaches actual apply/readback/capture and shows a real preview.
- Source/renderer JSON never appears in ordinary build chat.
- Open/close state previews change only the copied render tree; Studio mutation count stays unchanged.
- Default reset does not preserve previous scenario patches.
- Switching source revision invalidates old variant hashes.
- A slow old response cannot overwrite a newer state/viewport/project.
- Preview image bytes/hash/scope match its manifest. No cross-project image flashes.
- Failed rendering retains the correct previous image with an error; no success icon.
- Reopening a ready preview hits cache without AI calls; reconnecting a running job does not duplicate it.
- Missing renderer, image, font or runtime capture has a truthful state and a useful recovery control.
- Plans still wait for Build; Ask still answers without mutations; current paid gate remains enforced.
- Mobile, keyboard navigation, focus order, reduced motion and browser zoom behave correctly.

### Real Studio acceptance fixture

Use a disposable place. The supplied PopupFixture is runtime-created on purpose to prove that reading StarterGui alone is insufficient. Capture its real PlayerGui default after Play, click Open shop in Roblox, capture again, then close and capture. Compare the observed after-click capture with the simulated open variant from the baseline. The simulation must not itself send a Studio click or a purchase.

Also use an authored persistent ScreenGui fixture with a shop grid, images, tabs, hidden modal, loading/empty/error states and a real client controller. Run the same source and data fixtures at desktop and phone viewports.

For comparisons, record source revision, tree hash, asset digests, font variants, viewport/insets, capture context and renderer version. Compare required instance hierarchy, computed bounds, text wrapping and region-specific screenshots. Pixel comparison must use matching viewports and distinguish text antialiasing from real layout errors. Do not invent a 90%/95% accuracy claim.

Release acceptance requires actual map-free 2D UI output in Studio, correct UI state behavior in the available runtime, real Code/Files content, state previews in the production UI page, no duplicate pipeline, and no unresolved required integration failures. Where the test machine lacks a live Studio target, report the specific unrun checks instead of calling them passed.

## 11. Execution order and ownership

A. Inspect current revisions, preserve user changes, record existing APIs and test commands.
B. Add capture schema/serializer and real read-only protocol plumbing; verify authored and runtime capture capabilities separately.
C. Bring up the pinned private Pinevex wrapper and grid patch; run real rendering smoke tests.
D. Implement durable admission/storage/assets/cache/worker adapters; wire the supplied modules into existing jobs and routes.
E. Replace the default preview surface in the actual UI generator; reuse composer, model selection, Code/Files, history and project targeting.
F. Wire state manifests/variants and their revision fences. Add responsive scenarios without browser mutations.
G. Upgrade generation/controller/code integration and real PNG-based visual review/repair.
H. Run regression, renderer, browser and Studio acceptance. Fix observed failures. Coordinate backend, renderer, frontend and plugin releases.

Do not leave the feature behind an undisclosed default-off flag and report that users have it. A staged flag is fine if its exact effective state and remaining rollout work are reported. Do not push or deploy to production without the operator's authorization; perform the local implementation and tests first.

## 12. Completion report

Return: changed files by repository; which existing paths were replaced; test commands and actual results; the working interface screenshots; observed Studio results; effective renderer/model/capture capabilities; any unrun tests; both commit SHAs when committed; and deployment prerequisites. Separate implemented, tested, deployed and unavailable.

The embedded source below is implementation material with working isolated tests. It is not permission to call the product finished after adding helpers. Finish every integration above, and do not fabricate runtime evidence.

## 13. Primary source references for the implementing agent

Repository reads were made at the baseline commits above. Recheck upstream before changing adapters; do not trust an unpinned README claim of parity.

- Current workspace: `TravelTable/nexusairbx/src/pages/ai/ui/UiCreatorWorkspace.jsx`.
- Current DOM preview: `TravelTable/nexusairbx/src/pages/ai/ui/RobloxUiPreview.jsx`.
- Existing client UI API: `TravelTable/nexusairbx/src/lib/uiDesignApi.js`.
- Existing backend routes and compiler path: `TravelTable/nexusrbx-backend/src/routes/uiDesigns.js` and `src/lib/uiDocument.js`.
- Existing generation/evaluation: `TravelTable/nexusrbx-backend/src/services/UiDesignGenerationService.js`.
- Pinevex API transformations: `https://github.com/whutdev/pinevex-renderer/blob/db292aca2b319c7204f494175c59ed9bd9552930/api/index.py`.
- Pinevex renderer/grid solver: `https://github.com/whutdev/pinevex-renderer/blob/db292aca2b319c7204f494175c59ed9bd9552930/src/ui_engine/renderer.py`.
- Pinevex raw-tree importer: `https://github.com/whutdev/pinevex-renderer/blob/db292aca2b319c7204f494175c59ed9bd9552930/web_demo/rbxm_parser_component/tree_to_pinevexobject.py`.
- Pinevex image loader/cache: `https://github.com/whutdev/pinevex-renderer/blob/db292aca2b319c7204f494175c59ed9bd9552930/src/ui_engine/assets.py`.
- Pinevex layout heuristics: `https://github.com/whutdev/pinevex-renderer/blob/db292aca2b319c7204f494175c59ed9bd9552930/src/ui_engine/layout.py`.
- Roblox ScreenGui: `https://create.roblox.com/docs/reference/engine/classes/ScreenGui`.
- Roblox PlayerGui: `https://create.roblox.com/docs/reference/engine/classes/PlayerGui`.

## 14. How to apply the source appendix

- Paths under `backend/` are relative to the separately checked-out backend repository, without the `backend/` prefix.
- Paths under `frontend/` are relative to the frontend repository, without the `frontend/` prefix.
- `roblox-plugin/modules/UiSnapshotSerializer.lua` must be integrated with the real plugin build/dispatcher and transport protocol. It is not a published capability until that work is done.
- `renderer/` is a new private render-service build directory, kept with the backend or a dedicated service repository. Do not deploy it as an unrestricted public proxy.
- The fixture is test-only. Do not inject it into users' games as production UI.
- The code supplies the core contracts, projection, worker interfaces, private render wrapper, UI component and tests. The production authorization/storage/queue/capture adapters and page/generator integration remain mandatory implementation work in this assignment. Do not misrepresent these source files as a drop-in replacement for the whole product.

Continue into the embedded files below and implement them with the integration requirements above.


# SOURCE APPENDIX — COMPLETE FILES


## File 1: `backend/src/lib/uiPreviewContract.js`

```javascript
'use strict';

const { createHash } = require('node:crypto');
const MAX_NODES = 1200;
const MAX_DEPTH = 32;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const VISUAL = new Set(['Frame', 'CanvasGroup', 'ScrollingFrame', 'TextLabel',
  'TextButton', 'TextBox', 'ImageLabel', 'ImageButton']);
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function fail(code, message) {
  throw Object.assign(new Error(message), { code, statusCode: 422 });
}
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail('PREVIEW_INVALID', `${label} must be a plain object.`);
  }
}
function text(value, label, max = 180) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail('PREVIEW_INVALID', `Invalid ${label}.`);
  }
  return value;
}
function finite(value, label, min = -100000, max = 100000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail('PREVIEW_INVALID', `Invalid ${label}.`);
  }
  return value;
}
function cleanJson(value, depth = 0, seen = new Set()) {
  if (depth > 96) fail('PREVIEW_LIMIT', 'JSON is too deeply nested.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 24000) fail('PREVIEW_LIMIT', 'A preview string is too large.');
    return value;
  }
  if (typeof value === 'number') return finite(value, 'number', -1e12, 1e12);
  if (seen.has(value)) fail('PREVIEW_INVALID', 'Cyclic preview data.');
  seen.add(value);
  let output;
  if (Array.isArray(value)) {
    if (value.length > 2400) fail('PREVIEW_LIMIT', 'A preview array is too large.');
    output = value.map(entry => cleanJson(entry, depth + 1, seen));
  } else {
    object(value, 'JSON value');
    if (Object.keys(value).length > 200) fail('PREVIEW_LIMIT', 'Too many object keys.');
    output = {};
    for (const key of Object.keys(value).sort()) {
      if (FORBIDDEN.has(key)) fail('PREVIEW_INVALID', 'Unsupported object key.');
      output[key] = cleanJson(value[key], depth + 1, seen);
    }
  }
  seen.delete(value);
  return output;
}
function canonical(value) { return JSON.stringify(cleanJson(value)); }
function digest(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function indexTree(root) {
  const nodes = new Map();
  function visit(node, depth) {
    object(node, 'UI node');
    if (depth > MAX_DEPTH || nodes.size >= MAX_NODES) fail('PREVIEW_LIMIT', 'UI capture exceeds preview limits.');
    text(node.id, 'node ID', 240); text(node.className, 'class', 100); text(node.name, 'node name', 200);
    if (nodes.has(node.id)) fail('PREVIEW_INVALID', 'Duplicate UI node ID.');
    object(node.properties, 'node properties');
    if (!Array.isArray(node.children)) fail('PREVIEW_INVALID', 'Node children must be an array.');
    nodes.set(node.id, node);
    node.children.forEach(child => visit(child, depth + 1));
  }
  visit(root, 0);
  return nodes;
}
function validateSnapshot(value) {
  const serialized = canonical(value);
  if (Buffer.byteLength(serialized) > MAX_JSON_BYTES) fail('PREVIEW_LIMIT', 'UI capture is too large.');
  const snapshot = JSON.parse(serialized);
  if (snapshot.schemaVersion !== 1 || snapshot.complete !== true) {
    fail('PREVIEW_CAPTURE_INCOMPLETE', 'A complete UI capture is required.');
  }
  for (const field of ['snapshotId', 'designId', 'projectId', 'sourceRevision']) text(snapshot[field], field);
  object(snapshot.capture, 'capture metadata');
  if (!['studio_edit', 'studio_runtime'].includes(snapshot.capture.kind)) fail('PREVIEW_INVALID', 'Capture must come from Studio.');
  for (const field of ['sessionId', 'commandId', 'capturedAt']) text(snapshot.capture[field], field, 240);
  if (snapshot.root?.className !== 'ScreenGui') fail('PREVIEW_INVALID', 'Select one ScreenGui root.');
  indexTree(snapshot.root);
  // Compute from the actual captured tree; never accept a browser-supplied hash.
  snapshot.treeHash = digest(snapshot.root);
  return snapshot;
}
function vector(value, label) {
  object(value, label); finite(value.x, `${label}.x`); finite(value.y, `${label}.y`);
  if (Object.keys(value).some(key => !['x', 'y'].includes(key))) fail('PREVIEW_INVALID', `Invalid ${label} fields.`);
}
function color(value) {
  object(value, 'Color3');
  for (const key of ['r', 'g', 'b']) finite(value[key], key, 0, 1);
  if (Object.keys(value).some(key => !['r', 'g', 'b'].includes(key))) fail('PREVIEW_INVALID', 'Invalid color fields.');
}
function udim2(value) {
  object(value, 'UDim2');
  if (Object.keys(value).some(key => !['x', 'y'].includes(key))) fail('PREVIEW_INVALID', 'Invalid UDim2 fields.');
  for (const axis of ['x', 'y']) {
    object(value[axis], axis);
    finite(value[axis].scale, 'scale', -20, 20); finite(value[axis].offset, 'offset');
    if (Object.keys(value[axis]).some(key => !['scale', 'offset'].includes(key))) fail('PREVIEW_INVALID', 'Invalid UDim fields.');
  }
}
function validateStateValue(node, property, value) {
  if (!VISUAL.has(node.className)) fail('PREVIEW_STATE_INVALID', 'Variants may edit visual nodes only.');
  if (property === 'Visible') {
    if (typeof value !== 'boolean') fail('PREVIEW_STATE_INVALID', 'Visible must be boolean.');
  } else if (property === 'Text' && ['TextLabel', 'TextButton', 'TextBox'].includes(node.className)) {
    if (typeof value !== 'string' || value.length > 8000) fail('PREVIEW_STATE_INVALID', 'Invalid state text.');
  } else if (['BackgroundColor3', 'TextColor3', 'ImageColor3'].includes(property)) {
    if (property.startsWith('Text') && !node.className.startsWith('Text')) fail('PREVIEW_STATE_INVALID', 'Not a text node.');
    if (property.startsWith('Image') && !node.className.startsWith('Image')) fail('PREVIEW_STATE_INVALID', 'Not an image node.');
    color(value);
  } else if (['BackgroundTransparency', 'TextTransparency', 'ImageTransparency'].includes(property)) {
    if (property.startsWith('Text') && !node.className.startsWith('Text')) fail('PREVIEW_STATE_INVALID', 'Not a text node.');
    if (property.startsWith('Image') && !node.className.startsWith('Image')) fail('PREVIEW_STATE_INVALID', 'Not an image node.');
    finite(value, property, 0, 1);
  } else if (['Position', 'Size'].includes(property)) udim2(value);
  else if (property === 'CanvasPosition' && node.className === 'ScrollingFrame') vector(value, property);
  else fail('PREVIEW_STATE_INVALID', `Unsupported preview-only property: ${property}.`);
}
function applyPreviewState(snapshotInput, variant = null) {
  const snapshot = validateSnapshot(snapshotInput);
  if (!variant) return { snapshot, stateId: 'default', stateLabel: 'Default', simulated: false };
  object(variant, 'state');
  text(variant.id, 'state ID'); text(variant.label, 'state label', 120);
  if (variant.id === 'default') fail('PREVIEW_STATE_INVALID', 'Default is reserved for the captured baseline.');
  if (variant.baseTreeHash !== snapshot.treeHash || variant.sourceRevision !== snapshot.sourceRevision) {
    fail('PREVIEW_STATE_STALE', 'This state belongs to an older UI capture. Recapture or rebuild the state.');
  }
  if (!Array.isArray(variant.patches) || variant.patches.length > 500) fail('PREVIEW_STATE_INVALID', 'Invalid state patches.');
  const nodes = indexTree(snapshot.root); const seen = new Set();
  for (const patch of variant.patches) {
    object(patch, 'state patch');
    if (Object.keys(patch).some(key => !['nodeId', 'property', 'value'].includes(key))) fail('PREVIEW_STATE_INVALID', 'Unsupported patch field.');
    const node = nodes.get(patch.nodeId);
    if (!node) fail('PREVIEW_STATE_INVALID', 'A state references an uncaptured node.');
    const key = `${patch.nodeId}:${patch.property}`;
    if (seen.has(key)) fail('PREVIEW_STATE_INVALID', 'Duplicate state patch.');
    validateStateValue(node, patch.property, patch.value);
    node.properties[patch.property] = cleanJson(patch.value); seen.add(key);
  }
  return { snapshot, stateId: variant.id, stateLabel: variant.label, simulated: true };
}
function validateViewport(input) {
  object(input, 'viewport');
  const width = finite(input.width, 'viewport width', 160, 2560);
  const height = finite(input.height, 'viewport height', 160, 2560);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > 4000000) fail('PREVIEW_LIMIT', 'Viewport is too large.');
  const insets = { left: 0, right: 0, top: 0, bottom: 0, ...(input.insets || {}) };
  if (Object.keys(insets).some(key => !['left', 'right', 'top', 'bottom'].includes(key))) fail('PREVIEW_INVALID', 'Unknown inset.');
  for (const [key, value] of Object.entries(insets)) finite(value, key, 0, 400);
  if (insets.left + insets.right >= width || insets.top + insets.bottom >= height) fail('PREVIEW_INVALID', 'Insets consume the viewport.');
  return { width, height, insets };
}
function renderCacheKey({ userId, projectId, designId, sourceRevision, tree, viewport, assets, rendererRevision, fontRevision }) {
  for (const [key, value] of Object.entries({ userId, projectId, designId, sourceRevision, rendererRevision, fontRevision })) text(value, key, 240);
  return digest({ schemaVersion: 1, userId, projectId, designId, sourceRevision, tree,
    viewport: validateViewport(viewport), assets, rendererRevision, fontRevision });
}
module.exports = { VISUAL, MAX_NODES, MAX_DEPTH, canonical, digest, fail, indexTree,
  validateSnapshot, applyPreviewState, validateViewport, renderCacheKey };
```


## File 2: `backend/src/lib/pinevexAdapter.js`

```javascript
'use strict';

const { VISUAL, validateViewport, indexTree } = require('./uiPreviewContract');
const MODIFIERS = new Set(['UICorner', 'UIStroke', 'UIGradient', 'UIPadding', 'UIScale',
  'UIListLayout', 'UIGridLayout', 'UIAspectRatioConstraint', 'UITextSizeConstraint']);
const IGNORED = new Set(['Script', 'LocalScript', 'ModuleScript']);
const enumValue = value => typeof value === 'string' ? value.split('.').at(-1) : value;
const rgb = value => ['r', 'g', 'b'].map(key => Math.round(value[key] * 255));
const vec = value => [value.x, value.y];
const udim = value => ({ scale: value.scale, offset: value.offset });
const udim2 = value => [value.x.scale, value.x.offset, value.y.scale, value.y.offset];
const hex = value => '#' + rgb(value).map(v => v.toString(16).padStart(2, '0')).join('');
const DIRECT = {
  BackgroundTransparency: 'bgTransparency', BorderSizePixel: 'borderSize', Rotation: 'rotation',
  Visible: 'visible', ClipsDescendants: 'clipsDescendants', ZIndex: 'zIndex', LayoutOrder: 'layoutOrder',
  Text: 'text', TextSize: 'textSize', TextScaled: 'textScaled', TextWrapped: 'textWrapped',
  TextTransparency: 'textTransparency', TextStrokeTransparency: 'textStrokeTransparency',
  RichText: 'richText', LineHeight: 'lineHeight', ImageTransparency: 'imageTransparency',
  SliceScale: 'sliceScale', ScrollBarThickness: 'scrollBarThickness',
  ScrollBarImageTransparency: 'scrollBarImageTransparency', GroupTransparency: 'groupTransparency',
};
const ENUMS = { AutomaticSize: 'autoSize', SizeConstraint: 'sizeConstraint',
  TextXAlignment: 'textXAlignment', TextYAlignment: 'textYAlignment', ScaleType: 'scaleType',
  ScrollingDirection: 'scrollDirection', AutomaticCanvasSize: 'autoCanvasSize', ResampleMode: 'resampleMode' };

/** Renderer projection only: this function never generates Luau or writes Studio. */
function toPinevex(snapshot, viewportInput, imageBindings = {}, fontFamilies = []) {
  indexTree(snapshot.root);
  const viewport = validateViewport(viewportInput);
  const warnings = [];
  const warn = (node, code, message) => warnings.push({ nodeId: node.id, code, message });
  const has = (p, key) => Object.hasOwn(p, key);
  function gradient(node) {
    const p = node.properties;
    if (p.Enabled === false) return undefined;
    return {
      rotation: p.Rotation || 0,
      offset: p.Offset ? vec(p.Offset) : [0, 0],
      colors: (p.Color || []).map(stop => [stop.time, hex(stop.color)]),
      transparency: (p.Transparency || []).map(stop => [stop.time, stop.value]),
    };
  }
  function modifiers(node, out) {
    let layouts = 0;
    for (const child of node.children) {
      const p = child.properties;
      switch (child.className) {
        case 'UICorner': out.corner = udim(p.CornerRadius || { scale: 0, offset: 8 }); break;
        case 'UIScale': out.scale = p.Scale ?? 1; break;
        case 'UIGradient': {
          const g = gradient(child); if (g) out.gradient = g; break;
        }
        case 'UIStroke': {
          if (p.Enabled === false) break;
          const stroke = { thickness: p.Thickness ?? 1, color: p.Color ? rgb(p.Color) : [0, 0, 0],
            transparency: p.Transparency ?? 0, applyMode: enumValue(p.ApplyStrokeMode || 'Contextual'),
            borderPosition: enumValue(p.BorderStrokePosition || 'Outer'),
            lineJoin: enumValue(p.LineJoinMode || 'Round'),
            thicknessScale: enumValue(p.StrokeSizingMode) === 'ScaledSize' };
          if (p.BorderOffset) stroke.borderOffset = udim(p.BorderOffset);
          const g = child.children.find(c => c.className === 'UIGradient');
          if (g && gradient(g)) stroke.gradient = gradient(g);
          (out.strokes ||= []).push(stroke); break;
        }
        case 'UIPadding': {
          out.padding = {};
          for (const side of ['Top', 'Bottom', 'Left', 'Right']) if (p[`Padding${side}`]) out.padding[side.toLowerCase()] = udim(p[`Padding${side}`]);
          break;
        }
        case 'UIListLayout': {
          layouts += 1;
          out.list = { direction: enumValue(p.FillDirection) === 'Horizontal' ? 'X' : 'Y',
            hAlign: enumValue(p.HorizontalAlignment || 'Left'), vAlign: enumValue(p.VerticalAlignment || 'Top'),
            spacing: udim(p.Padding || { scale: 0, offset: 0 }), wraps: p.Wraps === true };
          if (enumValue(p.SortOrder || 'LayoutOrder') !== 'LayoutOrder') warn(child, 'SORT_ORDER_APPROXIMATED', 'Name sorting needs a tested adapter.');
          for (const key of ['HorizontalFlex', 'VerticalFlex']) if (p[key] && enumValue(p[key]) !== 'None') warn(child, 'FLEX_NOT_VERIFIED', `${key} has no verified parity in this adapter.`);
          break;
        }
        case 'UIGridLayout': {
          layouts += 1;
          out.grid = { direction: enumValue(p.FillDirection) === 'Vertical' ? 'Y' : 'X',
            hAlign: enumValue(p.HorizontalAlignment || 'Left'), vAlign: enumValue(p.VerticalAlignment || 'Top'),
            cellSize: udim2(p.CellSize || { x: { scale: 0, offset: 100 }, y: { scale: 0, offset: 100 } }),
            cellPadding: udim2(p.CellPadding || { x: { scale: 0, offset: 5 }, y: { scale: 0, offset: 5 } }) };
          // Unlike upstream RBXM conversion, preserve all four UDim2 terms.
          // Until the pinned renderer's grid solver passes offset fixtures, flag it.
          if (out.grid.cellSize[1] || out.grid.cellSize[3] || out.grid.cellPadding[1] || out.grid.cellPadding[3]) {
            warn(child, 'GRID_OFFSET_PARITY_PENDING', 'Pixel grid terms are preserved; validate the renderer solver before claiming parity.');
          }
          if (p.FillDirectionMaxCells > 0) warn(child, 'GRID_MAX_CELLS_UNSUPPORTED', 'Grid maximum cells needs renderer support.');
          break;
        }
        case 'UIAspectRatioConstraint':
          out.aspectRatio = p.AspectRatio ?? 1;
          warn(child, 'ASPECT_CONSTRAINT_APPROXIMATED', 'AspectType and DominantAxis need Studio comparison.'); break;
        case 'UITextSizeConstraint': out.textSizeConstraint = { min: p.MinTextSize ?? 1, max: p.MaxTextSize ?? 100 }; break;
        case 'UISizeConstraint': warn(child, 'SIZE_CONSTRAINT_UNSUPPORTED', 'Min/max size constraints require renderer work.'); break;
        default:
          if (!VISUAL.has(child.className) && !IGNORED.has(child.className) && child.className !== 'Folder') {
            warn(child, 'CLASS_UNSUPPORTED', `${child.className} is outside the verified 2D preview subset.`);
          }
      }
    }
    if (layouts > 1) warn(node, 'MULTIPLE_LAYOUTS', 'Multiple layout instances need explicit Studio comparison.');
  }
  function visualChildren(node) {
    return node.children.flatMap(child => child.className === 'Folder'
      ? visualChildren(child) : VISUAL.has(child.className) ? [convert(child)] : []);
  }
  function convert(node) {
    const p = node.properties;
    const out = { type: node.className, name: node.name, _nexusId: node.id };
    for (const [key, target] of Object.entries(DIRECT)) if (has(p, key)) out[target] = p[key];
    for (const [key, target] of Object.entries(ENUMS)) if (has(p, key)) out[target] = enumValue(p[key]);
    for (const [key, target] of Object.entries({ Size: 'size', Position: 'position', CanvasSize: 'canvasSize', TileSize: 'tileSize' })) if (p[key]) out[target] = udim2(p[key]);
    for (const [key, target] of Object.entries({ AnchorPoint: 'anchor', CanvasPosition: 'canvasPosition', ImageRectSize: 'imageRectSize', ImageRectOffset: 'imageRectOffset' })) if (p[key]) out[target] = vec(p[key]);
    for (const [key, target] of Object.entries({ BackgroundColor3: 'bg', BorderColor3: 'borderColor', TextColor3: 'textColor', TextStrokeColor3: 'textStrokeColor', ImageColor3: 'imageColor', ScrollBarImageColor3: 'scrollBarImageColor', GroupColor3: 'groupColor' })) if (p[key]) out[target] = rgb(p[key]);
    out.sizeRef = 'parent';
    if (p.SliceCenter) out.sliceCenter = [...vec(p.SliceCenter.min), ...vec(p.SliceCenter.max)];
    if (p.FontFace) {
      const family = p.FontFace.family.match(/^rbxasset:\/\/fonts\/families\/([A-Za-z0-9_-]+)\.json$/)?.[1];
      if (family && fontFamilies.includes(family)) out.font = family;
      else { out.font = 'SourceSansPro'; warn(node, 'FONT_SUBSTITUTED', `Font ${p.FontFace.family} is not in the verified renderer font set.`); }
      out.fontWeight = enumValue(p.FontFace.weight || 'Regular');
      out.fontStyle = enumValue(p.FontFace.style || 'Normal');
    }
    if (p.AutomaticSize && enumValue(p.AutomaticSize) !== 'None') warn(node, 'AUTO_SIZE_APPROXIMATED', 'AutomaticSize uses renderer approximations; compare text and bounds in Studio.');
    if (p.Image) {
      const binding = imageBindings[p.Image];
      if (binding?.status === 'ready' && /^img_[a-f0-9]{64}$/.test(binding.key)) out.icon = binding.key;
      else warn(node, 'IMAGE_UNAVAILABLE', 'The actual image content is unavailable. No thumbnail has been substituted.');
    }
    if (node.className === 'TextBox') warn(node, 'TEXTBOX_STATIC', 'Text input, focus, caret and keyboard behavior are not simulated by a PNG.');
    modifiers(node, out);
    out.children = visualChildren(node);
    return out;
  }
  modifiers(snapshot.root, {}); // Report unsupported direct ScreenGui children too.
  const p = snapshot.root.properties;
  const noInsets = p.IgnoreGuiInset === true || enumValue(p.ScreenInsets) === 'None';
  const edges = noInsets ? { left: 0, right: 0, top: 0, bottom: 0 } : viewport.insets;
  if (!noInsets) warn(snapshot.root, 'SCREEN_INSETS_SIMULATED', 'Insets come from the selected viewport profile, not a Roblox browser engine.');
  const content = { type: 'Frame', name: 'CapturedScreenGui', _nexusId: snapshot.root.id,
    size: [1, -edges.left - edges.right, 1, -edges.top - edges.bottom],
    position: [0, edges.left, 0, edges.top], anchor: [0, 0], bgTransparency: 1,
    visible: p.Enabled !== false, children: visualChildren(snapshot.root) };
  if (enumValue(p.ZIndexBehavior) === 'Global') warn(snapshot.root, 'GLOBAL_ZINDEX_PARITY_PENDING', 'Global Z ordering requires a renderer parity fixture.');
  // A full-size wrapper prevents root recenter/crop and keeps the image viewport stable.
  return { tree: { type: 'Frame', name: 'NexusViewport', size: [1, 0, 1, 0],
    position: [0, 0, 0, 0], anchor: [0, 0], bgTransparency: 1, children: [content] },
    viewport, warnings, fidelity: 'approximate' };
}
module.exports = { toPinevex, MODIFIERS };
```


## File 3: `backend/src/lib/uiGenerationPolicy.js`

```javascript
'use strict';
const AUTO = new Set(['', 'auto', 'nexus-free-auto', 'deepseek-free']);
const MINI = /^(?:openai\/)?gpt-(?:4o|4\.1|5(?:\.\d+)?)-mini(?:-|$)/i;

/** Call with server-resolved models. This is not an entitlement bypass. */
function assertUiModelSelection({ requestedModel = '', resolvedModel, automaticRole = true } = {}) {
  if (typeof resolvedModel !== 'string' || !resolvedModel.includes('/')) throw new Error('Resolve a concrete UI model before execution.');
  const explicit = !AUTO.has(String(requestedModel).trim().toLowerCase());
  if (automaticRole && MINI.test(resolvedModel) && (!explicit || !MINI.test(String(requestedModel)))) {
    throw Object.assign(new Error('The configured automatic UI model is disallowed.'), { code: 'UI_AUTOMATIC_MODEL_DISALLOWED' });
  }
  return resolvedModel;
}
const UI_BUILD_INSTRUCTIONS = `Implement the requested 2D Roblox interface in the bound Studio project.
Use the actual production ScreenGui, UI objects, Luau controllers, modules and real scoped assets.
Prefer persistent authored UI under a project-owned StarterGui root with explicit stable NexusUiNodeId attributes.
A LocalScript owns mounting, input, state binding, cleanup and respawn behavior. Keep business authority on the server.
Infer reasonable presentation defaults. Do not ask routine style or architecture questions.
Agent builds and applies under the existing run authorization; Plan drafts without applying; Ask stays read-only.
Persist actual source files in the Build workspace. Do not put build Luau or renderer JSON into chat.
Implement required popup/tab/loading/empty/error/disabled states in the real UI and controllers.
Describe preview state variants as restricted visual property overrides against captured stable IDs, never executable code.
Pinevex is a renderer of readback, not a code generator or Roblox runtime. Never use its Luau export as a second implementation.
If UI is only created during Play, request a supported runtime PlayerGui capture; do not invent the missing hierarchy.
Preview-only state changes do not execute Activated, remotes, purchases or gameplay.
Critique actual rendered images, then repair the Studio implementation and recapture; never repair only the preview data.
Font/asset/unsupported-property problems in the renderer are renderer diagnostics, not grounds to damage valid Studio UI.
Do not claim pixel parity, gameplay tests or UI state transitions passed without corresponding Studio observations.`;
module.exports = { assertUiModelSelection, UI_BUILD_INSTRUCTIONS };
```


## File 4: `backend/src/services/PinevexRenderClient.js`

```javascript
'use strict';
const { createHash } = require('node:crypto');
const PIN = 'db292aca2b319c7204f494175c59ed9bd9552930+nexus-preview-v1';
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function boundedJson(response, limit = 18 * 1024 * 1024) {
  if (!response.body) throw new Error('Renderer returned no body.');
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('Renderer response exceeds its byte budget.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
class PinevexRenderClient {
  constructor({ baseUrl, apiKey, fetchImpl = global.fetch, timeoutMs = 25000 } = {}) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid private renderer URL.');
    if (!apiKey || typeof fetchImpl !== 'function') throw new Error('Renderer credentials and fetch are required.');
    this.baseUrl = url.origin; this.apiKey = apiKey; this.fetch = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async request(path, payload, signal) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: payload ? 'POST' : 'GET', signal: combined, redirect: 'error',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const body = await boundedJson(response);
    if (!response.ok) throw Object.assign(new Error('UI preview renderer is unavailable.'), { code: 'UI_RENDER_FAILED', statusCode: 503 });
    if (body.rendererRevision !== PIN) throw Object.assign(new Error('Renderer version differs from the approved preview adapter.'), { code: 'UI_RENDER_VERSION_MISMATCH' });
    return body;
  }
  async describe({ signal } = {}) { return this.request('/healthz', null, signal); }
  async render({ tree, viewport, assets = [], fontRevision }, { signal } = {}) {
    const body = await this.request('/v1/render', { tree, viewport, assets, fontRevision }, signal);
    if (body.fontRevision !== fontRevision || body.width !== viewport.width || body.height !== viewport.height
        || typeof body.pngBase64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.pngBase64)) {
      throw new Error('Renderer output identity or dimensions do not match.');
    }
    const png = Buffer.from(body.pngBase64, 'base64');
    if (png.length < 24 || png.length > 12 * 1024 * 1024 || !png.subarray(0, 8).equals(PNG)
        || png.readUInt32BE(16) !== viewport.width || png.readUInt32BE(20) !== viewport.height) throw new Error('Renderer returned an invalid PNG.');
    return { png, imageHash: createHash('sha256').update(png).digest('hex'),
      width: body.width, height: body.height, rendererRevision: body.rendererRevision,
      fontRevision: body.fontRevision, warnings: Array.isArray(body.warnings) ? body.warnings : [] };
  }
}
module.exports = { PinevexRenderClient, PIN, boundedJson };
```


## File 5: `backend/src/services/runUiPreviewJob.js`

```javascript
'use strict';
const { validateSnapshot, applyPreviewState, renderCacheKey } = require('../lib/uiPreviewContract');
const { toPinevex } = require('../lib/pinevexAdapter');

/**
 * Executed inside the EXISTING durable job worker, after scoped admission.
 * Every injected method is required; no dependency silently becomes a no-op.
 * storeResult must atomically check the job lease/cancellation/source revision
 * before publishing the private image reference as the current preview.
 */
function createUiPreviewJobRunner(deps) {
  for (const key of ['loadSnapshot', 'loadState', 'resolveImages', 'readCache', 'isCurrent', 'storeResult']) {
    if (typeof deps[key] !== 'function') throw new TypeError(`${key} is required.`);
  }
  if (!deps.renderer?.describe || !deps.renderer?.render) throw new TypeError('Renderer is required.');
  return async function run(job, { signal } = {}) {
    const current = async () => {
      signal?.throwIfAborted();
      if (!await deps.isCurrent(job)) throw Object.assign(new Error('Preview was superseded.'), { code: 'UI_PREVIEW_SUPERSEDED' });
      signal?.throwIfAborted();
    };
    await current();
    const snapshot = validateSnapshot(await deps.loadSnapshot(job));
    for (const key of ['snapshotId', 'designId', 'projectId', 'sourceRevision']) {
      if (snapshot[key] !== job[key]) throw new Error(`Preview ${key} does not match its admitted job.`);
    }
    const variant = job.stateId === 'default' ? null : await deps.loadState(job);
    if (job.stateId !== 'default' && (!variant || variant.id !== job.stateId)) throw new Error('Preview state is unavailable.');
    const state = applyPreviewState(snapshot, variant);
    const descriptor = await deps.renderer.describe({ signal });
    // Resolver reads actual private image bytes from the scoped asset registry.
    // Missing/private/unpublished assets become explicit warnings, not thumbnails.
    const resolved = await deps.resolveImages({ job, root: state.snapshot.root, signal });
    const projected = toPinevex(state.snapshot, job.viewport, resolved.bindings, descriptor.fontFamilies);
    const assets = resolved.assets || [];
    const cacheKey = renderCacheKey({ userId: job.userId, projectId: job.projectId,
      designId: job.designId, sourceRevision: job.sourceRevision, tree: projected.tree,
      viewport: projected.viewport, assets: assets.map(({ key, sha256 }) => ({ key, sha256 })).sort((a,b) => a.key.localeCompare(b.key)),
      rendererRevision: descriptor.rendererRevision, fontRevision: descriptor.fontRevision });
    await current();
    const cached = await deps.readCache({ job, cacheKey });
    const render = cached || await deps.renderer.render({ tree: projected.tree, viewport: projected.viewport,
      assets, fontRevision: descriptor.fontRevision }, { signal });
    await current();
    const result = {
      cacheKey, designId: job.designId, projectId: job.projectId, viewportId: job.viewportId,
      snapshotId: snapshot.snapshotId, sourceRevision: snapshot.sourceRevision,
      treeHash: snapshot.treeHash, stateId: state.stateId, stateLabel: state.stateLabel,
      viewport: projected.viewport, rendererRevision: descriptor.rendererRevision,
      fontRevision: descriptor.fontRevision, simulated: state.simulated,
      captureKind: snapshot.capture.kind, capturedAt: snapshot.capture.capturedAt,
      fidelity: 'approximate', runtimeVerified: false,
      warnings: [...(snapshot.warnings || []), ...projected.warnings, ...(resolved.warnings || []), ...(render.warnings || [])],
      imageHash: render.imageHash, png: render.png,
    };
    // Rendering succeeds independently of whether Studio generation succeeded.
    // It must never update task.completion.canComplete or UI behavior checks.
    return deps.storeResult({ job, result, signal });
  };
}
module.exports = { createUiPreviewJobRunner };
```


## File 6: `backend/src/services/runUiVisualReview.js`

```javascript
'use strict';
const CATEGORIES = new Set(['layout', 'hierarchy', 'readability', 'contrast', 'density', 'prompt_adherence']);
const BLOCKING_RENDER_WARNINGS = new Set(['FONT_SUBSTITUTED', 'FONT_VARIANT_SUBSTITUTED', 'IMAGE_UNAVAILABLE', 'CLASS_NOT_CAPTURED',
  'PROPERTY_NOT_CAPTURED', 'CLASS_UNSUPPORTED', 'SIZE_CONSTRAINT_UNSUPPORTED']);
function normalizeReview(value, renders) {
  if (!value || !Array.isArray(value.issues) || value.issues.length > 12) throw new Error('Invalid UI visual review.');
  const identities = new Set(renders.map(render => render.previewId));
  const issues = value.issues.map(issue => {
    if (!identities.has(issue.previewId) || !CATEGORIES.has(issue.category)
        || !['minor', 'major'].includes(issue.severity)
        || typeof issue.description !== 'string' || !issue.description.trim() || issue.description.length > 1500) throw new Error('Unbound UI review issue.');
    return { previewId: issue.previewId, category: issue.category,
      severity: issue.severity, description: issue.description,
      nodeIds: Array.isArray(issue.nodeIds) ? issue.nodeIds.filter(id => typeof id === 'string').slice(0, 20) : [] };
  });
  return { issues, acceptable: !issues.some(issue => issue.severity === 'major') };
}

/** Run only as an authorized build step, NEVER on every browser state change. */
function createUiVisualReviewRunner(deps) {
  for (const key of ['loadRenders', 'reviewImages', 'repairStudio', 'recapture', 'hasBudget', 'isCurrent']) {
    if (typeof deps[key] !== 'function') throw new TypeError(`${key} is required.`);
  }
  return async ({ runId, revision, maxRepairs = 2, signal }) => {
    if (!Number.isInteger(maxRepairs) || maxRepairs < 0 || maxRepairs > 3) throw new Error('Invalid UI repair budget.');
    let current = revision; const history = [];
    for (let pass = 0; pass <= maxRepairs; pass += 1) {
      signal?.throwIfAborted();
      if (!await deps.isCurrent({ runId, revision: current })) return { status: 'superseded', history };
      const renders = await deps.loadRenders({ runId, revision: current, signal });
      if (!Array.isArray(renders) || !renders.length || renders.some(render => render.sourceRevision !== current || !render.imageRef || !render.previewId)) {
        return { status: 'awaiting_preview', revision: current, history };
      }
      const limitations = renders.flatMap(render => render.warnings || []).filter(warning => BLOCKING_RENDER_WARNINGS.has(warning.code));
      if (limitations.length) return { status: 'renderer_limited', revision: current, limitations, history };
      if (!await deps.hasBudget({ runId, purpose: 'ui_visual_review' })) return { status: 'budget_exhausted', revision: current, history };
      const raw = await deps.reviewImages({ runId, revision: current, renders, signal });
      const review = normalizeReview(raw, renders); history.push({ revision: current, review });
      if (review.acceptable) return { status: 'visual_review_passed', revision: current, runtimeVerified: false, history };
      if (pass === maxRepairs || !await deps.hasBudget({ runId, purpose: 'ui_repair' })) {
        return { status: 'needs_review', revision: current, runtimeVerified: false, history };
      }
      if (!await deps.isCurrent({ runId, revision: current })) return { status: 'superseded', history };
      const repair = await deps.repairStudio({ runId, expectedRevision: current, issues: review.issues,
        idempotencyKey: `ui-repair:${runId}:${current}:${pass}`, signal });
      if (!repair?.applied || !repair.sourceRevision || repair.sourceRevision === current) return { status: 'repair_not_applied', history };
      current = repair.sourceRevision;
      await deps.recapture({ runId, sourceRevision: current, signal });
    }
    throw new Error('Unreachable visual-review state.');
  };
}
module.exports = { createUiVisualReviewRunner, normalizeReview };
```


## File 7: `backend/src/routes/uiPreviews.js`

```javascript
'use strict';
const express = require('express');
const allowed = new Set(['snapshotId', 'sourceRevision', 'stateId', 'viewportId']);

/** Mount at /api/ui-designs alongside, not instead of, existing UI routes. */
function createUiPreviewRoutes({ service, authenticate, requireVerified, requirePaid, rateLimit }) {
  for (const fn of [authenticate, requireVerified, requirePaid, rateLimit]) if (typeof fn !== 'function') throw new TypeError('Existing authorization/limit middleware is required.');
  for (const key of ['manifest', 'enqueue', 'readJob', 'readImage']) if (typeof service?.[key] !== 'function') throw new TypeError(`UiPreviewService.${key} must be wired.`);
  const router = express.Router();
  const route = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  const context = req => ({ authenticatedUser: req.user, designId: req.params.designId });
  router.use(authenticate, requireVerified, requirePaid);
  router.get('/:designId/preview-manifest', route(async (req, res) => {
    res.set('Cache-Control', 'private, no-store').json(await service.manifest(context(req)));
  }));
  router.post('/:designId/previews', rateLimit, route(async (req, res) => {
    if (!req.body || Object.keys(req.body).some(key => !allowed.has(key))) {
      return res.status(400).json({ code: 'UI_PREVIEW_ENVELOPE_INVALID', message: 'Preview requests contain saved reference IDs only.' });
    }
    for (const key of allowed) if (typeof req.body[key] !== 'string' || !req.body[key] || req.body[key].length > 180) {
      return res.status(400).json({ code: 'UI_PREVIEW_ENVELOPE_INVALID', message: `Invalid ${key}.` });
    }
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey || !/^[A-Za-z0-9:_-]{8,180}$/.test(idempotencyKey)) return res.status(400).json({ code: 'IDEMPOTENCY_REQUIRED', message: 'A request identity is required.' });
    const result = await service.enqueue({ ...context(req), ...req.body, idempotencyKey });
    res.status(result.status === 'ready' ? 200 : 202).set('Cache-Control', 'private, no-store').json(result);
  }));
  router.get('/:designId/previews/:jobId', route(async (req, res) => {
    res.set('Cache-Control', 'private, no-store').json(await service.readJob({ ...context(req), jobId: req.params.jobId }));
  }));
  router.get('/:designId/previews/:jobId/image', route(async (req, res) => {
    const result = await service.readImage({ ...context(req), jobId: req.params.jobId });
    if (!Buffer.isBuffer(result.png)) throw new Error('Private image storage returned invalid bytes.');
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Preview-Image-Hash': result.imageHash }).send(result.png);
  }));
  return router;
}
module.exports = { createUiPreviewRoutes };
```


## File 8: `frontend/src/lib/uiPreviewApi.js`

```javascript
import { authedFetch } from './billing';
const base = designId => `/api/ui-designs/${encodeURIComponent(designId)}`;
async function json(path, init = {}) {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  const response = await authedFetch(path, { noCache: true, ...init, signal,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  let result;
  try { result = await response.json(); } catch { throw new Error('Preview service returned an invalid response.'); }
  if (!response.ok) throw Object.assign(new Error(result.message || result.error?.message || 'The preview request failed.'), {
    status: response.status, code: result.code || result.error?.code });
  return result;
}
export function getUiPreviewManifest(designId, signal) {
  return json(`${base(designId)}/preview-manifest`, { signal });
}
export function requestUiPreview(designId, references, { signal, idempotencyKey }) {
  return json(`${base(designId)}/previews`, { method: 'POST', signal,
    headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(references) });
}
export function readUiPreview(designId, jobId, signal) {
  return json(`${base(designId)}/previews/${encodeURIComponent(jobId)}`, { signal });
}
export async function readUiPreviewImage(designId, jobId, imageHash, signal) {
  const response = await authedFetch(`${base(designId)}/previews/${encodeURIComponent(jobId)}/image`, { method: 'GET', noCache: true, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) throw new Error('The preview image could not be loaded.');
  const blob = await response.blob();
  if (blob.size > 12 * 1024 * 1024) throw new Error('Preview image exceeds its size limit.');
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const actual = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== imageHash) throw new Error('Preview image revision mismatch.');
  return blob;
}
```


## File 9: `frontend/src/hooks/useUiPreview.js`

```javascript
import { useEffect, useRef, useState } from 'react';
import { requestUiPreview, readUiPreview, readUiPreviewImage } from '../lib/uiPreviewApi';

function pause(ms, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export default function useUiPreview({ designId, projectId, sourceRevision, snapshotId, stateId = 'default', viewportId, enabled = true }) {
  const identity = JSON.stringify([designId, projectId, sourceRevision, snapshotId, stateId, viewportId]);
  const [record, setRecord] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef(null);
  const identityRef = useRef(identity); identityRef.current = identity;
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current.url); }, []);
  useEffect(() => {
    if (urlRef.current?.identity !== identity && urlRef.current) {
      URL.revokeObjectURL(urlRef.current.url); urlRef.current = null;
    }
    if (!enabled || !designId || !projectId || !sourceRevision || !snapshotId || !viewportId) return undefined;
    const controller = new AbortController(); const { signal } = controller;
    const requestIdentity = identity;
    const active = () => !signal.aborted && identityRef.current === requestIdentity;
    setRecord(previous => ({ ...(previous?.identity === identity ? previous : {}), identity, status: 'loading', error: '' }));
    (async () => {
      await pause(180, signal);
      let job = await requestUiPreview(designId, { sourceRevision, snapshotId, stateId, viewportId }, {
        signal, idempotencyKey: `ui-preview-${crypto.randomUUID()}` });
      if (!job.jobId) throw new Error('Preview admission did not return a job identity.');
      const jobId = job.jobId; const deadline = Date.now() + 90000;
      while (job.status !== 'ready') {
        signal.throwIfAborted();
        if (['failed', 'cancelled', 'superseded'].includes(job.status)) throw new Error(job.message || 'This preview is no longer available.');
        if (!['queued', 'running'].includes(job.status)) throw new Error('Unknown preview job state.');
        if (Date.now() >= deadline) throw new Error('Preview is still processing. Retry to reconnect.');
        await pause(750, signal);
        job = await readUiPreview(designId, jobId, signal);
      }
      const result = job.preview;
      if (!result || result.snapshotId !== snapshotId || result.sourceRevision !== sourceRevision
          || result.stateId !== stateId || result.viewportId !== viewportId || result.projectId !== projectId) {
        throw new Error('Preview belongs to a different UI revision or state.');
      }
      const blob = await readUiPreviewImage(designId, jobId, result.imageHash, signal);
      if (!active()) return;
      const url = URL.createObjectURL(blob);
      const old = urlRef.current;
      urlRef.current = { identity, url };
      setRecord({ identity, status: 'ready', preview: result, url, error: '' });
      if (old) URL.revokeObjectURL(old.url);
    })().catch(error => {
      if (!active()) return;
      setRecord(previous => ({ ...(previous?.identity === identity ? previous : {}), identity,
        status: 'error', error: error?.message || 'Preview could not be loaded.' }));
    });
    return () => controller.abort();
  }, [identity, attempt, enabled, designId, projectId, sourceRevision, snapshotId, stateId, viewportId]);
  const visible = record?.identity === identity ? record : null;
  return { status: visible?.status || (snapshotId ? 'loading' : 'waiting_capture'),
    preview: visible?.preview || null, imageUrl: visible?.url || '', error: visible?.error || '', retry: () => setAttempt(x => x + 1) };
}
```


## File 10: `frontend/src/pages/ai/ui/UiPreviewPane.jsx`

```jsx
import React, { useState } from 'react';
import useUiPreview from '../../../hooks/useUiPreview';
import './UiPreviewPane.css';

/** Embed beside the EXISTING conversation/composer. codePanel is real Files/Monaco. */
export default function UiPreviewPane({ designId, projectId, sourceRevision, capture,
  states = [], viewports = [], onRefreshCapture, captureBusy = false, codePanel }) {
  const [tab, setTab] = useState('preview');
  const [selection, setSelection] = useState({ snapshotId: '', stateId: 'default', viewportId: '' });
  const stateId = selection.snapshotId === capture?.snapshotId && states.some(s => s.id === selection.stateId)
    ? selection.stateId : 'default';
  const viewportId = viewports.some(v => v.id === selection.viewportId) ? selection.viewportId : viewports[0]?.id;
  const currentCapture = capture?.sourceRevision === sourceRevision;
  const data = useUiPreview({ designId, projectId, sourceRevision,
    snapshotId: currentCapture ? capture?.snapshotId : null, stateId, viewportId, enabled: tab === 'preview' });
  const changeState = value => setSelection(previous => ({ ...previous, snapshotId: capture?.snapshotId, stateId: value }));
  const warningCount = data.preview?.warnings?.length || 0;
  return <section className="nx-ui-preview" aria-label="Roblox UI preview workspace">
    <header className="nx-ui-preview__toolbar">
      <nav aria-label="UI workspace views">
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
        <button type="button" aria-pressed={tab === 'code'} onClick={() => setTab('code')}>Code</button>
      </nav>
      {tab === 'preview' ? <>
        <label><span className="nx-ui-preview__sr">Viewport</span>
          <select aria-label="Preview viewport" value={viewportId || ''} onChange={event => setSelection(previous => ({ ...previous, viewportId: event.target.value }))}>
            {viewports.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
          </select>
        </label>
        <label><span className="nx-ui-preview__sr">Preview state</span>
          <select aria-label="Preview state" value={stateId} disabled={!currentCapture} onChange={event => changeState(event.target.value)}>
            <option value="default">Default</option>
            {states.filter(state => state.id !== 'default').map(state => <option key={state.id} value={state.id}>{state.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={captureBusy || typeof onRefreshCapture !== 'function'} onClick={onRefreshCapture}>{captureBusy ? 'Syncing…' : 'Sync Studio'}</button>
      </> : null}
    </header>
    {tab === 'code' ? <div className="nx-ui-preview__code">{codePanel}</div> : <>
      <div className="nx-ui-preview__status" role="status" aria-live="polite">
        {!currentCapture ? 'Studio capture needed for this revision'
          : data.status === 'loading' ? 'Rendering preview…'
          : data.preview ? `${data.preview.simulated ? 'Simulated state' : data.preview.captureKind === 'studio_runtime' ? 'Runtime snapshot redraw' : 'Studio snapshot redraw'} · browser approximation`
          : 'Waiting for a preview'}
      </div>
      {data.error ? <p className="nx-ui-preview__error" role="alert">{data.error} <button type="button" onClick={data.retry}>Retry preview</button></p> : null}
      <div className="nx-ui-preview__body">
        {data.imageUrl ? <img className="nx-ui-preview__image" src={data.imageUrl}
          alt={`${data.preview?.stateLabel || 'Default'} Roblox UI state preview`}
          width={data.preview?.viewport.width} height={data.preview?.viewport.height} />
          : <p>{!currentCapture ? 'Build or sync the UI in Studio to see its preview.' : 'The current preview will appear here.'}</p>}
      </div>
      {currentCapture && states.length ? <div className="nx-ui-preview__states" aria-label="Preview scenarios">
        <button type="button" onClick={() => changeState('default')}>Reset preview</button>
        {states.filter(state => state.id !== 'default').map(state => <button type="button" key={state.id}
          aria-pressed={stateId === state.id} onClick={() => changeState(state.id)}>{state.label}</button>)}
        <small>State previews do not click Roblox buttons or change Studio.</small>
      </div> : null}
      {warningCount ? <details className="nx-ui-preview__warnings"><summary>{warningCount} preview limitation{warningCount === 1 ? '' : 's'}</summary>
        <ul>{data.preview.warnings.map((warning, index) => <li key={`${warning.nodeId}-${warning.code}-${index}`}>{warning.message}</li>)}</ul>
      </details> : null}
    </>}
  </section>;
}
```


## File 11: `frontend/src/pages/ai/ui/UiPreviewPane.css`

```css
.nx-ui-preview {display:flex;flex-direction:column;min-width:0;min-height:0;height:100%;color:var(--ds-text);background:var(--ds-bg-workspace);overflow:hidden}
.nx-ui-preview__toolbar {display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--ds-border-subtle);flex-shrink:0}
.nx-ui-preview__toolbar nav {display:flex;gap:4px;margin-right:auto}
.nx-ui-preview button,.nx-ui-preview select {font:inherit;font-size:12px;color:inherit;background:transparent;border:1px solid transparent;border-radius:6px;padding:7px 9px;min-height:32px}
.nx-ui-preview select {max-width:180px;border-color:var(--ds-border-subtle);background:var(--ds-bg-workspace)}
.nx-ui-preview button {cursor:pointer}
.nx-ui-preview button[aria-pressed=true] {background:var(--ds-fill-subtle);border-color:var(--ds-border-subtle)}
.nx-ui-preview button:focus-visible,.nx-ui-preview select:focus-visible {outline:2px solid var(--ds-accent);outline-offset:2px}
.nx-ui-preview button:disabled {opacity:.55;cursor:default}
.nx-ui-preview__body {flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:16px}
.nx-ui-preview__body>p {font-size:13px;color:var(--ds-text-muted);max-width:34ch;text-align:center;line-height:1.6}
.nx-ui-preview__image {display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.nx-ui-preview__status {padding:8px 14px 0;font-size:11px;color:var(--ds-text-muted);flex-shrink:0}
.nx-ui-preview__states {display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding:8px 14px;border-top:1px solid var(--ds-border-subtle);flex-shrink:0}
.nx-ui-preview__states small {flex-basis:100%;font-size:10px;color:var(--ds-text-muted)}
.nx-ui-preview__error,.nx-ui-preview__warnings {margin:8px 14px;font-size:12px;line-height:1.6}
.nx-ui-preview__warnings {max-height:140px;overflow:auto}
.nx-ui-preview__sr {position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
@media(max-width:760px) {.nx-ui-preview button,.nx-ui-preview select {min-height:44px}.nx-ui-preview__toolbar {gap:4px;padding:8px}.nx-ui-preview__body {padding:8px}}
@media(prefers-reduced-motion:reduce) {.nx-ui-preview * {animation:none!important;transition:none!important}}

.nx-ui-preview__code {flex:1;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column}
```


## File 12: `roblox-plugin/modules/UiSnapshotSerializer.lua`

```lua
--!strict
-- Read-only serializer. Bridge admission chooses the authorized ScreenGui root.
-- This module never executes source, sets properties, or starts a playtest.
local Serializer = {}
local MAX_NODES = 1200
local MAX_DEPTH = 32

local VISUAL: {[string]: boolean} = {
    Frame = true, CanvasGroup = true, ScrollingFrame = true,
    TextLabel = true, TextButton = true, TextBox = true,
    ImageLabel = true, ImageButton = true,
}
local MODIFIER: {[string]: boolean} = {
    UICorner = true, UIStroke = true, UIGradient = true, UIPadding = true,
    UIScale = true, UIListLayout = true, UIGridLayout = true,
    UIAspectRatioConstraint = true, UISizeConstraint = true,
    UITextSizeConstraint = true, UIFlexItem = true,
}
local COMMON = {"Size", "Position", "AnchorPoint", "BackgroundColor3", "BackgroundTransparency",
    "BorderSizePixel", "BorderColor3", "ZIndex", "LayoutOrder", "Visible", "ClipsDescendants",
    "Rotation", "AutomaticSize", "SizeConstraint", "AbsolutePosition", "AbsoluteSize"}
local TEXT = {"Text", "TextColor3", "TextSize", "TextScaled", "TextWrapped", "TextTransparency",
    "TextXAlignment", "TextYAlignment", "RichText", "LineHeight", "FontFace",
    "TextStrokeColor3", "TextStrokeTransparency", "TextBounds", "TextTruncate"}
local IMAGE = {"Image", "ImageColor3", "ImageTransparency", "ScaleType", "TileSize",
    "SliceCenter", "SliceScale", "ImageRectSize", "ImageRectOffset", "ResampleMode"}
local PROPERTIES: {[string]: {string}} = {
    ScreenGui = {"Enabled", "DisplayOrder", "IgnoreGuiInset", "ScreenInsets", "ZIndexBehavior",
        "ClipToDeviceSafeArea", "SafeAreaCompatibility", "ResetOnSpawn", "AbsolutePosition", "AbsoluteSize"},
    CanvasGroup = {"GroupColor3", "GroupTransparency"},
    ScrollingFrame = {"CanvasSize", "CanvasPosition", "AutomaticCanvasSize", "ScrollingDirection",
        "ScrollBarImageColor3", "ScrollBarImageTransparency", "ScrollBarThickness"},
    TextBox = {"PlaceholderText", "PlaceholderColor3", "ClearTextOnFocus", "MultiLine"},
    UICorner = {"CornerRadius"},
    UIStroke = {"Enabled", "Color", "Transparency", "Thickness", "ApplyStrokeMode",
        "BorderStrokePosition", "LineJoinMode", "StrokeSizingMode", "BorderOffset"},
    UIGradient = {"Enabled", "Color", "Transparency", "Rotation", "Offset"},
    UIPadding = {"PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight"},
    UIScale = {"Scale"},
    UIListLayout = {"FillDirection", "HorizontalAlignment", "VerticalAlignment", "Padding",
        "Wraps", "SortOrder", "HorizontalFlex", "VerticalFlex"},
    UIGridLayout = {"CellSize", "CellPadding", "FillDirection", "HorizontalAlignment",
        "VerticalAlignment", "SortOrder", "FillDirectionMaxCells", "StartCorner"},
    UIAspectRatioConstraint = {"AspectRatio", "AspectType", "DominantAxis"},
    UISizeConstraint = {"MinSize", "MaxSize"},
    UITextSizeConstraint = {"MinTextSize", "MaxTextSize"},
    UIFlexItem = {"FlexMode", "GrowRatio", "ShrinkRatio", "ItemLineAlignment"},
}

local function encode(value: any): any
    local kind = typeof(value)
    if kind == "boolean" or kind == "string" then return value end
    if kind == "number" then
        if value ~= value or math.abs(value) == math.huge then error("Non-finite UI number") end
        return value
    end
    if kind == "EnumItem" then return value.Name end
    if kind == "Color3" then return {r = value.R, g = value.G, b = value.B} end
    if kind == "Vector2" then return {x = value.X, y = value.Y} end
    if kind == "UDim" then return {scale = value.Scale, offset = value.Offset} end
    if kind == "UDim2" then return {x = encode(value.X), y = encode(value.Y)} end
    if kind == "Rect" then return {min = encode(value.Min), max = encode(value.Max)} end
    if kind == "Font" then return {family = value.Family, weight = value.Weight.Name, style = value.Style.Name} end
    if kind == "ColorSequence" then
        local stops = {}
        for _, point in value.Keypoints do table.insert(stops, {time = point.Time, color = encode(point.Value)}) end
        return stops
    end
    if kind == "NumberSequence" then
        local stops = {}
        for _, point in value.Keypoints do table.insert(stops, {time = point.Time, value = point.Value, envelope = point.Envelope}) end
        return stops
    end
    error("Unsupported serialized UI value: " .. kind)
end

function Serializer.capture(root: Instance): any
    assert(root:IsA("ScreenGui"), "Select one authorized ScreenGui")
    local count = 0
    local ids: {[string]: boolean} = {}
    local warnings = {}
    local complete = true
    local function warning(id: string, code: string, message: string)
        table.insert(warnings, {nodeId = id, code = code, message = message})
    end
    local function visit(instance: Instance, depth: number): any
        if depth > MAX_DEPTH or count >= MAX_NODES then
            complete = false
            return nil
        end
        count += 1
        local rawId = instance:GetAttribute("NexusUiNodeId")
        local id = if typeof(rawId) == "string" and #rawId > 0 and #rawId <= 180
            then rawId else "capture_" .. tostring(count)
        assert(not ids[id], "Duplicate UI node ID: " .. id)
        ids[id] = true
        local node = {id = id, name = instance.Name, className = instance.ClassName, properties = {}, children = {}}
        local function readProperties(names: {string})
            for _, name in names do
                local ok, value = pcall(function() return encode((instance :: any)[name]) end)
                if ok then (node.properties :: any)[name] = value
                else warning(id, "PROPERTY_NOT_CAPTURED", instance.ClassName .. "." .. name .. " was not readable") end
            end
        end
        if VISUAL[instance.ClassName] then readProperties(COMMON) end
        if instance:IsA("TextLabel") or instance:IsA("TextButton") or instance:IsA("TextBox") then readProperties(TEXT) end
        if instance:IsA("ImageLabel") or instance:IsA("ImageButton") then readProperties(IMAGE) end
        readProperties(PROPERTIES[instance.ClassName] or {})
        for _, child in instance:GetChildren() do
            if child:IsA("LuaSourceContainer") then
                -- Source/dependencies are versioned through the file artifact path.
                continue
            end
            if VISUAL[child.ClassName] or MODIFIER[child.ClassName] or child:IsA("Folder") then
                local captured = visit(child, depth + 1)
                if captured then table.insert(node.children, captured) end
            elseif child:IsA("GuiObject") or child:IsA("UIComponent") then
                warning(id, "CLASS_NOT_CAPTURED", child.ClassName .. " is not supported by the 2D preview")
            end
        end
        return node
    end
    local capturedRoot = visit(root, 0)
    return {schemaVersion = 1, complete = complete, nodeCount = count, root = capturedRoot,
        capturedAt = DateTime.now():ToIsoDate(), warnings = warnings}
end

return Serializer
```


## File 13: `renderer/patch_grid.py`

```python
"""Build-time patch for the PINNED Pinevex grid solver. Refuse unknown source."""
import hashlib
import re
import sys
from pathlib import Path

ORIGINAL_BLOB = "32aa917d7db4aa3fc6073e5f7b839b4dfbeed63a"
HELPER = '''\n# Nexus four-term UDim2 grid support (preview-v1).\ndef _nexus_grid_axis(value, axis, extent, default):\n    if isinstance(value, (list, tuple)) and len(value) == 4:\n        start = axis * 2\n        return _num(value[start], 0.0) * extent + _num(value[start + 1], 0.0)\n    return _seq_num(value, axis, default) * extent\n\n'''

def patch_source(source):
    pairs = [("cell_size", 0, "w", "0.1"), ("cell_size", 1, "h", "0.1"),
             ("cell_padding", 0, "w", "0.0"), ("cell_padding", 1, "h", "0.0")]
    result = source
    counts = []
    for name, axis, dimension, default in pairs:
        old = f"_seq_num({name}, {axis}, {default}) * size_ref.{dimension}"
        new = f"_nexus_grid_axis({name}, {axis}, size_ref.{dimension}, {default})"
        count = result.count(old)
        if count < 2:
            raise ValueError("Pinned grid solver changed; inspect it before patching.")
        result = result.replace(old, new)
        counts.append(count)
    if len(set(counts)) != 1:
        raise ValueError("Not all grid measurement/paint paths were patched equally.")
    if re.search(r"_seq_num\(cell_(?:size|padding),", result):
        raise ValueError("Unpatched grid axis remains.")
    compile(result + HELPER, "renderer.py", "exec")
    return result + HELPER

if __name__ == "__main__":
    path = Path(sys.argv[1])
    raw = path.read_bytes()
    digest = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
    if digest != ORIGINAL_BLOB:
        raise SystemExit("Pinevex renderer blob differs from the audited pin. Do not auto-patch.")
    path.write_text(patch_source(raw.decode()), encoding="utf-8")
```


## File 14: `renderer/render_core.py`

```python
"""Private, uncropped Pinevex wrapper. No Luau export, JSON repair or asset HTTP."""
import base64
import hashlib
import io
import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path

PIN = "db292aca2b319c7204f494175c59ed9bd9552930+nexus-preview-v1"
ASSET_KEY = re.compile(r"^img_[a-f0-9]{64}$")
ROOT = Path(os.getenv("PINEVEX_ROOT", "/opt/pinevex"))
FONTS = ROOT / "src" / "ui_engine" / "fonts"
MAX_PIXELS = 4_000_000


def validate_request(payload):
    if not isinstance(payload, dict) or set(payload) - {"tree", "viewport", "assets", "fontRevision"}:
        raise ValueError("Invalid render envelope")
    viewport = payload.get("viewport", {})
    width, height = viewport.get("width"), viewport.get("height")
    if any(type(x) is not int or not 160 <= x <= 2560 for x in (width, height)) or width * height > MAX_PIXELS:
        raise ValueError("Invalid viewport")
    count = 0
    def check_value(value, depth=0):
        if depth > 96: raise ValueError("Value nesting limit")
        if value is None or type(value) is bool: return
        if type(value) in (int, float):
            if not math.isfinite(value) or abs(value) > 1e12: raise ValueError("Non-finite/out-of-range value")
            return
        if isinstance(value, str):
            if len(value) > 24000: raise ValueError("String limit")
            return
        if isinstance(value, list):
            if len(value) > 2400: raise ValueError("Array limit")
            for item in value: check_value(item, depth + 1)
            return
        if isinstance(value, dict):
            if len(value) > 200: raise ValueError("Object limit")
            for key, item in value.items():
                if key in {"__proto__", "constructor", "prototype", "source", "code", "luau", "_crop"}:
                    raise ValueError("Forbidden renderer field")
                check_value(item, depth + 1)
            return
        raise ValueError("Invalid JSON type")
    def check_node(node, depth=0):
        nonlocal count
        count += 1
        if count > 1202 or depth > 34 or not isinstance(node, dict): raise ValueError("UI tree limit")
        if node.get("type") not in {"Frame", "CanvasGroup", "ScrollingFrame", "TextLabel", "TextButton", "TextBox", "ImageLabel", "ImageButton"}:
            raise ValueError("Unsupported render class")
        icon = node.get("icon")
        if icon is not None and not ASSET_KEY.fullmatch(icon): raise ValueError("Use a scoped materialized image key")
        for child in node.get("children", []): check_node(child, depth + 1)
    tree = payload.get("tree")
    check_value(tree); check_node(tree)
    assets = payload.get("assets", [])
    if not isinstance(assets, list) or len(assets) > 64: raise ValueError("Asset limit")
    keys = set(); total = 0
    for asset in assets:
        if not isinstance(asset, dict) or not ASSET_KEY.fullmatch(asset.get("key", "")): raise ValueError("Invalid asset key")
        if asset["key"] in keys: raise ValueError("Duplicate asset key")
        keys.add(asset["key"])
        raw = base64.b64decode(asset.get("pngBase64", ""), validate=True)
        total += len(raw)
        digest = hashlib.sha256(raw).hexdigest()
        if len(raw) > 2 * 1024 * 1024 or total > 10 * 1024 * 1024: raise ValueError("Asset byte limit")
        if digest != asset.get("sha256") or asset["key"] != f"img_{digest}": raise ValueError("Asset digest mismatch")
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"): raise ValueError("Use normalized PNG assets")
    def references(node):
        if node.get("icon") and node["icon"] not in keys: raise ValueError("Unmaterialized image")
        for child in node.get("children", []): references(child)
    references(tree)
    return payload


def font_descriptor():
    files = sorted(p for p in FONTS.rglob("*") if p.is_file() and p.suffix.lower() in {".ttf", ".otf", ".ttc"})
    if not files: raise RuntimeError("Renderer fonts not installed")
    digest = hashlib.sha256()
    for file in files:
        digest.update(str(file.relative_to(FONTS)).encode())
        digest.update(hashlib.sha256(file.read_bytes()).digest())
    families = [s.strip() for s in os.getenv("NEXUS_UI_FONT_FAMILIES", "SourceSansPro,Montserrat,FredokaOne,Roboto").split(",") if s.strip()]
    return {"rendererRevision": PIN, "fontRevision": digest.hexdigest(), "fontFamilies": families}


def render_payload(payload, render_fn=None, fonts_dir=None, descriptor=None):
    """render_fn injection exists for unit tests; production always uses Pinevex."""
    validate_request(payload)
    descriptor = descriptor or font_descriptor()
    if payload.get("fontRevision") != descriptor["fontRevision"]: raise ValueError("Font revision changed")
    warnings = []
    if render_fn is None:
        sys.path.insert(0, str(ROOT / "src"))
        from ui_engine.renderer import render_json
        render_fn = render_json
        from ui_engine.text_fonts import _try_load_exact_typeface
        weights = {"Thin":100,"ExtraLight":200,"Light":300,"Regular":400,"Medium":500,
                   "SemiBold":600,"Bold":700,"ExtraBold":800,"Heavy":900}
        def audit_fonts(node):
            if node.get("type") in {"TextLabel","TextButton","TextBox"}:
                family = node.get("font", "SourceSansPro")
                weight = weights.get(node.get("fontWeight", "Regular"), 400)
                face = _try_load_exact_typeface(family, weight, fonts_dir or FONTS,
                                                italic=node.get("fontStyle") == "Italic")
                if face is None:
                    warnings.append({"nodeId":node.get("_nexusId", ""), "code":"FONT_VARIANT_SUBSTITUTED",
                                     "message":"The exact requested font variant is not installed in the renderer."})
            for child in node.get("children", []): audit_fonts(child)
        audit_fonts(payload["tree"])
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    width, height = payload["viewport"]["width"], payload["viewport"]["height"]
    # One child process and one private directory per render prevents Pinevex's
    # global icon-manifest cache from crossing tenants or asset revisions.
    with tempfile.TemporaryDirectory(prefix="nexus-ui-") as tmp:
        icons = Path(tmp); (icons / "png").mkdir()
        manifest = {}
        for asset in payload.get("assets", []):
            raw = base64.b64decode(asset["pngBase64"], validate=True)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format != "PNG" or image.width * image.height > MAX_PIXELS: raise ValueError("Invalid image dimensions")
                image.verify()
            filename = asset["sha256"] + ".png"
            (icons / "png" / filename).write_bytes(raw)
            manifest[asset["key"]] = {"file": filename}
        (icons / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        # Do not call api.index._prepare_preview_object, postprocess, crop,
        # icon fetchers or pinevex_to_luau. Preserve the supplied viewport.
        image = render_fn(payload["tree"], output_path=None, fonts_dir=fonts_dir or FONTS,
                          icons_dir=icons, width=width, height=height,
                          bg_color=(0, 0, 0, 0), default_size_ref="parent", out={})
        if image.size != (width, height): raise ValueError("Renderer changed viewport size")
        buffer = io.BytesIO(); image.save(buffer, format="PNG"); png = buffer.getvalue()
        if len(png) > 12 * 1024 * 1024: raise ValueError("Output image too large")
        return {**descriptor, "width": width, "height": height,
                "pngBase64": base64.b64encode(png).decode(), "warnings": warnings}
```


## File 15: `renderer/server.py`

```python
"""Serve only on a private network. Public access goes through Nexus auth/jobs."""
import asyncio
import hmac
import json
import logging
import multiprocessing as mp
import os
import threading
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from render_core import font_descriptor, render_payload

app = FastAPI(title="Nexus UI Preview")
slots = threading.BoundedSemaphore(2)


def authorize(request):
    secret = os.getenv("RENDERER_API_KEY", "")
    if len(secret) < 32: raise HTTPException(503, "Renderer key not configured")
    if not hmac.compare_digest(request.headers.get("authorization", ""), "Bearer " + secret):
        raise HTTPException(401, "Unauthorized")


@lru_cache(maxsize=1)
def descriptor(): return font_descriptor()


def child_render(connection, payload):
    try:
        # Linux container runtime supplies the hard memory limit as well.
        if os.name == "posix":
            import resource
            resource.setrlimit(resource.RLIMIT_CPU, (15, 16))
        connection.send({"ok": True, "result": render_payload(payload)})
    except Exception:
        logging.exception("UI preview render failed")
        connection.send({"ok": False})
    finally: connection.close()


def isolated_render(payload):
    if not slots.acquire(blocking=False): raise HTTPException(429, "Renderer busy; retry through the job queue")
    process = None
    parent = child = None
    try:
        context = mp.get_context("spawn")
        parent, child = context.Pipe(duplex=False)
        process = context.Process(target=child_render, args=(child, payload))
        process.start(); child.close()
        if not parent.poll(20): raise HTTPException(504, "Render timed out")
        result = parent.recv()
        if not result.get("ok"): raise HTTPException(422, "Render failed; inspect private diagnostics")
        return result["result"]
    finally:
        if process is not None and process.pid:
            if process.is_alive(): process.terminate()
            process.join(timeout=2)
            if process.is_alive(): process.kill(); process.join(timeout=2)
        if parent: parent.close()
        if child: child.close()
        slots.release()


@app.get("/healthz")
async def health(request: Request):
    authorize(request)
    try: return await run_in_threadpool(descriptor)
    except Exception: raise HTTPException(503, "Renderer runtime/fonts unavailable")


@app.post("/v1/render")
async def render(request: Request):
    authorize(request)
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 16 * 1024 * 1024: raise HTTPException(413, "Render request too large")
    try:
        payload = json.loads(data, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except (ValueError, UnicodeDecodeError): raise HTTPException(400, "Invalid JSON")
    return await run_in_threadpool(isolated_render, payload)
```


## File 16: `renderer/Dockerfile`

```dockerfile
# Build/runtime network access must follow deployment policy. Pin the base image
# digest and compile a hashes-locked requirements file before production rollout.
FROM python:3.11-slim
ARG PINEVEX_COMMIT=db292aca2b319c7204f494175c59ed9bd9552930
RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libfontconfig1 libfreetype6 libegl1 \
    && rm -rf /var/lib/apt/lists/*
RUN git init /opt/pinevex && cd /opt/pinevex && git remote add origin https://github.com/whutdev/pinevex-renderer.git \
    && git fetch --depth 1 origin "$PINEVEX_COMMIT" && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "$PINEVEX_COMMIT" \
    && python -m pip install --no-cache-dir -r requirements.txt
WORKDIR /app
COPY patch_grid.py /app/patch_grid.py
RUN python /app/patch_grid.py /opt/pinevex/src/ui_engine/renderer.py
COPY render_core.py server.py /app/
RUN useradd --uid 10001 --create-home renderer
USER 10001
ENV PINEVEX_ROOT=/opt/pinevex PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--limit-concurrency", "8"]
```


## File 17: `renderer/smoke_renderer.py`

```python
"""Run against the actual private container. These are renderer tests, not Studio parity."""
import base64
import io
import json
import os
import urllib.request
from PIL import Image

base = os.environ.get('RENDERER_BASE_URL', 'http://127.0.0.1:8080').rstrip('/')
key = os.environ['RENDERER_API_KEY']
def call(path, data=None):
    request = urllib.request.Request(base + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=30) as response: return json.load(response)
descriptor = call('/healthz')
root = {'type':'Frame','size':[1,0,1,0],'position':[0,0,0,0],'bgTransparency':1,'children':[
    {'type':'Frame','name':'Grid','position':[0,17,0,29],'size':[0,200,0,100],'bgTransparency':1,
     'grid':{'cellSize':[0,40,0,20],'cellPadding':[0,8,0,8],'direction':'X'},
     'children':[{'type':'Frame','bg':[255,0,0]},{'type':'Frame','bg':[0,255,0]}]}]}
payload={'tree':root,'viewport':{'width':320,'height':240},'assets':[], 'fontRevision':descriptor['fontRevision']}
result=call('/v1/render',payload)
image=Image.open(io.BytesIO(base64.b64decode(result['pngBase64']))).convert('RGBA')
assert image.size==(320,240), image.size
assert image.getpixel((20,32))[:3]==(255,0,0), 'First offset cell missing'
assert image.getpixel((68,32))[:3]==(0,255,0), 'Second offset cell missing'
assert image.getpixel((5,5))[3]==0, 'Unexpected recenter/background/crop'
print(json.dumps({'status':'passed','rendererRevision':result['rendererRevision'],'checks':['uncropped viewport','pixel grid cell size','pixel grid padding']},indent=2))
```


## File 18: `fixtures/PopupFixture.client.lua`

```lua
--!strict
-- Acceptance fixture only. Place in StarterPlayerScripts of a disposable place.
-- This creates PlayerGui UI during Play, so an edit-only capture must NOT claim
-- the resulting GUI exists. Exercise the runtime-capture path for this fixture.
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
assert(not playerGui:FindFirstChild("NexusPopupFixture"), "Fixture is already mounted")

local function identify(instance: Instance, id: string)
    instance:SetAttribute("NexusUiNodeId", id)
end
local gui = Instance.new("ScreenGui")
gui.Name = "NexusPopupFixture"
gui.IgnoreGuiInset = true
gui.ResetOnSpawn = false
identify(gui, "fixture-root")
gui.Parent = playerGui

local open = Instance.new("TextButton")
open.Name = "OpenShop"
open.Size = UDim2.fromOffset(180, 48)
open.Position = UDim2.new(0.5, -90, 0.8, 0)
open.Text = "Open shop"
open.TextSize = 20
open.BackgroundColor3 = Color3.fromRGB(39, 39, 48)
open.TextColor3 = Color3.new(1, 1, 1)
identify(open, "open-shop")
open.Parent = gui

local overlay = Instance.new("Frame")
overlay.Name = "ShopOverlay"
overlay.Size = UDim2.fromScale(1, 1)
overlay.BackgroundColor3 = Color3.new(0, 0, 0)
overlay.BackgroundTransparency = 0.45
overlay.Visible = false
overlay.ZIndex = 10
identify(overlay, "shop-overlay")
overlay.Parent = gui

local panel = Instance.new("Frame")
panel.Name = "ShopPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.Size = UDim2.new(0.8, 0, 0.6, 0)
panel.BackgroundColor3 = Color3.fromRGB(28, 28, 35)
panel.ZIndex = 11
identify(panel, "shop-panel")
panel.Parent = overlay
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
identify(corner, "shop-corner")
corner.Parent = panel

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, -32, 0, 64)
title.Position = UDim2.fromOffset(16, 0)
title.Text = "Supply shop"
title.TextColor3 = Color3.new(1, 1, 1)
title.TextSize = 28
title.ZIndex = 12
identify(title, "shop-title")
title.Parent = panel

local close = Instance.new("TextButton")
close.Name = "CloseShop"
close.Text = "Close"
close.TextSize = 18
close.Size = UDim2.fromOffset(120, 44)
close.Position = UDim2.new(0.5, -60, 1, -64)
close.ZIndex = 12
identify(close, "close-shop")
close.Parent = panel

local connections = {
    open.Activated:Connect(function() overlay.Visible = true end),
    close.Activated:Connect(function() overlay.Visible = false end),
}
gui.Destroying:Connect(function()
    for _, connection in connections do connection:Disconnect() end
end)
```


## File 19: `backend/tests/uiPreview.test.cjs`

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { digest, canonical, validateSnapshot, applyPreviewState, validateViewport, renderCacheKey } = require('../src/lib/uiPreviewContract');
const { toPinevex } = require('../src/lib/pinevexAdapter');
const { assertUiModelSelection } = require('../src/lib/uiGenerationPolicy');
const { createUiPreviewJobRunner } = require('../src/services/runUiPreviewJob');
const { PinevexRenderClient, PIN } = require('../src/services/PinevexRenderClient');

const u2 = (xs, xo, ys, yo) => ({ x: { scale: xs, offset: xo }, y: { scale: ys, offset: yo } });
const node = (id, className = 'Frame', properties = {}, children = []) => ({ id, name: id, className,
  properties: { ...(className === 'ScreenGui' ? {} : { Size: u2(0,100,0,100), Position: u2(0,0,0,0) }), ...properties }, children });
const snapshot = () => ({ schemaVersion: 1, complete: true, snapshotId: 's1', designId: 'd1', projectId: 'p1', sourceRevision: 'r1',
  capture: { kind: 'studio_edit', sessionId: 'session1', commandId: 'command1', capturedAt: '2026-09-08T00:00:00Z' },
  root: node('root', 'ScreenGui', { Enabled: true, IgnoreGuiInset: true }, [
    node('button', 'TextButton', { Text: 'Open', TextColor3: {r:1,g:1,b:1} }),
    node('popup', 'Frame', { Visible: false }, [node('title', 'TextLabel', { Text: 'Supply shop' })]),
  ]) });
const variant = s => ({ id: 'shop-open', label: 'Shop open', baseTreeHash: validateSnapshot(s).treeHash, sourceRevision: 'r1',
  patches: [{ nodeId: 'popup', property: 'Visible', value: true }] });
const viewport = { width: 1280, height: 720, insets: { left:0,right:0,top:0,bottom:0 } };
function converted(s = snapshot(), view = viewport, bindings, fonts) { return toPinevex(validateSnapshot(s), view, bindings, fonts); }
const body = tree => tree.children[0].children;

test('snapshot computes hash from observed tree rather than supplied hash', () => {
  const s = snapshot(); s.treeHash = 'fake'; assert.equal(validateSnapshot(s).treeHash, digest(s.root));
});
test('popup state is a copy; does not mutate captured hierarchy', () => {
  const s = snapshot(); const r = applyPreviewState(s, variant(s));
  assert.equal(s.root.children[1].properties.Visible, false);
  assert.equal(r.snapshot.root.children[1].properties.Visible, true); assert.equal(r.simulated, true);
});
test('default state preserves hidden popup', () => assert.equal(applyPreviewState(snapshot()).snapshot.root.children[1].properties.Visible, false));
test('state rejects old capture hash', () => { const s = snapshot(); const v = variant(s); v.baseTreeHash='old'; assert.throws(()=>applyPreviewState(s,v), /older/); });
test('state rejects old source revision', () => { const s=snapshot(), v=variant(s); v.sourceRevision='old'; assert.throws(()=>applyPreviewState(s,v), /older/); });
test('state rejects missing node rather than inventing popup', () => {const s=snapshot(),v=variant(s);v.patches[0].nodeId='missing';assert.throws(()=>applyPreviewState(s,v),/uncaptured/);});
for (const property of ['Source','Parent','ClassName','Name','Image','RunCode','Active','__proto__']) {
  test(`state cannot patch ${property}`, () => {const s=snapshot(),v=variant(s);v.patches[0]={nodeId:'popup',property,value:'bad'};assert.throws(()=>applyPreviewState(s,v));});
}
test('duplicate state writes are rejected',()=>{const s=snapshot(),v=variant(s);v.patches.push(v.patches[0]);assert.throws(()=>applyPreviewState(s,v),/Duplicate/);});
test('state data cannot introduce prototype keys',()=>{const s=snapshot(),v=variant(s);v.patches[0].value=JSON.parse('{"__proto__":{}}');assert.throws(()=>applyPreviewState(s,v));});
test('same property on different nodes is permitted',()=>{const s=snapshot(),v=variant(s);v.patches.push({nodeId:'button',property:'Visible',value:false});assert.equal(applyPreviewState(s,v).snapshot.root.children[0].properties.Visible,false);});
test('state accepts valid full UDim2 without destroying the baseline',()=>{const s=snapshot(),v=variant(s);v.patches=[{nodeId:'popup',property:'Position',value:u2(.5,-10,.5,20)}];assert.deepEqual(applyPreviewState(s,v).snapshot.root.children[1].properties.Position,u2(.5,-10,.5,20));});
test('invalid color channel is rejected',()=>{const s=snapshot(),v=variant(s);v.patches=[{nodeId:'popup',property:'BackgroundColor3',value:{r:2,g:0,b:0}}];assert.throws(()=>applyPreviewState(s,v));});
test('snapshot rejects partial tree',()=>{const s=snapshot();s.complete=false;assert.throws(()=>validateSnapshot(s),/complete/);});
test('snapshot rejects AI-authored source claimed as capture',()=>{const s=snapshot();s.capture.kind='ai_draft';assert.throws(()=>validateSnapshot(s),/Studio/);});
test('snapshot rejects duplicate stable IDs',()=>{const s=snapshot();s.root.children[1].id='button';assert.throws(()=>validateSnapshot(s),/Duplicate/);});
test('snapshot rejects cycles',()=>{const s=snapshot();s.root.children.push(s.root);assert.throws(()=>validateSnapshot(s),/Cyclic/);});
test('snapshot rejects excessive depth',()=>{const s=snapshot();let p=s.root;for(let i=0;i<40;i++){const n=node('deep'+i);p.children.push(n);p=n;}assert.throws(()=>validateSnapshot(s));});
test('snapshot rejects nonfinite numbers',()=>{const s=snapshot();s.root.properties.DisplayOrder=NaN;assert.throws(()=>validateSnapshot(s));});
test('hash is stable across object key order',()=>assert.equal(digest({a:1,b:2}),digest({b:2,a:1})));
test('false, zero and empty text survive projection',()=>{const s=snapshot();Object.assign(s.root.children[0].properties,{Visible:false,Text:'',TextSize:0,TextTransparency:0});const out=body(converted(s).tree)[0];assert.equal(out.visible,false);assert.equal(out.text,'');assert.equal(out.textSize,0);assert.equal(out.textTransparency,0);});
test('full viewport wrapper never crops or recentres original nodes',()=>{const s=snapshot();s.root.children[0].properties.Position=u2(0,17,0,29);const out=converted(s).tree;assert.deepEqual(out.position,[0,0,0,0]);assert.deepEqual(body(out)[0].position,[0,17,0,29]);assert.equal(out._crop,undefined);});
test('ScreenGui disabled hides its entire subtree',()=>{const s=snapshot();s.root.properties.Enabled=false;assert.equal(converted(s).tree.children[0].visible,false);});
test('image source URLs never reach the renderer',()=>{const s=snapshot();s.root.children.push(node('icon','ImageLabel',{Image:'http://169.254.169.254/secrets'}));const result=converted(s);assert.equal(body(result.tree).at(-1).icon,undefined);assert(result.warnings.some(w=>w.code==='IMAGE_UNAVAILABLE'));});
test('scoped image keys replace rbxasset references',()=>{const s=snapshot();s.root.children.push(node('icon','ImageLabel',{Image:'rbxassetid://123'}));const key='img_'+'a'.repeat(64);assert.equal(body(converted(s,viewport,{'rbxassetid://123':{status:'ready',key}}).tree).at(-1).icon,key);});
test('font substitution is explicit',()=>{const s=snapshot();s.root.children[0].properties.FontFace={family:'rbxassetid://123',weight:'Bold',style:'Normal'};assert(converted(s).warnings.some(w=>w.code==='FONT_SUBSTITUTED'));});
test('exact allowlisted font family is retained',()=>{const s=snapshot();s.root.children[0].properties.FontFace={family:'rbxasset://fonts/families/Montserrat.json',weight:'Bold',style:'Normal'};assert.equal(body(converted(s,viewport,{},['Montserrat']).tree)[0].font,'Montserrat');});
test('grid preserves scale and pixel offsets instead of dropping them',()=>{const s=snapshot();s.root.children[1].children.push(node('grid','UIGridLayout',{CellSize:u2(.1,30,.2,40),CellPadding:u2(0,8,0,12)}));const g=body(converted(s).tree)[1].grid;assert.deepEqual(g.cellSize,[.1,30,.2,40]);assert.deepEqual(g.cellPadding,[0,8,0,12]);});
test('unsupported root ViewportFrame is reported',()=>{const s=snapshot();s.root.children.push(node('3d','ViewportFrame'));assert(converted(s).warnings.some(w=>w.nodeId==='3d'));});
test('scripts are not converted to renderable nodes',()=>{const s=snapshot();s.root.children.push(node('script','LocalScript'));assert.equal(body(converted(s).tree).length,2);});
test('ScreenGui insets are explicit in layout and diagnostics',()=>{const s=snapshot();s.root.properties.IgnoreGuiInset=false;const r=converted(s,{...viewport,insets:{left:0,right:0,top:36,bottom:0}});assert.deepEqual(r.tree.children[0].position,[0,0,0,36]);assert(r.warnings.some(w=>w.code==='SCREEN_INSETS_SIMULATED'));});
for (const view of [{width:0,height:720},{width:2560,height:2560},{width:640.5,height:480},{width:640,height:480,insets:{top:400,bottom:400}}]) {
  test(`rejects invalid viewport ${JSON.stringify(view)}`,()=>assert.throws(()=>validateViewport(view)));
}
function cacheInput() {return {userId:'u1',projectId:'p1',designId:'d1',sourceRevision:'r1',tree:{a:1},viewport,assets:[],rendererRevision:'renderer1',fontRevision:'font1'};}
for (const key of ['userId','projectId','designId','sourceRevision','rendererRevision','fontRevision']) test(`cache separates ${key}`,()=>{const a=cacheInput(),b={...a,[key]:'different'};assert.notEqual(renderCacheKey(a),renderCacheKey(b));});
test('cache separates UI state and image content',()=>{const a=cacheInput();assert.notEqual(renderCacheKey(a),renderCacheKey({...a,tree:{a:2}}));assert.notEqual(renderCacheKey(a),renderCacheKey({...a,assets:[{key:'img',sha256:'new'}]}));});
test('automatic model cannot silently become GPT mini',()=>assert.throws(()=>assertUiModelSelection({requestedModel:'auto',resolvedModel:'openai/gpt-5-mini'}),/disallowed/));
test('explicit paid selection is not silently replaced by UI policy',()=>assert.equal(assertUiModelSelection({requestedModel:'openai/gpt-5-mini',resolvedModel:'openai/gpt-5-mini'}),'openai/gpt-5-mini'));
test('concrete non-mini model passes UI policy',()=>assert.equal(assertUiModelSelection({resolvedModel:'provider/approved-model'}),'provider/approved-model'));

function runnerFixture() {
  const job={userId:'u1',projectId:'p1',designId:'d1',snapshotId:'s1',sourceRevision:'r1',stateId:'default',viewport,viewportId:'desktop'};
  let renderCount=0, saved=null;
  const deps={loadSnapshot:async()=>snapshot(),loadState:async()=>null,resolveImages:async()=>({bindings:{},assets:[],warnings:[]}),readCache:async()=>null,isCurrent:async()=>true,
    renderer:{describe:async()=>({rendererRevision:'renderer1',fontRevision:'font1',fontFamilies:[]}),render:async()=>{renderCount++;return {png:Buffer.from('test'),imageHash:'test',warnings:[]};}},
    storeResult:async({result})=>{saved=result;return result;}};
  return {job,deps,get saved(){return saved},get renderCount(){return renderCount}};
}
test('worker produces preview without claiming runtime verification',async()=>{const f=runnerFixture();const r=await createUiPreviewJobRunner(f.deps)(f.job);assert.equal(r.runtimeVerified,false);assert.equal(r.simulated,false);assert.equal(r.viewportId,'desktop');assert.equal(f.renderCount,1);});
test('worker rejects cross-project capture',async()=>{const f=runnerFixture();f.job.projectId='other';await assert.rejects(()=>createUiPreviewJobRunner(f.deps)(f.job),/projectId/);assert.equal(f.renderCount,0);});
test('worker rejects unknown state instead of rendering default',async()=>{const f=runnerFixture();f.job.stateId='missing';await assert.rejects(()=>createUiPreviewJobRunner(f.deps)(f.job),/unavailable/);});
test('worker reports simulated popup without Studio writes',async()=>{const f=runnerFixture();f.job.stateId='shop-open';f.deps.loadState=async()=>variant(snapshot());const r=await createUiPreviewJobRunner(f.deps)(f.job);assert.equal(r.simulated,true);assert.equal(r.stateId,'shop-open');});
test('worker drops stale result after render',async()=>{const f=runnerFixture();let checks=0;f.deps.isCurrent=async()=>++checks<3;await assert.rejects(()=>createUiPreviewJobRunner(f.deps)(f.job),/superseded/);assert.equal(f.saved,null);});
test('worker respects cancellation before fetching capture',async()=>{const f=runnerFixture();const c=new AbortController();c.abort(new Error('stop'));await assert.rejects(()=>createUiPreviewJobRunner(f.deps)(f.job,{signal:c.signal}),/stop/);assert.equal(f.renderCount,0);});
test('worker uses cached image without new render',async()=>{const f=runnerFixture();f.deps.readCache=async()=>({png:Buffer.from('cached'),imageHash:'cached'});const r=await createUiPreviewJobRunner(f.deps)(f.job);assert.equal(f.renderCount,0);assert.equal(r.imageHash,'cached');});
test('worker preserves capture limitations',async()=>{const f=runnerFixture();f.deps.loadSnapshot=async()=>({...snapshot(),warnings:[{code:'CLASS_NOT_CAPTURED',message:'unsupported',nodeId:'x'}]});const r=await createUiPreviewJobRunner(f.deps)(f.job);assert(r.warnings.some(w=>w.code==='CLASS_NOT_CAPTURED'));});
test('worker refuses missing production dependencies',()=>assert.throws(()=>createUiPreviewJobRunner({}),/required/));
test('renderer client refuses mismatched renderer build',async()=>{const client=new PinevexRenderClient({baseUrl:'https://private-renderer.example',apiKey:'secret',fetchImpl:async()=>new Response(JSON.stringify({rendererRevision:'other'}))});await assert.rejects(()=>client.describe(),/version differs/);});
test('renderer client sends private auth and refuses redirects',async()=>{let call;const client=new PinevexRenderClient({baseUrl:'https://private-renderer.example',apiKey:'secret',fetchImpl:async(url,init)=>{call={url,init};return new Response(JSON.stringify({rendererRevision:PIN}));}});await client.describe();assert.equal(call.init.redirect,'error');assert.equal(call.init.headers.Authorization,'Bearer secret');});
test('renderer client rejects invalid PNG output',async()=>{const client=new PinevexRenderClient({baseUrl:'https://private-renderer.example',apiKey:'secret',fetchImpl:async()=>new Response(JSON.stringify({rendererRevision:PIN,fontRevision:'f',width:1280,height:720,pngBase64:'AAAA'}))});await assert.rejects(()=>client.render({tree:{},viewport,fontRevision:'f'}),/PNG/);});

test('explicit non-mini model cannot be downgraded to mini',()=>assert.throws(()=>assertUiModelSelection({requestedModel:'google/selected-model',resolvedModel:'openai/gpt-5-mini'}),/disallowed/));
const { createUiVisualReviewRunner, normalizeReview } = require('../src/services/runUiVisualReview');
function reviewFixture() {
  const calls=[];
  return {calls, deps:{loadRenders:async({revision})=>[{sourceRevision:revision,previewId:'preview1',imageRef:'private-image',warnings:[]}],
    reviewImages:async()=>({issues:[]}),repairStudio:async input=>{calls.push(input);return {applied:true,sourceRevision:'r2'};},
    recapture:async input=>calls.push(input),hasBudget:async()=>true,isCurrent:async()=>true}};
}
test('visual review never asserts runtime verification',async()=>{const f=reviewFixture();const r=await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'});assert.equal(r.runtimeVerified,false);assert.equal(r.status,'visual_review_passed');});
test('missing images cannot pass visual review',async()=>{const f=reviewFixture();f.deps.loadRenders=async()=>[];assert.equal((await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'})).status,'awaiting_preview');});
test('font substitution does not trigger destructive design repair',async()=>{const f=reviewFixture();f.deps.loadRenders=async()=>[{sourceRevision:'r1',previewId:'p',imageRef:'img',warnings:[{code:'FONT_SUBSTITUTED'}]}];assert.equal((await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'})).status,'renderer_limited');assert.equal(f.calls.length,0);});
test('review rejects fabricated render identity',()=>assert.throws(()=>normalizeReview({issues:[{previewId:'fake',category:'layout',severity:'major',description:'x'}]},[{previewId:'real'}])));
test('review checks budget before calling vision model',async()=>{const f=reviewFixture();let called=false;f.deps.hasBudget=async()=>false;f.deps.reviewImages=async()=>{called=true;};const r=await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'});assert.equal(r.status,'budget_exhausted');assert.equal(called,false);});
test('major issue repairs Studio and then recaptures new revision',async()=>{const f=reviewFixture();let n=0;f.deps.reviewImages=async()=>({issues:n++?[]:[{previewId:'preview1',category:'layout',severity:'major',description:'Title overlaps close button'}]});const r=await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'});assert.equal(r.revision,'r2');assert.equal(f.calls[0].expectedRevision,'r1');assert.equal(f.calls[1].sourceRevision,'r2');});
test('repair loop stops at the configured budget',async()=>{const f=reviewFixture();f.deps.reviewImages=async()=>({issues:[{previewId:'preview1',category:'density',severity:'major',description:'Too dense'}]});const r=await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1',maxRepairs:0});assert.equal(r.status,'needs_review');assert.equal(f.calls.length,0);});
test('stale build does not call vision or repair',async()=>{const f=reviewFixture();f.deps.isCurrent=async()=>false;assert.equal((await createUiVisualReviewRunner(f.deps)({runId:'run1',revision:'r1'})).status,'superseded');});
```


## File 20: `renderer/tests/test_render_core.py`

```python
import base64
import copy
import hashlib
import io
import sys
import unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from render_core import validate_request, render_payload, PIN
from patch_grid import patch_source


def payload():
    return {"tree": {"type": "Frame", "name": "FullViewport", "size": [1,0,1,0], "position": [0,0,0,0],
                     "anchor": [0,0], "bgTransparency": 1,
                     "children": [{"type":"Frame", "name":"Popup", "position":[0,17,0,29], "size":[0,100,0,80], "visible":False}]},
            "viewport":{"width":320,"height":240}, "fontRevision":"test-fonts", "assets":[]}


class RendererContractTests(unittest.TestCase):
    def test_full_viewport_is_not_recentred_or_cropped(self):
        request = payload(); captured = {}
        def fake(tree, **kwargs):
            captured.update({"tree":copy.deepcopy(tree), **kwargs})
            return Image.new('RGBA', (kwargs['width'], kwargs['height']))
        result = render_payload(request, render_fn=fake, fonts_dir=Path('/test-fonts'),
                                descriptor={"rendererRevision":PIN,"fontRevision":"test-fonts"})
        self.assertEqual(captured['tree'], request['tree'])
        self.assertEqual(captured['tree']['children'][0]['position'], [0,17,0,29])
        self.assertIsNone(captured['output_path'])
        self.assertEqual(captured['default_size_ref'], 'parent')
        self.assertEqual((result['width'],result['height']), (320,240))
        with Image.open(io.BytesIO(base64.b64decode(result['pngBase64']))) as image:
            self.assertEqual(image.size, (320,240))
    def test_rejects_recrop_flag(self):
        data=payload(); data['tree']['_crop']=True
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_source_fields(self):
        data=payload(); data['tree']['source']='print(1)'
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_http_asset(self):
        data=payload(); data['tree']['icon']='http://internal/'
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_filesystem_asset(self):
        data=payload(); data['tree']['icon']='../../secret'
        with self.assertRaises(ValueError): validate_request(data)
    def test_requires_image_materialization(self):
        data=payload(); data['tree']['icon']='img_'+'a'*64
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_invalid_viewport(self):
        data=payload(); data['viewport']['width']=True
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_pixel_budget(self):
        data=payload(); data['viewport']={'width':2560,'height':2560}
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_nan(self):
        data=payload(); data['tree']['rotation']=float('nan')
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_3d(self):
        data=payload(); data['tree']['children'][0]['type']='ViewportFrame'
        with self.assertRaises(ValueError): validate_request(data)
    def test_rejects_font_revision_drift(self):
        with self.assertRaises(ValueError): render_payload(payload(), render_fn=lambda *a,**k:None, descriptor={'fontRevision':'new'})
    def test_rejects_renderer_resizing(self):
        with self.assertRaises(ValueError): render_payload(payload(), render_fn=lambda *a,**k:Image.new('RGBA',(1,1)), descriptor={'fontRevision':'test-fonts'})
    def test_materializes_scoped_image_without_fetching(self):
        image=Image.new('RGBA',(4,4)); buffer=io.BytesIO();image.save(buffer,format='PNG');raw=buffer.getvalue()
        digest=hashlib.sha256(raw).hexdigest();data=payload();key='img_'+digest
        data['tree']['icon']=key;data['assets']=[{'key':key,'sha256':digest,'pngBase64':base64.b64encode(raw).decode()}]
        validate_request(data)
        def fake(tree, **kwargs):
            self.assertTrue((kwargs['icons_dir']/'manifest.json').exists())
            self.assertEqual((kwargs['icons_dir']/'png'/f'{digest}.png').read_bytes(),raw)
            return Image.new('RGBA',(kwargs['width'],kwargs['height']))
        render_payload(data, render_fn=fake, descriptor={'fontRevision':'test-fonts'})
    def test_rejects_image_digest_mismatch(self):
        data=payload();data['assets']=[{'key':'img_'+'a'*64,'sha256':'a'*64,'pngBase64':base64.b64encode(b'bad').decode()}]
        with self.assertRaises(ValueError):validate_request(data)


class GridPatchTests(unittest.TestCase):
    def source(self):
        text='''def _num(v, default=0): return float(v)
def _seq_num(v, i, default=0): return float(v[i]) if i < len(v) else default
'''
        for name in ['measure','paint','collect']:
            text+=f'''def {name}(cell_size, cell_padding, size_ref):
    cell_w = _seq_num(cell_size, 0, 0.1) * size_ref.w
    cell_h = _seq_num(cell_size, 1, 0.1) * size_ref.h
    pad_x = _seq_num(cell_padding, 0, 0.0) * size_ref.w
    pad_y = _seq_num(cell_padding, 1, 0.0) * size_ref.h
    return cell_w, cell_h, pad_x, pad_y
'''
        return text
    def test_replaces_every_measure_paint_collect_path(self):
        scope={};exec(patch_source(self.source()),scope)
        rect=type('Rect',(),{'w':1000,'h':500})()
        for name in ['measure','paint','collect']:
            self.assertEqual(scope[name]([.1,20,.2,30],[0,8,0,12],rect),(120,130,8,12))
    def test_preserves_two_term_scale_layout(self):
        scope={};exec(patch_source(self.source()),scope)
        rect=type('Rect',(),{'w':1000,'h':500})()
        self.assertEqual(scope['paint']([.1,.2],[.01,.02],rect),(100,100,10,10))
    def test_refuses_unknown_grid_source(self):
        with self.assertRaises(ValueError):patch_source('changed_upstream=True')
    def test_refuses_partial_grid_replacement(self):
        with self.assertRaises(ValueError):patch_source(self.source().replace('_seq_num(cell_padding, 1, 0.0) * size_ref.h','0',1))

if __name__=='__main__': unittest.main(verbosity=2)
```


# AUTHORING CHECKS (NOT PRODUCT ACCEPTANCE)

# Verification of the supplied implementation material

This is a coding-agent implementation package, not a deployed NexusRBX release.

- Node: **72 tests passed, zero failed.** Executed with `node --test backend/tests/uiPreview.test.cjs`.
- Python: **18 tests passed, zero failed.** Executed with `python -m unittest discover -s renderer/tests -v`.
- JavaScript/JSX: **11 files parsed with zero syntax diagnostics**, using the installed TypeScript parser. This is not a React production build or semantic typecheck.
- Python source compiled with `py_compile`.

The tests cover the newly supplied modules. Persistence, gateway/model calls and actual Studio actions are mocked/injected in those tests. Python render-wrapper tests use an injected drawing function; they do not establish Pinevex visual accuracy.

Not run here: the real Pinevex/Skia runtime, Docker image build, the real renderer smoke script, existing Nexus repository suites, authenticated API integration, a React browser session, Luau compilation or execution, or a Roblox Studio playtest. A direct public-repository clone in this environment failed DNS resolution; the code audit used the connected GitHub reads instead. The handoff requires the implementation agent to run those tests in its usable environment and report the results separately.

No repository commits, pushes, production configuration changes, provider charges or deployments were performed.

The renderer Dockerfile pins upstream source, but its bootstrap dependency ranges still require a generated dependency lock and pinned base-image digest before production. The adapter labels output approximate and includes compatibility warnings; no measured pixel-parity claim is made.

Log files: `node-tests.txt`, `python-tests.txt`, `syntax-checks.json`.
