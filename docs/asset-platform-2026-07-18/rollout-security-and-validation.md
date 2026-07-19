# Rollout, security, and validation

## Release principle

Roll out additively. Preserve old records and references, put all new writes behind server-side flags, prove parity and idempotency, and keep a read fallback until production evidence is sufficient. Do not enable Roblox writes merely because local mocks pass.

## Additive migration plan

### Phase 0: freeze contracts and inventory

- Adopt the durable IDs, lifecycle axes, error envelope, and evidence labels in this package.
- Inventory the UI-project screen assets, ontology/catalog records, project/chat attachments, generated assets, Roblox relationships, icon history, and usage references.
- Record counts by owner/project/universe/store and identify missing owner IDs.
- Mark unknown moderation, style, pack, creator, universe, and usage explicitly.
- Add dashboards for legacy and canonical write/read volume.

Exit: inventory is reproducible and no source store is silently omitted.

### Phase 1: mount read-only canonical orchestration

- Mount an authenticated /api/asset-platform router over the canonical services. Implemented behind ASSET_PLATFORM_READS_ENABLED.
- Authorize every lookup from server session/user context. Implemented with verified-token/verified-email middleware and owner-scoped services.
- Add private preview delivery. Implemented as an authenticated file-role endpoint; frontend preview URL wiring remains incomplete.
- Backfill deterministic canonical records with source aliases and content hashes.
- Dual-read and compare projections without changing the current UI source.
- Keep universe sharing and owner-global opt-in disabled until authorization tests pass.

Exit: parity tests pass for IDs, hashes, URLs, ownership, lifecycle unknowns, and visibility.

### Phase 2: canonical local generation

- Route new single/pack/extend/similar/repair generation through the operation ledger.
- Add immutable style/version persistence, candidate selection, and complete quality tri-state handling.
- Store private master/export/preview records.
- Integrate billing/entitlement idempotently.
- Keep Roblox auto-upload off.

Exit: loss/timeout/replay tests prove no duplicate provider generations or charges, and partial packs resume safely.

### Phase 3: discovery and agent tools

- Wire search and resolve-or-create into typed agent tools and the context provider.
- Correct rejected/pending eligibility.
- Add true semantic retrieval only after authorization-first indexing exists.
- Enable project scope first; then verified same-universe; then explicit owner-global.

Exit: cross-tenant and scope-escalation tests pass, ranking is explainable, and no chat grants scope.

### Phase 4: Roblox asset upload

- Honor the existing master consent switch server-side.
- Verify creator destination and selected OAuth state at dispatch.
- Reserve operations before writes and reconcile unknown outcomes.
- Keep local assets on failure and implement moderation polling.
- Enable for internal staging users, then a small cohort.

Exit: controlled live staging proves upload ID/readback, moderation distinctions, no duplicate creates, and correct user ownership.

### Phase 5: badges, game passes, and artwork

- Re-verify official endpoints/scopes/costs and record external verification dates.
- Implement missing executor methods only for officially supported operations.
- Add badge spend confirmation and exact/bounded game-pass price policy.
- Keep each operation under its own default-off flag.
- Test resource and artwork moderation separately.

Exit: controlled live staging succeeds with authorized test universes and explicit spend; unsupported operations still fail closed.

### Phase 6: Studio application and replacement

- Add versioned Studio commands for exact reference targets.
- Enforce expected hashes and destructive snapshots.
- Store signed/session-bound readback receipts.
- Complete replacement only after every intended reference verifies.

Exit: manual and automated bridge tests prove that disconnects, stale hashes, wrong places, and lost acknowledgments never produce false success.

### Phase 7: cutover and cleanup

- Switch frontend and agent reads to canonical records behind a reversible flag.
- Stop legacy writes only after sustained parity.
- Retain alias adapters and rollback.
- Archive rather than delete legacy records; define retention after audit/legal review.

Exit: production telemetry and sampled audits show no missing assets, unauthorized visibility, duplicate writes, or false Studio applications.

## Feature flags

Recommended server-owned flags:

