# Architecture and contracts

## Ownership boundary

The canonical design is server-orchestrated. The browser and agent may request intent; they do not decide ownership, authorization, price policy, moderation truth, provider retry safety, or whether Studio applied a change.

~~~mermaid
flowchart LR
    UI["Asset library / detail / composer"] --> API["Authenticated asset-platform API"]
    Agent["Typed agent tools"] --> API
    API --> Ops["Operation ledger"]
    API --> Registry["Canonical registry"]
    API --> Provider["Image provider router"]
    API --> Quality["Quality and export service"]
    API --> Storage["Private object storage"]
    API --> Roblox["Roblox capability client"]
    API --> Studio["Versioned Studio command protocol"]
    Registry --> Search["Authorized discovery index"]
    Roblox --> Registry
    Studio --> Receipt["Readback verification receipt"]
    Receipt --> Registry
~~~

The API box in this diagram is contract-only today. The frontend requests it, but no route currently mounts it.

### Layer responsibilities

| Layer | Owns | Must not own |
| --- | --- | --- |
| React UI | Intent capture, progress display, review/confirm, retry request, library navigation | OAuth tokens, authoritative creator/universe claims, provider retries, moderation claims, Studio success claims |
| Agent tools | Typed intent and durable result IDs | Direct provider/Roblox calls, hidden writes, synthetic success |
| Asset orchestration API | Authentication, authorization, validation, operation reservation, sequencing, policy, response projection | Trust in browser-supplied security or billing metadata |
| Operation ledger | Idempotency, lease/fence, provider operation IDs, outcome-unknown state, reconciliation history | Asset content or mutable UI state |
| Registry | Canonical assets, immutable versions/styles, packs, relationships, visibility, usage and replacement lineage | Raw credentials |
| Provider router | Explicit low-cost selection, allowed escalation, cost estimate, one dispatch, error classification | Automatic retry of ambiguous creates |
| Quality/export | Deterministic decode/normalize/check/export and scored reports | Unsupported concept/text assertions |
| Roblox client | Capability-gated provider requests and provider readback | Invented API support, implicit payer/destination changes |
| Studio bridge | Versioned commands against the live place and exact readback receipts | Treating queue/ack as a verified mutation |

## Canonical identity

Durable IDs are independent of chat messages and UI sessions:

- assetId identifies the conceptual asset.
- versionId identifies an immutable generated or imported file version.
- styleProfileId plus styleVersion identifies an immutable style contract.
- packId identifies an extensible pack and its membership history.
- operationId identifies one idempotent external or generation intent.
- relationshipId links a Nexus asset/version to a Roblox remote object.
- replacementId links an old remote relationship to its replacement and reference-verification receipts.
- usageId identifies a concrete project/place/file/instance/property reference.

Chat IDs may be recorded as provenance but cannot be primary keys or authorization boundaries.

## Canonical asset aggregate

[contracts.js](../../backend/src/lib/assetPlatform/contracts.js) and [AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js) establish the repository scaffold. The target aggregate must preserve the following shape even if storage collections evolve:

