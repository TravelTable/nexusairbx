import { asConnectorError, ConnectorError, isAbortError } from "./errors.js";
import { CommandExecutor } from "./command-executor.js";
import { ToolCatalog } from "./tool-catalog.js";
import { StudioTargetManager } from "./studio-targeting.js";
import type { ConnectorConfig } from "./config.js";
import type { Logger } from "./logger.js";
import type {
  BackendClientLike,
  JsonObject,
  McpClientLike,
  McpConnectionInfo,
  PairClaimResponse,
  StudioCommand,
} from "./types.js";
import { EMPTY_CAPABILITIES } from "./types.js";
import { CONNECTOR_PROTOCOL_VERSION } from "./version.js";

const MUTATING_COMMANDS = new Set(["create_script", "write_script", "patch_script", "create_instance", "update_properties", "update_attributes", "update_tags", "rename_instance", "move_instance", "duplicate_instance", "delete_instance", "batch_operations", "restore_snapshot", "undo_last_batch", "insert_creator_store_asset", "run_test_service", "run_play_test", "stop_play_test"]);

export interface LocalConnectorOptions {
  config: ConnectorConfig;
  connectorVersion: string;
  backend: BackendClientLike;
  mcp: McpClientLike;
  logger: Logger;
  /** The desktop companion retains its encrypted token so it can reconnect after restart. */
  clearTokenOnShutdown?: boolean;
  /** Allows the desktop preference to pause MCP reconnect attempts without stopping cloud health reporting. */
  shouldAutoReconnect?: () => boolean;
  onLifecycleState?: (state: ConnectorLifecycleState) => void;
  onTelemetry?: (telemetry: ConnectorTelemetry) => void;
}

export type ConnectorLifecycleState = "connecting" | "studio_mcp_unavailable" | "degraded" | "ready" | "stopped";
export interface ConnectorTelemetry {
  stage?: "runtime" | "studio_detection" | "mcp" | "tool_discovery" | "ready";
  cloudConnected?: boolean;
  mcpConnected?: boolean;
  supportedTools?: string[];
  supportedToolCount?: number;
  mcpServerVersion?: string;
  experienceName?: string;
  lastHeartbeatAt?: number;
  lastActivityAt?: number;
  lastCommand?: { name: string; status: "succeeded" | "failed"; at: number };
  degradedReason?: "studio_closed" | "mcp_initialization_failed" | "zero_supported_tools" | "multiple_studio_windows" | "target_place_unavailable" | "cloud_loss";
}

/** Coordinates one in-memory pairing session. A process restart requires a new code. */
export class NexusLocalConnector {
  readonly #config: ConnectorConfig;
  readonly #backend: BackendClientLike;
  readonly #mcp: McpClientLike;
  readonly #logger: Logger;
  readonly #connectorVersion: string;
  readonly #clearTokenOnShutdown: boolean;
  readonly #shouldAutoReconnect: () => boolean;
  readonly #onLifecycleState: ((state: ConnectorLifecycleState) => void) | undefined;
  readonly #onTelemetry: ((telemetry: ConnectorTelemetry) => void) | undefined;
  #catalog: ToolCatalog | null = null;
  #executor: CommandExecutor | null = null;
  #mcpConnected = false;
  #toolsDirty = false;
  #mcpInfo: McpConnectionInfo = {};
  #announcedUnavailable = false;
  #targeting: StudioTargetManager | null = null;

