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
import "./chat/ChatExperience.css";

export { CHAT_MODES };

export default function ChatView({
  chatId,
  chatTitle,
  projectTitle,
  projectId,
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
  studioLoading,
  studioPlacePreference,
  onRenameChat,
  onOpenNavigation,
  onOpenPlan,
  onEditMessage,
  onRetryMessage,
  onRestoreRun,
  workspaceControls,
  navigationOpen,
  navigationControls,
  navigationButtonRef,
  showHeader = true,
}) {
  const showEmpty = messages.length === 0 && !pendingMessage;
  const rootRef = useRef(null);
  useChatScrollRestoration(rootRef, chatId);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
      <div
        key={chatId || "new-chat"}
        className="nexus-chat-switch flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col"
      >
        {showHeader ? (
          <ChatHeader
            chatTitle={chatTitle}
            projectTitle={projectTitle}
            studioConnected={studioConnected}
            studioConnectionState={studioConnectionState}
            isBusy={isBusy}
            onRenameChat={onRenameChat}
            onOpenNavigation={onOpenNavigation}
            onOpenPlan={onOpenPlan}
            workspaceControls={workspaceControls}
            navigationOpen={navigationOpen}
            navigationControls={navigationControls}
            navigationButtonRef={navigationButtonRef}
          />
        ) : null}
        <Conversation className="nexus-conversation-surface h-full min-h-0 w-full flex-1">
          <ConversationContent
            className="nexus-conversation-content mx-auto min-h-full gap-7 py-6 md:py-9"
            scrollClassName="nexus-chat-scroll scrollbar-subtle"
          >
            {showEmpty ? (
              <ChatEmptyState
                onQuickStart={onQuickStart}
                onOpenTemplates={onOpenTemplates}
                projectTitle={projectTitle}
                projectId={projectId}
                studioConnected={studioConnected}
                studioLoading={studioLoading}
                studioPlacePreference={studioPlacePreference}
              />
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
                onRestoreRun={onRestoreRun}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    </div>
  );
}
