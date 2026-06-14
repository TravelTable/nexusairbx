import React, { useEffect } from "react";
import { NexusRBXAvatar, UserAvatar, FormatText, SkeletonArtifact } from "../AiComponents";
import { stripTags } from "./stripTags";
import MessageBubble from "./MessageBubble";
import ThinkingDisclosure from "./ThinkingDisclosure";
import { parsePendingStreamContent } from "../../../lib/streaming";
import { CheckCircle2, Circle, Clock3, Loader2, RotateCcw } from "lucide-react";

const ACTIVITY_STEPS = [
  {
    id: "understand",
    label: "Understanding task",
    matches: ["understanding", "analyzing request", "preparing job", "connecting"],
  },
  {
    id: "plan",
    label: "Planning build",
    matches: ["planning", "layout", "components", "requirements"],
  },
  {
    id: "generate",
    label: "Generating artifact",
    matches: ["generating", "writing", "code", "streaming", "building", "rendering"],
  },
  {
    id: "finalize",
    label: "Finalizing",
    matches: ["finalizing", "saving", "recovering"],
  },
];

function resolveActivityStage(pendingMessage, generationStage, parsed) {
  const stage = pendingMessage?.stage || generationStage || "";
  if (stage) return stage;
  if (parsed?.code) return "Writing code...";
  if (parsed?.explanation || pendingMessage?.streamState?.hasVisibleOutput) return "Generating response...";
  return "Understanding your task...";
}

function resolveActiveStepIndex(stage, pendingMessage, parsed) {
  const normalized = String(stage || "").toLowerCase();
  const matchedIndex = ACTIVITY_STEPS.findIndex((step) =>
    step.matches.some((match) => normalized.includes(match))
  );
  if (matchedIndex >= 0) return matchedIndex;
  if (parsed?.code || pendingMessage?.streamState?.code) return 2;
  if (parsed?.explanation || pendingMessage?.streamState?.explanation) return 2;
  return 0;
}

function PendingActivityPanel({ pendingMessage, generationStage, parsed }) {
  const stage = resolveActivityStage(pendingMessage, generationStage, parsed);
  const activeIndex = resolveActiveStepIndex(stage, pendingMessage, parsed);
  const isRecovering = String(stage).toLowerCase().includes("recovering");

  return (
    <div className="rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-white/5 bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 p-2 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4]">
              {isRecovering ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Nexus is working
              </div>
              <div className="mt-1 text-sm md:text-[15px] font-semibold text-white break-words">
                {stage}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
            <Clock3 className="w-3 h-3" />
            Live
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-3">
        {ACTIVITY_STEPS.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                  isDone
                    ? "bg-[#00f5d4] border-[#00f5d4] text-black"
                    : isActive
                      ? "bg-[#00f5d4]/10 border-[#00f5d4]/40 text-[#00f5d4]"
                      : "bg-white/5 border-white/10 text-gray-600"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>
              <div
                className={`text-xs md:text-sm font-semibold ${
                  isDone || isActive ? "text-gray-100" : "text-gray-500"
                }`}
              >
                {step.label}
              </div>
            </div>
          );
        })}

        <div className="pt-2 text-[11px] leading-relaxed text-gray-500">
          Complex generations can take a few minutes. This trace updates as the backend reports progress.
        </div>
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  pendingMessage,
  user,
  activeMode,
  generationStage,
  chatEndRef,
  onViewUi,
  onRefine,
  onFixUiAudit,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  notify,
  isBusy,
}) {
  const pendingParsed = parsePendingStreamContent(pendingMessage?.content || "");
  const hasPendingMessage = !!pendingMessage;

  useEffect(() => {
    if (!chatEndRef?.current) return;
    const scroll = () =>
      chatEndRef.current.scrollIntoView({
        behavior: hasPendingMessage ? "smooth" : "auto",
        block: "end",
      });

    const frameId =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame(scroll)
        : null;

    if (frameId == null) scroll();

    return () => {
      if (frameId != null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [messages, pendingMessage?.content, pendingMessage?.prompt, pendingMessage?.stage, hasPendingMessage, chatEndRef]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          user={user}
          activeMode={activeMode}
          onViewUi={onViewUi}
          onRefine={onRefine}
          onFixUiAudit={onFixUiAudit}
          onApprovePlan={onApprovePlan}
          onClarifySubmit={onClarifySubmit}
          onEditPlan={onEditPlan}
          notify={notify}
          isBusy={isBusy}
        />
      ))}

      {pendingMessage && (
        <>
          {pendingMessage.prompt ? (
            <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-[70%] md:max-w-[60%] order-1">
                <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl text-gray-100">
                  <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt}</div>
                </div>
              </div>
              <UserAvatar email={user?.email} />
            </div>
          ) : null}

          <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NexusRBXAvatar isThinking={true} mode={activeMode} />
            <div className="max-w-[85%] md:max-w-[80%] order-2 space-y-4">
              <PendingActivityPanel
                pendingMessage={pendingMessage}
                generationStage={generationStage}
                parsed={pendingParsed}
              />

              {pendingMessage.streamState?.thought ? (
                <ThinkingDisclosure text={pendingMessage.streamState.thought} live defaultOpen />
              ) : null}

              {pendingMessage.content ? (
                <div className="space-y-4">
                  <div className="p-4 md:p-6 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl">
                    {pendingParsed.hasStructured ? (
                      <div className="space-y-4">
                        {pendingParsed.explanation && (
                          <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                            <FormatText text={pendingParsed.explanation} />
                          </div>
                        )}
                        {pendingParsed.code && (
                          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Streaming Code
                            </div>
                            <pre className="p-4 text-[12px] leading-relaxed text-gray-300 whitespace-pre overflow-x-auto">
                              {pendingParsed.code}
                            </pre>
                          </div>
                        )}
                        {pendingParsed.plain && (
                          <div className="text-[14px] whitespace-pre-wrap leading-relaxed text-gray-300">
                            <FormatText text={pendingParsed.plain} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                        <FormatText text={stripTags(pendingMessage.content)} />
                      </div>
                    )}
                  </div>
                  {pendingMessage.type === "ui" && <SkeletonArtifact type="ui" />}
                  {pendingMessage.type === "chat" &&
                    (pendingMessage.content?.includes("```") || pendingParsed.code) && (
                      <SkeletonArtifact type="code" />
                    )}
                </div>
              ) : null}
              {pendingMessage.type === "ui" && !pendingMessage.content && <SkeletonArtifact type="ui" />}
            </div>
          </div>
        </>
      )}
      <div ref={chatEndRef} />
    </div>
  );
}
