import assert from "node:assert/strict";
import test from "node:test";
import { completedConnectionPatch } from "../src/connection-state.js";
import type { CompanionSnapshot } from "../src/contracts.js";

const snapshot = {
  cloudHealth: "connected",
  mcpHealth: "connected",
  runtimeHealth: "connected",
  supportedToolCount: 0,
  degradedReason: "multiple_studio_windows",
} as CompanionSnapshot;

test("completed discovery cannot remain stuck connecting with no runtime tools", () => {
  assert.deepEqual(completedConnectionPatch(snapshot), {
    state: "degraded",
    message: "Close extra Studio windows and keep your target experience open.",
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
