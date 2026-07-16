# Studio MCP Security

This document defines the trust boundary for the NexusRBX Local Connector and
Roblox Studio MCP connection. It supplements the general Studio tool protocol;
it does not relax plugin safeguards.

## Trust boundaries

There are three distinct channels:

1. The website authenticates to the NexusRBX backend with the existing Firebase
   user identity and App Check policy.
2. The local connector authenticates to NexusRBX with a dedicated MCP connector
   session token.
3. The connector talks to Studio MCP over local `stdio` using the MCP lifecycle.

These credentials are not interchangeable. Roblox documents no Studio MCP token
or OAuth flow for the local `stdio` server. The Nexus connector token is backend
authentication only and is never forwarded to Studio MCP. MCP's HTTP OAuth
model does not apply to this local `stdio` hop.

## Pairing and connector tokens

- Pairing codes are random, short-lived, single-use, and bound to the website
  user that created them.
- Claiming creates a distinct `mcp_local` session and invalidates the code.
- Tokens use the form `nsmcp_<sessionId>_<secret>` so they cannot be confused
  with existing plugin credentials.
- Only a cryptographic hash of the secret is stored. Raw tokens and pairing
  secrets are never persisted in Firestore, logs, telemetry, errors, or API
  responses after the one claim response that delivers the token to its owner.
- Verification parses and validates the exact prefix/session format, compares
  hashes with a timing-safe operation, and checks session type, status, expiry,
  and revocation.
- Disconnect revokes the exact connector session. A revoked or expired token
  cannot ping, update capabilities, claim commands, or acknowledge results.
- A connector can access only its own session and command queue. Website routes
  separately enforce Firebase ownership.

Plugin pairing and tokens keep their existing semantics. An MCP token cannot
authenticate a plugin route, and a plugin token cannot authenticate an MCP
connector route.

## Secret handling

The connector keeps the session token in process memory by default. Optional
local persistence must use an operating-system credential store or an equivalent
documented protected mechanism; a plain-text dotfile is not acceptable.

Logs use allowlisted structured fields. Redaction covers connector and plugin
token prefixes, bearer headers, pairing codes, environment values, MCP request
arguments that may contain source, and arbitrary subprocess diagnostic text.
CLI output never prints a raw token or raw MCP configuration.

Backend telemetry may contain bounded session IDs, command IDs, connection
health, versions, mapped capability names, error codes, and durations. It must
not contain full script source, connector tokens, Firebase credentials, Roblox
OAuth credentials, raw MCP payloads, or private chat content.

## Session and liveness model

Connector health and Studio MCP health are separate fields. A recent authenticated
connector heartbeat proves only that the local connector reached NexusRBX. The
website reports Studio MCP connected only after the connector reports a current
successful MCP initialization and discovery state.

Session state includes bounded version and health metadata, last-seen timestamps,
expiry/revocation, and a normalized capability map. Untrusted free-form metadata
is length-limited before storage or logging.

Reconnect triggers MCP reinitialization and complete capability rediscovery.
Previously advertised capabilities are not assumed after a reconnect. Stale
sessions become disconnected or degraded according to backend liveness policy.

## MCP protocol handling

The connector follows the negotiated MCP lifecycle:

- `initialize` is the first protocol request.
- The connector accepts only a supported negotiated protocol version and uses
  only capabilities advertised during initialization.
- It sends `notifications/initialized` before normal operations.
- It follows all `tools/list` cursors and handles tool-list changes only if that
  capability was negotiated.
- It validates tool names and input schemas before registering mappings.
- It validates structured results when an output schema exists, handles both
  structured and unstructured content, and treats `isError: true` as failure
  even when the JSON-RPC envelope succeeds.
- Requests have timeouts and cancellation where the SDK/server support them.
- Shutdown closes standard input, waits briefly, then terminates the subprocess
  with bounded escalation. MCP has no separate shutdown request.

The connector never writes non-protocol output to the MCP subprocess's standard
input and never interprets arbitrary standard-error text as trusted data.

## Capability and tool safety

Tool descriptions and annotations are untrusted hints, not authorization or
proof of safety. A mapping is an explicit allowlisted implementation tied to a
known name and compatible schema.

The connector does not expose `execute_luau` as a generic escape hatch. Any use
of a broad execution tool must have a dedicated Nexus command mapping with
bounded input/output, target validation, approval enforcement, and post-change
verification. Otherwise the capability remains unavailable.

