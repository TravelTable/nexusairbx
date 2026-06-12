import React, { useState } from "react";
import { MessageSquare, ClipboardList } from "lucide-react";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import AgentPlanPanel from "./AgentPlanPanel";
import BuildDetailsPanel from "./BuildDetailsPanel";

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
  themePrimary,
  themeSecondary,
  // details
  artifact,
  agentRun,
}) {
  const [view, setView] = useState("chat");
  const active = agentRun?.status === "thinking" || agentRun?.status === "generating";

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-white/5 bg-black/30">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Agent</span>
        <div className="ml-auto flex bg-gray-900/60 border border-white/5 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => setView("chat")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === "chat" ? "bg-[#00f5d4]/15 text-[#00f5d4]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button
            type="button"
            onClick={() => setView("details")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === "details" ? "bg-[#9b5de5]/15 text-[#9b5de5]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Details
          </button>
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
            themePrimary={themePrimary}
            themeSecondary={themeSecondary}
            onFileUpload={onFileUpload}
            onImprovePrompt={onImprovePrompt}
            isImproving={isImproving}
            disabled={isBusy}
          />
        </>
      )}
    </div>
  );
}
