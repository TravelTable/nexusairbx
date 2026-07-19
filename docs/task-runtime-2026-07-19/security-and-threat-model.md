# Security and threat model

Date: 2026-07-19

This review covers Prompt 3's browser, backend, model, Roblox, Studio, storage,
and telemetry boundaries. It distinguishes a source-level control from a
deployed security assertion. A unit test can prove a validator rejects a fake;
it cannot prove production rules, credentials, provider configuration, or the
installed Studio plugin are correct.

## Assets and trust boundaries

Protected assets include NexusRBX/Roblox identity bindings, project and chat
membership, universe/place selection, Studio sessions and pairing material,
OAuth tokens/scopes, task/event/checkpoint records, operation identities,
Studio commands and receipts, manifests/source, generated assets, external
Roblox IDs, entitlements, approvals, spend confirmation, and verification
evidence.

Trust crosses these boundaries:

1. browser to authenticated backend API;
2. legacy routes/workers to the canonical runtime facade;
3. backend context assembler to the model;
4. model tool proposal back to the application executor;
5. backend to Roblox OAuth/provider APIs;
6. backend to and from the paired Studio plugin;
7. services to Firestore/storage/queues; and
8. runtime events to logs, metrics, dashboards, and support tooling.

The browser, model, project/source content, asset metadata, prior chat, provider
responses, and plugin result text are non-authoritative. Authentication,
ownership, bindings, capabilities, operation identity, state transitions, and
verifier evidence are server-owned.

## Threat review

| Threat | Required control | Evidence before release | Residual/open gate |
| --- | --- | --- | --- |
| Cross-user, cross-tenant, or cross-project access | Derive user from verified auth; compare immutable task/asset owner and project membership in routes and repositories; return non-enumerating typed errors | Unit/integration IDOR cases plus Firestore emulator allow/deny matrix for every root and nested collection | Audit every legacy and canonical route; source-level owner checks do not prove deployed rules |
| Wrong universe or place selection | Resolve destination from server-owned verified Roblox/project records; bind task, capability snapshot, operation, and Studio command to project/universe/place | Mismatch tests at API, operation, provider adapter, and Studio receipt layers | Live Roblox and Studio destination readback still required |
| Studio session hijacking or stale-session adoption | Use authenticated high-entropy session credentials, bind user/project/universe/place, rotate generation on reconnect, reject superseded sessions and wrong-session receipts | Pair/reconnect/rotation live probe with two accounts and two places | Credential storage/transport and plugin install must be reviewed in the deployed environment |
| Pairing-code replay | Short TTL, single use, rate limit, bind exchange to authenticated owner, store only a verifier/hash where practical, invalidate on success | Concurrent exchange and expired/reused-code tests | Manual verification is required if the current pairing owner lacks an automated transactional test |
| Command replay or payload tampering | Server-owned command/operation IDs, semantic payload hash, expiry, session binding, fenced lease, bounded receipt cache, duplicate-result reuse, conflict on changed hash | Protocol unit tests plus live duplicate/tampered/stale-fence probes | Transport ACK is not authenticated completion; readback remains mandatory |
| Duplicate external effects after timeout/restart | Unique durable operation reservation and same idempotency identity; ambiguous state enters reconciliation; never create under a new key | Concurrent reservation, backend-restart, lost-response, and provider-readback tests | Provider-specific idempotency and query semantics require live/staging confirmation |
| Token, secret, credential, or pairing material exposure | Keep OAuth refresh/access tokens server-side; exclude from model context/events; redact forbidden telemetry keys and provider bodies; least-privilege scopes | Static secret/log scans and an end-to-end correlation trace through configured log sinks | Downstream logger/exporter transformations must also be inspected |
| Prompt injection in user, project, source, asset, or history data | Stable NexusRBX identity; bounded delimited untrusted blocks; trusted tool allowlist; execution-time permission/capability checks; no secrets in model context | Deterministic injection corpus and deployed-model evaluation using exact prompt/model version | Delimiters are defense-in-depth, not a proof that the model will ignore every injection |
| Model invents a tool or bypasses an unavailable capability | Capability catalog accepts trusted registries only; model sees only available projections; executor independently rechecks flag/scope/entitlement/consent/session | Unknown, disabled, scope-missing, entitlement-denied, consent, and disconnected tests | Confirm every legacy fallback calls the same executor guard |
| IDOR via task, operation, command, checkpoint, asset, pack, or external ID | Never authorize by opaque ID alone; load owner/binding and compare authenticated identity before returning even redacted data | Enumeration tests across two users/tenants/projects and nested subcollections | Complete route inventory and production-rules validation remain release gates |
| Client/event-history manipulation | Deny direct client mutation of canonical events, attempts, operations, receipts, verification, and migration-control records; append events transactionally with sequence checks | Emulator rules tests and concurrent event-sequence tests | Rules deployment and privileged-service-account boundaries require operator confirmation |
| Unauthorized resume, amendment, cancellation, or asset reuse | Reauthenticate on every command; check owner and active binding; idempotently bind amendments; use cancellation fences; revalidate capabilities and same-universe visibility on resume | Browser-close/backend-restart/resume tests with changed user/session/scope and cross-namespace assets | Same-universe sharing and user-global modes remain default-off until policy tests pass |
| Entitlement, consent, approval, or spend bypass | Snapshot server-side entitlements and consent, but recheck immediately before execution; explicit target/snapshot approval for destructive Studio work; exact spend confirmation for badge/pass | Negative executor tests and audit trail showing approval identity/time/input hash | UI state is not authority; billing/entitlement integrations need staging validation |
| Sensitive source or PII in logs/model context | Project manifest metadata and targeted safe projections only; no full place/source by default; bounded redactor removes sensitive-key fields; safe correlation IDs | Context snapshots, prompt capture in a safe test harness, telemetry unit tests, log-sink inspection | Sensitive values placed under misleading field names can evade key-only redaction; scan values and sinks |
| Forged or incomplete plugin/provider success | Treat all returned text and IDs as claims; require trusted source, matching binding, expected hashes/IDs, and authoritative readback before success | Fake-receipt/provider-result tests plus live readback probes | Provider outage may leave a task pending/reconcile-required, never optimistically complete |
| Cancellation race | Persist cancellation fence before stopping dispatch; prevent new attempts/leases; reconcile any already-ambiguous write without changing task cancellation | Concurrent cancel/lease/dispatch test | Cancellation cannot erase an irreversible external result; final response must disclose it safely |
| Rollback abuse or false rollback | Permit compensation only for reversible NexusRBX changes with recorded baseline/snapshot; use a new durable rollback operation and verify restored state | Snapshot-required and restoration-hash tests plus live Studio rollback exercise | Roblox creates that cannot be safely deleted remain recorded partial outcomes |

