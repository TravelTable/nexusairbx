# NexusRBX Roblox asset pipeline audit

Audit date: 22 July 2026.

This document records the implementation state of the existing NexusRBX asset
and Roblox integration after the asset-pipeline upgrade. It is an implementation
snapshot, not a promise that every operation published in Roblox's API reference
is exposed to the agent. The more detailed provider support matrix is in
[`roblox-capabilities.md`](./roblox-capabilities.md), and deployment, migration,
security, telemetry, and recovery procedures are in
[`operations-security-and-testing.md`](./operations-security-and-testing.md).
The implementation inventory is in [`changed-files.md`](./changed-files.md).

## Architecture summary

The upgrade extends the existing React, Express, Firebase, task-runtime, and
Studio bridge boundaries:

1. The browser requests connection, capability, creator, resource, project, and
   asset metadata from authenticated Express routes.
2. `RobloxOAuthService` and `RobloxTokenStore` own OAuth authorization, OIDC
   identity verification, encrypted token storage, refresh serialization, and
   revocation. OAuth credentials do not enter asset records or model context.
3. `RobloxCreatorResolver` checks every requested creator and universe against
   the resources granted by Roblox. Browser-supplied identifiers are never
   authoritative.
4. `AssetRegistryService` owns canonical version 3 asset, pack, style, project,
   universe, relationship, and use metadata. Existing legacy records are
   retained and can be migrated additively.
5. Generation, validation, publishing policy, operation-ledger, Open Cloud, and
   Studio services operate on canonical IDs. A final Roblox asset ID is accepted
   only from Roblox operation completion or verified provider readback.
6. The authenticated `POST /asset-platform/tools/:toolName` route executes the
   narrow canonical tools through `CanonicalAssetToolExecutor`.
   `TaskIntakeService.executeAssetTool` and `TaskAssetToolDispatchService` are
   the task-scoped execution boundary. `NaturalLanguageAssetToolAdapter`
   conservatively compiles high-confidence asset requests into at most six
   frozen typed calls; `ChatAgentService` executes those calls through the same
   boundary. Owner, project, task, Studio, consent, and idempotency authority
   always comes from immutable server records, not the prompt.
7. Plan and Ask Mode load owner-authorized canonical records through
   `WorkflowAssetContextService`. Retrieval is project-aware, may include
   explicitly permitted related-project results, and keeps a soft target of
   eight immediately relevant assets. Ask answers ownership, ID, processing,
   and Studio-usage questions only from those records.
8. The Studio bridge inspects a target, writes only the intended supported
   property with a canonical `rbxassetid://<id>` value, and records a readback
   receipt.

The user-visible lifecycle is:

```text
Generate -> Review when required -> Publish -> Roblox processing -> Ready -> Implement -> Verify
```

After Roblox accepts an upload, the publisher's first persistence attempt stores
the provider operation receipt in the durable side-effect ledger before it
updates the canonical asset. On the sole
`RUN_JOB_WORKER=true` instance, `AssetPublishingReconciliationWorker` can resume
bounded status polling for canonical pending assets after a restart when its
separate feature flag is enabled. A successful HTTP upload submission is not
the same as a completed asset. There is an irreducible crash window if the
process ends after provider acceptance but before that first ledger commit. A
ledger-only receipt can be recovered when the same idempotent request is
retried, but the reconciliation worker does not proactively scan ledger-only
receipts.

## Ownership map

