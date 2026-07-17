import type { CompanionSnapshot } from "../../contracts";

export type MainView = "pairing" | "connecting" | "connected" | "mcp_unavailable" | "degraded";

export function newestSnapshot(current: CompanionSnapshot, incoming: CompanionSnapshot): CompanionSnapshot {
  return incoming.updatedAt > current.updatedAt ? incoming : current;
}

export function getMainView(snapshot: CompanionSnapshot): MainView {
  if (snapshot.state === "awaiting_pairing" || snapshot.state === "connector_offline" || snapshot.state === "stopped" || snapshot.state === "error") return "pairing";
  if (snapshot.state === "ready" && snapshot.cloudHealth === "connected" && snapshot.mcpHealth === "connected" && snapshot.supportedToolCount > 0) return "connected";
  if (snapshot.state === "studio_mcp_unavailable" || snapshot.state === "studio_not_installed" || (snapshot.state === "ready" && snapshot.mcpHealth !== "connected")) return "mcp_unavailable";
  if (snapshot.state === "degraded" || snapshot.state === "ready") return "degraded";
  return "connecting";
}

export function relativeTime(value: number | null, now = Date.now()): string {
  if (!value) return "No recent activity";
  const seconds = Math.max(0, Math.floor((now - value) / 1000));
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}
