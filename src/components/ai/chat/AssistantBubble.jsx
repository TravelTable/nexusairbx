import React from "react";
import {
  NexusRBXAvatar,
  FormatText,
  SecurityReport,
  PerformanceAudit,
  ArtifactCard,
} from "../AiComponents";
import QaScoreBadge from "../QaScoreBadge";
import { Activity, ShieldAlert, FolderOpen, FileCode2 } from "lucide-react";
import { stripTags } from "./stripTags";
import { ClarifyCard, PlanCard } from "./FlowCards";
import ThinkingDisclosure from "./ThinkingDisclosure";
import { AI_EVENTS, emitAiEvent } from "../../../lib/aiEvents";
import AgentStepList from "../workspace/AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";

function BubbleShell({ activeMode, children }) {
  return (
    <div className="flex justify-start gap-3.5 group animate-fade-in-up">
      <NexusRBXAvatar mode={activeMode} />
      <div className="max-w-[90%] order-2">
        <div className="p-4 md:p-5 rounded-2xl2 rounded-tl-md card-surface shadow-panel">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AssistantBubble({
  message: m,
  activeMode,
  onViewUi, // mapped to "open artifact in editor"
  onRefine,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  isBusy,
  onApproveStep,
  approvingStepId,
}) {
  // Stage 2: clarifying questions
  if (m.stage === "clarify" || m.stage === "clarify_answered") {
    return (
      <BubbleShell activeMode={activeMode}>
        <ClarifyCard message={m} onSubmit={onClarifySubmit} disabled={isBusy} />
      </BubbleShell>
    );
  }

  // Stage 3: approvable plan
  if (m.stage === "plan" || m.stage === "plan_approved") {
    return (
      <BubbleShell activeMode={activeMode}>
        <PlanCard message={m} onApprove={onApprovePlan} onEdit={onEditPlan} disabled={isBusy} />
      </BubbleShell>
    );
  }

  const fileCount = Array.isArray(m.files) ? m.files.length : 0;
  const hasArtifact = (fileCount > 0 || m.code) && m.metadata?.mode !== "plan";
  const qaReport = m.metadata?.qaReport || null;
  const qaIssueCount = Array.isArray(qaReport?.issues) ? qaReport.issues.length : 0;
  const structured = m.metadata?.structuredData;

  return (
    <BubbleShell activeMode={activeMode}>
      {m.thought ? (
        <div className="mb-3">
          <ThinkingDisclosure text={m.thought} />
        </div>
      ) : null}

      {FEATURE_FLAGS.unifiedAgent && Array.isArray(m.steps) && m.steps.length > 0 && (
        <div className="mb-4">
          <AgentStepList
            steps={m.steps}
            maxHeight="max-h-48"
            onApproveStep={onApproveStep}
            approvingStepId={approvingStepId}
          />
        </div>
      )}

      {m.explanation ? (
        <div className="text-[15px] whitespace-pre-wrap leading-relaxed text-gray-100">
          <FormatText text={stripTags(m.explanation)} />
        </div>
      ) : (
        m.content && (
          <div className="text-[15px] whitespace-pre-wrap leading-relaxed text-gray-400 italic">
            <FormatText text={stripTags(m.content)} />
          </div>
        )
      )}

      {hasArtifact && (
        <div className="mt-5 space-y-4">
          {qaReport && Number.isFinite(Number(qaReport.score)) && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quality &amp; Trust</span>
              <QaScoreBadge score={qaReport.score} issueCount={qaIssueCount} disabled={isBusy} />
            </div>
          )}

          {structured?.report ? (
            <ArtifactCard title="Security Audit" subtitle="Vulnerability Scan Results" icon={ShieldAlert} type="report" qaReport={qaReport} actions={[]}>
              <SecurityReport
                report={structured.report}
                onFix={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: structured.patchedCode || m.code, messageId: m.id })}
              />
            </ArtifactCard>
          ) : structured?.audit ? (
            <ArtifactCard title="Performance Audit" subtitle="Optimization Analysis" icon={Activity} type="report" qaReport={qaReport} actions={[]}>
              <PerformanceAudit
                audit={structured.audit}
                onOptimize={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: structured.optimizedCode || m.code, messageId: m.id })}
              />
            </ArtifactCard>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-nexus-cyan/[0.06] to-transparent border border-nexus-cyan/15 flex items-center justify-between gap-3 transition-all hover:border-nexus-cyan/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-nexus-cyan/10 text-nexus-cyan shrink-0 shadow-[0_0_16px_rgba(0,245,212,0.25)]">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-white truncate">{m.title || "Generated Roblox Artifact"}</div>
                  <div className="text-[11px] text-gray-500">
                    {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : "1 script"} ready in the workspace
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewUi?.(m)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f5d4] text-black text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_18px_rgba(0,245,212,0.35)] transition-all"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Open in editor
                </button>
                {onRefine && (
                  <button
                    type="button"
                    onClick={() => onRefine(m)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Refine
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </BubbleShell>
  );
}
