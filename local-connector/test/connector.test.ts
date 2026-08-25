import assert from "node:assert/strict";
import test from "node:test";
import { sha256 } from "../src/command-executor.js";
import type { ConnectorConfig } from "../src/config.js";
import type {
  CommandJournalEntry,
  CommandJournalLike,
} from "../src/command-journal.js";
import { NexusLocalConnector } from "../src/connector.js";
import { ConnectorError } from "../src/errors.js";
import type { Logger } from "../src/logger.js";
import type {
  BackendClientLike,
  CapabilityDetails,
  CommandReceiptStatus,
  DiscoveredTool,
  JsonObject,
  McpClientLike,
  McpConnectionInfo,
  PairClaimResponse,
  StudioCapabilities,
  StudioCommand,
  StudioIdentityMetadata,
  ToolCallResult,
} from "../src/types.js";

const readTool: DiscoveredTool = {
  name: "script_read",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
    },
    required: ["path", "datamodel_type"],
  },
};

const outputTool: DiscoveredTool = {
  name: "get_console_output",
  inputSchema: { type: "object", properties: {}, required: [] },
};

const mutationTool: DiscoveredTool = {
  name: "multi_edit",
  inputSchema: {
    type: "object",
    properties: {
      file_path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
      source: { type: "string" },
    },
    required: ["file_path", "datamodel_type", "source"],
  },
};

const executeLuauTool: DiscoveredTool = {
  name: "execute_luau",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
    },
    required: ["code", "datamodel_type"],
  },
};

const startStopPlayTool: DiscoveredTool = {
  name: "start_stop_play",
  inputSchema: {
    type: "object",
    properties: { is_start: { type: "boolean" } },
    required: ["is_start"],
  },
};

const targetTools: DiscoveredTool[] = [
  { name: "list_roblox_studios", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "set_active_studio", inputSchema: { type: "object", properties: { studio_id: { type: "string" } }, required: ["studio_id"] } },
  { name: "get_studio_state", inputSchema: { type: "object", properties: {}, required: [] } },
];

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
  addSecret() {},
  addTransientSecret() {},
};

const config: ConnectorConfig = {
  apiUrl: "http://localhost:3001",
  mcpCommand: "unused",
  mcpArgs: [],
  requestTimeoutMs: 100,
  heartbeatMs: 5,
  pollWaitMs: 5,
  reconnectMinMs: 1,
  reconnectMaxMs: 4,
  verbose: false,
};

class FakeMcp implements McpClientLike {
  connectAttempts = 0;
  disconnects = 0;
  listCalls = 0;
  callTools: Array<{ name: string; args: JsonObject }> = [];
  failConnects = 0;
  toolPages: DiscoveredTool[][] = [[readTool, ...targetTools]];
  studios: Array<{
    studio_id: string;
    place_id?: string;
    place_name?: string;
    universe_id?: string;
    place_signature?: string;
  }> = [
    {
      studio_id: "studio-1",
      place_id: "42",
      place_name: "Fixture Place",
      universe_id: "84",
      place_signature: "fixture-signature",
    },
  ];
  selectedStudioId = "";
  events: string[] | null = null;
  callToolHandler: ((
    name: string,
    args: JsonObject,
    signal?: AbortSignal,
  ) => Promise<ToolCallResult | undefined> | ToolCallResult | undefined) | null = null;
  readonly #toolHandlers = new Set<() => void>();
  readonly #disconnectHandlers = new Set<(error?: Error) => void>();

  async connect(): Promise<McpConnectionInfo> {
    this.connectAttempts += 1;
    if (this.connectAttempts <= this.failConnects) {
      throw new ConnectorError("MCP_CONNECT_FAILED", "offline", { retryable: true });
    }
    return { serverName: "mock", serverVersion: "test-1" };
  }

