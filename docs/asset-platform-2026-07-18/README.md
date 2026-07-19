# NexusRBX asset platform: Prompt 2 implementation contract

Date: 2026-07-18

This package is the durable Prompt 2 contract for generated visual assets, Roblox uploads and resources, discovery, replacement, and Studio handoff. It is grounded in the Prompt 1 audit and the repository as it exists on the date above.

It is deliberately not a completion claim. The repository now contains a mounted, authenticated, default-off read-only asset-platform API in addition to canonical service scaffolding and unit-tested, default-off Roblox resource clients. It does not expose asset-platform write endpoints or an end-to-end generation, agent, upload, moderation, or Studio mutation path. No live Roblox write, moderation result, or Studio mutation was performed while producing this package.

## Evidence labels

Every implementation statement in this package uses one of these meanings:

| Label | Meaning |
| --- | --- |
| Implemented in repository | Source exists in the current tree. This does not imply it is reachable from a mounted route. |
| Unit-tested only | Local tests exercise mocks or pure/service behavior. This does not verify Roblox, an image provider, Firestore rules, Storage rules, or Studio. |
| Feature-gated, default off | Code exists but the normal product must deny it until a named flag is enabled and capability checks pass. |
| Contract-only | Required interface or behavior is specified here but not wired in the current product. |
| Externally unverified | Provider/API support, permissions, billing, moderation, or live behavior still requires staging verification. |
| Unavailable | NexusRBX must return a typed unsupported/unavailable result and must not imply that an action happened. |

## Current truth

The current tree has these Prompt 2 building blocks:

- Canonical domain constants and validators in [contracts.js](../../backend/src/lib/assetPlatform/contracts.js).
- Per-user asset, version, pack, style, relationship, binding, and usage persistence in [AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js).
- Durable operation reservation and outcome-unknown reconciliation primitives in [AssetOperationService.js](../../backend/src/services/assetPlatform/AssetOperationService.js).
- Provider selection and ambiguous-outcome classification in [ImageProviderRouter.js](../../backend/src/services/assetPlatform/ImageProviderRouter.js).
- Deterministic image normalization and structural checks in [AssetQualityService.js](../../backend/src/services/assetPlatform/AssetQualityService.js).
- Private master/export/preview storage in [AssetStorageService.js](../../backend/src/services/assetPlatform/AssetStorageService.js).
- Owner-scoped structured and lexical discovery in [AssetSearchService.js](../../backend/src/services/assetPlatform/AssetSearchService.js).
- Usage and generation entitlement accounting in [AssetUsageMeter.js](../../backend/src/services/assetPlatform/AssetUsageMeter.js).
- A frontend client and library/detail components beginning at [assetPlatformApi.js](../../src/lib/assetPlatformApi.js).
- A default-off authenticated read boundary in [assetPlatform.js](../../backend/src/routes/assetPlatform.js), mounted at /api/asset-platform with verified-email auth and read rate limiting.
- Default-off frontend route registration and separate read/write guards through REACT_APP_ASSET_PLATFORM_READS_ENABLED and REACT_APP_ASSET_PLATFORM_WRITES_ENABLED.
- Default-off badge, game-pass, and experience-artwork capability definitions in [RobloxCapabilityRegistry.js](../../backend/src/services/RobloxCapabilityRegistry.js).
- Unit-tested badge and game-pass create/read client methods in [RobloxOpenCloudClient.js](../../backend/src/services/RobloxOpenCloudClient.js).

The critical integration fact is that the mounted API is intentionally read-only. It exposes context, asset, pack, style-profile, and authorized private-file retrieval, but no generation, visibility mutation, upload, moderation, Roblox resource creation, agent-tool orchestration, or Studio application endpoint. The existing [uiBuilder.js](../../backend/src/routes/uiBuilder.js), older asset stores, and [AssetAgentToolService.js](../../backend/src/services/AssetAgentToolService.js) remain separate paths. Therefore, the current Prompt 2 code is a safe catalog slice, not an end-to-end asset platform.

## Contract invariants

The implementation must preserve all of these:

1. A generated file is not a Roblox upload, an approved moderation result, a usable resource, or a verified Studio application.
2. Generation, quality approval, upload, moderation, and usage are separate state axes.
3. Every external create has a durable operation ID and idempotency key reserved before dispatch.
4. An ambiguous provider response becomes outcome_unknown. Reconcile before any retry.
5. A Roblox ID is not sufficient proof that a Studio reference was applied. Studio requires an exact rbxassetid URI, a targeted mutation, and readback/hash verification.
6. The authenticated user is the default upload owner. Group or other creator destinations require explicit selection and server verification.
7. Browser-supplied creator, universe, price, cost, capability, or ownership metadata is non-authoritative.
8. Style profiles and generated versions are immutable. Changes create new versions.
9. Pack size 8 is a soft default, not a semantic maximum.
10. Global reuse is explicit opt-in. Project and universe authorization must be enforced server-side before search or retrieval.
11. Replacements preserve the old remote object and lineage. Completion requires every intended reference to be verified.
12. Unsupported badge, pass, artwork, upload, moderation, or Studio operations return typed unavailable results and never simulated success.

## Cross-layer discrepancy register

These are implementation blockers, not documentation polish:

