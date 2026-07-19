# Generation, style, and quality

## Supported product workflows

The orchestration contract must support:

1. Generate one transparent game UI icon.
2. Generate a new icon pack using a soft default of 8.
3. Extend an existing pack without rewriting earlier members.
4. Generate a similar asset with explicit parent/version provenance.
5. Repair only an inconsistent or failing item by producing 2–3 candidates and selecting the strongest qualified result.
6. Generate background-enabled badge or game-pass artwork using a distinct artwork mode.
7. Replace a deployed asset while preserving the old remote object and verifying each reference update.

Only the service primitives exist today. There is no mounted end-to-end workflow for these actions.

## Pack semantics

Eight is a UX default, not a hard product limit. The request may provide concepts, a count, or both:

- If concepts are present, each concept becomes a durable requested item.
- If neither concepts nor count is present, request 8.
- If count exceeds one provider batch, split it into bounded child operations under one pack operation.
- Operational batch limits protect cost and latency; they must not redefine total pack membership.
- Each item has its own operation, generation, quality, upload, and moderation state.
- A pack is useful when partially complete. Successful members remain available when another member fails.
- Retry or resume acts only on pending, failed_retryable, or reconciled-safe items.
- Extension appends membership records and records the style version used. It never silently restyles prior members.

The current contract validates an initial count from 1 through 24 while registry append can extend beyond that. Before exposure, rename 24 as a per-request operational limit and enforce it consistently at the orchestration boundary without capping total pack membership.

### Pack progress projection

~~~json
{
  "packId": "pack_...",
  "requested": 12,
  "completed": 9,
  "failed": 1,
  "pending": 2,
  "members": [
    {
      "assetId": "asset_...",
      "concept": "inventory",
      "operationId": "op_...",
      "generationStatus": "generated",
      "qualityStatus": "approved",
      "uploadStatus": "not_requested"
    }
  ],
  "resume": {
    "eligibleItemIds": ["item_..."],
    "blockedUnknownItemIds": ["item_..."]
  }
}
~~~

Items with outcome_unknown are blocked from generation retry until reconciliation.

## Versioned style profile

[contracts.js](../../backend/src/lib/assetPlatform/contracts.js) already validates a substantial style record and [AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js) persists immutable versions. The target schema is:

| Field | Requirement | Current scaffold |
| --- | --- | --- |
| canonicalPrompt | Complete reusable visual instruction, independent of chat wording | Explicit |
| negativeConstraints | Prohibited elements, artifacts, text, colors, or composition | Explicit through negativeDirectives/negativeConstraints |
| visualTheme | Named aesthetic/theme | Explicit |
| palette | Structured color roles and values | Explicit |
| composition | Framing and subject placement | Explicit |
| cameraAngle | Camera/view angle | Explicit |
| perspective | Orthographic/isometric/perspective treatment | Explicit |
| depthOfField | Focus and depth treatment | Missing as a first-class field |
| materials | Surface/material language | Explicit |
| lightingDirection | Direction, softness, contrast | Explicit |
| outlineTreatment | Width, color, edge style | Explicit |
| silhouette | Shape-read requirements | Explicit |
| detailLevel | Small-size detail budget | Explicit |
| iconPadding | Normalized safe padding | Explicit; constrained to 0.075–0.35 |
| backgroundMode | transparent, background_enabled, or not_applicable | Explicit |
| effects | Glow, particles, shadow, bloom constraints | Missing as a first-class field |
| provider/model/settings | Reproducibility and provider policy | Explicit through providerSettings/modelPolicy |
| seed | Deterministic seed when provider supports it | Only possible through generic deterministicControls; not explicit |
| references | Durable reference asset/image IDs and their roles | IDs explicit; role/weight needs a typed extension |
| qualityThresholds | Deterministic acceptance thresholds | Explicit |
| consistencyThreshold | Pack consistency threshold | Explicit; default 0.75 |
| schemaVersion/styleVersion | Evolution and immutable revision | Explicit |
| contentHash | Canonical style payload hash | Explicit |

Before calling the schema fully reproducible, add typed depthOfField, effects, seed, and reference role/weight fields in a new schema version. Preserve v1 reads; never reinterpret old content hashes.

### Style creation rules

- Canonicalize key order, numbers, colors, and arrays before hashing.
- Reject unknown security- or cost-relevant fields. Preserve harmless forward-compatible metadata separately.
- Save provider capability constraints, not credentials.
- A generation references an exact style profile version.
- Editing creates styleVersion + 1 with parentVersion and changeReason.
- Repair defaults to the original style version. A style upgrade must be explicit.
- Pack extension defaults to the pack’s pinned style version; the caller may explicitly choose a newer compatible version.

## Provider-independent generation interface

[ImageProviderRouter.js](../../backend/src/services/assetPlatform/ImageProviderRouter.js) contains adapters for configured image providers and intentionally avoids automatic fallback. The orchestration interface should be provider-neutral:

~~~json
{
  "operationId": "op_...",
  "purpose": "icon_pack_item_repair",
  "prompt": {
    "canonical": "...",
    "negative": ["text", "cropped silhouette"]
  },
  "styleProfile": {
    "id": "style_...",
    "version": 2,
    "contentHash": "sha256..."
  },
  "output": {
    "artworkMode": "transparent_game_ui_icon",
    "width": 1024,
    "height": 1024,
    "format": "png",
    "candidateCount": 3
  },
  "references": [],
  "deterministicControls": {
    "seed": 12345
  },
  "routing": {
    "tier": "low_cost",
    "allowEscalation": true,
    "escalationReason": "targeted repair after consistency failure"
  }
}
~~~

