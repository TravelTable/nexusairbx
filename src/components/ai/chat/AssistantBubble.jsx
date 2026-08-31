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
import MessageActions from "./MessageActions";

function fileTypeChips(files) {
  const seen = new Map();
  for (const file of Array.isArray(files) ? files : []) {
    const key = String(file?.kind || "").toLowerCase();
    if (!seen.has(key)) seen.set(key, kindMeta(file?.kind));
  }
  return Array.from(seen.values()).slice(0, 4);
}

const RUN_STATE_META = {
  applied: { label: "Applied to Studio", className: "border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] text-[var(--ds-success)]" },
  ready_to_apply: { label: "Ready to push", className: "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]" },
  assets_pending: { label: "Icons uploading", className: " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] " },
  applying: { label: "Applying to Studio…", className: " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] " },
  push_skipped: { label: "Saved to workspace", className: "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]" },
  conflict: { label: "Studio conflict", className: " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] " },
  cancelled: { label: "Stopped", className: "border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]" },
  canceled: { label: "Stopped", className: "border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]" },
  failed: { label: "Failed", className: " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] " },
};

function BubbleShell({ activeMode, grouped = false, children }) {
  if (grouped) {
    return (
      <div className="group/message w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="group/message flex justify-start gap-3.5">
      <NexusRBXAvatar mode={activeMode} />
      <div className="max-w-[90%] order-2 min-w-0">
        {children}
      </div>
    </div>
  );
}

export default function AssistantBubble({
  message: m,
  activeMode,
  grouped = false,
  retryPrompt = "",
  retrySourceMessage = null,
  retryRunId = null,
  onViewUi, // mapped to "open artifact in editor"
  onOpenFile,
  onRefine,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  isBusy,
  onApproveStep,
  approvingStepId,
  onRetryMessage,
}) {
  // Stage 2: clarifying questions
  if (m.stage === "clarify" || m.stage === "clarify_answered") {
    return (
      <BubbleShell activeMode={activeMode} grouped={grouped}>
        <ClarifyCard message={m} onSubmit={onClarifySubmit} disabled={isBusy} />
      </BubbleShell>
    );
  }

  // Stage 3: approvable plan
  if (m.stage === "plan" || m.stage === "plan_approved") {
    return (
      <BubbleShell activeMode={activeMode} grouped={grouped}>
        <PlanCard message={m} onApprove={onApprovePlan} onEdit={onEditPlan} onOpenFile={onOpenFile} disabled={isBusy} />
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
    <BubbleShell activeMode={activeMode} grouped={grouped}>
      <div className="w-full max-w-[840px]">
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
              collapsible={!m.pending}
              onApproveStep={onApproveStep}
              approvingStepId={approvingStepId}
            />
          </div>
        )}

        {m.pending && !m.explanation && !m.content && (
          <div className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent)]" />
            <span>{m.stage || "Studio agent is working..."}</span>
          </div>
        )}

        {m.error && (
          <div className="text-sm text-[var(--ds-danger)] ">
            {formatUserFacingError(m.error)}
          </div>
        )}

        {m.summary ? (
          <MarkdownMessage text={stripTags(m.summary)} onOpenFile={onOpenFile} />
        ) : m.content && !hasArtifact ? (
          <MarkdownMessage text={stripTags(m.content)} onOpenFile={onOpenFile} />
        ) : null}
      </div>

      {hasArtifact && (
        <div className="mt-5 w-full max-w-[1080px] space-y-4">
          {qaReport && Number.isFinite(Number(qaReport.score)) && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest">Quality &amp; Trust</span>
              <QaScoreBadge score={qaReport.score} issueCount={qaIssueCount} disabled={isBusy} />
            </div>
          )}

          {structured?.report ? (
            <Artifact>
              <ArtifactHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg text-[var(--ds-danger)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] ">
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
                  <div className="p-2 rounded-lg text-[var(--ds-accent)] bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-border)]">
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
                  <div className="p-2 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ArtifactTitle>{m.title || "Build ready"}</ArtifactTitle>
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
                              className="gap-1 rounded-md border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
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
                    className="bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] font-black uppercase tracking-widest hover:bg-[var(--ds-accent-hover)]"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Review changes
                  </Button>
                  {onRefine && hasArtifact ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRefine(m)}>
                      Keep building
                    </Button>
                  ) : null}
                </ArtifactActions>
              </ArtifactHeader>
            </Artifact>
          )}
        </div>
      )}
      <div className="w-full max-w-[840px]">
        <MessageActions
          role="assistant"
          text={m.summary || m.content || m.explanation}
          message={m}
          retryPrompt={retryPrompt}
          retrySourceMessage={retrySourceMessage}
          retryRunId={retryRunId}
          onRetry={onRetryMessage}
          onRefine={hasArtifact ? onRefine : undefined}
          onOpenFiles={hasArtifact ? onViewUi : undefined}
        />
      </div>
    </BubbleShell>
  );
}
