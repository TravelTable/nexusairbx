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
  runId?: string;
  stepId?: string;
  label?: string;
  applyMode?: string;
  createdAt?: number;
}

export interface CommandEnvelope {
  command: StudioCommand;
}

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
    signal?: AbortSignal,
  ): Promise<JsonObject>;
  pollNext(waitMs: number, signal?: AbortSignal): Promise<StudioCommand | null>;
  acknowledge(
    commandId: string,
    status: "succeeded" | "failed",
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

