import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  Loader2,
  Play,
  RefreshCcw,
  StopCircle,
  Terminal,
  XCircle,
} from "lib/icons";
import { formatTaskRuntimeError } from "../../../lib/taskRuntimeApi";
import { getAuthorizedTaskActions, isTaskTerminal } from "../../../hooks/useTaskRuntime";

const COMPLETE_STEP_STATUSES = new Set(["succeeded", "skipped"]);
const ACTIVE_STEP_STATUSES = new Set(["running", "waiting", "verifying"]);

const CHECKLIST_PRESENTATION = Object.freeze({
  pending: { label: "Pending", icon: Circle, className: "text-gray-400", iconClassName: "text-gray-500" },
  in_progress: { label: "In progress", icon: Loader2, className: "text-[#b8fff3]", iconClassName: "animate-spin text-[#00f5d4]" },
  waiting_studio: { label: "Waiting for Studio", icon: Clock, className: "text-amber-100", iconClassName: "text-amber-300" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-emerald-100", iconClassName: "text-emerald-300" },
  skipped: { label: "Skipped", icon: StopCircle, className: "text-gray-400", iconClassName: "text-gray-500" },
  failed: { label: "Failed", icon: XCircle, className: "text-red-100", iconClassName: "text-red-300" },
  needs_input: { label: "Needs user input", icon: AlertTriangle, className: "text-amber-100", iconClassName: "text-amber-300" },
});

const STATUS_COPY = Object.freeze({
  queued: {
    eyebrow: "Queued",
    title: "Your request is safely queued",
    body: "It has not completed yet. Execution will begin when runtime capacity is available.",
    tone: "neutral",
  },
  accepted: {
    eyebrow: "Accepted",
    title: "Your task is saved",
    body: "The runtime accepted the request and is preparing its first durable step.",
    tone: "active",
  },
  planning: {
    eyebrow: "Planning",
    title: "Preparing the execution plan",
    body: "The runtime is choosing auditable steps before making changes.",
    tone: "active",
  },
  running: {
    eyebrow: "Executing",
    title: "Executing the approved plan",
    body: "Progress is recorded after each durable step.",
    tone: "active",
  },
  waiting_user: {
    eyebrow: "Your input is needed",
    title: "Review the next step",
    body: "The task is paused at a confirmation gate and will not continue without your input.",
    tone: "waiting",
  },
  blocked_studio: {
    eyebrow: "Studio connection needed",
    title: "Reconnect Roblox Studio",
    body: "Saved progress is intact. Reconnect the Studio bridge to resume from the blocked step.",
    tone: "waiting",
  },
  waiting_external: {
    eyebrow: "External result pending",
    title: "Waiting for an external service",
    body: "The task is paused safely and will resume when the external result arrives.",
    tone: "waiting",
  },
  retry_scheduled: {
    eyebrow: "Recovering",
    title: "A safe retry is scheduled",
    body: "The failed step remains recorded and will retry without repeating completed work.",
    tone: "waiting",
  },
  verifying: {
    eyebrow: "Verification",
    title: "Verifying the result",
    body: "The runtime is checking evidence before reporting completion.",
    tone: "active",
  },
  compensating: {
    eyebrow: "Recovery",
    title: "Restoring the last verified state",
    body: "The runtime is applying its recorded recovery steps before it stops.",
    tone: "waiting",
  },
  succeeded: {
    eyebrow: "Verified completion",
    title: "Task completed and verified",
    body: "The requested work reached a terminal state with recorded verification evidence.",
    tone: "success",
  },
  failed: {
    eyebrow: "Stopped",
    title: "The task could not be completed",
    body: "Review the typed error and use only the recovery actions authorized by the server.",
    tone: "danger",
  },
  cancelled: {
    eyebrow: "Cancelled",
    title: "Task cancelled",
    body: "No further steps will run. Completed ledger entries remain available in technical details.",
    tone: "neutral",
  },
});

const TONE_CLASSES = Object.freeze({
  active: "border-[#00f5d4]/20 bg-[#00f5d4]/[0.06] text-[#b8fff3]",
  waiting: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  danger: "border-red-400/20 bg-red-400/10 text-red-100",
  neutral: "border-white/10 bg-white/[0.04] text-gray-200",
});

function firstString(...values) {
  const value = values.find((entry) => typeof entry === "string" && entry.trim());
  return value ? value.trim() : "";
}

function safeDisplayText(...values) {
  const text = firstString(...values).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.startsWith("[") || text.startsWith("{")) return "";
  if (/\b(?:stack trace|exception)\b/i.test(text) || /(?:^|\s)at\s+[\w$.<>]+\s*\(/.test(text)) return "";
  return text.slice(0, 500);
}

function normalizedStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function checklistStatus(step, task) {
  const status = normalizedStatus(step?.status);
  const taskStatus = normalizedStatus(task?.status);
  const stepId = firstString(step?.stepId, step?.id);
  const currentStepId = firstString(task?.currentStepId, task?.currentStep?.stepId, task?.currentStep?.id);
  const isCurrent = Boolean(stepId && currentStepId && stepId === currentStepId);
  const waitingHint = JSON.stringify({
    statusReason: task?.statusReason,
    waitingReason: task?.waitingReason,
    stepWaitingReason: step?.waitingReason,
    blocker: task?.unresolvedBlocker || task?.blocker,
  }).toLowerCase();

  if (status === "succeeded") return "completed";
  if (status === "skipped" || status === "cancelled") return "skipped";
  if (status === "failed") return "failed";
  if ((status === "waiting" || isCurrent) && (taskStatus === "blocked_studio" || waitingHint.includes("studio"))) {
    return "waiting_studio";
  }
  if ((status === "waiting" || isCurrent) && (taskStatus === "waiting_user" || /user|clarif|confirm|approval/.test(waitingHint))) {
    return "needs_input";
  }
  if (["running", "verifying", "waiting"].includes(status)) return "in_progress";
  return "pending";
}

function checklistTitle(step, index) {
  return safeDisplayText(
    step?.planTitle,
    step?.input?.planTitle,
    step?.input?.title,
    step?.description,
    step?.summary,
    step?.title
  ) || `Plan step ${index + 1}`;
}

function failedStepSummary(task, steps, actions) {
  const failedStep = steps.find((step) => normalizedStatus(step?.status) === "failed")
    || (normalizedStatus(task?.status) === "failed" ? currentStepFor(task, steps) : null);
  if (!failedStep && normalizedStatus(task?.status) !== "failed") return null;
  const error = failedStep?.error || failedStep?.output?.error || task?.finalError || task?.error || null;
  const reason = safeDisplayText(error?.safeMessage, error?.message, task?.statusReason)
    || "The runtime stopped before this step could be verified.";
  const recovery = safeDisplayText(
    error?.recovery?.label,
    error?.recovery?.action,
    error?.resolution?.label,
    error?.resolution,
    task?.recoveryAction
  );
  const automaticRetry = normalizedStatus(task?.status) === "retry_scheduled";
  const retryable = Boolean(error?.retryable || actions.retry || automaticRetry);
  return {
    title: checklistTitle(failedStep || {}, Math.max(0, steps.indexOf(failedStep))),
    reason,
    recovery,
    automaticRetry,
    retryable,
  };
}

function currentStepFor(task, steps) {
  const currentStepId = firstString(task?.currentStepId, task?.currentStep?.stepId, task?.currentStep?.id);
  return steps.find((step) => firstString(step?.stepId, step?.id) === currentStepId)
    || steps.find((step) => ACTIVE_STEP_STATUSES.has(normalizedStatus(step?.status)))
    || steps.find((step) => !COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)))
    || null;
}

