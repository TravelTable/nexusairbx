import { ConnectorError, isAbortError } from "./errors.js";
import type { Logger } from "./logger.js";
import type {
  BackendClientLike,
  CapabilityDetails,
  CommandReceiptStatus,
  JsonObject,
  PairClaimResponse,
  StudioCapabilities,
  StudioCommand,
  StudioIdentityMetadata,
} from "./types.js";
import { CONNECTOR_PROTOCOL_VERSION } from "./version.js";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
// The Express backend uses a 2 MiB JSON parser limit. Keep connector requests
// below that ceiling so failures are local, structured, and never retried.
const MAX_REQUEST_BYTES = 1_750_000;

export interface BackendClientOptions {
  apiUrl: string;
  connectorVersion: string;
  requestTimeoutMs: number;
  fetch?: typeof globalThis.fetch;
  logger: Logger;
  retryDelaysMs?: number[];
}

export class NexusBackendClient implements BackendClientLike {
  readonly #fetch: typeof globalThis.fetch;
  readonly #retryDelaysMs: number[];
  #token: string | null = null;

  constructor(private readonly options: BackendClientOptions) {
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#retryDelaysMs = options.retryDelaysMs ?? [250, 1_000];
  }

  async claimPairing(code: string, signal?: AbortSignal): Promise<PairClaimResponse> {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(normalized)) {
      throw new ConnectorError("PAIR_CODE_INVALID", "The pairing code format is invalid.");
    }
    const body = await this.request(
      "POST",
      "/api/studio/mcp/pair/claim",
      {
        code: normalized,
        connector: {
          connectorVersion: this.options.connectorVersion,
          platform: process.platform,
          nodeVersion: process.version,
        },
      },
      { authenticated: false, retry: false, ...(signal === undefined ? {} : { signal }) },
    );
    const token = requireString(body, "token");
    if (!/^nsmcp_[A-Za-z0-9_-]+_[A-Za-z0-9._~-]+$/.test(token)) {
      throw new ConnectorError("PAIR_RESPONSE_INVALID", "The pairing response contained an invalid connector token.");
    }
    const targetObservationToken = optionalTargetObservationToken(body.targetObservationToken);
    const response: PairClaimResponse = {
      token,
      sessionId: requireString(body, "sessionId"),
      userId: requireString(body, "userId"),
      pollIntervalMs: requirePositiveInteger(body, "pollIntervalMs"),
      expiresInMs: requirePositiveInteger(body, "expiresInMs"),
      ...(targetObservationToken ? { targetObservationToken } : {}),
    };
    this.#token = token;
    this.options.logger.addSecret(token);
    if (targetObservationToken) this.options.logger.addTransientSecret(targetObservationToken);
    return response;
  }

  /** Restores a token only after the desktop shell has decrypted it with the OS credential store. */
  restoreToken(token: string): void {
    if (!/^nsmcp_[A-Za-z0-9_-]+_[A-Za-z0-9._~-]+$/.test(token)) {
      throw new ConnectorError("CONNECTOR_TOKEN_INVALID", "The saved connector token is invalid.");
    }
    this.#token = token;
    this.options.logger.addSecret(token);
  }

  ping(body: JsonObject, signal?: AbortSignal): Promise<JsonObject> {
    return this.request("POST", "/api/studio/mcp/session/ping", body, {
      authenticated: true,
		retry: false,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  registerCapabilities(
    capabilities: StudioCapabilities,
    supportedCommands: string[],
    discoveredTools: Array<{ name: string; description?: string }>,
    capabilityDetails: CapabilityDetails,
    studioIdentity: StudioIdentityMetadata,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    const tools = discoveredTools.map((tool) => ({
      name: tool.name,
      ...(tool.description === undefined ? {} : { description: tool.description.slice(0, 512) }),
    }));
    return this.request(
      "POST",
      "/api/studio/mcp/capabilities",
      {
        capabilities: { ...capabilities },
        capabilityDetails,
        supportedCommands,
        discoveredTools: tools,
        connectorVersion: this.options.connectorVersion,
        connectorProtocolVersion: CONNECTOR_PROTOCOL_VERSION,
        ...studioIdentity,
      },
      {
        authenticated: true,
		retry: true,
		targetObservationToken: studioIdentity.targetObservationToken ?? null,
        ...(signal === undefined ? {} : { signal }),
      },
    );
  }

  async pollNext(
    waitMs: number,
    targetObservationToken: string | null,
    signal?: AbortSignal,
  ): Promise<StudioCommand | null> {
    const response = await this.request(
      "GET",
      `/api/studio/mcp/commands/next?waitMs=${encodeURIComponent(String(waitMs))}`,
      undefined,
      {
        authenticated: true,
		retry: false,
        ...(signal === undefined ? {} : { signal }),
        timeoutMs: waitMs + 5_000,
        allowNoContent: true,
        targetObservationToken,
      },
    );
    if (Object.keys(response).length === 0) return null;
    const raw = response.command;
    if (!isRecord(raw)) throw new ConnectorError("BACKEND_RESPONSE_INVALID", "Command response is malformed.");
    return parseStudioCommand(raw);
  }

  acknowledge(
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    targetObservationToken: string | null,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    const terminalError = status === "failed" || status === "outcome_unknown";
    return this.request(
      "POST",
      `/api/studio/mcp/commands/${encodeURIComponent(commandId)}/ack`,
      terminalError
        ? { status, error: result.error ?? result, result, targetObservationToken }
        : { status, result, targetObservationToken },
      {
        authenticated: true,
        retry: true,
        targetObservationToken,
        ...(signal === undefined ? {} : { signal }),
      },
    );
  }

  revokeCurrentSession(signal?: AbortSignal): Promise<JsonObject> {
    return this.request("POST", "/api/studio/mcp/session/revoke", {}, {
      authenticated: true,
      retry: false,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  clearToken(): void {
    this.#token = null;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body: JsonObject | undefined,
    policy: {
      authenticated: boolean;
      retry: boolean;
      signal?: AbortSignal;
      timeoutMs?: number;
      allowNoContent?: boolean;
      targetObservationToken?: string | null;
    },
  ): Promise<JsonObject> {
    const attempts = policy.retry ? this.#retryDelaysMs.length + 1 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.requestOnce(method, path, body, policy);
      } catch (error) {
        if (isAbortError(error) || policy.signal?.aborted) throw error;
        lastError = error;
        if (error instanceof ConnectorError && !error.retryable) throw error;
        if (attempt >= attempts - 1) break;
        const delay = this.#retryDelaysMs[attempt];
        if (delay === undefined) break;
        this.options.logger.warn("Temporary NexusRBX request failure; retrying.", {
          operation: `${method} ${path.split("?")[0]}`,
          attempt: attempt + 1,
        });
        await abortableDelay(delay, policy.signal);
      }
    }
    if (lastError instanceof ConnectorError) throw lastError;
    throw new ConnectorError("BACKEND_UNAVAILABLE", "NexusRBX is temporarily unavailable.", {
      retryable: true,
      cause: lastError,
    });
  }

  private async requestOnce(
    method: "GET" | "POST",
    path: string,
    body: JsonObject | undefined,
    policy: {
      authenticated: boolean;
      retry: boolean;
      signal?: AbortSignal;
      timeoutMs?: number;
      allowNoContent?: boolean;
      targetObservationToken?: string | null;
    },
  ): Promise<JsonObject> {
    if (policy.authenticated && this.#token === null) {
      throw new ConnectorError("CONNECTOR_NOT_PAIRED", "The connector has not claimed a pairing code.");
    }
    const timeout = AbortSignal.timeout(policy.timeoutMs ?? this.options.requestTimeoutMs);
    const signal = policy.signal ? AbortSignal.any([policy.signal, timeout]) : timeout;
    const headers: Record<string, string> = { Accept: "application/json" };
    const serializedBody = body === undefined ? undefined : JSON.stringify(body);
    if (serializedBody !== undefined && Buffer.byteLength(serializedBody, "utf8") > MAX_REQUEST_BYTES) {
      throw new ConnectorError(
        "BACKEND_REQUEST_TOO_LARGE",
        "The connector request is too large for NexusRBX.",
        { details: { maxBytes: MAX_REQUEST_BYTES } },
      );
    }
    if (serializedBody !== undefined) headers["Content-Type"] = "application/json";
    if (policy.authenticated && this.#token !== null) headers.Authorization = `Bearer ${this.#token}`;
    if (policy.authenticated) {
      headers["X-NexusRBX-Connector-Version"] = this.options.connectorVersion;
      headers["X-NexusRBX-Connector-Protocol"] = CONNECTOR_PROTOCOL_VERSION;
      if (policy.targetObservationToken) {
        headers["X-NexusRBX-Target-Observation"] = policy.targetObservationToken;
      }
    }

    let response: Response;
    try {
      response = await this.#fetch(`${this.options.apiUrl}${path}`, {
        method,
        headers,
        ...(serializedBody === undefined ? {} : { body: serializedBody }),
        signal,
      });
    } catch (error) {
      if (isAbortError(error) || signal.aborted) {
        if (policy.signal?.aborted) throw policy.signal.reason;
        throw new ConnectorError("BACKEND_TIMEOUT", "The NexusRBX request timed out.", { retryable: true, cause: error });
      }
      throw new ConnectorError("BACKEND_UNAVAILABLE", "Could not reach NexusRBX.", { retryable: true, cause: error });
    }

    if (response.status === 204 && policy.allowNoContent) return {};
    const parsed = await readJsonResponse(response);
    if (response.ok) return parsed;
    if (response.status === 401 || response.status === 403) {
      throw new ConnectorError("CONNECTOR_AUTH_FAILED", "The connector session is invalid, expired, or revoked.");
    }
    const serverMessage = typeof parsed.message === "string" ? parsed.message : undefined;
    const serverCode = typeof parsed.code === "string" && /^[A-Z0-9_]{2,64}$/.test(parsed.code) ? parsed.code : undefined;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new ConnectorError(
      retryable ? "BACKEND_TEMPORARY_ERROR" : "BACKEND_REQUEST_REJECTED",
      serverMessage?.slice(0, 512) ?? `NexusRBX rejected the request (${response.status}).`,
      { retryable, details: { status: response.status, ...(serverCode ? { serverCode } : {}) } },
    );
  }
}

function optionalTargetObservationToken(value: unknown): string | undefined {
  const token = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : undefined;
}

async function readJsonResponse(response: Response): Promise<JsonObject> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new ConnectorError("BACKEND_RESPONSE_TOO_LARGE", "NexusRBX returned an oversized response.");
  }
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) {
    throw new ConnectorError("BACKEND_RESPONSE_TOO_LARGE", "NexusRBX returned an oversized response.");
  }
  if (text.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConnectorError("BACKEND_RESPONSE_INVALID", "NexusRBX returned malformed JSON.");
  }
  if (!isJsonObject(parsed)) throw new ConnectorError("BACKEND_RESPONSE_INVALID", "NexusRBX returned an invalid response.");
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function requireString(record: Record<string, unknown> | JsonObject, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ConnectorError("BACKEND_RESPONSE_INVALID", `NexusRBX response is missing ${key}.`);
  }
  return value;
}

