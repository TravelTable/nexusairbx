import React from "react";
import { 
  NexusRBXAvatar, 
  UserAvatar, 
  FormatText, 
  ThoughtAccordion, 
  UiStatsBadge,
  SecurityReport,
  PerformanceAudit,
  PlanTracker,
  TaskOrchestrator,
  ArtifactCard
} from "./AiComponents";
import LiveCodeViewer from "./LiveCodeViewer";
import ScriptLoadingBarContainer from "../ScriptLoadingBarContainer";
import { 
  Zap, 
  Rocket, 
  Layout, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  MousePointer2, 
  Layers, 
  Code2, 
  Database, 
  Activity, 
  ShieldAlert, 
  Move, 
  MessageSquare,
  Copy,
  Check,
  Settings2,
  Plus,
  Users,
  Loader,
  Send,
  X,
  ChevronRight
} from "lucide-react";
export const CHAT_MODES = [
  { 
    id: "general", 
    label: "General Assistant", 
    icon: <MessageSquare className="w-4 h-4" />, 
    color: "text-gray-400", 
    bg: "bg-gray-400/10",
    border: "hover:border-gray-400/50",
    description: "General Roblox help, debugging, and documentation.",
    placeholder: "Ask anything about Roblox development...",
    type: "pure persona"
  },
  { 
    id: "ui", 
    label: "UI Architect", 
    icon: <Layout className="w-4 h-4" />, 
    color: "text-[#00f5d4]", 
    bg: "bg-[#00f5d4]/10",
    border: "hover:border-[#00f5d4]/50",
    description: "Specialized in building and refining Roblox UI manifests.",
    placeholder: "Describe the UI you want to build (e.g. 'A modern shop menu')...",
    type: "tool-routing"
  },
  { 
    id: "logic", 
    label: "Logic Engineer", 
    icon: <Code2 className="w-4 h-4" />, 
    color: "text-[#9b5de5]", 
    bg: "bg-[#9b5de5]/10",
    border: "hover:border-[#9b5de5]/50",
    description: "Focused on clean, optimized Luau scripting and bug fixing.",
    placeholder: "Paste code to optimize or describe a logic problem...",
    type: "pure persona"
  },
  { 
    id: "system", 
    label: "System Designer", 
    icon: <Rocket className="w-4 h-4" />, 
    color: "text-blue-400", 
    bg: "bg-blue-400/10",
    border: "hover:border-blue-400/50",
    description: "Architecting DataStores, Networking, and Game Loops.",
    placeholder: "Describe a system (e.g. 'A global leaderboard with DataStores')...",
    type: "pure persona"
  },
  { 
    id: "animator", 
    label: "Animator", 
    icon: <Move className="w-4 h-4" />, 
    color: "text-pink-400", 
    bg: "bg-pink-400/10",
    border: "hover:border-pink-400/50",
    description: "Tweens, AnimationControllers, and procedural motion.",
    placeholder: "Describe an animation or tween sequence...",
    type: "pure persona"
  },
  { 
    id: "data", 
    label: "Data Specialist", 
    icon: <Database className="w-4 h-4" />, 
    color: "text-yellow-400", 
    bg: "bg-yellow-400/10",
    border: "hover:border-yellow-400/50",
    description: "DataStore v2, Caching, Pagination, and Analytics.",
    placeholder: "Ask about DataStore patterns or data management...",
    type: "pure persona"
  },
  { 
    id: "performance", 
    label: "Performance Tuner", 
    icon: <Activity className="w-4 h-4" />, 
    color: "text-emerald-400", 
    bg: "bg-emerald-400/10",
    border: "hover:border-emerald-400/50",
    description: "Diagnosing bottlenecks and micro-optimizations.",
    placeholder: "Paste code to audit for performance issues...",
    type: "pure persona"
  },
  { 
    id: "security", 
    label: "Security Auditor", 
    icon: <ShieldAlert className="w-4 h-4" />, 
    color: "text-red-400", 
    bg: "bg-red-400/10",
    border: "hover:border-red-400/50",
    description: "RemoteEvent security and anti-exploit patterns.",
    placeholder: "Audit your Remotes or ask about anti-exploit best practices...",
    type: "pure persona"
  },
];

const stripTags = (text) => {
  if (!text) return "";
  return text
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<plan>[\s\S]*?<\/plan>/gi, "")
    .replace(/<explanation>([\s\S]*?)<\/explanation>/gi, "$1")
    .replace(/<code>[\s\S]*?<\/code>/gi, "")
    .trim();
};