  async disconnect(): Promise<void> { this.disconnects += 1; }
  async listTools(): Promise<DiscoveredTool[]> {
    const page = this.toolPages[Math.min(this.listCalls, this.toolPages.length - 1)] ?? [];
    this.listCalls += 1;
    return page;
  }
  async callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<ToolCallResult> {
    this.callTools.push({ name, args });
    this.events?.push(`mcp:${name}`);
    if (this.callToolHandler) {
      const handled = await this.callToolHandler(name, args, signal);
      if (handled !== undefined) return handled;
    }
    if (name === "script_read") return { structuredContent: { source: "print('ok')" } };
    if (name === "list_roblox_studios") return { structuredContent: { studios: this.studios } };
    if (name === "get_studio_state") return { structuredContent: this.studios.find((studio) => studio.studio_id === this.selectedStudioId) ?? this.studios[0] ?? {} };
    if (name === "set_active_studio") {
      this.selectedStudioId = String(args.studio_id || "");
      return { structuredContent: { studio_id: this.selectedStudioId } };
    }
    return { content: [{ type: "text", text: "ok" }] };
  }
  onToolsChanged(handler: () => void): void { this.#toolHandlers.add(handler); }
  onDisconnect(handler: (error?: Error) => void): void { this.#disconnectHandlers.add(handler); }
  triggerToolsChanged(): void { for (const handler of this.#toolHandlers) handler(); }
  triggerDisconnect(): void {
    for (const handler of this.#disconnectHandlers) handler(new Error("mock disconnect"));
  }
}

interface Registration {
  capabilities: StudioCapabilities;
  capabilityDetails: CapabilityDetails;
  commands: string[];
  tools: Array<{ name: string; description?: string }>;
  identity: StudioIdentityMetadata;
}

class FakeBackend implements BackendClientLike {
  claims: string[] = [];
  pings: JsonObject[] = [];
  registrations: Registration[] = [];
  polls = 0;
  pollWaits: number[] = [];
  acknowledgements: Array<{ id: string; status: CommandReceiptStatus; result: JsonObject; targetObservationToken: string | null }> = [];
  clearCalls = 0;
  registrationFailures = 0;
  abortOnTerminal = true;
  wireEvents: string[] = [];
  pingHandler: ((body: JsonObject) => Promise<JsonObject> | JsonObject) | null = null;
  pollHandler: ((poll: number, signal?: AbortSignal) => Promise<StudioCommand | null>) | null = null;
  acknowledgeHandler: ((
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    signal?: AbortSignal,
  ) => Promise<void> | void) | null = null;

  constructor(
    private readonly controller: AbortController,
    private readonly events: string[] | null = null,
  ) {}

  async claimPairing(code: string): Promise<PairClaimResponse> {
    this.claims.push(code);
    return {
      token: "nsmcp_session_secret",
      sessionId: "session",
      userId: "user",
      pollIntervalMs: 0,
      expiresInMs: 60_000,
      targetObservationToken: "initial-observation-token",
    };
  }
  async ping(body: JsonObject): Promise<JsonObject> {
    this.pings.push(body);
    this.wireEvents.push(`ping:${String(body.studioId ?? "clear")}`);
    return await this.pingHandler?.(body) ?? { ok: true };
  }
  async registerCapabilities(
    capabilities: StudioCapabilities,
    supportedCommands: string[],
    discoveredTools: Array<{ name: string; description?: string }>,
    capabilityDetails: CapabilityDetails,
    studioIdentity: StudioIdentityMetadata,
  ): Promise<JsonObject> {
    this.registrations.push({
      capabilities,
      capabilityDetails: structuredClone(capabilityDetails),
      commands: [...supportedCommands],
      tools: discoveredTools,
      identity: structuredClone(studioIdentity),
    });
    this.wireEvents.push(`register:${String(studioIdentity.studioId ?? "clear")}`);
    if (this.registrationFailures > 0) {
      this.registrationFailures -= 1;
      throw new ConnectorError("BACKEND_TEMPORARY", "simulated registration outage", { retryable: true });
    }
    return { ok: true };
  }
  async pollNext(
    waitMs: number,
    _targetObservationToken: string | null,
    signal?: AbortSignal,
  ): Promise<StudioCommand | null> {
    this.polls += 1;
    this.pollWaits.push(waitMs);
    if (this.pollHandler) return this.pollHandler(this.polls, signal);
    return null;
  }
  async acknowledge(
    commandId: string,
    status: CommandReceiptStatus,
    result: JsonObject,
    targetObservationToken: string | null,
    signal?: AbortSignal,
  ): Promise<JsonObject> {
    this.acknowledgements.push({ id: commandId, status, result, targetObservationToken });
    this.events?.push(`ack:${status}`);
    await this.acknowledgeHandler?.(commandId, status, result, signal);
    if (this.abortOnTerminal && isTerminalStatus(status)) {
      this.controller.abort(new DOMException("test complete", "AbortError"));
    }
    return { ok: true };
  }
  clearToken(): void { this.clearCalls += 1; }
}

class MemoryCommandJournal implements CommandJournalLike {
  readonly entries = new Map<string, CommandJournalEntry>();

  async get(commandId: string): Promise<CommandJournalEntry | null> {
    const entry = this.entries.get(commandId);
    return entry ? structuredClone(entry) : null;
  }

  async put(entry: CommandJournalEntry): Promise<CommandJournalEntry> {
    const current = this.entries.get(entry.commandId);
    if (current && (
      current.commandType !== entry.commandType ||
      current.semanticInputHash !== entry.semanticInputHash
    )) {
      throw new ConnectorError("COMMAND_JOURNAL_CONFLICT", "conflict");
    }
    if (current?.stage === "terminal") return structuredClone(current);
    this.entries.set(entry.commandId, structuredClone(entry));
    return structuredClone(entry);
  }

  async listPendingTerminalReceipts(sessionId: string): Promise<CommandJournalEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => (
        entry.stage === "terminal" &&
        entry.sessionId === sessionId &&
        entry.receiptId !== undefined &&
        entry.acknowledgedAt === undefined
      ))
      .sort((left, right) => left.updatedAt - right.updatedAt)
      .map((entry) => structuredClone(entry));
  }

  async markTerminalReceiptAcknowledged(
    commandId: string,
    receiptId: string,
    acknowledgedAt = Date.now(),
  ): Promise<CommandJournalEntry> {
    const current = this.entries.get(commandId);
    if (
      !current ||
      current.stage !== "terminal" ||
      current.receiptId !== receiptId
    ) {
      throw new ConnectorError("COMMAND_JOURNAL_RECEIPT_MISMATCH", "receipt mismatch");
    }
    if (current.acknowledgedAt !== undefined) return structuredClone(current);
    const acknowledged = { ...current, acknowledgedAt };
    this.entries.set(commandId, acknowledged);
    return structuredClone(acknowledged);
  }

  async ensureTerminalReceipt(
    commandId: string,
    receiptId: string,
    result: JsonObject,
  ): Promise<CommandJournalEntry> {
    const entry = this.entries.get(commandId);
    if (!entry || entry.stage !== "terminal") throw new Error("receipt mismatch");
    if (entry.receiptId && entry.receiptId !== receiptId) throw new Error("receipt mismatch");
    const migrated: CommandJournalEntry = {
      ...entry,
      receiptId: entry.receiptId ?? receiptId,
      result: entry.receiptId && entry.result ? entry.result : structuredClone(result),
      updatedAt: Date.now(),
    };
    this.entries.set(commandId, migrated);
    return structuredClone(migrated);
  }
}

function isTerminalStatus(status: CommandReceiptStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "outcome_unknown";
}

function resultErrorCode(result: JsonObject | undefined): string | undefined {
  const error = result?.error;
  return typeof error === "object" && error !== null && !Array.isArray(error) && typeof error.code === "string"
    ? error.code
    : undefined;
}

function pickIdentity(value: JsonObject | StudioIdentityMetadata | undefined): JsonObject {
  return {
    studioId: value?.studioId ?? null,
    placeId: value?.placeId ?? null,
    universeId: value?.universeId ?? null,
    placeName: value?.placeName ?? null,
    placeSignature: value?.placeSignature ?? null,
    targetIdentityComplete: value?.targetIdentityComplete === true,
  };
}

function reliableCommand(options: {
  id?: string;
  type?: string;
  payload?: JsonObject;
  semanticInputHash?: string;
  targetFence?: number;
  leaseExpiresAt?: number;
  expectedStudioWindowId?: string;
  expectedPlaceSignature?: string;
  unpublishedMcp?: boolean;
} = {}): StudioCommand {
  const id = options.id ?? "reliable-command";
  const unpublishedMcp = options.unpublishedMcp === true;
  const expectedStudioWindowId = options.expectedStudioWindowId
    ?? (unpublishedMcp ? undefined : "studio-1");
  const expectedPlaceId = unpublishedMcp ? null : "42";
  const expectedUniverseId = unpublishedMcp ? null : "84";
  return {
    id,
    commandId: id,
    type: options.type ?? "read_script",
    payload: options.payload ?? { path: "game.ServerScriptService.Main" },
    lifecycleVersion: 2,
    semanticInputHash: options.semanticInputHash ?? "a".repeat(64),
    status: "leased",
    operationOutcome: "reserved",
    connectionType: "mcp_local",
    targetId: "target-local",
    sessionId: "session",
    targetGeneration: 3,
    ...(expectedStudioWindowId
        ? { expectedStudioWindowId }
        : {}),
    expectedPlaceId,
    expectedUniverseId,
    placeId: expectedPlaceId,
    universeId: expectedUniverseId,
    expectedPlaceSignature: options.expectedPlaceSignature ?? "fixture-signature",
    studioTarget: {
      targetId: "target-local",
      sessionId: "session",
      targetGeneration: 3,
      expectedPlaceId,
      expectedUniverseId,
      expectedPlaceSignature: options.expectedPlaceSignature ?? "fixture-signature",
      ...(expectedStudioWindowId ? { expectedStudioWindowId } : {}),
    },
    attempts: { delivery: 1, maximum: 3 },
    lease: {
      owner: "session",
      fence: 7,
      targetFence: options.targetFence ?? 0,
      expiresAt: options.leaseExpiresAt ?? Date.now() + 10_000,
    },
  };
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

test("connector claims, discovers, registers, polls, executes, acknowledges, and shuts down", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pollHandler = async () => reliableCommand({
    id: "command-1",
    payload: { path: "game.ServerScriptService.Main" },
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  })
    .run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.claims, ["PAIR-CODE"]);
  assert.equal(mcp.connectAttempts, 1);
  assert.equal(mcp.listCalls, 1);
  assert.deepEqual(backend.registrations[0]?.commands, ["get_studio_context", "read_script", "read_scripts"]);
  assert.deepEqual(backend.acknowledgements.map(({ id, status }) => ({ id, status })), [
    { id: "command-1", status: "received" },
    { id: "command-1", status: "started" },
    { id: "command-1", status: "succeeded" },
  ]);
  assert.equal(backend.acknowledgements.at(-1)?.result.verified, false);
  assert.equal(mcp.callTools.filter((call) => call.name === "script_read").length, 1);
  assert.equal(backend.pings.some((ping) => ping.mcpServerAvailable === true), true);
  assert.equal(backend.pings.at(-1)?.mcpServerAvailable, false);
  assert.equal(mcp.disconnects >= 1, true);
  assert.equal(backend.clearCalls, 1);
});

test("connector publishes an empty catalog while MCP is unavailable, then reconnects", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.failConnects = 1;
  backend.pollHandler = async () => reliableCommand({ id: "command-2", payload: { path: "game.Script" } });

  await new NexusLocalConnector({ config, connectorVersion: "0.1.0-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  assert.equal(mcp.connectAttempts, 2);
  assert.deepEqual(backend.registrations[0]?.commands, []);
  assert.deepEqual(backend.registrations[1]?.commands, ["get_studio_context", "read_script", "read_scripts"]);
  assert.equal(backend.pings.some((ping) => ping.mcpServerAvailable === false), true);
  assert.equal(backend.acknowledgements.at(-1)?.status, "succeeded");
});

test("an unavailable capability publication retries after a transient backend failure", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.failConnects = 2;
  backend.registrationFailures = 1;
  backend.pollHandler = async () => reliableCommand({ id: "command-retry", payload: { path: "game.Script" } });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  })
    .run("PAIR-CODE", controller.signal);

  assert.equal(backend.registrations.filter((registration) => registration.commands.length === 0).length, 2);
  assert.deepEqual(backend.registrations.at(-1)?.commands, ["get_studio_context", "read_script", "read_scripts"]);
});

