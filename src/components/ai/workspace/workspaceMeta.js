// Shared display metadata for the code-first workspace.
import { Server, Code2, Package, Layout, Settings2, FileText, FileCode } from "lucide-react";
import { ROBLOX_PLACEMENTS } from "../../../lib/normalizeArtifact";

export const KIND_META = {
  server: { label: "Server", icon: Server, accent: "#f15bb5" },
  client: { label: "Client", icon: Code2, accent: "#00f5d4" },
  module: { label: "Module", icon: Package, accent: "#9b5de5" },
  ui: { label: "UI", icon: Layout, accent: "#00bbf9" },
  config: { label: "Config", icon: Settings2, accent: "#fee440" },
  docs: { label: "Docs", icon: FileText, accent: "#9ca3af" },
};

export function kindMeta(kind) {
  return KIND_META[String(kind || "").toLowerCase()] || { label: "File", icon: FileCode, accent: "#9b5de5" };
}

export const STATUS_META = {
  writing: { label: "Writing", color: "#00bbf9", dot: "#00bbf9" },
  reviewing: { label: "Reviewing", color: "#fee440", dot: "#fee440" },
  generating: { label: "Generating", color: "#00bbf9", dot: "#00bbf9" },
  ready: { label: "Ready", color: "#00f5d4", dot: "#00f5d4" },
  saved: { label: "Saved", color: "#9b5de5", dot: "#9b5de5" },
  generated: { label: "Generated", color: "#9ca3af", dot: "#6b7280" },
  edited: { label: "Edited", color: "#fee440", dot: "#fee440" },
  validated: { label: "Validated", color: "#00f5d4", dot: "#00f5d4" },
  warning: { label: "Warning", color: "#fbbf24", dot: "#fbbf24" },
  error: { label: "Error", color: "#ff6b6b", dot: "#ff6b6b" },
};

export function statusMeta(status) {
  return STATUS_META[String(status || "").toLowerCase()] || STATUS_META.generated;
}

export { ROBLOX_PLACEMENTS };
