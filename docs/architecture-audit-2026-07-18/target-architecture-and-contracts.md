# Target architecture and shared contracts

## Status and design boundary

Everything labelled **Target** or **Proposed** in this document is a design contract, not an implemented capability. Current implementation facts retain the evidence convention in [README.md](./README.md). No code or schema migration is performed by this audit.

The target is an incremental convergence around one durable task and operation model. It preserves the useful seams already present:

- the versioned Studio command validation and integrity checks in **backend/src/lib/studioToolProtocol.js**;
- transport abstraction in **backend/src/services/StudioToolRouter.js**;
- iterative steps, decision lease, and validation hooks in **backend/src/services/StudioAgentService.js**;
- manifest paging, hashes, conflict detection, and last-complete promotion in **backend/src/services/StudioManifestService.js**;
- OAuth state/PKCE and encrypted token storage in **backend/src/services/RobloxOAuthService.js** and **backend/src/services/RobloxTokenStore.js**;
- stream reconnect and result polling in **src/hooks/useAiChat.js**.

It changes which records are authoritative. The current branch-specific job/run/command records described in [current-architecture-and-lifecycle.md](./current-architecture-and-lifecycle.md) become compatibility inputs and projections; they do not independently decide whether the user's goal is complete.

## Target system structure

~~~mermaid
flowchart LR
  UI["AI workspace / asset UI"] --> API["Authenticated task API"]
  API --> RES["Transactional idempotency reservation"]
  RES --> LEDGER["Task ledger + append-only events"]
  LEDGER --> PROJ["Current-state projection / progress feed"]
  PROJ --> UI

  ORCH["NexusRBX orchestrator"] --> CTX["Versioned context snapshot"]
  CTX --> CAP["Capability + OAuth snapshot"]
  CTX --> MAN["Manifest / project / universe resources"]
  LEDGER --> ORCH
  ORCH --> STEPS["Durable steps + checkpoints"]

  STEPS --> BACK["Backend executors"]
  STEPS --> OUTBOX["Studio command outbox"]
  BACK --> OPS["External operation ledger"]
  OUTBOX --> STUDIO["Leased Studio transport"]
  STUDIO --> VERIFY["Readback / goal verification"]
  OPS --> ROBLOX["Roblox / model / storage providers"]
  ROBLOX --> VERIFY
  VERIFY --> EVENTS["Result + evidence events"]
  EVENTS --> LEDGER

  ASSET["Canonical asset aggregates"] --> RESOURCES["Owner/project/universe resource bindings"]
  RESOURCES --> CTX
  MAN --> RESOURCES
~~~

### Responsibility boundaries

| Boundary | Target authority | Rule |
| --- | --- | --- |
| User intent | Immutable task request plus ordered amendments | A retry may change execution, never silently change intent |
| Task truth | Append-only events plus transactionally updated projection | Chat messages display task state but are not task state |
| Step truth | Step projection and execution-attempt records | Every side effect belongs to one step and operation ID |
| External side effect | Operation reservation and provider receipt | A timeout is ambiguous until reconciled; it is not automatic permission to create again |
| Studio delivery | Durable command envelope with lease/fence | Delivery, execution, acknowledgement, and verification are different states |
| Studio project truth | Live place plus a verified manifest version | A cached manifest must state freshness and cannot silently stand in for live verification |
| Roblox capability | Server-generated snapshot tied to an encrypted connection version | The model never sees access or refresh tokens |
| Asset truth | Owner-scoped asset aggregate and immutable external relationships | A successful upload requires an external ID and lifecycle evidence |
| Shared project state | Universe resource namespace | Projects may discover resources for the same universe while chat history stays project-scoped |
| Completion | Goal-specific acceptance result with evidence | Generated, uploaded, delivered, and executed do not independently mean complete |

## Required state machines

### Task

~~~mermaid
stateDiagram-v2
  [*] --> accepted
  accepted --> planning
  planning --> running
  running --> waiting_user
  running --> blocked_studio
  running --> waiting_external
  running --> retry_scheduled
  waiting_user --> running
  blocked_studio --> running: compatible session reconnects
  waiting_external --> running: reconciliation result
  retry_scheduled --> running: due and attempt below limit
  running --> verifying
  verifying --> succeeded: acceptance checks pass
  verifying --> running: corrective step remains
  accepted --> cancelled
  planning --> cancelled
  running --> cancelled
  running --> compensating
  compensating --> failed
  planning --> failed
  running --> failed
  verifying --> failed
~~~

`succeeded` is terminal only after the task's acceptance policy passes. `failed` records whether compensation completed. `blocked_studio`, `waiting_external`, and `waiting_user` are resumable states, not failures. Cancellation stops new claims; an in-flight irreversible external operation is reconciled before the task is projected terminal.

### Step and attempt

