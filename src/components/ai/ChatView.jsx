import React from "react";
import { CHAT_MODES } from "./chatConstants";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";

export { CHAT_MODES };

export default function ChatView({
  messages,
  pendingMessage,
  generationStage,
  user,
  activeMode = "general",
  onViewUi,
  onQuickStart,
  onOpenTemplates,
  onRefine,
  onFixUiAudit,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  notify,
  isBusy,
  chatEndRef,
}) {
  const showEmpty = messages.length === 0 && !pendingMessage;

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      {showEmpty ? (
        <ChatEmptyState onQuickStart={onQuickStart} onOpenTemplates={onOpenTemplates} user={user} />
      ) : (
        <MessageList
          messages={messages}
          pendingMessage={pendingMessage}
          user={user}
          activeMode={activeMode}
          generationStage={generationStage}
          chatEndRef={chatEndRef}
          onViewUi={onViewUi}
          onRefine={onRefine}
          onFixUiAudit={onFixUiAudit}
          onApprovePlan={onApprovePlan}
          onClarifySubmit={onClarifySubmit}
          onEditPlan={onEditPlan}
          notify={notify}
          isBusy={isBusy}
        />
      )}
    </div>
  );
}
