import assert from "node:assert/strict";
import test from "node:test";
import { StudioTargetManager } from "../src/studio-targeting.js";
import type { DiscoveredTool, JsonObject, McpClientLike, McpConnectionInfo, StudioCommand, ToolCallResult } from "../src/types.js";

class FakeMcp implements McpClientLike {
  studios: JsonObject[] = [];
  selected = "";
  stateStudioId = "";
  omitStateStudioId = false;
  selectionFails = false;
  calls: Array<{ name: string; args: JsonObject }> = [];

  async connect(): Promise<McpConnectionInfo> { return {}; }
  async disconnect(): Promise<void> {}
  async listTools(): Promise<DiscoveredTool[]> { return []; }
  onToolsChanged(): void {}
  onDisconnect(): void {}
  async callTool(name: string, args: JsonObject): Promise<ToolCallResult> {
    this.calls.push({ name, args });
    if (name === "list_roblox_studios") return { structuredContent: { studios: this.studios } };
    if (name === "set_active_studio") {
      if (this.selectionFails) return { isError: true, content: [{ type: "text", text: "selection failed" }] };
      this.selected = String(args.studio_id || "");
      return { structuredContent: { ok: true } };
    }
    if (name === "get_studio_state") {
      const target = this.studios.find((studio) => studio.studio_id === (this.stateStudioId || this.selected));
      return { structuredContent: { studio_id: this.omitStateStudioId ? undefined : this.stateStudioId || this.selected, place_id: target?.place_id, place_name: target?.place_name, universe_id: target?.universe_id, place_signature: target?.place_signature } };
    }
    throw new Error(`Unexpected tool ${name}`);
  }
}

test("a single open Studio is selected and its place is reported", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();
  assert.equal(manager.activeStudioId, "studio-a");
  assert.equal(manager.placeId, "101");
  assert.equal(manager.placeName, "Arena");
  assert.deepEqual(mcp.calls[1], { name: "set_active_studio", args: { studio_id: "studio-a" } });
});

test("multiple Studios require an enumerated backend choice", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-a", place_name: "Arena" },
    { studio_id: "studio-b", place_name: "Obby" },
  ];
  const manager = new StudioTargetManager(mcp);
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_SELECTION_REQUIRED");
  manager.acceptBackendResponse({ session: { desiredStudioId: "studio-b" } });
  await manager.ensureMutationTarget();
  assert.equal(manager.activeStudioId, "studio-b");
  assert.equal(manager.placeName, "Obby");
});

test("multiple Studios require exact switch confirmation", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a" }, { studio_id: "studio-b" }];
  mcp.omitStateStudioId = true;
  const manager = new StudioTargetManager(mcp);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_ATTESTATION_INCOMPLETE");

  mcp.omitStateStudioId = false;
  mcp.selectionFails = true;
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_UNAVAILABLE");
});

test("a command cannot mutate a different place, universe, signature, or connection type", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", universe_id: "201", place_signature: "sig-a" }];
  const manager = new StudioTargetManager(mcp);
  const base: StudioCommand = { id: "command", type: "create_instance", payload: {}, connectionType: "mcp_local" };

  await manager.ensureMutationTarget({ ...base, expectedPlaceId: "101", expectedUniverseId: "201", expectedPlaceSignature: "sig-a" });
  await assert.rejects(() => manager.ensureMutationTarget({ ...base, expectedPlaceId: "999" }), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");
  await assert.rejects(() => manager.ensureMutationTarget({ ...base, connectionType: "plugin_bridge" }), (error: any) => error?.code === "STUDIO_CONNECTION_TYPE_MISMATCH");
});

test("a mismatched active Studio is refused before mutation", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a" }, { studio_id: "studio-b" }];
  mcp.stateStudioId = "studio-a";
  const manager = new StudioTargetManager(mcp);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");
  assert.equal(manager.activeStudioId, null);
});

test("closing the selected Studio clears stale place identity", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();
  mcp.studios = [];
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_UNAVAILABLE");
  assert.equal(manager.activeStudioId, null);
  assert.equal(manager.placeId, "");
  assert.equal(manager.placeName, "");
});