test("a hot-upgraded backend can request capability re-registration without reconnecting MCP", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pingHandler = () => backend.pings.length >= 2
    ? { ok: true, capabilityRegistrationRequired: true }
    : { ok: true };
  backend.pollHandler = async (poll) => {
    if (poll === 1) return null;
    controller.abort(new DOMException("capabilities rebound", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.2.11-test", backend, mcp, logger })
    .run("PAIR-CODE", AbortSignal.any([controller.signal, AbortSignal.timeout(1_000)]));

  assert.equal(mcp.connectAttempts, 1);
  assert.equal(backend.registrations.length >= 2, true);
  assert.deepEqual(backend.registrations.at(-1)?.commands, backend.registrations[0]?.commands);
  assert.equal(backend.wireEvents.filter((event) => event.startsWith("register:")).length >= 2, true);
});

test("connector reports multiple Studio windows as a recoverable degraded state", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const lifecycle: string[] = [];
  const telemetry: Array<{ stage?: string; supportedToolCount?: number; degradedReason?: string }> = [];
  mcp.studios = [
    { studio_id: "studio-1", place_id: "42", place_name: "First Place" },
    { studio_id: "studio-2", place_id: "84", place_name: "Second Place" },
  ];
  backend.pollHandler = async () => {
    controller.abort(new DOMException("degraded state observed", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    onLifecycleState: (state) => lifecycle.push(state),
    onTelemetry: (event) => telemetry.push(event),
  }).run("PAIR-CODE", controller.signal);

  assert.equal(lifecycle.includes("degraded"), true);
  assert.equal(lifecycle.includes("ready"), false);
  assert.deepEqual(backend.registrations[0]?.commands, []);
  assert.equal(telemetry.some((event) => event.stage === "ready" && event.supportedToolCount === undefined && event.degradedReason === "multiple_studio_windows"), true);
  assert.equal(telemetry.some((event) => event.supportedToolCount === 0 && event.degradedReason === "multiple_studio_windows"), true);
});

test("connector refreshes capabilities when a Studio window opens after discovery", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const telemetry: Array<{ supportedToolCount?: number; degradedReason?: string }> = [];
  mcp.studios = [];
  backend.pollHandler = async (poll) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (poll === 1) mcp.studios = [{
      studio_id: "studio-1",
      place_id: "42",
      place_name: "Fixture Place",
      universe_id: "84",
      place_signature: "fixture-signature",
    }];
    if (backend.registrations.some((registration) => registration.commands.length > 0)) {
      controller.abort(new DOMException("capabilities recovered", "AbortError"));
    }
    return null;
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    onTelemetry: (event) => telemetry.push(event),
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.registrations[0]?.commands, []);
  assert.equal(backend.registrations.some((registration) => registration.commands.includes("read_script")), true);
  assert.equal(telemetry.some((event) => event.supportedToolCount === 0 && event.degradedReason === "target_place_unavailable"), true);
  assert.equal(telemetry.some((event) => (event.supportedToolCount ?? 0) > 0), true);
});

test("initial discovery waits for StudioMCP to populate its Studio window registry", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  let targetDiscoveryCalls = 0;
  mcp.callToolHandler = (name) => {
    if (name !== "list_roblox_studios") return undefined;
    targetDiscoveryCalls += 1;
    if (targetDiscoveryCalls < 3) return { structuredContent: { studios: [] } };
    return undefined;
  };
  backend.pollHandler = async () => {
    controller.abort(new DOMException("startup discovery observed", "AbortError"));
    return null;
  };
  const startupConfig = { ...config, heartbeatMs: 5_000 };

  await new NexusLocalConnector({
    config: startupConfig,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
  }).run("PAIR-CODE", controller.signal);

  assert.equal(targetDiscoveryCalls, 4);
  assert.deepEqual(backend.registrations[0]?.commands, ["get_studio_context", "read_script", "read_scripts"]);
  assert.equal(backend.registrations[0]?.identity.placeId, "42");
});

test("connector leaves MCP reconnect paused when automatic reconnect is disabled", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.failConnects = 100;
  const run = new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    shouldAutoReconnect: () => false,
  }).run("PAIR-CODE", controller.signal);

  await new Promise((resolve) => setTimeout(resolve, 12));
  controller.abort(new DOMException("test complete", "AbortError"));
  await run;

  assert.equal(mcp.connectAttempts, 1);
  assert.deepEqual(backend.registrations[0]?.commands, []);
});

test("tools/list_changed causes full rediscovery and capability re-registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.toolPages = [[readTool, ...targetTools], [readTool, outputTool, ...targetTools]];
  backend.pollHandler = async (poll) => {
    if (poll === 1) {
      mcp.triggerToolsChanged();
      return null;
    }
    return reliableCommand({ id: "command-3", type: "collect_output", payload: {} });
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  })
    .run("PAIR-CODE", controller.signal);

  assert.equal(mcp.listCalls, 2);
  assert.deepEqual(backend.registrations[0]?.commands, ["get_studio_context", "read_script", "read_scripts"]);
  assert.deepEqual(backend.registrations[1]?.commands, [
    "collect_output",
    "get_output_logs",
    "get_studio_context",
    "read_script",
    "read_scripts",
  ]);
  assert.equal(backend.acknowledgements.at(-1)?.status, "succeeded");
});