| Flag | Initial state | Controls |
| --- | --- | --- |
| ASSET_PLATFORM_READS_ENABLED | off | Mounted canonical read/context endpoints |
| ASSET_PLATFORM_WRITES_ENABLED | off | Canonical local generation and registry writes |
| ASSET_PLATFORM_AGENT_TOOLS_ENABLED | off | Typed search/resolve/generate agent tools |
| ASSET_PLATFORM_SEMANTIC_SEARCH_ENABLED | off | Vector indexing/query after authorization tests |
| ASSET_PLATFORM_UNIVERSE_SHARING_ENABLED | off | Explicit verified same-universe reuse |
| ASSET_PLATFORM_USER_GLOBAL_ENABLED | off | Explicit owner-global reuse |
| ASSET_PLATFORM_ROBLOX_UPLOAD_ENABLED | off | Product availability; still requires user consent |
| ROBLOX_BADGE_CAPABILITIES_ENABLED | off | Badge resource operations |
| ROBLOX_GAME_PASS_CAPABILITIES_ENABLED | off | Game-pass resource operations |
| ROBLOX_EXPERIENCE_ARTWORK_CAPABILITIES_ENABLED | off | Experience artwork operations |
| ASSET_PLATFORM_STUDIO_APPLY_ENABLED | off | Canonical Studio application/replacement |

Flags do not bypass authorization, consent, missing executors, capability checks, quality, or idempotency.

## Rollback

Rollback actions must be non-destructive:

- turn off the relevant server-side flag;
- stop new dispatch while allowing in-flight operations to reconcile;
- restore legacy reads through the compatibility adapter;
- preserve canonical operations, provider IDs, remote IDs, moderation results, and receipts;
- keep local generated files available;
- do not delete Roblox objects or reverse Studio changes automatically;
- if Studio rollback is requested, use recorded snapshots and the same readback-verification flow;
- continue reconciliation workers for outcome_unknown operations even while new writes are disabled.

Rollback success is measured by safe behavior, not by pretending external side effects did not happen.

## Security requirements

### Authorization and isolation

- Derive uid from the verified server session/token.
- Re-authorize project, universe, place, asset, pack, style, and relationship access per request.
- Scope Firestore queries and Storage paths by owner; enforce rules independently of application filters.
- Prevent IDOR by testing guessed IDs across all endpoints and preview delivery.
- Treat browser creator/universe/group metadata as intent only.
- Do not infer access from a chat, remote Roblox ID, public URL, or asset name.

### OAuth and credentials

- Keep Roblox and provider tokens server-side and encrypted.
- Validate OAuth state and PKCE; add nonce validation where applicable.
- Support encryption-key versioning/rotation.
- Use distributed refresh fencing rather than process-local locks.
- Request the minimum current scopes; future/default-off capabilities do not expand normal authorization.
- Redact Authorization headers, access/refresh tokens, signed URLs, provider payloads, and spend confirmations from logs.

### Content and privacy

- Keep masters private and serve previews through short-lived authorized access.
- Validate media signatures, decode limits, dimensions, decompression cost, and filenames.
- Scan or reject unsupported formats before provider/Roblox dispatch.
- Sanitize prompts/metadata before embeddings and observability.
- Define retention for rejected candidates, temporary files, provider payloads, and user deletion.
- Preserve provenance/licensing for reference images and global catalog submissions.

### Billing and spend

- Entitlement and quota checks occur before dispatch.
- Generation charge uses a stable operation/artifact ID and must be idempotent across crashes.
- Do not mark usage consumed until billing outcome is durable; reconcile recording states.
- Record estimated and actual provider cost separately.
- Badge spend requires payer-bound confirmation and a ceiling.
- Game-pass price is not a Nexus charge but remains an exact audited resource property.
- Rate limit by user, project, operation type, provider, and IP risk signal.

## Idempotency and recovery

Test every external create at these interruption points:

1. Before reservation.
2. After reservation, before lease.
3. After lease, before dispatch.
4. After provider receives request, before Nexus receives response.
5. After Nexus receives provider ID, before operation update.
6. After operation update, before registry relationship.
7. After registry update, before billing/usage finalization.
8. During provider readback.
9. During moderation polling.
10. After Studio command acknowledgment, before readback.

The recovered outcome must be replay, in_progress, outcome_unknown, reconciled success, deterministic retryable failure, or terminal failure. It must never be an untracked second create.

