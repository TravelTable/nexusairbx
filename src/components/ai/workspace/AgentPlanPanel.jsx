import React from "react";
import { Loader2, CircleDot, ListChecks, RotateCcw } from "lucide-react";
import AgentStepList from "./AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";

const STAGES = [
  { id: "thinking", label: "Understanding & planning" },
  { id: "generating", label: "Generating files" },
  { id: "done", label: "Ready" },
];

function stageIndex(status) {
  if (status === "thinking") return 0;
  if (status === "generating") return 1;
  if (status === "done") return 2;
  return -1;
}

// Build progress + plan + unified tool steps for the current agent run.
export default function AgentPlanPanel({
  agentRun,
  planText,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  restoring = false,
}) {
  const active = agentRun?.status === "thinking" || agentRun?.status === "generating";
  const idx = stageIndex(agentRun?.status);
  const plan = planText || agentRun?.plan;
  const steps = agentRun?.steps || [];
  const showSteps = FEATURE_FLAGS.unifiedAgent && steps.length > 0;
  const canRestore = Boolean(agentRun?.runId && agentRun?.snapshotCount > 0);

  if (!active && !plan && !showSteps) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="w-3.5 h-3.5 text-[#00f5d4]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agent Plan</span>
        {active && <span className="ml-auto text-[10px] text-[#00f5d4] font-bold">{agentRun.stage}</span>}
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

      {active && !showSteps && (
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const done = i < idx;
            const current = i === idx;
            return (
              <div key={s.id} className="flex items-center gap-2.5 text-[13px]">
                {current ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#00f5d4] animate-spin shrink-0" />
                ) : (
                  <CircleDot className={`w-3.5 h-3.5 shrink-0 ${done ? "text-[#00f5d4]" : "text-gray-600"}`} />
                )}
                <span className={done || current ? "text-gray-200" : "text-gray-500"}>{s.label}</span>
              </div>
            );
          })}
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
