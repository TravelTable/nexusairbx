import assert from "node:assert/strict";
import test from "node:test";
import { completedConnectionPatch, connectionFailureCopy } from "../src/connection-state.js";
import type { CompanionSnapshot } from "../src/contracts.js";

const snapshot = {
  cloudHealth: "connected",
  mcpHealth: "connected",
  runtimeHealth: "connected",
  supportedToolCount: 0,
  degradedReason: "multiple_studio_windows",
} as CompanionSnapshot;

test("failure screen distinguishes outdated proxy, cloud failure, missing Studio and no attached window", () => {
  for (const [code, stage, title] of [
    ["MCP_CLIENT_OUTDATED", "studio_target", "Restart or update Roblox Studio"],
    ["MCP_PORT_CONFLICT", "mcp", "Another app is blocking Studio MCP"],
    ["BACKEND_TEMPORARY", "cloud_registration", "NexusRBX Cloud connection failed"],
    ["MCP_STUDIO_NOT_ATTACHED", "tool_discovery", "Studio MCP not attached"],
  ] as const) {
    const failed = { ...snapshot, connectionFailure: { code, stage, diagnostic: "failure" } };
    assert.equal(connectionFailureCopy(failed).title, title);
    assert.equal(completedConnectionPatch({ ...failed, supportedToolCount: 30 }), null);
  }
  assert.equal(connectionFailureCopy({ ...snapshot, state: "studio_not_installed" }).title, "Studio MCP was not found");
});

test("port conflicts display the blocking app and preserve recovery controls", () => {
  const failure = { code: "MCP_PORT_CONFLICT", stage: "mcp" as const, diagnostic: "Ropilot is using Roblox Studio's MCP port 13469. Close its Studio integration, then try again." };
  const copy = connectionFailureCopy({ ...snapshot, connectionFailure: failure });
  assert.match(copy.message, /Ropilot/);
  assert.ok(copy.steps.includes("Leave Roblox Studio open"));
  assert.match(copy.steps.join(" "), /Try Again/);
});

test("completed discovery cannot remain stuck connecting with no runtime tools", () => {
  assert.deepEqual(completedConnectionPatch(snapshot), {
    state: "degraded",
    message: "Select the intended open Studio target in the NexusRBX connection panel.",
    degradedReason: "multiple_studio_windows",
    runtimeHealth: "connected",
    connectionStage: null,
  });
});

test("later capability telemetry automatically promotes the connector to ready", () => {
  assert.deepEqual(completedConnectionPatch({ ...snapshot, supportedToolCount: 3 }), {
    state: "ready",
    message: "NexusRBX Cloud and Studio MCP are connected.",
    degradedReason: null,
    runtimeHealth: "connected",
    connectionStage: null,
  });
});