test("a failed StudioMCP play-control self-check suppresses automated start and stop until reconnect", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  backend.abortOnTerminal = false;
  const mcp = new FakeMcp();
  mcp.toolPages = [[executeLuauTool, outputTool, startStopPlayTool, ...targetTools]];
  mcp.callToolHandler = (name) => name === "start_stop_play"
    ? { isError: true, content: [{ type: "text", text: "Start play hasn't finished yet" }] }
    : undefined;
  backend.pollHandler = async (poll) => {
    if (poll === 1) {
      return reliableCommand({
        id: "command-play-control-failure",
        type: "run_play_test",
        targetFence: 1,
        payload: { confirmed: true, maxDurationSeconds: 1 },
      });
    }
    controller.abort(new DOMException("suppressed capability published", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.8-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  })
    .run("PAIR-CODE", controller.signal);

  assert.equal(backend.registrations[0]?.commands.includes("run_play_test"), true);
  assert.equal(backend.registrations[0]?.commands.includes("stop_play_test"), true);
  const suppressed = backend.registrations.at(-1);
  assert.equal(suppressed?.commands.includes("run_test_service"), true);
  assert.equal(suppressed?.commands.includes("run_play_test"), false);
  assert.equal(suppressed?.commands.includes("stop_play_test"), false);
  assert.equal(suppressed?.capabilities.playtest, false);
  assert.equal(suppressed?.capabilityDetails.playtest.reasonCode, "RUNTIME_SELF_CHECK_FAILED");
  assert.equal(backend.acknowledgements.at(-1)?.status, "failed");
  assert.equal(resultErrorCode(backend.acknowledgements.at(-1)?.result), "PLAYTEST_CONTROL_UNAVAILABLE");
  assert.deepEqual(
    mcp.callTools.filter((call) => call.name === "start_stop_play").map((call) => call.args.is_start),
    [true],
  );
});

test("heartbeat continues during long polling and shutdown clears the in-memory token", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pollHandler = async (poll, signal) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 12);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      }, { once: true });
    });
    if (poll >= 3) controller.abort(new DOMException("heartbeat observed", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  })
    .run("PAIR-CODE", controller.signal);

  const availablePings = backend.pings.filter((ping) => ping.mcpServerAvailable === true);
  assert.equal(availablePings.length >= 2, true);
  assert.equal(mcp.callTools.filter((call) => call.name === "list_roblox_studios").length >= 2, true);
  assert.equal(availablePings.every((ping) => ping.activeStudioId === "studio-1"), true);
  assert.equal(availablePings.every((ping) => ping.studioId === "studio-1"), true);
  assert.equal(availablePings.every((ping) => ping.placeId === "42"), true);
  assert.equal(availablePings.every((ping) => ping.placeName === "Fixture Place"), true);
  assert.equal(availablePings.every((ping) => ping.universeId === "84"), true);
  assert.equal(availablePings.every((ping) => ping.placeSignature === "fixture-signature"), true);
  assert.equal(backend.pings.at(-1)?.mcpServerAvailable, false);
  assert.equal(backend.pings.at(-1)?.studioId, null);
  assert.equal(backend.pings.at(-1)?.placeId, null);
  assert.equal(backend.pings.at(-1)?.universeId, null);
  assert.equal(backend.pings.at(-1)?.placeSignature, null);
  assert.equal(backend.clearCalls, 1);
});

test("an empty bounded poll observes a website target switch before the next long heartbeat", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const slowHeartbeatConfig = { ...config, heartbeatMs: 300_000, pollWaitMs: 20_000 };
  const tokenA = "observation-token-a";
  const tokenB = "observation-token-b";
  let selectionTriggered = false;
  let switchedAt = 0;
  let observedAt = 0;
  mcp.studios = [
    { studio_id: "studio-a", place_id: "42", universe_id: "84", place_name: "Alpha", place_signature: "signature-a" },
    { studio_id: "studio-b", place_id: "43", universe_id: "85", place_name: "Beta", place_signature: "signature-b" },
  ];
  backend.claimPairing = async () => ({
    token: "nsmcp_session_secret",
    sessionId: "session",
    userId: "user",
    pollIntervalMs: 0,
    expiresInMs: 60_000,
    targetObservationToken: tokenA,
  });
  backend.pingHandler = (body) => {
    const requestToken = String(body.targetObservationToken || "");
    if (selectionTriggered && requestToken === tokenA) {
      return {
        ok: true,
        desiredStudioId: "studio-b",
        targetObservationAccepted: false,
        targetObservationToken: tokenB,
      };
    }
    if (selectionTriggered && requestToken === tokenB && body.activeStudioId === "studio-b") {
      observedAt = Date.now();
      controller.abort(new DOMException("target switch observed", "AbortError"));
    }
    return {
      ok: true,
      desiredStudioId: selectionTriggered ? "studio-b" : "studio-a",
      targetObservationAccepted: true,
      targetObservationToken: selectionTriggered ? tokenB : tokenA,
    };
  };
  backend.pollHandler = async () => {
    selectionTriggered = true;
    switchedAt = Date.now();
    return null;
  };

  await new NexusLocalConnector({
    config: slowHeartbeatConfig,
    connectorVersion: "0.2.11-test",
    backend,
    mcp,
    logger,
    commandJournal: new MemoryCommandJournal(),
  }).run("PAIR-CODE", controller.signal);

  assert.equal(backend.polls, 1);
  assert.equal(backend.pollWaits[0] <= 5_000, true);
  assert.equal(observedAt >= switchedAt, true);
  assert.equal(observedAt - switchedAt < 12_000, true);
  assert.equal(mcp.selectedStudioId, "studio-b");
});

test("attested Studio IDs reach both session pings and capability registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.toolPages = [[readTool, executeLuauTool, ...targetTools]];
  mcp.studios = [{ studio_id: "studio-live", place_name: "Window label" }];
  mcp.callToolHandler = (name) => name === "execute_luau" ? {
    structuredContent: {
      result: {
        placeId: "116714509720053",
        universeId: "10669840815",
        placeName: "NexusRBX Pipeline Test",
        placeSignature: "a1b2c3d4",
      },
    },
  } : undefined;
  backend.pollHandler = async () => {
    controller.abort(new DOMException("identity observed", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.2.8-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  const ping = backend.pings.find((entry) => entry.mcpServerAvailable === true && entry.studioId === "studio-live");
  assert.deepEqual(pickIdentity(ping), {
    studioId: "studio-live",
    placeId: "116714509720053",
    universeId: "10669840815",
    placeName: "NexusRBX Pipeline Test",
    placeSignature: "a1b2c3d4",
    targetIdentityComplete: true,
  });
  const registration = backend.registrations.find((entry) => entry.identity.studioId === "studio-live");
  assert.deepEqual(pickIdentity(registration?.identity), pickIdentity(ping));
  assert.deepEqual(registration?.identity.studioTargets[0], {
    studioId: "studio-live",
    label: "NexusRBX Pipeline Test",
    placeId: "116714509720053",
    placeName: "NexusRBX Pipeline Test",
    universeId: "10669840815",
    placeSignature: "a1b2c3d4",
  });
});

test("a backend-selected Studio is re-attested and pinged before registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-1", place_id: "101", place_name: "First", universe_id: "201", place_signature: "sig-1" },
    { studio_id: "studio-2", place_id: "102", place_name: "Second", universe_id: "202", place_signature: "sig-2" },
  ];
  backend.pingHandler = () => ({ session: { desiredStudioId: "studio-2" } });
  backend.pollHandler = async () => {
    controller.abort(new DOMException("selected identity registered", "AbortError"));
    return null;
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.2.8-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  const registrationIndex = backend.wireEvents.indexOf("register:studio-2");
  assert.equal(registrationIndex > 0, true);
  assert.deepEqual(backend.wireEvents.slice(registrationIndex - 2, registrationIndex + 1), [
    "ping:clear",
    "ping:studio-2",
    "register:studio-2",
  ]);
  assert.deepEqual(pickIdentity(backend.registrations[0]?.identity), {
    studioId: "studio-2",
    placeId: "102",
    universeId: "202",
    placeName: "Second",
    placeSignature: "sig-2",
    targetIdentityComplete: true,
  });
});

