import React from "react";
import { ShieldAlert } from "lib/icons";

const TARGET_CODES = new Set([
  "STUDIO_TARGET_SELECTION_REQUIRED",
  "STUDIO_TARGET_SELECTION_CONFLICT",
  "STUDIO_TARGET_MISMATCH",
  "STUDIO_TARGET_CHANGED",
  "STUDIO_TARGET_STALE",
  "STUDIO_TARGET_PLACE_UNAVAILABLE",
  "MCP_PLACE_MISMATCH",
]);
const PLUGIN_CODES = new Set([
  "PLUGIN_BUILD_UNVERIFIED",
  "PLUGIN_COMMAND_UNSUPPORTED",
  "PLUGIN_PROTOCOL_OUTDATED",
  "PLUGIN_UPDATE_REQUIRED",
  "STUDIO_PLUGIN_UPDATE_REQUIRED",
]);
const PATH_CODES = new Set(["INVALID_STUDIO_PATH", "STUDIO_PATH_INVALID", "STUDIO_INVALID_PATH"]);
const MANIFEST_CODES = new Set(["MANIFEST_CONFLICTED", "MANIFEST_REPEATED_CURSOR"]);

function readError(value = {}) {
  const error = value?.error && typeof value.error === "object" ? value.error : {};
  const details = value?.errorDetails || value?.details || error?.details || error?.errorDetails || {};
  return {
    code: String(value?.errorCode || value?.code || error?.errorCode || error?.code || value?.failureCode || "").trim().toUpperCase(),
    details: details && typeof details === "object" && !Array.isArray(details) ? details : {},
    recovery: value?.recovery || value?.remediation || error?.recovery || error?.remediation || "",
  };
}

export function getStudioRunBlock(value = {}) {
  const { code, details, recovery } = readError(value);
  const fallback = String(value?.fallbackReason || "").toUpperCase();
  const targetSelection = value?.targetSelection || details?.targetSelection || null;
  const pluginFallback = fallback === "MCP_PLACE_MISMATCH"
    && String(value?.executionProvider || "").toLowerCase() === "plugin_bridge";
  const errorText = typeof value?.error === "string"
    ? value.error
    : String(value?.error?.message || value?.summary || "");

  if (pluginFallback) {
    return {
      kind: "mcp-fallback",
      code,
      recovery,
      title: "Continuing through the Studio plugin",
      message: "Local MCP is connected to a different place, so this task is using the compatible Studio plugin instead.",
    };
  }
  const status = String(value?.status || value?.runStatus || "").trim();
  const needsTargetChoice =
    TARGET_CODES.has(code) ||
    fallback === "MCP_PLACE_MISMATCH" ||
    status === "awaiting_studio_target" ||
    (status === "blocked" && Array.isArray(targetSelection?.options));
  if (needsTargetChoice) {
    const isMismatch = code === "STUDIO_TARGET_MISMATCH" || code === "MCP_PLACE_MISMATCH" || fallback === "MCP_PLACE_MISMATCH";
    const isStale = code === "STUDIO_TARGET_STALE" || code === "STUDIO_TARGET_CHANGED" || code === "STUDIO_TARGET_SELECTION_CONFLICT";
    return {
      kind: "connection",
      code,
      targetSelection,
      recovery,
      title: "Reconnect Studio to continue",
      message: isMismatch || isStale
        ? "The previous Studio connection is no longer active. Nexus will use your account's paired Studio plugin when you retry."
        : "No active Studio plugin is available for this task. Connect Studio, then retry.",
    };
  }
  if (value?.status === "awaiting_studio_reconnect") {
    return {
      kind: "connection",
      code,
      recovery,
      title: "Reconnect Studio to continue",
      message: "The Studio plugin disconnected. Reconnect it, then retry; Nexus will use that sole live session automatically.",
    };
  }
  if (PLUGIN_CODES.has(code) || value?.status === "awaiting_plugin_update") {
    return {
      kind: "plugin",
      code,
      recovery,
      title: "Update the Studio plugin to continue",
      message: "This plugin build cannot verify that it supports this Studio command. No Studio command was sent.",
    };
  }
  if (PATH_CODES.has(code) || value?.status === "invalid_studio_path") {
    return {
      kind: "path",
      code,
      recovery,
      path: details.canonicalPath || details.path || details.requestedPath || "",
      title: "Studio location needs correction",
      message: "That Studio path is not valid for the selected project. No Studio command was sent.",
    };
  }
  if (
    MANIFEST_CODES.has(code) ||
    value?.manifestConflict ||
    /overlapping[_ ]canonical[_ ]paths|manifest revision .+ conflicted|project index/i.test(errorText)
  ) {
    return {
      kind: "manifest",
      code,
      recovery,
      title: "Refreshing Studio project index",
      message: "Studio's project scan got out of sync. NexusRBX starts a fresh scan automatically so you can keep working.",
    };
  }
  return null;
}

export default function StudioRunBlockNotice({ value, className = "" }) {
  const block = getStudioRunBlock(value);
  if (!block) return null;

  const isConnection = block.kind === "connection";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-xs ${
        isConnection
          ? "border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_10%,transparent)] text-[var(--ds-info)] "
          : " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] "
      } ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 ${isConnection ? "text-[var(--ds-info)]" : "text-[var(--ds-warning)]"}`} />
        <div className="min-w-0">
          <div className="font-semibold">{block.title}</div>
          <p className="mt-0.5 leading-relaxed text-current/80">{block.message}</p>
          {block.kind === "connection" && (
            <p className="mt-1 leading-relaxed text-current/80">
              Open the NexusRBX plugin in Studio and connect it, then retry the task.
            </p>
          )}
          {block.kind === "mcp-fallback" && (
            <p className="mt-1 leading-relaxed text-current/80">To use Local MCP, open the selected place in Local MCP, connect it, then retry.</p>
          )}
          {block.kind === "plugin" && (
            <p className="mt-1 leading-relaxed text-current/80">Reinstall the latest NexusRBXStudioBridge plugin in Studio, reconnect it, then retry.</p>
          )}
          {block.kind === "path" && (
            <p className="mt-1 leading-relaxed text-current/80">Refresh the project manifest, choose a valid instance path, then retry.</p>
          )}
          {block.kind === "manifest" && (
            <p className="mt-1 leading-relaxed text-current/80">You usually do not need to reconnect — wait for the fresh scan, or reconnect Studio only if results still look incomplete.</p>
          )}
          {block.path && <code className="mt-1 block break-all text-[10px] text-current/70">{block.path}</code>}
          {block.recovery && <p className="mt-1 leading-relaxed text-current/80">{block.recovery}</p>}
        </div>
      </div>
    </div>
  );
}
