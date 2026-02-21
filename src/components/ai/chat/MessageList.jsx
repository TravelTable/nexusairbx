import React, { useEffect } from "react";
import { NexusRBXAvatar, UserAvatar, FormatText, SkeletonArtifact } from "../AiComponents";
import { stripTags } from "./stripTags";
import MessageBubble from "./MessageBubble";
import { parsePendingStreamContent } from "../../../lib/streaming";

export default function MessageList({
  messages,
  pendingMessage,
  user,
  activeMode,
  generationStage,
  currentTaskId,
  chatEndRef,
  copiedId,
  setCopiedId,
  setSharingId,
  onModeChange,
  onToggleActMode,
  onExecuteTask,
  onViewUi,
  onQuickStart,
  onRefine,
  onPushToStudio,
  onFixUiAudit,
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
  }, [messages, pendingMessage?.content, pendingMessage?.prompt, hasPendingMessage, chatEndRef]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          messages={messages}
          user={user}
          activeMode={activeMode}
          generationStage={generationStage}
          pendingMessage={pendingMessage}
          currentTaskId={currentTaskId}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
          setSharingId={setSharingId}
          onModeChange={onModeChange}
          onToggleActMode={onToggleActMode}
          onExecuteTask={onExecuteTask}
          onViewUi={onViewUi}
          onQuickStart={onQuickStart}
          onRefine={onRefine}
          onPushToStudio={onPushToStudio}
          onFixUiAudit={onFixUiAudit}
        />
      ))}

      {pendingMessage && (
        <>
          <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-[70%] md:max-w-[60%] order-1">
              <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl text-gray-100">
                <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt}</div>
              </div>
            </div>
            <UserAvatar email={user?.email} />
          </div>

          <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NexusRBXAvatar isThinking={true} mode={activeMode} />
            <div className="max-w-[85%] md:max-w-[80%] order-2 space-y-4">
              {!pendingMessage.content ? (
                <div className="p-6 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl w-full min-w-[300px]">
                  <div className="flex flex-col gap-4">
                    <div className="h-4 w-3/4 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-4 w-1/2 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-20 w-full bg-white/5 rounded-2xl animate-pulse mt-2" />
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </>
      )}
      <div ref={chatEndRef} />
    </div>
  );
}
