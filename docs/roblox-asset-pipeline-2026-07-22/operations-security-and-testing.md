# Roblox asset pipeline operations, security, and testing

Audit date: 22 July 2026.

This runbook covers the server-owned NexusRBX Roblox asset pipeline. It must be
used together with the [implementation audit](./README.md), the
[Roblox capability matrix](./roblox-capabilities.md), the
[changed-file inventory](./changed-files.md), the
[OAuth token-broker runbook](../roblox-oauth-token-broker.md), and the
[Studio protocol](../studio-tool-protocol.md).

The rollout is intentionally deny-by-default. Enabling a page or read route
does not authorize generation, Roblox publishing, monetized-object changes, or
Studio writes.

## Required Roblox OAuth configuration

Register this exact callback in the Roblox OAuth application:

```text
https://<backend-host>/api/roblox/oauth/callback
```

Configure these backend-only environment variables:

```text
ROBLOX_OAUTH_CLIENT_ID=<Roblox OAuth application client ID>
ROBLOX_OAUTH_CLIENT_SECRET=<Roblox OAuth application client secret>
ROBLOX_OAUTH_REDIRECT_URI=https://<backend-host>/api/roblox/oauth/callback
ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEYS={"2026-07":"<32-byte base64 key>"}
ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEY_ID=2026-07
ROBLOX_OAUTH_PRIVATE_DEV_SCOPES=false
```

The OAuth client secret, encryption keys, token envelopes, access tokens,
refresh tokens, authorization codes, PKCE verifiers, and ID tokens must exist
only in the backend secret store and Firestore token records. They must never be
copied into frontend environment variables, Studio plugin settings, telemetry,
asset metadata, prompts, or model tool results.

The default requested scopes are:

```text
openid profile asset:read asset:write creator-store-product:read
```

Optional capabilities add only their own scopes and remain disabled until their
feature flag is enabled:

| Feature flag | Additional scopes |
| --- | --- |
| `ROBLOX_GAME_PASS_CAPABILITIES_ENABLED=true` | `game-pass:read game-pass:write` |
| `ROBLOX_DEVELOPER_PRODUCT_CAPABILITIES_ENABLED=true` | `developer-product:read developer-product:write` |
| `ROBLOX_BADGE_CAPABILITIES_ENABLED=true` | `legacy-universe.badge:manage-and-spend-robux` |

The Roblox application must be approved for each optional beta scope before
that flag is enabled. Existing connections need one reauthorization when their
grant does not include a newly enabled scope; routine operations do not require
reconnecting again after a valid grant is stored.

## Asset-platform feature gates

All asset-platform gates default to `false` in `backend/.env.example`:

```text
ASSET_PLATFORM_READS_ENABLED=false
ASSET_PLATFORM_WRITES_ENABLED=false
ASSET_PLATFORM_AGENT_TOOLS_ENABLED=false
ASSET_PLATFORM_SEMANTIC_SEARCH_ENABLED=false
ASSET_PLATFORM_UNIVERSE_SHARING_ENABLED=false
ASSET_PLATFORM_USER_GLOBAL_ENABLED=false
ASSET_PLATFORM_ROBLOX_UPLOAD_ENABLED=false
ASSET_PLATFORM_STUDIO_APPLY_ENABLED=false
ROBLOX_BADGE_CAPABILITIES_ENABLED=false
ROBLOX_GAME_PASS_CAPABILITIES_ENABLED=false
ROBLOX_DEVELOPER_PRODUCT_CAPABILITIES_ENABLED=false
```

The canonical singleton is registered under the exact contract
`asset-platform-canonical-v1` and is used by the authenticated
`POST /asset-platform/tools/:toolName` route. `TaskIntakeService.executeAssetTool`
and `TaskAssetToolDispatchService` are secured execution seams to the same
executor, not a second side-effect owner. `NaturalLanguageAssetToolAdapter`
compiles bounded high-confidence requests into frozen typed calls, and the
existing `ChatAgentService` launch path executes those calls before artifact
redispatch. It emits no more than six calls, requires canonical NexusRBX asset
IDs for asset reuse, requires exact quoted Studio instance paths for Studio
writes, and requires explicit universe, name, and Robux fields for monetization.
This is active deterministic dispatch, not unrestricted model-selected tool
access. Keep the main task-runtime migration flags on their
environment-approved values; never run a legacy and canonical provider write
for the same command.

