import React from "react";
import {
  NexusRBXAvatar,
  SecurityReport,
  PerformanceAudit,
  ArtifactCard,
} from "../AiComponents";
import QaScoreBadge from "../QaScoreBadge";
import { Activity, ShieldAlert, FolderOpen, FileCode2, Loader2 } from "lib/icons";
import { stripTags } from "./stripTags";
import { ClarifyCard, PlanCard } from "./FlowCards";
import MarkdownMessage from "./MarkdownMessage";
import ThinkingDisclosure from "./ThinkingDisclosure";
import { AI_EVENTS, emitAiEvent } from "../../../lib/aiEvents";
import AgentStepList from "../workspace/AgentStepList";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import { Badge } from "../../shadcn/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shadcn/tooltip";
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
  applying: { label: "Applying to Studio…", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  push_skipped: { label: "Saved to workspace", className: "border-white/10 bg-white/5 text-gray-400" },
  conflict: { label: "Studio conflict", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  failed: { label: "Failed", className: "border-red-400/30 bg-red-400/10 text-red-300" },
};

const BUBBLE_WIDTH = {
  text: "max-w-[760px]",
  card: "max-w-[820px]",
  artifact: "max-w-[940px]",
};

const SURFACE = {
  text: "rounded-[22px] rounded-tl-lg border border-white/[0.07] bg-white/[0.035] px-4 py-3.5 shadow-[0_14px_40px_-32px_rgba(0,0,0,0.95)] backdrop-blur-xl",
  card: "rounded-[22px] rounded-tl-lg border border-white/[0.085] bg-white/[0.045] px-4 py-4 shadow-[0_18px_54px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl",
  artifact: "rounded-[24px] rounded-tl-lg border border-[#00f5d4]/[0.13] bg-gradient-to-br from-white/[0.055] via-white/[0.035] to-[#00f5d4]/[0.035] px-4 py-4 shadow-[0_22px_60px_-36px_rgba(0,245,212,0.28)] backdrop-blur-xl",
  error: "rounded-[22px] rounded-tl-lg border border-red-400/20 bg-red-500/10 px-4 py-3.5 shadow-[0_14px_40px_-32px_rgba(0,0,0,0.95)] backdrop-blur-xl",
};

function BubbleShell({ activeMode, children, variant = "text", surfaceClassName }) {
  return (
    <div className="flex justify-start gap-3.5 group motion-safe:animate-message-in">
      <NexusRBXAvatar mode={activeMode} />
      <div className={`order-2 ${BUBBLE_WIDTH[variant] || BUBBLE_WIDTH.text}`}>
        <div className={surfaceClassName || SURFACE[variant] || SURFACE.text}>{children}</div>
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
      <BubbleShell activeMode={activeMode} variant="card" surfaceClassName={SURFACE.card}>
        <ClarifyCard message={m} onSubmit={onClarifySubmit} disabled={isBusy} />
      </BubbleShell>
    );
  }

  // Stage 3: approvable plan
  if (m.stage === "plan" || m.stage === "plan_approved") {
    return (
      <BubbleShell activeMode={activeMode} variant="card" surfaceClassName={SURFACE.card}>
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

  const surfaceVariant = m.error ? "error" : hasArtifact ? "artifact" : "text";

  return (
    <BubbleShell activeMode={activeMode} variant={hasArtifact ? "artifact" : "text"} surfaceClassName={SURFACE[surfaceVariant]}>
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

      {m.pending && !m.explanation && !m.content && (
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#00f5d4]" />
          <span>{m.stage || "Studio agent is working..."}</span>
        </div>
      )}

      {m.error && (
        <div className="text-sm font-medium leading-6 text-red-100">
          {m.error}
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
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#00f5d4]/15 bg-black/20 p-4 transition-[border-color,background-color,transform] duration-200 ease-out hover:border-[#00f5d4]/30 hover:bg-black/25">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-nexus-cyan/10 text-nexus-cyan shrink-0 shadow-[0_0_16px_rgba(0,245,212,0.18)]">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display text-sm font-bold text-white truncate">{m.title || "Generated Roblox Artifact"}</div>
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
                  <div className="mt-1 text-[11px] text-gray-500">
                    {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : "1 script"} ready in the workspace
                  </div>
                </div>
              </div>
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onViewUi?.(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#00f5d4] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-black transition-all hover:shadow-[0_0_18px_rgba(0,245,212,0.28)] active:scale-[0.98]"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Open in editor
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Open these files in the code editor</TooltipContent>
                  </Tooltip>
                  {onRefine && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onRefine(m)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-gray-300 transition-all hover:bg-white/[0.08] active:scale-[0.98]"
                        >
                          Refine
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Ask for changes to this artifact</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}
    </BubbleShell>
  );
}
