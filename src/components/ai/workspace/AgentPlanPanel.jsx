import React from "react";
import { Loader2, CircleDot, ListChecks } from "lucide-react";

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

// Build progress + plan for the current agent run (right column header region).
export default function AgentPlanPanel({ agentRun, planText }) {
  const active = agentRun?.status === "thinking" || agentRun?.status === "generating";
  const idx = stageIndex(agentRun?.status);
  const plan = planText || agentRun?.plan;

  if (!active && !plan) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="w-3.5 h-3.5 text-[#00f5d4]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agent Plan</span>
        {active && <span className="ml-auto text-[10px] text-[#00f5d4] font-bold">{agentRun.stage}</span>}
      </div>

      {active && (
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

      {plan && (
        <div className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap border-t border-white/5 pt-3">
          {plan}
        </div>
      )}
    </div>
  );
}