  constructor(options: LocalConnectorOptions) {
    this.#config = options.config;
    this.#backend = options.backend;
    this.#mcp = options.mcp;
    this.#logger = options.logger;
    this.#connectorVersion = options.connectorVersion;
    this.#clearTokenOnShutdown = options.clearTokenOnShutdown ?? true;
    this.#shouldAutoReconnect = options.shouldAutoReconnect ?? (() => true);
    this.#onLifecycleState = options.onLifecycleState;
    this.#onTelemetry = options.onTelemetry;
    this.#mcp.onToolsChanged(() => {
      this.#toolsDirty = true;
    });
    this.#mcp.onDisconnect((error) => {
      if (!this.#mcpConnected) return;
      this.#mcpConnected = false;
      this.#catalog = null;
      this.#executor = null;
      this.#targeting = null;
      this.#mcpInfo = {};
      this.#announcedUnavailable = false;
      this.#logger.warn(error?.message ?? "Roblox Studio MCP disconnected; reconnecting.");
      this.emitLifecycleState("studio_mcp_unavailable");
      this.emitTelemetry({ mcpConnected: false, degradedReason: "studio_closed" });
    });
  }

  async run(pairCode: string, externalSignal?: AbortSignal): Promise<void> {
    if (externalSignal?.aborted) throw abortReason(externalSignal);
    this.#logger.info("Connecting to NexusRBX…");
    const claim = await this.#backend.claimPairing(pairCode, externalSignal);
    this.#logger.info("NexusRBX connected.");
    return this.runClaimed(claim, externalSignal);
  }

  /** Runs a previously claimed session. Used by the desktop companion after securely restoring its token. */
  async runClaimed(claim: PairClaimResponse, externalSignal?: AbortSignal): Promise<void> {
    if (externalSignal?.aborted) throw abortReason(externalSignal);
    this.emitLifecycleState("connecting");
    this.emitTelemetry({ stage: "runtime", cloudConnected: true, mcpConnected: false });

    const lifetime = new AbortController();
    const signal = externalSignal ? AbortSignal.any([externalSignal, lifetime.signal]) : lifetime.signal;
    let backgroundError: unknown;
    const heartbeat = this.heartbeatLoop(signal).catch((error: unknown) => {
      if (signal.aborted && isAbortLike(error)) return;
      backgroundError = error;
      lifetime.abort(error);
    });

    try {
      await this.commandLoop(claim, signal);
      if (backgroundError !== undefined) throw backgroundError;
    } catch (error) {
      if (!(externalSignal?.aborted && isAbortLike(error))) throw error;
    } finally {
      lifetime.abort(new DOMException("Connector stopped", "AbortError"));
      await heartbeat;
      await this.shutdown();
    }
  }

  private async commandLoop(claim: PairClaimResponse, signal: AbortSignal): Promise<void> {
    let reconnectDelay = this.#config.reconnectMinMs;
    while (!signal.aborted) {
      if (!this.#mcpConnected) {
        try {
          await this.connectAndDiscover(signal);
          reconnectDelay = this.#config.reconnectMinMs;
        } catch (error) {
          if (signal.aborted) break;
          const connectorError = asConnectorError(error, "MCP_CONNECT_FAILED");
          this.#logger.warn("Roblox Studio MCP is unavailable; retrying.", {
            code: connectorError.code,
            retryInMs: reconnectDelay,
          });
          await this.announceUnavailable();
          if (!this.#shouldAutoReconnect()) {
            await waitForAbort(signal);
            break;
          }
          await delay(reconnectDelay, signal);
          reconnectDelay = Math.min(reconnectDelay * 2, this.#config.reconnectMaxMs);
          continue;
        }
      }

      if (this.#toolsDirty) {
        try {
          await this.refreshCatalog(signal);
        } catch (error) {
          if (signal.aborted) break;
          this.#logger.warn("Roblox Studio MCP capability refresh failed; reconnecting.", {
            code: asConnectorError(error).code,
          });
          await this.dropMcpConnection();
          continue;
        }
      }

      try {
        const command = await this.#backend.pollNext(this.#config.pollWaitMs, signal);
        if (command === null) {
          if (claim.pollIntervalMs > 0) await delay(Math.min(claim.pollIntervalMs, 5_000), signal);
          continue;
        }
        await this.executeAndAcknowledge(command, signal);
      } catch (error) {
        if (signal.aborted) break;
        const connectorError = asConnectorError(error);
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("Temporary command-loop failure; continuing.", { code: connectorError.code });
        await delay(Math.min(claim.pollIntervalMs, 5_000), signal);
      }
    }
  }

  private async connectAndDiscover(signal: AbortSignal): Promise<void> {
    this.#logger.info("Detecting Roblox Studio MCP…");
    this.emitTelemetry({ stage: "studio_detection" });
    try {
      this.emitTelemetry({ stage: "mcp" });
      this.#mcpInfo = await this.#mcp.connect(signal);
      this.#mcpConnected = true;
      this.#announcedUnavailable = false;
      this.emitTelemetry({ stage: "tool_discovery", mcpConnected: true, ...(this.#mcpInfo.serverVersion ? { mcpServerVersion: this.#mcpInfo.serverVersion } : {}) });
      const runtime = await this.refreshCatalog(signal);
      this.#logger.info("Roblox Studio MCP connected.");
      this.#logCapabilities();
      this.#logger.info("NexusRBX is connected to Roblox Studio. Press Ctrl+C to disconnect.");
      if (runtime.supportedCommands.length === 0) {
        this.emitTelemetry({ stage: "ready", degradedReason: runtime.degradedReason ?? "zero_supported_tools" });
        this.emitLifecycleState("degraded");
      } else {
        this.emitTelemetry({ stage: "ready" });
        this.emitLifecycleState("ready");
      }
    } catch (error) {
      await this.dropMcpConnection();
      throw error;
    }
  }

  private async refreshCatalog(signal: AbortSignal): Promise<RuntimeCapabilities> {
    this.#toolsDirty = false;
    const tools = await this.#mcp.listTools(signal);
    const catalog = new ToolCatalog(tools);
    if (this.#executor === null) this.#executor = new CommandExecutor(this.#mcp, catalog);
    else this.#executor.updateCatalog(catalog);
    this.#catalog = catalog;
    if (catalog.listStudios && catalog.setActiveStudio && catalog.studioState) {
      this.#targeting ??= new StudioTargetManager(this.#mcp);
      await this.#targeting.refresh(signal);
    } else this.#targeting = null;
    if (this.#targeting) {
      const changed = this.#targeting.acceptBackendResponse(await this.#backend.ping(this.pingPayload(true), signal));
      if (changed) await this.#targeting.refresh(signal);
    }
    const runtime = runtimeCapabilities(catalog, this.#targeting);
    this.emitTelemetry({
      supportedTools: tools.map((tool) => tool.name).sort(),
      supportedToolCount: runtime.supportedCommands.length,
      mcpConnected: true,
      ...(runtime.supportedCommands.length === 0
        ? { degradedReason: runtime.degradedReason ?? "zero_supported_tools" }
        : {}),
    });
    await this.#backend.registerCapabilities(
      runtime.capabilities,
      runtime.supportedCommands,
      tools.map((tool) => ({
        name: tool.name,
        ...(tool.description === undefined ? {} : { description: tool.description }),
      })),
      runtime.capabilityDetails,
      signal,
    );
    await this.refreshExperienceSummary(tools, signal);
    return runtime;
  }

  private async refreshExperienceSummary(tools: Array<{ name: string }>, signal: AbortSignal): Promise<void> {
    if (!tools.some((tool) => tool.name === "get_studio_state")) return;
    try {
      const result = await this.#mcp.callTool("get_studio_state", {}, signal);
      const experienceName = extractExperienceName(result);
      if (experienceName) this.emitTelemetry({ experienceName });
    } catch (error) {
      this.#logger.debug("Could not read the active Studio experience summary.", {
        code: asConnectorError(error).code,
      });
    }
  }

  private async executeAndAcknowledge(command: StudioCommand, signal: AbortSignal): Promise<void> {
    const executor = this.#executor;
    if (!executor) throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    if (MUTATING_COMMANDS.has(command.type)) await this.#targeting?.ensureMutationTarget(signal);
    const startedAt = Date.now();
    const result = await executor.execute(command, signal);
    result.duration = Date.now() - startedAt;
    const success = result.success === true && (!MUTATING_COMMANDS.has(command.type) || result.verified === true);
    await this.#backend.acknowledge(command.id, success ? "succeeded" : "failed", result, signal);
    const completedAt = Date.now();
    this.emitTelemetry({ lastActivityAt: completedAt, lastCommand: { name: command.type, status: success ? "succeeded" : "failed", at: completedAt } });
    this.#logger.info(success ? "Studio command completed." : "Studio command failed safely.", {
      commandId: command.id,
      operation: command.type,
      ...(success ? {} : { code: errorCode(result) }),
    });
  }

  private async heartbeatLoop(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      await delay(this.#config.heartbeatMs, signal);
      try {
        const activeStudioId = this.#targeting?.activeStudioId;
        if (this.#mcpConnected) await this.#targeting?.refresh(signal);
        if (this.#targeting?.activeStudioId !== activeStudioId) this.#toolsDirty = true;
        const response = await this.#backend.ping(this.pingPayload(this.#mcpConnected), signal);
        if (this.#targeting?.acceptBackendResponse(response)) this.#toolsDirty = true;
        this.emitTelemetry({ cloudConnected: true, lastHeartbeatAt: Date.now() });
      } catch (error) {
        if (signal.aborted) return;
        const connectorError = asConnectorError(error);
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("NexusRBX heartbeat failed temporarily.", { code: connectorError.code });
        this.emitTelemetry({ cloudConnected: false, degradedReason: "cloud_loss" });
      }
    }
  }

  private pingPayload(available: boolean): JsonObject {
    return {
      mcpServerAvailable: available,
      connectorVersion: this.#connectorVersion,
      connectorProtocolVersion: CONNECTOR_PROTOCOL_VERSION,
      ...(available && this.#mcpInfo.serverVersion !== undefined
        ? { mcpServerVersion: this.#mcpInfo.serverVersion }
        : {}),
      ...(available && this.#targeting ? this.#targeting.metadata() : {}),
    };
  }

  private async announceUnavailable(): Promise<void> {
    if (this.#announcedUnavailable) return;
    this.#announcedUnavailable = true;
    this.emitLifecycleState("studio_mcp_unavailable");
    this.emitTelemetry({ mcpConnected: false, degradedReason: "mcp_initialization_failed" });
    try {
      await this.#backend.registerCapabilities({ ...EMPTY_CAPABILITIES }, [], [], new ToolCatalog([]).capabilityDetails);
      await this.#backend.ping(this.pingPayload(false));
    } catch (error) {
      this.#logger.debug("Could not publish degraded connector state.", { code: asConnectorError(error).code });
    }
  }

  private async dropMcpConnection(): Promise<void> {
    this.#mcpConnected = false;
    this.#catalog = null;
    this.#executor = null;
    this.#targeting = null;
    this.#mcpInfo = {};
    await this.#mcp.disconnect();
  }

  #logCapabilities(): void {
    const capabilities = this.#catalog?.capabilities;
    if (!capabilities) return;
    this.#logger.info("Detected capabilities.", {
      projectInspection: capabilities.readProject,
      scriptReading: capabilities.readScript,
      scriptEditing: capabilities.writeScript,
      outputLogs: capabilities.outputLogs,
      playtestControl: capabilities.playtest,
    });
  }

  private async shutdown(): Promise<void> {
    try {
      await this.#backend.ping(this.pingPayload(false), AbortSignal.timeout(2_000));
    } catch {
      // The process may be offline or the session may already be revoked.
    }
    await this.dropMcpConnection();
    if (this.#clearTokenOnShutdown) this.#backend.clearToken();
    this.#logger.info("NexusRBX Local Connector stopped.");
    this.emitLifecycleState("stopped");
  }

  private emitLifecycleState(state: ConnectorLifecycleState): void {
    this.#onLifecycleState?.(state);
  }
  private emitTelemetry(telemetry: ConnectorTelemetry): void { this.#onTelemetry?.(telemetry); }
}

function errorCode(result: JsonObject): string {
  const error = result.error;
  if (typeof error === "object" && error !== null && !Array.isArray(error) && typeof error.code === "string") {
    return error.code;
  }
  return "COMMAND_FAILED";
}

export function extractExperienceName(result: unknown): string | null {
  const direct = findExperienceName(result, 0);
  if (direct) return direct;
  if (!isRecord(result) || !Array.isArray(result.content)) return null;
  for (const item of result.content) {
    if (!isRecord(item) || typeof item.text !== "string" || item.text.length > 100_000) continue;
    try {
      const parsed = JSON.parse(item.text) as unknown;
      const candidate = findExperienceName(parsed, 0);
      if (candidate) return candidate;
    } catch {
      // MCP text content is allowed to be plain text; only structured JSON is considered here.
    }
  }
  return null;
}

function findExperienceName(value: unknown, depth: number): string | null {
  if (!isRecord(value) || depth > 4) return null;
  for (const key of ["experienceName", "placeName", "gameName"] as const) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      const normalized = candidate.trim().replace(/\s+/g, " ").slice(0, 160);
      if (normalized) return normalized;
    }
  }
  for (const key of ["structuredContent", "studio", "experience", "place", "state", "data"] as const) {
    const candidate = findExperienceName(value[key], depth + 1);
    if (candidate) return candidate;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type RuntimeCapabilities = {
  capabilities: ToolCatalog["capabilities"];
  capabilityDetails: ToolCatalog["capabilityDetails"];
  supportedCommands: string[];
  degradedReason?: "multiple_studio_windows" | "target_place_unavailable";
};

function runtimeCapabilities(catalog: ToolCatalog, targeting: StudioTargetManager | null): RuntimeCapabilities {
  if (targeting?.activeStudioId) {
    return { capabilities: catalog.capabilities, capabilityDetails: catalog.capabilityDetails, supportedCommands: catalog.supportedCommands };
  }
  const reasonCode = targeting && targeting.targets.length > 1
    ? "STUDIO_TARGET_SELECTION_REQUIRED"
    : "STUDIO_TARGET_UNAVAILABLE";
  const capabilityDetails = Object.fromEntries(Object.entries(catalog.capabilityDetails).map(([key, detail]) => [key, {
    ...detail,
    status: "unavailable",
    reasonCode,
    verifiedAt: null,
  }])) as typeof catalog.capabilityDetails;
  return {
    capabilities: { ...EMPTY_CAPABILITIES },
    capabilityDetails,
    supportedCommands: [],
    ...(targeting
      ? { degradedReason: targeting.targets.length > 1 ? ("multiple_studio_windows" as const) : ("target_place_unavailable" as const) }
      : {}),
  };
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function isAbortLike(error: unknown): boolean {
  return isAbortError(error) || (error instanceof Error && /aborted|stopped/i.test(error.message));
}

export function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortReason(signal));
      },
      { once: true },
    );
  });
}

function waitForAbort(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}
