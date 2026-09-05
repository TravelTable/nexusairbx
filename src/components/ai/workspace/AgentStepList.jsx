import React from "react";
import { CheckCircle2, Circle, Loader2, ShieldAlert, XCircle } from "lib/icons";
import {
  batchOperationFailure,
  summarizeStepResult,
  TERMINAL_STEP_STATUSES,
} from "../../../lib/agentSteps";
import StudioRunBlockNotice from "./StudioRunBlockNotice";

export function StepStatusIcon({ status }) {
  if (status === "succeeded") return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-accent)]" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-[var(--ds-danger)] " />;
  if (status === "blocked") return <ShieldAlert className="w-3.5 h-3.5 text-[var(--ds-warning)] " />;
  if (status === "awaiting_approval") return <ShieldAlert className="w-3.5 h-3.5 text-[var(--ds-warning)] " />;
  if (status === "queued" || status === "delivered" || status === "running") {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--ds-warning)] " />;
  }
  return <Circle className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />;
}

function describeStepWait(step) {
  if (!step) return "";
  if (step.status === "awaiting_approval") return "Waiting for your approval";
  if (step.status === "queued") return "Queued for Studio";
  if (step.status === "delivered") return `Delivered to ${providerLabel(step.executionProvider)}`;
  if (step.status === "running") return "Running in Studio";
  return "";
}

function providerLabel(provider) {
  if (provider === "mcp_local" || provider === "plugin_bridge") return "Studio";
  return "Studio";
}

function statusLabel(status) {
  if (status === "succeeded") return "Success";
  if (status === "failed") return "Error";
  if (status === "blocked") return "Blocked";
  if (status === "delivered" || status === "running") return "Running";
  if (status === "awaiting_approval") return "Approval";
  return "Pending";
}

function completedActivityLabel(steps = []) {
  const succeeded = steps.filter((step) => step.status === "succeeded").length;
  const failed = steps.filter((step) => step.status === "failed").length;
  const blocked = steps.filter((step) => step.status === "blocked").length;

  if (failed || blocked) {
    const issues = failed + blocked;
    return `${steps.length} Studio steps · ${issues} need${issues === 1 ? "s" : ""} attention`;
  }
  if (succeeded === steps.length) {
    return `${steps.length} Studio step${steps.length === 1 ? "" : "s"} completed`;
  }
  return `${steps.length} Studio step${steps.length === 1 ? "" : "s"}`;
}

/**
 * Inline tool-step log for unified agent runs (chat thread + details panel).
 */
export default function AgentStepList({
  steps = [],
  maxHeight = "max-h-44",
  compact = false,
  collapsible = false,
  onApproveStep,
  approvingStepId = null,
  emptyLabel = "No agent steps yet.",
}) {
  if (!steps.length) {
    return (
      <div className={`py-1 text-xs text-[var(--ds-text-muted)] ${compact ? "" : ""}`}>
        {emptyLabel}
      </div>
    );
  }

  const stepList = (
    <div className={`space-y-2 overflow-y-auto scrollbar-subtle ${maxHeight}`}>
      {steps.map((step) => {
        const awaiting = step.status === "awaiting_approval";
        const terminal = TERMINAL_STEP_STATUSES.has(step.status);
        const waitLabel = describeStepWait(step);
        const failedOperation = step.type === "batch_operations"
          ? batchOperationFailure(step.result)
          : null;
        return (
          <div key={step.id || `${step.type}-${step.label}`} className="flex items-start gap-2 py-1">
            <div className="mt-0.5">
              <StepStatusIcon status={step.status} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-[var(--ds-text)] truncate">{step.label || step.type}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--ds-text-muted)] shrink-0">
                  {step.type}
                </span>
                {step.executionProvider && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                    step.executionProvider === "mcp_local"
                      ? "border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_10%,transparent)] text-[var(--ds-info)]"
                      : "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]"
                  }`}>
                    {providerLabel(step.executionProvider)}
                  </span>
                )}
                <span className="ml-auto text-[9px] font-bold text-[var(--ds-text-muted)] shrink-0">
                  {statusLabel(step.status)}
                </span>
              </div>
              <div className={`text-[11px] truncate ${step.error ? " text-[var(--ds-danger)] " : "text-[var(--ds-text-muted)]"}`}>
                {summarizeStepResult(step)}
              </div>
              {failedOperation && (
                <details className="mt-1 text-[10px] text-[var(--ds-text-muted)]">
                  <summary className="cursor-pointer select-none hover:text-[var(--ds-text-secondary)]">
                    Failed operation details
                  </summary>
                  <dl className="mt-1 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 break-words">
                    <dt>Index</dt><dd>{failedOperation.index ?? "Unknown"}</dd>
                    <dt>Type</dt><dd>{failedOperation.type || "Unknown"}</dd>
                    {failedOperation.path && <><dt>Target</dt><dd>{failedOperation.path}</dd></>}
                    {failedOperation.code && <><dt>Code</dt><dd>{failedOperation.code}</dd></>}
                    {step.result?.rollbackCode && <><dt>Rollback</dt><dd>{step.result.rollbackCode}</dd></>}
                  </dl>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--ds-fill-subtle)] p-2 text-[9px]">
                    {JSON.stringify(failedOperation.result || failedOperation, null, 2)}
                  </pre>
                </details>
              )}
              {!terminal && waitLabel && (
                <div className={`mt-1 text-[10px] ${awaiting ? " text-[var(--ds-warning)] " : "text-[var(--ds-text-muted)]"}`}>
                  {waitLabel}
                </div>
              )}
              <StudioRunBlockNotice value={step} className="mt-2" />
              {process.env.NODE_ENV === "development" && (step.executionSessionId || step.operationId) && (
                <details className="mt-1 text-[10px] text-[var(--ds-text-muted)]">
                  <summary className="cursor-pointer select-none hover:text-[var(--ds-text-secondary)]">Execution details</summary>
                  <div className="mt-1 space-y-0.5 break-all">
                    {step.executionSessionId && <div>Session: {step.executionSessionId}</div>}
                    {step.operationId && <div>Operation: {step.operationId}</div>}
                  </div>
                </details>
              )}
              {awaiting && onApproveStep && (
                <button
                  type="button"
                  onClick={() => onApproveStep(step)}
                  disabled={approvingStepId === step.id}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                >
                  {approvingStepId === step.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-3 h-3" />
                  )}
                  Approve step
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const hasActionableStep = steps.some((step) => (
    step.status === "failed"
    || step.status === "blocked"
    || step.status === "awaiting_approval"
  ));

  if (!collapsible || hasActionableStep) return stepList;

  return (
    <details className="group">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 py-1 text-xs font-semibold text-[var(--ds-text-secondary)] outline-none transition-colors hover:text-[var(--ds-text)] focus-visible:ring-2 focus-visible:ring-[var(--ds-info)] [&::-webkit-details-marker]:hidden">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--ds-accent)]" aria-hidden="true" />
        <span>{completedActivityLabel(steps)}</span>
        <span className="ml-auto text-[11px] font-medium text-[var(--ds-text-muted)] group-open:hidden">
          Show activity
        </span>
        <span className="ml-auto hidden text-[11px] font-medium text-[var(--ds-text-muted)] group-open:inline">
          Hide activity
        </span>
      </summary>
      <div className="pl-5 pt-2">
        {stepList}
      </div>
    </details>
  );
}