## Concrete repository controls reviewed

- `AgentContextAssembler` rejects a task/caller mismatch and a mismatched bound
  Studio session before context assembly. It projects safe Roblox, Studio,
  manifest, and asset fields rather than passing arbitrary provider objects.
- `TaskCapabilitySnapshotService` accepts only trusted catalog sources and
  evaluates scopes, flags, entitlement, consent, session state, and advertised
  Studio capability.
- `NexusAgentPromptService` supplies the stable NexusRBX identity, explicitly
  labels untrusted blocks, projects only available tools, caps section sizes,
  and hashes the prompt.
- `TaskAssetToolAdapter` checks task ownership, feature gates, upload consent,
  Studio binding, canonical runtime ownership, operation-ledger enforcement,
  exact operation/idempotency IDs, and verified results for terminal remote
  tools.
- The task/operation/Studio contracts reject semantic-input changes under a
  reused idempotency or command identity and prohibit success from transport
  state alone.
- `taskRuntimeObservability` rejects unknown event names, bounds fields, and
  removes keys associated with credentials, prompts, source, request bodies,
  or email.
- The migration audit hashes source records and writes only redacted control
  metadata behind a two-part interlock; it does not migrate or execute tasks.

These are useful controls but not an assertion that every existing route uses
them. The canonical cutover must inventory call sites and prove legacy fallback,
retry, polling, and administrative paths cannot bypass them.

## Prompt-injection and model-output policy

Untrusted content may describe code and requested work, but it may not change
the authenticated user, selected project/universe/place/session, capability
catalog, feature flags, approval state, operation identity, or verifier. The
model may request clarification or propose an allowed tool. It may not grant
itself a tool, read arbitrary source, select a different tenant, reveal the
system prompt, or declare unverified success.

Tool arguments are parsed as untrusted input, validated against an allowlisted
schema, rebound to server-owned authority, and checked again at execution. Tool
output is typed and redacted before it re-enters model context. Raw exceptions,
provider bodies, HTML, or plugin diagnostic strings must not be interpolated
into a system instruction.

The deterministic corpus covers a manifest field that tries to replace the
NexusRBX identity and redirect the target. Release evaluation must also vary
indirect injection placement, encoding, multilingual instructions, long-context
position, tool output, asset metadata, and history while confirming both model
behavior and application-side enforcement.

## Logging and incident response

Allowed correlation fields include bounded task, step, operation, command,
request, project, universe, place, and Studio-session identifiers where their
exposure is appropriate for the sink. Do not log access/refresh tokens, session
credentials, pairing codes, cookies, authorization headers, full prompts,
source, provider bodies, user email, or private asset data.

Security alerts should fire on ownership/binding mismatch, pairing replay,
stale lease fences, payload-hash conflict, duplicate external action,
unverified-reported-complete, repeated token refresh, entitlement/consent
denial spikes, event-sequence conflict, source/hash conflict, and redaction
failure. An incident response freezes new external dispatch first, preserves
the ledger, rotates affected credentials, reconciles ambiguous effects, and
restores from verified snapshots only where reversible.

## Release-blocking security gaps

The following remain blockers until evidenced in the target environment:

1. a complete API/repository authorization inventory for legacy and canonical
   paths, including nested records and administrative tooling;
2. deployed Firestore rules/indexes and emulator tests using two users, two
   projects, and two universes;
3. live pairing, session rotation, replay, stale-fence, and plugin receipt
   tests against the generated installable bundle;
4. Roblox OAuth scope/refresh/revocation and wrong-destination probes;
5. provider idempotency/readback tests for asset, badge, and game-pass writes;
6. deployed-model prompt-injection and identity-retention evaluations;
7. production log/exporter redaction inspection and retention approval; and
8. proof that only one runtime worker can dispatch external side effects during
   rollout and rollback.

Until those gates pass, external-write flags stay off and the implementation
must not be described as production-ready.
