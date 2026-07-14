import assert from "node:assert/strict";
import test from "node:test";
import { CommandExecutor, nexusStableHash, sha256 } from "../src/command-executor.js";
import { ToolCatalog } from "../src/tool-catalog.js";
import type {
  DiscoveredTool,
  JsonObject,
  McpClientLike,
  McpConnectionInfo,
  StudioCommand,
  ToolCallResult,
} from "../src/types.js";

const READ_PATH = "game.ServerScriptService.Main";

const tools: DiscoveredTool[] = [
  {
    name: "script_read",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        datamodel_type: { type: "string", enum: ["Edit"] },
      },
      required: ["path", "datamodel_type"],
    },
  },
  {
    name: "multi_edit",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        datamodel_type: { type: "string", enum: ["Edit"] },
        source: { type: "string" },
      },
      required: ["path", "datamodel_type", "source"],
    },
  },
  {
    name: "inspect_instance",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        datamodel_type: { type: "string", enum: ["Edit"] },
      },
      required: ["path", "datamodel_type"],
    },
  },
  {
    name: "execute_luau",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  { name: "get_console_output", inputSchema: { type: "object", properties: {}, required: [] } },
];

class FakeMcp implements McpClientLike {
  readonly calls: Array<{ name: string; args: JsonObject }> = [];
  readonly sources = new Map<string, string>();
  mutationError: Error | null = null;
  applyMutation = true;
  malformedRead = false;
  consoleText = "log";
  readonly inspections = new Map<string, JsonObject>();

  async connect(): Promise<McpConnectionInfo> { return {}; }
  async disconnect(): Promise<void> {}
  async listTools(): Promise<DiscoveredTool[]> { return tools; }
  onToolsChanged(): void {}
  onDisconnect(): void {}

  async callTool(name: string, args: JsonObject): Promise<ToolCallResult> {
    this.calls.push({ name, args });
    if (name === "script_read") {
      if (this.malformedRead) return { content: [] };
      const path = String(args.path);
      const source = this.sources.get(path);
      if (source === undefined) return { isError: true, content: [{ type: "text", text: "script not found" }] };
      return { structuredContent: { source } };
    }
    if (name === "multi_edit") {
      if (this.mutationError) throw this.mutationError;
      if (this.applyMutation) this.sources.set(String(args.path), String(args.source));
      return { content: [{ type: "text", text: "edited" }] };
    }
    if (name === "get_console_output") return { content: [{ type: "text", text: this.consoleText }] };
    if (name === "inspect_instance") {
      const inspection = this.inspections.get(String(args.path));
      if (!inspection) return { isError: true, content: [{ type: "text", text: "instance not found" }] };
      return { structuredContent: { instance: inspection } };
    }
    return { isError: true, content: [{ type: "text", text: "unsupported" }] };
  }
}

function command(type: string, payload: JsonObject): StudioCommand {
  return { id: `command-${type}`, type, payload, runId: "run-1", stepId: "step-1" };
}

function errorCode(result: JsonObject): string | undefined {
  const error = result.error;
  return typeof error === "object" && error !== null && !Array.isArray(error) && typeof error.code === "string"
    ? error.code
    : undefined;
}

test("reads Studio source and returns a deterministic SHA-256 hash", async () => {
  const mcp = new FakeMcp();
  mcp.sources.set(READ_PATH, "print('hello')");
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("read_script", { path: READ_PATH }));
  assert.equal(result.success, true);
  assert.equal(result.verified, false);
  assert.equal(result.source, "print('hello')");
  assert.equal(result.sourceHash, sha256("print('hello')"));
  assert.deepEqual(mcp.calls, [{
    name: "script_read",
    args: { path: READ_PATH, datamodel_type: "Edit" },
  }]);
});

test("accepts the backend protocol's normalized single-script paths payload", async () => {
  const mcp = new FakeMcp();
  mcp.sources.set(READ_PATH, "print('normalized')");
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("read_script", { paths: [READ_PATH] }));
  assert.equal(result.success, true);
  assert.equal(result.source, "print('normalized')");
  assert.deepEqual(result.affectedPaths, [READ_PATH]);

  const ambiguous = await executor.execute(command("read_script", { paths: [READ_PATH, `${READ_PATH}.Nested`] }));
  assert.equal(ambiguous.success, false);
  assert.equal(errorCode(ambiguous), "COMMAND_PAYLOAD_INVALID");
});

test("unsupported commands and malformed tool output return structured failures", async () => {
  const mcp = new FakeMcp();
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const unsupported = await executor.execute(command("start_playtest", {}));
  assert.equal(unsupported.success, false);
  assert.equal(unsupported.unsupported, true);
  assert.equal(errorCode(unsupported), "MCP_TOOL_UNAVAILABLE");
  assert.equal(mcp.calls.length, 0);

  const arbitraryLuau = await executor.execute(command("parse_luau", { source: "game.Workspace:ClearAllChildren()" }));
  assert.equal(errorCode(arbitraryLuau), "MCP_TOOL_UNAVAILABLE");
  assert.equal(mcp.calls.length, 0);

  mcp.sources.set(READ_PATH, "source");
  mcp.malformedRead = true;
  const malformed = await executor.execute(command("read_script", { path: READ_PATH }));
  assert.equal(malformed.success, false);
  assert.equal(errorCode(malformed), "MCP_RESPONSE_MALFORMED");
});

