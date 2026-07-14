import assert from "node:assert/strict";
import test from "node:test";
import type { ConnectorConfig } from "../src/config.js";
import { NexusLocalConnector } from "../src/connector.js";
import { ConnectorError } from "../src/errors.js";
import type { Logger } from "../src/logger.js";
import type {
  BackendClientLike,
  DiscoveredTool,
  JsonObject,
  McpClientLike,
  McpConnectionInfo,
  PairClaimResponse,
  StudioCapabilities,
  StudioCommand,
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

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
  addSecret() {},
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
  toolPages: DiscoveredTool[][] = [[readTool]];
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
  async callTool(name: string, args: JsonObject): Promise<ToolCallResult> {
    this.callTools.push({ name, args });
    if (name === "script_read") return { structuredContent: { source: "print('ok')" } };
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
  commands: string[];
  tools: Array<{ name: string; description?: string }>;
}

class FakeBackend implements BackendClientLike {
  claims: string[] = [];
  pings: JsonObject[] = [];
  registrations: Registration[] = [];
  polls = 0;
  acknowledgements: Array<{ id: string; status: "succeeded" | "failed"; result: JsonObject }> = [];
  clearCalls = 0;
  pollHandler: ((poll: number, signal?: AbortSignal) => Promise<StudioCommand | null>) | null = null;

  constructor(private readonly controller: AbortController) {}

  async claimPairing(code: string): Promise<PairClaimResponse> {
    this.claims.push(code);
    return { token: "nsmcp_session_secret", sessionId: "session", userId: "user", pollIntervalMs: 0, expiresInMs: 60_000 };
  }
  async ping(body: JsonObject): Promise<JsonObject> { this.pings.push(body); return { ok: true }; }
  async registerCapabilities(
    capabilities: StudioCapabilities,
    supportedCommands: string[],
    discoveredTools: Array<{ name: string; description?: string }>,
  ): Promise<JsonObject> {
    this.registrations.push({ capabilities, commands: [...supportedCommands], tools: discoveredTools });
    return { ok: true };
  }
  async pollNext(_waitMs: number, signal?: AbortSignal): Promise<StudioCommand | null> {
    this.polls += 1;
    if (this.pollHandler) return this.pollHandler(this.polls, signal);
    return null;
  }
  async acknowledge(
    commandId: string,
    status: "succeeded" | "failed",
    result: JsonObject,
  ): Promise<JsonObject> {
    this.acknowledgements.push({ id: commandId, status, result });
    this.controller.abort(new DOMException("test complete", "AbortError"));
    return { ok: true };
  }
  clearToken(): void { this.clearCalls += 1; }
}

test("connector claims, discovers, registers, polls, executes, acknowledges, and shuts down", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  backend.pollHandler = async () => ({
    id: "command-1",
    type: "read_script",
    payload: { path: "game.ServerScriptService.Main" },
  });

  await new NexusLocalConnector({ config, connectorVersion: "0.1.0-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  assert.deepEqual(backend.claims, ["PAIR-CODE"]);
  assert.equal(mcp.connectAttempts, 1);
  assert.equal(mcp.listCalls, 1);
  assert.deepEqual(backend.registrations[0]?.commands, ["read_script", "read_scripts"]);
  assert.deepEqual(backend.acknowledgements.map(({ id, status }) => ({ id, status })), [
    { id: "command-1", status: "succeeded" },
  ]);
  assert.equal(backend.acknowledgements[0]?.result.verified, false);
  assert.deepEqual(mcp.callTools.map((call) => call.name), ["script_read"]);
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
  backend.pollHandler = async () => ({ id: "command-2", type: "read_script", payload: { path: "game.Script" } });

  await new NexusLocalConnector({ config, connectorVersion: "0.1.0-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  assert.equal(mcp.connectAttempts, 2);
  assert.deepEqual(backend.registrations[0]?.commands, []);
  assert.deepEqual(backend.registrations[1]?.commands, ["read_script", "read_scripts"]);
  assert.equal(backend.pings.some((ping) => ping.mcpServerAvailable === false), true);
  assert.equal(backend.acknowledgements[0]?.status, "succeeded");
});

test("tools/list_changed causes full rediscovery and capability re-registration", async () => {
  const controller = new AbortController();
  const backend = new FakeBackend(controller);
  const mcp = new FakeMcp();
  mcp.toolPages = [[readTool], [readTool, outputTool]];
  backend.pollHandler = async (poll) => {
    if (poll === 1) {
      mcp.triggerToolsChanged();
      return null;
    }
    return { id: "command-3", type: "collect_output", payload: {} };
  };

  await new NexusLocalConnector({ config, connectorVersion: "0.1.0-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  assert.equal(mcp.listCalls, 2);
  assert.deepEqual(backend.registrations[0]?.commands, ["read_script", "read_scripts"]);
  assert.deepEqual(backend.registrations[1]?.commands, [
    "collect_output",
    "get_output_logs",
    "read_script",
    "read_scripts",
  ]);
  assert.equal(backend.acknowledgements[0]?.status, "succeeded");
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

  await new NexusLocalConnector({ config, connectorVersion: "0.1.0-test", backend, mcp, logger })
    .run("PAIR-CODE", controller.signal);

  const availablePings = backend.pings.filter((ping) => ping.mcpServerAvailable === true);
  assert.equal(availablePings.length >= 2, true);
  assert.equal(backend.pings.at(-1)?.mcpServerAvailable, false);
  assert.equal(backend.clearCalls, 1);
});
