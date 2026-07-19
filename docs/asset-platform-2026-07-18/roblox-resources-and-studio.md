# Roblox resources and Studio

## Capability truth comes first

Roblox operations are available only when all of the following are true:

1. NexusRBX has an implemented executor for the exact operation.
2. The operation is enabled by a product feature flag.
3. Current official Roblox support, endpoint, scopes, limits, and cost behavior have been verified for the deployed environment.
4. The authenticated OAuth connection has the required scopes.
5. The server verifies the creator and universe/resource target.
6. Required user consent or spend confirmation is durable and matches the request.
7. The operation ledger is reserved before dispatch.

Failure at any layer returns a typed unavailable, disabled, reauthorization_required, unauthorized, or confirmation_required result. Capability registry metadata alone does not prove that an executor or live provider support exists.

## Current capability matrix

[RobloxCapabilityRegistry.js](../../backend/src/services/RobloxCapabilityRegistry.js) defines resource capabilities behind default-off flags. [RobloxOpenCloudClient.js](../../backend/src/services/RobloxOpenCloudClient.js) implements only the methods shown below.

| Operation | Registry metadata | Client executor | Repository verification | Product status |
| --- | --- | --- | --- | --- |
| Create badge | Flag ROBLOX_BADGE_CAPABILITIES_ENABLED; spend-aware scope metadata | createBadge | Unit-tested with mocked provider responses | Feature-gated, default off; live support unverified |
| Read badge after create | Part of create verification | getBadge | Unit-tested | Feature-gated; live support unverified |
| Update badge | Capability metadata exists | None | None | Unavailable |
| Create game pass | Flag ROBLOX_GAME_PASS_CAPABILITIES_ENABLED | createGamePass | Unit-tested with mocked provider responses | Feature-gated, default off; live support unverified |
| Read game pass | Capability metadata exists | getGamePass | Unit-tested | Feature-gated; live support unverified |
| Update game pass | Capability metadata exists | None | None | Unavailable |
| Update experience artwork | Flag ROBLOX_EXPERIENCE_ARTWORK_CAPABILITIES_ENABLED and scope metadata | None | None | Unavailable |

The registry currently identifies scopes such as legacy-universe.badge:manage-and-spend-robux, legacy-universe.badge:write, game-pass:read, game-pass:write, and legacy-universe:manage. These names must be rechecked against current official Roblox documentation and a controlled staging application before enablement. This package does not assert that Roblox currently grants or supports them for this product.

## Capability response schema

The UI and agent need rich, typed capability metadata:

~~~json
{
  "id": "roblox_create_badge",
  "state": "disabled",
  "implemented": true,
  "featureFlag": "ROBLOX_BADGE_CAPABILITIES_ENABLED",
  "requiredScopes": ["provider-scope"],
  "missingScopes": [],
  "confirmation": {
    "type": "explicit_spend",
    "payerBound": true
  },
  "retryPolicy": "reconcile_before_retry",
  "verification": "provider_readback",
  "reasonCode": "FEATURE_DISABLED",
  "externallyVerifiedAt": null
}
~~~

Unknown capability IDs fail closed before OAuth lookup. Disabled capabilities should not prompt the user to reauthorize for scopes they cannot use.

## Upload destination and ownership

The default upload destination is the authenticated Roblox user selected through the server-side OAuth connection. Never default to a Nexus-owned creator or group.

Group uploads require:

- explicit user selection for this request or a durable project policy;
- a current server-side selected-creator snapshot;
- live capability/role verification where supported;
- the group/user ID and verification method recorded on the operation;
- a confirmation screen when destination materially changes.

The browser may display or request a creator ID, but cannot authorize it. [AssetRegistryService.js](../../backend/src/services/assetPlatform/AssetRegistryService.js) has destination-verification scaffolding; it does not prove universe ownership.

## Upload orchestration

For an approved asset version:

1. Re-read robloxAssetUploadsEnabled and authorization server-side.
2. Verify the exact version, content hash, artwork mode, export, destination, entitlement, and capability.
3. Reserve an operation using a stable idempotency key before any Roblox request.
4. Persist destination and export hash on the operation.
5. Dispatch once.
6. Persist provider operation/asset ID immediately if returned.
7. Poll/read back by durable provider ID.
8. Store the Nexus-to-Roblox relationship and exact rbxassetid URI.
9. Keep moderation unknown unless a live response says pending/approved/rejected.
10. On ambiguous outcome, reconcile before any retry.

If upload fails, the local master and version remain available. If moderation is pending or unknown, the UI offers polling and must not claim that Studio can safely use an approved asset.

## Badge creation

Badge artwork uses artworkMode badge_artwork and backgroundMode background_enabled. It is not passed through transparent game UI icon rules.

Create requires:

- verified universe and selected payer/creator;
- approved artwork version and uploaded remote artwork ID if the API requires one;
- expected cost from authoritative policy/provider data;
- explicit payer-bound spend confirmation that covers the exact request/cost ceiling;
- durable operation and idempotency key;
- one provider dispatch;
- stored badge ID plus provider readback before completed.

The current client enforces an expected cost and payer-bound confirmation and refuses to retry ambiguous writes. This behavior is unit-tested only. No live badge was created.

If the provider returns a badge ID but readback fails, preserve the known ID and return verification_unknown. Do not redispatch create.

## Game-pass creation and price policy

Game-pass artwork uses artworkMode game_pass_artwork and backgroundMode background_enabled.

The contract for price is:

- When the user requested a price, use that exact integer after authoritative bounds validation.
- When no price was requested, a server-configured bounded default policy may choose one.
- Record requestedPrice, effectivePrice, priceSource (user_exact or server_default), policyVersion, reason, providerResult, and readbackPrice.
- Never silently substitute, clamp, or convert a requested price.
- If the provider rejects the price, return a typed deterministic failure and preserve the operation.

The current createGamePass method defaults an omitted price to 0 and does not persist a source/reason policy. Therefore callers must supply an exact validated price until the bounded default policy is implemented. Do not expose the implicit zero default as product behavior.

Provider success is not complete until the pass ID is durable and authenticated creator readback verifies universe, creator, and effective price where the API exposes them.

## Artwork updates

Experience artwork updates and badge/game-pass artwork updates are unavailable in the current client. The product must not:

- expose an enabled action based only on registry metadata;
- upload an image and claim the resource artwork changed;
- treat an asset relationship as a resource update;
- reuse a badge/pass create endpoint as an update;
- claim moderation or propagation without live readback.

When implemented, each update needs its own operation type, prior-state snapshot/readback, target remote resource ID, exact artwork version/hash, capability check, provider operation ID, and post-update verification.

## Unknown external write outcomes

[RobloxOpenCloudClient.js](../../backend/src/services/RobloxOpenCloudClient.js) classifies network failures, timeouts, selected transient HTTP statuses, and accepted responses without a durable ID as outcome unknown. This is the correct safety posture.

Reconciliation order:

1. Query the provider operation ID if one exists.
2. Read the known remote object ID if one exists.
3. Use an authoritative, tightly filtered creator/universe listing if the provider supports it.
4. Match operation time, exact normalized name/description, destination, price/cost, and artwork hash where exposed.
5. Resolve only a unique deterministic match.
6. Otherwise retain outcome_unknown and require manual review.

Automatic create retry is forbidden while the outcome is unknown. A new user-approved operation may be possible only after reconciliation proves the first create did not happen.

## Resource moderation

Resource and artwork moderation are separate:

- artwork asset upload may have its own moderation state;
- badge/game-pass resource availability may have a resource state;
- a created resource can exist while its image is pending or rejected;
- cached display or propagation delay is not approval evidence.

Store source, provider state, checkedAt, and the relationship/version checked. Unknown is the safe migration and error fallback.

## Studio is a separate trust boundary

The Roblox Studio plugin talks to the live open place. It is the only layer that can verify an in-place reference mutation. The backend’s persisted manifest may be stale, and a queued/acknowledged command does not prove application.

Prompt 2 must reuse the versioned command definitions in [studioToolProtocol.js](../../backend/src/lib/studioToolProtocol.js) and the manual validation expectations in [studio-tool-protocol.md](../studio-tool-protocol.md). It must not send the full place source to the model by default.

### Read before write

1. Confirm the Studio bridge is connected and the live place/universe matches the authorized target.
2. Queue get_project_manifest.
3. Search the manifest/source index.
4. Read only the specific scripts/instances needed.
5. For a known script edit, include expectedSourceHash.
6. For destructive actions, snapshot first and retain snapshot IDs.

### Exact asset application

The exact Roblox content property value is:

~~~text
rbxassetid://<verified numeric Roblox asset ID>
~~~

Never use a Nexus asset ID, provider operation ID, upload URL, web URL, or bare unverified number.

Application flow:

1. Confirm the relationship belongs to the intended Nexus asset/version and its upload/moderation policy permits use.
2. Verify the numeric Roblox asset ID and construct the URI server-side using the canonical helper.
3. Resolve an exact Studio target: place, instance path/debug ID, property, or specific script plus expected source hash.
4. Snapshot if destructive.
5. Queue the versioned command with an operation/reference ID.
6. Wait for a structured command acknowledgment.
7. Issue a readback command against the exact property/source.
8. Compare the returned value/hash to the expected URI/content.
9. Store a trusted receipt and mark usage verified only on match.

If Studio is disconnected, the place differs, the command is unsupported, the target is ambiguous, the expected hash conflicts, acknowledgment is lost, or readback differs, return studio_unavailable, studio_target_conflict, outcome_unknown, or studio_verification_failed. Never claim applied.

### Studio receipt

~~~json
{
  "referenceId": "ref_...",
  "studioSessionId": "session_...",
  "placeId": "verified-live-place-id",
  "commandId": "cmd_...",
  "protocolVersion": 1,
  "target": {
    "instance": "exact-target",
    "property": "Image"
  },
  "before": {
    "value": "rbxassetid://111"
  },
  "requested": {
    "value": "rbxassetid://222"
  },
  "readback": {
    "value": "rbxassetid://222",
    "verified": true
  },
  "snapshotIds": ["snapshot_..."],
  "verifiedAt": "server timestamp"
}
~~~

The bridge/server must bind receipts to an authenticated Studio session and reject browser-authored receipts.

## Current integration limitations

- No /api/asset-platform router orchestrates Roblox upload/resource calls.
- The current agent tools do not expose the canonical resource contracts.
- Badge/pass create/read methods are default-off and unit-tested with mocks only.
- Badge update, game-pass update, and experience-artwork update have no executor.
- Current game-pass default pricing does not meet the recorded policy contract.
- Current universe binding does not include ownership/access readback.
- No Prompt 2 path constructs a Studio command, queues it, and records exact readback.
- No live Roblox API, moderation, Robux-spend, or Studio application was verified in this work.