Steps move through `pending → ready → running → waiting | verifying → succeeded`, with terminal alternatives `failed`, `cancelled`, and `skipped`. Every claim creates an attempt with a lease and monotonic fence. A retry creates another attempt against the same logical `operationId`; it does not make a new side-effect identity. The default maximum is three attempts, including the first, unless a capability declares a stricter policy.

### Studio command

~~~mermaid
stateDiagram-v2
  [*] --> created
  created --> queued
  queued --> leased
  leased --> accepted
  accepted --> executing
  executing --> acknowledged
  acknowledged --> verifying
  verifying --> succeeded
  verifying --> failed
  leased --> queued: lease expires before acceptance
  accepted --> reconcile_required: lease/session lost
  executing --> reconcile_required: result ambiguous
  reconcile_required --> verifying: receipt/readback found
  reconcile_required --> queued: proved not executed and retry allowed
  created --> expired
  queued --> expired
  created --> cancelled
  queued --> cancelled
~~~

The current `queued → delivered → succeeded|failed` transport at **backend/src/services/StudioBridgeService.js:1073-1235** must be adapted to this richer state machine. A terminal execution result and downstream manifest/task projections must be committed through an idempotent inbox/outbox consumer so a repeated acknowledgement repairs missing projections.

### Asset and external operation

- Asset lifecycle: `draft → generating → generated → validating → approved → upload_pending → uploading → submitted → moderation_pending → available`, with explicit branches `generation_failed`, `validation_failed`, `upload_failed`, `rejected`, `archived`, and `replaced`.
- An asset is never `available` without a usable stored object or an external asset relationship. Roblox submission may return an ID while moderation remains pending; that is `moderation_pending`, not verified availability.
- Replacement creates a new immutable asset version and relationship, updates selected project references after verification, and preserves the old Roblox asset.
- External operation lifecycle: `reserved → executing → outcome_unknown | succeeded | failed_retryable | failed_terminal`. `outcome_unknown` is reconciled using provider operation IDs, receipts, semantic search, or readback before another creation request is allowed.

## Shared TypeScript-style contracts

The repository backend is JavaScript today; these are language-neutral contracts shown in TypeScript syntax. Runtime validators and persistence serializers must enforce them at all ingress boundaries. Dates are ISO-8601 UTC strings on the wire and Firestore timestamps at rest. IDs are opaque, non-guessable strings unless explicitly deterministic.

### Common identifiers, JSON, evidence, and references

~~~ts
type ISODateTime = string;
type ContentHash = `sha256:${string}`;
type SchemaVersion = number;
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonSchema = Record<string, JsonValue>;

interface CorrelationIds {
  requestId: string;
  traceId: string;
  taskId: string;
  stepId?: string;
  commandId?: string;
  operationId?: string;
  userId: string;
  projectId?: string;
  universeId?: string;
  studioSessionId?: string;
}

interface EntityRef {
  kind: "task" | "step" | "command" | "manifest" | "file" | "asset" |
        "roblox_asset" | "oauth_connection" | "studio_session";
  id: string;
  version?: string | number;
}

interface VerificationEvidence {
  method: "provider_receipt" | "studio_readback" | "manifest_diff" |
          "content_hash" | "api_readback" | "validation" | "user_confirmation";
  subject: EntityRef;
  observedAt: ISODateTime;
  verifier: string;
  passed: boolean;
  expected?: JsonValue;
  observed?: JsonValue;
  evidenceHash?: ContentHash;
  expiresAt?: ISODateTime;
}
~~~

### Capability definition and availability snapshot

~~~ts
type Availability =
  | { state: "available"; checkedAt: ISODateTime }
  | { state: "degraded" | "unavailable" | "unknown"; checkedAt: ISODateTime;
      reasonCode: string; message: string; retryAfter?: ISODateTime };

interface CapabilityDefinition {
  capabilityId: string;                 // stable semantic ID
  version: string;                      // behavior/schema version
  displayName: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  executor: "backend" | "studio" | "roblox_open_cloud" | "model_provider";
  requiredOAuthScopes: string[];
  requiredAccountOwnership: Array<"roblox_user" | "roblox_group" | "universe" | "place">;
  requiredProjectState: Array<"project" | "universe_binding" | "place" |
    "complete_manifest" | "studio_connection" | "approved_asset">;
  studioRequired: boolean;
  destructive: boolean;
  reversible: boolean;
  idempotency: {
    supported: boolean;
    keyFields: string[];
    reconciliation: "receipt" | "readback" | "semantic_lookup" | "none";
  };
  verification: {
    required: boolean;
    method: VerificationEvidence["method"];
    freshnessSeconds?: number;
  };
  retryPolicyId: string;
  availability: Availability;
}

interface CapabilitySnapshotEntry {
  capabilityId: string;
  definitionVersion: string;
  availability: Availability;
  authorized: boolean;
  unavailableReasons: Array<{
    code: "scope_missing" | "owner_mismatch" | "project_state_missing" |
          "studio_disconnected" | "provider_unavailable" | "not_implemented" |
          "entitlement_missing" | "unknown";
    detail: string;
  }>;
  permittedOwnerIds: string[];
  permittedUniverseIds: string[];
  permittedPlaceIds: string[];
}