function requirePositiveInteger(record: Record<string, unknown> | JsonObject, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ConnectorError("BACKEND_RESPONSE_INVALID", `NexusRBX response is missing ${key}.`);
  }
  return value;
}

function parseStudioCommand(raw: Record<string, unknown>): StudioCommand {
  const payload = raw.payload;
  if (!isJsonObject(payload)) throw new ConnectorError("BACKEND_RESPONSE_INVALID", "Command payload is malformed.");
  const command: StudioCommand = {
    id: requireString(raw, "id"),
    type: requireString(raw, "type"),
    payload,
  };

  copyOptionalNullableString(raw, command, "taskId");
  copyOptionalNullableString(raw, command, "runId");
  copyOptionalNullableString(raw, command, "stepId");
  copyOptionalNullableString(raw, command, "projectId");
  copyOptionalNullableString(raw, command, "universeId");
  copyOptionalNullableString(raw, command, "placeId");
  copyOptionalNullableString(raw, command, "targetId");
  copyOptionalNullableString(raw, command, "sessionId");
  copyOptionalNullableString(raw, command, "expectedPlaceId");
  copyOptionalNullableString(raw, command, "expectedUniverseId");
  copyOptionalNullableString(raw, command, "expectedPlaceSignature");
  copyOptionalNullableString(raw, command, "expectedStudioWindowId");
  copyOptionalNullableString(raw, command, "capability");
  copyOptionalString(raw, command, "commandId");
  copyOptionalString(raw, command, "operationId");
  copyOptionalString(raw, command, "idempotencyKey");
  copyOptionalString(raw, command, "userId");
  copyOptionalString(raw, command, "connectionType");
  copyOptionalString(raw, command, "label");
  copyOptionalString(raw, command, "applyMode");
  copyOptionalString(raw, command, "semanticInputHash");
  copyOptionalString(raw, command, "status");
  copyOptionalString(raw, command, "operationOutcome");
  copyOptionalFiniteNumber(raw, command, "targetGeneration");
  copyOptionalFiniteNumber(raw, command, "lifecycleVersion");
  copyOptionalFiniteNumber(raw, command, "createdAt");
  copyOptionalFiniteNumber(raw, command, "expiresAt");
  copyOptionalFiniteNumber(raw, command, "deliveredAt");
  copyOptionalNullableObject(raw, command, "studioTarget");
  copyOptionalObject(raw, command, "preconditions");

  const hasLifecycleMarker = [
    "lifecycleVersion",
    "lease",
    "semanticInputHash",
    "attempts",
    "operationOutcome",
  ].some((key) => Object.hasOwn(raw, key));
  if (!hasLifecycleMarker) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_UNSUPPORTED",
      "NexusRBX sent an unversioned Studio command envelope.",
    );
  }
  if (raw.lifecycleVersion !== 2) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_UNSUPPORTED",
      "NexusRBX sent an unsupported Studio command lifecycle envelope.",
    );
  }
  if (raw.connectionType !== "mcp_local") {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle connection type is missing or invalid.",
    );
  }
  if (raw.commandId !== command.id) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle identity is inconsistent.",
    );
  }
  if (raw.status !== "leased" || raw.operationOutcome !== "reserved") {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command is not in a dispatchable lifecycle state.",
    );
  }
  if (typeof raw.semanticInputHash !== "string" || !/^[a-f0-9]{64}$/i.test(raw.semanticInputHash)) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle hash is missing or invalid.",
    );
  }
  command.semanticInputHash = raw.semanticInputHash.toLowerCase();

  if (!isRecord(raw.attempts)) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle attempts are missing.",
    );
  }
  const delivery = requireSafePositiveInteger(raw.attempts, "delivery");
  const maximum = requireSafePositiveInteger(raw.attempts, "maximum");
  if (delivery > maximum) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle attempt is outside its allowed range.",
    );
  }
  command.attempts = { delivery, maximum };

  if (!isRecord(raw.lease)) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "The Studio command lifecycle lease is missing.",
    );
  }
  const owner = requireNonEmptyString(raw.lease, "owner");
  const fence = requireSafePositiveInteger(raw.lease, "fence");
  const targetFence = requireSafeNonNegativeInteger(raw.lease, "targetFence");
  const expiresAt = requirePositiveFiniteNumber(raw.lease, "expiresAt");
  command.lease = { owner, fence, targetFence, expiresAt };
  return command;
}

