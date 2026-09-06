import type { CompanionSnapshot, DegradedReason } from "./contracts.js";

const degradedMessages: Partial<Record<Exclude<DegradedReason, null>, string>> = {
  mcp_transport_lost: "The Studio MCP connection was interrupted. NexusRBX will try to reconnect.",
  multiple_studio_windows: "Select the intended open Studio target in the NexusRBX connection panel.",
  target_place_unavailable: "Open the Studio experience you want NexusRBX to use.",
  zero_supported_tools: "Studio MCP responded, but it is not attached with usable tools.",
  cloud_loss: "The local connector is running, but NexusRBX Cloud is unavailable.",
};

/** Resolves terminal discovery state from the latest health and capability telemetry. */
export function completedConnectionPatch(snapshot: CompanionSnapshot): Partial<CompanionSnapshot> | null {
  if (snapshot.connectionFailure) return null;
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

export function connectionFailureCopy(snapshot: CompanionSnapshot): { title: string; message: string; steps: string[] } {
  const failure = snapshot.connectionFailure;
  if (failure?.code === "MCP_PORT_CONFLICT") return {
    title: "Another app is blocking Studio MCP",
    message: failure.diagnostic,
    steps: ["Close the conflicting app's Studio integration", "Leave Roblox Studio open", "Click Try Again to reconnect"],
  };
  if (failure?.code === "MCP_CLIENT_OUTDATED") return {
    title: "Restart or update Roblox Studio",
    message: "Roblox reports that its MCP client proxy is out of date. Your sign-in is retained.",
    steps: ["Save your experience and fully quit Studio", "Reopen Studio and finish any update", "Reopen your experience, then try again"],
  };
  if (failure?.stage === "cloud_registration") return {
    title: "NexusRBX Cloud connection failed",
    message: "The connector could not register with NexusRBX Cloud. Check your connection, then try again.",
    steps: ["Check your internet connection", "Try connecting again"],
  };
  if (snapshot.state === "studio_not_installed") return {
    title: "Studio MCP was not found",
    message: "Install or update Roblox Studio, then enable Studio as an MCP server.",
    steps: ["Install or update Roblox Studio", "Open your experience", "Enable Studio as an MCP server"],
  };
  if (failure?.code === "MCP_STUDIO_NOT_ATTACHED") return {
    title: "Studio MCP not attached",
    message: "The MCP helper is running, but no usable Studio window is attached.",
    steps: ["Open the experience you want to edit", "Enable Studio as an MCP server", "Try connecting again"],
  };
  return {
    title: "Studio MCP connection failed",
    message: "Roblox Studio could not complete the MCP connection. Try again, or open Diagnostics for the specific error.",
    steps: ["Open your experience with Studio MCP enabled", "Try again or copy diagnostics from Settings"],
  };
}