Restart-time upload status reconciliation has its own deny-by-default worker
gate:

```text
RUN_JOB_WORKER=true
RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER=true
ROBLOX_ASSET_RECONCILIATION_POLL_MS=30000
ROBLOX_ASSET_RECONCILIATION_BATCH_LIMIT=25
```

`RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER` defaults to `false` and is honored
only when `RUN_JOB_WORKER=true`. Enable both only on the sole dedicated worker,
never on web/API replicas. Polling defaults to 30 seconds and is bounded from 5
seconds through 15 minutes; the batch defaults to 25 and is bounded from 1
through 100. The worker prevents overlapping runs and drains its in-flight batch
on graceful shutdown.

Configure the server-owned file/provider boundary before enabling generation:

```text
ASSET_STORAGE_BUCKET=<private Firebase Storage bucket>
ASSET_IMAGE_LOW_COST_PROVIDER=gpt-image
```

The user's `robloxAssetUploadsEnabled` / **Auto Upload Assets** preference is a
separate master write-consent check. Server-side policy must reject Roblox
writes when it is disabled, even if every environment flag is true.

## Recommended rollout order

1. Deploy the OAuth broker, token-encryption keyring, canonical models, read
   routes, and migrations with every asset write flag disabled.
2. Run both migrations in dry-run mode. Resolve ownership conflicts and
   quarantine issues before applying anything.
3. Apply and reconcile the migrations. Confirm legacy records are unchanged.
4. Enable `ASSET_PLATFORM_READS_ENABLED` for internal users and verify owner,
   project, creator, universe, and exact-ID retrieval boundaries.
5. Enable semantic retrieval and sharing gates independently. Verify that
   project sharing does not become cross-user access.
6. Verify the deployed singleton contract is `asset-platform-canonical-v1`, then
   enable platform writes and agent tools for a controlled cohort. Keep Roblox
   upload and Studio apply disabled.
7. Deploy `backend/firestore.indexes.json` and wait until the collection-group
   index on `assetRegistry(uploadStatus ASC, updatedAt ASC)` reports ready.
8. Enable Roblox upload for a controlled account or group, run the opted-in
   integration test, and inspect operation completion, moderation, readback,
   duplicate prevention, and recovery telemetry.
9. On the sole `RUN_JOB_WORKER=true` instance only, enable
   `RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER`, then restart that worker with a
   controlled submitted operation. Verify the stored operation is resumed and
   no second create request is issued. Leave the flag off on every web replica.
10. Enable Studio apply only after the generated plugin is installed and the
   versioned protocol checks pass against a disposable test place.
11. Enable optional game-pass or developer-product beta flags only after the
   Roblox application has the corresponding scopes and the canonical
   executor-to-monetization-adapter readback path passes in a disposable
   universe.

At each stage, rollback means disabling the newest feature flag. Do not remove
token-encryption keys, migration provenance, canonical records, operation
receipts, or final Roblox IDs during rollback.

## Database migrations

Both migrations are additive, bounded, resumable, and dry-run by default. They
do not call Roblox and do not delete legacy records.

First inventory and migrate the original legacy ontology:

```bash
cd backend
node scripts/backfillAssetPlatform.js --dry-run --max-records=500
node scripts/backfillAssetPlatform.js --apply --max-records=500
```

If the summary returns `nextCursor`, continue with the same source selection:

```bash
node scripts/backfillAssetPlatform.js --apply --source=styleProfiles,assetGenerations,robloxAssetBindings --cursor='<nextCursor>' --max-records=500
```

Then fill and reconcile canonical version 3 records:

```bash
npm run test:asset-migration-v3
npm run migrate:asset-platform-v3 -- --dry-run --max-records=500
npm run migrate:asset-platform-v3 -- --apply --max-records=500
npm run migrate:asset-platform-v3 -- --reconcile-only --max-records=500
```

Use `--owner-uid=<firebase-uid>` for a controlled canary. Use `--source=...`
and the emitted `--cursor=...` for bounded continuation. `--restart` performs an
idempotent rescan and must be used only after retaining the previous summary.
`--reconcile-only` cannot be combined with `--apply`.

Keep the JSON summaries as deployment evidence. Stop before apply when the dry
run reports ambiguous ownership, target conflicts, unexpected record counts, or
unresolved quarantine issues.

