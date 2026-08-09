import { randomUUID } from "node:crypto";
import { asConnectorError, ConnectorError, isAbortError } from "./errors.js";
import { CommandExecutor } from "./command-executor.js";
import {
  PersistentCommandJournal,
  type CommandJournalEntry,
  type CommandJournalLike,
  type TerminalCommandReceiptStatus,
} from "./command-journal.js";
import { ToolCatalog } from "./tool-catalog.js";
import { StudioTargetManager } from "./studio-targeting.js";
import type { ConnectorConfig } from "./config.js";
import type { Logger } from "./logger.js";
import type {
  BackendClientLike,
  CommandReceiptStatus,
  JsonObject,
  McpClientLike,
  McpConnectionInfo,
  PairClaimResponse,
  StudioCommand,
  StudioCommandAttempts,
  StudioCommandLease,
} from "./types.js";
import { EMPTY_CAPABILITIES } from "./types.js";
import { CONNECTOR_PROTOCOL_VERSION } from "./version.js";

const MUTATING_COMMANDS = new Set(["create_script", "write_script", "patch_script", "create_instance", "update_properties", "update_attributes", "update_tags", "rename_instance", "move_instance", "duplicate_instance", "delete_instance", "batch_operations", "restore_snapshot", "undo_last_batch", "insert_creator_store_asset", "run_test_service", "run_play_test", "stop_play_test"]);
const TARGET_BOUND_COMMANDS = new Set([...MUTATING_COMMANDS, "create_snapshot"]);

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
  /** Injectable for deterministic lifecycle tests. Production uses an atomic per-user disk journal. */
  commandJournal?: CommandJournalLike;
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
  lastCommand?: { name: string; status: TerminalCommandReceiptStatus; at: number };
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
  readonly #commandJournal: CommandJournalLike;
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
    this.#commandJournal = options.commandJournal ?? new PersistentCommandJournal();
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
      try {
        await this.flushPendingTerminalReceipts(claim.sessionId, signal);
      } catch (error) {
        if (signal.aborted) break;
        const connectorError = asConnectorError(error, "COMMAND_RECEIPT_REPLAY_FAILED");
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("A saved Studio command receipt could not be replayed yet; polling will continue.", {
          code: connectorError.code,
        });
      }
      if (signal.aborted) break;

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
      // The desktop uses this list together with supportedToolCount. Publish
      // executable NexusRBX commands so the list and count describe one thing.
      supportedTools: [...runtime.supportedCommands],
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
    if (hasLifecycleMarkers(command)) {
      await this.executeReliableAndAcknowledge(requireReliableCommand(command), signal);
      return;
    }
    await this.executeLegacyAndAcknowledge(command, signal);
  }

  private async executeLegacyAndAcknowledge(command: StudioCommand, signal: AbortSignal): Promise<void> {
    const executor = this.#executor;
    if (!executor) throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    const startedAt = Date.now();
    let result: JsonObject;
    try {
      if (TARGET_BOUND_COMMANDS.has(command.type)) await this.requireTargeting().ensureMutationTarget(command, signal);
      result = await executor.execute(command, signal);
    } catch (error) {
      result = failureResult(command, asConnectorError(error));
    }
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

  private async executeReliableAndAcknowledge(
    command: ReliableStudioCommand,
    signal: AbortSignal,
  ): Promise<void> {
    const executor = this.#executor;
    if (!executor) {
      throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    }

    const existing = await this.#commandJournal.get(command.id);
    if (existing && (
      existing.commandType !== command.type ||
      existing.semanticInputHash !== command.semanticInputHash
    )) {
      await this.acknowledgeReliableTerminal(
        command,
        "outcome_unknown",
        outcomeUnknownResult(
          command,
          undefined,
          "COMMAND_ID_REUSE_DETECTED",
          "The command ID was reused with different semantic input; Studio was not changed.",
        ),
        signal,
      );
      return;
    }

    if (existing?.stage === "terminal" && existing.terminalStatus && existing.result) {
      if (existing.receiptId && existing.sessionId) {
        await this.acknowledgeJournaledTerminal(existing, signal);
      } else {
        // Compatibility for lifecycle-v2 journals written before durable receipt
        // identity was introduced.
        await this.acknowledgeReliableTerminal(
          command,
          existing.terminalStatus,
          attachReliableMetadata(command, existing.result),
          signal,
        );
      }
      return;
    }

    if (existing?.stage === "started") {
      const result = outcomeUnknownResult(
        command,
        undefined,
        "CONNECTOR_RESTART_AFTER_COMMAND_START",
        "The connector restarted after command execution began, so the Studio outcome requires reconciliation.",
      );
      const terminal = await this.persistReliableTerminal(command, "outcome_unknown", result);
      await this.acknowledgeJournaledTerminal(terminal, signal);
      return;
    }

    await this.#commandJournal.put(journalEntry(command, "received"));
    const receivedReceipt = reliableReceipt(command, "received");
    await this.#backend.acknowledge(command.id, "received", receivedReceipt, signal);

    await this.#commandJournal.put(journalEntry(command, "started"));
    const startedReceipt = reliableReceipt(command, "started");
    await this.#backend.acknowledge(command.id, "started", startedReceipt, signal);

    const executionAbort = new AbortController();
    const executionSignal = AbortSignal.any([signal, executionAbort.signal]);
    const leaseHeartbeat = this.startCommandLeaseHeartbeat(command, startedReceipt, signal, (error) => {
      executionAbort.abort(error);
    });
    const startedAt = Date.now();
    let result: JsonObject;
    let terminalStatus: TerminalCommandReceiptStatus;
    let executorInvoked = false;
    try {
      if (TARGET_BOUND_COMMANDS.has(command.type)) await this.requireTargeting().ensureMutationTarget(command, executionSignal);
      executorInvoked = true;
      result = await executor.execute(command, executionSignal);
      result.duration = Date.now() - startedAt;
      if (result.success === true && (!MUTATING_COMMANDS.has(command.type) || result.verified === true)) {
        terminalStatus = "succeeded";
      } else if (MUTATING_COMMANDS.has(command.type) && mutationOutcomeMayBeUnknown(result)) {
        terminalStatus = "outcome_unknown";
        result = outcomeUnknownResult(
          command,
          result,
          errorCode(result) === "COMMAND_FAILED" ? "MUTATION_OUTCOME_UNVERIFIED" : errorCode(result),
          errorMessage(result) ?? "The Studio mutation could not be verified and requires reconciliation.",
        );
      } else {
        terminalStatus = "failed";
      }
    } catch (error) {
      const connectorError = asConnectorError(error);
      terminalStatus = executorInvoked &&
        MUTATING_COMMANDS.has(command.type) &&
        !SAFE_PRE_MUTATION_FAILURE_CODES.has(connectorError.code)
        ? "outcome_unknown"
        : "failed";
      result = terminalStatus === "outcome_unknown"
        ? outcomeUnknownResult(command, undefined, connectorError.code, connectorError.message)
        : failureResult(command, connectorError);
      result.duration = Date.now() - startedAt;
    } finally {
      await leaseHeartbeat.stop();
    }

    const leaseFailure = leaseHeartbeat.failure();
    if (leaseFailure) {
      if (MUTATING_COMMANDS.has(command.type)) {
        terminalStatus = "outcome_unknown";
        result = outcomeUnknownResult(
          command,
          result,
          leaseFailure.code,
          "The Studio mutation lost its command lease heartbeat and requires reconciliation.",
        );
      } else {
        terminalStatus = "failed";
        result = failureResult(command, leaseFailure);
      }
      result.duration = Date.now() - startedAt;
    }

    const terminal = await this.persistReliableTerminal(command, terminalStatus, result);
    await this.acknowledgeJournaledTerminal(terminal, signal);
  }

  private startCommandLeaseHeartbeat(
    command: ReliableStudioCommand,
    receipt: JsonObject,
    signal: AbortSignal,
    onFailure: (error: ConnectorError) => void,
  ): { stop: () => Promise<void>; failure: () => ConnectorError | null } {
    const stopped = new AbortController();
    const heartbeatSignal = AbortSignal.any([signal, stopped.signal]);
    const remainingLeaseMs = Math.max(1, command.lease.expiresAt - Date.now());
    const intervalMs = Math.max(25, Math.min(5_000, Math.floor(remainingLeaseMs / 3)));
    let failure: ConnectorError | null = null;
    const completion = (async () => {
      while (!heartbeatSignal.aborted) {
        await delay(intervalMs, heartbeatSignal);
        await this.#backend.acknowledge(command.id, "started", receipt, heartbeatSignal);
      }
    })().catch((error: unknown) => {
      if (heartbeatSignal.aborted && isAbortLike(error)) return;
      const connectorError = asConnectorError(error, "COMMAND_LEASE_HEARTBEAT_FAILED");
      this.#logger.warn("Studio command lease heartbeat failed.", {
        commandId: command.id,
        operation: command.type,
        code: connectorError.code,
      });
      failure = connectorError;
      onFailure(connectorError);
    });
    return {
      stop: async () => {
        stopped.abort(new DOMException("Command lease heartbeat stopped", "AbortError"));
        await completion;
      },
      failure: () => failure,
    };
  }

  private async persistReliableTerminal(
    command: ReliableStudioCommand,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
  ): Promise<CommandJournalEntry> {
    const receiptId = randomUUID();
    return this.#commandJournal.put({
      ...journalEntry(command, "terminal"),
      sessionId: command.lease.owner,
      receiptId,
      terminalStatus: status,
      result: attachReliableMetadata(command, { ...result, receiptId }),
    });
  }

  private async flushPendingTerminalReceipts(
    sessionId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const pending = await this.#commandJournal.listPendingTerminalReceipts(sessionId);
    for (const entry of pending) {
      if (signal.aborted) throw abortReason(signal);
      try {
        await this.acknowledgeJournaledTerminal(entry, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        const connectorError = asConnectorError(error, "COMMAND_RECEIPT_REPLAY_FAILED");
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("A saved Studio command receipt could not be replayed yet.", {
          commandId: entry.commandId,
          operation: entry.commandType,
          code: connectorError.code,
        });
      }
    }
  }

  private async acknowledgeJournaledTerminal(
    entry: CommandJournalEntry,
    signal: AbortSignal,
  ): Promise<void> {
    if (
      entry.stage !== "terminal" ||
      !entry.terminalStatus ||
      !entry.result ||
      !entry.receiptId
    ) {
      throw new ConnectorError(
        "COMMAND_JOURNAL_CORRUPT",
        "A saved terminal Studio command receipt is incomplete.",
      );
    }
    await this.#backend.acknowledge(
      entry.commandId,
      entry.terminalStatus,
      entry.result,
      signal,
    );
    await this.#commandJournal.markTerminalReceiptAcknowledged(
      entry.commandId,
      entry.receiptId,
    );
    this.recordReliableTerminalAcknowledged(
      entry.commandId,
      entry.commandType,
      entry.terminalStatus,
      entry.result,
    );
  }

  private async acknowledgeReliableTerminal(
    command: ReliableStudioCommand,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
    signal: AbortSignal,
  ): Promise<void> {
    const finalResult = attachReliableMetadata(command, result);
    await this.#backend.acknowledge(command.id, status, finalResult, signal);
    this.recordReliableTerminalAcknowledged(command.id, command.type, status, finalResult);
  }

  private recordReliableTerminalAcknowledged(
    commandId: string,
    commandType: string,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
  ): void {
    const completedAt = Date.now();
    this.emitTelemetry({
      lastActivityAt: completedAt,
      lastCommand: { name: commandType, status, at: completedAt },
    });
    this.#logger.info(status === "succeeded" ? "Studio command completed." : "Studio command reached a safe terminal state.", {
      commandId,
      operation: commandType,
      lifecycleVersion: 2,
      status,
      ...(status === "succeeded" ? {} : { code: errorCode(result) }),
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
    this.emitLifecycleState("studio_mcp_unavailable");
    this.emitTelemetry({ mcpConnected: false, degradedReason: "mcp_initialization_failed" });
    try {
      await this.#backend.registerCapabilities({ ...EMPTY_CAPABILITIES }, [], [], new ToolCatalog([]).capabilityDetails);
      await this.#backend.ping(this.pingPayload(false));
      this.#announcedUnavailable = true;
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
  private requireTargeting(): StudioTargetManager {
    if (!this.#targeting) {
      throw new ConnectorError("STUDIO_TARGET_UNAVAILABLE", "No validated Roblox Studio target is available.");
    }
    return this.#targeting;
  }
}

interface ReliableStudioCommand extends StudioCommand {
  commandId: string;
  lifecycleVersion: 2;
  semanticInputHash: string;
  status: "leased";
  operationOutcome: "reserved";
  attempts: StudioCommandAttempts;
  lease: StudioCommandLease;
}

const LIFECYCLE_MARKERS = [
  "lifecycleVersion",
  "lease",
  "semanticInputHash",
  "attempts",
  "operationOutcome",
] as const;

const SAFE_PRE_MUTATION_FAILURE_CODES = new Set([
  "ASSET_ID_INVALID",
  "ASSET_TYPE_NOT_ALLOWED",
  "CLASS_NOT_ALLOWED",
  "CREATE_PARENTS_UNSUPPORTED",
  "COMMAND_PAYLOAD_INVALID",
  "COMMAND_PAYLOAD_TOO_LARGE",
  "DESTINATION_NOT_ALLOWED",
  "DESTINATION_INVALID",
  "EXECUTABLE_INPUT_FORBIDDEN",
  "EXPECTED_SOURCE_HASH_REQUIRED",
  "FIELD_NOT_ALLOWED",
  "INSTANCE_NOT_FOUND",
  "MCP_TOOL_UNAVAILABLE",
  "MUTATION_NOT_APPLIED",
  "NO_LAST_BATCH",
  "PATCH_TARGET_MISSING",
  "PATH_INVALID",
  "PATH_NOT_ALLOWED",
  "PLAYTEST_CONFIRMATION_REQUIRED",
  "ROUTINE_UNAVAILABLE",
  "SCRIPT_ALREADY_EXISTS",
  "SCRIPT_NOT_FOUND",
  "SOURCE_CONFLICT",
  "SOURCE_HASH_MISMATCH",
  "SOURCE_TOO_LARGE",
  "SNAPSHOTS_REQUIRED",
  "SNAPSHOT_CONFLICT",
  "SNAPSHOT_ID_CONFLICT",
  "SNAPSHOT_NOT_FOUND",
  "SNAPSHOT_PATH_OVERLAP",
  "STUDIO_TARGET_MISMATCH",
  "STUDIO_TARGET_AMBIGUOUS",
  "STUDIO_TARGET_ATTESTATION_INCOMPLETE",
  "STUDIO_TARGET_SELECTION_REQUIRED",
  "STUDIO_TARGET_UNAVAILABLE",
  "STUDIO_CONNECTION_TYPE_MISMATCH",
  "TEST_PROFILE_INVALID",
  "TARGET_EXISTS",
  "TARGET_PARENT_MISSING",
  "VALUE_NOT_ALLOWED",
  // These failures include a verified compensation receipt, so retrying them
  // is safe even though the original mutation reached Studio.
  "APPLY_ROLLED_BACK",
  "BATCH_ROLLED_BACK",
  "MUTATION_ROLLED_BACK",
  "SNAPSHOT_RESTORE_FAILED",
  "BATCH_PATH_OVERLAP",
]);

function hasLifecycleMarkers(command: StudioCommand): boolean {
  return LIFECYCLE_MARKERS.some((key) => Object.hasOwn(command, key));
}

function requireReliableCommand(command: StudioCommand): ReliableStudioCommand {
  if (command.lifecycleVersion !== 2) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_UNSUPPORTED",
      "NexusRBX sent an unsupported Studio command lifecycle envelope.",
    );
  }
  const semanticInputHash = command.semanticInputHash;
  const attempts = command.attempts;
  const lease = command.lease;
  const invalid = (
    command.commandId !== command.id ||
    command.status !== "leased" ||
    command.operationOutcome !== "reserved" ||
    typeof command.id !== "string" ||
    command.id.trim().length === 0 ||
    typeof command.type !== "string" ||
    command.type.trim().length === 0 ||
    typeof semanticInputHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(semanticInputHash) ||
    !validAttempts(attempts) ||
    !validLease(lease) ||
    lease.expiresAt <= Date.now() ||
    (MUTATING_COMMANDS.has(command.type) && lease.targetFence < 1)
  );
  if (invalid) {
    throw new ConnectorError(
      "CONNECTOR_LIFECYCLE_ENVELOPE_INVALID",
      "NexusRBX sent an incomplete, expired, or inconsistent Studio command lifecycle envelope.",
    );
  }
  const normalizedHash = semanticInputHash as string;
  const reliableAttempts = attempts as StudioCommandAttempts;
  const reliableLease = lease as StudioCommandLease;
  return {
    ...command,
    commandId: command.id,
    lifecycleVersion: 2,
    semanticInputHash: normalizedHash.toLowerCase(),
    status: "leased",
    operationOutcome: "reserved",
    attempts: reliableAttempts,
    lease: reliableLease,
  };
}