test("closing the active Studio clears stale identity in ping and registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pollHandler = async (poll) => {
    if (poll === 1) mcp.studios = [];
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (backend.registrations.some((entry, index) => index > 0 && entry.identity.targetIdentityComplete === false)) {
      controller.abort(new DOMException("stale identity cleared", "AbortError"));
    }
    return null;
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.2.8-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  const clearedPing = backend.pings.find((entry) => entry.mcpServerAvailable === true && entry.targetIdentityComplete === false);
  assert.deepEqual(pickIdentity(clearedPing), {
    studioId: null,
    placeId: null,
    universeId: null,
    placeName: null,
    placeSignature: null,
    targetIdentityComplete: false,
  });
  assert.deepEqual(clearedPing?.studioTargets, []);
  const clearedRegistration = backend.registrations.find((entry, index) => index > 0 && entry.identity.targetIdentityComplete === false);
  assert.deepEqual(pickIdentity(clearedRegistration?.identity), pickIdentity(clearedPing));
  assert.deepEqual(clearedRegistration?.commands, []);
});

test("same-window identity changes trigger a fresh target-bound registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pollHandler = async (poll) => {
    if (poll === 1) {
      mcp.studios = [{
        studio_id: "studio-1",
        place_id: "116714509720053",
        place_name: "NexusRBX Pipeline Test",
        universe_id: "10669840815",
        place_signature: "changed-signature",
      }];
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (backend.registrations.some((entry) => entry.identity.placeSignature === "changed-signature")) {
      controller.abort(new DOMException("identity refresh registered", "AbortError"));
    }
    return null;
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.2.8-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  const refreshed = backend.registrations.find((entry) => entry.identity.placeSignature === "changed-signature");
  assert.deepEqual(pickIdentity(refreshed?.identity), {
    studioId: "studio-1",
    placeId: "116714509720053",
    universeId: "10669840815",
    placeName: "NexusRBX Pipeline Test",
    placeSignature: "changed-signature",
    targetIdentityComplete: true,
  });
  assert.equal(backend.registrations[0]?.identity.studioId, "studio-1");
  assert.equal(backend.registrations.length >= 2, true);
});

test("lifecycle-v2 commands fence receipts before MCP work and persist the terminal result", async () => {
  const controller = new AbortController();
  const events: string[] = [];
  const backend = new FakeBackend(controller, events);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.events = events;
  backend.pollHandler = async () => reliableCommand();

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), [
    "received",
    "started",
    "succeeded",
  ]);
  assert.equal(events.indexOf("ack:received") < events.indexOf("ack:started"), true);
  assert.equal(events.indexOf("ack:started") < events.indexOf("mcp:script_read"), true);
  assert.equal(events.indexOf("mcp:script_read") < events.indexOf("ack:succeeded"), true);
  for (const acknowledgement of backend.acknowledgements) {
    assert.equal(acknowledgement.result.lifecycleVersion, 2);
    assert.equal(acknowledgement.result.leaseFence, 7);
    assert.equal(acknowledgement.result.semanticInputHash, "a".repeat(64));
  }
  assert.equal(journal.entries.get("reliable-command")?.stage, "terminal");
  assert.equal(journal.entries.get("reliable-command")?.terminalStatus, "succeeded");
  const terminalReceipt = backend.acknowledgements.at(-1)?.result.receiptId;
  assert.equal(typeof terminalReceipt, "string");
  assert.equal(journal.entries.get("reliable-command")?.receiptId, terminalReceipt);
  assert.equal(typeof journal.entries.get("reliable-command")?.acknowledgedAt, "number");
});

test("a lifecycle read rejects a delayed wrong-window envelope before MCP execution", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.studios = [{
    studio_id: "studio-1",
    place_id: "0",
    place_name: "Local Fixture",
    universe_id: "0",
    place_signature: "fixture-signature",
  }];
  const journal = new MemoryCommandJournal();
  backend.pollHandler = async () => reliableCommand({
    id: "wrong-window-read",
    expectedStudioWindowId: "studio-other",
    unpublishedMcp: true,
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), [
    "received",
    "started",
    "failed",
  ]);
  const terminalResult = backend.acknowledgements.at(-1)?.result;
  assert.equal(resultErrorCode(terminalResult), "STUDIO_TARGET_MISMATCH");
  assert.equal(terminalResult?.executionStarted, false);
  assert.equal(terminalResult?.sideEffectStarted, false);
  assert.equal(mcp.callTools.some(({ name }) => name === "script_read"), false);
  assert.equal(journal.entries.get("wrong-window-read")?.terminalStatus, "failed");
});

test("an unpublished lifecycle read without an exact window fails closed", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.studios = [{
    studio_id: "studio-1",
    place_id: "0",
    place_name: "Local Fixture",
    universe_id: "0",
    place_signature: "fixture-signature",
  }];
  backend.pollHandler = async () => reliableCommand({
    id: "missing-window-read",
    unpublishedMcp: true,
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), [
    "received",
    "started",
    "failed",
  ]);
  assert.equal(resultErrorCode(backend.acknowledgements.at(-1)?.result), "STUDIO_TARGET_ATTESTATION_INCOMPLETE");
  assert.equal(mcp.callTools.some(({ name }) => name === "script_read"), false);
  assert.equal(journal.entries.get("missing-window-read")?.terminalStatus, "failed");
});

