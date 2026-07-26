import React, { useRef } from "react";
import { CHAT_MODES } from "./chatConstants";
import ChatEmptyState from "./chat/ChatEmptyState";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import useChatScrollRestoration from "./chat/useChatScrollRestoration";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";

export { CHAT_MODES };

export default function ChatView({
  chatId,
  chatTitle,
  projectTitle,
  messages,
  pendingMessage,
  pendingMessages,
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
  studioConnected,
  studioConnectionState,
  onRenameChat,
  onOpenNavigation,
  onOpenPlan,
  onEditMessage,
  onRetryMessage,
}) {
  const showEmpty = messages.length === 0 && !pendingMessage;
  const rootRef = useRef(null);
  useChatScrollRestoration(rootRef, chatId);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div
        key={chatId || "new-chat"}
        className="nexus-chat-switch flex h-full min-h-0 w-full flex-1 flex-col"
      >
        <ChatHeader
          chatTitle={chatTitle}
          projectTitle={projectTitle}
          studioConnected={studioConnected}
          studioConnectionState={studioConnectionState}
          isBusy={isBusy}
          onRenameChat={onRenameChat}
          onOpenNavigation={onOpenNavigation}
          onOpenPlan={onOpenPlan}
        />
        <Conversation className="h-full min-h-0 w-full flex-1">
          <ConversationContent
            className="mx-auto w-full max-w-[1080px] gap-5 px-3 py-5 sm:px-5"
            scrollClassName="nexus-chat-scroll scrollbar-subtle"
          >
            {showEmpty ? (
              <ChatEmptyState onQuickStart={onQuickStart} onOpenTemplates={onOpenTemplates} user={user} />
            ) : (
              <MessageList
                messages={messages}
                pendingMessage={pendingMessage}
                pendingMessages={pendingMessages}
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
                onEditMessage={onEditMessage}
                onRetryMessage={onRetryMessage}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    </div>
  );
}
