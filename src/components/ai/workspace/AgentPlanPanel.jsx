import React from "react";
import { Loader2, ListChecks, RotateCcw } from "lib/icons";
import AgentStepList from "./AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import StudioRunBlockNotice, { getStudioRunBlock } from "./StudioRunBlockNotice";

// Build progress + plan + unified tool steps for the current agent run.
export default function AgentPlanPanel({
  agentRun,
  planText,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
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
  const completedRun = ["applied", "succeeded", "push_skipped"].includes(agentRun?.status);
  const runIssues = steps.filter((step) => ["failed", "blocked", "awaiting_approval"].includes(step.status)).length;

  if (!active && !plan && !showSteps && !["conflict", "failed", "cancelled", "blocked", "iteration_limit", "timed_out", "push_skipped", "assets_pending"].includes(agentRun?.status)) return null;

  return (
    <section className="rounded-[14px] border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 space-y-3" aria-label="Run activity">
      <div className="flex items-center gap-2">
        <ListChecks className="w-3.5 h-3.5 text-[var(--ds-accent)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">Run activity</span>
        <span className={`ml-auto inline-flex min-h-5 items-center rounded-full border px-2 text-[9px] font-bold ${runIssues ? "border-[var(--ds-warning-border)] bg-[var(--ds-warning-soft)] text-[var(--ds-warning)]" : completedRun ? "border-[var(--ds-success-border)] bg-[var(--ds-success-soft)] text-[var(--ds-success)]" : "border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]"}`}>
          {runIssues ? `${runIssues} to review` : completedRun ? "Complete" : `${steps.length} step${steps.length === 1 ? "" : "s"}`}
        </span>
        {canRestore && onRestoreRun && (
          <button
            type="button"
            onClick={() => onRestoreRun(agentRun.runId)}
            disabled={restoring}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            title="Restore snapshots captured during this run"
          >
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Restore
          </button>
        )}
      </div>

      {agentRun?.status === "conflict" && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-warning)] ">
          Conflict detected. The workspace or Studio changed while this run was in progress, so automatic apply was blocked.
        </div>
      )}

      <StudioRunBlockNotice value={agentRun} />

      {agentRun?.status === "failed" && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-danger)] ">
          The run failed before apply completed.
        </div>
      )}

      {agentRun?.status === "blocked" && !studioBlock && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-warning)] ">
          The Studio agent hit a real blocker and stopped.
        </div>
      )}

      {agentRun?.status === "cancelled" && (
        <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text-secondary)]">
          The Studio agent run was cancelled.
        </div>
      )}

      {agentRun?.status === "iteration_limit" && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-danger)] ">
          The Studio agent stopped after reaching the iteration limit.
        </div>
      )}

      {agentRun?.status === "timed_out" && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-danger)] ">
          The Studio agent stopped after reaching the runtime limit.
        </div>
      )}

      {agentRun?.status === "assets_pending" && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-warning)] ">
          {Array.isArray(agentRun?.unresolvedAssets) && agentRun.unresolvedAssets.length > 0
            ? `${agentRun.unresolvedAssets.length} Roblox icon${agentRun.unresolvedAssets.length === 1 ? "" : "s"} still uploading or unresolved. `
            : "Roblox icons are still uploading or unresolved. "}
          Use Project Assets to retry upload, or enable auto-upload before generating.
        </div>
      )}

      {agentRun?.status === "push_skipped" && (
        <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text-secondary)]">
          Build completed without an automatic Studio mutation. Manual Push remains available.
        </div>
      )}

      {showSteps && (
        <AgentStepList
          steps={steps}
          maxHeight="max-h-52"
          collapsible={completedRun}
          onApproveStep={onApproveStep}
          approvingStepId={approvingStepId}
          emptyLabel="Waiting for agent steps…"
        />
      )}

      {plan && (
        <div className="text-[13px] text-[var(--ds-text-secondary)] leading-relaxed whitespace-pre-wrap border-t border-[var(--ds-border-subtle)] pt-3">
          {plan}
        </div>
      )}
    </section>
  );
}