function statusPresentation(task, currentStep) {
  const status = normalizedStatus(task?.status) || "accepted";
  const base = STATUS_COPY[status] || STATUS_COPY.accepted;
  const currentDescription = safeDisplayText(
    currentStep?.description,
    currentStep?.summary,
    currentStep?.title,
    task?.currentStep?.description
  );
  if ((status === "running" || status === "verifying") && currentDescription) {
    return { ...base, title: currentDescription };
  }
  if (status === "waiting_external") {
    const hint = [
      task?.statusReason,
      task?.finalError?.code,
      task?.error?.code,
      currentDescription,
    ].filter(Boolean).join(" ").toLowerCase();
    if (hint.includes("moderation")) {
      return {
        ...base,
        eyebrow: "Roblox moderation pending",
        title: "Waiting for Roblox moderation",
        body: "The upload remains pending. The task will resume after Roblox returns a moderation result.",
      };
    }
    if (/roblox|asset|upload/.test(hint)) {
      return {
        ...base,
        eyebrow: "Roblox result pending",
        title: "Waiting for Roblox",
        body: "The generated asset is saved while Roblox finishes the requested operation.",
      };
    }
  }
  return base;
}

function connectionPresentation(connectionState, terminal) {
  if (terminal) return null;
  const state = normalizedStatus(connectionState);
  if (state === "connecting") return "Restoring saved task progress and connecting to live updates.";
  if (state === "reconnecting") return "Live updates paused. Progress is saved and reconnecting automatically.";
  if (state === "polling") return "Live updates paused. Saved progress is being checked periodically.";
  if (state === "offline") return "Progress is saved, but the task service is currently unreachable.";
  return null;
}

