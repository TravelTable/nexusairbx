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
  { name: "list_roblox_studios", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "set_active_studio", inputSchema: { type: "object", properties: { studio_id: { type: "string" } }, required: ["studio_id"] } },
  { name: "get_studio_state", inputSchema: { type: "object", properties: {}, required: [] } },
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
      properties: {
        code: { type: "string" },
        datamodel_type: { type: "string", enum: ["Edit"] },
      },
      required: ["code", "datamodel_type"],
    },
  },
  { name: "get_console_output", inputSchema: { type: "object", properties: {}, required: [] } },
  {
    name: "start_stop_play",
    inputSchema: {
      type: "object",
      properties: { is_start: { type: "boolean" } },
      required: ["is_start"],
    },
  },
];

class FakeMcp implements McpClientLike {
  readonly calls: Array<{ name: string; args: JsonObject }> = [];
  readonly sources = new Map<string, string>();
  mutationError: Error | null = null;
  applyMutation = true;
  malformedRead = false;
  numberedRead = false;
  consoleText = "log";
  studioPlaying = false;
  applyPlayTransition = true;
  routineFailurePath = "";
  routineFailureCode = "ROUTINE_FAILED";
  routineFailureData: JsonObject | undefined;
  createdSourceOverride: string | null = null;
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
      const source = this.sources.get(path) ?? this.sources.get(path.replace(/^game\./, "").replace(/\./g, "/"));
      if (source === undefined) return { isError: true, content: [{ type: "text", text: "script not found" }] };
      if (this.numberedRead) {
        return {
          content: [{
            type: "text",
            text: source.split("\n").map((line, index) => `${String(index + 1).padStart(6, " ")}\u2192${line}`).join("\n"),
          }],
        };
      }
      return { structuredContent: { source } };
    }
    if (name === "multi_edit") {
      if (this.mutationError) throw this.mutationError;
      if (this.applyMutation) this.sources.set(String(args.path), String(args.source));
      return { content: [{ type: "text", text: "edited" }] };
    }
    if (name === "get_console_output") return { content: [{ type: "text", text: this.consoleText }] };
    if (name === "start_stop_play") {
      if (this.applyPlayTransition) this.studioPlaying = args.is_start === true;
      return { content: [{ type: "text", text: "transition requested" }] };
    }
    if (name === "get_studio_state") {
      return { structuredContent: { mode: this.studioPlaying ? "Playing" : "Edit" } };
    }
    if (name === "inspect_instance") {
      const inspection = this.inspections.get(String(args.path));
      if (!inspection) return { isError: true, content: [{ type: "text", text: "instance not found" }] };
      return { structuredContent: { instance: inspection } };
    }
    if (name === "execute_luau") {
      const code = String(args.code || "");
      const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(code);
      assert.ok(match?.[1]);
      const input = JSON.parse(JSON.parse(match[1])) as { nonce: string; operation: string; payload: JsonObject };
      const path = String(input.payload.path || "Workspace/Part");
      if (this.routineFailurePath && path === this.routineFailurePath) {
        return { content: [{ type: "text", text: JSON.stringify({
          version: 1,
          nonce: input.nonce,
          ok: false,
          code: this.routineFailureCode,
          message: "simulated failure",
          ...(this.routineFailureData ? { data: this.routineFailureData } : {}),
        }) }] };
      }
      const resultingHash = input.operation === "delete_instance" ? "missing" : `hash-${input.nonce}`;
      const snapshots = [{ snapshotId: input.nonce, path, preHash: input.operation === "create_script" ? "missing" : "before", postHash: resultingHash }];
      let data: JsonObject;
      if (input.operation === "restore_snapshot") {
        const refs = input.payload.snapshots as JsonObject[];
        for (const ref of refs) if (ref.preHash === "missing") this.sources.delete(String(ref.path));
        data = { restored: refs.map((ref) => ({ path: ref.path, resultingHash: ref.preHash || "before" })), restoredCount: refs.length };
      } else if (input.operation === "record_last_batch") {
        data = { storedCount: (input.payload.snapshots as JsonObject[]).length, pinnedCount: 1 };
      } else if (input.operation === "create_script") {
        this.sources.set(path, this.createdSourceOverride ?? String(input.payload.source || ""));
        data = { instance: { path }, snapshots, resultingHash };
      } else if (input.operation === "delete_instance") {
        data = { snapshots, resultingHash, verified: true };
      } else {
        data = { instance: { path }, snapshots, resultingHash };
      }
      return { content: [{ type: "text", text: JSON.stringify({ version: 1, nonce: input.nonce, ok: true, data }) }] };
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

test("playtest start and stop transitions are verified and a started test always returns to Edit mode", async () => {
  const mcp = new FakeMcp();
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const started = await executor.execute(command("run_play_test", {
    confirmed: true,
    maxDurationSeconds: 1,
  }));
  assert.equal(started.success, true);
  assert.equal(started.enteredPlayMode, true);
  assert.equal(started.cleanupVerified, true);
  assert.equal(mcp.studioPlaying, false);
  assert.deepEqual(
    mcp.calls.filter((call) => call.name === "start_stop_play").map((call) => call.args.is_start),
    [true, false],
  );

  mcp.studioPlaying = true;
  const stopped = await executor.execute(command("stop_play_test", {
    confirmed: true,
    maxDurationSeconds: 1,
  }));
  assert.equal(stopped.success, true);
  assert.equal(stopped.enteredPlayMode, false);
  assert.equal(stopped.cleanupVerified, true);
});

test("stop playtest fails closed when Edit mode is not observed before the deadline", async () => {
  const mcp = new FakeMcp();
  mcp.studioPlaying = true;
  mcp.applyPlayTransition = false;
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("stop_play_test", {
    confirmed: true,
    maxDurationSeconds: 1,
  }));

  assert.equal(result.success, false);
  assert.equal(errorCode(result), "PLAYTEST_TIMEOUT");
  assert.equal(mcp.calls.filter((call) => call.name === "start_stop_play").length, 1);
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

test("decodes the numbered source presentation returned by Roblox Studio MCP", async () => {
  const mcp = new FakeMcp();
  const source = "local value = 1\nprint(\"probe \u2014 ready\", value)\n";
  mcp.sources.set(READ_PATH, source);
  mcp.numberedRead = true;
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const read = await executor.execute(command("read_script", { path: READ_PATH }));
  assert.equal(read.success, true);
  assert.equal(read.source, source);

  const createdPath = "ServerScriptService/NumberedReadback";
  const created = await executor.execute(command("create_script", { path: createdPath, className: "Script", source }));
  assert.equal(created.success, true);
  assert.equal(created.verified, true);
  assert.equal(mcp.sources.get(createdPath), source);
});

test("snapshot-safe batches persist an undo receipt and reject overlapping paths before Studio", async () => {
  const mcp = new FakeMcp();
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const completed = await executor.execute(command("batch_operations", {
    atomic: true,
    operations: [
      { type: "create_instance", payload: { path: "Workspace/One", className: "Part" } },
      { type: "create_instance", payload: { path: "Workspace/Two", className: "Part" } },
    ],
  }));
  assert.equal(completed.success, true);
  assert.equal(completed.verified, true);
  assert.equal((completed.snapshots as JsonObject[]).length, 2);
  assert.equal(mcp.calls.filter((call) => call.name === "execute_luau").length, 3);

  mcp.calls.length = 0;
  const overlap = await executor.execute(command("batch_operations", {
    operations: [
      { type: "update_properties", payload: { path: "Workspace/Same", properties: { Transparency: 0 } } },
      { type: "update_properties", payload: { path: "Workspace/Same", properties: { Transparency: 1 } } },
    ],
  }));
  assert.equal(errorCode(overlap), "BATCH_PATH_OVERLAP");
  assert.equal(mcp.calls.length, 0);
});

test("an atomic batch failure returns a verified rollback receipt instead of swallowing compensation failure", async () => {
  const mcp = new FakeMcp();
  mcp.routineFailurePath = "Workspace/Fail";
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("batch_operations", {
    atomic: true,
    operations: [
      { type: "create_instance", payload: { path: "Workspace/Good", className: "Part" } },
      { type: "create_instance", payload: { path: "Workspace/Fail", className: "Part" } },
    ],
  }));

  assert.equal(result.success, false);
  assert.equal(errorCode(result), "BATCH_ROLLED_BACK");
  assert.equal(mcp.calls.filter((call) => call.name === "execute_luau").length, 3);
});

test("an inner rollback failure can never be converted into BATCH_ROLLED_BACK", async () => {
  const mcp = new FakeMcp();
  mcp.routineFailurePath = "Workspace/Fail";
  mcp.routineFailureCode = "ROLLBACK_FAILED";
  mcp.routineFailureData = {
    snapshots: [{ snapshotId: "failed-operation", path: "Workspace/Fail", preHash: "before", postHash: "uncertain" }],
    rolledBack: false,
    rollbackError: "simulated restore failure",
  };
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));

  const result = await executor.execute(command("batch_operations", {
    atomic: true,
    operations: [
      { type: "create_instance", payload: { path: "Workspace/Good", className: "Part" } },
      { type: "create_instance", payload: { path: "Workspace/Fail", className: "Part" } },
    ],
  }));

  assert.equal(result.success, false);
  assert.equal(errorCode(result), "BATCH_ROLLBACK_FAILED");
  const details = (result.error as JsonObject).details as JsonObject;
  assert.equal(details.causeCode, "ROLLBACK_FAILED");
  assert.equal((details.failedOperationSnapshots as JsonObject[])[0]?.snapshotId, "failed-operation");
  assert.equal(mcp.calls.filter((call) => call.name === "execute_luau").length, 3);
});

