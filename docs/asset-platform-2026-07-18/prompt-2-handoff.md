# Prompt 2 handoff

Date: 2026-07-18

## 1. Summary

Prompt 2 is complete only as a safe implementation slice: canonical asset-platform contracts and services, additive migration tooling, a mounted authenticated read API, fail-closed frontend routes, strict reuse/privacy rules, and default-off Roblox capability clients. It is not a production-ready end-to-end asset platform.

No canonical write endpoint is mounted. Generation, agent orchestration, provider dispatch, Roblox writes, moderation polling, Studio application, and legacy-store cutover remain disabled or unwired. This boundary preserves the Prompt 1 requirement that external creation must not be enabled before a shared durable operation-ledger runtime and its security/recovery invariants are proven.

## 2. Prompt 1 contracts preserved

- The server derives the owner from verified authentication; browser ownership, creator, universe, capability, cost, and verification claims are non-authoritative.
- Generation, local quality, upload, moderation, resource availability, and Studio application are independent states.
- Every future external create must reserve a durable operation and idempotency key before dispatch.
- Ambiguous external outcomes become `outcome_unknown` and must reconcile before retry.
- The AI-workspace `robloxAssetUploadsEnabled` setting remains the master Roblox write-consent switch. Project settings and request fields can veto a write but cannot override a disabled master switch.
- Studio success requires a versioned command plus exact target readback/hash evidence; a queue acknowledgment or Roblox ID is not success.
- New capabilities and routes fail closed and start disabled.

## 3. New modules

Canonical backend modules now cover:

- domain constants, validators, reuse eligibility, and response sanitization;
- asset/version/pack/style/relationship/binding persistence;
- operation reservation, leasing, fencing, replay, and reconciliation primitives;
- provider policy selection and ambiguous-outcome classification;
- deterministic structural image checks and explicit text/concept review states;
- private master/export/preview storage records;
- owner-scoped structured and lexical discovery;
- usage/entitlement recording;
- additive, dry-run-by-default legacy backfill;
- badge, game-pass, and experience-artwork capability declarations;
- mocked/unit-tested badge and game-pass create/read client calls.

The mounted backend boundary is [assetPlatform.js](../../backend/src/routes/assetPlatform.js). The frontend client is [assetPlatformApi.js](../../src/lib/assetPlatformApi.js).

## 4. Existing modules changed

- [server.js](../../backend/server.js) mounts the read router behind verified-token, verified-email, and read-rate-limit middleware.
- [robloxUploadIntent.js](../../backend/src/lib/robloxUploadIntent.js) enforces the saved master consent switch without request-level bypass.
- [ProjectAssetService.js](../../backend/src/services/ProjectAssetService.js) requires master consent before project auto-upload, queue, or retry behavior.
- Canonical registry/search/quality services now exclude pending, rejected, or unapproved cross-project reuse, reject caller-supplied verification proof, and keep replacement relationships pending.
- [App.js](../../src/App.js), the asset pages, and generation form expose only default-off read behavior and hide or disable mutations unless the frontend write guard is explicitly enabled.
- [.env.example](../../.env.example) documents disabled read and write flags.

## 5. Mounted API boundary

When `ASSET_PLATFORM_READS_ENABLED=true`, authenticated verified users can read their own:

- context and capability projection;
- asset lists and individual asset projections;
- authorized private file roles;
- packs and individual pack projections;
- style profiles.

Inputs are allowlisted and bounded, responses are recursively sanitized, and cross-project reusable items require completed lifecycle plus approved moderation. Unsupported methods have no route and return no simulated result. The context response explicitly advertises `reads=true`, `writes=false`, and `externalWrites=false`.

## 6. Migration behavior

[backfillAssetPlatform.js](../../backend/scripts/backfillAssetPlatform.js) is additive and dry-run by default. Applying writes requires an explicit option. It creates deterministic canonical identifiers and aliases, reports malformed or ambiguous legacy records instead of inventing missing truth, and supports checkpointed batches.

No production backfill, dual-read parity audit, Firestore emulator run, legacy-write stop, or destructive cleanup was performed. Existing stores remain authoritative until a staged migration proves parity.

## 7. Provider routing and quality

The provider router can express low-cost-first selection, bounded candidate counts, fallback policy, and reconciliation-required failures. It does not contain a live provider adapter or a mounted dispatch call site.

Structural validation is deterministic. Text and concept checks do not self-approve when evidence is unavailable; they remain review-required. Candidate scoring, selective repair, exact visual reproducibility, live cost measurement, and subjective quality evaluation remain incomplete.

## 8. Roblox capabilities

Repository support is limited to default-off, mocked/unit-tested client behavior:

- badge create and read;
- game-pass create and read;
- capability metadata for badge, game-pass, and experience-artwork domains.

The following are not confirmed live and must remain unavailable until controlled staging verifies official endpoint support, OAuth scopes, ownership, costs, and readback:

- badge or game-pass update behavior;
- experience-artwork executors;
- canonical local-file upload and moderation orchestration;
- badge spend confirmation and payer-bound ceilings;
- authoritative universe access verification;
- exact game-pass price-source policy;
- outcome-unknown reconciliation against live Roblox APIs.

No Roblox request or Robux spend was made for this implementation.

## 9. Frontend state