## Deterministic verification

Run the narrow checks first:

```bash
cd backend
node --check src/lib/assetPlatformObservability.js
node --check src/lib/conversationalChat.js
node --check src/lib/robloxOAuthStateBinding.js
node --check src/integration/robloxAssetPipeline.integration.test.js
node --check src/routes/workflowConversational.js
node --check src/services/RobloxDecalUploadService.js
node --check src/services/WorkflowAssetContextService.js
node --check src/services/assetPlatform/CanonicalAssetToolExecutor.js
node --check src/services/assetPlatform/CanonicalUserUploadService.js
node --check src/services/assetPlatform/AssetPublishingReconciliationService.js
node --check src/services/assetPlatform/RobloxMonetizationAdapter.js
node --check src/services/taskRuntime/NaturalLanguageAssetToolAdapter.js
node --check src/services/taskRuntime/TaskAssetToolDispatchService.js
node --check src/workers/assetPublishingReconciliationWorker.js
node --test \
  src/lib/conversationalChat.test.js \
  src/lib/assetPlatformObservability.test.js \
  src/services/RobloxDecalUploadService.test.js \
  src/services/WorkflowAssetContextService.test.js \
  src/services/assetPlatform/AssetValidationService.test.js \
  src/services/assetPlatform/CanonicalAssetToolExecutor.test.js \
  src/services/assetPlatform/CanonicalUserUploadService.test.js \
  src/services/assetPlatform/RobloxAssetPublishingService.test.js \
  src/services/assetPlatform/RobloxMonetizationAdapter.test.js \
  src/services/assetPlatform/TaskAssetToolAdapter.test.js \
  src/services/taskRuntime/NaturalLanguageAssetToolAdapter.test.js \
  src/services/taskRuntime/TaskIntakeService.test.js \
  src/services/taskRuntime/TaskAssetToolDispatchService.test.js \
  src/services/agentV2/ChatAgentService.test.js \
  src/routes/workflowConversational.test.js \
  src/routes/assetPlatform.test.js
node --test \
  src/services/assetPlatform/AssetPublishingReconciliationService.test.js \
  src/workers/assetPublishingReconciliationWorker.test.js
node --test \
  scripts/backfillAssetPlatform.test.js \
  scripts/backfillAssetPlatformV3.test.js
npm run test:asset-migration-v3
node --test \
  src/lib/robloxOAuthStateBinding.test.js \
  src/services/RobloxOidcVerifier.test.js \
  src/services/RobloxTokenStore.test.js \
  src/services/RobloxCreatorResolver.test.js \
  src/services/RobloxOAuthService.test.js
```

Then run the repository-required checks for the areas changed by a rollout:

```bash
cd backend
node --test src/lib/studioToolProtocol.test.js
node --check server.js
cd ..
CI=true npm test -- --watchAll=false
npm run build
```

Use the project's existing Firestore-emulator command when validating
authorization and concurrency against persistence:

```bash
cd backend
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:firestore
```

These tests mock provider responses and are deterministic. They do not prove
that a production Roblox application's redirect URI, scopes, creator grants,
universe grants, moderation behavior, or beta enrollment are correct.

## Controlled Roblox integration test

The integration test is skipped unless explicitly opted in. The read/status
path requires a controlled Firebase user whose Roblox connection already
exists:

```bash
cd backend
NEXUS_ROBLOX_INTEGRATION_ENABLED=true \
NEXUS_ROBLOX_INTEGRATION_FIREBASE_UID='<firebase-uid>' \
NEXUS_ROBLOX_INTEGRATION_CREATOR_TYPE='User' \
NEXUS_ROBLOX_INTEGRATION_CREATOR_ID='<roblox-user-id>' \
NEXUS_ROBLOX_INTEGRATION_EXPECT_SCOPES='openid profile asset:read asset:write' \
npm run test:roblox-asset-integration
```

Use `NEXUS_ROBLOX_INTEGRATION_CREATOR_TYPE=Group` for a controlled authorized
group. Optional read checks are:

```text
NEXUS_ROBLOX_INTEGRATION_FORCE_REFRESH=true
NEXUS_ROBLOX_INTEGRATION_RESOURCE_TYPE=<provider resource type>
NEXUS_ROBLOX_INTEGRATION_RESOURCE_ID=<positive Roblox ID>
NEXUS_ROBLOX_INTEGRATION_ASSET_ID=<existing readable asset ID>
NEXUS_ROBLOX_INTEGRATION_POLL_TIMEOUT_SECONDS=180
```

