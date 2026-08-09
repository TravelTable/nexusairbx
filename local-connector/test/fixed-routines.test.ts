import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ConnectorError } from "../src/errors.js";
import { FixedRoutineRunner } from "../src/fixed-routines.js";
import type { DiscoveredTool, JsonObject, McpClientLike, McpConnectionInfo, ToolCallResult } from "../src/types.js";

class RoutineMcp implements McpClientLike {
  calls = 0;
  lastCode = "";
  mode: "valid" | "wrong_nonce" | "malformed" | "empty_success" = "valid";

  async connect(): Promise<McpConnectionInfo> { return {}; }
  async disconnect(): Promise<void> {}
  async listTools(): Promise<DiscoveredTool[]> { return []; }
  onToolsChanged(): void {}
  onDisconnect(): void {}

  async callTool(name: string, args: JsonObject): Promise<ToolCallResult> {
    this.calls += 1;
    assert.equal(name, "execute_luau");
    assert.equal(args.datamodel_type, "Edit");
    const code = String(args.code || "");
    this.lastCode = code;
    const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(code);
    assert.ok(match?.[1]);
    const input = JSON.parse(JSON.parse(match[1])) as { nonce: string; operation: string; payload: JsonObject };
    if (this.mode === "malformed") return { content: [{ type: "text", text: "not-json" }] };
    const snapshot = { snapshotId: "snapshot-1", path: "Workspace/Part", preHash: "before", postHash: "after" };
    const validData: Record<string, JsonObject> = {
      get_selection: { instances: [] },
      create_snapshot: { snapshots: [snapshot], snapshotCount: 1 },
      restore_snapshot: { restored: [{ path: "Workspace/Part", resultingHash: "before" }], restoredCount: 1 },
      undo_last_batch: { restored: [{ path: "Workspace/Part", resultingHash: "before" }], restoredCount: 1, lastBatchCleared: true },
      record_last_batch: { storedCount: 1, pinnedCount: 1 },
      delete_instance: { snapshots: [{ ...snapshot, postHash: "missing" }], resultingHash: "missing", verified: true },
      duplicate_instance: { instance: { path: "Workspace/Copy" }, snapshots: [snapshot], resultingHash: "after" },
    };
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          version: 1,
          nonce: this.mode === "wrong_nonce" ? "attacker-controlled" : input.nonce,
          ok: true,
          data: this.mode === "empty_success" ? {} : validData[input.operation] || { operation: input.operation },
        }),
      }],
    };
  }
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => error instanceof ConnectorError && error.code === code);
}

test("fixed routines reject executable, malicious, and oversized inputs before Studio", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  await expectCode(runner.run("create_instance", { path: "Workspace/Safe", className: "Part", code: "return game" }), "EXECUTABLE_INPUT_FORBIDDEN");
  await expectCode(runner.run("create_instance", { path: "Workspace/../ServerStorage", className: "Part" }), "PATH_INVALID");
  await expectCode(runner.run("rename_instance", { path: "Workspace/Safe", newName: "Bad/Name" }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("update_properties", { path: "Workspace/Safe", properties: { Parent: "Workspace" } }), "FIELD_NOT_ALLOWED");
  await expectCode(runner.run("create_script", { path: "ServerScriptService/Huge", source: "x".repeat(256_001) }), "COMMAND_PAYLOAD_TOO_LARGE");
  assert.equal(mcp.calls, 0);
});

test("snapshot references and named TestService profiles are fail-closed", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  await expectCode(runner.run("restore_snapshot", { snapshots: [{ snapshotId: "bad id", path: "Workspace/Part" }] }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("create_snapshot", {}), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("restore_snapshot", {}), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("undo_last_batch", { snapshots: [{ snapshotId: "snapshot-1", path: "Workspace/Part" }] }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("run_test_service", { profileId: "browser_luau" }), "TEST_PROFILE_INVALID");
  assert.equal(mcp.calls, 0);
});

test("snapshot and restore inputs reject ancestor-descendant overlap before Studio", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  await expectCode(runner.run("create_snapshot", {
    paths: ["Workspace/Folder", "game/Workspace/Folder/Child"],
  }), "SNAPSHOT_PATH_OVERLAP");
  await expectCode(runner.run("restore_snapshot", {
    snapshots: [
      { snapshotId: "parent", path: "Workspace/Folder", preHash: "a", postHash: "b" },
      { snapshotId: "child", path: "game/Workspace/Folder/Child", preHash: "c", postHash: "d" },
    ],
  }), "SNAPSHOT_PATH_OVERLAP");
  assert.equal(mcp.calls, 0);
});

test("asset finalization rejects every connector-owned ServerStorage tree before Studio", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);
  const internalDestinations = [
    "ServerStorage/NexusMCPSnapshots",
    "game/ServerStorage/NexusMCPState/Child",
    "ServerStorage/NexusMCPReceipts",
    "ServerStorage/NexusMCPQuarantine",
    "ServerStorage/NexusMCPQuarantine/nonce",
  ];

  for (const targetParentPath of internalDestinations) {
    await expectCode(runner.run("finalize_asset_quarantine", {
      quarantinePath: "ServerStorage/NexusMCPQuarantine/nonce",
      targetParentPath,
    }), "DESTINATION_NOT_ALLOWED");
  }
  assert.equal(mcp.calls, 0);
});

