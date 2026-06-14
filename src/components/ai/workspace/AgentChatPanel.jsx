import React, { useState } from "react";
import { MessageSquare, ClipboardList } from "lucide-react";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import AgentPlanPanel from "./AgentPlanPanel";
import BuildDetailsPanel from "./BuildDetailsPanel";
import { Segmented } from "../../ui";

// Right column: the practical, engineering-focused agent. Chat drives the
// workflow; build progress + setup/testing/security live in the Details view.
export default function AgentChatPanel({
  // chat
  messages,
  pendingMessage,
  generationStage,
  user,
  activeMode,
  isBusy,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  onRefine,
  onOpenArtifact,
  onQuickStart,
  notify,
  chatEndRef,
  // composer
  prompt,
  setPrompt,
  attachments,
  setAttachments,
  onSubmit,
  refineTarget,
  onCancelRefine,
  onFileUpload,
  onImprovePrompt,
  isImproving,
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  unlimitedTokens,
  devOverride,
  themePrimary,
  themeSecondary,
  onModeChange,
  // details
  artifact,
  agentRun,
}) {
  const [view, setView] = useState("chat");
  const active = agentRun?.status === "thinking" || agentRun?.status === "generating";

  return (
    <div className="h-full flex flex-col min-h-0 bg-ink-900">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-black/30">
        <span className="flex items-center gap-1.5 text-[11px] font-display font-bold tracking-wide text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-nexus-cyan shadow-[0_0_8px_rgba(0,245,212,0.8)]" />
          Agent
        </span>
        <div className="ml-auto">
          <Segmented
            options={[
              { id: "chat", label: "Chat", icon: MessageSquare },
              { id: "details", label: "Details", icon: ClipboardList },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      {view === "details" ? (
        <div className="flex-1 min-h-0">
          <BuildDetailsPanel artifact={artifact} agentRun={agentRun} />
        </div>
      ) : (
        <>
          {active && (
            <div className="px-3 pt-3">
              <AgentPlanPanel agentRun={agentRun} />
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-hide">
            <ChatView
              messages={messages}
              pendingMessage={pendingMessage}
              generationStage={generationStage}
              user={user}
              activeMode={activeMode}
              isBusy={isBusy}
              onApprovePlan={onApprovePlan}
              onClarifySubmit={onClarifySubmit}
              onEditPlan={onEditPlan}
              onViewUi={onOpenArtifact}
              onRefine={onRefine}
              onQuickStart={onQuickStart}
              notify={notify}
              chatEndRef={chatEndRef}
            />
          </div>
          <ChatComposer
            prompt={prompt}
            setPrompt={setPrompt}
            attachments={attachments}
            setAttachments={setAttachments}
            onSubmit={onSubmit}
            isGenerating={isBusy}
            generationStage={generationStage}
            placeholder={refineTarget ? "Describe the change you want…" : "What do you want to build?"}
            refineTarget={refineTarget}
            onCancelRefine={onCancelRefine}
            tokensLeft={tokensLeft}
            tokensLimit={tokensLimit}
            resetsAt={resetsAt}
            planKey={planKey}
            unlimitedTokens={unlimitedTokens}
            devOverride={devOverride}
            themePrimary={themePrimary}
            themeSecondary={themeSecondary}
            onFileUpload={onFileUpload}
            onImprovePrompt={onImprovePrompt}
            isImproving={isImproving}
            disabled={isBusy}
            mode={activeMode}
            onModeChange={onModeChange}
          />
        </>
      )}
    </div>
  );
}