Runtime discovery can remove a capability but cannot grant one outside the
compiled allowlist. A server-provided tool named like a known tool with an
incompatible schema is rejected.

## Command selection and authorization

The backend, not the connector, selects an owned Studio session. An explicit
`sessionId` is exact. An explicit `connectionType` is exact. Mutations are never
silently rerouted to another session or transport.

The existing Studio protocol remains authoritative for read-only, mutating, and
destructive classification. The connector cannot promote approval state or
treat pairing as blanket consent. Destructive commands remain pending until the
existing backend approval state authorizes them.

The MCP adapter verifies that the selected session currently advertises the
specific command mapping before queueing. Unsupported commands return
`MCP_TOOL_UNAVAILABLE`; they are never acknowledged as success.

## Source conflict protection

When Nexus previously read a known script, writes and patches require the
corresponding `expectedSourceHash`. The connector rereads the current source and
compares the canonical hash before mutation. A mismatch returns
`source_conflict`, is retryable after a fresh read/review, and performs no write.

A tool such as Roblox's documented `multi_edit` may create a missing script. The
connector therefore verifies that an edit-existing target exists before using
that tool and never relies on the tool to distinguish creation from editing.

## Mutation verification and retries

For every advertised mutation, the mapping identifies affected paths and a
verifiable postcondition. It collects bounded pre-change state where feasible,
executes the operation once, rereads the target, and reports `verified: true`
only when the postcondition is observed.

If the final state cannot be proved, the acknowledgment fails with
`apply_unverified`. A timeout or lost response after a mutation has an unknown
outcome; the connector must inspect before any retry and must not blindly repeat
the write. Read-only transient failures may use bounded exponential backoff.

Snapshot, restore, atomic batch, trusted insertion, and sanitization claims are
provided only by audited connector-owned routines. Those routines use constant
source templates, bounded serialized data, nonces, versioned envelopes, output
validation, pre/post hashes, and no automatic mutation retry. Arbitrary Luau is
not part of any browser or backend request interface.

## Multiple Studio targets

The connector enumerates live targets and reports only sanitized target
metadata. Exactly one target may be auto-selected. Multiple targets require an
authenticated website selection of an enumerated live `studioId`, followed by a
connector-confirmed switch. The target is rechecked immediately before every
mutation and playtest. Studio target IDs are ephemeral and are rediscovered
after restarts; a closed or mismatched target blocks execution.

Team Create reporting excludes the same user's other connection for the same
place, but ownership checks remain per session. One session never gains access
to another user's or another connector's queue.

## Abuse and availability controls

- Pairing, status, test, disconnect, heartbeat, capability, poll, and ack routes
  use appropriate existing rate limits or dedicated bounded limits.
- Long-poll duration and response size are bounded.
- Capability lists, versions, error messages, MCP content, diagnostics, and
  command results are normalized and size-limited before storage.
- Connector routes bypass browser App Check only where required for the local
  non-browser client; every such route requires the dedicated connector token
  except the one-time pairing claim.
- Command ownership, type, terminal state, and acknowledgment identity are
  checked server-side. Duplicate terminal acknowledgments cannot replay
  downstream side effects.
- No route accepts browser-supplied trusted Roblox asset IDs, native-model
  receipts, validation identities, or server approval as authoritative.

## Security test requirements

Automated coverage must include:

- pairing expiry and one-time claim;
- distinct plugin/MCP token prefixes and cross-route rejection;
- hash-only storage and timing-safe validation;
- expiry, revocation, and stale liveness behavior;
- exact user/session ownership for every connector route;
- exact routing and no mutation fallback;
- capability normalization and schema-mismatch rejection;
- single-target auto-selection, multi-target explicit selection, closed-target
  recovery, and wrong-target refusal;
- malicious routine strings, oversized input, malformed envelopes, and nonce
  mismatches;
- snapshot restore conflicts, batch failure, quarantine cleanup, and playtest
  timeout cleanup;
- source conflict and apply-unverified results;
- terminal acknowledgment idempotency;
- App Check exemptions limited to connector-authenticated protocol routes;
- secret redaction in errors and logs.

Live verification must additionally inspect a disposable Studio place, a stale
source edit, an ambiguous multi-window setup, MCP loss/reconnect, and concurrent
plugin/MCP sessions. See the connector guide for the exact checklist.

## Primary references

- [Roblox Studio MCP](https://create.roblox.com/docs/studio/mcp)
- [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
