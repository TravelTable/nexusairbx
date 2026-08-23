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
import {
  getAuthorizedTaskActions,
  isTaskTerminal,
} from "../../../hooks/useTaskRuntime";

const COMPLETE_STEP_STATUSES = new Set(["succeeded", "skipped"]);
const ACTIVE_STEP_STATUSES = new Set(["running", "waiting", "verifying"]);

const CHECKLIST_PRESENTATION = Object.freeze({
  pending: {
    label: "Pending",
    icon: Circle,
    className: "text-[var(--ds-text-secondary)]",
    iconClassName: "text-[var(--ds-text-muted)]",
  },
  in_progress: {
    label: "In progress",
    icon: Loader2,
    className: "text-[var(--ds-accent)]",
    iconClassName: "animate-spin text-[var(--ds-accent)]",
  },
  waiting_studio: {
    label: "Waiting for Studio",
    icon: Clock,
    className: " text-[var(--ds-warning)] ",
    iconClassName: " text-[var(--ds-warning)] ",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: " text-[var(--ds-success)] ",
    iconClassName: " text-[var(--ds-success)] ",
  },
  skipped: {
    label: "Skipped",
    icon: StopCircle,
    className: "text-[var(--ds-text-secondary)]",
    iconClassName: "text-[var(--ds-text-muted)]",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: " text-[var(--ds-danger)] ",
    iconClassName: " text-[var(--ds-danger)] ",
  },
  needs_input: {
    label: "Needs user input",
    icon: AlertTriangle,
    className: " text-[var(--ds-warning)] ",
    iconClassName: " text-[var(--ds-warning)] ",
  },
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
    eyebrow: "Task finished",
    title: "The task reached a terminal state",
    body: "Review the recorded checks below to see what was verified and what may still need testing.",
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
  active:
    "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]",
  waiting:
    " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] ",
  success:
    " border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)]  text-[var(--ds-success)] ",
  danger:
    " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] ",
  neutral:
    "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text)]",
});

const STRUCTURED_STATUS_COPY = Object.freeze({
  completed: {
    eyebrow: "Completed",
    title: "Task completed with required checks",
    body: "The recorded automated acceptance checks passed.",
    tone: "success",
  },
  diagnosed: {
    eyebrow: "Diagnosis complete",
    title: "The issue was diagnosed",
    body: "The evidence and likely cause are recorded below; no unverified fix is being claimed.",
    tone: "success",
  },
  fixed_verified: {
    eyebrow: "Verified completion",
    title: "Task completed and verified",
    body: "The fix passed the required recorded verification.",
    tone: "success",
  },
  partial: {
    eyebrow: "Partially completed",
    title: "Some required checks are still incomplete",
    body: "Review the failed or unperformed checks before treating the task as complete.",
    tone: "waiting",
  },
  blocked: {
    eyebrow: "Blocked safely",
    title: "The task stopped at a safety gate",
    body: "The unresolved problem is recorded below. Unsafe Studio changes were not queued.",
    tone: "danger",
  },
  manual_verification_required: {
    eyebrow: "Manual check required",
    title: "Changes saved; test the behavior in Studio",
    body: "Automated checks passed, but the requested behavior still needs the recorded Studio playtest.",
    tone: "waiting",
  },
});

function firstString(...values) {
  const value = values.find(
    (entry) => typeof entry === "string" && entry.trim(),
  );
  return value ? value.trim() : "";
}

function safeDisplayText(...values) {
  const text = firstString(...values)
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.startsWith("[") || text.startsWith("{")) return "";
  if (
    /\b(?:stack trace|exception)\b/i.test(text) ||
    /(?:^|\s)at\s+[\w$.<>]+\s*\(/.test(text)
  )
    return "";
  return text.slice(0, 500);
}

function normalizedStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function structuredResultFor(task) {
  const candidates = [
    task?.taskResult,
    task?.result?.taskResult,
    task?.pendingResult?.taskResult,
    task?.result,
  ];
  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        STRUCTURED_STATUS_COPY[normalizedStatus(candidate.status)] &&
        (candidate.schemaVersion ||
          Array.isArray(candidate.acceptanceChecks) ||
          candidate.verification),
    ) || null
  );
}