function copyOptionalString(
  source: Record<string, unknown>,
  target: StudioCommand,
  key:
    | "commandId"
    | "operationId"
    | "idempotencyKey"
    | "userId"
    | "connectionType"
    | "label"
    | "applyMode"
    | "semanticInputHash"
    | "status"
    | "operationOutcome",
): void {
  const value = source[key];
  if (typeof value === "string") target[key] = value;
}

function copyOptionalNullableString(
  source: Record<string, unknown>,
  target: StudioCommand,
  key:
    | "taskId"
    | "runId"
    | "stepId"
    | "projectId"
    | "universeId"
    | "placeId"
    | "targetId"
    | "sessionId"
    | "expectedPlaceId"
    | "expectedUniverseId"
    | "expectedPlaceSignature"
    | "expectedStudioWindowId"
    | "capability",
): void {
  const value = source[key];
  if (typeof value === "string" || value === null) target[key] = value;
}

function copyOptionalFiniteNumber(
  source: Record<string, unknown>,
  target: StudioCommand,
  key: "targetGeneration" | "lifecycleVersion" | "createdAt" | "expiresAt" | "deliveredAt",
): void {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) target[key] = value;
}

function copyOptionalObject(
  source: Record<string, unknown>,
  target: StudioCommand,
  key: "preconditions",
): void {
  const value = source[key];
  if (isJsonObject(value)) target[key] = value;
}

function copyOptionalNullableObject(
  source: Record<string, unknown>,
  target: StudioCommand,
  key: "studioTarget",
): void {
  const value = source[key];
  if (isJsonObject(value) || value === null) target[key] = value;
}

function requireNonEmptyString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ConnectorError("CONNECTOR_LIFECYCLE_ENVELOPE_INVALID", `Studio command lifecycle ${key} is invalid.`);
  }
  return value;
}

function requireSafePositiveInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ConnectorError("CONNECTOR_LIFECYCLE_ENVELOPE_INVALID", `Studio command lifecycle ${key} is invalid.`);
  }
  return value;
}

function requireSafeNonNegativeInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ConnectorError("CONNECTOR_LIFECYCLE_ENVELOPE_INVALID", `Studio command lifecycle ${key} is invalid.`);
  }
  return value;
}

function requirePositiveFiniteNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ConnectorError("CONNECTOR_LIFECYCLE_ENVELOPE_INVALID", `Studio command lifecycle ${key} is invalid.`);
  }
  return value;
}

function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
