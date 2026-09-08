import { useCallback, useMemo, useRef, useState } from "react";
import { normalizeToolStepError, upsertAgentStep } from "../../../lib/agentSteps";
import { createPendingStreamState, getPendingStreamSnapshot } from "../../../lib/streaming";

/**
 * One in-flight UI Creator turn, shaped like the main agent page's pending
 * message so `MessageList` / `LiveWorkStream` / `AgentStepList` render it
 * unchanged. The pipeline is driven client-side (generate -> apply -> capture
 * -> render); every step carries the real status and evidence of that phase.
 */

export const UI_RUN_STEP = Object.freeze({
  generate: Object.freeze({ id: "generate_ui", type: "generate_ui", label: "Generate UI revision" }),
  apply: Object.freeze({ id: "apply_artifact", type: "apply_artifact", label: "Apply to Studio" }),
  capture: Object.freeze({ id: "capture_ui", type: "capture_ui", label: "Capture ScreenGui in Studio" }),
  render: Object.freeze({ id: "render_preview", type: "render_preview", label: "Render preview" }),
});

export const UI_RUN_STAGE = Object.freeze({
  generating: "Generating UI revision...",
  applying: "Applying to Studio...",
  approval: "Waiting for Studio approval...",
  capturing: "Capturing ScreenGui...",
  rendering: "Rendering preview...",
});

/** Message metadata for UI turns. Never `build`: that projection strips steps. */
export const UI_RUN_MESSAGE_METADATA = Object.freeze({ mode: "ui", responseKind: "ask" });

const TERMINAL = new Set(["succeeded", "failed", "blocked"]);

function newRequestId() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `ui-run-${Date.now().toString(36)}-${random}`;
}

export function buildUiRunPendingMessage(run) {
  if (!run) return null;
  return {
    id: `ui-run:${run.requestId}`,
    requestId: run.requestId,
    role: "assistant",
    pending: true,
    type: "chat",
    prompt: run.prompt || "",
    stage: run.stage || "",
    steps: run.steps,
    streamState: getPendingStreamSnapshot(run.streamState),
    metadata: UI_RUN_MESSAGE_METADATA,
  };
}

export function buildUiRunMessage(run, { content = "", error = null, createdAt = new Date().toISOString() } = {}) {
  const message = {
    id: `ui-run:${run.requestId}`,
    requestId: run.requestId,
    role: "assistant",
    content,
    steps: run.steps,
    createdAt,
    metadata: UI_RUN_MESSAGE_METADATA,
  };
  if (run.draftId) message.draftId = run.draftId;
  if (error) message.error = error;
  return message;
}

export default function useUiCreatorRun() {
  const [run, setRun] = useState(null);
  const [completed, setCompleted] = useState([]);
  // The ref is the source of truth for the orchestration code, which updates a
  // run several times within one tick; React state mirrors it for rendering.
  const runRef = useRef(null);

  const commit = useCallback((updater) => {
    const next = updater(runRef.current);
    runRef.current = next;
    setRun(next);
    return next;
  }, []);

  const begin = useCallback(({ prompt = "", steps = [], stage = "" } = {}) => {
    const requestId = newRequestId();
    commit(() => ({
      requestId,
      prompt: String(prompt || "").trim(),
      stage,
      steps: steps.reduce((list, step) => upsertAgentStep(list, { ...step, status: step.status || "queued" }), []),
      streamState: createPendingStreamState(),
      draftId: null,
      startedAt: Date.now(),
    }));
    return requestId;
  }, [commit]);

  const setStage = useCallback((stage) => {
    commit((current) => (current ? { ...current, stage: String(stage || "") } : current));
  }, [commit]);

  const attachDraft = useCallback((draftId) => {
    commit((current) => (current ? { ...current, draftId: draftId || null } : current));
  }, [commit]);

  const updateStep = useCallback((update) => {
    commit((current) => (current ? { ...current, steps: upsertAgentStep(current.steps, update) } : current));
  }, [commit]);

  const stepStatus = useCallback((stepId) => {
    return runRef.current?.steps.find((step) => step.id === stepId)?.status || "";
  }, []);

  const complete = useCallback((message) => {
    runRef.current = null;
    setRun(null);
    setCompleted((items) => [...items.filter((item) => item.requestId !== message.requestId), message]);
    return message;
  }, []);

  const finish = useCallback(({ content = "", error = null, step = null } = {}) => {
    const current = runRef.current;
    if (!current) return null;
    const steps = step ? upsertAgentStep(current.steps, step) : current.steps;
    return complete(buildUiRunMessage({ ...current, steps }, { content, error }));
  }, [complete]);

  const fail = useCallback((reason, { stepId = "", content = "" } = {}) => {
    const current = runRef.current;
    if (!current) return null;
    const errorText = normalizeToolStepError(reason || "The UI run could not be completed.", { code: reason?.code });
    let steps = current.steps;
    if (stepId) {
      const step = steps.find((item) => item.id === stepId);
      if (step) steps = upsertAgentStep(steps, { ...step, status: "failed", error: errorText, errorCode: reason?.code || undefined });
    }
    // Steps that never started stay `queued`: they were not attempted, and the
    // list must not imply Studio ran them.
    return complete(buildUiRunMessage({ ...current, steps }, { content, error: errorText }));
  }, [complete]);

  const isActiveNow = useCallback(() => Boolean(runRef.current), []);

  const pendingMessage = useMemo(() => buildUiRunPendingMessage(run), [run]);
  const activeStep = useMemo(() => run?.steps.find((step) => !TERMINAL.has(step.status)) || null, [run]);

  return useMemo(() => ({
    run,
    pendingMessage,
    activeStep,
    completed,
    begin,
    setStage,
    attachDraft,
    updateStep,
    stepStatus,
    finish,
    fail,
    isActive: Boolean(run),
    isActiveNow,
    requestId: run?.requestId || null,
  }), [activeStep, attachDraft, begin, completed, fail, finish, isActiveNow, pendingMessage, run, setStage, stepStatus, updateStep]);
}