function checklistStatus(step, task) {
  const status = normalizedStatus(step?.status);
  const taskStatus = normalizedStatus(task?.status);
  const stepId = firstString(step?.stepId, step?.id);
  const currentStepId = firstString(
    task?.currentStepId,
    task?.currentStep?.stepId,
    task?.currentStep?.id,
  );
  const isCurrent = Boolean(
    stepId && currentStepId && stepId === currentStepId,
  );
  const waitingHint = JSON.stringify({
    statusReason: task?.statusReason,
    waitingReason: task?.waitingReason,
    stepWaitingReason: step?.waitingReason,
    blocker: task?.unresolvedBlocker || task?.blocker,
  }).toLowerCase();

  if (status === "succeeded") return "completed";
  if (status === "skipped" || status === "cancelled") return "skipped";
  if (status === "failed") return "failed";
  if (
    (status === "waiting" || isCurrent) &&
    (taskStatus === "blocked_studio" || waitingHint.includes("studio"))
  ) {
    return "waiting_studio";
  }
  if (
    (status === "waiting" || isCurrent) &&
    (taskStatus === "waiting_user" ||
      /user|clarif|confirm|approval/.test(waitingHint))
  ) {
    return "needs_input";
  }
  if (["running", "verifying", "waiting"].includes(status))
    return "in_progress";
  return "pending";
}

function checklistTitle(step, index) {
  return (
    safeDisplayText(
      step?.planTitle,
      step?.input?.planTitle,
      step?.input?.title,
      step?.description,
      step?.summary,
      step?.title,
    ) || `Plan step ${index + 1}`
  );
}

function failedStepSummary(task, steps, actions) {
  const failedStep =
    steps.find((step) => normalizedStatus(step?.status) === "failed") ||
    (normalizedStatus(task?.status) === "failed"
      ? currentStepFor(task, steps)
      : null);
  if (!failedStep && normalizedStatus(task?.status) !== "failed") return null;
  const error =
    failedStep?.error ||
    failedStep?.output?.error ||
    task?.finalError ||
    task?.error ||
    null;
  const reason =
    safeDisplayText(error?.safeMessage, error?.message, task?.statusReason) ||
    "The runtime stopped before this step could be verified.";
  const recovery = safeDisplayText(
    error?.recovery?.label,
    error?.recovery?.action,
    error?.resolution?.label,
    error?.resolution,
    task?.recoveryAction,
  );
  const automaticRetry = normalizedStatus(task?.status) === "retry_scheduled";
  const retryable = Boolean(
    error?.retryable || actions.retry || automaticRetry,
  );
  return {
    title: checklistTitle(
      failedStep || {},
      Math.max(0, steps.indexOf(failedStep)),
    ),
    reason,
    recovery,
    automaticRetry,
    retryable,
  };
}

function currentStepFor(task, steps) {
  const currentStepId = firstString(
    task?.currentStepId,
    task?.currentStep?.stepId,
    task?.currentStep?.id,
  );
  return (
    steps.find(
      (step) => firstString(step?.stepId, step?.id) === currentStepId,
    ) ||
    steps.find((step) =>
      ACTIVE_STEP_STATUSES.has(normalizedStatus(step?.status)),
    ) ||
    steps.find(
      (step) => !COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)),
    ) ||
    null
  );
}

