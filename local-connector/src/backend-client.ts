import { ConnectorError, isAbortError } from "./errors.js";
import type { Logger } from "./logger.js";
import type {
  BackendClientLike,
  JsonObject,
  PairClaimResponse,
  StudioCapabilities,
  StudioCommand,
} from "./types.js";

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
    const response: PairClaimResponse = {
      token,
      sessionId: requireString(body, "sessionId"),
      userId: requireString(body, "userId"),
      pollIntervalMs: requirePositiveInteger(body, "pollIntervalMs"),
      expiresInMs: requirePositiveInteger(body, "expiresInMs"),
    };
    this.#token = token;
    this.options.logger.addSecret(token);
    return response;
  }

  ping(body: JsonObject, signal?: AbortSignal): Promise<JsonObject> {
    return this.request("POST", "/api/studio/mcp/session/ping", body, {
      authenticated: true,
      retry: true,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  registerCapabilities(
    capabilities: StudioCapabilities,
    supportedCommands: string[],
    discoveredTools: Array<{ name: string; description?: string }>,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    const tools = discoveredTools.map((tool) => ({
      name: tool.name,
      ...(tool.description === undefined ? {} : { description: tool.description.slice(0, 512) }),
    }));
    return this.request(
      "POST",
      "/api/studio/mcp/capabilities",
      { capabilities: { ...capabilities }, supportedCommands, discoveredTools: tools },
      { authenticated: true, retry: true, ...(signal === undefined ? {} : { signal }) },
    );
  }

  async pollNext(waitMs: number, signal?: AbortSignal): Promise<StudioCommand | null> {
    const response = await this.request(
      "GET",
      `/api/studio/mcp/commands/next?waitMs=${encodeURIComponent(String(waitMs))}`,
      undefined,
      {
        authenticated: true,
        retry: true,
        ...(signal === undefined ? {} : { signal }),
        timeoutMs: waitMs + 5_000,
        allowNoContent: true,
      },
    );
    if (Object.keys(response).length === 0) return null;
    const raw = response.command;
    if (!isRecord(raw)) throw new ConnectorError("BACKEND_RESPONSE_INVALID", "Command response is malformed.");
    const payload = raw.payload;
    if (!isJsonObject(payload)) throw new ConnectorError("BACKEND_RESPONSE_INVALID", "Command payload is malformed.");
    const command: StudioCommand = {
      id: requireString(raw, "id"),
      type: requireString(raw, "type"),
      payload,
    };
    copyOptionalString(raw, command, "runId");
    copyOptionalString(raw, command, "stepId");
    copyOptionalString(raw, command, "label");
    copyOptionalString(raw, command, "applyMode");
    if (typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)) command.createdAt = raw.createdAt;
    return command;
  }

  acknowledge(
    commandId: string,
    status: "succeeded" | "failed",
    result: JsonObject,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    return this.request(
      "POST",
      `/api/studio/mcp/commands/${encodeURIComponent(commandId)}/ack`,
      status === "succeeded" ? { status, result } : { status, error: result.error ?? result, result },
      { authenticated: true, retry: true, ...(signal === undefined ? {} : { signal }) },
    );
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
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new ConnectorError(
      retryable ? "BACKEND_TEMPORARY_ERROR" : "BACKEND_REQUEST_REJECTED",
      serverMessage?.slice(0, 512) ?? `NexusRBX rejected the request (${response.status}).`,
      { retryable, details: { status: response.status } },
    );
  }
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
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
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

function copyOptionalString(source: Record<string, unknown>, target: StudioCommand, key: "runId" | "stepId" | "label" | "applyMode"): void {
  const value = source[key];
  if (typeof value === "string") target[key] = value;
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
