# Lifecycles, search, and sharing

## Separate lifecycle axes

[AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js) already stores separate generation, upload, moderation, approval, validation, replacement, and usage-related data. API and UI projections must keep those distinctions instead of compressing them into one optimistic status.

### Generation

| State | Meaning |
| --- | --- |
| draft | Durable intent exists; no provider dispatch is claimed |
| generating | Operation owns a valid lease and provider dispatch may be in progress |
| generated | Immutable bytes and version metadata are durable |
| generation_failed | Provider or storage result is deterministically failed |
| outcome_unknown | Provider may have produced a result; reconcile before retry |

### Quality and approval

| State | Meaning |
| --- | --- |
| not_evaluated | No complete report exists |
| validating | Deterministic/model/manual checks are running |
| failed | At least one mandatory check is false |
| review_required | No mandatory false result, but one or more required checks are unknown |
| approved | Every mandatory check is affirmatively satisfied |
| waived | A named policy/actor accepted specific failed or unknown checks |

### Upload

| State | Meaning |
| --- | --- |
| not_requested | No write intent |
| blocked_by_consent | Master upload switch is off |
| blocked_by_capability | OAuth/capability/destination requirement is not satisfied |
| pending | Durable operation reserved; no dispatch yet |
| uploading | One dispatch is in progress under a lease |
| submitted | Provider returned a durable operation or asset identifier |
| completed | Durable remote ID is stored and required readback succeeded |
| failed_retryable | Deterministic failure permits retry with the same operation policy |
| failed_terminal | Request was rejected or unsupported |
| outcome_unknown | A write may have happened; reconciliation is mandatory |

### Moderation

| State | Meaning |
| --- | --- |
| not_submitted | No Roblox object exists |
| pending | Provider explicitly returned or a live readback confirmed pending |
| approved | A live provider readback confirmed reusable/available |
| rejected | A live provider readback confirmed rejection |
| unknown | NexusRBX has no authoritative current result |

Do not manufacture pending merely because an ID exists. Historical records without evidence migrate to unknown.

### Usage and application

| State | Meaning |
| --- | --- |
| not_applied | No intended reference is recorded |
| requested | A target mutation was requested |
| queued | Studio command was durably queued, not applied |
| acknowledged | Studio accepted/processed the command, not yet verified |
| verified | Exact target readback/hash matches the requested URI/content |
| failed | Deterministic Studio error or mismatched readback |
| unknown | Connection loss or missing readback prevents a claim |

The legacy lifecycle constants in [contracts.js](../../backend/src/lib/assetPlatform/contracts.js) can remain as a compatibility summary, but they must be derived from and never replace these axes.

## Transition ownership

Only the server may transition canonical lifecycle state:

- provider callbacks/polls are authenticated and reconciled to an operation;
- client polls read state but do not write provider outcomes;
- moderation results include provider source, checkedAt, raw-state hash, and verifier version;
- Studio verification accepts a signed/session-bound bridge receipt, not a browser boolean;
- replacing or archiving is authorized against the owning asset and all affected scopes;
- state transitions are conditional on current version/fencing token to prevent stale writes.

Invalid transitions return lifecycle_conflict with current state and permitted actions.

## Upload consent

The existing AI workspace setting robloxAssetUploadsEnabled is the master Roblox write-consent switch:

- disabled means zero automatic or manual Roblox asset writes from this workflow;
- enabled allows immediate server-orchestrated upload only after current authorization, destination, entitlement, and quality checks;
- changing it does not retroactively upload old local assets;
- generation succeeds locally even when upload is disabled or later fails;
- a failed or unknown upload keeps the local master/version available with retry or reconcile actions;
- the server reads the setting at dispatch time. A browser-provided enabled value is not authoritative.

Badge or game-pass creation can spend Robux or create a non-asset resource, so it additionally requires the relevant explicit confirmation even when asset upload consent is enabled.

## Replacement lifecycle

Replacement never overwrites or deletes the old Roblox object:

1. Authorize the old relationship and intended project/universe/place targets.
2. Generate/import and approve a new immutable asset version.
3. Upload it through a new idempotent operation and store the new remote relationship.
4. Snapshot each destructive Studio target as required by the Studio protocol.
5. Build an explicit reference plan: place, instance, file/script, property, old value/hash, and expected new URI.
6. Queue targeted commands using expected source/value hashes.
7. Read back every target and store a trusted receipt with before/after/hash evidence.
8. Mark each reference verified, failed, or unknown.
9. Mark the replacement complete only when the intended reference set is nonempty and every reference is verified.
10. Keep the old remote ID, relationship, versions, usage, snapshot IDs, and replacement lineage.

Current registry code can record replacement relationships and per-reference booleans, but it trusts caller-supplied verification. That is scaffolding only; completion must eventually require server-trusted Studio receipts.

## Resolve-or-create

