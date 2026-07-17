import React, { useMemo } from "react";
import { FileCode2, Loader2, RotateCcw, TerminalSquare, Wrench } from "lib/icons";
import { BrainIcon } from "lucide-react";
import { kindMeta } from "../workspace/workspaceMeta";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "../../ai-elements/chain-of-thought";
import StudioTargetPicker from "../workspace/StudioTargetPicker";

function cleanText(value = "") {
  return String(value || "").replace(/<\/?(thinking|progress)>/gi, "").trim();
}

function codeTail(value = "", maxLines = 18) {
  const lines = String(value || "").split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}

function synthesizeActivity(streamState = {}, pendingMessage = {}) {
  const activity = Array.isArray(streamState.activity) ? streamState.activity : [];
  if (activity.length) return activity;

  const out = [];
  const thought = cleanText(streamState.thought);
  if (thought) out.push({ id: "thinking-fallback", type: "thinking", text: thought });
  for (const file of streamState.files || pendingMessage.files || []) {
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
  "queued",
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

function stepIconFor(item) {
  if (isInProgressActivity(item)) return Loader2;
  if (item.type === "thinking" || item.type === "stage") return TerminalSquare;
  if (item.type === "tool_step") return Wrench;
  if (item.type === "file_chunk" || item.type === "file_ready" || item.type === "file_start") {
    return kindMeta(item.kind).icon || FileCode2;
  }
  return BrainIcon;
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
  onSelectStudioTarget,
  selectingStudioTargetId,
  embedded = false,
  hideThinkingRows = false,
}) {
  const streamState = pendingMessage?.streamState;
  const activity = useMemo(() => {
    const raw = synthesizeActivity(streamState || {}, pendingMessage);
    if (!hideThinkingRows) return raw;
    return raw.filter((item) => item?.type !== "thinking");
  }, [streamState, pendingMessage, hideThinkingRows]);

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

  const headerLabel = reconnecting
    ? status
    : activity.length
      ? status
      : "Starting work...";

  return (
    <div className={embedded ? "overflow-hidden px-4 py-4" : "rounded-2xl border border-white/10 bg-[#0b0b0b]/90 shadow-2xl overflow-hidden px-4 py-4"}>
      <ChainOfThought defaultOpen className="w-full space-y-3">
        <ChainOfThoughtHeader>
          {reconnecting ? (
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="size-3.5 motion-safe:animate-spin" />
              {headerLabel}
            </span>
          ) : pendingMessage?.targetSelection ? null : (
            headerLabel
          )}
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <StudioTargetPicker
            selection={pendingMessage?.targetSelection}
            onSelect={onSelectStudioTarget}
            selectingTargetId={selectingStudioTargetId}
          />
          {activity.length ? (
            activity.map((item) => {
              const step =
                item.type === "tool_step"
                  ? (pendingMessage?.steps || []).find(
                      (s) => `tool-${s.id}` === item.id || s.id === item.id?.replace(/^tool-/, "")
                    )
                  : null;
              const awaiting = step?.status === "awaiting_approval";
              const isCode = item.type === "file_chunk" || item.type === "file_ready";
              const Icon = stepIconFor(item);

              return (
                <ChainOfThoughtStep
                  key={item.id}
                  icon={Icon}
                  label={cleanText(item.text) || item.status || "Working..."}
                  description={stepDescription(item)}
                  status={isInProgressActivity(item) ? "active" : "complete"}
                >
                  {awaiting && onApproveStep ? (
                    <button
                      type="button"
                      onClick={() => onApproveStep(step)}
                      disabled={approvingStepId === step.id}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100 transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40"
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
                    <pre className="mt-1 max-h-52 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-gray-300 whitespace-pre">
                      {codeTail(item.code)}
                    </pre>
                  ) : null}
                </ChainOfThoughtStep>
              );
            })
          ) : (
            <ChainOfThoughtStep
              icon={TerminalSquare}
              label="Starting work..."
              status="active"
            />
          )}
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}