test("mutations reject unsafe implicit parents and operation-specific omissions before Studio", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  await expectCode(runner.run("create_instance", { path: "Workspace/Parent/Part", className: "Part", createParents: true }), "CREATE_PARENTS_UNSUPPORTED");
  await expectCode(runner.run("delete_instance", {}), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("rename_instance", { path: "Workspace/Part" }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("move_instance", { path: "Workspace/Part" }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("update_tags", { path: "Workspace/Part", tags: ["Ignored"] }), "COMMAND_PAYLOAD_INVALID");
  await expectCode(runner.run("duplicate_instance", { path: "Workspace/Source", newPath: "Workspace/Source/Nested/Copy" }), "DESTINATION_INVALID");
  await expectCode(runner.run("move_instance", {
    path: "Workspace/Source",
    newParentPath: "game/ServerStorage/NexusMCPSnapshots",
  }), "DESTINATION_NOT_ALLOWED");
  assert.equal(mcp.calls, 0);
});

test("the audited routine guards duplicate self-descendants and pins last-batch snapshots", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  await runner.run("duplicate_instance", { path: "Workspace/Source", newPath: "Workspace/Copy" });
  assert.match(mcp.lastCode, /parent == inst or parent:IsDescendantOf\(inst\)/);
  assert.match(mcp.lastCode, /PinnedLastBatch/);
  assert.match(mcp.lastCode, /while #children > 100/);
  assert.match(mcp.lastCode, /DateTime\.now\(\)\.UnixTimestampMillis/);
});

test("snapshot conflict hashes cover every mutable property with deterministic serialization", () => {
  const source = readFileSync(new URL("../src/fixed-routines.ts", import.meta.url), "utf8");
  const safeBlock = /const SAFE_PROPERTIES = new Set\(\[([\s\S]*?)\]\);/.exec(source)?.[1];
  const hashBlock = /local HASH_PROPERTIES = \{([\s\S]*?)\n\}/.exec(source)?.[1];
  assert.ok(safeBlock, "SAFE_PROPERTIES must remain discoverable by the parity gate");
  assert.ok(hashBlock, "HASH_PROPERTIES must remain discoverable by the parity gate");
  const quoted = (value: string) => [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1]).sort();
  assert.deepEqual(quoted(hashBlock), quoted(safeBlock));
  assert.match(source, /string\.format\("%\.17g", number\)/);
  assert.match(source, /local text = HttpService:JSONEncode\(chunks\)/);
  assert.match(source, /if kind == "CFrame" then local values = \{ value:GetComponents\(\) \}/);
});

test("deterministic destination failures happen before snapshots and untouched races skip rollback", () => {
  const source = readFileSync(new URL("../src/fixed-routines.ts", import.meta.url), "utf8");
  const mutation = source.slice(source.indexOf("local snapshotPaths, context = {}, {}"));
  const snapshot = mutation.indexOf("local refs = createSnapshots(snapshotPaths, nonce)");
  assert.ok(snapshot > 0, "mutation snapshot boundary must exist");
  for (const marker of [
    "TARGET_EXISTS: destination already exists",
    "TARGET_EXISTS: sibling already uses the requested name",
    "TARGET_EXISTS: duplicate destination already exists",
    "DESTINATION_NOT_ALLOWED: connector-owned mutation destination",
    "DESTINATION_INVALID: cannot move an instance into itself",
    "DESTINATION_INVALID: cannot duplicate an instance into its own tree",
  ]) {
    const index = mutation.indexOf(marker);
    assert.ok(index >= 0 && index < snapshot, `${marker} must be checked before snapshots`);
  }
  assert.match(mutation, /if not ok and not mutationStarted then\s+removeSnapshot\(nonce\)/);
  assert.match(mutation, /code = "MUTATION_NOT_APPLIED"/);
});

test("operation-specific result checks reject empty success envelopes", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);
  mcp.mode = "empty_success";

  await expectCode(runner.run("create_snapshot", { paths: ["Workspace/Part"] }), "ROUTINE_RESULT_INVALID");
  await expectCode(runner.run("restore_snapshot", { snapshots: [{ snapshotId: "snapshot-1", path: "Workspace/Part", preHash: "before", postHash: "after" }] }), "ROUTINE_RESULT_INVALID");
  await expectCode(runner.run("undo_last_batch", {}), "ROUTINE_RESULT_INVALID");
  await expectCode(runner.run("delete_instance", { path: "Workspace/Part" }), "ROUTINE_RESULT_INVALID");
});

test("routine envelopes require valid JSON and the connector nonce", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  mcp.mode = "wrong_nonce";
  await expectCode(runner.run("get_selection", {}), "ROUTINE_ENVELOPE_INVALID");
  mcp.mode = "malformed";
  await expectCode(runner.run("get_selection", {}), "ROUTINE_ENVELOPE_INVALID");

  mcp.mode = "valid";
  assert.deepEqual(await runner.run("get_selection", {}), { instances: [] });
});
