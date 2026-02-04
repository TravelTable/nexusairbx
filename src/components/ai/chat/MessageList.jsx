import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText, SkeletonArtifact } from "../AiComponents";
import { stripTags } from "./stripTags";
import MessageBubble from "./MessageBubble";

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
                    <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                      <FormatText text={stripTags(pendingMessage.content)} />
                    </div>
                  </div>
                  {pendingMessage.type === "ui" && <SkeletonArtifact type="ui" />}
                  {pendingMessage.type === "chat" &&
                    pendingMessage.content?.includes("```") && (
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
