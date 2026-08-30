import React from "react";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lib/icons";
import AgentStepList from "./AgentStepList";

const ACTIVE_STATUSES = new Set([
  "inspecting",
  "waiting_for_tool",
  "waiting_for_approval",
  "awaiting_studio_target",
  "awaiting_plugin_update",
  "awaiting_studio_reconnect",
  "generating",
  "validating",
  "ready_to_apply",
  "applying",
]);

const STATUS_META = {
  applied: { label: "Applied to Studio", tone: "success" },
  succeeded: { label: "Studio run completed", tone: "success" },
  completed: { label: "Studio run completed", tone: "success" },
  timed_out: { label: "Studio agent stopped · Runtime limit", tone: "danger" },
  iteration_limit: { label: "Studio agent stopped · Iteration limit", tone: "danger" },
  failed: { label: "Studio agent run failed", tone: "danger" },
  conflict: { label: "Studio conflict needs attention", tone: "warning" },
  blocked: { label: "Studio agent is blocked", tone: "warning" },
  assets_pending: { label: "Studio run is waiting for assets", tone: "warning" },
  cancelled: { label: "Studio agent run cancelled", tone: "muted" },
  canceled: { label: "Studio agent run cancelled", tone: "muted" },
  push_skipped: { label: "Build saved to workspace", tone: "muted" },
};

function normalizeStatus(run) {
  return String(run?.status || run?.state || "").trim().toLowerCase();
}

function readableStatus(status) {
  return status.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

export function getCompactRunMeta(run) {
  const status = normalizeStatus(run);
  if (!status && !Array.isArray(run?.steps)) return null;
  if (STATUS_META[status]) return { ...STATUS_META[status], active: false };
  if (ACTIVE_STATUSES.has(status)) {
    return {
      label: String(run?.stage || readableStatus(status) || "Studio agent is working"),
      tone: "active",
      active: true,
    };
  }
  return status
    ? { label: `Studio run · ${readableStatus(status)}`, tone: "muted", active: false }
    : { label: "Studio activity", tone: "muted", active: false };
}

function StatusIcon({ tone }) {
  if (tone === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;
  if (tone === "success") return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  if (tone === "danger") return <XCircle className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />;
}

const TONE_CLASSES = {
  active: "text-[var(--ds-accent)]",
  success: "text-[var(--ds-success)]",
  danger: "text-[var(--ds-danger)]",
  warning: "text-[var(--ds-warning)]",
  muted: "text-[var(--ds-text-muted)]",
};

export default function CompactAgentRunBar({ agentRun, onApproveStep, approvingStepId }) {
  const meta = getCompactRunMeta(agentRun);
  if (!meta) return null;

  const steps = Array.isArray(agentRun?.steps) ? agentRun.steps : [];
  const stepLabel = `${steps.length} Studio step${steps.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-[840px] px-4 pb-2 md:px-6" data-testid="compact-agent-run-bar">
      <details className="group overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] shadow-sm">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 py-1.5 outline-none transition-colors hover:bg-[var(--ds-fill-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-accent-border)] [&::-webkit-details-marker]:hidden">
          <span className={TONE_CLASSES[meta.tone] || TONE_CLASSES.muted}>
            <StatusIcon tone={meta.tone} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ds-text-secondary)]">
            {meta.label}
          </span>
          {steps.length > 0 ? (
            <span className="shrink-0 text-[11px] text-[var(--ds-text-muted)]">{stepLabel}</span>
          ) : null}
          {steps.length > 0 ? (
            <>
              <span className="shrink-0 text-[11px] font-medium text-[var(--ds-text-muted)] group-open:hidden">Show activity</span>
              <span className="hidden shrink-0 text-[11px] font-medium text-[var(--ds-text-muted)] group-open:inline">Hide activity</span>
            </>
          ) : null}
        </summary>
        {steps.length > 0 ? (
          <div className="border-t border-[var(--ds-border-subtle)] px-3 py-2">
            <AgentStepList
              steps={steps}
              maxHeight="max-h-40"
              compact
              onApproveStep={onApproveStep}
              approvingStepId={approvingStepId}
            />
          </div>
        ) : null}
      </details>
    </div>
  );
}