The frontend contains an icon generator, asset library, detail page, context selector, style controls, pack controls, asset cards, and Creator Store result components. Pack size 8 is a UI default, not the semantic maximum; the current service applies a 24-item per-dispatch safety bound, and total resumable multi-batch packs remain a Prompt 3 runtime concern.

With reads disabled, asset routes are not registered and the API client performs no request. With writes disabled, mutation controls are hidden or disabled and the client rejects non-GET calls before `fetch`. The current UI can inspect catalog data only after the server and frontend read flags are deliberately enabled.

There has been no browser end-to-end or accessibility verification of these pages.

## 10. Agent tools

The existing `AssetAgentToolService` continues to serve the older asset paths. Canonical Prompt 2 records are not yet wired into agent search, resolve-or-create, generation, upload, promotion, or analytics tools. No agent tool may claim a canonical external side effect from the current slice.

Prompt 3 must provide typed tools that delegate to the same server-owned orchestration as HTTP routes and return durable operation/asset/version/relationship IDs with explicit states.

## 11. Studio integration

The existing versioned Studio protocol is unchanged. The canonical asset platform does not yet queue an apply/replacement command, target exact references, create a destructive snapshot, or store a trusted readback receipt. Replacement relationships therefore cannot be completed by caller-provided booleans and remain pending.

## 12. Verification evidence

Local verification on 2026-07-18:

- 84 backend tests passed across backfill, contracts, upload consent, mounted reads, legacy asset services, capability registry, and Roblox client behavior.
- 29 focused frontend tests passed across the fail-closed client, disabled generation controls, and asset/Creator Store components.
- Node syntax checks passed for the changed backend route, contracts, services, consent logic, and server mount.
- The production frontend build completed, including the CRA application, public Next.js export, and merged output.
- 19 Studio tool-protocol tests passed.

These are repository checks only. Firestore/Storage emulator rules, a mocked cross-layer end-to-end flow, live image generation, Roblox staging, moderation, browser behavior, and a Studio place mutation were not tested.

## 13. Security issues resolved in this slice

- A request-level `true` value cannot bypass disabled saved Roblox upload consent.
- Enabling project auto-upload requires enabled master consent and required scope/readiness.
- Cross-project asset and pack reuse requires the strict available/ready plus approved state.
- Shared responses recursively remove owner, storage, provider-private, token, signed URL, and internal metadata.
- Read query fields, identifiers, enum values, sort values, and limits are allowlisted.
- Asset endpoints require verified authentication/email and are rate-limited.
- The API publishes no write method and reports write capabilities as false.
- Frontend flags fail closed when missing and prevent guarded calls before network dispatch.
- Caller-provided Studio verification booleans cannot complete replacement.

## 14. Flags and rollback

Implemented flags:

- `ASSET_PLATFORM_READS_ENABLED=false` controls the mounted backend read boundary.
- `REACT_APP_ASSET_PLATFORM_READS_ENABLED=false` controls frontend routes and GET calls.
- `REACT_APP_ASSET_PLATFORM_WRITES_ENABLED=false` controls frontend mutation affordances and non-GET calls. It is not server authorization and cannot enable a backend write route.

Other planned server flags are documented in [Rollout, security, and validation](rollout-security-and-validation.md) and remain unimplemented or default off.

Rollback for this slice is to disable backend and frontend read flags. That stops new canonical reads without deleting canonical or legacy records. Any future external-write rollback must stop dispatch, preserve operations and remote IDs, and continue reconciliation rather than deleting evidence or retrying ambiguous creates.

## 15. Known limitations

- No canonical write API or service composition root is mounted.
- No live provider adapter, candidate selection workflow, selective repair, or resumable large-pack executor exists.
- There is no vector/embedding semantic index; current discovery is owner-scoped alias-expanded lexical matching.
- Private-file authorization exists, but the frontend does not yet resolve canonical previews through it.
- Canonical and legacy stores coexist without completed dual-read parity or cutover.
- Firestore and Storage rules were not emulator-tested for the new schema.
- Billing crash recovery and artifact idempotency are not proven.
- Same-universe authorization does not yet have authoritative ownership/readback verification.
- No canonical moderation worker, Roblox reconciliation worker, or Studio receipt verifier is running.
- Live provider, Roblox, browser, and Studio behavior remain externally unverified.

## 16. Unresolved decisions

- Which provider adapters and escalation budgets are approved for production?
- What is the per-dispatch bound versus total membership policy for large resumable packs?
- How are seed, depth-of-field, effects, and exact reproducibility represented across provider versions?
- Which trusted service proves universe access and creator destination at dispatch time?
- What exact badge spend and game-pass price policies are acceptable?
- Is owner-global reuse only private cross-project reuse, or will a separately reviewed multi-user catalog exist?
- What retention policy applies to rejected candidates, private masters, provider payloads, migration aliases, and deletion requests?
- What signed/session-bound Studio receipt format completes an application or replacement?

## 17. Prompt 3 readiness

The repository is ready to use this package as Prompt 3's contract and safe starting scaffold. It is not ready for production enablement.

Prompt 3 must first wire a single server-owned runtime around the operation ledger, authenticated authorization, immutable records, private storage, billing artifacts, provider adapters, consent, capability checks, reconciliation, moderation, and Studio receipts. It must then pass emulator concurrency/security tests, mocked interruption tests, controlled provider/Roblox staging, and manual Studio readback verification before enabling any external write or claiming Prompt 2 end-to-end completion.
