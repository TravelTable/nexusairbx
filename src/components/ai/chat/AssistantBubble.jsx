import React from "react";
import {
  NexusRBXAvatar,
  FormatText,
  ThoughtAccordion,
  UiStatsBadge,
  SecurityReport,
  PerformanceAudit,
  PlanTracker,
  TaskOrchestrator,
  ArtifactCard,
} from "../AiComponents";
import ScriptLoadingBarContainer from "../../ScriptLoadingBarContainer";
import {
  Zap,
  Layout,
  Sparkles,
  Eye,
  RefreshCw,
  MousePointer2,
  Layers,
  Code2,
  Activity,
  ShieldAlert,
  Send,
  Copy,
  Check,
  Users,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { CHAT_MODES } from "../chatConstants";
import { stripTags } from "./stripTags";

export default function AssistantBubble({
  message: m,
  messages,
  activeMode,
  generationStage,
  pendingMessage,
  user,
  currentTaskId,
  copiedId,
  setCopiedId,
  setSharingId,
  onModeChange,
  onToggleActMode,
  onExecuteTask,
  onViewUi,
  onQuickStart,
  onRefine,
  onPushToStudio,
  onFixUiAudit,
}) {
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isLastMessage = m.id === messages[messages.length - 1]?.id;
  const isExecuting = isLastMessage && (generationStage || pendingMessage);

  return (
    <div className="flex justify-start gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500">
      <NexusRBXAvatar mode={activeMode} />
      <div className="max-w-[85%] md:max-w-[80%] order-2">
        <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl">
          {m.thought && <ThoughtAccordion thought={m.thought} />}

          {(m.plan || (m.explanation && m.explanation.includes("<plan>")) || m.mode === "plan") && (
            <div className="space-y-4">
              {(m.plan || m.explanation?.includes("<plan>")) && (
                <PlanTracker
                  plan={m.plan || m.explanation?.match(/<plan>([\s\S]*?)<\/plan>/i)?.[1]}
                  isExecuting={isExecuting}
                />
              )}
              {!m.isAutoExecuting && (
                <div className="p-4 rounded-2xl bg-[#00f5d4]/5 border border-[#00f5d4]/20 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="text-sm font-bold text-[#00f5d4]">Execute plan</div>
                  <button
                    onClick={() => onToggleActMode(m)}
                    className="w-full py-3 rounded-xl bg-[#00f5d4] text-black font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,245,212,0.4)]"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    EXECUTE PLAN
                  </button>
                </div>
              )}
            </div>
          )}

          {m.action === "plan" && m.tasks && (
            <TaskOrchestrator
              tasks={m.tasks}
              currentTaskId={currentTaskId}
              onExecuteTask={onExecuteTask}
              plan={user?.plan?.toLowerCase() || "free"}
            />
          )}

          {m.options && m.options.length > 0 && (
            <div className="mt-4 mb-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Suggested actions
              </div>
              <div className="flex flex-wrap gap-2">
                {m.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (opt.mode) onModeChange(opt.mode);
                      if (opt.prompt) onQuickStart(opt.prompt);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4] text-xs font-black uppercase tracking-widest hover:bg-[#00f5d4]/20 transition-all flex items-center gap-2 group"
                  >
                    {opt.label}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {m.action && m.action !== "chat" && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
              <div className="px-2 py-1 rounded bg-[#00f5d4]/10 border border-[#00f5d4]/20 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-[#00f5d4]" />
                <span className="text-[10px] font-black text-[#00f5d4] uppercase tracking-[0.2em]">
                  {m.action}
                </span>
              </div>
            </div>
          )}

          {m.suggestedMode && (
            <div className="mt-6 p-4 rounded-2xl bg-[#9b5de5]/5 border border-[#9b5de5]/20 flex flex-col items-center text-center gap-4">
              <div className="text-sm font-bold text-[#9b5de5]">
                Switch to {CHAT_MODES.find((mode) => mode.id === m.suggestedMode)?.label || m.suggestedMode}?
              </div>
              <p className="text-[11px] text-gray-400">
                Nexus detected you might need specialized tools for this task.
              </p>
              <button
                onClick={() => {
                  const isProMode = ["security", "performance", "data", "system", "animator"].includes(m.suggestedMode);
                  if (isProMode && user?.plan !== "PRO" && user?.plan !== "TEAM") {
                    onToggleActMode({ prompt: `Switch to ${m.suggestedMode} Mode` });
                    return;
                  }
                  onModeChange(m.suggestedMode);
                }}
                className="w-full py-3 rounded-xl bg-[#9b5de5] text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(155,93,229,0.4)]"
              >
                <RefreshCw className="w-4 h-4" />
                SWITCH TO {m.suggestedMode.toUpperCase()} MODE
              </button>
            </div>
          )}

          {(m.uiModuleLua || m.code) && m.metadata?.mode !== "plan" && (
            <div className="mt-6 space-y-4">
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
                        window.dispatchEvent(
                          new CustomEvent("nexus:openCodeDrawer", {
                            detail: {
                              code: m.uiModuleLua || m.code,
                              title: m.title || "Generated Script",
                              explanation: m.explanation || "",
                              versionNumber: m.versionNumber || 1,
                            },
                          })
                        );
                      }}
                      className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      View Full Code
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212] pointer-events-none" />
                    <pre className="text-[12px] font-mono text-gray-400 overflow-hidden max-h-[100px] leading-relaxed">
                      {(m.uiModuleLua || m.code).split("\n").slice(0, 5).join("\n")}
                      {(m.uiModuleLua || m.code).split("\n").length > 5 && "\n..."}
                    </pre>
                  </div>
                </div>
              ) : m.metadata?.structuredData?.report ? (
                <ArtifactCard
                  title="Security Audit"
                  subtitle="Vulnerability Scan Results"
                  icon={ShieldAlert}
                  type="report"
                  qaReport={m.metadata?.qaReport}
                  actions={[
                    { label: "Push to Studio", icon: <Send className="w-4 h-4" />, onClick: () => onPushToStudio(m.artifactId, "script", { code: m.uiModuleLua || m.code, title: m.title }) },
                    { label: "Save to Library", icon: <Bookmark className="w-4 h-4" />, onClick: () => window.dispatchEvent(new CustomEvent("nexus:saveScript", { detail: { name: m.title || "Security Audit", code: m.uiModuleLua || m.code } })) },
                    { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                    { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: copiedId === m.id },
                  ]}
                >
                  <SecurityReport
                    report={m.metadata.structuredData.report}
                    onFix={() => {
                      window.dispatchEvent(
                        new CustomEvent("nexus:applyCodePatch", {
                          detail: {
                            code: m.metadata.structuredData.patchedCode || m.code,
                            messageId: m.id,
                          },
                        })
                      );
                    }}
                  />
                </ArtifactCard>
              ) : m.metadata?.structuredData?.audit ? (
                <ArtifactCard
                  title="Performance Audit"
                  subtitle="Optimization Analysis"
                  icon={Activity}
                  type="report"
                  qaReport={m.metadata?.qaReport}
                  actions={[
                    { label: "Push to Studio", icon: <Send className="w-4 h-4" />, onClick: () => onPushToStudio(m.artifactId, "script", { code: m.uiModuleLua || m.code, title: m.title }) },
                    { label: "Save to Library", icon: <Bookmark className="w-4 h-4" />, onClick: () => window.dispatchEvent(new CustomEvent("nexus:saveScript", { detail: { name: m.title || "Performance Audit", code: m.uiModuleLua || m.code } })) },
                    { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                    { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: copiedId === m.id },
                  ]}
                >
                  <PerformanceAudit
                    audit={m.metadata.structuredData.audit}
                    onOptimize={() => {
                      window.dispatchEvent(
                        new CustomEvent("nexus:applyCodePatch", {
                          detail: {
                            code: m.metadata.structuredData.optimizedCode || m.code,
                            messageId: m.id,
                          },
                        })
                      );
                    }}
                  />
                </ArtifactCard>
              ) : m.metadata?.type === "ui" || m.projectId ? (
                <ArtifactCard
                  title={m.title || "GENERATED INTERFACE"}
                  subtitle={`Luau Component v${m.versionNumber || 1}`}
                  icon={Layout}
                  type="ui"
                  qaReport={m.metadata?.qaReport}
                  actions={[
                    { label: "Push to Studio", icon: <Send className="w-4 h-4" />, onClick: () => onPushToStudio(m.projectId, "ui", { boardState: m.boardState, lua: m.uiModuleLua || m.code, title: m.title }) },
                    { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                    { label: "Preview", icon: <Eye className="w-4 h-4" />, onClick: () => onViewUi(m), primary: true },
                    { label: "Refine", icon: <RefreshCw className="w-4 h-4" />, onClick: () => onRefine(m) },
                    { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id) },
                  ]}
                >
                  {m.metadata?.qaReport?.issues?.length > 0 && (
                    <div className="px-5 py-3 bg-red-500/5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                        UX Issues Detected
                      </span>
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
                <ArtifactCard
                  title={m.title || "Generated Script"}
                  subtitle="Luau Logic Module"
                  icon={Code2}
                  type="code"
                  qaReport={m.metadata?.qaReport}
                  actions={[
                    { label: "Push to Studio", icon: <Send className="w-4 h-4" />, onClick: () => onPushToStudio(m.artifactId, "script", { code: m.uiModuleLua || m.code, title: m.title }) },
                    { label: "Save to Library", icon: <Bookmark className="w-4 h-4" />, onClick: () => window.dispatchEvent(new CustomEvent("nexus:saveScript", { detail: { name: m.title || "Generated Script", code: m.uiModuleLua || m.code } })) },
                    { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                    { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: true },
                  ]}
                >
                  <ScriptLoadingBarContainer
                    filename={m.title || "Generated_Script.lua"}
                    codeReady={!!(m.uiModuleLua || m.code)}
                    loading={false}
                    onView={() => onViewUi(m)}
                  />
                </ArtifactCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
