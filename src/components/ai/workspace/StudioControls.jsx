import React from "react";
import { Radio, Loader2 } from "lib/icons";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  setStudioApplyMode,
  setStudioEnabledPreference,
} from "../../../lib/agentSteps";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import { resolveStudioControlAccess } from "./studioControlAccess";

/**
 * Studio connection pill + capability toggle for the unified agent composer.
 */
export default function StudioControls({
  connected = false,
  connectionType = null,
  connectionState = null,
  capabilities = null,
  loading = false,
  studioEnabled,
  onStudioEnabledChange,
  applyMode,
  onApplyModeChange,
  autoPushEnabled = false,
  onAutoPushEnabledChange,
  autoPushPolicy = "after_validation",
  onAutoPushPolicyChange,
  autoPushAuthorized = false,
}) {
  if (!FEATURE_FLAGS.unifiedAgent) return null;

  const enabled = studioEnabled ?? getStudioEnabledPreference();
  const mode = applyMode ?? getStudioApplyMode();
  const access = resolveStudioControlAccess({
    connected,
    connectionType,
    connectionState,
    capabilities,
  });
  const effectiveEnabled = Boolean(enabled && access.canUseAgent);
  const statusAvailable = Boolean(connected && access.canUseAgent);
  const statusDegraded = connectionState === "degraded" || (connected && !access.canUseAgent);
  const liveStudioTitle = !connected
    ? access.statusTitle
    : access.canUseAgent
      ? `Allow the agent to use the detected ${access.connectionType === "mcp_local" ? "MCP" : "plugin"} Studio tools`
      : "No Studio tools were discovered for the selected MCP session";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
          statusAvailable
            ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]"
            : statusDegraded
              ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
            : "border-white/10 bg-white/5 text-gray-500"
        }`}
        title={access.statusTitle}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
        {access.statusLabel}
      </span>

      {access.capabilityLabel && (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
            access.canUseAgent
              ? "border-[#00bbf9]/25 bg-[#00bbf9]/10 text-[#8bdcf8]"
              : "border-amber-400/25 bg-amber-400/10 text-amber-300"
          }`}
          title={access.supportedCapabilities.length
            ? `Detected tools: ${access.supportedCapabilities.join(", ")}`
            : access.statusTitle}
        >
          {access.capabilityLabel}
        </span>
      )}

      <label
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
        title={liveStudioTitle}
      >
        <input
          type="checkbox"
          checked={effectiveEnabled}
          onChange={(e) => {
            setStudioEnabledPreference(e.target.checked);
            onStudioEnabledChange?.(e.target.checked);
          }}
          className="accent-[#00f5d4]"
          disabled={!connected || !access.canUseAgent}
        />
        Live Studio
      </label>

      {effectiveEnabled && connected && (
        <>
          {access.canMutate && (
            <select
              value={mode}
              onChange={(e) => {
                setStudioApplyMode(e.target.value);
                onApplyModeChange?.(e.target.value);
              }}
              className="h-[26px] rounded-lg border border-white/10 bg-black/30 px-2 text-[9px] font-black uppercase tracking-widest text-gray-300 outline-none"
              title="How mutating Studio tool steps are approved"
            >
              <option value="manual_review">Manual Review</option>
              <option value="auto_after_approval">Auto Queue</option>
              <option value="unrestricted_dev">Dev Override</option>
            </select>
          )}

          {access.canAutoPush ? (
            <>
              <label
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
                title={autoPushAuthorized ? "Automatically push the validated managed artifact into Studio" : "Auto Push unlocks after this live plugin session is paired and authorized"}
              >
                <input
                  type="checkbox"
                  checked={Boolean(autoPushEnabled && autoPushAuthorized)}
                  onChange={(e) => onAutoPushEnabledChange?.(e.target.checked)}
                  className="accent-[#00f5d4]"
                  disabled={!autoPushAuthorized}
                />
                Auto Push
              </label>

              <select
                value={autoPushPolicy}
                onChange={(e) => onAutoPushPolicyChange?.(e.target.value)}
                className="h-[26px] rounded-lg border border-white/10 bg-black/30 px-2 text-[9px] font-black uppercase tracking-widest text-gray-300 outline-none"
                title="When a validated managed artifact is allowed to mutate Studio"
                disabled={!autoPushAuthorized || !autoPushEnabled}
              >
                <option value="after_validation">After Validation</option>
                <option value="after_playtest">After Playtest</option>
                <option value="manual_only">Manual Only</option>
              </select>
            </>
          ) : (
            <span
              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500"
              title="Managed artifact Auto Push uses the NexusRBX Studio plugin and is not provided by generic MCP mutation tools"
            >
              Auto Push · Plugin only
            </span>
          )}
        </>
      )}
    </div>
  );
}