test("schema-validated inspect_instance supports bounded property reads without overstating parity", async () => {
  const mcp = new FakeMcp();
  const first = "game.Workspace.First";
  const second = "game.Workspace.Second";
  mcp.inspections.set(first, {
    path: first,
    className: "Part",
    properties: { Name: "First", Transparency: 0 },
    attributes: { Role: "Spawn" },
    children: [{ path: `${first}.Child` }],
  });
  mcp.inspections.set(second, {
    path: second,
    className: "Folder",
    properties: { Name: "Second" },
    attributes: {},
  });
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const inspected = await executor.execute(command("inspect_instances", {
    paths: [first, second],
    includeChildren: false,
    includeProperties: true,
    includeAttributes: true,
    includeTags: false,
    includeSourceHash: false,
  }));
  assert.equal(inspected.success, true);
  assert.deepEqual(inspected.affectedPaths, [first, second]);
  assert.equal(Array.isArray(inspected.instances), true);
  assert.deepEqual(mcp.calls.map((call) => call.name), ["inspect_instance", "inspect_instance"]);
  assert.equal("children" in ((inspected.instances as JsonObject[])[0] as JsonObject), false);

  const properties = await executor.execute(command("read_properties", {
    path: first,
    properties: ["Name"],
    includeAttributes: false,
    includeTags: false,
    includeChildren: false,
  }));
  assert.equal(properties.success, true);
  assert.deepEqual((properties.instances as JsonObject[])[0]?.properties, { Name: "First" });
  assert.equal("attributes" in ((properties.instances as JsonObject[])[0] as JsonObject), false);

  const needsTags = await executor.execute(command("read_instance", {
    path: first,
    includeTags: true,
    includeChildren: false,
  }));
  assert.equal(needsTags.unsupported, true);
  assert.equal(errorCode(needsTags), "MCP_TOOL_UNAVAILABLE");
  assert.equal(mcp.calls.filter((call) => call.name === "inspect_instance").length, 3);
});

test("existing writes require a matching pre-read hash and never mutate on conflict", async () => {
  const mcp = new FakeMcp();
  mcp.sources.set(READ_PATH, "old");
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const missing = await executor.execute(command("write_script", { path: READ_PATH, source: "new" }));
  assert.equal(errorCode(missing), "EXPECTED_SOURCE_HASH_REQUIRED");
  assert.equal(mcp.calls.filter((call) => call.name === "multi_edit").length, 0);

  const conflict = await executor.execute(command("write_script", {
    path: READ_PATH,
    source: "new",
    expectedSourceHash: sha256("different"),
  }));
  assert.equal(errorCode(conflict), "SOURCE_CONFLICT");
  assert.equal(conflict.retryable, true);
  assert.equal(mcp.calls.filter((call) => call.name === "multi_edit").length, 0);
});

test("a guarded mutation is post-read exactly and only then marked verified", async () => {
  const mcp = new FakeMcp();
  mcp.sources.set(READ_PATH, "old");
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("patch_script", {
    path: READ_PATH,
    patches: [{ find: "old", replace: "new" }],
    expectedSourceHash: nexusStableHash("old"),
  }));

  assert.equal(result.success, true);
  assert.equal(result.verified, true);
  assert.deepEqual(result.verificationChecks, [{ type: "source_exact_match", path: READ_PATH, passed: true }]);
  assert.deepEqual(result.resultingHashes, { [READ_PATH]: sha256("new") });
  assert.equal(mcp.sources.get(READ_PATH), "new");
  assert.deepEqual(mcp.calls.map((call) => call.name), ["script_read", "multi_edit", "script_read"]);
});

test("mutation errors are never retried and unknown or mismatched outcomes fail unverified", async () => {
  const thrown = new FakeMcp();
  thrown.sources.set(READ_PATH, "old");
  thrown.mutationError = new Error("transport timed out after send");
  const thrownResult = await new CommandExecutor(thrown, new ToolCatalog(tools)).execute(command("write_script", {
    path: READ_PATH,
    source: "new",
    expectedSourceHash: sha256("old"),
  }));
  assert.equal(errorCode(thrownResult), "APPLY_UNVERIFIED");
  assert.equal(thrownResult.verified, false);
  assert.equal(thrown.calls.filter((call) => call.name === "multi_edit").length, 1);

  const mismatch = new FakeMcp();
  mismatch.sources.set(READ_PATH, "old");
  mismatch.applyMutation = false;
  const mismatchResult = await new CommandExecutor(mismatch, new ToolCatalog(tools)).execute(command("write_script", {
    path: READ_PATH,
    source: "new",
    expectedSourceHash: sha256("old"),
  }));
  assert.equal(errorCode(mismatchResult), "APPLY_UNVERIFIED");
  assert.equal(mismatchResult.verified, false);
  assert.deepEqual(mismatch.calls.map((call) => call.name), ["script_read", "multi_edit", "script_read"]);
});

test("tool output is bounded before it is acknowledged", async () => {
  const mcp = new FakeMcp();
  mcp.consoleText = "x".repeat(300_000);
  const result = await new CommandExecutor(mcp, new ToolCatalog(tools)).execute(command("collect_output", {}));
  assert.equal(result.success, true);
  assert.equal(typeof result.output, "string");
  assert.equal((result.output as string).endsWith("…[truncated]"), true);
  assert.equal((result.output as string).length < 300_000, true);
});

test("multi-script results fail locally when the acknowledgement would exceed the backend limit", async () => {
  const mcp = new FakeMcp();
  const first = "game.ServerScriptService.First";
  const second = "game.ServerScriptService.Second";
  mcp.sources.set(first, "a".repeat(800_000));
  mcp.sources.set(second, "b".repeat(800_000));

  const result = await new CommandExecutor(mcp, new ToolCatalog(tools)).execute(command("read_scripts", {
    paths: [first, second],
  }));

  assert.equal(result.success, false);
  assert.equal(errorCode(result), "COMMAND_RESULT_TOO_LARGE");
  assert.equal(Buffer.byteLength(JSON.stringify(result), "utf8") < 10_000, true);
});
