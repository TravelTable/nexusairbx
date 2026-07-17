import React from "react";
import { Loader2, ListChecks, RotateCcw } from "lib/icons";
import AgentStepList from "./AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import StudioTargetPicker from "./StudioTargetPicker";
import StudioRunBlockNotice, { getStudioRunBlock } from "./StudioRunBlockNotice";

// Build progress + plan + unified tool steps for the current agent run.
export default function AgentPlanPanel({
  agentRun,
  planText,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  onSelectStudioTarget,
  selectingStudioTargetId,
  restoring = false,
}) {
  const active = [
    "inspecting",
    "waiting_for_tool",
    "waiting_for_approval",
    "awaiting_studio_target",
    "awaiting_plugin_update",
    "awaiting_studio_reconnect",
    "invalid_studio_path",
    "generating",
    "validating",
    "ready_to_apply",
    "assets_pending",
    "applying",
    "applied",
    "succeeded",
  ].includes(agentRun?.status);
  const plan = planText || agentRun?.plan;
  const steps = agentRun?.steps || [];
  const showSteps = FEATURE_FLAGS.unifiedAgent && steps.length > 0;
  const canRestore = Boolean(agentRun?.runId && agentRun?.snapshotCount > 0);
  const studioBlock = getStudioRunBlock(agentRun);

  if (!active && !plan && !showSteps && !["conflict", "failed", "cancelled", "blocked", "iteration_limit", "timed_out", "push_skipped", "assets_pending"].includes(agentRun?.status)) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="w-3.5 h-3.5 text-[#00f5d4]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agent Plan</span>
        {canRestore && onRestoreRun && (
          <button
            type="button"
            onClick={() => onRestoreRun(agentRun.runId)}
            disabled={restoring}
            className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-400/20 bg-red-400/10 text-red-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            title="Restore snapshots captured during this run"
          >
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Restore
          </button>
        )}
      </div>

      {agentRun?.status === "conflict" && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Conflict detected. The workspace or Studio changed while this run was in progress, so automatic apply was blocked.
        </div>
      )}

      <StudioRunBlockNotice value={agentRun} />

      <StudioTargetPicker
        selection={agentRun?.targetSelection}
        onSelect={onSelectStudioTarget}
        selectingTargetId={selectingStudioTargetId}
      />

      {agentRun?.status === "failed" && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
          The run failed before apply completed.
        </div>
      )}

      {agentRun?.status === "blocked" && !studioBlock && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          The Studio agent hit a real blocker and stopped.
        </div>
      )}

      {agentRun?.status === "cancelled" && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
          The Studio agent run was cancelled.
        </div>
      )}

      {agentRun?.status === "iteration_limit" && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
          The Studio agent stopped after reaching the iteration limit.
        </div>
      )}

      {agentRun?.status === "timed_out" && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
          The Studio agent stopped after reaching the runtime limit.
        </div>
      )}

      {agentRun?.status === "assets_pending" && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {Array.isArray(agentRun?.unresolvedAssets) && agentRun.unresolvedAssets.length > 0
            ? `${agentRun.unresolvedAssets.length} Roblox icon${agentRun.unresolvedAssets.length === 1 ? "" : "s"} still uploading or unresolved. `
            : "Roblox icons are still uploading or unresolved. "}
          Use Project Assets to retry upload, or enable auto-upload before generating.
        </div>
      )}

      {agentRun?.status === "push_skipped" && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
          Build completed without an automatic Studio mutation. Manual Push remains available.
        </div>
      )}

      {showSteps && (
        <AgentStepList
          steps={steps}
          maxHeight="max-h-52"
          onApproveStep={onApproveStep}
          approvingStepId={approvingStepId}
          emptyLabel="Waiting for agent steps…"
        />
      )}

      {plan && (
        <div className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap border-t border-white/5 pt-3">
          {plan}
        </div>
      )}
    </div>
  );
}