| Concern | Owner |
| --- | --- |
| Roblox authorization, callback, refresh, revoke | `backend/src/services/RobloxOAuthService.js` and `RobloxTokenStore.js` |
| OIDC signature, issuer, audience, nonce, and stable subject checks | `backend/src/services/RobloxOidcVerifier.js` |
| Capability-to-scope mapping and feature gates | `backend/src/services/RobloxCapabilityRegistry.js` |
| Creator and universe authorization | `backend/src/services/RobloxCreatorResolver.js` |
| Open Cloud HTTP requests and operation reads | `backend/src/services/RobloxOpenCloudClient.js` |
| Beta game-pass and developer-product isolation | `backend/src/services/assetPlatform/RobloxMonetizationAdapter.js` |
| Canonical asset records and project/universe relationships | `backend/src/services/assetPlatform/AssetRegistryService.js` |
| Asset deduplication and retrieval | `backend/src/services/assetPlatform/AssetSearchService.js` |
| Validation and publishing decisions | `backend/src/services/assetPlatform/AssetValidationService.js` and `AssetPublishingPolicyService.js` |
| Durable asset side-effect ledger | `backend/src/services/assetPlatform/AssetOperationService.js` |
| Restart-time upload status reconciliation | `backend/src/services/assetPlatform/AssetPublishingReconciliationService.js` and `backend/src/workers/assetPublishingReconciliationWorker.js` |
| Executable authenticated tool boundary | `backend/src/routes/assetPlatform.js` exposes `POST /asset-platform/tools/:toolName`; `backend/src/services/assetPlatform/CanonicalAssetToolExecutor.js` executes the canonical catalog |
| Task-runtime asset dispatch | `backend/src/services/assetPlatform/TaskAssetToolAdapter.js` defines the narrow catalog; `backend/src/services/taskRuntime/NaturalLanguageAssetToolAdapter.js` compiles bounded high-confidence requests; `TaskIntakeService.executeAssetTool`, `TaskAssetToolDispatchService`, and `ChatAgentService` enforce immutable task authority, execute frozen calls, and fence write replay; `backend/src/services/TaskAssetToolAdapter.js` is a compatibility re-export |
| Plan and Ask canonical retrieval | `backend/src/services/WorkflowAssetContextService.js`, `backend/src/routes/workflow.js`, `backend/src/routes/workflowConversational.js`, and `backend/src/lib/conversationalChat.js` retrieve and expose bounded safe canonical context |
| Legacy upload canonical projection | `backend/src/services/assetPlatform/CanonicalUserUploadService.js` projects successful project decal uploads into the version 3 registry; `RobloxDecalUploadService.js` retains its compatibility attachment view and surfaces reconciliation failures |
| Canonical tool execution | `backend/src/services/assetPlatform/CanonicalAssetToolExecutor.js` |
| Studio reference validation, mutation, and readback | `backend/src/services/StudioAssetReferenceService.js`, Studio bridge services, and the versioned Studio protocol |
| Safe asset telemetry vocabulary | `backend/src/lib/assetPlatformObservability.js` |
| Authenticated asset library and narrow tool API | `backend/src/routes/assetPlatform.js` |
| Connected-account and Roblox API | `backend/src/routes/roblox.js` |

## Audit findings

### Working and reused

- The Roblox connection uses the authorization-code flow with PKCE, single-use
  state, nonce validation, OIDC discovery/JWKS verification, and the stable
  numeric Roblox subject as the account identity.
- Access and refresh tokens remain server-side. Token envelopes use AES-256-GCM
  with key IDs and user/token-kind authenticated context. Refresh uses a
  Firestore lease, version, and fence to stop concurrent consumers from using a
  rotating refresh token twice.
- The connection status exposes safe profile, granted-scope, creator, resource,
  token-health, and last-operation metadata. Revoke removes local credentials
  without deleting projects or canonical assets.
- Creator resolution follows explicit request, saved project creator, only
  authorized creator, then an ambiguity error. User, group, and universe IDs are
  checked again on the server before every external write.
- Canonical version 3 records cover individual artwork, packs, Roblox objects,
  files, dimensions, transparency, creator and universe ownership, lifecycle,
  moderation, generation provenance, prompts, relationships, usage, failures,
  conversation context, and Studio locations.
- Project, universe-shared, and user-global retrieval boundaries are represented
  by canonical records. Exact ID search, recent-use ranking, and pack/variation
  relationships do not require previous conversation text.
- Publishing policy supports `review_every_asset`, `auto_explicit_request`,
  `always_project_creator`, and `generate_only`. The default is
  `auto_explicit_request`; ambiguity, spend, monetized-item changes, uncertain
  output, or an unexpected provider condition still requires review.
- Asset validation uses typed allow-lists, MIME and file checks, bounded sizes
  and dimensions, filename sanitation, image decoding, transparency/background
  rules where applicable, and duplicate detection. Product limits can be
  intentionally tighter than Roblox's maximums.
- Icon packs have a shared style specification, palette, member relationships,
  consistent export metadata, and independent member records, allowing one icon
  to be repaired or extended without replacing the pack.
- Roblox asset creation attempts to store the returned operation receipt in the
  operation ledger immediately after provider acceptance, before updating the
  canonical asset, and records a final ID only after provider completion or
  verified readback. A ledger-only receipt is recovered by retrying the same
  idempotent request. Provider acceptance followed by a crash before the first
  ledger commit remains irreducible, and the restart worker does not discover a
  ledger-only receipt without that retry.
- Studio asset implementation supports property-specific references and
  readback verification without replacing unrelated instance properties.
- The task runtime recognizes bounded asset-only requests for generation,
  packs, variations, reuse/search, publishing, Studio implementation, game
  passes, and developer products. It stores redacted execution receipts and a
  visible waiting state instead of inventing missing asset, universe, price, or
  Studio target identifiers.
- Plan and Ask Mode use canonical project asset context rather than conversation
  guesses. Retrieval is owner-scoped, bounded, and strips credential-shaped
  fields before model context is constructed.
- The asset library, asset detail page, icon generator, settings, and active
  asset context expose the shared lifecycle, project association, publishing
  policy, retry, selection, and Studio actions without creating a second asset
  store.
