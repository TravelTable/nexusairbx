import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  History,
  ListChecks,
  Loader2,
  Lock,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Square,
  Trash2,
  XCircle,
} from "lib/icons";
import usePlanWorkspace, { isPlanExecutionActive } from "../../../hooks/usePlanWorkspace";
import { PLAN_SECTION_DEFINITIONS, PLAN_TEMPLATES } from "../../../lib/workflowPlan";

const cx = (...values) => values.filter(Boolean).join(" ");
const isEditingDisabled = (controller) => (
  controller.editingDisabled ?? Boolean(controller.editingLocked)
);

const ignoreHandledError = (promise) => Promise.resolve(promise).catch(() => {});

function suggestedFixLabel(issue) {
  const fix = issue?.suggestedFix;
  if (fix && typeof fix === "object") return String(fix.label || fix.action || "");
  return String(fix || issue?.suggestedAction || "");
}

function versionDateLabel(value) {
  if (!value) return "";
  const raw = typeof value?.toDate === "function"
    ? value.toDate()
    : Number.isFinite(value?.seconds)
      ? new Date(value.seconds * 1000)
      : new Date(value);
  return Number.isNaN(raw.getTime()) ? "" : raw.toLocaleString();
}

function SaveState({ status, loadState }) {
  const copy = loadState === "reconnecting"
    ? "Reconnecting"
    : status === "saving"
      ? "Saving"
      : status === "dirty"
        ? "Unsaved changes"
        : status === "conflict"
          ? "Review conflict"
          : status === "error"
            ? "Save failed"
            : loadState === "recovered"
              ? "Recovered draft"
              : "Saved";
  const Icon = ["saving", "dirty"].includes(status) || loadState === "reconnecting" ? Loader2 : Save;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ds-text-secondary)]" role="status" aria-live="polite">
      <Icon className={cx("h-3.5 w-3.5", (["saving", "dirty"].includes(status) || loadState === "reconnecting") && "animate-spin")} />
      {copy}
    </span>
  );
}

