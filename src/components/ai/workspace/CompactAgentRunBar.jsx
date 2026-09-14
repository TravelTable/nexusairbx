import React from "react";
import { getRunPresentation, getRunSpecialists } from "../../../lib/runPresentation";
import { workspacePresentationAttributes } from "../../../lib/runPresentation";
import { useWorkspacePresentation } from "./WorkspacePresentationContext";
import AnimatedStatusText from "../chat/AnimatedStatusText";
import { Check } from "lib/icons";

// Compatibility exports for existing imports. Generic agent projections are
// deliberately ignored: an agent record is not evidence of an active build.
export function getCompactRunMeta(run) {
  return getRunPresentation(run);
}
export function getVisibleRunAgents(run) {
  return getRunSpecialists(run);
}

export default function CompactAgentRunBar({ agentRun, chatId, projectId, onOpenActivity, presentation }) {
  const shared = useWorkspacePresentation();
  const meta = presentation || shared || getRunPresentation(agentRun, { chatId, projectId });
  if (!meta || meta.state === "idle") return null;
  const specialists = getRunSpecialists(agentRun, { chatId, projectId });
  const working = specialists.filter(s => ["running", "ready", "building"].includes(s.status)).length;
  return (
    <div className="nexus-run-bar mx-auto flex w-full max-w-[840px] items-center gap-2 px-5 py-1.5 text-xs text-[var(--ds-text-secondary)]"
      data-testid="compact-agent-run-bar" {...workspacePresentationAttributes(meta)}>
      {meta.tone === "success" ? <Check aria-hidden="true" className="nx-result-check h-3.5 w-3.5 shrink-0 text-[var(--ds-success)]" />
        : <span aria-hidden="true" className="agent-status-dot nx-state-mark" />}
      <span role="status" aria-live={meta.accessibility.live} aria-atomic="true" className="min-w-0 flex-1 truncate">
        <AnimatedStatusText announce={false} value={`${meta.label}${meta.active && working > 1 ? ` · ${working} tasks running` : ""}`} />
      </span>
      {typeof onOpenActivity === "function" ? (
        <button type="button" onClick={onOpenActivity}
          className="min-h-[44px] rounded px-2 py-1 underline-offset-4 md:min-h-0 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Open build activity">View</button>
      ) : null}
    </div>
  );
}
