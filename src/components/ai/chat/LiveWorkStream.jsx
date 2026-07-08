import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, FileCode2, Loader2, RotateCcw, TerminalSquare, Wrench } from "lib/icons";
import { kindMeta } from "../workspace/workspaceMeta";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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

function statusIcon(status, reconnecting = false) {
  if (reconnecting) return <RotateCcw className="w-3.5 h-3.5 text-amber-300 motion-safe:animate-spin" />;
  if (["ready", "validated", "succeeded", "done"].includes(String(status || "").toLowerCase())) {
    return <CheckCircle2 className="w-3.5 h-3.5 text-[#00f5d4]" />;
  }
  if (["failed", "error"].includes(String(status || "").toLowerCase())) {
    return <Circle className="w-3.5 h-3.5 text-red-400 fill-red-400" />;
  }
  return <Loader2 className="w-3.5 h-3.5 text-[#00f5d4] motion-safe:animate-spin" />;
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

function ActivityIcon({ item }) {
  if (isInProgressActivity(item)) {
    return <Loader2 className="w-3.5 h-3.5 text-[#00f5d4] motion-safe:animate-spin" />;
  }
  if (item.type === "thinking" || item.type === "stage") return <TerminalSquare className="w-3.5 h-3.5 text-[#00f5d4]" />;
  if (item.type === "tool_step") return <Wrench className="w-3.5 h-3.5 text-amber-300" />;
  const meta = kindMeta(item.kind);
  const Icon = meta.icon || FileCode2;
  return <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />;
}

function ActivityRow({ item, onApproveStep, approvingStepId, pendingMessage }) {
  const isThinking = item.type === "thinking";
  const isCode = item.type === "file_chunk" || item.type === "file_ready";
  const step = item.type === "tool_step"
    ? (pendingMessage?.steps || []).find((s) => `tool-${s.id}` === item.id || s.id === item.id?.replace(/^tool-/, ""))
    : null;
  const awaiting = step?.status === "awaiting_approval";

  return (
    <div className="flex gap-2.5 transition-[background-color,opacity,transform] duration-150 ease-out motion-safe:animate-row-in motion-reduce:transition-none">
      <div className="pt-0.5 shrink-0">
        <ActivityIcon item={item} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`${isThinking ? "text-gray-200" : "text-gray-300"} text-[13px] leading-relaxed whitespace-pre-wrap`}>
          {cleanText(item.text) || item.status || "Working..."}
        </div>
        {item.path ? (
          <div className="mt-0.5 text-[11px] text-gray-600 truncate">{item.path}</div>
        ) : null}
        {item.type === "tool_step" && item.stepType ? (
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            {item.stepType}{item.status ? ` / ${item.status}` : ""}
          </div>
        ) : null}
        {awaiting && onApproveStep ? (
          <button
            type="button"
            onClick={() => onApproveStep(step)}
            disabled={approvingStepId === step.id}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100 transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40"
          >
            {approvingStepId === step.id ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" /> : <Wrench className="w-3 h-3" />}
            Approve step
          </button>
        ) : null}
        {isCode && item.code ? (
          <pre className="mt-2 max-h-52 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-gray-300 whitespace-pre">
            {codeTail(item.code)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

export default function LiveWorkStream({
  pendingMessage,
  generationStage,
  onApproveStep,
  approvingStepId,
  embedded = false,
}) {
  const streamState = pendingMessage?.streamState;
  const activity = useMemo(
    () => synthesizeActivity(streamState || {}, pendingMessage),
    [streamState, pendingMessage]
  );
  const reconnecting = pendingMessage?.streamStatus === "reconnecting" || pendingMessage?.streamStatus === "recovering";
  const backendStage = pendingMessage?.stage || generationStage || "";
  const status = reconnecting
    ? (backendStage && !/reconnect|recover/i.test(backendStage)
        ? backendStage
        : pendingMessage?.streamStatus === "recovering"
          ? "Catching up with generation..."
          : "Stream interrupted — reconnecting...")
    : backendStage || "Working...";
  const scrollerRef = useRef(null);
  const previousActivityCountRef = useRef(activity.length);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    if (!stickToBottom || !scrollerRef.current) return;
    const addedRow = activity.length > previousActivityCountRef.current;
    previousActivityCountRef.current = activity.length;
    const nextTop = scrollerRef.current.scrollHeight;
    if (
      addedRow &&
      !prefersReducedMotion() &&
      typeof scrollerRef.current.scrollTo === "function"
    ) {
      scrollerRef.current.scrollTo({ top: nextTop, behavior: "smooth" });
      return;
    }
    scrollerRef.current.scrollTop = nextTop;
  }, [activity.length, status, stickToBottom]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setStickToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
  };

  return (
    <div
      className={
        embedded
          ? "overflow-hidden"
          : "rounded-2xl border border-white/10 bg-[#0b0b0b]/90 shadow-2xl overflow-hidden"
      }
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="shrink-0">{statusIcon(status, reconnecting)}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Working</div>
          <div className="mt-0.5 text-sm font-semibold text-white truncate">{status}</div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="max-h-[34rem] overflow-y-auto px-4 py-4"
      >
        <div className="space-y-4 motion-safe:animate-row-in">
          {activity.length ? (
            activity.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                onApproveStep={onApproveStep}
                approvingStepId={approvingStepId}
                pendingMessage={pendingMessage}
              />
            ))
          ) : (
            <div className="flex gap-2.5 text-[13px] text-gray-400">
              <TerminalSquare className="w-3.5 h-3.5 text-[#00f5d4] mt-0.5" />
              <span>Starting work...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
