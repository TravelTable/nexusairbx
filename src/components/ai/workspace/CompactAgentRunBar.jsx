import React from "react";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lib/icons";
import AgentAvatar from "./AgentAvatar";
import AgentStepList from "./AgentStepList";

const ACTIVE_STATUSES = new Set([
  "accepted", "planning", "queued", "running", "verifying", "retry_scheduled",
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
  waiting_user: { label: "Build needs your answer or approval", tone: "warning" },
  blocked_studio: { label: "Build paused — reconnect Studio", tone: "warning" },
  waiting_external: { label: "Build is waiting for an external operation", tone: "warning" },
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

function isAgentActive(status) {
  return ACTIVE_STATUSES.has(String(status || "").toLowerCase())
    || ["active", "in_progress", "working", "ready"].includes(String(status || "").toLowerCase());
}

function agentStatusLabel(status) {
  const value = String(status || "ready").toLowerCase();
  if (["running", "active", "in_progress", "working"].includes(value)) return "Working";
  if (["queued", "ready", "planning", "accepted"].includes(value)) return value === "queued" ? "Queued" : "Starting";
  if (["verifying", "validating"].includes(value)) return "Checking";
  if (["succeeded", "completed", "applied"].includes(value)) return "Completed";
  if (["failed", "blocked", "timed_out"].includes(value)) return "Needs attention";
  return readableStatus(value);
}

export function getVisibleRunAgents(agentRun, agents = []) {
  const teamActivity = agentRun?.teamActivity;
  if (teamActivity?.executionMode === "team" && Array.isArray(teamActivity.assignments)) {
    return teamActivity.assignments.map((assignment) => ({
      id: assignment.stepId || `${assignment.role}-${assignment.title}`,
      name: assignment.role === "world_assets"
        ? "World & assets"
        : readableStatus(assignment.role || "specialist"),
      detail: assignment.title || "Specialist agent",
      status: assignment.status || "pending",
    }));
  }

  const projected = (Array.isArray(agents) ? agents : []).filter(Boolean).map((agent) => ({
    id: agent.agentId || agent.id,
    name: agent.title || "Nexus agent",
    detail: "Agent runtime",
    status: agent.status || agent.currentRun?.status || "running",
  }));
  if (projected.length) return projected;

  const meta = getCompactRunMeta(agentRun);
  if (!meta) return [];
  return [{
    id: agentRun?.runId || agentRun?.taskId || agentRun?.id || "nexus-agent",
    name: "Nexus Studio agent",
    detail: "Building this project",
    status: normalizeStatus(agentRun) || (meta.active ? "running" : "completed"),
  }];
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

export default function CompactAgentRunBar({ agentRun, agents = [], onApproveStep, approvingStepId }) {
  const meta = getCompactRunMeta(agentRun);
  const visibleAgents = getVisibleRunAgents(agentRun, agents);
  if (!meta && !visibleAgents.length) return null;

  const steps = Array.isArray(agentRun?.steps) ? agentRun.steps : [];
  const stepLabel = `${steps.length} Studio step${steps.length === 1 ? "" : "s"}`;
  const hasActivity = visibleAgents.length > 0 || steps.length > 0;
  const visibleMeta = meta || { label: "Agents are working", tone: "active", active: true };

  return (
    <div className="mx-auto w-full max-w-[840px] px-4 pb-2 md:px-6" data-testid="compact-agent-run-bar">
      <details className="group overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] shadow-sm">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 py-1.5 outline-none transition-colors hover:bg-[var(--ds-fill-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-accent-border)] [&::-webkit-details-marker]:hidden">
          <span className={TONE_CLASSES[visibleMeta.tone] || TONE_CLASSES.muted}>
            <StatusIcon tone={visibleMeta.tone} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ds-text-secondary)]">
            {visibleMeta.label}
          </span>
          {visibleAgents.length > 0 ? (
            <span className="flex shrink-0 -space-x-1.5" aria-label={`${visibleAgents.length} ${visibleAgents.length === 1 ? "agent" : "agents"}`}>
              {visibleAgents.slice(0, 4).map((agent) => (
                <AgentAvatar key={agent.id} seed={agent.id || agent.name} size={20} animated={isAgentActive(agent.status)} className="ring-2 ring-[var(--ds-fill-subtle)]" />
              ))}
            </span>
          ) : null}
          {visibleAgents.length > 0 ? (
            <span className="shrink-0 text-[11px] text-[var(--ds-text-muted)]">
              {visibleAgents.length} {visibleAgents.length === 1 ? "agent" : "agents"}
            </span>
          ) : null}
          {steps.length > 0 ? (
            <span className="shrink-0 text-[11px] text-[var(--ds-text-muted)]">{stepLabel}</span>
          ) : null}
          {hasActivity ? (
            <>
              <span className="shrink-0 text-[11px] font-medium text-[var(--ds-text-muted)] group-open:hidden">Show activity</span>
              <span className="hidden shrink-0 text-[11px] font-medium text-[var(--ds-text-muted)] group-open:inline">Hide activity</span>
            </>
          ) : null}
        </summary>
        {hasActivity ? (
          <div className="max-h-56 overflow-y-auto border-t border-[var(--ds-border-subtle)] px-3 py-2 scrollbar-subtle">
            {visibleAgents.length > 0 ? (
              <ul className="space-y-1.5" aria-label="Agents working on this run">
                {visibleAgents.map((agent) => {
                  const active = isAgentActive(agent.status);
                  return (
                    <li key={agent.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-2.5 py-2">
                      <AgentAvatar seed={agent.id || agent.name} size={30} animated={active} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold text-[var(--ds-text)]">{agent.name}</span>
                        <span className="block truncate text-[10px] text-[var(--ds-text-muted)]">{agent.detail}</span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold ${active ? "text-[var(--ds-accent)]" : "text-[var(--ds-text-muted)]"}`}>
                        {active ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                        {agentStatusLabel(agent.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {steps.length > 0 ? (
              <div className={visibleAgents.length ? "mt-2 border-t border-[var(--ds-border-subtle)] pt-2" : ""}>
                <AgentStepList
                  steps={steps}
                  maxHeight="max-h-40"
                  compact
                  onApproveStep={onApproveStep}
                  approvingStepId={approvingStepId}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </details>
    </div>
  );
}
