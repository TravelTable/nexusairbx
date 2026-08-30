import React, { useEffect, useMemo, useRef } from "react";
import {
  CheckCircle2,
  FileCode2,
  Loader2,
  ShieldAlert,
  TerminalSquare,
  Wrench,
  Bot,
  XCircle,
} from "lib/icons";
import { kindMeta } from "../workspace/workspaceMeta";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "../../ai-elements/chain-of-thought";
import { Shimmer } from "../../ai-elements/shimmer";
import StudioRunBlockNotice from "../workspace/StudioRunBlockNotice";

function cleanText(value = "") {
  return String(value || "").replace(/<\/?(thinking|progress)>/gi, "").trim();
}

function codeTail(value = "", maxLines = 18) {
  const lines = String(value || "").split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}

function synthesizeActivity(streamState = {}, pendingMessage = {}) {
  const out = Array.isArray(streamState.activity) ? [...streamState.activity] : [];
  const thought = cleanText(streamState.thought);
  if (thought && !out.some((item) => item?.type === "thinking")) {
    out.push({ id: "thinking-fallback", type: "thinking", text: thought });
  }
  for (const file of streamState.files || pendingMessage.files || []) {
    if (out.some((item) => item?.fileId === file.id || (item?.path && item.path === file.path))) continue;
    out.push({
      id: `file-${file.id || file.path}`,
      type: file.status === "ready" ? "file_ready" : "file_chunk",
      text: `${file.status === "ready" ? "Validated" : "Writing"} ${file.path || file.name}`,
      path: file.path,
      name: file.name,
      kind: file.kind,
      status: file.status,
      code: file.content,
    });
  }
  for (const step of pendingMessage.steps || []) {
    if (out.some((item) => item?.id === `tool-${step.id}` || item?.id === step.id)) continue;
    out.push({
      id: `tool-${step.id || step.type}`,
      type: "tool_step",
      text: step.label || step.type,
      status: step.status,
      stepType: step.type,
      path: step.result?.path || "",
    });
  }
  return out;
}

const IN_PROGRESS_STATUSES = new Set([
  "running",
  "writing",
  "delivered",
  "reconnecting",
  "recovering",
]);

function isInProgressActivity(item) {
  const status = String(item?.status || "").toLowerCase();
  if (IN_PROGRESS_STATUSES.has(status)) return true;
  if (item?.type === "file_chunk" || item?.type === "file_start") return true;
  if (item?.type === "tool_step" && status && !["succeeded", "failed", "done", "validated", "ready"].includes(status)) {
    return true;
  }
  return false;
}

function activityMotionStatus(item) {
  const status = String(item?.status || "").toLowerCase();
  if (["failed", "error", "cancelled", "timed_out"].includes(status)) return "error";
  if (["awaiting_approval", "blocked", "waiting", "input_required"].includes(status)) return "waiting";
  if (isInProgressActivity(item)) return "active";
  if (["pending", "idle", "not_started", "queued"].includes(status)) return "pending";
  return "complete";
}

function stepIconFor(item, motionStatus) {
  if (motionStatus === "active") return Loader2;
  if (motionStatus === "error") return XCircle;
  if (motionStatus === "waiting") return ShieldAlert;
  if (motionStatus === "pending") return Wrench;
  if (item.type === "tool_step") return CheckCircle2;
  if (item.type === "thinking" || item.type === "stage") return TerminalSquare;
  if (item.type === "file_chunk" || item.type === "file_ready" || item.type === "file_start") {
    return kindMeta(item.kind).icon || FileCode2;
  }
  return Bot;
}

function stepDescription(item) {
  const parts = [];
  if (item.path) parts.push(item.path);
  if (item.type === "tool_step" && item.stepType) {
    parts.push(item.status ? `${item.stepType} / ${item.status}` : item.stepType);
  }
  return parts.join(" · ") || undefined;
}