The persistent upload case has two additional interlocks and requires a unique
run ID and a regular PNG or JPEG fixture no larger than 5 MiB:

```bash
cd backend
NEXUS_ROBLOX_INTEGRATION_ENABLED=true \
NEXUS_ROBLOX_INTEGRATION_ALLOW_WRITES=true \
NEXUS_ROBLOX_INTEGRATION_ACKNOWLEDGE_PERSISTENT_ASSET=YES \
NEXUS_ROBLOX_INTEGRATION_FIREBASE_UID='<firebase-uid>' \
NEXUS_ROBLOX_INTEGRATION_CREATOR_TYPE='Group' \
NEXUS_ROBLOX_INTEGRATION_CREATOR_ID='<authorized-group-id>' \
NEXUS_ROBLOX_INTEGRATION_RUN_ID='<unique-audit-id>' \
NEXUS_ROBLOX_INTEGRATION_UPLOAD_FILE='/absolute/path/to/controlled-fixture.png' \
NEXUS_ROBLOX_INTEGRATION_UPLOAD_ASSET_TYPE='Image' \
npm run test:roblox-asset-integration
```

This creates a real Roblox asset that persists after the test. It must never be
run against an incidental user or production group. The test uses an internal
idempotency key, waits for a final asset ID for at most 300 seconds, and reads
the final asset back through OAuth. It deliberately does not delete the asset or
use a cookie-authenticated cleanup endpoint.

## Lifecycle and recovery

The implemented UI carries this lifecycle across `/tools/icon-generator`,
`/assets`, `/assets/:assetId`, the AI workspace asset context, and Plan Mode.
Generation creates or updates the canonical record first; a publishing failure
keeps that local record visible for review, retry, or creator correction. The
library and detail view expose search, project/creator/type filtering, packs,
processing and moderation state, publish/retry, project attachment, variation,
matching-pack, Studio implementation, and archive actions through the same
canonical API rather than a page-local asset store.

| Visible state | Operator/user action |
| --- | --- |
| Generating / Preparing | Keep the operation record; do not submit a second charged generation while the first lease is active. |
| Validation failed | Show the violated format, MIME, size, dimension, corruption, transparency, or background rule; repair locally before publishing. |
| Ready to publish | Resolve server-authorized creator and policy. Do not infer permission from a frontend selector. |
| Publishing | Preserve the idempotency key and operation receipt. A network timeout after submission is an unknown outcome, not permission to create again. |
| Roblox processing | Resume bounded polling from the durable operation record. Do not insert a temporary URL or incomplete operation ID into Studio. |
| Under moderation | Keep the asset visible as pending and poll later. Moderation pending is not publication success. |
| Ready | Persist the exact final Roblox asset ID and verified creator before Studio implementation. |
| Implementing / Implemented | Record the instance path, property, old reference, new reference, command receipt, and readback result. |
| Permission required | Re-evaluate scopes and token resources; never switch creator silently. |
| Reconnection required | Reconnect the same stable Roblox user ID. Keep projects, assets, packs, and Studio receipts. |
| Failed | Return the structured code, safe provider status, retry classification, and reconciliation instructions. Do not expose raw response bodies containing credentials or private content. |

Common structured recovery codes are:

| Error | Recovery |
| --- | --- |
| `ROBLOX_NOT_CONNECTED` | Connect Roblox once, then retry the canonical operation. |
| `ROBLOX_REAUTH_REQUIRED` | Reauthorize; project and asset data remain intact. |
| `ROBLOX_SCOPE_MISSING` | Enable only the required capability and reauthorize for its documented scope. |
| `ROBLOX_CREATOR_NOT_AUTHORIZED` | Choose a creator present in the token grant or reconnect an account authorized for that creator. |
| `ROBLOX_RESOURCE_NOT_AUTHORIZED` | Grant the connected application access to the requested universe/resource; do not trust a supplied ID alone. |
| `ASSET_TYPE_UNSUPPORTED` / `ASSET_VALIDATION_FAILED` | Keep the local record, select a supported typed adapter, or fix the file. |
| `ASSET_DUPLICATE` | Reuse the existing canonical asset or explicitly create a variation; do not upload the same bytes blindly. |
| `ASSET_UPLOAD_REJECTED` | Show the safe Roblox error and whether correction or reauthorization is required. |
| `ASSET_PROCESSING_TIMEOUT` / `ASSET_MODERATION_PENDING` | Keep polling from the durable receipt; do not create another upload. |
| `ASSET_MODERATION_FAILED` / `ASSET_ID_UNAVAILABLE` | Preserve failure evidence and require correction or reconciliation before retry. |
| `STUDIO_NOT_CONNECTED` | Keep the asset ready and resume implementation after Studio reconnects. |
| `STUDIO_ASSET_IMPLEMENTATION_FAILED` / `STUDIO_ASSET_VERIFICATION_FAILED` | Reinspect the exact target and property; preserve unrelated properties and the failed receipt. |

After Roblox accepts an upload, the first persistence attempt stores its
provider operation receipt in the side-effect ledger before the canonical asset
is updated. A process crash before that first ledger commit is an irreducible
window because no durable local record can identify the accepted provider
operation. If the ledger commit succeeds but the canonical update does not,
retrying the same idempotent request recovers the ledger-only receipt and settles
the canonical asset without a replacement create.

After a backend restart, the reconciliation worker selects the oldest canonical
records in `submitted`, `roblox_processing`, or `under_moderation`, reloads the
exact user-owned document, and polls only its already-stored Roblox operation
ID through `getUploadStatus`. It never issues a replacement create request.
Candidates are rejected unless the canonical path, `ownerUid`, `assetId`,
operation ID, and pending status still match. A failed check records only a safe
error code, retryability, retry class, and timestamp. The
`assetRegistry(uploadStatus ASC, updatedAt ASC)` collection-group index must be
ready before enabling the worker. To pause or roll back recovery, disable
`RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER`; retain operation receipts and
canonical asset records so reconciliation can resume safely later. The worker
does not scan `assetOperations` for ledger-only receipts, so those receipts are
recovered on an idempotent request retry rather than proactively after restart.

Explicit confirmation remains required for ambiguous creators, Roblox fees,
changes to existing monetized items, overwrite/reconfiguration, uncertain
generated content, and unexpected price or permission responses. Routine
publishing that is already covered by an explicit request, unambiguous creator,
valid OAuth grant, project policy, and Auto Upload consent does not need another
confirmation.

## Telemetry and privacy

`backend/src/lib/assetPlatformObservability.js` defines an allowlisted event
boundary for generation, validation, deduplication, Roblox publication and
processing, moderation, Studio implementation/readback, refresh failures, and
reconnection requirements. It defines the following product metrics:

- asset-generation success rate;
- verified Roblox publishing success rate;
- upload processing duration;
- moderation outcomes;
- OAuth refresh failures and reconnection frequency;
- duplicate generation or uploads avoided;
- assets implemented in Studio;
- Studio verification success rate.

Only bounded scalar identifiers, types, states, durations, attempt counts, safe
error codes, and retry classifications are accepted. Unknown fields and nested
objects are discarded. Do not add access or refresh tokens, authorization
headers, client secrets, token envelopes, prompts, source/processed file data,
private file contents, local paths, preview URLs, or provider response bodies to
the allow-list.

The helper is non-throwing when used through
`tryEmitAssetPipelineEvent`, so telemetry failure cannot fail a generation,
upload, or Studio write. Roblox publication/processing/moderation and canonical
generation/validation services contain event call sites. The allow-list is the
contract: event names at every call site must include their `asset.` or
`roblox.` prefix or the non-throwing helper discards them. OAuth and Studio
metric definitions still require verified lifecycle call sites in the deployed
composition. Verify every call site and a redacted sample in the telemetry sink
before relying on a dashboard.

## Security review checklist

- OAuth uses authorization code flow, PKCE, one-time state bound to the
  initiating browser by a short-lived HttpOnly SameSite=Lax host cookie, nonce,
  verified OIDC issuer/audience/signature/time claims, and stable numeric `sub`.
  The callback verifies that browser binding before consuming state or
  exchanging the authorization code.
- Refresh tokens are AES-256-GCM encrypted and refresh rotation is committed
  atomically under a Firestore lease, fence, and expected version.