The current operation service provides reservation/lease/reconciliation primitives, but the mounted route deliberately exposes no writes and therefore proves no provider-dispatch call site. The usage meter’s recording-to-billing boundary also needs explicit crash/replay validation.

## Observability

Emit structured events with:

- requestId, operationId, assetId/versionId/packId, and user/project IDs in privacy-safe form;
- operation type, status transition, lease fence, attempt/reconcile count;
- provider/model/tier, candidate count, latency, estimated/actual cost;
- quality check outcomes and selection reason;
- storage representation hashes and sizes, never raw URLs/tokens;
- Roblox capability/flag/scope result, destination type, provider operation/external ID;
- moderation transition and source;
- Studio session/place/command/reference/snapshot IDs and verification result;
- billing artifact ID and durable state;
- error code, retryable, requiresReconciliation, and unsupported reason.

Alerts:

- any duplicate external ID for one logical operation or multiple external IDs for one idempotency key;
- outcome_unknown age above policy;
- billing recording state stuck or duplicate charge signal;
- rejection/moderation spikes;
- cross-scope authorization denial spikes;
- preview authorization failures;
- Studio acknowledgment without readback or mismatched readback;
- backfill/dual-read parity drift;
- provider cost or escalation rate beyond budget.

## Validation matrix

| Layer | Required tests | What passing proves | What it does not prove |
| --- | --- | --- | --- |
| Contracts | Validator/state/property tests, canonical hashing, old-schema reads | Deterministic local contract behavior | Mounted API or provider behavior |
| Registry/operations | Firestore emulator transactions, lease/fence, replay, unknown reconciliation, transitions | Persistence concurrency semantics | Production Firestore/rules latency |
| Storage | Storage emulator/rules, hash, private paths, signed preview authorization | Local privacy and integrity controls | CDN/provider production configuration |
| Quality | Fixed image fixtures for alpha, halo, clipping, centering, padding, corruption, text/concept unknown | Deterministic check behavior | Subjective concept/style quality |
| Provider routing | Mock adapters, no fallback, bounded escalation, ambiguous write classification | Local routing policy | Live provider output/cost/idempotency |
| Search | Authorization-first fixtures, ranking, rejected/pending exclusion, cursor/index updates | Scope and deterministic ranking | Semantic quality at production scale |
| Agent/API | Authenticated integration tests for every endpoint/tool and error envelope | Reachable orchestration and typed results | Roblox/Studio live effects |
| Roblox | Mock unit tests then controlled live staging | Client contract, then actual endpoint/scope behavior | Studio application |
| Studio | Protocol tests plus plugin manual/live-place verification | Command support and exact readback | Roblox moderation propagation |
| End-to-end | Local mocked flow, then staging generation/upload/moderation/Studio | Cross-layer behavior for that environment | General production readiness without monitoring/canary |

Mocked end-to-end tests are not a substitute for controlled live staging.

## Repository checks

Run from the repository root with the project’s Node 22 environment:

~~~sh
node --check backend/src/lib/assetPlatform/contracts.js
node --check backend/src/routes/assetPlatform.js
node --check backend/src/services/assetPlatform/AssetOperationService.js
node --check backend/src/services/assetPlatform/AssetQualityService.js
node --check backend/src/services/assetPlatform/AssetRegistryService.js
node --check backend/src/services/assetPlatform/AssetSearchService.js
node --check backend/src/services/assetPlatform/AssetStorageService.js
node --check backend/src/services/assetPlatform/AssetUsageMeter.js
node --check backend/src/services/assetPlatform/ImageProviderRouter.js
node --check backend/src/services/RobloxCapabilityRegistry.js
node --check backend/src/services/RobloxOpenCloudClient.js
node --test backend/scripts/backfillAssetPlatform.test.js backend/src/lib/assetPlatform/contracts.test.js backend/src/lib/robloxUploadIntent.test.js backend/src/routes/assetPlatform.test.js backend/src/services/ProjectAssetService.test.js backend/src/services/AssetAgentToolService.test.js backend/src/services/AssetOntologyService.test.js backend/src/services/AssetOntologyService.listProjectAssets.test.js backend/src/services/RobloxCapabilityRegistry.test.js backend/src/services/RobloxOpenCloudClient.test.js
node --test backend/src/lib/studioToolProtocol.test.js
npm run build
~~~

