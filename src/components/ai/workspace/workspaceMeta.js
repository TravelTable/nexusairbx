// Shared display metadata for the code-first workspace.
import { Server, Code2, Package, Layout, Settings2, FileText, FileCode } from "lib/icons";
import { ROBLOX_PLACEMENTS } from "../../../lib/normalizeArtifact";

export const KIND_META = {
  server: { label: "Server", icon: Server, accent: "var(--ds-info)" },
  client: { label: "Client", icon: Code2, accent: "var(--ds-accent)" },
  module: { label: "Module", icon: Package, accent: "var(--ds-info)" },
  ui: { label: "UI", icon: Layout, accent: "var(--ds-accent)" },
  config: { label: "Config", icon: Settings2, accent: "var(--ds-warning)" },
  docs: { label: "Docs", icon: FileText, accent: "var(--ds-text-secondary)" },
};

export function kindMeta(kind) {
  return KIND_META[String(kind || "").toLowerCase()] || { label: "File", icon: FileCode, accent: "var(--ds-text-secondary)" };
}

export const STATUS_META = {
  writing: { label: "Writing", color: "var(--ds-info)", dot: "var(--ds-info)" },
  reviewing: { label: "Reviewing", color: "var(--ds-warning)", dot: "var(--ds-warning)" },
  generating: { label: "Generating", color: "var(--ds-info)", dot: "var(--ds-info)" },
  ready: { label: "Ready", color: "var(--ds-success)", dot: "var(--ds-success)" },
  saved: { label: "Saved", color: "var(--ds-success)", dot: "var(--ds-success)" },
  generated: { label: "Generated", color: "var(--ds-text-secondary)", dot: "var(--ds-text-muted)" },
  edited: { label: "Edited", color: "var(--ds-warning)", dot: "var(--ds-warning)" },
  validated: { label: "Validated", color: "var(--ds-success)", dot: "var(--ds-success)" },
  warning: { label: "Warning", color: "var(--ds-warning)", dot: "var(--ds-warning)" },
  error: { label: "Error", color: "var(--ds-danger)", dot: "var(--ds-danger)" },
};

export function statusMeta(status) {
  return STATUS_META[String(status || "").toLowerCase()] || STATUS_META.generated;
}

export { ROBLOX_PLACEMENTS };