function EmptyPlan({ onUseTemplate }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
          <ListChecks className="h-4 w-4" />
        </div>
        <h2 className="text-xl font-bold text-[var(--ds-text)]">Turn a request into an execution-ready plan</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Describe the outcome in the composer, or use a template as a starting point. NexusRBX will ask only for choices that change the implementation.
        </p>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2" aria-label="Plan templates">
        {PLAN_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onUseTemplate?.(template.starterPrompt, template.id)}
            className="group min-h-[76px] rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3 text-left transition-colors hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-accent-soft)] focus-ring"
          >
            <span className="block text-sm font-semibold text-[var(--ds-text)] group-hover:text-[var(--ds-text)]">{template.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-[var(--ds-text-muted)]">{template.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanItemEditor({ item, index, count, locked, onChange, onRemove, onMove }) {
  const itemId = item.itemId || item.id;
  return (
    <li className="group rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2.5">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-5 min-w-5 items-center justify-center rounded bg-[var(--ds-fill-hover)] text-[10px] font-bold text-[var(--ds-text-muted)]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={item.title || ""}
            onChange={(event) => onChange(itemId, { title: event.target.value })}
            disabled={locked}
            aria-label={`Item ${index + 1} title`}
            placeholder="Describe the result or action"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-[var(--ds-text)] outline-none transition-colors hover:border-[var(--ds-border-subtle)] focus:border-[var(--ds-accent-border)] focus:bg-[var(--ds-fill-subtle)] disabled:cursor-not-allowed disabled:opacity-70"
          />
          {(item.details || !locked) && (
            <textarea
              value={item.details || ""}
              onChange={(event) => onChange(itemId, { details: event.target.value })}
              disabled={locked}
              aria-label={`Item ${index + 1} details`}
              placeholder="Optional details, constraints, or expected evidence"
              rows={item.details ? 2 : 1}
              className="w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed text-[var(--ds-text-secondary)] outline-none transition-colors hover:border-[var(--ds-border-subtle)] focus:border-[var(--ds-accent-border)] focus:bg-[var(--ds-fill-subtle)] disabled:cursor-not-allowed disabled:opacity-70"
            />
          )}
        </div>
        {!locked && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" disabled={index === 0} onClick={() => onMove(itemId, "up")} className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:opacity-25 focus-ring" aria-label={`Move item ${index + 1} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" disabled={index === count - 1} onClick={() => onMove(itemId, "down")} className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:opacity-25 focus-ring" aria-label={`Move item ${index + 1} down`}><ChevronDown className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => onRemove(itemId)} className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-[var(--ds-text-muted)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)] focus-ring" aria-label={`Remove item ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </li>
  );
}

function PlanSection({ definition, controller }) {
  const { plan } = controller;
  const value = plan.sections?.[definition.id];
  const locked = Boolean(plan.locks?.[definition.id]);
  const editingDisabled = locked || isEditingDisabled(controller);
  const regenerating = controller.regeneratingSectionId === definition.id;
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [instruction, setInstruction] = useState("");

  const runRegeneration = async () => {
    try {
      await controller.regenerateSection(definition.id, instruction);
      setInstruction("");
      setShowRegenerate(false);
    } catch (_) {
      // The controller owns the visible error state and notification.
    }
  };

  return (
    <details id={`plan-section-${definition.id}`} open={definition.defaultOpen || undefined} className="group rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] open:bg-[var(--ds-fill-subtle)]">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-3 py-2 focus-ring">
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)] transition-transform group-open:rotate-180" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--ds-text)]">{definition.label}</span>
        {locked && <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[var(--ds-warning)] sm:inline">Locked</span>}
        <button
          type="button"
          disabled={isEditingDisabled(controller)}
          onClick={(event) => { event.preventDefault(); controller.setSectionLocked(definition.id, !locked); }}
          className={cx("flex min-h-9 min-w-9 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 focus-ring", locked ? " bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] " : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]")}
          aria-label={`${locked ? "Unlock" : "Lock"} ${definition.label}`}
          aria-pressed={locked}
        >
          <Lock className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={editingDisabled || regenerating}
          onClick={(event) => { event.preventDefault(); setShowRegenerate((open) => !open); }}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-[var(--ds-text-muted)] hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent)] disabled:cursor-not-allowed disabled:opacity-30 focus-ring"
          aria-label={`Regenerate ${definition.label}`}
        >
          {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>
      </summary>
      <div className="border-t border-[var(--ds-border-subtle)] px-3 pb-3 pt-2.5">
        {showRegenerate && !editingDisabled && (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] p-2 sm:flex-row">
            <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Optional direction for this section" className="min-h-[36px] min-w-0 flex-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2.5 text-xs text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent-border)]" aria-label={`Regeneration instruction for ${definition.label}`} />
            <button type="button" disabled={regenerating} onClick={runRegeneration} className="min-h-[36px] rounded-md bg-[var(--ds-accent)] px-3 text-xs font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-50 focus-ring">Regenerate section</button>
          </div>
        )}
        {definition.kind === "text" ? (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(event) => controller.replaceSection(definition.id, event.target.value)}
            disabled={editingDisabled}
            rows={3}
            aria-label={definition.label}
            placeholder="State the intended outcome clearly"
            className="w-full resize-y rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-sm leading-relaxed text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent-border)] disabled:cursor-not-allowed disabled:opacity-70"
          />
        ) : (
          <>
            <ol className="space-y-2">
              {(Array.isArray(value) ? value : []).map((item, index, items) => (
                <PlanItemEditor
                  key={item.itemId || item.id}
                  item={item}
                  index={index}
                  count={items.length}
                  locked={editingDisabled}
                  onChange={(itemId, patch) => controller.updateItem(definition.id, itemId, patch)}
                  onRemove={(itemId) => controller.removeItem(definition.id, itemId)}
                  onMove={(itemId, direction) => controller.reorderItem(definition.id, itemId, direction)}
                />
              ))}
            </ol>
            {!editingDisabled && (
              <button type="button" onClick={() => controller.addItem(definition.id)} className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}

function ReadinessPanel({ controller }) {
  const { readiness } = controller;
  const status = readiness?.status || "unchecked";
  const blockers = readiness?.blockers || [];
  const warnings = readiness?.warnings || [];
  const issues = [...blockers, ...warnings];
  const checkedBlocked = status === "checked" && (!readiness?.canExecute || blockers.length > 0);
  const title = status === "checking"
    ? "Checking plan readiness…"
    : status === "stale"
      ? "Plan changed — check readiness again"
      : status === "error"
        ? "Could not confirm plan readiness"
        : status === "unchecked"
          ? "Check readiness before execution"
          : checkedBlocked
            ? blockers.length
              ? `${blockers.length} issue${blockers.length === 1 ? "" : "s"} before execution`
              : "Plan is not ready to execute"
            : "Plan is ready to execute";
  const Icon = status === "checking"
    ? Loader2
    : status === "error" || blockers.length || checkedBlocked
      ? AlertTriangle
      : status === "checked"
        ? CheckCircle2
        : RefreshCw;
  return (
    <section aria-labelledby="plan-readiness-title" aria-busy={status === "checking"} className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3">
      <div className="flex items-center gap-2">
        <Icon className={cx(
          "h-4 w-4",
          status === "checking" && "animate-spin text-[var(--ds-text-secondary)]",
          (status === "error" || blockers.length || checkedBlocked) && " text-[var(--ds-danger)] ",
          status === "checked" && !checkedBlocked && !blockers.length && " text-[var(--ds-success)] ",
          ["unchecked", "stale"].includes(status) && !blockers.length && "text-[var(--ds-text-secondary)]"
        )} />
        <div className="min-w-0 flex-1">
          <h3 id="plan-readiness-title" className="text-sm font-semibold text-[var(--ds-text)]">{title}</h3>
          <p className="text-[11px] text-[var(--ds-text-muted)]">Warnings stay advisory; only predictable failures block execution.</p>
        </div>
        <button type="button" disabled={controller.readinessLoading || isEditingDisabled(controller)} onClick={() => ignoreHandledError(controller.checkReadiness())} className="rounded-md p-2 text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:opacity-50 focus-ring" aria-label="Refresh plan readiness">
          <RefreshCw className={cx("h-3.5 w-3.5", controller.readinessLoading && "animate-spin")} />
        </button>
      </div>
      {issues.length > 0 && (
        <ul className="mt-3 space-y-2">
          {issues.map((issue) => (
            <li key={`${issue.severity}-${issue.id}`} className={cx("rounded-lg border px-2.5 py-2 text-xs", issue.severity === "blocker" ? " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] " : " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] ")}>
              <div className="font-semibold">{issue.title}</div>
              {issue.message && issue.message !== issue.title && <p className="mt-0.5 leading-relaxed opacity-75">{issue.message}</p>}
              {suggestedFixLabel(issue) && <p className="mt-1 text-[11px] font-medium opacity-90">Suggested fix: {suggestedFixLabel(issue)}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AskPlan({ controller }) {
  const [question, setQuestion] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    try {
      await controller.askQuestion(question);
      setQuestion("");
    } catch (_) {
      // Keep the question available for retry; controller renders the error.
    }
  };
  return (
    <section className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3" aria-labelledby="ask-plan-title">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-[var(--ds-accent)]" />
        <h3 id="ask-plan-title" className="text-sm font-semibold text-[var(--ds-text)]">Ask about this plan</h3>
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Why is this needed, or can it be simplified?" className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 text-sm text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-accent-border)]" aria-label="Question about the current plan" />
        <button type="submit" disabled={!question.trim() || controller.askState.status === "asking"} className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-[var(--ds-fill-hover)] text-[var(--ds-text)] hover:bg-[var(--ds-fill-active)] disabled:opacity-40 focus-ring" aria-label="Ask question">
          {controller.askState.status === "asking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {controller.askState.answer && (
        <div className="mt-3 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] p-3 text-xs leading-relaxed text-[var(--ds-text)]">
          <p>{controller.askState.answer}</p>
          {controller.askState.proposedOperations.length > 0 && (
            <button type="button" disabled={isEditingDisabled(controller)} onClick={() => ignoreHandledError(controller.applyProposedOperations())} className="mt-2 min-h-[34px] rounded-md bg-[var(--ds-accent)] px-3 text-xs font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--ds-fill-hover)] disabled:text-[var(--ds-text-muted)] focus-ring">Apply suggested changes</button>
          )}
        </div>
      )}
      {controller.askState.error && <p role="alert" className="mt-2 text-xs text-[var(--ds-danger)] ">{controller.askState.error.message || "The plan question could not be answered."}</p>}
    </section>
  );
}

const RUNNING_PLAN_STATUSES = new Set(["queued", "running", "blocked", "paused"]);
const PAUSABLE_PLAN_STATUSES = new Set(["queued", "running", "blocked"]);

function planStatusLabel(status) {
  return String(status || "draft").replaceAll("_", " ");
}

function PlanLifecycle({ controller }) {
  const lifecycle = controller.lifecycle;
  const run = lifecycle?.run;
  const status = run?.status || lifecycle?.status || controller.plan?.status || "draft";
  const events = Array.isArray(lifecycle?.events) ? lifecycle.events.slice(-6).reverse() : [];
  const actionPending = Boolean(controller.lifecycleAction);
  const canPause = run && PAUSABLE_PLAN_STATUSES.has(run.status);
  const canResume = run?.status === "paused";
  const canCancel = run && RUNNING_PLAN_STATUSES.has(run.status);
  const statusTone = ["completed"].includes(status)
    ? " border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)]  text-[var(--ds-success)] "
    : ["failed", "cancelled", "blocked"].includes(status)
      ? " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] "
      : ["queued", "running", "paused"].includes(status)
        ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]"
        : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]";

  return (
    <section aria-labelledby="plan-lifecycle-title" className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 id="plan-lifecycle-title" className="text-sm font-semibold text-[var(--ds-text)]">Plan lifecycle</h3>
          <p className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
            {lifecycle?.revisionId || `v${controller.plan?.version || 1}`}
            {lifecycle?.approval ? " · approved revision" : " · awaiting approval"}
          </p>
        </div>
        <span className={cx("rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", statusTone)}>
          {planStatusLabel(status)}
        </span>
      </div>

      {events.length > 0 && (
        <ol className="mt-3 space-y-2 border-l border-[var(--ds-border-subtle)] pl-3" aria-label="Recent plan run events">
          {events.map((event) => (
            <li key={event.eventId || event.sequence} className="relative text-[11px] text-[var(--ds-text-secondary)]">
              <span className="absolute -left-[15px] top-1 h-1.5 w-1.5 rounded-full bg-[var(--ds-accent)]" />
              <p className="font-medium text-[var(--ds-text)]">{event.message || planStatusLabel(event.type)}</p>
              {versionDateLabel(event.occurredAt) && <time className="text-[10px] text-[var(--ds-text-muted)]">{versionDateLabel(event.occurredAt)}</time>}
            </li>
          ))}
        </ol>
      )}

      {run && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--ds-border-subtle)] pt-3">
          {canPause && (
            <button type="button" disabled={actionPending} onClick={() => ignoreHandledError(controller.pauseRun())} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-[var(--ds-fill-hover)] px-2.5 text-xs font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)] disabled:opacity-40 focus-ring">
              {controller.lifecycleAction === "pause" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3 w-3" />} Pause
            </button>
          )}
          {canResume && (
            <button type="button" disabled={actionPending} onClick={() => ignoreHandledError(controller.resumeRun())} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-[var(--ds-accent-soft)] px-2.5 text-xs font-semibold text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)] disabled:opacity-40 focus-ring">
              {controller.lifecycleAction === "resume" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Resume
            </button>
          )}
          {canCancel && (
            <button type="button" disabled={actionPending} onClick={() => ignoreHandledError(controller.cancelRun())} className="ml-auto inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] disabled:opacity-40 focus-ring">
              {controller.lifecycleAction === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--ds-text-muted)]">Run state and history are saved on the server and restored after reload.</p>
    </section>
  );
}

function PlanHistory({ controller }) {
  const [open, setOpen] = useState(false);
  const { loadVersions, versions, versionsError, versionsLoading } = controller;
  useEffect(() => {
    if (open && !versions.length && !versionsLoading && !versionsError) loadVersions().catch(() => {});
  }, [loadVersions, open, versions.length, versionsError, versionsLoading]);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)]">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-[var(--ds-text-secondary)] focus-ring">
        <History className="h-3.5 w-3.5 text-[var(--ds-text-muted)]" /> Version history
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-[var(--ds-text-muted)]" />
      </summary>
      <div className="border-t border-[var(--ds-border-subtle)] p-2">
        {versionsError && (
          <div role="alert" className="mb-2 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] p-2 text-xs text-[var(--ds-danger)] ">
            <p>{versionsError.message || "Version history could not be loaded."}</p>
            <button type="button" disabled={versionsLoading} onClick={() => ignoreHandledError(loadVersions())} className="mt-1 min-h-[32px] rounded-md px-2 font-semibold text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] disabled:opacity-50 focus-ring">Retry history</button>
          </div>
        )}
        {controller.restoreError && (
          <div role="alert" className="mb-2 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] p-2 text-xs text-[var(--ds-danger)] ">
            {controller.restoreError.message || "That version could not be restored. Your current plan was kept."}
          </div>
        )}
        {versionsLoading ? <p className="p-2 text-xs text-[var(--ds-text-muted)]">Loading versions…</p> : versions.length ? (
          <ul className="space-y-1">
            {versions.map((version) => {
              const versionKey = `${version.version}:${version.hash || ""}`;
              const restoring = controller.restoringVersion === versionKey;
              return (
              <li key={`${version.version}-${version.hash || ""}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-subtle)]">
                <span className="min-w-0 flex-1">Version {version.version}{versionDateLabel(version.createdAt) ? ` · ${versionDateLabel(version.createdAt)}` : ""}</span>
                <button type="button" disabled={isEditingDisabled(controller) || Boolean(controller.restoringVersion)} onClick={() => ignoreHandledError(controller.restoreVersion(version.version, version.hash))} className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 focus-ring">
                  {restoring && <Loader2 className="h-3 w-3 animate-spin" />}{restoring ? "Restoring…" : "Restore"}
                </button>
              </li>
              );
            })}
          </ul>
        ) : !versionsError && <p className="p-2 text-xs text-[var(--ds-text-muted)]">No earlier versions yet.</p>}
      </div>
    </details>
  );
}

export function PlanWorkspaceView({ controller, onUseTemplate, onViewProgress }) {
  if (controller.loadState === "loading" && !controller.plan) {
    return <div className="flex min-h-full items-center justify-center gap-2 text-sm text-[var(--ds-text-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved plan…</div>;
  }
  if (!controller.plan) {
    if (controller.loadState === "error") {
      return <div className="mx-auto max-w-xl p-6 text-center"><AlertTriangle className="mx-auto h-5 w-5 text-[var(--ds-danger)] " /><h2 className="mt-3 text-base font-semibold text-[var(--ds-text)]">The plan could not be restored</h2><p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{controller.loadError?.message || "Check the connection, then retry from the original request."}</p></div>;
    }
    return <EmptyPlan onUseTemplate={onUseTemplate} />;
  }

  const capabilities = controller.plan.capabilities || [];
  const executionStatus = controller.executionState.status;
  const isExecuting = isPlanExecutionActive(executionStatus);
  const lifecycleRun = controller.lifecycle?.run;
  const hasDurableRun = Boolean(lifecycleRun?.runId);
  const progressTaskId = String(
    lifecycleRun?.runtime?.taskId || (!hasDurableRun ? controller.executionState.taskId : "") || ""
  );
  const hasAcceptedTask = hasDurableRun || Boolean(controller.executionState.taskId);
  const activeDurableRun = RUNNING_PLAN_STATUSES.has(lifecycleRun?.status);
  const readinessStatus = controller.readiness?.status || "unchecked";
  const isBlocked = readinessStatus === "checked" && (
    !controller.readiness?.canExecute || (controller.readiness?.blockers || []).length > 0
  );
  const needsReadinessCheck = readinessStatus !== "checked";
  const executionActionLabel = hasDurableRun && !progressTaskId
    ? `Run ${planStatusLabel(lifecycleRun.status)}`
    : executionStatus === "checking"
    ? "Checking readiness…"
    : executionStatus === "starting"
      ? "Starting execution…"
      : hasAcceptedTask && executionStatus === "succeeded"
        ? "Review result"
        : hasAcceptedTask && ["failed", "cancelled"].includes(executionStatus)
          ? "View result"
          : hasAcceptedTask
            ? "View progress"
            : needsReadinessCheck
              ? "Check & Execute"
              : "Execute Plan";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] px-4 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-5xl items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ds-accent)]">Review plan</div>
            <h2 className="mt-0.5 truncate text-base font-semibold text-[var(--ds-text)]">{controller.plan.sections?.goal || "NexusRBX execution plan"}</h2>
            <p className="mt-1 hidden text-[11px] text-[var(--ds-text-muted)] sm:block">Request → Clarify → <span className="text-[var(--ds-text-secondary)]">Review Plan</span> → Execute → Verify</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ds-text-secondary)]">
              {controller.lifecycle?.revisionId || `v${controller.plan.version}`} · {planStatusLabel(lifecycleRun?.status || controller.lifecycle?.status || controller.plan.status)}
            </span>
            <SaveState status={controller.saveStatus} loadState={controller.loadState} />
            {(controller.saveStatus === "error" || controller.saveStatus === "conflict") && <button type="button" onClick={() => ignoreHandledError(controller.retrySave())} className="text-[11px] font-semibold text-[var(--ds-danger)] hover:text-[var(--ds-text)] focus-ring">Retry save</button>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-2" aria-label="Editable plan sections">
          {controller.loadState === "recovered" && <div role="status" className="rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-warning)] ">Recovered your newer local edits. They will sync when the connection is available.</div>}
          {controller.loadState === "reconnecting" && <div role="status" className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text-secondary)]">Connection interrupted. Your plan is saved locally and will remain editable.</div>}
          {controller.editingLocked && <div role="status" className="rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2 text-xs text-[var(--ds-text)]">Plan editing is briefly paused while NexusRBX checks or applies this exact version.</div>}
          {activeDurableRun && !controller.editingLocked && <div role="status" className="rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2 text-xs text-[var(--ds-text)]">This approved revision is locked while its durable run is {planStatusLabel(lifecycleRun.status)}. Pause, resume, or cancel it from the lifecycle card.</div>}
          {PLAN_SECTION_DEFINITIONS.map((definition) => <PlanSection key={definition.id} definition={definition} controller={controller} />)}
        </main>

        <aside className="space-y-3 lg:sticky lg:top-[84px] lg:self-start">
          <PlanLifecycle controller={controller} />
          <ReadinessPanel controller={controller} />
          <AskPlan controller={controller} />
          <details className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)]">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-[var(--ds-text-secondary)] focus-ring">Advanced context <ChevronDown className="ml-auto h-3.5 w-3.5 text-[var(--ds-text-muted)]" /></summary>
            <div className="space-y-3 border-t border-[var(--ds-border-subtle)] p-3 text-xs text-[var(--ds-text-secondary)]">
              <div><div className="mb-1 font-semibold text-[var(--ds-text-secondary)]">Target</div><p>{controller.plan.targeting?.projectId || "Uses the selected workspace project"}</p><p>{controller.plan.requiresStudio ? "Studio connection required" : "Studio optional"}</p></div>
              <div><div className="mb-1 font-semibold text-[var(--ds-text-secondary)]">Capabilities</div>{capabilities.length ? <ul className="space-y-1">{capabilities.map((capability) => {
                const status = capability.available === true
                  ? "Available"
                  : capability.available === false
                    ? "Unavailable"
                    : "Pending readiness";
                return <li key={capability.id} className={capability.available === false ? " text-[var(--ds-danger)] " : "text-[var(--ds-text-secondary)]"}>{status}: {capability.label}</li>;
              })}</ul> : <p>Resolved during readiness checking.</p>}</div>
            </div>
          </details>
          <PlanHistory controller={controller} />
          <button
            type="button"
            onClick={() => {
              if (progressTaskId) onViewProgress?.(progressTaskId);
              else if (hasDurableRun) return;
              else ignoreHandledError(controller.execute());
            }}
            disabled={(hasDurableRun && !progressTaskId) || (!hasAcceptedTask && (isExecuting || isBlocked || controller.saveStatus === "saving" || isEditingDisabled(controller)))}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--ds-accent)] px-4 text-sm font-semibold text-[var(--ds-accent-foreground)] transition-colors hover:bg-[var(--ds-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--ds-fill-hover)] disabled:text-[var(--ds-text-muted)] focus-ring"
          >
            {isExecuting && !hasAcceptedTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {executionActionLabel}
          </button>
          {hasAcceptedTask && (
            <p className="px-1 text-center text-[11px] text-[var(--ds-text-muted)]">
              Plan v{lifecycleRun?.version || controller.executionState.version} is {planStatusLabel(lifecycleRun?.status || executionStatus)}. This exact approved revision cannot be started again.
            </p>
          )}
          {!hasAcceptedTask && isBlocked && <p className="px-1 text-center text-[11px] text-[var(--ds-text-muted)]">Resolve the blocking readiness issue above to execute safely.</p>}
          {controller.executionState.error && <p role="alert" className="rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] p-2 text-xs text-[var(--ds-danger)] ">{controller.executionState.error.message || "Execution could not start."}</p>}
        </aside>
      </div>
    </div>
  );
}

export default function PlanWorkspace(props) {
  const controller = usePlanWorkspace(props);
  return <PlanWorkspaceView controller={controller} onUseTemplate={props.onUseTemplate} onViewProgress={props.onViewProgress} />;
}
