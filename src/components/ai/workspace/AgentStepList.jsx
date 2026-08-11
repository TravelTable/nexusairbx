import React from "react";
import { CheckCircle2, Circle, Loader2, ShieldAlert, XCircle } from "lib/icons";
import { summarizeStepResult, TERMINAL_STEP_STATUSES } from "../../../lib/agentSteps";
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

/**
 * Inline tool-step log for unified agent runs (chat thread + details panel).
 */
export default function AgentStepList({
  steps = [],
  maxHeight = "max-h-44",
  compact = false,
  onApproveStep,
  approvingStepId = null,
  emptyLabel = "No agent steps yet.",
}) {
  if (!steps.length) {
    return (
      <div className={`rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text-muted)] ${compact ? "" : ""}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] divide-y divide-[var(--ds-border-subtle)] scrollbar-subtle ${maxHeight}`}>
      {steps.map((step) => {
        const awaiting = step.status === "awaiting_approval";
        const terminal = TERMINAL_STEP_STATUSES.has(step.status);
        const waitLabel = describeStepWait(step);
        return (
          <div key={step.id || `${step.type}-${step.label}`} className="px-3 py-2 flex items-start gap-2">
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
                      : "border-[color-mix(in_srgb,var(--ds-plan)_20%,transparent)] bg-[color-mix(in_srgb,var(--ds-plan)_10%,transparent)] text-[var(--ds-plan)]"
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
}
