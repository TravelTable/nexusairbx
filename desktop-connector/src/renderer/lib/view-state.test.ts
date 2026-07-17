import { describe, expect, it } from "vitest";
import type { CompanionSnapshot } from "../../contracts";
import { getMainView, newestSnapshot, relativeTime } from "./view-state";

const base: CompanionSnapshot = {
  state: "connecting",
  message: "Connecting",
  updatedAt: 0,
  autoStart: false,
  updateState: "idle",
  preferences: { autoStart: false, minimizeToTray: true, startMinimized: false, theme: "dark", autoReconnect: true, reconnectDelayMs: 2_000, automaticUpdates: true },
  cloudHealth: "connected",
  runtimeHealth: "connected",
  mcpHealth: "connected",
  connectionStage: "tool_discovery",
  degradedReason: null,
  pairingError: null,
  experienceName: null,
  supportedToolCount: 1,
  supportedTools: ["get_studio_state"],
  lastActivityAt: null,
  lastHeartbeatAt: null,
  connectorVersion: "test",
  mcpServerVersion: null,
  lastCommand: null,
};

describe("connector view mapping", () => {
  it("never renders Connected until cloud, MCP, and at least one tool are ready", () => {
    expect(getMainView({ ...base, state: "ready", cloudHealth: "warning" })).toBe("degraded");
    expect(getMainView({ ...base, state: "ready", mcpHealth: "warning" })).toBe("mcp_unavailable");
    expect(getMainView({ ...base, state: "ready", supportedToolCount: 0 })).toBe("degraded");
    expect(getMainView({ ...base, state: "ready" })).toBe("connected");
  });

  it("keeps pairing and connecting distinct", () => {
    expect(getMainView({ ...base, state: "awaiting_pairing" })).toBe("pairing");
    expect(getMainView(base)).toBe("connecting");
  });
});

describe("relative activity", () => {
  it("uses compact, readable time labels", () => {
    expect(relativeTime(null, 10_000)).toBe("No recent activity");
    expect(relativeTime(8_000, 10_000)).toBe("Just now");
    expect(relativeTime(60_000, 130_000)).toBe("1 min ago");
  });
});

describe("snapshot ordering", () => {
  it("rejects a delayed initial snapshot", () => {
    const current = { ...base, updatedAt: 20, connectionStage: "tool_discovery" as const };
    const delayed = { ...base, updatedAt: 10, connectionStage: "runtime" as const };
    expect(newestSnapshot(current, delayed)).toBe(current);
    expect(newestSnapshot(delayed, current)).toBe(current);
  });

  it("keeps the current snapshot when an equal revision arrives", () => {
    const current = { ...base, updatedAt: 20, connectionStage: "tool_discovery" as const };
    const duplicate = { ...base, updatedAt: 20, connectionStage: "runtime" as const };
    expect(newestSnapshot(current, duplicate)).toBe(current);
  });
});
