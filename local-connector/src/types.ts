export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface PairClaimResponse {
  token: string;
  sessionId: string;
  userId: string;
  pollIntervalMs: number;
  expiresInMs: number;
}

export interface StudioCommand {
  id: string;
  type: string;
  payload: JsonObject;
  commandId?: string;
  operationId?: string;
  idempotencyKey?: string;
  taskId?: string | null;
  runId?: string | null;
  stepId?: string | null;
  userId?: string;
  projectId?: string | null;
  universeId?: string | null;
  placeId?: string | null;
  targetId?: string | null;
  sessionId?: string | null;
  expectedPlaceId?: string | null;
  expectedUniverseId?: string | null;
  expectedPlaceSignature?: string | null;
  targetGeneration?: number;
  studioTarget?: JsonObject | null;
  capability?: string | null;
  connectionType?: string;
  label?: string;
  applyMode?: string;
  preconditions?: JsonObject;
  lifecycleVersion?: number;
  semanticInputHash?: string;
  status?: string;
  operationOutcome?: string;
  attempts?: StudioCommandAttempts;
  lease?: StudioCommandLease;
  createdAt?: number;
  expiresAt?: number;
  deliveredAt?: number;
}

export interface CommandEnvelope {
  command: StudioCommand;
}

export interface StudioCommandAttempts extends JsonObject {
  delivery: number;
  maximum: number;
}

export interface StudioCommandLease extends JsonObject {
  owner: string;
  fence: number;
  targetFence: number;
  expiresAt: number;
}

export type CommandReceiptStatus =
  | "received"
  | "started"
  | "succeeded"
  | "failed"
  | "outcome_unknown";

export interface StudioCapabilities {
  readProject: boolean;
  readScript: boolean;
  writeScript: boolean;
  patchScript: boolean;
  inspectSelection: boolean;
  outputLogs: boolean;
  playtest: boolean;
  creatorStoreInsert: boolean;
  instanceMutation: boolean;
  snapshots: boolean;
}

export type CapabilityStatus = "supported" | "unavailable";

export interface CapabilityDetail extends JsonObject {
  status: CapabilityStatus;
  reasonCode: string;
  requiredCommands: string[];
  requiredTools: string[];
  verifiedAt: number | null;
}

export type CapabilityDetails = Record<keyof StudioCapabilities, CapabilityDetail>;

export interface StudioTarget extends JsonObject {
  studioId: string;
  label: string;
  placeId: string;
  placeName: string;
}

export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema: JsonObject;
  outputSchema?: JsonObject;
}

export interface ToolCallResult {
  isError?: boolean;
  content?: unknown;
  structuredContent?: unknown;
  [key: string]: unknown;
}

export interface BackendErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  details?: JsonObject;
}

export interface CommandResult extends JsonObject {
  success: boolean;
  ok: boolean;
  commandId: string;
  operation: string;
  retryable: boolean;
  verified: boolean;
}

export interface CommandFailure extends CommandResult {
  success: false;
  ok: false;
  error: JsonObject;
}

export interface McpConnectionInfo {
  serverName?: string;
  serverVersion?: string;
}

export interface McpClientLike {
  connect(signal?: AbortSignal): Promise<McpConnectionInfo>;
  disconnect(): Promise<void>;
  listTools(signal?: AbortSignal): Promise<DiscoveredTool[]>;
  callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<ToolCallResult>;
  onToolsChanged(handler: () => void): void;
  onDisconnect(handler: (error?: Error) => void): void;
}

export interface BackendClientLike {
  claimPairing(code: string, signal?: AbortSignal): Promise<PairClaimResponse>;
  ping(
    body: JsonObject,
    signal?: AbortSignal,
  ): Promise<JsonObject>;
  registerCapabilities(
    capabilities: StudioCapabilities,
    supportedCommands: string[],
    discoveredTools: Array<{ name: string; description?: string }>,
    capabilityDetails: CapabilityDetails,
    signal?: AbortSignal,
  ): Promise<JsonObject>;
  pollNext(waitMs: number, signal?: AbortSignal): Promise<StudioCommand | null>;
  acknowledge(
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    signal?: AbortSignal,
  ): Promise<JsonObject>;
  clearToken(): void;
}

export const EMPTY_CAPABILITIES: StudioCapabilities = Object.freeze({
  readProject: false,
  readScript: false,
  writeScript: false,
  patchScript: false,
  inspectSelection: false,
  outputLogs: false,
  playtest: false,
  creatorStoreInsert: false,
  instanceMutation: false,
  snapshots: false,
});