function statusPresentation(task, currentStep, structuredResult) {
  const status = normalizedStatus(task?.status) || "accepted";
  const structuredCopy =
    STRUCTURED_STATUS_COPY[normalizedStatus(structuredResult?.status)];
  if (structuredCopy && isTaskTerminal(task)) return structuredCopy;
  const base = STATUS_COPY[status] || STATUS_COPY.accepted;
  const currentDescription = safeDisplayText(
    currentStep?.description,
    currentStep?.summary,
    currentStep?.title,
    task?.currentStep?.description,
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
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
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
  if (state === "connecting")
    return "Restoring saved task progress and connecting to live updates.";
  if (state === "reconnecting")
    return "Live updates paused. Progress is saved and reconnecting automatically.";
  if (state === "polling")
    return "Live updates paused. Saved progress is being checked periodically.";
  if (state === "offline")
    return "Progress is saved, but the task service is currently unreachable.";
  return null;
}

function meaningfulEventMessages(events) {
  const messages = [];
  const seen = new Set();
  [...(Array.isArray(events) ? events : [])].reverse().forEach((event) => {
    if (messages.length >= 3) return;
    const payload =
      event?.payload && typeof event.payload === "object" ? event.payload : {};
    const message = safeDisplayText(
      payload.userMessage,
      payload.safeMessage,
      payload.progressMessage,
      payload.summary,
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
  return [
    ...new Set(
      values
        .map((value) => safeDisplayText(String(value || "")))
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

function findingLabel(finding) {
  if (typeof finding === "string") return safeDisplayText(finding);
  return safeDisplayText(
    finding?.explanation,
    finding?.message,
    finding?.remediation,
    finding?.code,
  );
}

function changeLabel(change) {
  if (typeof change === "string") return safeDisplayText(change);
  const summary = safeDisplayText(change?.summary, change?.type);
  const paths = uniqueDetails(
    Array.isArray(change?.paths) ? change.paths : [change?.path],
  );
  return [summary, paths.length ? paths.join(", ") : ""]
    .filter(Boolean)
    .join(" — ");
}

function technicalProjection(task, steps, events) {
  const completed = steps.filter((step) =>
    COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)),
  );
  const pending = steps.filter(
    (step) => !COMPLETE_STEP_STATUSES.has(normalizedStatus(step?.status)),
  );
  const retriesFromSteps = steps.reduce(
    (total, step) =>
      total + Math.max(0, numericValue(step?.attemptCount, step?.attempt) - 1),
    0,
  );
  const operationIds = uniqueDetails(
    steps.map(
      (step) =>
        step?.operationId ||
        step?.operation?.operationId ||
        step?.operation?.id,
    ),
  );
  const commandStates = uniqueDetails(
    steps.map((step) => {
      const state =
        step?.commandState ||
        step?.commandStatus ||
        step?.command?.status ||
        step?.output?.commandState;
      const stepId = firstString(step?.stepId, step?.id);
      return state ? `${stepId || "step"}: ${state}` : "";
    }),
  );
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
    ...(Array.isArray(events) ? events : []).map((event) =>
      numericValue(event?.sequence),
    ),
  );
  const verificationCount =
    steps.filter((step) => step?.verification).length +
    (Array.isArray(task?.finalEvidence) ? task.finalEvidence.length : 0);
  const error = task?.finalError || task?.error || null;
  const errorCode = safeDisplayText(error?.code, error?.errorCode);
  const errorCategory = safeDisplayText(error?.category);
  const requestId = safeDisplayText(
    error?.requestId,
    task?.requestId,
    task?.correlation?.requestId,
  );
  const recovery = safeDisplayText(
    error?.recovery?.action,
    error?.recovery,
    error?.resolution,
  );

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
  if (children === null || children === undefined || children === "")
    return null;
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-1.5 text-[11px]">
      <dt className="text-[var(--ds-text-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-[var(--ds-text-secondary)]">
        {children}
      </dd>
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
  return (
    blob.includes("price") ||
    blob.includes("robux") ||
    blob.includes("game_pass") ||
    blob.includes("gamepass")
  );
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
  const steps = useMemo(
    () => (Array.isArray(task?.steps) ? task.steps : []),
    [task?.steps],
  );
  const currentStep = useMemo(() => currentStepFor(task, steps), [task, steps]);
  const structuredResult = useMemo(() => structuredResultFor(task), [task]);
  const presentation = useMemo(
    () => statusPresentation(task, currentStep, structuredResult),
    [task, currentStep, structuredResult],
  );
  const recentMessages = useMemo(
    () => meaningfulEventMessages(events),
    [events],
  );
  const details = useMemo(
    () => technicalProjection(task, steps, events),
    [task, steps, events],
  );
  const actions = useMemo(() => getAuthorizedTaskActions(task), [task]);
  const failedSummary = useMemo(
    () => failedStepSummary(task, steps, actions),
    [task, steps, actions],
  );
  const showPriceField = useMemo(() => needsPriceClarification(task), [task]);

  if (!task?.taskId) return null;

  const terminal = isTaskTerminal(task);
  const connectionMessage = connectionPresentation(connectionState, terminal);
  const completedCount = details.completed.length;
  const progressPercent = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;
  const displayedError = task?.finalError || task?.error || error;
  const finalSummary = safeDisplayText(
    task?.finalSummary,
    task?.summary,
    task?.resultSummary,
  );
  const actionBusy = Boolean(busyAction);
  const parsedPrice = Number(priceRobux);
  const hasValidPrice =
    Number.isSafeInteger(parsedPrice) &&
    parsedPrice >= 1 &&
    parsedPrice <= 1_000_000_000;
  const canSubmitAmendment =
    actions.amend &&
    onAmend &&
    (amendment.trim() || hasValidPrice) &&
    !actionBusy;

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
      className={`rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 space-y-3 ${!terminal ? "nx-soft-depth-active" : ""} ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        {presentation.tone === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--ds-success)] " />
        ) : presentation.tone === "danger" ? (
          <AlertTriangle className="h-4 w-4 text-[var(--ds-danger)] " />
        ) : terminal ? (
          <StopCircle className="h-4 w-4 text-[var(--ds-text-secondary)]" />
        ) : (
          <ListChecks className="h-4 w-4 text-[var(--ds-accent)]" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
          Durable task
        </span>
        {!terminal && connectionState === "live" && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--ds-accent)]">
            <span
              className="nx-build-signal"
              data-active="true"
              aria-hidden="true"
            />
            Live
          </span>
        )}
      </div>

      <div
        className={`rounded-xl border px-3 py-3 ${TONE_CLASSES[presentation.tone]}`}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
          {presentation.eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold leading-snug">
          {presentation.title}
        </div>
        <p className="mt-1 text-xs leading-relaxed opacity-80">
          {presentation.body}
        </p>
      </div>

      {connectionMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text-secondary)]">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ds-text-secondary)]" />
          <span>{connectionMessage}</span>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-3" aria-label="Step progress">
          <div className="flex items-center justify-between text-[11px] text-[var(--ds-text-secondary)]">
            <span>
              {completedCount} of {steps.length} steps complete
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-fill-hover)]"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-full bg-[var(--ds-accent)] transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <ol className="space-y-1.5" aria-label="Plan checklist">
            {steps.map((step, index) => {
              const state = checklistStatus(step, task);
              const itemPresentation = CHECKLIST_PRESENTATION[state];
              const StepIcon = itemPresentation.icon;
              const detail = safeDisplayText(
                step?.input?.details,
                step?.details,
              );
              return (
                <li
                  key={
                    firstString(step?.planStepId, step?.stepId, step?.id) ||
                    `step-${index + 1}`
                  }
                  className="flex min-w-0 items-start gap-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2.5 py-2"
                >
                  <StepIcon
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${itemPresentation.iconClassName}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-[var(--ds-text)]">
                      {checklistTitle(step, index)}
                    </p>
                    {detail && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
                        {detail}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold ${itemPresentation.className}`}
                  >
                    {itemPresentation.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {recentMessages.length > 0 && (
        <div className="space-y-1.5 border-t border-[var(--ds-border-subtle)] pt-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
            Recent progress
          </div>
          {recentMessages.map((message) => (
            <p
              key={message}
              className="text-xs leading-relaxed text-[var(--ds-text-secondary)]"
            >
              {message}
            </p>
          ))}
        </div>
      )}

      {displayedError && (
        <div
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--ds-danger)] "
        >
          {formatTaskRuntimeError(
            displayedError,
            "The task stopped at a recoverable error.",
          )}
        </div>
      )}

      {failedSummary && (
        <div
          className="rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2.5"
          aria-label="Failed plan step"
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-danger)] ">
            Failed step
          </div>
          <p className="mt-1 text-xs font-semibold text-[var(--ds-danger)] ">
            {failedSummary.title}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-danger)] ">
            {failedSummary.reason}
          </p>
          <dl className="mt-2 space-y-1 text-[11px] text-[var(--ds-danger)] ">
            <div className="flex gap-1">
              <dt className="font-semibold">Completed:</dt>
              <dd>
                {completedCount} of {steps.length} plan steps
              </dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-semibold">Retry:</dt>
              <dd>
                {failedSummary.automaticRetry
                  ? "NexusRBX scheduled an automatic retry."
                  : failedSummary.retryable
                    ? "A safe retry is available."
                    : "NexusRBX cannot retry this automatically."}
              </dd>
            </div>
            {failedSummary.recovery && (
              <div className="flex gap-1">
                <dt className="font-semibold">Next action:</dt>
                <dd>{failedSummary.recovery}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {terminal && structuredResult && (
        <div
          className="space-y-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-3"
          aria-label="Task outcome"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
              Understanding
            </div>
            <p className="mt-1 text-xs text-[var(--ds-text)]">
              Intent:{" "}
              {safeDisplayText(structuredResult.intent) ||
                "Roblox development task"}
            </p>
          </div>

          {Array.isArray(structuredResult.acceptanceChecks) &&
            structuredResult.acceptanceChecks.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
                  Verification results
                </div>
                <ul className="mt-1.5 space-y-1">
                  {structuredResult.acceptanceChecks
                    .slice(0, 8)
                    .map((check, index) => (
                      <li
                        key={check?.id || `check-${index}`}
                        className="flex items-start justify-between gap-3 text-[11px]"
                      >
                        <span className="text-[var(--ds-text-secondary)]">
                          {safeDisplayText(check?.description, check?.id) ||
                            `Check ${index + 1}`}
                        </span>
                        <span
                          className={`shrink-0 font-bold ${
                            ["passed", "not_applicable"].includes(
                              normalizedStatus(check?.result),
                            )
                              ? " text-[var(--ds-success)] "
                              : normalizedStatus(check?.result) ===
                                  "manual_required"
                                ? " text-[var(--ds-warning)] "
                                : " text-[var(--ds-danger)] "
                          }`}
                        >
                          {normalizedStatus(check?.result).replaceAll(
                            "_",
                            " ",
                          ) || "pending"}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

          {Array.isArray(structuredResult.findings) &&
            structuredResult.findings.some(findingLabel) && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
                  Problems found
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-[var(--ds-text-secondary)]">
                  {structuredResult.findings
                    .map(findingLabel)
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                </ul>
              </div>
            )}

          {Array.isArray(structuredResult.changes) &&
            structuredResult.changes.some(changeLabel) && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
                  Changes made
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-[var(--ds-text-secondary)]">
                  {structuredResult.changes
                    .map(changeLabel)
                    .filter(Boolean)
                    .slice(0, 8)
                    .map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                </ul>
              </div>
            )}

          {Array.isArray(structuredResult.sources) &&
            structuredResult.sources.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">
                  Sources used
                </div>
                <ul className="mt-1.5 space-y-1 text-[11px]">
                  {structuredResult.sources.slice(0, 8).map((source, index) => (
                    <li
                      key={`${source?.documentId || "source"}-${source?.sectionId || index}`}
                    >
                      <a
                        href={source?.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--ds-accent)] underline decoration-[var(--ds-accent-border)] underline-offset-2"
                      >
                        {safeDisplayText(source?.heading, source?.title) ||
                          `Roblox source ${index + 1}`}
                      </a>
                      {source?.sourceTier === "supplemental" && (
                        <span className="ml-1 text-[var(--ds-warning)] ">
                          (supplemental)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {Array.isArray(structuredResult.verification?.manualRequired) &&
            structuredResult.verification.manualRequired.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-warning)] ">
                  Remaining manual steps
                </div>
                {structuredResult.verification.manualRequired
                  .slice(0, 3)
                  .map((check, index) => (
                    <div
                      key={check?.checkId || `manual-${index}`}
                      className="mt-1.5"
                    >
                      <p className="text-[11px] text-[var(--ds-warning)] ">
                        {safeDisplayText(check?.description)}
                      </p>
                      <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-[var(--ds-warning)] ">
                        {(Array.isArray(check?.steps) ? check.steps : [])
                          .slice(0, 10)
                          .map((step) => (
                            <li key={step}>{safeDisplayText(step)}</li>
                          ))}
                      </ol>
                    </div>
                  ))}
              </div>
            )}
        </div>
      )}

      {normalizedStatus(task.status) === "succeeded" && !structuredResult && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] px-3 py-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-success)] ">
            Task summary
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ds-success)] ">
            {finalSummary ||
              "The task stopped successfully. Review the recorded evidence before treating behavior as verified."}
          </p>
          <p className="mt-1.5 text-[11px] text-[var(--ds-success)] ">
            {details.verificationCount} verification record
            {details.verificationCount === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {(actions.approve && onApprove) ||
      (actions.retry && onRetry) ||
      (actions.amend && onAmend) ||
      (actions.cancel && onCancel) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
          {actions.approve && onApprove && (
            <button
              type="button"
              onClick={submitApprove}
              disabled={actionBusy || (showPriceField && !hasValidPrice)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ds-accent)] disabled:opacity-40 xl:min-h-0"
            >
              {busyAction === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {showPriceField ? "Confirm price & continue" : "Continue"}
            </button>
          )}
          {actions.retry && onRetry && (
            <button
              type="button"
              onClick={() => onRetry()}
              disabled={actionBusy}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ds-warning)] disabled:opacity-40 xl:min-h-0"
            >
              {busyAction === "retry" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Retry step
            </button>
          )}
          {actions.amend && onAmend && (
            <button
              type="button"
              onClick={() => setShowAmendment((value) => !value)}
              disabled={actionBusy}
              aria-expanded={showAmendment}
              className="min-h-11 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ds-text)] disabled:opacity-40 xl:min-h-0"
            >
              Amend instructions
            </button>
          )}
          {actions.cancel && onCancel && (
            <button
              type="button"
              onClick={() => onCancel()}
              disabled={actionBusy}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ds-danger)] disabled:opacity-40 xl:min-h-0"
            >
              {busyAction === "cancel" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Cancel task
            </button>
          )}
        </div>
      ) : null}

      {showPriceField && (actions.approve || actions.amend) && (
        <div className="space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] p-3">
          <label
            htmlFor={`task-price-${task.taskId}`}
            className="block text-[11px] font-bold text-[var(--ds-warning)] "
          >
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
            className="min-h-11 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent-border)] xl:min-h-0"
            placeholder="e.g. 199"
          />
          <p className="text-[11px] text-[var(--ds-warning)] ">
            Exact price confirmation is required. NexusRBX will not invent a
            default Robux price.
          </p>
        </div>
      )}

      {showAmendment && actions.amend && onAmend && (
        <form
          onSubmit={submitAmendment}
          className="space-y-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3"
        >
          <label
            htmlFor={`task-amend-${task.taskId}`}
            className="block text-[11px] font-bold text-[var(--ds-text-secondary)]"
          >
            Updated instruction
          </label>
          <textarea
            id={`task-amend-${task.taskId}`}
            value={amendment}
            onChange={(event) => setAmendment(event.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-xs text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent-border)]"
            placeholder="Describe what should change in the remaining plan."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAmendment(false)}
              className="min-h-11 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--ds-text-secondary)] xl:min-h-0"
            >
              Keep current plan
            </button>
            <button
              type="submit"
              disabled={!canSubmitAmendment}
              className="min-h-11 rounded-lg bg-[var(--ds-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ds-accent-foreground)] disabled:opacity-40 xl:min-h-0"
            >
              Save amendment
            </button>
          </div>
        </form>
      )}

      <details className="group border-t border-[var(--ds-border-subtle)] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]">
          <Terminal className="h-3.5 w-3.5" />
          Technical details
        </summary>
        <dl className="mt-2 divide-y divide-[var(--ds-border-subtle)] rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-1">
          <DetailRow label="Task ID">{task.taskId}</DetailRow>
          <DetailRow label="Status">
            {normalizedStatus(task.status) || "accepted"}
          </DetailRow>
          <DetailRow label="Current step">
            {firstString(
              currentStep?.stepId,
              currentStep?.id,
              task.currentStepId,
            ) || "None"}
          </DetailRow>
          <DetailRow label="Completed steps">
            {details.completed.length}
          </DetailRow>
          <DetailRow label="Pending steps">{details.pending.length}</DetailRow>
          <DetailRow label="Retries">{details.retries}</DetailRow>
          <DetailRow label="Event cursor">{details.eventCursor}</DetailRow>
          <DetailRow label="Operation IDs">
            {details.operationIds.join(", ")}
          </DetailRow>
          <DetailRow label="Command states">
            {details.commandStates.join(", ")}
          </DetailRow>
          <DetailRow label="Manifest versions">
            {details.manifestVersions.join(", ")}
          </DetailRow>
          <DetailRow label="Verification records">
            {details.verificationCount}
          </DetailRow>
          <DetailRow label="Knowledge version">
            {safeDisplayText(structuredResult?.knowledgeVersion)}
          </DetailRow>
          <DetailRow label="Result schema">
            {safeDisplayText(structuredResult?.schemaVersion)}
          </DetailRow>
          <DetailRow label="Error code">{details.errorCode}</DetailRow>
          <DetailRow label="Error category">{details.errorCategory}</DetailRow>
          <DetailRow label="Recovery">{details.recovery}</DetailRow>
          <DetailRow label="Support ID">{details.requestId}</DetailRow>
        </dl>
      </details>
    </section>
  );
}
