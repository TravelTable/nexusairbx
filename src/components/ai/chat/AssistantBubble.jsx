import React from "react";
import {
  NexusRBXAvatar,
  SecurityReport,
  PerformanceAudit,
} from "../AiComponents";
import QaScoreBadge from "../QaScoreBadge";
import { Activity, ShieldAlert, FolderOpen, FileCode2, Loader2 } from "lib/icons";
import { stripTags } from "./stripTags";
import { ClarifyCard, PlanCard } from "./FlowCards";
import MarkdownMessage from "./MarkdownMessage";
import ReasoningPanel from "./ReasoningPanel";
import { AI_EVENTS, emitAiEvent } from "../../../lib/aiEvents";
import AgentStepList from "../workspace/AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import { formatUserFacingError } from "../../../lib/billingErrors";
import { Badge } from "../../shadcn/badge";
import { Button } from "../../shadcn/button";
import {
  Artifact,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "../../ai-elements/artifact";
import { kindMeta } from "../workspace/workspaceMeta";
import { cn } from "../../../lib/utils";

function fileTypeChips(files) {
  const seen = new Map();
  for (const file of Array.isArray(files) ? files : []) {
    const key = String(file?.kind || "").toLowerCase();
    if (!seen.has(key)) seen.set(key, kindMeta(file?.kind));
  }
  return Array.from(seen.values()).slice(0, 4);
}

const RUN_STATE_META = {
  applied: { label: "Applied to Studio", className: "border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4]" },
  ready_to_apply: { label: "Ready to push", className: "border-[#00f5d4]/25 bg-[#00f5d4]/5 text-[#00f5d4]" },
  assets_pending: { label: "Icons uploading", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  applying: { label: "Applying to Studio…", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  push_skipped: { label: "Saved to workspace", className: "border-white/10 bg-white/5 text-gray-400" },
  conflict: { label: "Studio conflict", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  failed: { label: "Failed", className: "border-red-400/30 bg-red-400/10 text-red-300" },
};

function BubbleShell({ activeMode, children }) {
  return (
    <div className="flex justify-start gap-3.5 group motion-safe:animate-message-in">
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
  const fileChips = fileTypeChips(m.files);
  const hasArtifact = (fileCount > 0 || m.code) && m.metadata?.mode !== "plan";
  const runStateMeta = RUN_STATE_META[m.metadata?.runState] || null;
  const qaReport = m.metadata?.qaReport || null;
  const qaIssueCount = Array.isArray(qaReport?.issues) ? qaReport.issues.length : 0;
  const structured = m.metadata?.structuredData;

  return (
    <BubbleShell activeMode={activeMode}>
      {m.thought ? (
        <div className="mb-3">
          <ReasoningPanel text={m.thought} isStreaming={false} requireShowThinking />
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

      {m.pending && !m.explanation && !m.content && (
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#00f5d4]" />
          <span>{m.stage || "Studio agent is working..."}</span>
        </div>
      )}

      {m.error && (
        <div className="text-sm text-red-300">
          {formatUserFacingError(m.error)}
        </div>
      )}

      {m.summary ? (
        <MarkdownMessage text={stripTags(m.summary)} />
      ) : m.content && !hasArtifact ? (
        <MarkdownMessage text={stripTags(m.content)} />
      ) : null}

      {hasArtifact && (
        <div className="mt-5 space-y-4">
          {qaReport && Number.isFinite(Number(qaReport.score)) && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quality &amp; Trust</span>
              <QaScoreBadge score={qaReport.score} issueCount={qaIssueCount} disabled={isBusy} />
            </div>
          )}

          {structured?.report ? (
            <Artifact>
              <ArtifactHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg text-red-400 bg-red-400/10 border border-red-400/20">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <ArtifactTitle>Security Audit</ArtifactTitle>
                    <ArtifactDescription>Vulnerability Scan Results</ArtifactDescription>
                  </div>
                </div>
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                <SecurityReport
                  report={structured.report}
                  onFix={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: structured.patchedCode || m.code, messageId: m.id })}
                />
              </ArtifactContent>
            </Artifact>
          ) : structured?.audit ? (
            <Artifact>
              <ArtifactHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg text-[#00f5d4] bg-[#00f5d4]/10 border border-[#00f5d4]/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <ArtifactTitle>Performance Audit</ArtifactTitle>
                    <ArtifactDescription>Optimization Analysis</ArtifactDescription>
                  </div>
                </div>
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                <PerformanceAudit
                  audit={structured.audit}
                  onOptimize={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: structured.optimizedCode || m.code, messageId: m.id })}
                />
              </ArtifactContent>
            </Artifact>
          ) : (
            <Artifact>
              <ArtifactHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-nexus-cyan/10 text-nexus-cyan shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ArtifactTitle>{m.title || "Generated Roblox Artifact"}</ArtifactTitle>
                      {runStateMeta ? (
                        <Badge className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest", runStateMeta.className)}>
                          {runStateMeta.label}
                        </Badge>
                      ) : null}
                    </div>
                    {fileChips.length > 0 ? (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {fileChips.map((meta) => {
                          const ChipIcon = meta.icon;
                          return (
                            <Badge
                              key={meta.label}
                              variant="outline"
                              className="gap-1 rounded-md border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: meta.accent }}
                            >
                              {ChipIcon ? <ChipIcon className="w-3 h-3" /> : null}
                              {meta.label}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : null}
                    <ArtifactDescription className="mt-1">
                      {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : "1 script"} ready in the workspace
                      {Array.isArray(m.metadata?.unresolvedAssets) && m.metadata.unresolvedAssets.length > 0
                        ? ` · ${m.metadata.unresolvedAssets.length} icon(s) pending Roblox upload`
                        : ""}
                    </ArtifactDescription>
                  </div>
                </div>
                <ArtifactActions>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onViewUi?.(m)}
                    className="bg-[#00f5d4] text-black font-black uppercase tracking-widest hover:bg-[#00f5d4]/90"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Open in editor
                  </Button>
                  {onRefine ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRefine(m)}>
                      Refine
                    </Button>
                  ) : null}
                </ArtifactActions>
              </ArtifactHeader>
            </Artifact>
          )}
        </div>
      )}
    </BubbleShell>
  );
}