test("create_script rolls back its snapshot when exact post-read verification fails", async () => {
  const mcp = new FakeMcp();
  mcp.createdSourceOverride = "wrong source";
  const executor = new CommandExecutor(mcp, new ToolCatalog(tools));
  const path = "ServerScriptService/NewScript";

  const result = await executor.execute(command("create_script", { path, className: "ModuleScript", source: "return true" }));

  assert.equal(result.success, false);
  assert.equal(errorCode(result), "APPLY_ROLLED_BACK");
  assert.equal(mcp.sources.has(path), false);
  assert.deepEqual(mcp.calls.map((call) => call.name), ["script_read", "execute_luau", "script_read", "execute_luau"]);
});

test("Creator Store insertion rejects connector-owned destinations before any MCP call", async () => {
  const insertAsset: DiscoveredTool = {
    name: "insert_asset",
    inputSchema: {
      type: "object",
      properties: { asset_id: { type: "string" }, parent_path: { type: "string" } },
      required: ["asset_id"],
    },
  };
  const mcp = new FakeMcp();
  const executor = new CommandExecutor(mcp, new ToolCatalog([...tools, insertAsset]));
  const destinations = [
    "ServerStorage/NexusMCPSnapshots",
    "game/ServerStorage/NexusMCPState/Child",
    "ServerStorage/NexusMCPReceipts",
    "ServerStorage/NexusMCPQuarantine",
    "ServerStorage/NexusMCPQuarantine/nonce",
  ];

  for (const targetParentPath of destinations) {
    const result = await executor.execute(command("insert_creator_store_asset", {
      assetId: "12345",
      targetParentPath,
    }));
    assert.equal(errorCode(result), "DESTINATION_NOT_ALLOWED");
  }
  assert.equal(mcp.calls.length, 0);
});