export default function LiveWorkStream({
  pendingMessage,
  generationStage,
  onApproveStep,
  approvingStepId,
  hideThinkingRows = false,
}) {
  const streamState = pendingMessage?.streamState;
  const activity = useMemo(() => {
    const raw = synthesizeActivity(streamState || {}, pendingMessage);
    if (!hideThinkingRows) return raw;
    return raw.filter((item) => item?.type !== "thinking");
  }, [streamState, pendingMessage, hideThinkingRows]);
  const previousActivityStatusesRef = useRef(new Map());
  const motionEvents = new Map();

  activity.forEach((item) => {
    const itemId = String(item?.id || "");
    const motionStatus = activityMotionStatus(item);
    const previousStatus = previousActivityStatusesRef.current.get(itemId);
    if (previousStatus && previousStatus !== motionStatus) {
      if (motionStatus === "complete") {
        motionEvents.set(itemId, item.type === "file_ready" ? "file-ready" : "complete");
      } else if (motionStatus === "error") {
        motionEvents.set(itemId, "error");
      }
    }
  });

  useEffect(() => {
    previousActivityStatusesRef.current = new Map(
      activity.map((item) => [String(item?.id || ""), activityMotionStatus(item)])
    );
  }, [activity]);

  const reconnecting =
    pendingMessage?.streamStatus === "reconnecting" || pendingMessage?.streamStatus === "recovering";
  const backendStage = pendingMessage?.stage || generationStage || "";
  const status = reconnecting
    ? backendStage && !/reconnect|recover/i.test(backendStage)
      ? backendStage
      : pendingMessage?.streamStatus === "recovering"
        ? "Catching up with generation..."
        : "Stream interrupted — reconnecting..."
    : backendStage || "Working...";

  const headerLabel = status;

  return (
    <div className="w-full py-1" data-testid="live-work-stream">
      <div
        className="min-h-6 text-sm font-medium text-[var(--ds-text-secondary)]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Shimmer as="span" duration={1.8} spread={1.5}>
          {headerLabel}
        </Shimmer>
      </div>
      <ChainOfThought open className="mt-3 w-full space-y-0">
        <ChainOfThoughtContent className="mt-0 space-y-3">
          <StudioRunBlockNotice value={pendingMessage} className="mb-2" />
          {activity.map((item) => {
              const step =
                item.type === "tool_step"
                  ? (pendingMessage?.steps || []).find(
                      (s) => `tool-${s.id}` === item.id || s.id === item.id?.replace(/^tool-/, "")
                    )
                  : null;
              const awaiting = step?.status === "awaiting_approval";
              const isCode = item.type === "file_chunk" || item.type === "file_ready";
              const motionStatus = activityMotionStatus(item);
              const motionEvent = motionEvents.get(String(item?.id || "")) || "";
              const Icon = stepIconFor(item, motionStatus);
              const stepKind = /verify|validat|test/i.test(
                `${item.type || ""} ${item.stepType || ""} ${item.text || ""}`
              )
                ? "verification"
                : item.type === "file_ready"
                  ? "file"
                  : "tool";

              return (
                <ChainOfThoughtStep
                  key={item.id}
                  icon={Icon}
                  label={cleanText(item.text) || item.status || "Working..."}
                  description={stepDescription(item)}
                  status={motionStatus}
                  motionStatus={motionStatus}
                  motionEvent={motionEvent}
                  stepKind={stepKind}
                >
                  {awaiting && onApproveStep ? (
                    <button
                      type="button"
                      onClick={() => onApproveStep(step)}
                      disabled={approvingStepId === step.id}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--ds-warning)] transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40"
                    >
                      {approvingStepId === step.id ? (
                        <Loader2 className="w-3 h-3 motion-safe:animate-spin" />
                      ) : (
                        <Wrench className="w-3 h-3" />
                      )}
                      Approve step
                    </button>
                  ) : null}
                  {isCode && item.code ? (
                    <pre className="mt-1 max-h-52 overflow-auto rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)] p-3 text-[11px] leading-relaxed text-[var(--ds-text-secondary)] whitespace-pre">
                      {codeTail(item.code)}
                    </pre>
                  ) : null}
                </ChainOfThoughtStep>
              );
            })}
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}
