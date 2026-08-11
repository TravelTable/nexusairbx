import React, { useMemo, useState } from "react";
import { Bot, Loader2, X } from "lib/icons";
import { TERMINAL_AGENT_STATES } from "../../../lib/agentRuntimeV2Api";

function labelStatus(status) {
  return String(status || "idle").replaceAll("_", " ");
}

function activeRuns(agent) {
  const runs = Array.isArray(agent.runs) ? agent.runs : [];
  const combined = agent.currentRun
    && !runs.some((run) => (run.runId || run.id) === (agent.currentRun.runId || agent.currentRun.id))
    ? [agent.currentRun, ...runs]
    : runs;
  return combined.filter((run) => {
    const status = String(run?.status || run?.state || "").toLowerCase();
    return !TERMINAL_AGENT_STATES.has(status) && status !== "canceled";
  });
}

export default function ActiveAgentsTray({ agents = [], onOpenChat, onCancelRun }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => agents.filter(Boolean), [agents]);

  return (
    <section className="shrink-0 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]" aria-label="Active agents">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-[var(--ds-fill-subtle)] focus-ring"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-[var(--ds-text)]">
          <Bot className="h-4 w-4 text-[var(--ds-accent)]" />
          Active Agents
          <span className="rounded-full bg-[var(--ds-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--ds-accent)]">{rows.length}</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--ds-text-muted)]">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="max-h-48 space-y-1 overflow-y-auto border-t border-[var(--ds-border-subtle)] px-3 py-2 scrollbar-subtle">
          {rows.length === 0 ? (
            <p className="px-1 py-2 text-xs text-[var(--ds-text-muted)]">No agents are working right now.</p>
          ) : rows.map((agent) => (
            <div key={agent.agentId || agent.id} className="flex items-center gap-2 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ds-accent)]" />
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus-ring"
                onClick={() => agent.chatId && onOpenChat?.(agent.chatId)}
                disabled={!agent.chatId}
              >
                <span className="block truncate text-xs font-semibold text-[var(--ds-text)]">{agent.title}</span>
                <span className="block text-[10px] capitalize text-[var(--ds-accent)]">{labelStatus(agent.status)}</span>
              </button>
              {activeRuns(agent).map((run) => {
                const runId = run.runId || run.id;
                if (!runId) return null;
                return (
                  <button
                    key={runId}
                    type="button"
                    onClick={() => onCancelRun?.(runId)}
                    className="rounded-md p-1.5 text-[var(--ds-text-muted)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)] focus-ring"
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