function validAttempts(value: StudioCommandAttempts | undefined): value is StudioCommandAttempts {
  return value !== undefined &&
    Number.isSafeInteger(value.delivery) &&
    value.delivery > 0 &&
    Number.isSafeInteger(value.maximum) &&
    value.maximum > 0 &&
    value.delivery <= value.maximum;
}

function validLease(value: StudioCommandLease | undefined): value is StudioCommandLease {
  return value !== undefined &&
    typeof value.owner === "string" &&
    value.owner.trim().length > 0 &&
    Number.isSafeInteger(value.fence) &&
    value.fence > 0 &&
    Number.isSafeInteger(value.targetFence) &&
    value.targetFence >= 0 &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt > 0;
}

function journalEntry(
  command: ReliableStudioCommand,
  stage: CommandJournalEntry["stage"],
): CommandJournalEntry {
  return {
    commandId: command.id,
    commandType: command.type,
    semanticInputHash: command.semanticInputHash,
    stage,
    updatedAt: Date.now(),
  };
}

function reliableReceipt(
  command: ReliableStudioCommand,
  status: Extract<CommandReceiptStatus, "received" | "started">,
): JsonObject {
  return {
    commandId: command.id,
    lifecycleVersion: 2,
    semanticInputHash: command.semanticInputHash,
    leaseFence: command.lease.fence,
    targetFence: command.lease.targetFence,
    operationOutcome: status,
  };
}

