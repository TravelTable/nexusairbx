import assert from "node:assert/strict";
import test from "node:test";
import { ConnectorError } from "../src/errors.js";
import { FixedRoutineRunner } from "../src/fixed-routines.js";
import type { DiscoveredTool, JsonObject, McpClientLike, McpConnectionInfo, ToolCallResult } from "../src/types.js";

class RoutineMcp implements McpClientLike {
  calls = 0;
  mode: "valid" | "wrong_nonce" | "malformed" = "valid";

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
    const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(code);
    assert.ok(match?.[1]);
    const input = JSON.parse(JSON.parse(match[1])) as { nonce: string; operation: string };
    if (this.mode === "malformed") return { content: [{ type: "text", text: "not-json" }] };
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          version: 1,
          nonce: this.mode === "wrong_nonce" ? "attacker-controlled" : input.nonce,
          ok: true,
          data: { operation: input.operation },
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
  await expectCode(runner.run("run_test_service", { profileId: "browser_luau" }), "TEST_PROFILE_INVALID");
  assert.equal(mcp.calls, 0);
});

test("routine envelopes require valid JSON and the connector nonce", async () => {
  const mcp = new RoutineMcp();
  const runner = new FixedRoutineRunner(mcp);

  mcp.mode = "wrong_nonce";
  await expectCode(runner.run("get_selection", {}), "ROUTINE_ENVELOPE_INVALID");
  mcp.mode = "malformed";
  await expectCode(runner.run("get_selection", {}), "ROUTINE_ENVELOPE_INVALID");

  mcp.mode = "valid";
  assert.deepEqual(await runner.run("get_selection", {}), { operation: "get_selection" });
});
