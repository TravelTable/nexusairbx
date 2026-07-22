# Roblox OAuth token broker

NexusRBX uses the existing server-owned Roblox OAuth 2.0 connection. Browsers,
the Studio plugin, and the AI runtime receive only redacted connection,
capability, creator, and resource metadata. They never receive an access token,
refresh token, client secret, authorization code, PKCE verifier, or ID token.

## Roblox application configuration

Configure the Roblox OAuth application with the exact HTTPS production callback
served by the backend:

```text
https://<backend-host>/api/roblox/oauth/callback
```

For local development the callback can be the value in
`backend/.env.example`. The application must permit the configured redirect URI.
NexusRBX always requests `openid` and `profile`; the default asset workflow also
requests `asset:read`, `asset:write`, and `creator-store-product:read`. Additional
scopes are selected by `RobloxCapabilityRegistry` for enabled capabilities. Do
not add broad scopes directly to an endpoint. Optional Roblox capability flags
must be enabled before their scopes are requested.

The default and optional scope contracts are documented in Roblox's official
[scope reference](https://create.roblox.com/docs/cloud/reference/scopes) and in
the NexusRBX [capability matrix](./roblox-asset-pipeline-2026-07-22/roblox-capabilities.md).
The current optional bundles are:

| Server capability | Additional scope |
| --- | --- |
| Game passes | `game-pass:read game-pass:write` |
| Developer products | `developer-product:read developer-product:write` |
| Legacy-compatible badge creation | `legacy-universe.badge:manage-and-spend-robux` |

Enabling one of these capabilities changes the requested grant. Existing users
reauthorize once when the stored grant lacks that scope; routine operations use
the brokered connection and do not require a fresh login.

Roblox currently labels OAuth 2.0 as beta. Before enabling live writes, verify
the registered callback, requested scopes, granted creator/resource targets,
and the controlled-account flow against the current Roblox application. NexusRBX
does not use `.ROBLOSECURITY`, cookie-authenticated endpoints, or undocumented
fallbacks when an OAuth capability is absent.

Required server environment:

```text
ROBLOX_OAUTH_CLIENT_ID
ROBLOX_OAUTH_CLIENT_SECRET
ROBLOX_OAUTH_REDIRECT_URI
ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEYS
ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEY_ID
```

Optional connection-status cache controls are server-only and may be tuned
without changing OAuth grants:

```text
ROBLOX_OAUTH_STATUS_CACHE_TTL_MS=5000
ROBLOX_OAUTH_STATUS_STALE_TTL_MS=300000
ROBLOX_OAUTH_STATUS_RETRY_AFTER_MS=30000
```

`ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEYS` accepts a JSON object or a comma-separated
`key-id=key` list. Values should be independently generated 32-byte random keys
encoded as base64 (or 64-character hex). `ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEY` is
read only as a compatibility key for existing deployments.

## Authorization and identity verification

The broker uses authorization code flow with PKCE. Each attempt stores a
short-lived, single-use server record containing a hashed state value, nonce,
PKCE verifier, initiating Firebase UID, and approved return path. The start
response also binds that exact state to the initiating browser in a short-lived,
HttpOnly, SameSite=Lax, host-only cookie. The frontend includes credentials only
for same-origin Nexus API requests. The callback timing-safely verifies the
browser binding before it consumes the server record or exchanges the code,
then:

1. Loads Roblox's OpenID discovery document and JWKS over HTTPS.
2. Verifies the ID-token signature, approved algorithm, issuer, audience, time
   claims, nonce, and stable numeric subject.
3. Requires the UserInfo subject to match the ID-token subject.
4. Loads `/token/resources` and saves only creators and resources granted to the
   token.

The stable Roblox user ID (`sub`) is the account key. Username and display name
are display-only profile fields and may change.

## Encrypted token lifecycle

Refresh and access tokens are stored as versioned AES-256-GCM envelopes. Each
envelope has a key ID and authenticated context binding it to the Firebase UID,
token kind, and schema version. Copying a token envelope to another user or
swapping access and refresh envelopes therefore fails authentication.

Roblox's current OAuth reference documents authorization codes as single-use
with a one-minute lifetime, access tokens with a 15-minute lifetime, and refresh
tokens as single-use with a 90-day lifetime. The broker treats the provider's
returned expiry metadata as authoritative, refreshes access tokens before a
Roblox operation when needed, and never assumes a locally cached token remains
valid beyond that metadata.

Rotating refresh tokens are protected by a Firestore transaction lease with a
monotonic fence and expected token version. Only the lease holder may commit the
new access/refresh pair, and both values are written atomically. Other backend
instances wait for that committed version instead of reusing the single-use
refresh token. If transport fails after a refresh request was sent and Roblox's
outcome is unknowable, the broker removes both credentials and requires one
reconnection rather than risk replaying a consumed token.

To rotate encryption keys:

1. Add the new key without removing the old key.
2. Set `ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEY_ID` to the new key ID and deploy.
3. Run or allow the v1 envelope migration while all historical keys remain
   configured.
4. Confirm no records reference the retired key ID before removing that key.

Removing a referenced key before migration makes the connection unreadable.
Never log encryption key values or token envelopes.

## Creator and resource authorization

Creator selection is evaluated server-side for every write:

1. Creator explicitly selected for the current operation.
2. Creator saved on the active project.
3. The only creator authorized by the token.
4. `ROBLOX_CREATOR_AMBIGUOUS` if multiple valid creators remain.

The connected user and group owners returned by `/token/resources` form the
allow-list. A browser-provided creator, universe, or resource ID is only a
request; the resolver must find it in that allow-list before a write. Resource
ownership mismatches fail with `ROBLOX_RESOURCE_NOT_AUTHORIZED`, and invalid
creator selections fail with `ROBLOX_CREATOR_NOT_AUTHORIZED`.

Safe account summaries are available through `/oauth/status`,
`/oauth/creators`, and `/oauth/resources`. Explicit revocation uses
`POST /oauth/revoke` (the existing disconnect route remains compatible). The
broker attempts Roblox token revocation, always removes local credentials, and
preserves projects and canonical asset records for reconnection.

## Connected account experience

Settings presents the broker as a creator connection rather than exposing token
metadata. The authenticated interface shows:

- Roblox username, display name, and stable numeric user ID;
- connected, reconnect-required, or disconnected status;
- granted scopes and any scopes or permissions required by enabled features;
- the personal creator and authorized group creator targets;
- accessible universe/resource grants when Roblox returns them;
- bounded token-health classification and expiry/refresh timing, never token
  values or encrypted envelopes;
- the last successful Roblox API operation; and
- reconnect and revoke controls.

These values come from the safe `/oauth/status`, `/oauth/creators`, and
`/oauth/resources` projections. The stable Roblox user ID remains the account
identifier; usernames and display names are never used as database ownership
keys. A project can persist its selected creator separately, but every write
reauthorizes that creator against the current token resource grant. Reconnecting
updates the same integration record, and revocation removes credentials without
deleting projects, asset records, packs, or Studio receipts.

## Recovery and audit

OAuth audit events contain only bounded, sanitized identifiers, actions, error
codes, and timestamps. Credential-like fields are discarded. The user should
reconnect when status is `reauth_required`, the token has been revoked, required
scopes are missing, resource authorization is stale, or refresh outcome was
unknown. Reconnecting updates the integration record in place and does not
delete NexusRBX project data.

Run the deterministic security tests with:

```bash
cd backend
node --test \
  src/lib/robloxOAuthStateBinding.test.js \
  src/services/RobloxOidcVerifier.test.js \
  src/services/RobloxTokenStore.test.js \
  src/services/RobloxCreatorResolver.test.js \
  src/services/RobloxOAuthService.test.js
```

The tests mock Roblox and Firestore behavior. A controlled integration account
is still required to verify production client configuration, granted resources,
Roblox revocation behavior, and provider-side refresh-token rotation.

Official provider references checked for this document on 22 July 2026:

- [OAuth 2.0 reference](https://create.roblox.com/docs/cloud/auth/oauth2-reference)
- [OAuth scopes](https://create.roblox.com/docs/cloud/reference/scopes)
- [Assets API](https://create.roblox.com/docs/cloud/reference/features/assets)
- [Game Passes API](https://create.roblox.com/docs/cloud/reference/features/game-passes)
- [Developer Products API](https://create.roblox.com/docs/cloud/reference/features/developer-products)