- All new server writes are independently gated. The existing task runtime and
  Firebase authentication system remain in place.

### Implemented with guarded rollout boundaries

- `/api/asset-platform` exposes authenticated canonical reads, and
  `POST /asset-platform/tools/:toolName` is the executable canonical tool route.
  Server-bound user, project, universe, creator, and idempotency authority is
  revalidated at the route; a visible frontend control is not authorization to
  write.
- The canonical task adapter exposes 17 narrow tools: capability inspection,
  authorized-creator listing, asset search/detail, single/pack/variation
  generation, validation, publish/status, project attachment, Studio
  implement/verify, and game-pass/developer-product create/update. It never
  exposes OAuth credentials. The older import path is a compatibility re-export
  of that same adapter and is not a second implementation or write owner.
- The singleton `asset-platform-canonical-v1` executor is wired into both the
  authenticated asset tool route and the existing task runtime.
  `NaturalLanguageAssetToolAdapter` compiles only high-confidence request shapes
  into a maximum of six typed calls. It requires canonical NexusRBX asset IDs,
  quoted Studio instance paths, and explicit universe/name/Robux fields for
  monetization; bare numbers and values such as “1,000 coins” are not treated as
  Roblox IDs or prices. `TaskAssetToolDispatchService` freezes the accepted
  capability, rejects caller-injected authority or credentials, applies runtime
  read/write policy, and fences writes behind the durable operation ledger.
  Open-ended or underspecified requests remain normal AI tasks or visible
  clarification states. This is bounded deterministic dispatch, not unrestricted
  model access to Roblox. All paths remain deny-by-default until the relevant
  read, write, agent-tool, Roblox-upload, Studio-apply, and optional provider
  capability gates are enabled.
- Plan and Ask Mode call `WorkflowAssetContextService` before preparing a plan
  or asset answer. The service reauthorizes the project owner, searches the
  canonical registry with project/universe/conversation context, returns at
  most the bounded relevant set, and records omissions when reads are disabled.
  Ask is instructed to report that no canonical record is available rather than
  infer ownership, IDs, processing state, or Studio usage from chat history.
- The shared client can read an accepted Roblox operation and the operation
  ledger preserves its receipt. The landed restart reconciler selects only
  `submitted`, `roblox_processing`, and `under_moderation` canonical records,
  polls the known operation through `getUploadStatus`, and never submits a new
  provider create. It remains staged until the `assetRegistry(uploadStatus,
  updatedAt)` collection-group index is ready and
  `RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER=true` is set on the sole job-worker
  instance.
- Semantic retrieval, universe sharing, user-global reuse, Roblox publishing,
  and Studio apply each have separate feature flags. This permits a safe staged
  rollout but means enabling asset-library reads alone does not enable autonomy.
- Visual pack consistency is represented by quality metadata and repairable
  members. Provider-dependent image comparison or selective regeneration still
  depends on the configured generation executor and image provider.
- Roblox moderation and thumbnail delivery are asynchronous. NexusRBX can keep
  a durable waiting state but cannot force or predict moderation completion.
- The game-pass and developer-product adapter implements the official OAuth beta
  list/get/create/update calls with universe authorization and write readback.
  Canonical create/update tools are wired through that adapter. List/get remain
  provider-adapter operations rather than separate canonical tools.
- Badge creation remains a legacy compatibility capability behind payer-bound
  approval and is not advertised by the 17 canonical tools. Badge update and
  experience-artwork mutation are not implemented canonical operations.
- The controlled Roblox integration test is intentionally skipped unless an
  operator supplies an opted-in test account. Provider refresh rotation,
  production callback configuration, and live moderation behavior therefore
  remain environment verification, not deterministic unit-test claims.

### Duplicated or superseded paths

- The legacy `POST /api/roblox/decal-uploads` route remains for compatibility,
  but each successful or pending project upload is projected through
  `CanonicalUserUploadService` into the version 3 registry with deterministic
  source hashing, creator metadata, validation, lifecycle state, operation ID,
  and final Roblox ID when available. If the post-provider projection fails,
  the provider result is preserved and the route returns
  `ASSET_REGISTRY_RECONCILIATION_REQUIRED`; the legacy project attachment is a
  compatibility view, not an autonomous policy bypass. Before this route polls
  an accepted Open Cloud operation, `RobloxOpenCloudClient` persists the
  operation receipt. Its retry key is derived from the authenticated NexusRBX
  owner, fixed `Decal` type, authorized creator type and ID, and the hash of the
  normalized uploaded PNG bytes. A retry therefore resumes or reuses the same
  creator-bound result instead of submitting the same upload again.