function meaningfulEventMessages(events) {
  const messages = [];
  const seen = new Set();
  [...(Array.isArray(events) ? events : [])].reverse().forEach((event) => {
    if (messages.length >= 3) return;
    const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
    const message = safeDisplayText(
      payload.userMessage,
      payload.safeMessage,
      payload.progressMessage,
      payload.summary
    );
    const key = message.toLowerCase();
    if (message && !seen.has(key)) {
      seen.add(key);
      messages.push(message);
    }
  });
  return messages.reverse();
}

function numericValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function uniqueDetails(values) {
  return [...new Set(values.map((value) => safeDisplayText(String(value || ""))).filter(Boolean))].slice(0, 12);
}

function technicalProjection(task, steps, events) {
  const completed = steps.filter((step) => COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)));
  const pending = steps.filter((step) => !COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)));
  const retriesFromSteps = steps.reduce(
    (total, step) => total + Math.max(0, numericValue(step?.attemptCount, step?.attempt) - 1),
    0
  );
  const operationIds = uniqueDetails(steps.map((step) => (
    step?.operationId || step?.operation?.operationId || step?.operation?.id
  )));
  const commandStates = uniqueDetails(steps.map((step) => {
    const state = step?.commandState || step?.commandStatus || step?.command?.status || step?.output?.commandState;
    const stepId = firstString(step?.stepId, step?.id);
    return state ? `${stepId || "step"}: ${state}` : "";
  }));
  const manifestVersions = uniqueDetails([
    task?.manifestVersion,
    task?.projectManifestVersion,
    task?.checkpoint?.manifestVersion,
    ...steps.flatMap((step) => [
      step?.manifestVersion,
      step?.output?.manifestVersion,
      step?.verification?.manifestVersion,
    ]),
  ]);
  const eventCursor = Math.max(
    numericValue(task?.eventSequence),
    ...(Array.isArray(events) ? events : []).map((event) => numericValue(event?.sequence))
  );
  const verificationCount = steps.filter((step) => step?.verification).length
    + (Array.isArray(task?.finalEvidence) ? task.finalEvidence.length : 0);
  const error = task?.finalError || task?.error || null;
  const errorCode = safeDisplayText(error?.code, error?.errorCode);
  const errorCategory = safeDisplayText(error?.category);
  const requestId = safeDisplayText(error?.requestId, task?.requestId, task?.correlation?.requestId);
  const recovery = safeDisplayText(error?.recovery?.action, error?.recovery, error?.resolution);

  return {
    completed,
    pending,
    retries: Math.max(numericValue(task?.retryCount), retriesFromSteps),
    operationIds,
    commandStates,
    manifestVersions,
    eventCursor,
    verificationCount,
    error,
    errorCode,
    errorCategory,
    requestId,
    recovery,
  };
}