The provider result must record provider, model, settings, candidate count, estimated cost, actual cost when available, routing tier, escalation reason, provider operation ID, and each candidate’s content hash.

### Low-cost-first routing

1. Use the configured low-cost provider/tier when it supports the required dimensions, artwork mode, references, and alpha contract.
2. Never silently fall through to a different provider.
3. Escalation requires allowEscalation, a bounded candidate count, a policy-permitted reason, and an entitlement/cost check.
4. Repair and repeated deterministic failure are valid escalation reasons; convenience is not.
5. Record the chosen provider before dispatch.
6. A timeout or ambiguous response becomes outcome_unknown and is reconciled, not re-routed.
7. If native alpha is unavailable, use a strict background-removal adapter. A pass-through adapter cannot satisfy transparent icon mode.

Provider keys, raw billing objects, and internal safety payloads remain server-side.

## Candidate selection and targeted repair

The current router can request up to 3 candidates, but no mounted workflow selects a winner. The required selector is:

1. Decode and normalize each candidate.
2. Reject candidates with deterministic false checks.
3. Compute pack consistency against approved reference members.
4. Run text/concept review when required by the intent.
5. Score remaining candidates with recorded weights:
   - deterministic quality;
   - style/pack consistency;
   - concept match;
   - small-size legibility;
   - cost only as a tie-breaker after quality thresholds.
6. Select the strongest candidate only if all mandatory checks are affirmative.
7. If none qualify, return review_required or failed_retryable according to policy; never mark the least-bad candidate approved.
8. Persist every candidate as immutable evidence or delete rejected temporary bytes according to retention policy while retaining hashes/reports.

Repair is scoped to the failing item. Its provenance must include repairedFromVersionId, failedChecks, reference pack members, candidate IDs, selection scores, and selectedVersionId.

## Deterministic quality gate

[AssetQualityService.js](../../backend/src/services/assetPlatform/AssetQualityService.js) currently decodes, normalizes, and evaluates structural properties. The gate should expose each check independently:

| Check | Deterministic implementation today | Required approval meaning |
| --- | --- | --- |
| Decode/corruption | Implemented | Bytes decode successfully and export verifies |
| Input size/dimensions | Implemented | Within configured limits |
| Output dimensions/format | Implemented | Master/export match the requested contract |
| Alpha/background | Implemented for structural alpha presence; strict remover required when provider lacks alpha | Transparent mode has meaningful alpha and no opaque background |
| Halo/fringe | Implemented heuristic | Edge contamination below threshold |
| Clipping | Implemented | Foreground does not touch unsafe edges |
| Centering | Implemented | Subject centroid within threshold |
| Padding | Implemented | Safe normalized padding met |
| Small-size legibility | Geometry heuristic only | Must be reviewed at target render sizes, not merely large-source geometry |
| Text absence/content | Not claimed by current deterministic service | Explicit OCR/model/manual result when text constraints matter |
| Concept match | Current status is review_required | Explicit model/manual result |
| Pack style consistency | RGB/occupancy/centroid signature heuristic | Useful deterministic signal, but not sufficient alone for semantic style identity |

An overall passed value must not hide unknown mandatory checks. The aggregate rule is:

- failed if any mandatory check is false;
- review_required if no mandatory check is false but at least one is null/unknown;
- approved only when every mandatory check is true;
- waived only with a named policy, actor, reason, and audit record.

Model review is additive. It cannot override corrupt bytes, invalid alpha, clipping, or format failure. Its input and output must be scrubbed and versioned.

## Master, export, and preview

[AssetStorageService.js](../../backend/src/services/assetPlatform/AssetStorageService.js) uses private, owner-hashed object paths and validates checksums. Preserve three representations:

| Representation | Purpose | Rule |
| --- | --- | --- |
| Master | Lossless canonical bytes and future conversion source | Private, immutable, content-hashed |
| Roblox-ready export | Provider-compatible PNG/JPEG and dimensions | Immutable per version; hash stored before upload |
| Preview | Smaller web-delivery image | Private; served through authorized short-lived delivery |

Transparent icons currently normalize to a 1024 PNG master with a 512 PNG and 256 WebP export/preview pattern. Background-enabled artwork must not be flattened to one universal hard-coded color unless the style profile explicitly requests it.

The UI must receive an authorized preview handle or short-lived URL. It must never infer a public master URL from a storage path.

## Generation failure contract

Failures must preserve partial work and answer:

- Which operation and pack item failed?
- Was any provider request dispatched?
- Is the outcome known?
- Are candidate bytes stored?
- Which deterministic checks failed or remain unknown?
- Is retry safe, and if so under which idempotency key?
- Was an escalation attempted and what did it cost?
- Did any upload begin? If yes, what remote/provider IDs are known?

Examples of typed failures include invalid_style_profile, provider_unavailable, escalation_not_allowed, entitlement_exceeded, quality_failed, review_required, transparent_output_unavailable, outcome_unknown, and storage_failed.
