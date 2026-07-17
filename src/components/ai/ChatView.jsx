import React from "react";
import { CHAT_MODES } from "./chatConstants";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";

export { CHAT_MODES };

export default function ChatView({
  messages,
  pendingMessage,
  generationStage,
  user,
  profile,
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
  onApproveStep,
  approvingStepId,
  onSelectStudioTarget,
  selectingStudioTargetId,
}) {
  const showEmpty = messages.length === 0 && !pendingMessage;

  return (
    <Conversation className="h-full min-h-0 w-full motion-safe:animate-panel-in">
      <ConversationContent className="mx-auto w-full max-w-5xl gap-6 px-3 py-4">
        {showEmpty ? (
          <ChatEmptyState onQuickStart={onQuickStart} onOpenTemplates={onOpenTemplates} user={user} />
        ) : (
          <MessageList
            messages={messages}
            pendingMessage={pendingMessage}
            user={user}
            profile={profile}
            activeMode={activeMode}
            generationStage={generationStage}
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
            onSelectStudioTarget={onSelectStudioTarget}
            selectingStudioTargetId={selectingStudioTargetId}
          />
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