function DetailRow({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-1.5 text-[11px]">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-gray-300">{children}</dd>
    </div>
  );
}

function needsPriceClarification(task) {
  if (normalizedStatus(task?.status) !== "waiting_user") return false;
  const blob = JSON.stringify({
    blocker: task?.unresolvedBlocker || task?.blocker || null,
    questions: task?.clarificationQuestions || task?.questions || null,
    classification: task?.classification || null,
    intent: task?.intent || null,
    waitingReason: task?.statusReason || task?.waitingReason || null,
  }).toLowerCase();
  return blob.includes("price") || blob.includes("robux") || blob.includes("game_pass") || blob.includes("gamepass");
}

export default function TaskProgressPanel({
  task,
  events = [],
  connectionState = "idle",
  error = null,
  busyAction = "",
  onRetry,
  onCancel,
  onAmend,
  onApprove,
  className = "",
}) {
  const [showAmendment, setShowAmendment] = useState(false);
  const [amendment, setAmendment] = useState("");
  const [priceRobux, setPriceRobux] = useState("");
  const steps = useMemo(() => (Array.isArray(task?.steps) ? task.steps : []), [task?.steps]);
  const currentStep = useMemo(() => currentStepFor(task, steps), [task, steps]);
  const presentation = useMemo(() => statusPresentation(task, currentStep), [task, currentStep]);
  const recentMessages = useMemo(() => meaningfulEventMessages(events), [events]);
  const details = useMemo(() => technicalProjection(task, steps, events), [task, steps, events]);
  const actions = useMemo(() => getAuthorizedTaskActions(task), [task]);
  const failedSummary = useMemo(() => failedStepSummary(task, steps, actions), [task, steps, actions]);
  const showPriceField = useMemo(() => needsPriceClarification(task), [task]);

  if (!task?.taskId) return null;

  const terminal = isTaskTerminal(task);
  const connectionMessage = connectionPresentation(connectionState, terminal);
  const completedCount = details.completed.length;
  const progressPercent = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
  const displayedError = task?.finalError || task?.error || error;
  const finalSummary = safeDisplayText(task?.finalSummary, task?.summary, task?.resultSummary);
  const actionBusy = Boolean(busyAction);
  const parsedPrice = Number(priceRobux);
  const hasValidPrice = Number.isSafeInteger(parsedPrice) && parsedPrice >= 1 && parsedPrice <= 1_000_000_000;
  const canSubmitAmendment = actions.amend && onAmend && (amendment.trim() || hasValidPrice) && !actionBusy;

  const submitAmendment = (event) => {
    event.preventDefault();
    if (!canSubmitAmendment) return;
    const payload = {};
    if (amendment.trim()) payload.instruction = amendment.trim();
    if (hasValidPrice) payload.priceRobux = parsedPrice;
    onAmend(payload);
    setAmendment("");
    setPriceRobux("");
    setShowAmendment(false);
  };

  const submitApprove = () => {
    if (!actions.approve || !onApprove || actionBusy) return;
    if (showPriceField) {
      if (!hasValidPrice) return;
      onApprove({ priceRobux: parsedPrice });
      return;
    }
    onApprove();
  };

  return (
    <section
      aria-label="Task progress"
      className={`rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3 ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        {presentation.tone === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        ) : presentation.tone === "danger" ? (
          <AlertTriangle className="h-4 w-4 text-red-300" />
        ) : terminal ? (
          <StopCircle className="h-4 w-4 text-gray-400" />
        ) : (
          <ListChecks className="h-4 w-4 text-[#00f5d4]" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Durable task</span>
        {!terminal && connectionState === "live" && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8fffea]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00f5d4]" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <div className={`rounded-xl border px-3 py-3 ${TONE_CLASSES[presentation.tone]}`}>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{presentation.eyebrow}</div>
        <div className="mt-1 text-sm font-semibold leading-snug">{presentation.title}</div>
        <p className="mt-1 text-xs leading-relaxed opacity-80">{presentation.body}</p>
      </div>

      {connectionMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-gray-300">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>{connectionMessage}</span>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-3" aria-label="Step progress">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>{completedCount} of {steps.length} steps complete</span>
            <span>{progressPercent}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progressPercent}
          >
            <div className="h-full rounded-full bg-[#00f5d4] transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
          <ol className="space-y-1.5" aria-label="Plan checklist">
            {steps.map((step, index) => {
              const state = checklistStatus(step, task);
              const itemPresentation = CHECKLIST_PRESENTATION[state];
              const StepIcon = itemPresentation.icon;
              const detail = safeDisplayText(step?.input?.details, step?.details);
              return (
                <li
                  key={firstString(step?.planStepId, step?.stepId, step?.id) || `step-${index + 1}`}
                  className="flex min-w-0 items-start gap-2.5 rounded-lg border border-white/[0.06] bg-black/10 px-2.5 py-2"
                >
                  <StepIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${itemPresentation.iconClassName}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-gray-200">{checklistTitle(step, index)}</p>
                    {detail && <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{detail}</p>}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold ${itemPresentation.className}`}>{itemPresentation.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {recentMessages.length > 0 && (
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Recent progress</div>
          {recentMessages.map((message) => (
            <p key={message} className="text-xs leading-relaxed text-gray-300">{message}</p>
          ))}
        </div>
      )}

      {displayedError && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
          {formatTaskRuntimeError(displayedError, "The task stopped at a recoverable error.")}
        </div>
      )}

      {failedSummary && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5" aria-label="Failed plan step">
          <div className="text-[10px] font-black uppercase tracking-widest text-red-300">Failed step</div>
          <p className="mt-1 text-xs font-semibold text-red-50">{failedSummary.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-red-100/80">{failedSummary.reason}</p>
          <dl className="mt-2 space-y-1 text-[11px] text-red-100/75">
            <div className="flex gap-1"><dt className="font-semibold">Completed:</dt><dd>{completedCount} of {steps.length} plan steps</dd></div>
            <div className="flex gap-1"><dt className="font-semibold">Retry:</dt><dd>{failedSummary.automaticRetry ? "NexusRBX scheduled an automatic retry." : failedSummary.retryable ? "A safe retry is available." : "NexusRBX cannot retry this automatically."}</dd></div>
            {failedSummary.recovery && <div className="flex gap-1"><dt className="font-semibold">Next action:</dt><dd>{failedSummary.recovery}</dd></div>}
          </dl>
        </div>
      )}

      {normalizedStatus(task.status) === "succeeded" && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Verified summary</div>
          <p className="mt-1 text-xs leading-relaxed text-emerald-50">
            {finalSummary || "The requested steps completed and the runtime recorded verification evidence."}
          </p>
          <p className="mt-1.5 text-[11px] text-emerald-200/70">
            {details.verificationCount} verification record{details.verificationCount === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {(actions.approve && onApprove) || (actions.retry && onRetry) || (actions.amend && onAmend) || (actions.cancel && onCancel) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          {actions.approve && onApprove && (
            <button
              type="button"
              onClick={submitApprove}
              disabled={actionBusy || (showPriceField && !hasValidPrice)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#b8fff3] disabled:opacity-40"
            >
              {busyAction === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {showPriceField ? "Confirm price & continue" : "Continue"}
            </button>
          )}
          {actions.retry && onRetry && (
            <button
              type="button"
              onClick={() => onRetry()}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-100 disabled:opacity-40"
            >
              {busyAction === "retry" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Retry step
            </button>
          )}
          {actions.amend && onAmend && (
            <button
              type="button"
              onClick={() => setShowAmendment((value) => !value)}
              disabled={actionBusy}
              aria-expanded={showAmendment}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-gray-200 disabled:opacity-40"
            >
              Amend instructions
            </button>
          )}
          {actions.cancel && onCancel && (
            <button
              type="button"
              onClick={() => onCancel()}
              disabled={actionBusy}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-bold text-red-100 disabled:opacity-40"
            >
              {busyAction === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
              Cancel task
            </button>
          )}
        </div>
      ) : null}

      {showPriceField && (actions.approve || actions.amend) && (
        <div className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
          <label htmlFor={`task-price-${task.taskId}`} className="block text-[11px] font-bold text-amber-100">
            Confirm game pass price (Robux)
          </label>
          <input
            id={`task-price-${task.taskId}`}
            type="number"
            min={1}
            max={1000000000}
            step={1}
            value={priceRobux}
            onChange={(event) => setPriceRobux(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#00f5d4]/40"
            placeholder="e.g. 199"
          />
          <p className="text-[11px] text-amber-100/70">
            Exact price confirmation is required. NexusRBX will not invent a default Robux price.
          </p>
        </div>
      )}

      {showAmendment && actions.amend && onAmend && (
        <form onSubmit={submitAmendment} className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
          <label htmlFor={`task-amend-${task.taskId}`} className="block text-[11px] font-bold text-gray-300">
            Updated instruction
          </label>
          <textarea
            id={`task-amend-${task.taskId}`}
            value={amendment}
            onChange={(event) => setAmendment(event.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#00f5d4]/40"
            placeholder="Describe what should change in the remaining plan."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAmendment(false)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-400"
            >
              Keep current plan
            </button>
            <button
              type="submit"
              disabled={!canSubmitAmendment}
              className="rounded-lg bg-[#00f5d4] px-2.5 py-1.5 text-[11px] font-black text-[#05110f] disabled:opacity-40"
            >
              Save amendment
            </button>
          </div>
        </form>
      )}

      <details className="group border-t border-white/5 pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-gray-200">
          <Terminal className="h-3.5 w-3.5" />
          Technical details
        </summary>
        <dl className="mt-2 divide-y divide-white/5 rounded-xl border border-white/5 bg-black/10 px-3 py-1">
          <DetailRow label="Task ID">{task.taskId}</DetailRow>
          <DetailRow label="Status">{normalizedStatus(task.status) || "accepted"}</DetailRow>
          <DetailRow label="Current step">{firstString(currentStep?.stepId, currentStep?.id, task.currentStepId) || "None"}</DetailRow>
          <DetailRow label="Completed steps">{details.completed.length}</DetailRow>
          <DetailRow label="Pending steps">{details.pending.length}</DetailRow>
          <DetailRow label="Retries">{details.retries}</DetailRow>
          <DetailRow label="Event cursor">{details.eventCursor}</DetailRow>
          <DetailRow label="Operation IDs">{details.operationIds.join(", ")}</DetailRow>
          <DetailRow label="Command states">{details.commandStates.join(", ")}</DetailRow>
          <DetailRow label="Manifest versions">{details.manifestVersions.join(", ")}</DetailRow>
          <DetailRow label="Verification records">{details.verificationCount}</DetailRow>
          <DetailRow label="Error code">{details.errorCode}</DetailRow>
          <DetailRow label="Error category">{details.errorCategory}</DetailRow>
          <DetailRow label="Recovery">{details.recovery}</DetailRow>
          <DetailRow label="Support ID">{details.requestId}</DetailRow>
        </dl>
      </details>
    </section>
  );
}
