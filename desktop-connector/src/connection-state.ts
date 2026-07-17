import type { CompanionSnapshot, DegradedReason } from "./contracts.js";

const degradedMessages: Partial<Record<Exclude<DegradedReason, null>, string>> = {
  multiple_studio_windows: "Close extra Studio windows and keep your target experience open.",
  target_place_unavailable: "Open the Studio experience you want NexusRBX to use.",
  zero_supported_tools: "Studio MCP connected, but no supported tools were found.",
  cloud_loss: "The local connector is running, but NexusRBX Cloud is unavailable.",
};

/** Resolves terminal discovery state from the latest health and capability telemetry. */
export function completedConnectionPatch(snapshot: CompanionSnapshot): Partial<CompanionSnapshot> | null {
  if (snapshot.mcpHealth !== "connected") return null;
  if (snapshot.cloudHealth !== "connected") {
    return {
      state: "degraded",
      message: degradedMessages.cloud_loss!,
      degradedReason: "cloud_loss",
      runtimeHealth: "connected",
      connectionStage: null,
    };
  }
  if (snapshot.supportedToolCount > 0) {
    return {
      state: "ready",
      message: "NexusRBX Cloud and Studio MCP are connected.",
      degradedReason: null,
      runtimeHealth: "connected",
      connectionStage: null,
    };
  }
  const reason = snapshot.degradedReason === "multiple_studio_windows" || snapshot.degradedReason === "target_place_unavailable"
    ? snapshot.degradedReason
    : "zero_supported_tools";
  return {
    state: "degraded",
    message: degradedMessages[reason]!,
    degradedReason: reason,
    runtimeHealth: "connected",
    connectionStage: null,
  };
}