test("lifecycle envelope stripping, routing gaps, and identity ambiguity never reach Studio business tools", async (t) => {
  const makeCommand = (type: "read_script" | "write_script", id: string): StudioCommand => reliableCommand({
    id,
    type,
    payload: type === "write_script" ? {
      path: "game.ServerScriptService.Main",
      source: "print('changed')",
      expectedSourceHash: sha256("print('ok')"),
    } : { path: "game.ServerScriptService.Main" },
    targetFence: type === "write_script" ? 1 : 0,
    semanticInputHash: (type === "write_script" ? "b" : "a").repeat(64),
  });
  const stripLifecycle = (command: StudioCommand): StudioCommand => ({
    id: command.id,
    type: command.type,
    payload: command.payload,
  });
  const withoutWindow = (command: StudioCommand): StudioCommand => {
    delete command.expectedStudioWindowId;
    if (command.studioTarget && typeof command.studioTarget === "object") {
      delete command.studioTarget.expectedStudioWindowId;
    }
    return command;
  };
  const localEnvelope = (command: StudioCommand): StudioCommand => {
    command.expectedPlaceId = null;
    command.expectedUniverseId = null;
    command.studioTarget = {
      ...(command.studioTarget || {}),
      expectedPlaceId: null,
      expectedUniverseId: null,
    };
    return command;
  };
  const conflictingAlias = (
    command: StudioCommand,
    field: "placeId" | "universeId" | "signature",
  ): StudioCommand => {
    if (field === "placeId") command.placeId = "999";
    if (field === "universeId") command.universeId = "999";
    if (field === "signature") command.studioTarget = {
      ...(command.studioTarget || {}),
      placeSignature: "conflicting-signature",
    };
    return command;
  };
  const malformedPlace = (command: StudioCommand, value: unknown): StudioCommand => {
    (command as unknown as Record<string, unknown>).expectedPlaceId = value;
    command.studioTarget = {
      ...(command.studioTarget || {}),
      expectedPlaceId: value as never,
    };
    return command;
  };

  const scenarios: Array<{ name: string; command: StudioCommand }> = [];
  for (const type of ["read_script", "write_script"] as const) {
    const prefix = type === "read_script" ? "read" : "mutation";
    const missingType = makeCommand(type, `${prefix}-missing-connection`);
    delete missingType.connectionType;
    scenarios.push({ name: `${prefix}: missing connection type`, command: missingType });
    scenarios.push({
      name: `${prefix}: wrong connection type`,
      command: { ...makeCommand(type, `${prefix}-wrong-connection`), connectionType: "plugin_bridge" },
    });
    scenarios.push({
      name: `${prefix}: stripped lifecycle`,
      command: stripLifecycle(makeCommand(type, `${prefix}-stripped-lifecycle`)),
    });
    scenarios.push({
      name: `${prefix}: published envelope missing exact window`,
      command: withoutWindow(makeCommand(type, `${prefix}-missing-window`)),
    });
    scenarios.push({
      name: `${prefix}: unpublished envelope delivered after the same window becomes published`,
      command: localEnvelope(makeCommand(type, `${prefix}-local-to-published`)),
    });
  }

  for (const field of ["placeId", "universeId", "signature"] as const) {
    scenarios.push({
      name: `read: conflicting ${field} alias`,
      command: conflictingAlias(makeCommand("read_script", `read-conflicting-${field}`), field),
    });
  }
  for (const [index, value] of ["", " ", false, {}, -1, 1.5, "01"].entries()) {
    scenarios.push({
      name: `read: malformed expected place identity ${index + 1}`,
      command: malformedPlace(makeCommand("read_script", `read-malformed-place-${index + 1}`), value),
    });
  }
  const missingExpectedPlace = makeCommand("read_script", "read-missing-expected-place");
  delete missingExpectedPlace.expectedPlaceId;
  scenarios.push({ name: "read: missing explicit expected place identity", command: missingExpectedPlace });

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const controller = new AbortController();
      const backend = new FakeBackend(controller);
      const mcp = new FakeMcp();
      const journal = new MemoryCommandJournal();
      mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
      backend.pollHandler = async (poll) => {
        if (poll === 1) return scenario.command;
        controller.abort(new DOMException("malformed command rejected", "AbortError"));
        return null;
      };

      await new NexusLocalConnector({
        config,
        connectorVersion: "0.2.11-test",
        backend,
        mcp,
        logger,
        commandJournal: journal,
      }).run("PAIR-CODE", controller.signal);

      assert.equal(mcp.callTools.some(({ name }) => name === "script_read" || name === "multi_edit"), false);
      assert.equal(backend.acknowledgements.some(({ status }) => status === "succeeded"), false);
    });
  }
});

test("verified local writes attest the advanced signature and the next write uses it", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  backend.abortOnTerminal = false;
  mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
  mcp.studios = [{
    studio_id: "studio-1",
    place_id: "0",
    place_name: "Local Fixture",
    universe_id: "0",
    place_signature: "fixture-signature",
  }];

  let source = "print('before')";
  let mutationCalls = 0;
  mcp.callToolHandler = async (name, args) => {
    if (name === "script_read") return { structuredContent: { source } };
    if (name === "multi_edit") {
      mutationCalls += 1;
      source = String(args.source ?? "");
      mcp.studios[0]!.place_signature = `fixture-signature-${mutationCalls + 1}`;
      return { structuredContent: { ok: true } };
    }
    return undefined;
  };

  const first = reliableCommand({
    id: "advanced-signature-write-1",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('first')",
      expectedSourceHash: sha256("print('before')"),
    },
    semanticInputHash: "1".repeat(64),
    targetFence: 1,
    expectedStudioWindowId: "studio-1",
    unpublishedMcp: true,
  });
  const second = reliableCommand({
    id: "advanced-signature-write-2",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('second')",
      expectedSourceHash: sha256("print('first')"),
    },
    semanticInputHash: "2".repeat(64),
    targetFence: 2,
    expectedStudioWindowId: "studio-1",
    expectedPlaceSignature: "fixture-signature-2",
    unpublishedMcp: true,
  });
  backend.pollHandler = async (poll) => poll === 1 ? first : second;
  backend.acknowledgeHandler = async (commandId, status) => {
    if (commandId === second.id && status === "succeeded") {
      controller.abort(new DOMException("two writes complete", "AbortError"));
    }
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.11-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  const terminal = backend.acknowledgements.filter(({ status }) => status === "succeeded");
  assert.equal(mutationCalls, 2);
  assert.equal(source, "print('second')");
  assert.equal(terminal.length, 2);
  assert.deepEqual(terminal.map(({ result }) => {
    const attestation = result.targetAttestation as JsonObject;
    return {
      studioWindowId: attestation?.studioWindowId,
      placeSignature: attestation?.placeSignature,
    };
  }), [
    { studioWindowId: "studio-1", placeSignature: "fixture-signature-2" },
    { studioWindowId: "studio-1", placeSignature: "fixture-signature-3" },
  ]);
});

test("snapshot creation attests the advanced place signature", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[executeLuauTool, ...targetTools]];
  mcp.studios = [{
    studio_id: "studio-1",
    place_id: "0",
    place_name: "Local Fixture",
    universe_id: "0",
    place_signature: "fixture-signature-before-snapshot",
  }];
  mcp.callToolHandler = async (name, args) => {
    if (name !== "execute_luau") return undefined;
    const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(String(args.code || ""));
    assert.ok(match?.[1]);
    const input = JSON.parse(JSON.parse(match[1])) as { nonce: string; operation: string };
    assert.equal(input.operation, "create_snapshot");
    mcp.studios[0]!.place_signature = "fixture-signature-after-snapshot";
    return { content: [{ type: "text", text: JSON.stringify({
      version: 1,
      nonce: input.nonce,
      ok: true,
      data: {
        snapshots: [{ snapshotId: input.nonce, path: "game/ServerScriptService/Main", preHash: "before", postHash: "before" }],
        snapshotCount: 1,
      },
    }) }] };
  };
  backend.pollHandler = async () => reliableCommand({
    id: "snapshot-signature-advance",
    type: "create_snapshot",
    payload: { paths: ["game/ServerScriptService/Main"], recursive: false },
    targetFence: 1,
    expectedStudioWindowId: "studio-1",
    expectedPlaceSignature: "fixture-signature-before-snapshot",
    unpublishedMcp: true,
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.13-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  const terminal = backend.acknowledgements.find(({ status }) => status === "succeeded");
  assert.equal(terminal?.result.verified, true, JSON.stringify(backend.acknowledgements));
  assert.equal((terminal?.result.targetAttestation as JsonObject)?.studioWindowId, "studio-1");
  assert.equal((terminal?.result.targetAttestation as JsonObject)?.placeSignature, "fixture-signature-after-snapshot");
});