interface CapabilitySnapshot {
  snapshotId: string;
  schemaVersion: SchemaVersion;
  registryVersion: string;
  userId: string;
  projectId?: string;
  oauthConnectionVersion?: number;
  studioSessionId?: string;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
  entries: CapabilitySnapshotEntry[];
  sourceVersions: Record<string, string | number>;
}
~~~

The model receives the snapshot and compact tool schemas selected from it. It cannot override `authorized`, destination IDs, destructive gates, or verification requirements. The server rechecks those fields at execution time because a prompt snapshot can become stale.

### OAuth connection capability snapshot

~~~ts
interface RobloxOwnerAccess {
  ownerType: "user" | "group";
  ownerId: string;
  displayName?: string;
  roles: string[];
  allowedDestinationKinds: Array<"asset" | "badge" | "game_pass" | "developer_product">;
}

interface RobloxUniverseAccess {
  universeId: string;
  owner: Pick<RobloxOwnerAccess, "ownerType" | "ownerId">;
  name?: string;
  permissions: string[];
  placeIds: string[];
  verifiedAt: ISODateTime;
}

interface RobloxOAuthCapabilitySnapshot {
  snapshotId: string;
  schemaVersion: SchemaVersion;
  capabilityVersion: string;
  userId: string;                       // NexusRBX user ID
  connectionVersion: number;
  robloxUserId: string;
  authorizedScopes: string[];
  tokenStatus: "active" | "refresh_required" | "expired" | "revoked" | "invalid";
  owners: RobloxOwnerAccess[];
  universes: RobloxUniverseAccess[];
  accessiblePlaces: Array<{ placeId: string; universeId: string; permissions: string[] }>;
  accessibleGroups: Array<{ groupId: string; roles: string[] }>;
  supportedNexusActions: CapabilitySnapshotEntry[];
  connectedAt: ISODateTime;
  refreshedAt: ISODateTime;
  expiresAt: ISODateTime;
  tokenKeyVersion: string;              // encryption-key metadata, never key/token material
  sourceHash: ContentHash;
}
~~~

Access and refresh tokens remain only in the encrypted server-side connection record. The current token storage and refresh implementation is described in **backend/src/services/RobloxTokenStore.js:35-107** and **backend/src/services/RobloxOAuthService.js:383-559**; the proposed snapshot separates model-visible authorization facts from secrets.

### Task, step, amendment, event, and retry policy

~~~ts
type TaskStatus = "accepted" | "planning" | "running" | "waiting_user" |
  "blocked_studio" | "waiting_external" | "retry_scheduled" | "verifying" |
  "compensating" | "succeeded" | "failed" | "cancelled";

interface TaskAcceptancePolicy {
  checks: Array<{
    checkId: string;
    description: string;
    required: boolean;
    verifierCapabilityId: string;
  }>;
  allRequiredMustPass: true;
}

interface Task {
  taskId: string;
  schemaVersion: SchemaVersion;
  userId: string;
  chatId: string;
  projectId: string;
  universeId?: string;
  placeId?: string;
  requestId: string;
  traceId: string;
  rootIdempotencyKey: string;
  intent: { original: string; normalizedGoal: string; attachments: EntityRef[] };
  mode: "conversation" | "plan" | "agent" | "debug" | "asset";
  status: TaskStatus;
  statusReason?: string;
  planVisibility: "internal" | "user_visible";
  capabilitySnapshotId: string;
  oauthSnapshotId?: string;
  contextSnapshotId: string;
  acceptancePolicy: TaskAcceptancePolicy;
  currentStepId?: string;
  latestCheckpointId?: string;
  eventSequence: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  terminalAt?: ISODateTime;
  finalError?: TypedError;
  finalEvidence: VerificationEvidence[];
}

type StepStatus = "pending" | "ready" | "running" | "waiting" | "verifying" |
  "succeeded" | "failed" | "cancelled" | "skipped";