Every agent/UI request for an asset should use one server service:

~~~text
authorize context
  -> normalize intent and structured filters
  -> search eligible canonical assets
  -> score and verify the top result
  -> if policy threshold is met: resolve existing asset
  -> otherwise: reserve a create operation
~~~

The response must be one of:

- resolved with assetId/versionId and the authorized scope/reason;
- create_reserved with operationId and proposed asset/pack IDs;
- review_required when a close match requires user choice;
- unavailable/unauthorized with a typed reason.

It must never generate first and attempt to deduplicate later. No reachable resolve-or-create orchestration exists today.

## Sharing scopes

The canonical visibility values in [contracts.js](../../backend/src/lib/assetPlatform/contracts.js) are useful but need strict authorization:

| Scope | Eligible consumers | Required evidence |
| --- | --- | --- |
| project | Same authorized project only | Project membership/ownership derived server-side |
| universe_shared | Authorized projects/places bound to the same verified Roblox universe | Explicit opt-in plus authoritative universe access/ownership verification |
| user_global | The same NexusRBX user across their authorized projects | Explicit opt-in; not a public/multi-user catalog |

Chat membership never grants asset sharing. A chat ID may narrow project provenance, but cannot broaden scope.

If a future multi-user global catalog is desired, it must be a new scope with explicit submission, content/safety/moderation review, licensing/provenance, removal, and abuse controls. Do not reinterpret user_global.

### Current universe-binding limitation

[AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js) verifies that the selected creator destination is authenticated, but records universeOwnershipReadback as false. This is not enough to assert that the current user may share resources across a universe. Until an authoritative check exists, universe_shared must remain disabled or restricted to explicitly verified bindings.

## Search and discovery

[AssetSearchService.js](../../backend/src/services/assetPlatform/AssetSearchService.js) currently combines structured filters and alias-expanded lexical terms over an owner-scoped candidate list. It does not implement vector semantic search.

### Required query inputs

- authenticated requester;
- authorized project/universe/place context;
- query text;
- kind, artwork mode, tags, pack, style, palette/theme, dimensions, alpha/background;
- lifecycle, moderation, upload, visibility, and superseded inclusion policy;
- cursor and bounded limit.

Security filtering happens before ranking. Search must not fetch cross-tenant candidates and merely hide them in the browser.

### Eligibility

By default, reusable results must:

- belong to an authorized scope;
- have an approved quality state;
- not have moderation rejected;
- have intact private preview/export references;
- not be archived or replaced unless explicitly requested;
- satisfy the intended use, such as requiring a verified Roblox ID for direct Studio insertion.

Moderation pending may be shown with a warning for review or polling, but is not equivalent to approved Roblox reuse. Current code treats moderation_pending as approved in some rankings/visibility checks and only penalizes rejected assets. That must be corrected.

### Ranking order

After authorization and eligibility:

1. Exact assets already used in the current project.
2. Other approved assets in the current project.
3. Approved same-universe assets from explicitly verified bindings.
4. Same-pack assets when pack/style context matters.
5. Explicit owner-global assets.
6. Older, archived, replaced, or superseded assets only when requested, ranked last.

Within a tier, combine structured exact matches, lexical score, semantic vector score when implemented, quality/consistency, recency, and verified usage signals. Record ranking reason codes for debugging; do not expose another user’s private metadata.

### True semantic retrieval

To claim semantic search, add:

- a versioned embedding generated from sanitized canonical metadata;
- an authorized vector index partitioned by owner and scope;
- index events for create/version/visibility/moderation/replacement;
- deletion/tombstone behavior;
- hybrid score calibration and deterministic test fixtures;
- fallback to structured/lexical search when embeddings are unavailable;
- monitoring for stale or missing embeddings.

Embeddings must not include secrets, OAuth data, raw private chat, or unreviewed source that would broaden access.

## Resource discovery

Same-universe Roblox resources such as badges and game passes require durable records with:

- Nexus resource ID;
- universe ID and server-verified creator destination;
- remote resource ID;
- artwork asset/version and remote artwork ID where applicable;
- requested/effective price, price source, and policy reason;
- operation and provider IDs;
- capability/scopes used;
- live readback and moderation/availability state;
- replacement/usage lineage.

Discovery returns only records authorized for the requester’s verified universe binding. A stored remote ID without authorization does not grant access.

## Known current limitations

- Search is owner-scoped lexical discovery, not semantic vector retrieval.
- Candidate retrieval is bounded and performed in memory, so it is not a production-scale index.
- Rejected assets can currently remain in results with a score penalty.
- Global eligibility currently admits moderation_pending.
- user_global is not public global.
- Universe binding does not prove universe ownership/access through live readback.
- No canonical route or agent tool invokes resolve-or-create.
- Legacy stores have not been backfilled and parity-tested against the canonical registry.
