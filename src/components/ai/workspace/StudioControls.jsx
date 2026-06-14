import React from "react";
import { Radio, Loader2 } from "lucide-react";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  setStudioApplyMode,
  setStudioEnabledPreference,
} from "../../../lib/agentSteps";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";

/**
 * Studio connection pill + capability toggle for the unified agent composer.
 */
export default function StudioControls({
  connected = false,
  loading = false,
  studioEnabled,
  onStudioEnabledChange,
  applyMode,
  onApplyModeChange,
}) {
  if (!FEATURE_FLAGS.unifiedAgent) return null;

  const enabled = studioEnabled ?? getStudioEnabledPreference();
  const mode = applyMode ?? getStudioApplyMode();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
          connected
            ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]"
            : "border-white/10 bg-white/5 text-gray-500"
        }`}
        title={connected ? "Roblox Studio is paired and connected" : "Pair Studio via Export bar or plugin"}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
        {connected ? "Studio" : "Offline"}
      </span>

      <label
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
        title="Allow the agent to use live Studio tools when connected"
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setStudioEnabledPreference(e.target.checked);
            onStudioEnabledChange?.(e.target.checked);
          }}
          className="accent-[#00f5d4]"
          disabled={!connected}
        />
        Live Studio
      </label>

      {enabled && connected && (
        <select
          value={mode}
          onChange={(e) => {
            setStudioApplyMode(e.target.value);
            onApplyModeChange?.(e.target.value);
          }}
          className="h-[26px] rounded-lg border border-white/10 bg-black/30 px-2 text-[9px] font-black uppercase tracking-widest text-gray-300 outline-none"
          title="How mutating Studio steps are applied"
        >
          <option value="manual_review">Manual</option>
          <option value="auto_after_approval">Auto</option>
          <option value="unrestricted_dev">Dev</option>
        </select>
      )}
    </div>
  );
}