| ID | Current repository reality | Required resolution |
| --- | --- | --- |
| D-01 | Resolved for reads: [assetPlatform.js](../../backend/src/routes/assetPlatform.js) mounts authenticated, sanitized, default-off catalog endpoints. No write route exists. | Keep writes disabled until Prompt 3 provides the shared operation-ledger runtime and end-to-end authorization/idempotency tests. |
| D-02 | Canonical asset services are not wired into [AssetAgentToolService.js](../../backend/src/services/AssetAgentToolService.js). | Add typed agent tools and a context provider that return durable IDs and explicit states. |
| D-03 | Older UI-project, ontology, and project/chat asset stores still coexist. | Backfill and dual-read deliberately; do not create a fourth independent lifecycle. |
| D-04 | Initial and append validation now enforce the same 24-item safety bound, while the frontend retains 8 as a soft default and accepts values above 8. Resumable multi-batch orchestration is not mounted. | Separate the per-dispatch safety bound from total pack membership when the Prompt 3 runtime implements resumable large packs. |
| D-05 | Style contracts have generic providerSettings and deterministicControls but no explicit first-class seed, depth-of-field, or effects fields. | Add versioned fields or a documented typed extension before claiming exact reproducibility. |
| D-06 | Provider routing supports explicit candidate counts but no mounted workflow selects the strongest candidate or repairs only the inconsistent item. | Add scored candidate selection and targeted repair orchestration. |
| D-07 | Structural quality can pass while text validation is not claimed and concept validation requires review. | Do not label an asset fully approved until all required checks have an affirmative result. |
| D-08 | “Semantic” search is alias-expanded lexical matching over an owner-scoped in-memory candidate set; there is no vector index. | Add authorized embeddings/vector retrieval or name the existing mode lexical discovery. |
| D-09 | Resolved in canonical reads: cross-project assets require lifecycle available plus moderation approved; packs require ready plus approved. | Preserve this eligibility rule in every future vector index and agent resolution path. |
| D-10 | Universe binding verifies an authenticated creator destination, not universe ownership readback. | Add authoritative universe access/ownership verification before same-universe sharing. |
| D-11 | user_global is owner-global, not a cross-user public catalog. | Keep that meaning explicit; design a separate reviewed catalog if multi-user reuse is wanted. |
| D-12 | Private storage exists, but the frontend expects preview-like URLs and no signed delivery route is mounted. | Add an authorized short-lived delivery boundary. Never make masters permanently public. |
| D-13 | Caller-supplied verification booleans are no longer accepted as proof and replacement relationships remain pending/unverified. | Add server-trusted Studio receipts containing target, before/after value, and readback/hash evidence before completion can exist. |
| D-14 | Capability metadata names badge/pass updates and experience artwork updates, but the Roblox client does not implement those executors. | Return typed unavailable until a supported, tested client method exists. |
| D-15 | Badge/pass create and read behavior is mocked/unit-tested and default off; official live support and scopes are not staging-verified here. | Complete provider documentation review and controlled live staging before enabling. |
| D-16 | Game-pass creation defaults an omitted price to 0 and does not record a price-source policy. | Require an exact requested price or apply a bounded server policy that records source, reason, and result. |
| D-17 | A Roblox URI helper exists, but no canonical asset-platform route queues a Studio command and verifies readback. | Integrate through the versioned Studio protocol without treating queue/ack as application. |
| D-18 | Usage accounting writes a recording state, invokes billing, then finalizes Firestore state. | Prove billing artifact idempotency and recover the crash boundary before charging production requests. |

Prompt 1 risks such as split stores, cross-tenant authorization, false upload reuse, non-atomic legacy idempotency, and Studio false success remain open until migration and cutover are complete. See [Prompt 1 acceptance tests and risks](../architecture-audit-2026-07-18/acceptance-tests-and-risks.md).

## Package index

| Document | Purpose |
| --- | --- |
| [Architecture and contracts](architecture-and-contracts.md) | Ownership, canonical records, endpoint and agent contracts, and compatibility boundaries. |
| [Generation, style, and quality](generation-style-and-quality.md) | Icon/pack workflows, immutable style schema, routing, candidates, deterministic validation, and exports. |
| [Lifecycles, search, and sharing](lifecycles-search-and-sharing.md) | Independent lifecycle axes, moderation, replacement, resolve-or-create, authorization, and ranking. |
| [Roblox resources and Studio](roblox-resources-and-studio.md) | Upload destination, badge/pass/artwork capability truth, exact pricing, unknown outcomes, and Studio verification. |
| [Rollout, security, and validation](rollout-security-and-validation.md) | Additive migrations, flags, rollback, observability, staged testing, and completion gates. |
| [Prompt 2 handoff](prompt-2-handoff.md) | Exact implemented/deferred boundary, verification evidence, flags, and Prompt 3 readiness. |

## Verification snapshot

On 2026-07-18, implementation verification included:

- 84 backend tests passed across migration/backfill, asset contracts, upload-consent, read-route, legacy asset services, capability registry, and Roblox client suites.
- 29 focused frontend API/component tests passed.
- The production frontend build completed, including the CRA application, public Next.js export, and merged output.
- 19 Studio tool-protocol tests passed.
- Node syntax checks passed for the mounted route, canonical contracts and changed asset services, upload-consent logic, and backend server.
- No image-provider request, Roblox request, Robux spend, moderation poll, Firestore/Storage rule test, browser end-to-end flow, or Studio mutation was performed.

Those checks establish repository consistency only. The live validation sequence is specified in [Rollout, security, and validation](rollout-security-and-validation.md).
