import React from "react";
import { CheckCircle2, Circle, Loader2, ShieldAlert, XCircle } from "lib/icons";
import { summarizeStepResult, TERMINAL_STEP_STATUSES } from "../../../lib/agentSteps";

export function StepStatusIcon({ status }) {
  if (status === "succeeded") return <CheckCircle2 className="w-3.5 h-3.5 text-[#00f5d4]" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === "awaiting_approval") return <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />;
  if (status === "queued" || status === "delivered" || status === "running") {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />;
  }
  return <Circle className="w-3.5 h-3.5 text-gray-500" />;
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
  if (provider === "mcp_local") return "Local MCP";
  if (provider === "plugin_bridge") return "Studio plugin";
  return "Studio";
}

function statusLabel(status) {
  if (status === "succeeded") return "Success";
  if (status === "failed") return "Error";
  if (status === "delivered" || status === "running") return "Running";
  if (status === "awaiting_approval") return "Approval";
  return "Pending";
}

function fallbackLabel(reason) {
  if (reason === "mcp_tool_unsupported") return "Local MCP does not support this action";
  if (reason === "mcp_place_mismatch") return "Local MCP is connected to a different place";
  if (reason === "mcp_unavailable") return "Local MCP is unavailable";
  return String(reason || "").replace(/_/g, " ");
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
      <div className={`rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-gray-500 ${compact ? "" : ""}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto rounded-lg border border-white/5 bg-black/20 divide-y divide-white/5 ${maxHeight}`}>
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
                <span className="text-[11px] font-bold text-white truncate">{step.label || step.type}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 shrink-0">
                  {step.type}
                </span>
                {step.executionProvider && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                    step.executionProvider === "mcp_local"
                      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                      : "border-violet-400/20 bg-violet-400/10 text-violet-200"
                  }`}>
                    {providerLabel(step.executionProvider)}
                  </span>
                )}
                <span className="ml-auto text-[9px] font-bold text-gray-500 shrink-0">
                  {statusLabel(step.status)}
                </span>
              </div>
              <div className={`text-[11px] truncate ${step.error ? "text-red-300" : "text-gray-500"}`}>
                {summarizeStepResult(step)}
              </div>
              {!terminal && waitLabel && (
                <div className={`mt-1 text-[10px] ${awaiting ? "text-amber-200" : "text-gray-600"}`}>
                  {waitLabel}
                </div>
              )}
              {step.fallbackReason && (
                <div className="mt-1 text-[10px] text-violet-200/80">
                  Studio plugin fallback: {fallbackLabel(step.fallbackReason)}
                </div>
              )}
              {(step.executionSessionId || step.operationId) && (
                <details className="mt-1 text-[10px] text-gray-600">
                  <summary className="cursor-pointer select-none hover:text-gray-400">Execution details</summary>
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
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-100 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
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