function attachReliableMetadata(command: ReliableStudioCommand, result: JsonObject): JsonObject {
  return {
    ...result,
    commandId: command.id,
    lifecycleVersion: 2,
    semanticInputHash: command.semanticInputHash,
    leaseFence: command.lease.fence,
    targetFence: command.lease.targetFence,
  };
}

function failureResult(command: StudioCommand, error: ConnectorError): JsonObject {
  return {
    success: false,
    ok: false,
    commandId: command.id,
    operation: command.type,
    retryable: error.retryable,
    verified: false,
    error: {
      code: error.code,
      message: error.message.slice(0, 1_024),
      retryable: error.retryable,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}

function outcomeUnknownResult(
  command: ReliableStudioCommand,
  base: JsonObject | undefined,
  code: string,
  message: string,
): JsonObject {
  const priorError = isRecord(base?.error) ? base.error : {};
  return attachReliableMetadata(command, {
    ...(base ?? {}),
    success: false,
    ok: false,
    commandId: command.id,
    operation: command.type,
    retryable: false,
    verified: false,
    operationOutcome: "outcome_unknown",
    error: {
      ...priorError,
      code,
      message: message.slice(0, 1_024),
      retryable: false,
    },
  });
}

function mutationOutcomeMayBeUnknown(result: JsonObject): boolean {
  if (result.success === true && result.verified !== true) return true;
  return !SAFE_PRE_MUTATION_FAILURE_CODES.has(errorCode(result));
}

function errorMessage(result: JsonObject): string | null {
  const error = result.error;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return null;
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