interface TaskStep {
  stepId: string;
  taskId: string;
  ordinal: number;
  revision: number;
  capabilityId: string;
  capabilityVersion: string;
  description: string;
  dependsOn: string[];
  status: StepStatus;
  input: JsonValue;
  output?: JsonValue;
  operationId?: string;
  studioCommandId?: string;
  retryPolicy: RetryPolicy;
  attempts: Array<{
    attempt: number;
    status: "claimed" | "running" | "outcome_unknown" | "succeeded" | "failed";
    leaseOwner: string;
    leaseFence: number;
    leaseExpiresAt: ISODateTime;
    startedAt: ISODateTime;
    endedAt?: ISODateTime;
    error?: TypedError;
  }>;
  verification: VerificationEvidence[];
  rollbackOperationId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface UserAmendment {
  amendmentId: string;
  taskId: string;
  sequence: number;
  userId: string;
  instruction: string;
  supersedesStepIds: string[];
  createdAt: ISODateTime;
  appliedAt?: ISODateTime;
}

interface RetryPolicy {
  policyId: string;
  maxAttempts: 1 | 2 | 3;
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: "none" | "full";
  retryableCategories: TypedError["category"][];
  requiresReconciliationBeforeRetry: boolean;
}

interface TaskEvent<T extends JsonValue = JsonValue> {
  eventId: string;
  taskId: string;
  sequence: number;                     // transactionally monotonic per task
  eventType: string;                    // versioned event-name registry
  eventVersion: number;
  occurredAt: ISODateTime;
  recordedAt: ISODateTime;
  actor: { type: "user" | "system" | "worker" | "studio" | "provider"; id: string };
  correlation: CorrelationIds;
  payload: T;
  causationEventId?: string;
  checksum: ContentHash;
}
~~~

Events are append-only. A Firestore transaction reserves the next sequence, writes the event, and advances the current projection. Consumers record inbox keys so replay is safe. Corrective events supersede earlier facts; history is never rewritten.

### Checkpoint

~~~ts
interface TaskCheckpoint {
  checkpointId: string;
  taskId: string;
  schemaVersion: SchemaVersion;
  throughEventSequence: number;
  createdAt: ISODateTime;
  createdBy: string;
  completedStepIds: string[];
  activeStepId?: string;
  pendingStepIds: string[];
  toolExecutions: Array<{
    stepId: string;
    capabilityId: string;
    input: JsonValue;
    output?: JsonValue;
    operationId: string;
    status: "pending" | "outcome_unknown" | "succeeded" | "failed";
  }>;
  operationIds: string[];
  createdRobloxAssets: Array<{ operationId: string; assetId?: string; state: string }>;
  changedFiles: Array<{
    path: string;
    previousHash?: ContentHash;
    resultingHash?: ContentHash;
    previousVersionRef?: EntityRef;
  }>;
  manifest: { manifestId: string; versionId: string; versionNumber: number };
  fileHashes: Record<string, ContentHash>;
  oauthResults: Array<{ operationId: string; scope: string; destinationId: string; status: string }>;
  uploadStates: Array<{ assetId: string; operationId: string; status: string }>;
  moderationStates: Array<{ externalAssetId: string; status: string; checkedAt: ISODateTime }>;
  rollback: Array<{
    operationId: string;
    capabilityId: string;
    input: JsonValue;
    status: "available" | "executed" | "failed" | "not_possible";
  }>;
  lastVerifiedSuccessfulState: {
    eventSequence: number;
    evidence: VerificationEvidence[];
  };
  amendments: UserAmendment[];
  unresolvedBlockers: Array<{ code: string; detail: string; since: ISODateTime }>;
  contextSnapshotId: string;
  capabilitySnapshotId: string;
}
~~~

A checkpoint is a replay optimization, not the audit log. It is valid only when its checksum and `throughEventSequence` match the ledger. Secrets, raw OAuth tokens, and untrusted full project source are excluded.

### Studio command, acknowledgement, and result

~~~ts
type StudioDeliveryStatus = "created" | "queued" | "leased" | "accepted" |
  "expired" | "cancelled";
type StudioExecutionStatus = "not_started" | "executing" | "acknowledged" |
  "reconcile_required" | "verifying" | "succeeded" | "failed";

interface StudioCommandEnvelope<P extends JsonValue = JsonValue> {
  commandId: string;
  operationId: string;
  taskId: string;
  stepId: string;
  userId: string;
  projectId: string;
  universeId: string;
  placeId: string;
  studioSessionId: string;
  capabilityId: string;
  capabilityVersion: string;
  payload: P;
  expectedManifestVersion: { manifestId: string; versionId: string; versionNumber: number };
  expectedFileHashes: Record<string, ContentHash>;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
  deliveryStatus: StudioDeliveryStatus;
  acknowledgementStatus: "none" | "accepted" | "rejected";
  executionStatus: StudioExecutionStatus;
  lease?: { owner: string; fence: number; expiresAt: ISODateTime };
  result?: StudioExecutionResult;
  error?: TypedError;
  retryCount: number;
  idempotencyKey: string;
  envelopeVersion: number;
  signatureKeyVersion: string;
  signature: string;
}

interface StudioExecutionResult {
  commandId: string;
  operationId: string;
  sessionId: string;
  leaseFence: number;
  status: "succeeded" | "failed" | "outcome_unknown";
  startedAt: ISODateTime;
  finishedAt: ISODateTime;
  output?: JsonValue;
  error?: TypedError;
  resultingManifestVersion?: { manifestId: string; versionId: string; versionNumber: number };
  resultingFileHashes: Record<string, ContentHash>;
  changedInstanceIds: string[];
  snapshotIds: string[];
  verification: VerificationEvidence[];
  resultHash: ContentHash;
}
~~~

The backend validates identity and capability again when queueing and acknowledging. The plugin validates the signed envelope, exact session/place/universe, expiry, fence, capability, payload schema, and expected hashes. A repeated `commandId`/`operationId` returns the stored receipt. A stale fence cannot mutate state. Destructive commands require a successful snapshot receipt unless their capability contract explicitly documents why rollback is impossible.

### Typed errors and user-safe presentation

~~~ts
type ErrorCode =
  | "NETWORK_FAILURE"
  | "TIMEOUT"
  | "AUTHENTICATION_FAILED"
  | "TOKEN_REFRESH_FAILED"
  | "PERMISSION_DENIED"
  | "OWNERSHIP_MISMATCH"
  | "VALIDATION_FAILED"
  | "CAPABILITY_UNSUPPORTED"
  | "STUDIO_DISCONNECTED"
  | "STUDIO_COMMAND_EXPIRED"
  | "DUPLICATE_OPERATION"
  | "FILE_CONFLICT"
  | "MANIFEST_MISMATCH"
  | "IMAGE_GENERATION_FAILED"
  | "ASSET_UPLOAD_FAILED"
  | "MODERATION_PENDING"
  | "MODERATION_REJECTED"
  | "EXTERNAL_API_FAILED"
  | "ENTITLEMENT_DENIED"
  | "INTERNAL_CONSISTENCY_FAILED"
  | "UNKNOWN_FAILURE";

interface TypedError {
  errorId: string;
  code: ErrorCode;                      // versioned stable machine code
  category: "network" | "timeout" | "authentication" | "token_refresh" |
    "authorization" | "ownership" | "entitlement" | "validation" |
    "unsupported_capability" | "studio_disconnected" | "command_expired" |
    "duplicate_operation" | "file_conflict" | "manifest_mismatch" |
    "image_generation" | "asset_upload" | "moderation" | "external_api" |
    "rate_limit" | "transient_provider" | "provider_rejected" |
    "studio_execution" | "outcome_unknown" | "not_found" | "internal" |
    "unknown";
  message: string;                      // safe user-facing summary
  internalDetail?: string;              // server/audit only
  retryable: boolean;
  retryAfter?: ISODateTime;
  attempt?: number;
  maxAttempts?: number;
  resolution: "retry_automatically" | "reconnect_studio" | "reauthorize" |
    "resolve_conflict" | "change_input" | "contact_support" | "none";
  correlation: Partial<CorrelationIds>;
  causeCode?: string;
  details?: JsonValue;                  // allowlisted; never tokens or provider secrets
  occurredAt: ISODateTime;
}
~~~

| Error family / codes | Default and maximum retry | User action | May independent steps continue? | Conversational status | Technical evidence retained |
| --- | --- | --- | --- | --- | --- |
| Network, rate limit, transient provider (`NETWORK_FAILURE`) | Up to three total attempts with bounded jitter; honor provider retry time | None until exhausted | Yes, when dependencies permit | Attempt count and next retry time | Endpoint class, duration, safe provider code, request/trace/operation IDs |
| Timeout or ambiguous external result (`TIMEOUT`, `ASSET_UPLOAD_FAILED`) | No creation retry until receipt/readback reconciliation; never more than three total attempts | Only if reconciliation cannot decide safely | Yes, except dependent steps | “Request outcome is being checked,” never “failed” or “complete” | Dispatch time, input hash, provider operation/receipt IDs, reconciliation probes |
| Authentication or token refresh (`AUTHENTICATION_FAILED`, `TOKEN_REFRESH_FAILED`) | One server refresh attempt; then pause | Reconnect Roblox if refresh/revocation persists | Backend steps that need no affected connection may continue | Connection expired/revoked and precise recovery action | Connection version, token status and safe OAuth error; never token material |
| Permission, ownership, entitlement (`PERMISSION_DENIED`, `OWNERSHIP_MISMATCH`, `ENTITLEMENT_DENIED`) | Zero automatic retries | Select an authorised destination, account, or entitlement | Only unrelated authorised steps | Exact missing permission/owner/entitlement | Evaluated user/project/universe/owner IDs, policy and capability versions |
| Invalid input or unsupported action (`VALIDATION_FAILED`, `CAPABILITY_UNSUPPORTED`) | Zero until input or capability changes | Correct input or choose a supported action | Yes, if independent | Invalid field or unavailable reason | Validator path, redacted input hash, registry version |
| Studio unavailable/expired (`STUDIO_DISCONNECTED`, `STUDIO_COMMAND_EXPIRED`) | No blind execution retry; wait for compatible reconnect, then reconcile/requeue with the same operation ID | Reconnect Studio when required | Yes, for backend-safe dependency branches | Persisted blocked state and resumable checkpoint | Session/place/fence, expiry, last delivery/ack state, command and operation IDs |
| Duplicate operation (`DUPLICATE_OPERATION`) | Zero new executions; return or reconcile the reserved operation | Clarify only when the same key has a different input hash | Yes | Existing operation state or explicit idempotency conflict | Semantic key hash, input hashes, original operation/result evidence |
| File/manifest conflict (`FILE_CONFLICT`, `MANIFEST_MISMATCH`) | Zero blind retries | Choose rebase/merge/keep action | Independent non-conflicting steps may continue | Name the path and current/base versions | Website, Studio and base hashes; manifest/version/session IDs |
| Image generation or provider rejection (`IMAGE_GENERATION_FAILED`, `EXTERNAL_API_FAILED`) | Up to three only for classified transient, side-effect-safe failures; otherwise zero | Change input/provider only after safe failure | Yes, when independent | Safe provider reason and whether a retry will occur | Provider/model, operation ID, safe status/code, attempt timings |
| Moderation (`MODERATION_PENDING`, `MODERATION_REJECTED`) | Pending is polled only at documented intervals; rejected is terminal with zero retries | Wait, replace, or edit artwork | Local asset work may continue; dependent Roblox use waits | Explicit pending/rejected state, not generic failure | External asset ID, moderation timestamps/status/reason |
| Internal consistency or unknown (`INTERNAL_CONSISTENCY_FAILED`, `UNKNOWN_FAILURE`) | At most one retry only when proven side-effect-free; otherwise zero | Contact support with correlation ID | Stop dependent branch; fail closed | No misleading success; state retained | Full server stack/cause, checkpoint, invariant, all correlation IDs; secrets redacted |

The current code has route/service-specific error shapes and terminal semantics; this taxonomy replaces those shapes only after compatibility adapters exist.

### Project identity, manifest, file versions, and shared resources

~~~ts
interface ProjectIdentity {
  userId: string;
  projectId: string;
  chatNamespaceId: string;              // never shared implicitly
  robloxOwner: { type: "user" | "group"; id: string };
  universeId: string;
  defaultPlaceId: string;
  attachedPlaceIds: string[];
  bindingVersion: number;
  verifiedAt: ISODateTime;
}

interface ProjectManifest {
  manifestId: string;
  projectId: string;
  universeId: string;
  placeId: string;
  currentVersionId: string;
  lastVerifiedVersionId?: string;
  schemaVersion: SchemaVersion;
  updatedAt: ISODateTime;
}

interface ManifestVersion {
  versionId: string;
  manifestId: string;
  versionNumber: number;
  parentVersionId?: string;
  source: "studio" | "website" | "migration";
  studioSessionId?: string;
  status: "building" | "complete" | "conflicted" | "invalid";
  fileRefs: EntityRef[];
  rootHash: ContentHash;
  pageCount: number;
  itemCount: number;
  createdAt: ISODateTime;
  verifiedAt?: ISODateTime;
}

interface ProjectFile {
  fileId: string;
  universeId: string;
  placeId: string;
  logicalPath: string;
  className: string;
  managedInstanceId?: string;
  version: number;
  contentHash: ContentHash;
  propertyHash?: ContentHash;
  contentStorageRef?: string;
  sourceProjectId: string;
  visibility: "project" | "universe_shared";
  createdAt: ISODateTime;
  supersedesFileId?: string;
}

interface ResourceBinding {
  bindingId: string;
  resource: EntityRef;
  ownerUserId: string;
  projectId: string;
  universeId: string;
  placeIds: string[];
  visibility: "project" | "universe_shared";
  access: "read" | "read_write";
  createdAt: ISODateTime;
  revokedAt?: ISODateTime;
}

interface ManifestConflict {
  conflictId: string;
  taskId: string;
  logicalPath: string;
  baseHash: ContentHash;
  websiteHash: ContentHash;
  studioHash: ContentHash;
  detectedAt: ISODateTime;
  resolution?: "keep_website" | "keep_studio" | "merged" | "abandoned";
  resolvedHash?: ContentHash;
}
~~~

The universe namespace is an indexed discovery boundary, not ownership by itself. Every read still checks `ownerUserId`, the verified project-to-universe binding, and explicit visibility. Separate projects retain separate `chatNamespaceId`; prompts never fetch another project's chat solely because the universe matches.

The current manifest is a strong migration base: it already records path/class/managed IDs and hashes and rejects inconsistent page chains in **backend/src/services/StudioManifestService.js:202-229,562-834**. Target file-version records add an explicit base/parent relationship for website-versus-Studio conflict resolution.

### Assets, icon packs, style profiles, and Roblox relationships

~~~ts
type AssetKind = "icon" | "image" | "decal" | "model" | "audio" |
  "badge_artwork" | "game_pass_artwork" | "badge" | "game_pass" |
  "developer_product";

type ArtworkMode = "transparent_game_ui_icon" | "badge_artwork" |
  "game_pass_artwork" | "template_based_artwork" | "not_artwork";

interface AssetRecord {
  assetId: string;                      // NexusRBX ID, never overloaded with Roblox ID
  schemaVersion: SchemaVersion;
  ownerUserId: string;
  sourceProjectId: string;
  universeId?: string;
  placeIds: string[];
  robloxOwner?: { type: "user" | "group"; id: string };
  kind: AssetKind;
  artworkMode: ArtworkMode;
  backgroundMode: "transparent" | "background_enabled" | "not_applicable";
  name: string;
  description?: string;
  lifecycle: "draft" | "generating" | "generated" | "validating" | "approved" |
    "upload_pending" | "uploading" | "submitted" | "moderation_pending" |
    "available" | "generation_failed" | "validation_failed" | "upload_failed" |
    "rejected" | "archived" | "replaced";
  storage: Array<{
    role: "master" | "roblox_ready" | "preview";
    privateObjectKey: string;
    contentHash: ContentHash;
    mimeType: string;
    width?: number;
    height?: number;
  }>;
  generation?: {
    prompt: string;
    referenceAssetIds: string[];
    provider: string;
    model: string;
    providerGenerationId?: string;
  };
  semanticTags: string[];
  styleProfileId?: string;
  packId?: string;
  version: number;
  supersedesAssetId?: string;
  approval?: { status: "pending" | "approved" | "rejected"; actorId?: string; at?: ISODateTime };
  validation: Array<{ check: string; passed: boolean; score?: number; detail?: string }>;
  moderation: { state: "not_submitted" | "pending" | "approved" | "rejected" | "unknown";
    checkedAt?: ISODateTime; reason?: string };
  robloxRelationshipIds: string[];
  uploadOperationIds: string[];
  relatedFileRefs: EntityRef[];
  relatedUiElements: Array<{ fileId: string; elementId: string; property?: string }>;
  usage: { state: "unused" | "referenced" | "active" | "replaced"; lastUsedAt?: ISODateTime };
  visibility: "project" | "universe_shared" | "user_global";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  verifiedAt?: ISODateTime;
}

interface IconPack {
  packId: string;
  ownerUserId: string;
  projectId: string;
  universeId?: string;
  name: string;
  requestedCount: number;
  softDefaultCount: 8;
  iconAssetIds: string[];
  styleProfileId: string;
  approvedReferenceAssetIds: string[];
  generationBrief: string;
  lifecycle: "draft" | "generating" | "partially_ready" | "validating" |
    "ready" | "failed";
  consistencyChecks: Array<{ metric: string; threshold: number; result?: number; passed?: boolean }>;
  checkpointId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface StyleProfile {
  styleProfileId: string;
  ownerUserId: string;
  sourceProjectId: string;
  name: string;
  visibility: "project" | "universe_shared" | "user_global";
  promptDirectives: string[];
  negativeDirectives: string[];
  palette: string[];
  composition: JsonValue;
  transparencyRequired: boolean;
  approvedReferenceAssetIds: string[];
  modelPolicy: { defaultTier: "low_cost"; escalationConditions: string[] };
  version: number;
  contentHash: ContentHash;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface RobloxAssetRelationship {
  relationshipId: string;
  ownerUserId: string;
  projectId: string;
  universeId?: string;
  nexusAssetId: string;
  robloxAssetId: string;
  robloxAssetType: "image" | "decal" | "model" | "badge" | "game_pass" |
    "developer_product";
  robloxOwner: { type: "user" | "group"; id: string };
  operationId: string;
  providerOperationId?: string;
  lifecycle: "submitted" | "moderation_pending" | "available" | "rejected" | "unknown";
  priceRobux?: number;
  requestedPriceRobux?: number;
  verification: VerificationEvidence[];
  createdAt: ISODateTime;
  lastCheckedAt: ISODateTime;
  supersedesRelationshipId?: string;
}
~~~

Current asset information is split among **backend/src/lib/projectState.js**, **backend/src/services/ProjectAssetService.js**, and **backend/src/services/AssetOntologyService.js**. These target aggregates use distinct NexusRBX and Roblox identifiers and explicit owner/project/universe scopes so compatibility adapters can backfill without guessing that one existing record is universally authoritative.

### Operation idempotency and side-effect receipts

~~~ts
interface OperationRecord {
  operationId: string;                  // stable for the logical side effect
  schemaVersion: SchemaVersion;
  ownerUserId: string;
  taskId: string;
  stepId: string;
  capabilityId: string;
  idempotencyKey: string;
  semanticKeyHash: ContentHash;         // owner + capability + normalized destination/input
  inputHash: ContentHash;
  status: "reserved" | "executing" | "outcome_unknown" | "succeeded" |
    "failed_retryable" | "failed_terminal";
  attemptCount: number;
  lease?: { owner: string; fence: number; expiresAt: ISODateTime };
  providerOperationId?: string;
  externalResourceRefs: EntityRef[];
  result?: JsonValue;
  resultHash?: ContentHash;
  error?: TypedError;
  verification: VerificationEvidence[];
  firstRequestedAt: ISODateTime;
  lastAttemptAt?: ISODateTime;
  completedAt?: ISODateTime;
  retentionUntil: ISODateTime;
}
~~~

The operation record is created by a transaction on a deterministic reservation document derived from `(ownerUserId, capabilityId, semanticKeyHash)`. An exact replay returns or reconciles the existing operation. The same idempotency key with a different input hash is a conflict. A new request ID never permits a duplicate external creation if the semantic operation is already executing or ambiguous. This replaces current read-then-write behavior in **backend/src/routes/ai.js:812-878**, **backend/src/services/JobService.js:474-487**, and **backend/src/services/RobloxOperationReceiptService.js:49-98**.

### Agent context snapshot

~~~ts
interface AgentContextSnapshot {
  contextSnapshotId: string;
  schemaVersion: SchemaVersion;
  taskId: string;
  userId: string;
  project: ProjectIdentity;
  manifestVersion: Pick<ManifestVersion, "manifestId" | "versionId" | "versionNumber" | "rootHash">;
  relevantFiles: Array<Pick<ProjectFile, "fileId" | "logicalPath" | "contentHash" | "version">>;
  relevantAssets: Array<Pick<AssetRecord, "assetId" | "kind" | "name" | "lifecycle" | "version">>;
  activeTaskState: { status: TaskStatus; completedStepIds: string[]; pendingStepIds: string[] };
  studio: { status: "connected" | "disconnected" | "stale"; sessionId?: string; capabilities: string[] };
  capabilitySnapshotId: string;
  oauthSnapshotId?: string;
  amendmentsThroughSequence: number;
  builtAt: ISODateTime;
  expiresAt: ISODateTime;
  sourceVersions: Record<string, string | number>;
}
~~~

The permanent NexusRBX identity is server-owned and precedes project material. Project files, manifests, user content, and tool outputs are marked as untrusted data and cannot redefine identity, permission rules, tool schemas, verification gates, or destination IDs. Relevant file bodies are fetched narrowly after manifest search, matching the existing manifest-first convention rather than placing a whole place in the prompt.

## Execution and verification rules

1. The API authenticates, checks entitlement, and transactionally creates or reuses the task before any model/provider call. Pre-task denials still return a typed response with request/trace IDs.
2. Context construction records exact source versions and typed unavailable reasons. It may intentionally produce a degraded snapshot only when the selected capability permits degradation.
3. Internal planning is the default. The visibility toggle changes whether the plan is shown and approved; it does not switch to a different execution runtime. Explicit plan requests set `planVisibility=user_visible`.
4. Tool selection is the intersection of registry definition, current server authorization, project state, Studio advertisement, and task entitlement. Tool descriptions in a prompt are a projection, never the authority.
5. A side-effect step obtains its operation reservation before execution. Retries reuse the operation and reconcile ambiguity.
6. Studio-dependent work pauses at a persisted checkpoint when no compatible verified session exists. Backend-safe work may continue if dependency order permits.
7. File writes require the manifest version and known file hashes. Conflicts create a durable `ManifestConflict`; they are not overwritten or retried blindly.
8. Destructive Studio work snapshots first. Rollback success is itself verified and evented.
9. External submission, moderation, Studio execution, and final goal acceptance are separate evidence gates.
10. The final assistant response is generated from the task projection and verification evidence. It must name incomplete or waiting work instead of converting it to success.

## Verification policy by outcome

| Claimed outcome | Minimum target evidence |
| --- | --- |
| File created/updated in Studio | Matching live readback path/managed ID and resulting hash on expected place plus a complete manifest version |
| UI installed and usable | File/instance readback plus bounded structural validation; task-specific smoke check where supported |
| Roblox asset uploaded | Stable Roblox ID, correct owner/destination, provider/API readback, explicit moderation state |
| Icon pack complete | Requested members present, transparent-image checks, style-consistency thresholds, each approved member durably stored |
| Badge/game pass created | Current official API support and scope verified, stable external ID, owner/universe readback, artwork relation, requested/selected price evidence where supported |
| Asset replacement complete | New relation verified, intended project references read back, prior external asset relation unchanged |
| Task succeeded | Every required acceptance check passed with non-expired evidence; no unresolved blocker or outcome-unknown operation |

## Architectural invariants for Prompts 2 and 3

- No task, step, command, asset, or operation is addressable without an owner check.
- Project and universe IDs come from verified server bindings, never untrusted browser metadata alone.
- One logical external creation has one stable operation ID across retries, reconnects, deployments, and amendments unless the user intentionally requests a different resource.
- The model cannot grant itself a tool, scope, entitlement, destination, or completion status.
- Terminal projection changes and their source events are atomic or replayable.
- A provider timeout after request dispatch is an unknown outcome, not a clean failure.
- Detailed progress survives process and browser restarts; Redis is acceleration/stream fan-out, not the only record.
- Chat contexts remain isolated; shared assets/files require an explicit owner-checked universe binding and visibility.
- Generated code and project content are untrusted until validated, scoped, and reviewed according to the capability policy.
- Old job/run/asset readers remain available until migration shadow comparisons and the end-to-end gates in [acceptance-tests-and-risks.md](./acceptance-tests-and-risks.md) pass.
