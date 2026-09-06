import React, { useRef, useState } from "react";
import { approveAgentStep } from "../../../lib/workflowApi";
import AgentStepList from "./AgentStepList";

/** Uses the existing per-command approval endpoint; never resumes a whole task. */
export default function StudioTaskApprovalCard({ approval, onApproved, disabled = false }) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  if (!approval?.runId || !approval?.stepId || approval.step?.id !== approval.stepId
    || approval.step.status !== "awaiting_approval"
    || !approval.allowedActions?.includes("approve_step")) return null;

  const approve = async () => {
    if (disabled || busyRef.current || approved) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await approveAgentStep(approval.runId, approval.stepId);
      setApproved(true);
      await onApproved?.();
    } catch (reason) {
      setError(reason?.message || "The Studio step could not be approved. Try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section aria-label="Studio approval" className="rounded-xl border border-[var(--ds-warning)] p-3 space-y-2">
      <h3 className="text-sm font-semibold">Studio is waiting for your approval</h3>
      <p className="text-xs text-[var(--ds-text-secondary)]">
        Review this change before it runs. To reject it and stop the build, use Cancel task below.
      </p>
      {approval.step.reason && <p className="text-xs">{approval.step.reason}</p>}
      {approval.step.affectedPaths?.length > 0 && (
        <ul aria-label="Affected Studio paths" className="text-xs break-words">
          {approval.step.affectedPaths.map((path) => <li key={path}>{path}</li>)}
        </ul>
      )}
      {approved ? <p role="status" className="text-xs">Step approved. Refreshing build progress…</p> : (
        <AgentStepList
          steps={[approval.step]}
          onApproveStep={disabled ? undefined : approve}
          approvingStepId={busy ? approval.stepId : null}
          maxHeight="max-h-64"
        />
      )}
      {error && <p role="alert" className="text-xs text-[var(--ds-danger)]">{error}</p>}
    </section>
  );
}
