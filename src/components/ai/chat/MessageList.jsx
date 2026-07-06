import React, { useEffect, useMemo } from "react";
import { NexusRBXAvatar, UserAvatar, SkeletonArtifact } from "../AiComponents";
import MarkdownMessage from "./MarkdownMessage";
import { stripTags } from "./stripTags";
import MessageBubble from "./MessageBubble";
import LiveWorkStream from "./LiveWorkStream";
import RawReasoningPanel from "./RawReasoningPanel";
import { parsePendingStreamContent } from "../../../lib/streaming";
import { Separator } from "../../shadcn/separator";
import { Clock3, Loader2, RotateCcw } from "lib/icons";

function resolveActivityStage(pendingMessage, generationStage, parsed) {
  const stage = pendingMessage?.stage || generationStage || "";
  if (stage) return stage;
  if (parsed?.code) return "Writing code...";
  if (parsed?.explanation || pendingMessage?.streamState?.hasVisibleOutput) return "Generating response...";
  return "Understanding your task...";
}

/**
 * Compact, live status header shown while the agent works. The actual progress
 * (thoughts, commands/actions, and text/code) streams in below this header via
 * the thinking disclosure, the agent step log, and the content block — so this
 * header only reflects the current live stage, not a fixed checklist.
 */
function LiveActivityHeader({ pendingMessage, generationStage, parsed, embedded = false }) {
  const stage = resolveActivityStage(pendingMessage, generationStage, parsed);
  const isRecovering = String(stage).toLowerCase().includes("recovering");

  return (
    <div
      className={
        embedded
          ? "flex items-center justify-between gap-3 px-4 py-3"
          : "flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3"
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 text-[#00f5d4]">
          {isRecovering ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            Nexus is working
          </div>
          <div className="mt-0.5 text-sm md:text-[15px] font-semibold text-white break-words">
            {stage}
          </div>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
        <Clock3 className="w-3 h-3" />
        Live
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  pendingMessage,
  user,
  profile,
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
  onApproveStep,
  approvingStepId,
}) {
  const pendingParsed = parsePendingStreamContent(pendingMessage?.content || "");
  const hasPendingMessage = !!pendingMessage;
  const showLiveWorkStream = Boolean(
    pendingMessage?.streamState ||
    (Array.isArray(pendingMessage?.files) && pendingMessage.files.length) ||
    (Array.isArray(pendingMessage?.steps) && pendingMessage.steps.length)
  );
  // Real output = files/steps or non-thinking activity. Used to auto-collapse the
  // reasoning stream once the model starts producing results.
  const streamState = pendingMessage?.streamState;
  const hasStreamOutput = Boolean(
    (Array.isArray(streamState?.files) && streamState.files.length) ||
    (Array.isArray(pendingMessage?.files) && pendingMessage.files.length) ||
    (Array.isArray(pendingMessage?.steps) && pendingMessage.steps.length) ||
    (Array.isArray(streamState?.activity) &&
      streamState.activity.some((a) => a?.type && a.type !== "thinking"))
  );
  const hasRawReasoning = Boolean(String(streamState?.rawReasoning || "").trim());
  const visibleMessages = useMemo(
    () =>
      pendingMessage?.requestId
        ? messages.filter((m) => !(m.pending && m.requestId === pendingMessage.requestId))
        : messages,
    [messages, pendingMessage?.requestId]
  );

  // Generation pending carries `prompt` for instant feedback before Firestore syncs.
  // Once the persisted user message arrives, hide the optimistic bubble to avoid doubles.
  const showOptimisticUserPrompt = useMemo(() => {
    const prompt = String(pendingMessage?.prompt || "").trim();
    if (!prompt) return false;
    if (
      pendingMessage?.requestId &&
      messages.some((m) => m.role === "user" && m.requestId === pendingMessage.requestId)
    ) {
      return false;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && String(lastUser.content || "").trim() === prompt) return false;
    return true;
  }, [messages, pendingMessage?.prompt, pendingMessage?.requestId]);

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
  }, [visibleMessages, pendingMessage?.content, pendingMessage?.prompt, pendingMessage?.stage, hasPendingMessage, chatEndRef]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
      {visibleMessages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          user={user}
          profile={profile}
          activeMode={activeMode}
          onViewUi={onViewUi}
          onRefine={onRefine}
          onFixUiAudit={onFixUiAudit}
          onApprovePlan={onApprovePlan}
          onClarifySubmit={onClarifySubmit}
          onEditPlan={onEditPlan}
          notify={notify}
          isBusy={isBusy}
          onApproveStep={onApproveStep}
          approvingStepId={approvingStepId}
        />
      ))}

      {pendingMessage && (
        <>
          {showOptimisticUserPrompt ? (
            <div className="flex justify-end gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-[70%] md:max-w-[60%] order-1">
                <div className="px-4 py-3 md:px-5 md:py-4 rounded-2xl2 rounded-tr-md bg-gradient-to-br from-white/[0.09] to-white/[0.03] border border-white/10 backdrop-blur-xl shadow-panel">
                  <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-white font-medium">
                    {String(pendingMessage.prompt || "").trim()}
                  </div>
                </div>
              </div>
              <UserAvatar
                email={user?.email}
                name={profile?.name || profile?.preferred_username || user?.displayName || ""}
                photoUrl={profile?.picture || user?.photoURL || ""}
              />
            </div>
          ) : null}

          <div className="flex justify-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NexusRBXAvatar isThinking={true} mode={activeMode} />
            <div className="max-w-[90%] order-2 space-y-4">
              {showLiveWorkStream ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b0b0b]/90 shadow-2xl overflow-hidden">
                  <RawReasoningPanel
                    text={streamState?.rawReasoning}
                    live={Boolean(pendingMessage)}
                    embedded
                    autoCollapse={hasStreamOutput}
                  />
                  {hasRawReasoning ? <Separator className="bg-white/10" /> : null}
                  <LiveWorkStream
                    pendingMessage={pendingMessage}
                    generationStage={generationStage}
                    onApproveStep={onApproveStep}
                    approvingStepId={approvingStepId}
                    embedded
                  />
                </div>
              ) : (
                <>
                  <RawReasoningPanel
                    text={streamState?.rawReasoning}
                    live={Boolean(pendingMessage)}
                  />
                  <LiveActivityHeader
                    pendingMessage={pendingMessage}
                    generationStage={generationStage}
                    parsed={pendingParsed}
                  />
                </>
              )}

              {pendingMessage.content && !showLiveWorkStream ? (
                <div className="space-y-4">
                  <div className="p-4 md:p-5 rounded-2xl2 rounded-tl-md card-surface shadow-panel">
                    {pendingParsed.hasStructured ? (
                      <div className="space-y-4">
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
                          <MarkdownMessage text={pendingParsed.plain} className="text-gray-300" />
                        )}
                      </div>
                    ) : (
                      <MarkdownMessage text={stripTags(pendingMessage.content)} />
                    )}
                  </div>
                  {pendingMessage.type === "ui" && <SkeletonArtifact type="ui" />}
                  {pendingMessage.type === "chat" &&
                    (pendingMessage.content?.includes("```") || pendingParsed.code) && (
                      <SkeletonArtifact type="code" />
                    )}
                </div>
              ) : null}
              {pendingMessage.type === "ui" && !pendingMessage.content && !showLiveWorkStream && <SkeletonArtifact type="ui" />}
            </div>
          </div>
        </>
      )}
      <div ref={chatEndRef} />
    </div>
  );
}
