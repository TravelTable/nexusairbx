import React, { useMemo, useState } from "react";
import { Bot, Loader2, X } from "lib/icons";

function labelStatus(status) {
  return String(status || "idle").replaceAll("_", " ");
}

function activeRuns(agent) {
  const runs = Array.isArray(agent.runs) ? agent.runs : [];
  if (agent.currentRun && !runs.some((run) => (run.runId || run.id) === (agent.currentRun.runId || agent.currentRun.id))) {
    return [agent.currentRun, ...runs];
  }
  return runs;
}

export default function ActiveAgentsTray({ agents = [], onOpenChat, onCancelRun }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => agents.filter(Boolean), [agents]);

  return (
    <section className="shrink-0 border-b border-white/10 bg-[#080a12]" aria-label="Active agents">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-white/[0.03] focus-ring"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-gray-200">
          <Bot className="h-4 w-4 text-[#00f5d4]" />
          Active Agents
          <span className="rounded-full bg-[#00f5d4]/10 px-2 py-0.5 text-[10px] text-[#00f5d4]">{rows.length}</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="max-h-48 space-y-1 overflow-y-auto border-t border-white/5 px-3 py-2">
          {rows.length === 0 ? (
            <p className="px-1 py-2 text-xs text-gray-500">No agents are working right now.</p>
          ) : rows.map((agent) => (
            <div key={agent.agentId || agent.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#00f5d4]" />
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus-ring"
                onClick={() => agent.chatId && onOpenChat?.(agent.chatId)}
                disabled={!agent.chatId}
              >
                <span className="block truncate text-xs font-semibold text-gray-200">{agent.title}</span>
                <span className="block text-[10px] capitalize text-[#00f5d4]">{labelStatus(agent.status)}</span>
              </button>
              {activeRuns(agent).map((run) => {
                const runId = run.runId || run.id;
                if (!runId) return null;
                return (
                  <button
                    key={runId}
                    type="button"
                    onClick={() => onCancelRun?.(runId)}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-red-400/10 hover:text-red-300 focus-ring"
                    title="Cancel this run"
                    aria-label={`Cancel run ${runId}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
