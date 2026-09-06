import React from "react";

const ROLES = { lead: "Lead", gameplay: "Gameplay", ui: "UI", world_assets: "World & assets", qa: "QA" };
const STATES = { pending: "Waiting for dependencies", ready: "Queued", running: "Working", waiting: "Retry scheduled",
  verifying: "Checking", succeeded: "Prepared", failed: "Needs attention", cancelled: "Cancelled", superseded: "Replanned" };

export default function TeamActivityPanel({ activity }) {
  if (!activity || activity.executionMode !== "team" || !activity.assignments?.length) return null;
  const assignments = activity.assignments;
  const prepared = assignments.filter(a => a.role !== "lead" && a.status === "succeeded").length;
  const specialists = assignments.filter(a => a.role !== "lead").length;
  const needsAttention = activity.status === "blocked" || assignments.some(a => a.status === "failed" || a.blockers?.length);
  return (
    <details className="shrink-0 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text)]">
      <summary className="cursor-pointer px-4 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-accent)]">
        Team activity
        <span className="ml-2 font-normal text-[var(--ds-text-muted)]">
          {activity.milestone === "verified_game" ? "Verified game" : needsAttention ? "Needs attention" : activity.status === "cancelled" ? "Cancelled" : specialists ? `${prepared}/${specialists} prepared` : "Lead is planning"}
        </span>
      </summary>
      <ul className="max-h-64 space-y-2 overflow-y-auto px-4 pb-3 text-xs" aria-label="Game development team">
        {assignments.map(assignment => (
          <li key={assignment.stepId} className="border-t border-[var(--ds-border-subtle)] pt-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-semibold">{ROLES[assignment.role] || "Specialist"}</span>
              <span className="text-[var(--ds-text-muted)]">{STATES[assignment.status] || "Waiting"}</span>
            </div>
            <p className="mt-1 break-words text-[var(--ds-text-secondary)]">{assignment.title}</p>
            {assignment.handoff ? <p className="mt-1 whitespace-pre-wrap break-words text-[var(--ds-text-muted)]">{assignment.handoff}</p> : null}
            {assignment.artifactId ? <p className="mt-1 text-[var(--ds-text-muted)]">Output saved for integration</p> : null}
            {assignment.outputs?.length ? <ul className="mt-1 space-y-1 text-[var(--ds-text-muted)]" aria-label={`${ROLES[assignment.role] || "Specialist"} outputs`}>
              {assignment.outputs.map((output, index) => <li key={`${output.path}-${index}`} className="break-all">{output.path}</li>)}
            </ul> : null}
            {assignment.error ? <p className="mt-1 text-[var(--ds-danger)]">{assignment.error}</p> : null}
            {(assignment.blockers || []).map((blocker, index) => <p key={index} className="mt-1 text-[var(--ds-danger)]">{blocker}</p>)}
          </li>
        ))}
      </ul>
      {activity.usage ? <p className="px-4 pb-3 text-[10px] text-[var(--ds-text-muted)]">
        {(Number(activity.usage.inputTokens || 0) + Number(activity.usage.outputTokens || 0)).toLocaleString()} team tokens used
      </p> : null}
    </details>
  );
}