export default function ChatView({ 
  messages, 
  pendingMessage, 
  generationStage, 
  user, 
  activeMode = "general",
  customModes = [],
  onModeChange,
  onCreateCustomMode,
  onEditCustomMode,
  onInstallCommunityMode,
  onViewUi, 
  onQuickStart,
  onRefine,
  onToggleActMode,
  onExecuteTask,
  onPushToStudio,
  onFixUiAudit,
  onShareWithTeam,
  teams = [],
  currentTaskId,
  chatEndRef 
}) {
  const [copiedId, setCopiedId] = React.useState(null);
  const [modeTab, setModeTab] = React.useState("official"); // "official" | "custom" | "community"
  const [communityModes, setCommunityModes] = React.useState([]);
  const [loadingCommunity, setLoadingCommunity] = React.useState(false);

  const fetchCommunityModes = React.useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const { collection, getDocs, query, limit, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../firebase");
      const q = query(collection(db, "community_modes"), orderBy("updatedAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setCommunityModes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to fetch community modes:", err);
    } finally {
      setLoadingCommunity(false);
    }
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [sharingId, setSharingId] = React.useState(null);

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      {messages.length === 0 && !pendingMessage ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-10 py-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              <Sparkles className="w-3 h-3 text-[#00f5d4]" />
              Select Assistant Mode
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">How can Nexus help today?</h2>
            <p className="text-gray-400 max-w-md mx-auto text-sm font-medium">Choose a specialized mode to get the most accurate and optimized results for your task.</p>
          </div>

          <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit mx-auto">
            <button 
              onClick={() => setModeTab("official")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "official" ? "bg-gray-800 text-[#00f5d4]" : "text-gray-500 hover:text-white"}`}
            >
              Official
            </button>
            <button 
              onClick={() => setModeTab("custom")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "custom" ? "bg-gray-800 text-[#9b5de5]" : "text-gray-500 hover:text-white"}`}
            >
              My Experts
            </button>
            <button 
              onClick={() => { setModeTab("community"); fetchCommunityModes(); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "community" ? "bg-gray-800 text-cyan-400" : "text-gray-500 hover:text-white"}`}
            >
              Community
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {modeTab === "official" && CHAT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? `border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10` : `border-gray-800 ${mode.border}`}`}
              >
                {activeMode === mode.id && (
                  <div className={`absolute inset-0 opacity-10 ${mode.bg}`} />
                )}
                <div className={`mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform ${mode.bg} ${mode.color}`}>
                  {mode.icon}
                </div>
                <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                  {mode.label}
                  {activeMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
                <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{mode.description}</div>
              </button>
            ))}

            {modeTab === "custom" && (
              <>
                {customModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onModeChange(mode.id)}
                    className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? `border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10` : `border-gray-800 hover:border-white/20`}`}
                  >
                    {activeMode === mode.id && (
                      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: mode.color }} />
                    )}
                    <div className="mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform bg-white/5" style={{ color: mode.color }}>
                      <Settings2 className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                      {mode.label}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditCustomMode(mode); }}
                          className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                          <Settings2 className="w-3 h-3" />
                        </button>
                        {activeMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{mode.description || "Custom AI Expert"}</div>
                  </button>
                ))}

                <button
                  onClick={onCreateCustomMode}
                  className="p-5 rounded-2xl bg-white/5 border border-dashed border-white/10 hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/5 transition-all text-center group flex flex-col items-center justify-center gap-3"
                >
                  <div className="p-3 rounded-full bg-white/5 group-hover:bg-[#00f5d4]/20 group-hover:text-[#00f5d4] transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">Create Expert</div>
                </button>
              </>
            )}

            {modeTab === "community" && (
              <>
                {loadingCommunity ? (
                  <div className="col-span-full py-12 flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Browsing Community Experts...</p>
                  </div>
                ) : communityModes.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No community experts found yet.</p>
                  </div>
                ) : (
                  communityModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onModeChange(mode.id)}
                      className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? `border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10` : `border-gray-800 hover:border-white/20`}`}
                    >
                      {activeMode === mode.id && (
                        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: mode.color }} />
                      )}
                      <div className="mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform bg-white/5" style={{ color: mode.color }}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                        {mode.label}
                        {activeMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      </div>
                      <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">{mode.description || "Community Expert"}</div>
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center text-[8px] font-bold text-white">
                            {mode.authorName?.[0] || "?"}
                          </div>
                          <span className="text-[9px] text-gray-500 font-bold">{mode.authorName || "Anonymous"}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onInstallCommunityMode(mode); }}
                          className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                        >
                          Install
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {m.role === 'assistant' && <NexusRBXAvatar mode={activeMode} />}
              <div className={`${m.role === 'user' ? 'max-w-[70%] md:max-w-[60%]' : 'max-w-[85%] md:max-w-[80%]'} ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div className={`p-4 md:p-5 rounded-3xl ${m.role === 'user' 
                  ? 'bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl text-gray-100' 
                  : 'bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl'}`}>
                  
                  {m.role === 'assistant' && m.thought && <ThoughtAccordion thought={m.thought} />}

                  {m.role === 'assistant' && (m.plan || (m.explanation && m.explanation.includes('<plan>'))) && (
                    <div className="space-y-4">
                      <PlanTracker plan={m.plan || m.explanation.match(/<plan>([\s\S]*?)<\/plan>/i)?.[1]} />
                      {activeMode !== 'general' && (
                        <div className="p-4 rounded-2xl bg-[#00f5d4]/5 border border-[#00f5d4]/20 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500">
                          <div className="text-sm font-bold text-[#00f5d4]">Ready to execute this plan?</div>
                          <button 
                            onClick={() => onToggleActMode(m)}
                            className="w-full py-3 rounded-xl bg-[#00f5d4] text-black font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,245,212,0.4)]"
                          >
                            <Zap className="w-4 h-4 fill-current" />
                            CONFIRM & EXECUTE
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {m.role === 'assistant' && m.action === 'plan' && m.tasks && (
                    <TaskOrchestrator 
                      tasks={m.tasks} 
                      currentTaskId={currentTaskId} 
                      onExecuteTask={onExecuteTask} 
                    />
                  )}

                  {m.role === 'assistant' && m.options && m.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 mb-2">
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
                  )}

                  {m.content && m.role === 'user' && (
                    <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-white font-medium">
                      {m.content}
                    </div>
                  )}

                  {m.explanation ? (
                    <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                      <FormatText text={stripTags(m.explanation)} />
                    </div>
                  ) : (
                    m.role === 'assistant' && m.content && (
                      <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-400 italic">
                        <FormatText text={stripTags(m.content)} />
                      </div>
                    )
                  )}
                  
                  {m.role === 'assistant' && m.action && m.action !== 'chat' && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-[#00f5d4]/10 border border-[#00f5d4]/20 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-[#00f5d4]" />
                        <span className="text-[10px] font-black text-[#00f5d4] uppercase tracking-[0.2em]">
                          {m.action}
                        </span>
                      </div>
                    </div>
                  )}

                  {m.role === 'assistant' && m.mode === 'plan' && (
                    <div className="mt-6 p-4 rounded-2xl bg-[#00f5d4]/5 border border-[#00f5d4]/20 flex flex-col items-center text-center gap-4 animate-pulse">
                      <div className="text-sm font-bold text-[#00f5d4]">Ready to build this UI?</div>
                      <button 
                        onClick={() => onToggleActMode(m)}
                        className="w-full py-3 rounded-xl bg-[#00f5d4] text-black font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,245,212,0.4)]"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        TOGGLE TO ACT MODE
                      </button>
                    </div>
                  )}

                  {m.role === 'assistant' && m.suggestedMode && (
                    <div className="mt-6 p-4 rounded-2xl bg-[#9b5de5]/5 border border-[#9b5de5]/20 flex flex-col items-center text-center gap-4">
                      <div className="text-sm font-bold text-[#9b5de5]">Switch to {CHAT_MODES.find(mode => mode.id === m.suggestedMode)?.label || m.suggestedMode}?</div>
                      <p className="text-[11px] text-gray-400">Nexus detected you might need specialized tools for this task.</p>
                      <button 
                        onClick={() => onModeChange(m.suggestedMode)}
                        className="w-full py-3 rounded-xl bg-[#9b5de5] text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(155,93,229,0.4)]"
                      >
                        <RefreshCw className="w-4 h-4" />
                        SWITCH TO {m.suggestedMode.toUpperCase()} MODE
                      </button>
                    </div>
                  )}

                  {m.role === 'assistant' && (m.uiModuleLua || m.code) && m.metadata?.mode !== 'plan' && (
                    <div className="mt-6 space-y-4">
                      {activeMode === 'general' && !m.metadata?.structuredData ? (
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Code2 className="w-4 h-4 text-gray-500" />
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Generated Luau Code</span>
                            </div>
                            <button 
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent("nexus:openCodeDrawer", {
                                  detail: {
                                    code: m.uiModuleLua || m.code,
                                    title: m.title || "Generated Script",
                                    explanation: m.explanation || "",
                                    versionNumber: m.versionNumber || 1
                                  }
                                }));
                              }}
                              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                              View Full Code
                            </button>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212] pointer-events-none" />
                            <pre className="text-[12px] font-mono text-gray-400 overflow-hidden max-h-[100px] leading-relaxed">
                              { (m.uiModuleLua || m.code).split('\n').slice(0, 5).join('\n') }
                              { (m.uiModuleLua || m.code).split('\n').length > 5 && '\n...' }
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
                            { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                            { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: copiedId === m.id }
                          ]}
                        >
                          <SecurityReport 
                            report={m.metadata.structuredData.report} 
                            onFix={() => {
                              window.dispatchEvent(new CustomEvent("nexus:applyCodePatch", { 
                                detail: { code: m.metadata.structuredData.patchedCode || m.code, messageId: m.id } 
                              }));
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
                            { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                            { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: copiedId === m.id }
                          ]}
                        >
                          <PerformanceAudit 
                            audit={m.metadata.structuredData.audit} 
                            onOptimize={() => {
                              window.dispatchEvent(new CustomEvent("nexus:applyCodePatch", { 
                                detail: { code: m.metadata.structuredData.optimizedCode || m.code, messageId: m.id } 
                              }));
                            }}
                          />
                        </ArtifactCard>
                      ) : m.metadata?.type === 'ui' || m.projectId ? (
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
                            { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id) }
                          ]}
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
                        <ArtifactCard
                          title={m.title || "Generated Script"}
                          subtitle="Luau Logic Module"
                          icon={Code2}
                          type="code"
                          qaReport={m.metadata?.qaReport}
                          actions={[
                            { label: "Push to Studio", icon: <Send className="w-4 h-4" />, onClick: () => onPushToStudio(m.artifactId, "script", { code: m.uiModuleLua || m.code, title: m.title }) },
                            { label: "Share with Team", icon: <Users className="w-4 h-4" />, onClick: () => setSharingId(m.id) },
                            { label: "Copy Code", icon: copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => handleCopy(m.uiModuleLua || m.code, m.id), primary: true }
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
              {m.role === 'user' && <UserAvatar email={user?.email} />}
            </div>
          ))}

          {pendingMessage && (
            <>
              <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-[70%] md:max-w-[60%] order-1">
                  <div className="p-4 md:p-5 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl text-gray-100">
                    <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt}</div>
                  </div>
                </div>
                <UserAvatar email={user?.email} />
              </div>

              <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <NexusRBXAvatar isThinking={true} mode={activeMode} />
                <div className="max-w-[85%] md:max-w-[80%] order-2 space-y-4">
                  {!pendingMessage.content ? (
                    <div className="p-6 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl w-full min-w-[300px]">
                      <div className="flex flex-col gap-4">
                        <div className="h-4 w-3/4 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-4 w-1/2 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-20 w-full bg-white/5 rounded-2xl animate-pulse mt-2" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 md:p-6 rounded-3xl bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl">
                      <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                        <FormatText text={stripTags(pendingMessage.content)} />
                      </div>
                      {/* Only show LiveCodeViewer in Act mode and if it looks like code is coming */}
                      {pendingMessage.mode === 'act' && pendingMessage.content.includes('<code>') && (
                        <div className="mt-4">
                          <LiveCodeViewer content={pendingMessage.content.split('<code>')[1] || ""} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Team Share Modal */}
      {sharingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#00f5d4]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Share with Team</h3>
              </div>
              <button onClick={() => setSharingId(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => {
                    const m = messages.find(msg => msg.id === sharingId);
                    onShareWithTeam(m.artifactId || m.projectId, m.projectId ? "ui" : "script", team.id);
                    setSharingId(null);
                  }}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/5 transition-all text-left flex items-center justify-between group"
                >
                  <span className="font-bold text-white group-hover:text-[#00f5d4] transition-colors">{team.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00f5d4]" />
                </button>
              ))}
              {teams.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 mb-4">You need to create a team first.</p>
                  <button onClick={() => { setSharingId(null); /* Navigate to settings */ }} className="text-[#00f5d4] text-xs font-black uppercase tracking-widest underline">Go to Settings</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
