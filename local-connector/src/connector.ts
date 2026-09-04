import { createHash, randomUUID } from "node:crypto";
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
  StudioIdentityMetadata,
  StudioCommandLease,
} from "./types.js";
import { EMPTY_CAPABILITIES } from "./types.js";
import { CONNECTOR_PROTOCOL_VERSION } from "./version.js";

const MUTATING_COMMANDS = new Set(["create_script", "write_script", "patch_script", "create_instance", "update_properties", "update_attributes", "update_tags", "rename_instance", "move_instance", "duplicate_instance", "delete_instance", "batch_operations", "create_snapshot", "restore_snapshot", "undo_last_batch", "insert_creator_store_asset", "run_test_service", "run_play_test", "stop_play_test"]);
const TARGET_BOUND_COMMANDS = new Set(MUTATING_COMMANDS);
const INITIAL_STUDIO_DISCOVERY_ATTEMPTS = 12;
const INITIAL_STUDIO_DISCOVERY_RETRY_MS = 500;

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
	degradedReason?: "studio_closed" | "mcp_transport_lost" | "mcp_initialization_failed" | "zero_supported_tools" | "multiple_studio_windows" | "target_place_unavailable" | "cloud_loss";
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
  #targetObservationToken: string | null = null;
  #identityRequestTail: Promise<void> = Promise.resolve();
  readonly #runtimeDisabledCommands = new Set<string>();
  readonly #runtimeCapabilityReasonCodes: Partial<Record<keyof typeof EMPTY_CAPABILITIES, string>> = {};

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
		this.emitTelemetry({ mcpConnected: false, degradedReason: "mcp_transport_lost" });
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
    if (validTargetObservationToken(claim.targetObservationToken)) {
      this.#targetObservationToken = claim.targetObservationToken;
      this.#logger.addTransientSecret(claim.targetObservationToken);
    }
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
			const connectorError = asConnectorError(error);
			this.#logger.warn("Roblox Studio MCP capability refresh failed.", { code: connectorError.code });
			if (new Set(["MCP_DISCONNECTED", "MCP_CONNECT_FAILED", "MCP_PROTOCOL_ERROR"]).has(connectorError.code)) {
				await this.dropMcpConnection();
			} else {
				this.#toolsDirty = true;
				this.emitLifecycleState("degraded");
				await delay(this.#config.reconnectMinMs, signal);
			}
          continue;
        }
      }

      try {
        const identitySafePollWaitMs = Math.min(
          this.#config.pollWaitMs,
          Math.max(250, Math.min(5_000, Math.floor(this.#config.heartbeatMs / 2))),
        );
        const command = await this.withIdentityRequest(() => this.#backend.pollNext(
          identitySafePollWaitMs,
          this.#targetObservationToken,
          signal,
        ));
        if (command === null) {
          // Target selection rotates the server observation token, but an empty
          // long-poll has no response body in which to return that successor.
          // Observe Studio after every bounded empty poll so a selection made
          // just after a heartbeat is discovered within the activation SLA,
          // independent of the configured heartbeat interval.
          await this.observeTargetAfterEmptyPoll(signal);
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
      // A fresh MCP process gets one clean opportunity to re-establish a
      // runtime capability that failed in the prior connection.
      this.#runtimeDisabledCommands.clear();
      delete this.#runtimeCapabilityReasonCodes.playtest;
      this.emitTelemetry({ stage: "mcp" });
      this.#mcpInfo = await this.#mcp.connect(signal);
      this.#mcpConnected = true;
      this.#announcedUnavailable = false;
      this.emitTelemetry({ stage: "tool_discovery", mcpConnected: true, ...(this.#mcpInfo.serverVersion ? { mcpServerVersion: this.#mcpInfo.serverVersion } : {}) });
      const runtime = await this.refreshCatalog(signal, true);
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

  private async refreshCatalog(signal: AbortSignal, waitForInitialStudio = false): Promise<RuntimeCapabilities> {
    this.#toolsDirty = false;
    const tools = await this.#mcp.listTools(signal);
    const catalog = new ToolCatalog(tools, {
      disabledCommands: this.#runtimeDisabledCommands,
      capabilityReasonCodes: this.#runtimeCapabilityReasonCodes,
    });
    if (this.#executor === null) this.#executor = new CommandExecutor(this.#mcp, catalog);
    else this.#executor.updateCatalog(catalog);
    this.#catalog = catalog;
    if (catalog.listStudios && catalog.setActiveStudio && catalog.studioState) {
      this.#targeting ??= new StudioTargetManager(
        this.#mcp,
        catalog.executeLuau !== null,
        catalog.perCallStudioTargeting,
      );
      this.#targeting.setIdentityProbeAvailable(catalog.executeLuau !== null);
    } else this.#targeting = null;
    let targetObservation = await this.probeAndPingBackend(true, signal, {
      refresh: "full",
      waitForInitialStudio,
    });
    // A CAS miss means this identity was captured under an obsolete token.
    // Discard it and make a new Studio probe only after learning the current
    // server token; never rebind cached identity to that successor token.
    if (targetObservation.accepted === false) {
      targetObservation = await this.probeAndPingBackend(true, signal, { refresh: "full" });
    }
    const targetResponse = targetObservation.response;
    this.#logger.info("Studio target selection received.", studioTargetSelectionDiagnostic(targetResponse));
    if (this.#targeting?.acceptBackendResponse(targetResponse)) {
      // Confirm the newly requested window and its exact identity before
      // capabilities can be registered against it.
      targetObservation = await this.probeAndPingBackend(true, signal, { refresh: "full" });
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
    if (targetObservation.accepted === false) {
      this.#toolsDirty = true;
      return runtime;
    }
    await this.withIdentityRequest(async () => {
      const requestToken = this.#targetObservationToken;
      // Capability registration itself carries identity. Probe while holding
      // the same observation lock so this token can describe only that fresh
      // Studio sample.
      await this.#targeting?.refresh(signal);
      const response = await this.#backend.registerCapabilities(
        runtime.capabilities,
        runtime.supportedCommands,
        tools.map((tool) => ({
          name: tool.name,
          ...(tool.description === undefined ? {} : { description: tool.description }),
        })),
        runtime.capabilityDetails,
        this.studioIdentityMetadata(this.#mcpConnected, requestToken),
        signal,
      );
      if (this.acceptTargetObservationResponse(response, requestToken) === false) {
        this.#toolsDirty = true;
      }
    });
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
    if (!hasLifecycleMarkers(command)) {
      throw new ConnectorError(
        "CONNECTOR_LIFECYCLE_UNSUPPORTED",
        "NexusRBX sent an unversioned Studio command envelope.",
      );
    }
    await this.executeReliableAndAcknowledge(requireReliableCommand(command), signal);
  }

  private async executeLegacyAndAcknowledge(command: StudioCommand, signal: AbortSignal): Promise<void> {
    const executor = this.#executor;
    if (!executor) throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    const startedAt = Date.now();
    let result: JsonObject;
    try {
      result = TARGET_BOUND_COMMANDS.has(command.type)
        ? await this.requireTargeting().withMutationTarget(command, () => executor.execute(command, signal), signal)
        : hasExpectedStudioWindow(command)
          ? await this.requireTargeting().withCommandTarget(command, () => executor.execute(command, signal), signal)
          : await executor.execute(command, signal);
    } catch (error) {
      result = failureResult(command, asConnectorError(error));
    }
    result.duration = Date.now() - startedAt;
    this.recordRuntimeCapabilityFailure(command, result);
    const success = result.success === true && (!MUTATING_COMMANDS.has(command.type) || result.verified === true);
    await this.acknowledgeWithCurrentObservation(
      command.id,
      success ? "succeeded" : "failed",
      result,
      signal,
    );
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
    await this.withIdentityRequest(() => this.executeReliableAndAcknowledgeLocked(command, signal));
  }

  private async executeReliableAndAcknowledgeLocked(
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
      await this.acknowledgeReliableTerminalAlreadyLocked(
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
        await this.acknowledgeJournaledTerminalAlreadyLocked(existing, signal);
      } else {
        // Compatibility for lifecycle-v2 journals written before durable receipt
        // identity was introduced.
        const receiptId = deterministicReceiptId(command, existing.terminalStatus);
        const migrated = await this.#commandJournal.ensureTerminalReceipt(
          command.id,
          receiptId,
          attachReliableMetadata(command, { ...existing.result, receiptId }),
        );
        await this.acknowledgeJournaledTerminalAlreadyLocked(migrated, signal);
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
      await this.persistAndAcknowledgeReliableTerminalAlreadyLocked(command, "outcome_unknown", result, signal);
      return;
    }

    await this.#commandJournal.put(journalEntry(command, "received"));
    const receivedReceipt = reliableReceipt(command, "received");
    await this.acknowledgeAlreadyLocked(command.id, "received", receivedReceipt, signal);

    await this.#commandJournal.put(journalEntry(command, "started"));
    const startedReceipt = reliableReceipt(command, "started");
    await this.acknowledgeAlreadyLocked(command.id, "started", startedReceipt, signal);

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
      const execute = async (): Promise<JsonObject> => {
        executorInvoked = true;
        return executor.execute(command, executionSignal);
      };
      result = TARGET_BOUND_COMMANDS.has(command.type)
        ? await this.requireTargeting().withMutationTarget(command, execute, executionSignal)
        : command.connectionType === "mcp_local"
          ? await this.requireTargeting().withCommandTarget(command, execute, executionSignal)
          : await execute();
      if (result.success !== true && NO_SIDE_EFFECT_FAILURE_CODES.has(errorCode(result))) {
        result = { ...result, executionStarted: false, sideEffectStarted: false };
      }
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
        : failureResult(command, connectorError, { noSideEffect: !executorInvoked });
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

    // Runtime capability failures normally surface as thrown executor errors,
    // so publish the suppression after both success and failure paths have
    // produced their canonical result.
    this.recordRuntimeCapabilityFailure(command, result);

    await this.persistAndAcknowledgeReliableTerminalAlreadyLocked(command, terminalStatus, result, signal);
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
        await this.acknowledgeAlreadyLocked(command.id, "started", receipt, heartbeatSignal);
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
    if (pending.length > 0 && !this.#targetObservationToken) {
      // Desktop restores the bearer but deliberately does not persist the
      // rotating target-observation credential. Learn the current control
      // token with a liveness-only request before replaying durable receipts;
      // no cached Studio identity is rebound by this migration request.
      await this.probeAndPingBackend(false, signal, { refresh: "none" });
      if (!this.#targetObservationToken) {
        throw new ConnectorError(
          "TARGET_OBSERVATION_REQUIRED",
          "The current target-observation credential is required before replaying a saved command receipt.",
          { retryable: true },
        );
      }
    }
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
    await this.withIdentityRequest(() => this.acknowledgeJournaledTerminalAlreadyLocked(entry, signal));
  }

  private async acknowledgeJournaledTerminalAlreadyLocked(
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
    const terminalStatus = entry.terminalStatus;
    const terminalResult = entry.result;
    const receiptId = entry.receiptId;
    const commandId = entry.commandId;
    const commandType = entry.commandType;
    await this.acknowledgeAlreadyLocked(commandId, terminalStatus, terminalResult, signal);
    await this.#commandJournal.markTerminalReceiptAcknowledged(
      commandId,
      receiptId,
    );
    this.recordReliableTerminalAcknowledged(
      commandId,
      commandType,
      terminalStatus,
      terminalResult,
    );
  }

  private async acknowledgeReliableTerminal(
    command: ReliableStudioCommand,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
    signal: AbortSignal,
  ): Promise<void> {
    await this.withIdentityRequest(() => this.acknowledgeReliableTerminalAlreadyLocked(
      command,
      status,
      result,
      signal,
    ));
  }

  private async acknowledgeReliableTerminalAlreadyLocked(
    command: ReliableStudioCommand,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
    signal: AbortSignal,
  ): Promise<void> {
    const receiptResult = typeof result.receiptId === "string" && result.receiptId.trim()
      ? result
      : {
          ...result,
          receiptId: deterministicReceiptId(command, status),
        };
    const finalResult = await this.acknowledgeAlreadyLocked(
      command.id,
      status,
      attachReliableMetadata(command, receiptResult),
      signal,
    );
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
        const observation = await this.probeAndPingBackend(this.#mcpConnected, signal, {
          refresh: this.#mcpConnected ? "idle" : "none",
        });
        const { response, targetRefreshError } = observation;
        if (observation.identityChanged || targetRefreshError || observation.accepted === false) this.#toolsDirty = true;
        if (this.#targeting?.acceptBackendResponse(response)) this.#toolsDirty = true;
        this.emitTelemetry({ cloudConnected: true, lastHeartbeatAt: Date.now() });
        if (targetRefreshError) {
          this.#logger.warn("The active Roblox Studio target could not be re-attested; target identity was cleared.", {
            code: targetRefreshError.code,
          });
        }
      } catch (error) {
        if (signal.aborted) return;
        const connectorError = asConnectorError(error);
        if (connectorError.code === "CONNECTOR_AUTH_FAILED") throw connectorError;
        this.#logger.warn("NexusRBX heartbeat failed temporarily.", { code: connectorError.code });
        this.emitTelemetry({ cloudConnected: false, degradedReason: "cloud_loss" });
      }
    }
  }

  private async withIdentityRequest<T>(operation: () => Promise<T>): Promise<T> {
    let release: (() => void) | undefined;
    const previous = this.#identityRequestTail;
    this.#identityRequestTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release?.();
    }
  }

  private async observeTargetAfterEmptyPoll(signal: AbortSignal): Promise<void> {
    let observation = await this.probeAndPingBackend(this.#mcpConnected, signal, {
      refresh: this.#mcpConnected ? "full" : "none",
    });
    if (this.#targeting?.acceptBackendResponse(observation.response)) {
      this.#toolsDirty = true;
    }
    // A stale poll token means the first Studio sample was captured before the
    // website selection response was learned. Discard it and probe again using
    // only the successor token and desired window returned by the server.
    if (observation.accepted === false) {
      observation = await this.probeAndPingBackend(this.#mcpConnected, signal, {
        refresh: this.#mcpConnected ? "full" : "none",
      });
      if (this.#targeting?.acceptBackendResponse(observation.response)) {
        this.#toolsDirty = true;
      }
    }
    if (observation.identityChanged
      || observation.targetRefreshError
      || observation.accepted === false) {
      this.#toolsDirty = true;
    }
  }

  private acceptTargetObservationResponse(response: JsonObject, requestToken: string | null): boolean | null {
    const responseToken = targetObservationTokenFromResponse(response);
    const accepted = targetObservationAcceptedFromResponse(response);
    if (responseToken && (
      !this.#targetObservationToken
      || this.#targetObservationToken === requestToken
      || this.#targetObservationToken === responseToken
    )) {
      this.#targetObservationToken = responseToken;
      this.#logger.addTransientSecret(responseToken);
    }
    if (capabilityRegistrationRequiredFromResponse(response)) {
      // A backend hot-deploy can introduce a stronger target/capability
      // binding after this process already registered with the previous
      // backend. Re-publish immediately without requiring a reconnect or
      // failing already-queued work as unsupported.
      this.#toolsDirty = true;
    }
    return accepted;
  }

  private async probeAndPingBackend(
    available: boolean,
    signal?: AbortSignal,
    options: { refresh?: "none" | "idle" | "full"; waitForInitialStudio?: boolean } = {},
  ): Promise<{
    response: JsonObject;
    accepted: boolean | null;
    identityChanged: boolean;
    targetRefreshError: ConnectorError | null;
  }> {
    return this.withIdentityRequest(async () => {
      const requestToken = this.#targetObservationToken;
      const identityKey = this.#targeting?.identityKey() ?? "";
      let targetRefreshError: ConnectorError | null = null;
      let identityObserved = options.refresh !== "idle";
      if (available && this.#targeting && options.refresh !== "none") {
        try {
          if (options.refresh === "idle") {
            identityObserved = await this.#targeting.refreshIfIdle(signal);
          } else {
            await this.#targeting.refresh(signal);
			identityObserved = false;
            // StudioMCP can finish its initialize handshake before the window
            // registry is populated. Keep every retry inside this same token
            // observation lock.
            if (options.waitForInitialStudio && this.#targeting.targets.length === 0) {
              for (let attempt = 1; attempt < INITIAL_STUDIO_DISCOVERY_ATTEMPTS; attempt += 1) {
                await delay(INITIAL_STUDIO_DISCOVERY_RETRY_MS, signal);
                await this.#targeting.refresh(signal);
                if (this.#targeting.targets.length > 0) break;
              }
            }
          }
        } catch (error) {
          targetRefreshError = asConnectorError(error, "STUDIO_TARGET_UNAVAILABLE");
          identityObserved = true;
        }
      }
      const response = await this.#backend.ping(
        identityObserved
          ? this.pingPayload(available, requestToken)
          : this.livenessPingPayload(available, requestToken),
        signal,
      );
      const accepted = this.acceptTargetObservationResponse(response, requestToken);
      return {
        response,
        accepted,
        identityChanged: (this.#targeting?.identityKey() ?? "") !== identityKey,
        targetRefreshError,
      };
    });
  }

  private async pingBackend(available: boolean, signal?: AbortSignal): Promise<JsonObject> {
    return (await this.probeAndPingBackend(available, signal, { refresh: "none" })).response;
  }

  private async acknowledgeWithCurrentObservation(
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    return this.withIdentityRequest(() => this.acknowledgeAlreadyLocked(
      commandId,
      status,
      result,
      signal,
    ));
  }

  private async acknowledgeAlreadyLocked(
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    const requestToken = this.#targetObservationToken;
    const response = await this.#backend.acknowledge(commandId, status, result, requestToken, signal);
    this.acceptTargetObservationResponse(response, requestToken);
    return result;
  }

  private async persistAndAcknowledgeReliableTerminalAlreadyLocked(
    command: ReliableStudioCommand,
    status: TerminalCommandReceiptStatus,
    result: JsonObject,
    signal: AbortSignal,
  ): Promise<void> {
      const { targetAttestation: _discardedPreLockAttestation, ...resultWithoutAttestation } = result;
      let terminalResult = resultWithoutAttestation;
      let terminalStatus = status;
      if (command.connectionType === "mcp_local"
        && MUTATING_COMMANDS.has(command.type)
        && result.success === true
        && result.verified === true) {
        try {
          terminalResult = {
            ...result,
            targetAttestation: await this.requireTargeting().attestCommandTarget(command, signal),
          };
        } catch (error) {
          terminalStatus = "outcome_unknown";
          terminalResult = outcomeUnknownResult(
            command,
            resultWithoutAttestation,
            "POST_MUTATION_TARGET_ATTESTATION_FAILED",
            "The Studio mutation completed, but its post-write target identity could not be attested.",
          );
          this.#logger.warn("Could not refresh the post-mutation Studio target attestation.", {
            commandId: command.id,
            operation: command.type,
            code: asConnectorError(error).code,
          });
        }
      }
      const terminal = await this.persistReliableTerminal(command, terminalStatus, terminalResult);
      if (!terminal.terminalStatus || !terminal.result || !terminal.receiptId) {
        throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The terminal Studio receipt could not be persisted.");
      }
      await this.acknowledgeAlreadyLocked(
        terminal.commandId,
        terminal.terminalStatus,
        terminal.result,
        signal,
      );
      await this.#commandJournal.markTerminalReceiptAcknowledged(
        terminal.commandId,
        terminal.receiptId,
      );
      this.recordReliableTerminalAcknowledged(
        terminal.commandId,
        terminal.commandType,
        terminal.terminalStatus,
        terminal.result,
      );
  }

  private pingPayload(available: boolean, targetObservationToken = this.#targetObservationToken): JsonObject {
    return {
      mcpServerAvailable: available,
      connectorVersion: this.#connectorVersion,
      connectorProtocolVersion: CONNECTOR_PROTOCOL_VERSION,
      ...(available && this.#mcpInfo.serverVersion !== undefined
        ? { mcpServerVersion: this.#mcpInfo.serverVersion }
        : {}),
      ...this.studioIdentityMetadata(available, targetObservationToken),
    };
  }

  private livenessPingPayload(
    available: boolean,
    targetObservationToken = this.#targetObservationToken,
  ): JsonObject {
    return {
      mcpServerAvailable: available,
      connectorVersion: this.#connectorVersion,
      connectorProtocolVersion: CONNECTOR_PROTOCOL_VERSION,
      targetObservationToken,
    };
  }

  private studioIdentityMetadata(
    available = this.#mcpConnected,
    targetObservationToken = this.#targetObservationToken,
  ): StudioIdentityMetadata {
    const identity = available && this.#targeting
      ? this.#targeting.metadata()
      : unavailableStudioIdentityMetadata();
    return { ...identity, targetObservationToken };
  }

  private async announceUnavailable(): Promise<void> {
    if (this.#announcedUnavailable) return;
    this.emitLifecycleState("studio_mcp_unavailable");
    this.emitTelemetry({ mcpConnected: false, degradedReason: "mcp_initialization_failed" });
    try {
      await this.withIdentityRequest(async () => {
        const requestToken = this.#targetObservationToken;
        const response = await this.#backend.registerCapabilities(
          { ...EMPTY_CAPABILITIES },
          [],
          [],
          new ToolCatalog([]).capabilityDetails,
          { ...unavailableStudioIdentityMetadata(), targetObservationToken: requestToken },
        );
        this.acceptTargetObservationResponse(response, requestToken);
      });
      await this.pingBackend(false);
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
      await this.pingBackend(false, AbortSignal.timeout(2_000));
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
  private recordRuntimeCapabilityFailure(command: StudioCommand, result: JsonObject): void {
    if (
      (command.type !== "run_play_test" && command.type !== "stop_play_test") ||
      errorCode(result) !== "PLAYTEST_CONTROL_UNAVAILABLE"
    ) return;
    const before = this.#runtimeDisabledCommands.size;
    this.#runtimeDisabledCommands.add("run_play_test");
    this.#runtimeDisabledCommands.add("stop_play_test");
    this.#runtimeCapabilityReasonCodes.playtest = "RUNTIME_SELF_CHECK_FAILED";
    if (this.#runtimeDisabledCommands.size === before) return;
    this.#toolsDirty = true;
    this.#logger.warn("Roblox Studio MCP play control failed its runtime check; automated start/stop is suppressed until MCP reconnects.", {
      code: "PLAYTEST_CONTROL_UNAVAILABLE",
    });
  }
  private requireTargeting(): StudioTargetManager {
    if (!this.#targeting) {
      throw new ConnectorError("STUDIO_TARGET_UNAVAILABLE", "No validated Roblox Studio target is available.");
    }
    return this.#targeting;
  }
}

function deterministicReceiptId(
  command: ReliableStudioCommand,
  status: TerminalCommandReceiptStatus,
): string {
  const digest = createHash("sha256")
    .update([command.id, command.semanticInputHash, status].join("\u001f"))
    .digest("hex")
    .slice(0, 32);
  return `receipt_${digest}`;
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
  // The executor emits this only after confirming Studio remained in or
  // returned to Edit mode. An unverified cleanup uses PLAYTEST_CLEANUP_FAILED
  // and remains outcome_unknown.
  "PLAYTEST_CONTROL_UNAVAILABLE",
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

const NO_SIDE_EFFECT_FAILURE_CODES = new Set(
  [...SAFE_PRE_MUTATION_FAILURE_CODES].filter((code) => ![
    "APPLY_ROLLED_BACK",
    "BATCH_ROLLED_BACK",
    "MUTATION_ROLLED_BACK",
    "SNAPSHOT_RESTORE_FAILED",
  ].includes(code)),
);

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
    command.connectionType !== "mcp_local" ||
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

function failureResult(
  command: StudioCommand,
  error: ConnectorError,
  { noSideEffect = false }: { noSideEffect?: boolean } = {},
): JsonObject {
  return {
    success: false,
    ok: false,
    commandId: command.id,
    operation: command.type,
    retryable: error.retryable,
    verified: false,
    ...(noSideEffect ? { executionStarted: false, sideEffectStarted: false } : {}),
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

function hasExpectedStudioWindow(command: StudioCommand): boolean {
  if (typeof command.expectedStudioWindowId === "string" && command.expectedStudioWindowId.trim()) return true;
  const target = isRecord(command.studioTarget) ? command.studioTarget : null;
  return Boolean(target && [
    target.expectedStudioWindowId,
    target.studioWindowId,
    target.studioId,
    target.studio_id,
  ].some((value) => typeof value === "string" && value.trim()));
}

function studioTargetSelectionDiagnostic(value: JsonObject): JsonObject {
  const session = isRecord(value.session) ? value.session : {};
  const studio = isRecord(session.studio) ? session.studio : {};
  const bounded = (candidate: unknown): string | null => {
    const normalized = typeof candidate === "string" ? candidate.trim().slice(0, 160) : "";
    return normalized || null;
  };
  return {
    activeStudioId: bounded(studio.activeStudioId),
    desiredStudioId: bounded(session.desiredStudioId ?? value.desiredStudioId),
    targetIdentityComplete: studio.targetIdentityComplete === true,
    targetState: bounded(studio.targetState),
  };
}

type RuntimeCapabilities = {
  capabilities: ToolCatalog["capabilities"];
  capabilityDetails: ToolCatalog["capabilityDetails"];
  supportedCommands: string[];
  degradedReason?: "multiple_studio_windows" | "target_place_unavailable";
};

function runtimeCapabilities(catalog: ToolCatalog, targeting: StudioTargetManager | null): RuntimeCapabilities {
  if (targeting?.targetIdentityComplete) {
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

function unavailableStudioIdentityMetadata(): StudioIdentityMetadata {
  return {
    studioTargets: [],
    activeStudioId: null,
    studioId: null,
    placeId: null,
    placeName: null,
    universeId: null,
    placeSignature: null,
    targetIdentityComplete: false,
    targetConfirmedAt: null,
  };
}

function validTargetObservationToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value.trim());
}

function targetObservationTokenFromResponse(response: JsonObject): string | null {
  const direct = response.targetObservationToken;
  if (validTargetObservationToken(direct)) return direct.trim();
  const session = response.session;
  if (isRecord(session) && validTargetObservationToken(session.targetObservationToken)) {
    return session.targetObservationToken.trim();
  }
  return null;
}

function targetObservationAcceptedFromResponse(response: JsonObject): boolean | null {
  if (typeof response.targetObservationAccepted === "boolean") return response.targetObservationAccepted;
  const session = response.session;
  return isRecord(session) && typeof session.targetObservationAccepted === "boolean"
    ? session.targetObservationAccepted
    : null;
}

function capabilityRegistrationRequiredFromResponse(response: JsonObject): boolean {
  if (response.capabilityRegistrationRequired === true) return true;
  const session = response.session;
  return isRecord(session) && session.capabilityRegistrationRequired === true;
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