~~~json
{
  "assetId": "asset_...",
  "ownerUserId": "firebase-uid",
  "projectId": "project_...",
  "universeId": "roblox-universe-id-or-null",
  "placeId": "roblox-place-id-or-null",
  "creator": {
    "type": "user",
    "id": "server-verified-id",
    "verification": "server-derived"
  },
  "kind": "icon",
  "artworkMode": "transparent_game_ui_icon",
  "visibility": "project",
  "currentVersionId": "version_...",
  "style": {
    "styleProfileId": "style_...",
    "styleVersion": 1
  },
  "packId": "pack_...",
  "generation": {},
  "approval": {},
  "upload": {},
  "moderation": {},
  "validation": {},
  "replacement": {},
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
~~~

Security-critical fields are server-derived. Request payloads may name a desired project, universe, creator, style, or price, but the service must re-authorize them.

### Immutable version

Every generation, import, conversion, or repair that changes bytes creates a new version record. At minimum it records:

- content hash, media type, dimensions, byte size, and alpha/background mode;
- private storage references for master, Roblox-ready export, and preview;
- canonical prompt and negative constraints used;
- style profile ID/version;
- provider, model, settings, seed when available, reference IDs, and candidate index;
- deterministic quality report and any model-review result;
- parent version and reason such as initial, extend, similar, repair, replacement, or import;
- generation operation ID and cost estimate/actual cost where available.

Never mutate a historical version to point at new bytes.

### Independent state axes

One flattened status is insufficient. The API projection must include:

~~~json
{
  "generation": { "status": "generated" },
  "quality": { "status": "approved" },
  "upload": { "status": "submitted", "robloxAssetId": "123" },
  "moderation": { "status": "unknown", "verifiedAt": null },
  "usage": { "status": "not_applied" }
}
~~~

For example, upload submitted plus a remote ID does not imply moderation approved, and moderation approved does not imply a Studio reference was applied.

## Operation and idempotency contract

[AssetOperationService.js](../../backend/src/services/assetPlatform/AssetOperationService.js) provides a useful transaction/lease scaffold. The mandatory sequence for any external create is:

1. Authenticate and authorize the user and target.
2. Canonicalize the request and hash it.
3. Reserve an operation using the user-scoped idempotency key.
4. If the key exists with a different input hash, return idempotency_conflict.
5. If it succeeded, replay the durable result.
6. If it is executing with a valid lease, return in_progress.
7. If the lease expired or a previous call was ambiguous, set outcome_unknown.
8. Dispatch at most once while holding the current fencing token.
9. Persist provider operation/external IDs as soon as known.
10. On network/timeout/ambiguous response, do not redispatch. Reconcile by provider ID, authoritative listing, or readback.
11. Only after deterministic reconciliation may the operation become succeeded, failed_retryable, or failed_terminal.

All state-changing writes made after reservation must require the current lease/fencing token. Reconciliation must also be idempotent.

### Operation response

~~~json
{
  "operationId": "op_...",
  "status": "outcome_unknown",
  "assetId": "asset_...",
  "provider": {
    "name": "roblox-or-image-provider",
    "operationId": null,
    "externalId": null
  },
  "retry": {
    "allowed": false,
    "requiresReconciliation": true
  },
  "error": {
    "code": "EXTERNAL_WRITE_OUTCOME_UNKNOWN",
    "message": "The provider outcome could not be determined."
  }
}
~~~

Do not expose secrets, access tokens, raw provider payloads, or internal stack traces in operation summaries.

## Target API contract

The frontend currently names this base path in [assetPlatformApi.js](../../src/lib/assetPlatformApi.js), but the following endpoints are contract-only until a backend router is mounted and tested.

| Method and path | Contract |
| --- | --- |
| GET /api/asset-platform/context | Server-authorized projects, universes, creator destination, consent, capability states, limits, and feature flags |
| GET /api/asset-platform/assets | Structured filters plus authorized search; opaque cursor pagination |
| GET /api/asset-platform/assets/:assetId | Authorized aggregate, immutable versions, relationships, usage, and available actions |
| GET /api/asset-platform/packs/:packId | Pack style version, ordered members, partial-progress counts, failures, and resumable actions |
| POST /api/asset-platform/style-profiles | Create immutable v1 after validation |
| POST /api/asset-platform/style-profiles/:id/versions | Create a new immutable version; never overwrite |
| POST /api/asset-platform/operations/generate | Single or pack generation; idempotency key required |
| POST /api/asset-platform/packs/:packId/extend | Add requested concepts using a chosen style version |
| POST /api/asset-platform/assets/:assetId/similar | New asset/version with explicit provenance |
| POST /api/asset-platform/assets/:assetId/repair | Candidate generation for a failing item only |
| POST /api/asset-platform/assets/:assetId/upload | Consent- and capability-gated Roblox upload |
| POST /api/asset-platform/assets/:assetId/replace | Create replacement workflow without deleting the old object |
| POST /api/asset-platform/operations/:operationId/reconcile | Poll/reconcile only; never blind create retry |
| POST /api/asset-platform/assets/:assetId/visibility | Explicit project, universe_shared, or user_global transition |
| POST /api/asset-platform/assets/:assetId/resolve-or-create | Resolve an authorized reusable asset or reserve a create operation |

Every mutation requires authentication, authorization, CSRF protections appropriate to the session model, a request ID, and an idempotency key. A client-supplied uid is never an authorization source.

### Error envelope

~~~json
{
  "error": {
    "code": "ASSET_CAPABILITY_UNAVAILABLE",
    "message": "This operation is not available.",
    "retryable": false,
    "operationId": "op_...",
    "details": {
      "capability": "roblox_update_game_pass",
      "state": "unsupported"
    }
  }
}
~~~

Typed codes must distinguish unavailable, unauthorized, reauthorization_required, consent_required, validation_failed, moderation_pending, moderation_rejected, outcome_unknown, idempotency_conflict, rate_limited, quota_exceeded, provider_failed, and studio_unavailable.

## Agent tool contract

[AssetAgentToolService.js](../../backend/src/services/AssetAgentToolService.js) still targets older asset pipelines. Prompt 2 requires additive tools over the canonical orchestrator:

| Tool | Required input | Required output |
| --- | --- | --- |
| search_assets | intent, project/universe context, structured filters | authorized durable asset IDs, scope/reason, lifecycle axes, preview handle |
| resolve_or_create_asset | intent, target context, style constraints | resolved asset or reserved operation; never an untracked generation |
| generate_icon_pack | concepts or count, style version, project/universe | pack ID, operation IDs, per-item progress/failures |
| extend_icon_pack | pack ID, concepts/count, style version | appended member IDs and per-item states |
| repair_asset | asset ID/version, failed checks, candidate count 2–3 | candidate version IDs, scores, selected version or review_required |
| upload_asset_to_roblox | asset/version, verified destination | operation and upload states; exact remote ID only when durable |
| create_badge | universe, artwork version, spend confirmation | gated capability result, operation, badge ID/readback if verified |
| create_game_pass | universe, artwork version, exact price or policy request | price source/reason/result, operation, pass ID/readback if verified |
| replace_asset_references | old/new relationship IDs, intended references | per-reference Studio receipts and completion state |

All outputs must be JSON-safe, redact secrets, and include a human-readable summary without relying on it for machine decisions.

## Context provider contract

Before offering an action, the agent and UI need one server-produced context projection:

- authenticated user and authorized project IDs;
- server-verified Roblox connection and selected creator destination;
- authorized universe/place bindings and verification method;
- upload consent state;
- current feature flags and capability states, including missing scopes;
- generation/upload limits and estimated cost policy;
- available style profiles and pack IDs;
- Studio connection state, live place ID, manifest revision/staleness, and supported protocol version;
- explicit unsupported reasons.

This projection is advisory for UI rendering; every mutation rechecks authorization and capability.

## Compatibility and migration boundary

Prompt 1 identified multiple stores and routes. Migration must be additive:

- preserve all old asset IDs, storage paths, Roblox IDs, URLs, and project references;
- assign deterministic canonical IDs during backfill and keep alias/source mappings;
- represent unknown moderation, ownership, style, and membership as unknown rather than inventing values;
- dual-read while parity tests compare old and canonical projections;
- direct all new writes through the canonical orchestrator only after its route is mounted;
- keep compatibility adapters for [iconExporter.js](../../src/utils/iconExporter.js), the existing UI builder, project attachments, and ontology search;
- stop dual-write only after counts, content hashes, permissions, and reference resolution agree;
- retain rollback to legacy reads without deleting canonical records.

No migration may make a private/chat-scoped asset globally visible or infer universe membership from a chat.
