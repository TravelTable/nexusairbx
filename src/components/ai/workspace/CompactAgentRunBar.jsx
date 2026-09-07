import React from "react";
import { getRunPresentation, getRunSpecialists } from "../../../lib/runPresentation";

// Compatibility exports for existing imports. Generic agent projections are
// deliberately ignored: an agent record is not evidence of an active build.
export function getCompactRunMeta(run) {
  return getRunPresentation(run);
}
export function getVisibleRunAgents(run) {
  return getRunSpecialists(run);
}

export default function CompactAgentRunBar({ agentRun, chatId, projectId, onOpenActivity }) {
  const meta = getRunPresentation(agentRun, { chatId, projectId });
  if (!meta) return null;
  const specialists = getRunSpecialists(agentRun, { chatId, projectId });
  const working = specialists.filter(s => ["running", "ready", "building"].includes(s.status)).length;
  return (
    <div className="mx-auto flex w-full max-w-[840px] items-center gap-2 px-5 py-1.5 text-xs text-[var(--ds-text-secondary)]"
      data-testid="compact-agent-run-bar">
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.active ? "motion-safe:animate-pulse bg-[var(--ds-accent)]" : "bg-current"}`} />
      <span role="status" aria-live="polite" className="min-w-0 flex-1 truncate">
        {meta.label}{working > 1 ? ` · ${working} tasks running` : ""}
      </span>
      {typeof onOpenActivity === "function" ? (
        <button type="button" onClick={onOpenActivity}
          className="min-h-[44px] rounded px-2 py-1 underline-offset-4 md:min-h-0 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Open build activity">View</button>
      ) : null}
    </div>
  );
}
