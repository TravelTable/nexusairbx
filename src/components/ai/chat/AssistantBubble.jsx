import React from "react";
import {
  NexusRBXAvatar,
  FormatText,
  UiStatsBadge,
  SecurityReport,
  PerformanceAudit,
  ArtifactCard,
} from "../AiComponents";
import ScriptLoadingBarContainer from "../../ScriptLoadingBarContainer";
import ExportBar from "../ExportBar";
import QaScoreBadge from "../QaScoreBadge";
import {
  Layout,
  Eye,
  MousePointer2,
  Layers,
  Code2,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { stripTags } from "./stripTags";
import { ClarifyCard, PlanCard } from "./FlowCards";
import { AI_EVENTS, emitAiEvent } from "../../../lib/aiEvents";

function BubbleShell({ activeMode, children }) {
  return (
    <div className="flex justify-start gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500">
      <NexusRBXAvatar mode={activeMode} />
      <div className="max-w-[85%] md:max-w-[80%] order-2">
        <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AssistantBubble({
  message: m,
  activeMode,
  user,
  onViewUi,
  onRefine,
  onFixUiAudit,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  notify,
  isBusy,
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

  const hasArtifact = (m.uiModuleLua || m.code) && m.metadata?.mode !== "plan";
  const isUi = m.metadata?.type === "ui" || !!m.projectId;
  const code = m.uiModuleLua || m.code || "";
  const qaReport = m.metadata?.qaReport || null;
  const qaIssueCount = Array.isArray(qaReport?.issues) ? qaReport.issues.length : 0;

  // UI artifacts get their export surface in the preview drawer; only show the
  // in-bubble ExportBar for script/project artifacts to avoid duplication.
  const exportBar = hasArtifact && !isUi ? (
    <ExportBar
      lua={code}
      systemsLua={m.systemsLua || ""}
      boardState={m.boardState || null}
      title={m.title || (isUi ? "Generated UI" : "Generated Script")}
      artifactId={isUi ? m.projectId : m.artifactId}
      kind={isUi ? "ui" : "script"}
      files={m.files || []}
      onSaveLibrary={({ name, code: c }) =>
        emitAiEvent(AI_EVENTS.SAVE_SCRIPT, { name: name || m.title || "Generated Script", code: c })
      }
      onRefine={() => onRefine?.(m)}
      notify={notify}
    />
  ) : null;

  return (
    <BubbleShell activeMode={activeMode}>
      {m.explanation ? (
        <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
          <FormatText text={stripTags(m.explanation)} />
        </div>
      ) : (
        m.content && (
          <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-400 italic">
            <FormatText text={stripTags(m.content)} />
          </div>
        )
      )}

      {hasArtifact && (
        <div className="mt-6 space-y-4">
          {qaReport && Number.isFinite(Number(qaReport.score)) && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Quality &amp; Trust
              </span>
              <QaScoreBadge
                score={qaReport.score}
                issueCount={qaIssueCount}
                onFix={isUi ? () => onFixUiAudit?.(m) : undefined}
                disabled={isBusy}
              />
            </div>
          )}
          {activeMode === "general" && !m.metadata?.structuredData ? (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Generated Luau Code
                  </span>
                </div>
                <button
                  onClick={() => {
                    emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                      code,
                      title: m.title || "Generated Script",
                      explanation: m.explanation || "",
                      versionNumber: m.versionNumber || 1,
                    });
                  }}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  View Full Code
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212] pointer-events-none" />
                <pre className="text-[12px] font-mono text-gray-400 overflow-hidden max-h-[100px] leading-relaxed">
                  {code.split("\n").slice(0, 5).join("\n")}
                  {code.split("\n").length > 5 && "\n..."}
                </pre>
              </div>
            </div>
          ) : m.metadata?.structuredData?.report ? (
            <ArtifactCard title="Security Audit" subtitle="Vulnerability Scan Results" icon={ShieldAlert} type="report" qaReport={m.metadata?.qaReport} actions={[]}>
              <SecurityReport
                report={m.metadata.structuredData.report}
                onFix={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: m.metadata.structuredData.patchedCode || m.code, messageId: m.id })}
              />
            </ArtifactCard>
          ) : m.metadata?.structuredData?.audit ? (
            <ArtifactCard title="Performance Audit" subtitle="Optimization Analysis" icon={Activity} type="report" qaReport={m.metadata?.qaReport} actions={[]}>
              <PerformanceAudit
                audit={m.metadata.structuredData.audit}
                onOptimize={() => emitAiEvent(AI_EVENTS.APPLY_CODE_PATCH, { code: m.metadata.structuredData.optimizedCode || m.code, messageId: m.id })}
              />
            </ArtifactCard>
          ) : isUi ? (
            <ArtifactCard
              title={m.title || "GENERATED INTERFACE"}
              subtitle={`Luau Component v${m.versionNumber || 1}`}
              icon={Layout}
              type="ui"
              qaReport={m.metadata?.qaReport}
              actions={[{ label: "Preview", icon: <Eye className="w-4 h-4" />, onClick: () => onViewUi(m), primary: true }]}
            >
              {m.metadata?.qaReport?.issues?.length > 0 && (
                <div className="px-5 py-3 bg-red-500/5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">UX Issues Detected</span>
                  <button
                    onClick={() => onFixUiAudit(m)}
                    className="px-3 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                  >
                    Apply Fixes
                  </button>
                </div>
              )}
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative overflow-hidden rounded-b-2xl">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                <Layout className="w-16 h-16 text-white/5" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <UiStatsBadge label="Instances" value={m.metadata?.instanceCount || "42"} icon={Layers} />
                  <UiStatsBadge label="Responsive" value="Yes" icon={MousePointer2} />
                </div>
              </div>
            </ArtifactCard>
          ) : (
            <ArtifactCard title={m.title || "Generated Script"} subtitle="Luau Logic Module" icon={Code2} type="code" qaReport={m.metadata?.qaReport} actions={[]}>
              <ScriptLoadingBarContainer
                filename={m.title || "Generated_Script.lua"}
                codeReady={!!code}
                loading={false}
                onView={() => onViewUi(m)}
              />
            </ArtifactCard>
          )}

          {exportBar}
        </div>
      )}
    </BubbleShell>
  );
}