- An unknown refresh outcome invalidates credentials and requires reconnection
  instead of replaying a possibly consumed refresh token.
- Every write authenticates the Firebase user, reloads current Roblox grants,
  resolves one creator, and checks any universe/resource server-side.
- Canonical tool inputs receive capability and asset metadata only. They have no method
  to retrieve an OAuth credential.
- Natural-language dispatch is a bounded deterministic compiler, not arbitrary
  model-selected execution. It emits at most six frozen calls, requires exact
  canonical asset IDs and quoted Studio targets, and derives authorization,
  consent, creator, universe, and idempotency authority from server records.
- Plan and Ask retrieval reauthorizes project ownership, returns a soft maximum
  of eight relevant safe canonical records, and strips credential-shaped fields.
  Ask must report that no canonical record is available instead of inferring an
  ID, owner, processing state, or Studio location from conversation text.
- Uploads enforce size, type, signature, filename, path, corruption, dimension,
  and duplicate rules before an external request.
- The legacy decal compatibility route hashes the normalized uploaded PNG bytes
  and binds its idempotency key to the authenticated NexusRBX owner, fixed asset
  type, and authorized creator type and ID. The shared Open Cloud client writes
  the accepted operation receipt before polling, so a retry reuses a final
  result or resumes its known operation rather than issuing another create.
- External create retries use the operation ledger and reconcile unknown
  outcomes before another provider call.
- The provider receipt is persisted to the operation ledger before the
  canonical asset after acceptance. The pre-first-commit crash window remains
  irreducible; a ledger-only receipt requires an idempotent request retry because
  the restart worker scans canonical pending assets, not the operation ledger.
- Restart reconciliation reloads the exact user-owned canonical path and
  verifies `ownerUid`, `assetId`, operation ID, and pending status before any
  Roblox status read. It never performs provider create, and persists only
  allowlisted failure metadata.
- Accepted upload is distinct from final asset ID and moderation completion.
- Studio rejects nonnumeric or forged references, inspects the target before
  mutation, and verifies the same property afterward.
- Logs and telemetry are sampled for credential-like names and private content;
  credential fields must be rejected rather than redacted after logging.
- No `.ROBLOSECURITY` cookie or undocumented Roblox website endpoint is used as
  a fallback.
- Encryption-key rotation keeps every referenced historical key until all
  envelopes have been migrated and verified.

## Manual environment verification

Before calling an environment production-ready, an operator must still:

1. Register and compare the exact redirect URI in Roblox and the backend.
2. Install production OAuth secrets, the private asset storage bucket/provider
   configuration, and at least one valid encryption key without printing them
   in command output.
3. Connect a controlled Roblox account; verify stable user ID, display fields,
   scopes, token health, creator list, and universe resource grants.
4. Run migration dry runs, apply a canary owner, reconcile it, then expand in
   bounded pages.
5. Run deterministic tests and the read-only controlled Roblox test.
6. Deploy `backend/firestore.indexes.json`, wait until the
   `assetRegistry(uploadStatus ASC, updatedAt ASC)` collection-group index is
   ready, and keep reconciliation disabled until that completes.
7. Deliberately acknowledge and run the persistent upload test against the
   controlled creator; retain the final asset ID and operation receipt.
8. Enable `RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER=true` on exactly one
   `RUN_JOB_WORKER=true` instance. Restart it with a controlled pending upload,
   verify polling resumes from the stored operation ID, and confirm that no
   second create request occurs.
9. Install `roblox-plugin/NexusRBXStudioBridge.plugin.lua` in a disposable test
   place; implement a known asset, reinspect it, and retain the verification
   receipt.
10. Verify Auto Upload disabled blocks all Roblox writes, creator ambiguity
   requests a selection, missing scope requests reauthorization, and a
   disconnected Studio leaves implementation waiting.
11. If enabling monetization beta APIs, confirm the Roblox application actually
   has the beta scopes, use a disposable universe, verify provider readback, and
   confirm no second runtime owner can submit the same create.
12. Inspect telemetry samples and operational logs for token-like fields,
    private content, unbounded errors, and duplicate provider submissions.

No live Roblox call is part of the default test suite. Provider-side token
rotation, revocation, beta enrollment, upload moderation, thumbnail readiness,
and persistent asset creation remain unverified until the controlled integration
path is run in the target environment.