test("a verified mutation with failed post-write target attestation is durably demoted to outcome_unknown", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
  let postMutation = false;
  let source = "print('before')";
  mcp.callToolHandler = (name, args) => {
    if (name === "script_read") return { structuredContent: { source } };
    if (name === "multi_edit") {
      postMutation = true;
      source = "print('after')";
      mcp.studios[0]!.place_signature = "fixture-signature-after";
      return { structuredContent: { ok: true, path: args.file_path } };
    }
    if (name === "list_roblox_studios" && postMutation) {
      return { isError: true, content: [{ type: "text", text: "post-write target probe unavailable" }] };
    }
    return undefined;
  };
  backend.pollHandler = async () => reliableCommand({
    id: "post-attestation-failure",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('after')",
      expectedSourceHash: sha256("print('before')"),
    },
    semanticInputHash: "f".repeat(64),
    targetFence: 1,
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.11-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  const terminal = backend.acknowledgements.at(-1);
  assert.equal(terminal?.status, "outcome_unknown");
  assert.equal(resultErrorCode(terminal?.result), "POST_MUTATION_TARGET_ATTESTATION_FAILED");
  assert.equal(Object.hasOwn(terminal?.result || {}, "targetAttestation"), false);
  assert.equal(journal.entries.get("post-attestation-failure")?.terminalStatus, "outcome_unknown");
});

test("lifecycle-v2 execution renews the same started fence while MCP work is in flight", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const command = reliableCommand({ leaseExpiresAt: Date.now() + 240 });
  mcp.callToolHandler = async (name, _args, signal) => {
    if (name !== "script_read") return undefined;
    await wait(170, signal);
    return { structuredContent: { source: "print('slow')" } };
  };
  backend.pollHandler = async () => command;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  const startedReceipts = backend.acknowledgements.filter(({ status }) => status === "started");
  assert.equal(startedReceipts.length >= 2, true);
  assert.equal(startedReceipts.every(({ result }) => result.leaseFence === 7), true);
  assert.equal(backend.acknowledgements.at(-1)?.status, "succeeded");
});

test("a journaled terminal is replayed after restart without invoking MCP again", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const command = reliableCommand({ id: "terminal-replay" });
  await journal.put({
    commandId: command.id,
    commandType: command.type,
    semanticInputHash: String(command.semanticInputHash),
    stage: "terminal",
    sessionId: "session",
    receiptId: "receipt-restart",
    terminalStatus: "succeeded",
    result: {
      success: true,
      ok: true,
      commandId: command.id,
      operation: command.type,
      retryable: false,
      verified: false,
      receiptId: "receipt-restart",
      lifecycleVersion: 2,
      semanticInputHash: String(command.semanticInputHash),
      leaseFence: 7,
      targetFence: 0,
    },
    updatedAt: Date.now(),
  });
  backend.pollHandler = async () => {
    throw new Error("The backend must not redeliver a command to replay its saved receipt.");
  };
  backend.pingHandler = () => ({
    ok: true,
    targetObservationAccepted: false,
    targetObservationToken: "restart-observation-token",
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).runClaimed({
    token: "nsmcp_session_secret",
    sessionId: "session",
    userId: "user",
    pollIntervalMs: 0,
    expiresInMs: 60_000,
  }, controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), ["succeeded"]);
  assert.equal(backend.acknowledgements[0]?.result.receiptId, "receipt-restart");
  assert.equal(backend.polls, 0);
  assert.equal(backend.pings.length >= 1, true);
  assert.equal(mcp.connectAttempts, 0);
  assert.equal(mcp.callTools.some(({ name }) => name === "script_read"), false);
  assert.equal(typeof journal.entries.get(command.id)?.acknowledgedAt, "number");
});

test("restart learns the current observation token before replaying a durable mutation receipt", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const command = reliableCommand({
    id: "terminal-mutation-restart",
    type: "write_script",
    targetFence: 4,
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('committed')",
      expectedSourceHash: sha256("print('before')"),
    },
  });
  const receiptId = "receipt-terminal-mutation-restart";
  const result = {
    success: true,
    verified: true,
    receiptId,
    commandId: command.id,
    lifecycleVersion: 2,
    semanticInputHash: command.semanticInputHash,
    leaseFence: command.lease?.fence,
    targetFence: command.lease?.targetFence,
    operationOutcome: "succeeded",
    targetAttestation: {
      targetId: command.targetId,
      sessionId: command.sessionId,
      placeId: command.expectedPlaceId,
      universeId: command.expectedUniverseId,
      placeSignature: command.expectedPlaceSignature,
      targetGeneration: command.targetGeneration,
      studioWindowId: command.expectedStudioWindowId,
    },
  } satisfies JsonObject;
  await journal.put({
    commandId: command.id,
    commandType: command.type,
    semanticInputHash: String(command.semanticInputHash),
    stage: "terminal",
    sessionId: "session",
    receiptId,
    terminalStatus: "succeeded",
    result,
    updatedAt: Date.now(),
  });
  backend.pingHandler = () => ({
    ok: true,
    targetObservationAccepted: false,
    targetObservationToken: "fresh-restart-observation-token",
  });

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.11-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).runClaimed({
    token: "nsmcp_session_secret",
    sessionId: "session",
    userId: "user",
    pollIntervalMs: 0,
    expiresInMs: 60_000,
  }, controller.signal);

  assert.equal(backend.pings.length >= 1, true);
  assert.equal(backend.pings[0]?.targetObservationToken, null);
  assert.equal(backend.acknowledgements.length, 1);
  assert.equal(backend.acknowledgements[0]?.targetObservationToken, "fresh-restart-observation-token");
  assert.equal(mcp.connectAttempts, 0);
  assert.equal(typeof journal.entries.get(command.id)?.acknowledgedAt, "number");
});

test("restart never replays a durable receipt when observation-token bootstrap fails", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const command = reliableCommand({ id: "terminal-bootstrap-failure" });
  await journal.put({
    commandId: command.id,
    commandType: command.type,
    semanticInputHash: String(command.semanticInputHash),
    stage: "terminal",
    sessionId: "session",
    receiptId: "receipt-bootstrap-failure",
    terminalStatus: "succeeded",
    result: {
      success: true,
      receiptId: "receipt-bootstrap-failure",
      commandId: command.id,
      lifecycleVersion: 2,
      semanticInputHash: command.semanticInputHash,
      leaseFence: command.lease?.fence,
      targetFence: command.lease?.targetFence,
      operationOutcome: "succeeded",
    },
    updatedAt: Date.now(),
  });
  backend.pingHandler = () => {
    controller.abort(new DOMException("bootstrap unavailable", "AbortError"));
    throw new ConnectorError("BACKEND_TEMPORARY_ERROR", "bootstrap unavailable", { retryable: true });
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.2.11-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).runClaimed({
    token: "nsmcp_session_secret",
    sessionId: "session",
    userId: "user",
    pollIntervalMs: 0,
    expiresInMs: 60_000,
  }, controller.signal);

  assert.equal(backend.acknowledgements.length, 0);
  assert.equal(journal.entries.get(command.id)?.acknowledgedAt, undefined);
  assert.equal(mcp.connectAttempts, 0);
});