- Legacy root `styleProfiles`, `assetGenerations`, and `robloxAssetBindings`
  coexist with user-scoped version 3 asset collections. The migrations merge
  canonical records and provenance without deleting the legacy source.
- Older icon-generation and pack records coexist with canonical assets during
  rollout. New consumers should read through `AssetRegistryService` instead of
  introducing a feature-local store.
- Game-pass request helpers now exist in the shared Open Cloud client and the
  isolated monetization adapter. The canonical executor delegates monetized
  writes to the adapter; direct client helpers remain compatibility-level code
  and must not become an independently retrying execution owner.

### Security concerns resolved by the upgrade

- Token refresh is no longer expected to be copied into individual asset
  endpoints. All provider calls obtain a token through the shared broker.
- Neither browser payloads nor model tool inputs can select an ungranted creator
  or universe without server-side resource validation.
- Raw OAuth credentials, authorization headers, prompts, file content, source
  paths, and preview URLs are excluded from the asset telemetry boundary.
- External writes use a durable reservation and reconciliation outcome so an
  unknown network result is not treated as safe to retry.
- Restart reconciliation accepts only the exact user-owned canonical document
  path, matching `ownerUid`, matching `assetId`, a stored operation ID, and a
  pending upload status before it calls Roblox. Failure records contain only a
  safe code, retryability, retry class, and timestamp.
- File validation rejects path traversal, unsafe filenames, unsupported MIME
  types, corrupted files, and oversized input before provider submission.
- Studio writes require an exact numeric provider ID and target inspection;
  temporary preview URLs and invented IDs are rejected.

### Remaining manual work

- Register the exact callback and requested scopes in the Roblox OAuth
  application, provide production secrets, and keep historical encryption keys
  during key rotation.
- Review dry-run migration output before applying either migration to a real
  Firebase project.
- Enable feature flags in stages only after deterministic tests and the
  controlled-account test pass in that environment.
- Deploy `backend/firestore.indexes.json`, wait for the `assetRegistry`
  collection-group index to report ready, then enable restart reconciliation on
  exactly one `RUN_JOB_WORKER=true` instance. Verify a submitted operation is
  resumed after a controlled worker restart without a second create request.
- Connect a controlled Roblox user or group whose granted resources include the
  intended test creator and universe.
- Install the generated `roblox-plugin/NexusRBXStudioBridge.plugin.lua`, connect
  Studio, and perform the manual protocol checks in
  `docs/studio-tool-protocol.md`.
- Confirm the live Roblox OAuth application has access to any beta scope before
  enabling game-pass or developer-product capabilities.

## What prevents fully autonomous use

Autonomous asset creation is deliberately unavailable when any of the following
is true:

- the user has disabled Auto Upload Assets or selected `generate_only`;
- the creator is ambiguous or not in the current token's resource grant;
- the required scope or beta feature flag is missing;
- an environment write/tool gate is disabled, a generation provider is
  unavailable, or the Studio bridge is disconnected;
- validation, moderation, or a fee/monetized-item confirmation requires human
  action;
- Roblox accepted an operation but has not produced a final asset ID;
- the operation outcome is unknown and must be reconciled before retry; or
- the bounded request compiler does not have the exact canonical asset ID,
  quoted Studio target path, authorized universe, or explicit monetization
  fields required to produce a safe typed call.

These are visible waiting or recovery states. They are not reasons to guess an
asset ID, silently change creator, use cookie authentication, or repeat a
chargeable operation.

## Database model and migrations

Canonical records are user-owned and include:

```text
users/{uid}/assetRegistry/{assetId}
  versions/{versionId}
  robloxRelationships/{relationshipId}
users/{uid}/iconPacks/{packId}
users/{uid}/styleProfiles/{styleProfileId}
users/{uid}/projectBindings/{projectId}
users/{uid}/robloxUniverses/{universeId}/resources/{resourceId}
users/{uid}/assetOperations/{operationId}
```

Migration IDs are:

- `asset-platform-v2-legacy-ontology-v1`
- `asset-platform-v3-canonical-registry-v1`

Both migrations are dry-run by default, resumable, bounded, idempotent, and
additive. They do not delete working legacy asset records. Detailed commands and
rollout order are in `operations-security-and-testing.md`.

## Audit conclusion

The secure connection, creator/resource authorization, canonical storage,
validation and policy boundaries, durable operation records, Studio reference
checks, executable authenticated canonical tool route, bounded natural-language
task dispatch, and canonical Plan/Ask retrieval are present without replacing
the main AI runtime or Firebase authentication. The remaining release boundaries
are operational rather than architectural: write gates, provider configuration,
optional beta Roblox scopes, a live controlled account, restart-time
reconciliation ownership, and the Studio bridge must be configured and verified
before an environment can claim the complete external workflow. This audit does
not claim a deployment or live Roblox/Studio verification.