On 2026-07-18, the changed backend syntax checks passed and the targeted backend command above passed 84 tests. Six focused frontend suites passed 29 tests, the production frontend build completed, and 19 Studio protocol tests passed. These local checks do not establish Prompt 2 end-to-end behavior.

Dedicated tests now cover the default-off route, absence of write routes, response sanitization, scope validation, strict reusable-state contracts, master upload consent, migration behavior, and the frontend fail-closed flags. Emulator, live provider, Roblox, browser, and Studio scenarios remain release gates.

## Firestore/Storage emulator scenarios

- Two callers reserve the same idempotency key with equal input: one dispatch, one replay.
- Same key with unequal input: idempotency_conflict.
- Lease expires after dispatch: outcome_unknown, no retry until reconcile.
- Stale fencing token cannot finalize.
- Partial pack items commit independently and resume only eligible items.
- Version/style records are immutable.
- Visibility cannot broaden without explicit authorization/opt-in.
- Guessed cross-user asset/pack/version/style/preview IDs are denied.
- Rejected and unauthorized assets never enter search candidates.
- Replacement cannot complete with zero references, missing receipts, failed receipts, or wrong place.
- Billing crash boundaries do not double-charge.
- Legacy backfill preserves IDs/URLs and unknown lifecycle values.

## Controlled live staging runbook

This runbook requires user-approved test credentials, a dedicated Roblox test universe/place, explicit cost/spend limits, and enabled flags. Do not run it against production or spend Robux implicitly.

1. Record deployed commit, flags, OAuth application, scopes, provider models, price/cost limits, test user/creator/universe/place, and start time.
2. Generate one transparent icon. Verify immutable style/version, provider/model/cost, deterministic report, private master/export/preview, and no Roblox write when consent is off.
3. Enable consent for the test user. Upload once; verify authenticated-user destination, durable operation/provider ID, exactly one remote object, readback, and explicit moderation state.
4. Induce a client timeout after provider dispatch. Verify outcome_unknown and reconciliation without a second object.
5. Generate a 10+ item pack with one induced failure. Verify partial usability, resume, extension, and per-item state.
6. Repair one inconsistent item with 2–3 candidates. Verify only that item changes, every score is durable, and no unqualified candidate is auto-approved.
7. Verify project search, explicit same-universe sharing, owner-global opt-in, rejected exclusion, and no cross-user/chat leakage.
8. If official live support is confirmed and explicit spend approval is supplied, create one badge. Verify payer/cost confirmation, one dispatch, ID/readback, artwork/resource moderation, and unknown-outcome handling.
9. If official live support is confirmed, create one game pass at an exact requested test price. Verify requested/effective/readback price and source. Do not test omitted-price behavior until bounded policy exists.
10. Keep update badge/pass/experience artwork actions unavailable unless their executors have been implemented and separately approved.
11. Connect the generated installable Studio plugin to the dedicated test place. Apply one verified URI to one exact target. Confirm queue, ack, readback, and receipt.
12. Replace it with a second asset. Verify snapshot, old relationship preservation, every intended reference readback, and no completion on a deliberately mismatched target.
13. Disable each flag during safe test points. Confirm no new dispatch, local data remains, and in-flight unknown operations still reconcile.
14. Export logs/metrics with secrets redacted and attach evidence to the release record.

## Completion gate

Prompt 2 is not complete until all of the following are evidenced:

- the canonical route and typed agent tools are mounted and authorized;
- legacy backfill/dual-read parity passes and rollback is exercised;
- style, generation, packs, targeted repair, storage, search, and resolve-or-create have dedicated tests;
- provider idempotency/unknown-outcome and billing crash boundaries are proven;
- upload consent and authenticated-user destination are enforced server-side;
- live staging verifies the exact Roblox operations being enabled;
- unsupported resource operations remain typed unavailable;
- moderation pending/rejected/unknown comes from live readback, never inference;
- Studio uses exact rbxassetid URIs and verified readback receipts;
- replacement preserves lineage and verifies every reference;
- security/rules, rate limits, observability, and alerts are deployed;
- canary/rollback behavior is demonstrated.

Until then, describe the work as repository scaffolding, contract implementation, local verification, or controlled staging evidence according to what actually occurred.
