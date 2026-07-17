import React from "react";
import { MapPin, ShieldAlert } from "lib/icons";

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

function readError(value = {}) {
  const error = value?.error && typeof value.error === "object" ? value.error : {};
  const details = value?.errorDetails || value?.details || error?.details || error?.errorDetails || {};
  return {
    code: String(value?.errorCode || value?.code || error?.errorCode || error?.code || "").trim().toUpperCase(),
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

  if (pluginFallback) {
    return {
      kind: "mcp-fallback",
      code,
      recovery,
      title: "Continuing through the Studio plugin",
      message: "Local MCP is connected to a different place, so this task is using the compatible Studio plugin instead.",
    };
  }
  if (
    TARGET_CODES.has(code) ||
    fallback === "MCP_PLACE_MISMATCH" ||
    value?.status === "awaiting_studio_target" ||
    (value?.status === "blocked" && Array.isArray(targetSelection?.options))
  ) {
    return {
      kind: "target",
      code,
      targetSelection,
      recovery,
      title: "Studio target needs your confirmation",
      message: "The selected Studio connection does not match this project. No Studio command was sent.",
    };
  }
  if (PLUGIN_CODES.has(code) || value?.status === "awaiting_plugin_update" || value?.status === "awaiting_studio_reconnect") {
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
  return null;
}

export default function StudioRunBlockNotice({ value, className = "" }) {
  const block = getStudioRunBlock(value);
  if (!block) return null;

  const isTarget = block.kind === "target";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-xs ${
        isTarget
          ? "border-[#00bbf9]/25 bg-[#00bbf9]/[0.07] text-blue-100"
          : "border-amber-400/25 bg-amber-400/10 text-amber-100"
      } ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        {isTarget ? <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7ddcff]" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
        <div className="min-w-0">
          <div className="font-semibold">{block.title}</div>
          <p className="mt-0.5 leading-relaxed text-current/80">{block.message}</p>
          {block.kind === "target" && (
            <p className="mt-1 leading-relaxed text-current/80">Choose the intended Studio project in the task controls, then retry the task.</p>
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
          {block.path && <code className="mt-1 block break-all text-[10px] text-current/70">{block.path}</code>}
          {block.recovery && <p className="mt-1 leading-relaxed text-current/80">{block.recovery}</p>}
        </div>
      </div>
    </div>
  );
}