test("a terminal acknowledgement outage replays the exact durable receipt without re-executing Studio", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const command = reliableCommand({ id: "terminal-outage" });
  let terminalAttempts = 0;
  backend.pollHandler = async (poll) => {
    assert.equal(poll, 1);
    return command;
  };
  backend.acknowledgeHandler = async (_commandId, status) => {
    if (!isTerminalStatus(status)) return;
    terminalAttempts += 1;
    if (terminalAttempts === 1) {
      throw new ConnectorError("BACKEND_TEMPORARY_ERROR", "temporary outage", { retryable: true });
    }
  };

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  const terminalReceipts = backend.acknowledgements.filter(({ status }) => status === "succeeded");
  assert.equal(terminalAttempts, 2);
  assert.equal(terminalReceipts.length, 2);
  assert.deepEqual(terminalReceipts[1]?.result, terminalReceipts[0]?.result);
  assert.equal(typeof terminalReceipts[0]?.result.receiptId, "string");
  assert.equal(backend.polls, 1);
  assert.equal(mcp.callTools.filter(({ name }) => name === "script_read").length, 1);
  assert.equal(typeof journal.entries.get(command.id)?.acknowledgedAt, "number");
});

test("an unreplayable saved receipt does not block a fresh command from polling and completing", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  const staleCommand = reliableCommand({ id: "stale-terminal" });
  const freshCommand = reliableCommand({ id: "fresh-command", semanticInputHash: "b".repeat(64) });
  await journal.put({
    commandId: staleCommand.id,
    commandType: staleCommand.type,
    semanticInputHash: String(staleCommand.semanticInputHash),
    stage: "terminal",
    sessionId: "session",
    receiptId: "stuck-receipt",
    terminalStatus: "succeeded",
    result: {
      success: true,
      ok: true,
      commandId: staleCommand.id,
      operation: staleCommand.type,
      retryable: false,
      verified: false,
      receiptId: "stuck-receipt",
      lifecycleVersion: 2,
      semanticInputHash: String(staleCommand.semanticInputHash),
      leaseFence: 7,
      targetFence: 0,
    },
    updatedAt: Date.now(),
  });
  backend.acknowledgeHandler = async (commandId, status) => {
    if (commandId === staleCommand.id && isTerminalStatus(status)) {
      throw new ConnectorError("BACKEND_TEMPORARY_ERROR", "receipt still unavailable", { retryable: true });
    }
  };
  backend.pollHandler = async () => freshCommand;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.equal(backend.polls, 1);
  assert.equal(mcp.callTools.filter(({ name }) => name === "script_read").length, 1);
  assert.equal(
    backend.acknowledgements.some(({ id, status }) => id === freshCommand.id && status === "succeeded"),
    true,
  );
  assert.equal(journal.entries.get(staleCommand.id)?.acknowledgedAt, undefined);
  assert.equal(typeof journal.entries.get(freshCommand.id)?.acknowledgedAt, "number");
});

test("a mutation journaled as started before restart becomes outcome_unknown without re-execution", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
  const command = reliableCommand({
    id: "started-mutation",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('new')",
      expectedSourceHash: sha256("print('ok')"),
    },
    targetFence: 3,
  });
  await journal.put({
    commandId: command.id,
    commandType: command.type,
    semanticInputHash: String(command.semanticInputHash),
    stage: "started",
    updatedAt: Date.now(),
  });
  backend.pollHandler = async () => command;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), ["outcome_unknown"]);
  assert.equal(backend.acknowledgements[0]?.result.operationOutcome, "outcome_unknown");
  assert.equal(
    (backend.acknowledgements[0]?.result.error as JsonObject | undefined)?.code,
    "CONNECTOR_RESTART_AFTER_COMMAND_START",
  );
  assert.equal(mcp.callTools.some(({ name }) => name === "multi_edit"), false);
});

test("an uncertain mutation failure is terminal outcome_unknown and is never blindly retried", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
  let mutationCalls = 0;
  mcp.callToolHandler = async (name) => {
    if (name === "script_read") return { structuredContent: { source: "print('ok')" } };
    if (name === "multi_edit") {
      mutationCalls += 1;
      throw new ConnectorError("MCP_REQUEST_TIMEOUT", "timeout");
    }
    return undefined;
  };
  const command = reliableCommand({
    id: "uncertain-mutation",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('new')",
      expectedSourceHash: sha256("print('ok')"),
    },
    targetFence: 4,
  });
  backend.pollHandler = async () => command;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), [
    "received",
    "started",
    "outcome_unknown",
  ]);
  assert.equal(mutationCalls, 1);
  assert.equal(
    (backend.acknowledgements.at(-1)?.result.error as JsonObject | undefined)?.code,
    "APPLY_UNVERIFIED",
  );
  assert.equal(journal.entries.get(command.id)?.terminalStatus, "outcome_unknown");
});

test("MUTATION_NOT_APPLIED is a safe failed receipt, not outcome_unknown", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[executeLuauTool, ...targetTools]];
  mcp.callToolHandler = async (name, args) => {
    if (name !== "execute_luau") return undefined;
    const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(String(args.code || ""));
    assert.ok(match?.[1]);
    const input = JSON.parse(JSON.parse(match[1])) as { nonce: string };
    return { content: [{ type: "text", text: JSON.stringify({
      version: 1,
      nonce: input.nonce,
      ok: false,
      code: "MUTATION_NOT_APPLIED",
      message: "destination changed after snapshot",
      data: { rolledBack: false },
    }) }] };
  };
  const command = reliableCommand({
    id: "not-applied-mutation",
    type: "create_instance",
    payload: { path: "Workspace/NewPart", className: "Part" },
    targetFence: 1,
  });
  backend.pollHandler = async () => command;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.acknowledgements.map(({ status }) => status), ["received", "started", "failed"]);
  assert.equal(
    (backend.acknowledgements.at(-1)?.result.error as JsonObject | undefined)?.code,
    "MUTATION_NOT_APPLIED",
  );
  assert.equal(journal.entries.get(command.id)?.terminalStatus, "failed");
});

test("losing the lease heartbeat during a mutation aborts work and forces reconciliation", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  const journal = new MemoryCommandJournal();
  mcp.toolPages = [[readTool, mutationTool, ...targetTools]];
  let mutationCalls = 0;
  let startedReceipts = 0;
  backend.acknowledgeHandler = async (_commandId, status) => {
    if (status !== "started") return;
    startedReceipts += 1;
    if (startedReceipts === 2) {
      throw new ConnectorError("BACKEND_TEMPORARY_ERROR", "heartbeat unavailable", { retryable: true });
    }
  };
  mcp.callToolHandler = async (name, _args, signal) => {
    if (name === "script_read") return { structuredContent: { source: "print('ok')" } };
    if (name === "multi_edit") {
      mutationCalls += 1;
      await wait(500, signal);
      return { structuredContent: { ok: true } };
    }
    return undefined;
  };
  const command = reliableCommand({
    id: "heartbeat-failure",
    type: "write_script",
    payload: {
      path: "game.ServerScriptService.Main",
      source: "print('new')",
      expectedSourceHash: sha256("print('ok')"),
    },
    targetFence: 5,
    leaseExpiresAt: Date.now() + 180,
  });
  backend.pollHandler = async () => command;

  await new NexusLocalConnector({
    config,
    connectorVersion: "0.1.0-test",
    backend,
    mcp,
    logger,
    commandJournal: journal,
  }).run("PAIR-CODE", controller.signal);

  assert.equal(mutationCalls, 1);
  assert.equal(backend.acknowledgements.at(-1)?.status, "outcome_unknown");
  assert.equal(
    (backend.acknowledgements.at(-1)?.result.error as JsonObject | undefined)?.code,
    "BACKEND_TEMPORARY_ERROR",
  );
  assert.equal(journal.entries.get(command.id)?.terminalStatus, "outcome_unknown");
});
