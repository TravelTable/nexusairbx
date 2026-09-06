# Request-driven game creation

Game intelligence v2 connects the existing planner, generation worker, Studio agent, canonical asset tools, and task runtime. Scope comes from the request, independently of whether the place contains scripts. A door request is a focused change; a fishing, racing, horror, social, or other full-game request carries a complete project brief. Existing-place requests still retain manifest inspection, scoped writes, source hashes, and preservation rules.

## Contracts and storage

- `gameIntelligence.projectBrief` contains the request scope, base project revision, art direction, requested and inferred decisions, preservation rules, and dependency-linked deliverables. Model output can refine descriptions and references; it cannot mark work verified or enable unrequested monetization.
- Project briefs live on the existing project document. `game_brief_revisions` stores immutable task/result revisions. Acceptance uses a revision comparison; retries reuse the original revision. Late results cannot overwrite a subsequent request. Focused changes retain the project's previous deliverables, decisions, and monetization direction.
- Structured plan steps can carry `deliverableIds`; normalization binds those steps back to each deliverable. Existing v1 game-intelligence payloads remain unchanged when historical plans are hydrated.
- Assets, Roblox IDs, operation results, and verification evidence remain in their canonical stores. Task steps retain all linked operation IDs, including separate generation and publication operations. Task reads and events expose a derived `gameOverview` and brief reference.
- The artifact generator can return a bounded `<game_brief>` JSON block. Studio decisions can return `projectBrief`. Both are normalized against the accepted scope and retained with their originating output.

## Execution

Full-game Agent requests prepare an experience icon, three landscape thumbnail drafts, and primary-action UI artwork in separate durable batches. UI publication uses the existing authorization and moderation gates; successful generation remains reusable if publication waits. Approved plans execute only their declared asset capabilities. Explicit artwork exclusions and focused requests do not acquire this launch package.

The generation contract connects actual gameplay, onboarding, progression, configurable content, saving, UI, feedback, device support, assets, launch copy, and relevant Roblox gameplay analytics. Additional gameplay-specific assets are planned through the existing asset and Studio capabilities. World content uses authorized library assets or native Studio construction; unavailable audio or 3D generation providers are reported explicitly.

Asset calls use stable per-call idempotency keys and the existing semantic operation ledger. Execution processes dependency-linked batches of at most six calls each, up to forty batches per request. Independent batches can proceed when another artwork branch is waiting. Unknown external outcomes require reconciliation before a write can be retried.

Plan stays read-only until approval. Ask, Debug, existing editing, approval, and execution endpoints remain in place. The compact Game Overview appears in workspace details for complete-game work. It links canonical assets and provides refinement prompts using the existing chat composer.

## Creator-directed monetization

Unspecified monetization creates no paid catalog entries. Explicit pass/product requests retain the creator's exact price and use the authorized bound universe when available. Missing names/prices remain specific setup items. Requests that include gameplay benefits continue into generation after catalog operations, carrying the exact returned pass/product IDs. Existing handlers and product mappings must be extended.

`backend/src/templates/game/Commerce.lua` is a generation reference, adapted to the game's existing profile owner and purchase handler. Its injected profile transaction commits the benefit and receipt ID together; retries synchronize committed state without granting twice. Pass benefits are derived from ownership on join and successful purchase prompts. Cancellation does not grant a benefit. The model is instructed to obtain current Roblox prices for the shop.

`GameplayAnalytics.lua` is a server reference with allowlisted event names and an injected Studio test adapter. It never reports Studio simulation as live delivery. Keep Roblox gameplay telemetry separate from Nexus product analytics. Metric reporting uses Creator Hub; this release does not invent a Creator Hub analytics import.

## Launch handoff and evidence

Download generated artwork through its canonical asset detail page. Experience artwork is a draft until reviewed and applied to the intended experience in Creator Hub. No unsupported experience-icon or thumbnail application API is assumed. Generation supplies the description, controls, and setup instructions with the game output.

Overview status comes from linked steps, operations, and verification. An overall successful run alone does not verify individual deliverables. Artwork can be `draft_ready`; Roblox setup or moderation can remain `needs_attention`. Published analytics delivery remains an outstanding action even after Studio adapter checks pass.

## Validation record

Automated checks cover request scope across genres, empty-place focused edits, creator-directed monetization, brief revision conflicts and retry preservation, legacy plan hydration, deliverable binding, multiple asset batches, failure isolation, canonical IDs, asset export dimensions, task/Studio runtime behavior, and UI status/refinement rendering. The Commerce and Analytics fixtures execute in the official Luau interpreter; they use injected service doubles and do not charge Robux or submit live events.

Run the relevant backend service tests and `backend/src/lib/studioToolProtocol.test.js`, syntax-check changed backend files, run the frontend tests, and run `npm run build`. Set `LUAU_BIN` to an official Luau interpreter to include `GameProductionReferenceService.test.js`'s executable fixtures.

Live verification is still required before claiming a complete tested release:

1. Connect a test place and perform the applicable checks in [Studio protocol verification](studio-tool-protocol.md), including manifest-first reads, source conflicts, rollback, exact asset placement, and reconnect behavior.
2. Generate complete games in several genres; play the core loops on desktop and mobile controls. Rejoin and confirm saves; request an unrelated small edit and compare preserved scripts, asset references, and product mappings.
3. Interrupt artwork processing and resume. Confirm successful assets/products are reused, pending moderation remains visible, and only the intended image properties change after publication.
4. In a test experience, verify an explicitly requested pass and developer product against the existing shop/profile owner. Exercise cancellation, rejoin, disconnected players, transaction retries, and receipt replay. Confirm the displayed price comes from Roblox.
5. Exercise Analytics through the Studio adapter, then confirm actual events from a published test experience in Creator Hub. [Roblox custom-event documentation](https://create.roblox.com/docs/production/analytics/custom-events) describes the published-game requirement.

During this implementation the live Studio edit tool returned `Studio not connected`. Consequently no live-place mutation, end-to-end generated-game playtest, real purchase, or published analytics delivery is recorded as verified.
