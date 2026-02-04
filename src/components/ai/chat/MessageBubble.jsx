import React from "react";
import { UserAvatar } from "../AiComponents";
import AssistantBubble from "./AssistantBubble";

export default function MessageBubble({
  message: m,
  messages,
  user,
  activeMode,
  generationStage,
  pendingMessage,
  currentTaskId,
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
  if (m.role === "user") {
    return (
      <div className="flex justify-end gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-[70%] md:max-w-[60%] order-1">
          <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl text-gray-100">
            <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-white font-medium">
              {m.content}
            </div>
          </div>
        </div>
        <UserAvatar email={user?.email} />
      </div>
    );
  }

  return (
    <AssistantBubble
      message={m}
      messages={messages}
      activeMode={activeMode}
      generationStage={generationStage}
      pendingMessage={pendingMessage}
      user={user}
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
  );
}
