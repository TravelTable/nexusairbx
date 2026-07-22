# Roblox capability and scope matrix

Evidence date: 22 July 2026.

This matrix separates three different claims:

- **Provider** means Roblox documents an Open Cloud endpoint that accepts OAuth.
- **Adapter** means NexusRBX has a typed, server-owned implementation with scope
  and resource checks.
- **Route runtime** means the operation is executable through the current
  authenticated `POST /asset-platform/tools/:toolName` route, not merely
  represented by a capability ID.
- **Agent runtime** means `NaturalLanguageAssetToolAdapter` can compile a
  high-confidence asset request into frozen typed calls and `ChatAgentService`
  can execute them through `TaskIntakeService.executeAssetTool` and
  `TaskAssetToolDispatchService` with immutable task authority.

An operation is usable through the authenticated tool API only when the
provider, adapter, and route-runtime layers apply and its feature, policy,
creator, and executor gates are enabled. A capability definition alone does not
make an operation available. The existing agent runtime also invokes a bounded,
deterministic subset of the same canonical tools. It is not an unrestricted
model-selected tool interface: requests that lack canonical IDs, exact Studio
paths, or explicit monetization fields remain ordinary AI work or enter a
visible clarification/waiting state.

Official references used for this snapshot:

- [OAuth 2.0 reference](https://create.roblox.com/docs/cloud/auth/oauth2-reference)
- [OAuth scope reference](https://create.roblox.com/docs/cloud/reference/scopes)
- [Open Cloud OpenAPI description](https://create.roblox.com/docs/cloud/openapi.json)
- [Assets API](https://create.roblox.com/docs/cloud/reference/features/assets)
- [Badges API](https://create.roblox.com/docs/cloud/reference/features/badges)
- [Game Passes API](https://create.roblox.com/docs/cloud/reference/features/game-passes)
- [Developer Products API](https://create.roblox.com/docs/cloud/reference/features/developer-products)

Roblox marks asset creation and the game-pass and developer-product APIs as
beta in the current reference. NexusRBX keeps those calls behind typed adapters
and feature flags. Roblox can change beta request fields or availability; the
adapter and deterministic contract tests are the update boundary.

## OAuth scopes

| Capability | Scopes requested by NexusRBX | Default | Additional gate |
| --- | --- | --- | --- |
| Identity and connection | `openid`, `profile` | Yes | None |
| Asset metadata and upload | `asset:read`, `asset:write` | Yes | Upload policy and server write gates |
| Creator Store search | `creator-store-product:read` | Yes | None for reads |
| Game-pass reads | `game-pass:read` | No | `ROBLOX_GAME_PASS_CAPABILITIES_ENABLED=true` |
| Game-pass writes | `game-pass:read`, `game-pass:write` | No | Same flag, authorized universe, explicit high-write approval |
| Developer-product reads | `developer-product:read` | No | `ROBLOX_DEVELOPER_PRODUCT_CAPABILITIES_ENABLED=true` |
| Developer-product writes | `developer-product:read`, `developer-product:write` | No | Same flag, authorized universe, explicit high-write approval |
| Badge creation | `legacy-universe.badge:manage-and-spend-robux` | No | `ROBLOX_BADGE_CAPABILITIES_ENABLED=true` and payer-bound spend confirmation |

The product-default bundle is exactly `openid profile asset:read asset:write
creator-store-product:read`. Optional scopes are planned by
`RobloxCapabilityRegistry`; they are not added directly by feature endpoints.
Reauthorization preserves only scopes NexusRBX recognizes and only requests
enabled capabilities. `ROBLOX_OAUTH_PRIVATE_DEV_SCOPES` is a development-only
escape hatch for explicitly approved private-development scopes and must not be
used to widen production access casually.

## Operation support

| Operation | Provider | Adapter | Current runtime state |
| --- | --- | --- | --- |
| OAuth authorize, callback, refresh, status, revoke | Supported | Implemented in the shared OAuth broker | Wired |
| List granted creators and resources | Supported through token resources | Implemented with a server-owned allow-list | Wired |
| Select a user or group creator | Nexus selection policy | Implemented with provider-grant validation | Wired |
| Create an asset and read its operation | OAuth Assets API | Implemented in `RobloxOpenCloudClient` and `RobloxAssetPublishingService` | Executable through the authenticated route and bounded agent runtime; gated by policy and server write/upload flags |
| Read an asset, versions, or quota | OAuth Assets API | Implemented | Wired through authenticated Roblox routes |
| Update an asset or create a new asset version | Documented by Roblox | Not exposed by the canonical publisher | Unsupported in NexusRBX |
| Roll back, archive, or restore an asset | Documented by Roblox | Not implemented | Unsupported in NexusRBX |
| Search Creator Store | OAuth read scope | Existing shared client and route | Wired for reads |
| Create a badge | Official OAuth operation that may spend Robux | Shared capability/client compatibility path exists | Legacy compatibility only; not advertised by the 17 canonical tools and must remain payer-approved |
| Update a badge | No canonical provider contract selected | Not implemented | Unsupported in NexusRBX |
| Read, list, create, or update a game pass | Official OAuth beta API | Implemented in `RobloxMonetizationAdapter`; create/update perform readback | Create/update are canonical tools executable through the authenticated route and bounded agent runtime; list/get remain adapter operations |
| Read, list, create, or update a developer product | Official OAuth beta API | Implemented in `RobloxMonetizationAdapter`; create/update perform readback | Create/update are canonical tools executable through the authenticated route and bounded agent runtime; list/get remain adapter operations |
| Update experience icon or thumbnail artwork | Separate Roblox resource operation | No active registry capability or typed adapter | Unsupported in NexusRBX; no generic asset-upload fallback |
| Put a Roblox ID into Studio and read it back | Nexus Studio bridge operation | Implemented by the versioned Studio protocol | Gated on a live Studio session and Studio-apply flag |

The shared Open Cloud client and isolated monetization adapter contain some
overlapping game-pass request logic. The canonical executor is the side-effect
owner and delegates monetized writes to the adapter. Direct client helpers must
not independently retry the same command. `NaturalLanguageAssetToolAdapter`,
`TaskIntakeService.executeAssetTool`, `TaskAssetToolDispatchService`, and
`ChatAgentService` are active secured callers of that executor. The language
adapter accepts only bounded high-confidence shapes, emits at most six calls,
and never treats a bare Roblox number as a canonical NexusRBX asset ID.

## Agent request, Plan Mode, and Ask Mode boundary

The existing task runtime recognizes conservative request shapes for asset
generation, packs, variations, canonical search/reuse, publishing, Studio
implementation, and game-pass or developer-product create/update. Calls are
frozen into the task plan before execution, write idempotency keys are derived
server-side, and later call arguments may bind only to structured output from an
earlier call. Ambiguous creator selection, missing canonical IDs, unquoted
Studio paths, or incomplete monetization fields produce ordinary AI work or a
visible waiting/clarification state; they never produce a guessed provider ID
or write.

Plan and Ask Mode use `WorkflowAssetContextService` rather than conversation
text as an asset database. It owner-authorizes the active project and retrieves
a soft maximum of eight relevant canonical records using project, universe, and
conversation associations, with explicitly gated related-project reuse. Plan
lists reusable and missing assets from that context. Ask can report ownership,
Roblox IDs, upload/moderation status, and Studio usage only when those fields are
present in the safe canonical projection; otherwise it says that no canonical
record is available.

## File and asset-type handling

Canonical validation and Roblox publication are separate decisions. Roblox's
current Assets API documentation lists Audio, Decal, Image, Model, Mesh, and
Video as creation types. NexusRBX advertises only the intersection implemented
by its typed preparation and validation maps; passing NexusRBX validation does
not prove that the connected Roblox account, creator, or current beta endpoint
accepts that type.

| Canonical kind | NexusRBX preparation/validation | Roblox publication state |
| --- | --- | --- |
| `icon`, `image`, `decal`, `texture` | PNG, JPG, BMP, or TGA; up to 20 MiB and each dimension below 8,000 px; icons square | Eligible for typed asset creation where Roblox accepts the submitted `assetType`; final support is provider- and grant-dependent |
| `experience_marketing_image` | Same image validation, non-square permitted | Record and file support exist; publishing as experience artwork uses a different gated capability and is not a generic asset-update fallback |
| `badge_artwork`, `game_pass_artwork` | Same image validation; square required | Stored as artwork first; applying it to a Roblox object requires the matching object adapter and approval policy |
| `audio` | MP3, OGG, FLAC, or WAV; below 20 MiB, at most 7 minutes, at most 48 kHz, and 1, 2, 3, or 6 channels | Canonical file validation exists; live OAuth upload support must be confirmed for the connected creator and requested asset type before it is advertised as available |
| `model` | FBX; up to 20 MiB | Canonical file validation exists; provider beta/importer formats and creator eligibility must be confirmed. No update path is exposed |
| `badge`, `game_pass`, `developer_product` | Metadata objects, not uploaded files | Created or updated only through their typed resource adapters; never through the generic asset-file validator |

Image decoding checks dimensions and corruption. Optional rules check required
transparency or unexpected backgrounds. All file kinds check an allow-listed
format and MIME type, safe basename, non-empty bounded size, container signature,
and content hash. Canonical file updates are intentionally rejected with
`ASSET_UPDATE_UNSUPPORTED`; NexusRBX creates a new version/record rather than
silently overwriting an existing monetized or moderated resource.

Game-pass and developer-product icon attachments have a stricter provider
boundary: PNG, JPG, or BMP only, no more than 5 MiB, and decoded dimensions from
1x1 through 512x512 pixels. The typed monetization adapter fully decodes the
image before dispatch so a forged signature, corrupt file, or oversized image
cannot reach the Roblox write request.

## Creator and ownership resolution

Every external write resolves its creator in this order:

1. Creator explicitly selected for the current request.
2. Creator stored on the active NexusRBX project.
3. The only creator authorized by the current token.
4. `ROBLOX_CREATOR_AMBIGUOUS` when multiple valid creators remain.

The resolver then requires the selected user or group and, for universe-scoped
operations, the universe to appear in the token resource grant. A creator or
universe supplied by the browser or model is a requested identifier, not proof
of authorization. Reconnection refreshes grants without deleting project or
asset records.

## Unsupported operations and fallback policy

NexusRBX does not use `.ROBLOSECURITY` cookies, undocumented website endpoints,
or browser-held OAuth tokens. There is no hidden fallback when an Open Cloud
operation is unavailable. Unsupported cases remain local canonical assets and
return a structured capability, scope, resource, or operation error.

NexusRBX also does not:

- invent an asset ID when Roblox has only accepted an operation;
- insert a preview URL into Studio where a Roblox content ID is required;
- retry an unknown write outcome as a fresh create;
- silently change from a group creator to the connected user;
- treat moderation-pending as successful publication;
- overwrite or reconfigure monetized objects without the configured approval.

When Roblox is processing or moderating an accepted asset, the canonical record
stays in a visible waiting state. When an outcome is unknown, the operation is
reconciled by idempotency key, operation receipt, or provider readback before a
new write can be considered.
