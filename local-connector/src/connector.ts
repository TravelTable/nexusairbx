import { asConnectorError, ConnectorError, isAbortError } from "./errors.js";
import { CommandExecutor } from "./command-executor.js";
import { ToolCatalog } from "./tool-catalog.js";
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

const MUTATING_COMMANDS = new Set(["create_script", "write_script", "patch_script"]);

export interface LocalConnectorOptions {
  config: ConnectorConfig;
  connectorVersion: string;
  backend: BackendClientLike;
  mcp: McpClientLike;
  logger: Logger;
}

/** Coordinates one in-memory pairing session. A process restart requires a new code. */
export class NexusLocalConnector {
  readonly #config: ConnectorConfig;
  readonly #backend: BackendClientLike;
  readonly #mcp: McpClientLike;
  readonly #logger: Logger;
  readonly #connectorVersion: string;
  #catalog: ToolCatalog | null = null;
  #executor: CommandExecutor | null = null;
  #mcpConnected = false;
  #toolsDirty = false;
  #mcpInfo: McpConnectionInfo = {};
  #announcedUnavailable = false;

  constructor(options: LocalConnectorOptions) {
    this.#config = options.config;
    this.#backend = options.backend;
    this.#mcp = options.mcp;
    this.#logger = options.logger;
    this.#connectorVersion = options.connectorVersion;
    this.#mcp.onToolsChanged(() => {
      this.#toolsDirty = true;
    });
    this.#mcp.onDisconnect((error) => {
      if (!this.#mcpConnected) return;
      this.#mcpConnected = false;
      this.#catalog = null;
      this.#executor = null;
      this.#mcpInfo = {};
      this.#announcedUnavailable = false;
      this.#logger.warn(error?.message ?? "Roblox Studio MCP disconnected; reconnecting.");
    });
  }

  async run(pairCode: string, externalSignal?: AbortSignal): Promise<void> {
    if (externalSignal?.aborted) throw abortReason(externalSignal);
    this.#logger.info("Connecting to NexusRBX…");
    const claim = await this.#backend.claimPairing(pairCode, externalSignal);
    this.#logger.info("NexusRBX connected.");

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
    try {
      this.#mcpInfo = await this.#mcp.connect(signal);
      this.#mcpConnected = true;
      this.#announcedUnavailable = false;
      await this.refreshCatalog(signal);
      this.#logger.info("Roblox Studio MCP connected.");
      this.#logCapabilities();
      this.#logger.info("NexusRBX is connected to Roblox Studio. Press Ctrl+C to disconnect.");
    } catch (error) {
      await this.dropMcpConnection();
      throw error;
    }
  }

  private async refreshCatalog(signal: AbortSignal): Promise<void> {
    this.#toolsDirty = false;
    const tools = await this.#mcp.listTools(signal);
    const catalog = new ToolCatalog(tools);
    if (this.#executor === null) this.#executor = new CommandExecutor(this.#mcp, catalog);
    else this.#executor.updateCatalog(catalog);
    this.#catalog = catalog;
    await this.#backend.registerCapabilities(
      catalog.capabilities,
      catalog.supportedCommands,
      tools.map((tool) => ({
        name: tool.name,
        ...(tool.description === undefined ? {} : { description: tool.description }),
      })),
      signal,
    );
    await this.#backend.ping(this.pingPayload(true), signal);
  }

  private async executeAndAcknowledge(command: StudioCommand, signal: AbortSignal): Promise<void> {
    const executor = this.#executor;
    if (!executor) throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    const startedAt = Date.now();
    const result = await executor.execute(command, signal);
    result.duration = Date.now() - startedAt;
    const success = result.success === true && (!MUTATING_COMMANDS.has(command.type) || result.verified === true);
    await this.#backend.acknowledge(command.id, success ? "succeeded" : "failed", result, signal);
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
        await this.#backend.ping(this.pingPayload(this.#mcpConnected), signal);
      } catch (error) {
        if (signal.aborted) return;
        const connectorError = asConnectorError(error);
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("NexusRBX heartbeat failed temporarily.", { code: connectorError.code });
      }
    }
  }

  private pingPayload(available: boolean): JsonObject {
    return {
      mcpServerAvailable: available,
      connectorVersion: this.#connectorVersion,
      ...(available && this.#mcpInfo.serverVersion !== undefined
        ? { mcpServerVersion: this.#mcpInfo.serverVersion }
        : {}),
    };
  }

  private async announceUnavailable(): Promise<void> {
    if (this.#announcedUnavailable) return;
    this.#announcedUnavailable = true;
    try {
      await this.#backend.registerCapabilities({ ...EMPTY_CAPABILITIES }, [], []);
      await this.#backend.ping(this.pingPayload(false));
    } catch (error) {
      this.#logger.debug("Could not publish degraded connector state.", { code: asConnectorError(error).code });
    }
  }

  private async dropMcpConnection(): Promise<void> {
    this.#mcpConnected = false;
    this.#catalog = null;
    this.#executor = null;
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
    this.#backend.clearToken();
    this.#logger.info("NexusRBX Local Connector stopped.");
  }
}

function errorCode(result: JsonObject): string {
  const error = result.error;
  if (typeof error === "object" && error !== null && !Array.isArray(error) && typeof error.code === "string") {
    return error.code;
  }
  return "COMMAND_FAILED";
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
