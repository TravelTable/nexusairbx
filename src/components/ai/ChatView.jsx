import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText, ThoughtAccordion, UiStatsBadge } from "./AiComponents";
import LiveCodeViewer from "./LiveCodeViewer";
import ScriptLoadingBarContainer from "../ScriptLoadingBarContainer";
import GenerationStatusBar from "./GenerationStatusBar";
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
  MessageSquare 
} from "lucide-react";
import { auth } from "../../firebase";

const DEV_EMAIL = "jackt1263@gmail.com";

export const CHAT_MODES = [
  { 
    id: "general", 
    label: "General Assistant", 
    icon: <MessageSquare className="w-4 h-4" />, 
    color: "text-gray-400", 
    bg: "bg-gray-400/10",
    border: "hover:border-gray-400/50",
    description: "General Roblox help, debugging, and documentation.",
    placeholder: "Ask anything about Roblox development..."
  },
  { 
    id: "ui", 
    label: "UI Architect", 
    icon: <Layout className="w-4 h-4" />, 
    color: "text-[#00f5d4]", 
    bg: "bg-[#00f5d4]/10",
    border: "hover:border-[#00f5d4]/50",
    description: "Specialized in building and refining Roblox UI manifests.",
    placeholder: "Describe the UI you want to build (e.g. 'A modern shop menu')..."
  },
  { 
    id: "logic", 
    label: "Logic Engineer", 
    icon: <Code2 className="w-4 h-4" />, 
    color: "text-[#9b5de5]", 
    bg: "bg-[#9b5de5]/10",
    border: "hover:border-[#9b5de5]/50",
    description: "Focused on clean, optimized Luau scripting and bug fixing.",
    placeholder: "Paste code to optimize or describe a logic problem..."
  },
  { 
    id: "system", 
    label: "System Designer", 
    icon: <Rocket className="w-4 h-4" />, 
    color: "text-blue-400", 
    bg: "bg-blue-400/10",
    border: "hover:border-blue-400/50",
    description: "Architecting DataStores, Networking, and Game Loops.",
    placeholder: "Describe a system (e.g. 'A global leaderboard with DataStores')..."
  },
  { 
    id: "animator", 
    label: "Animator", 
    icon: <Move className="w-4 h-4" />, 
    color: "text-pink-400", 
    bg: "bg-pink-400/10",
    border: "hover:border-pink-400/50",
    description: "Tweens, AnimationControllers, and procedural motion.",
    placeholder: "Describe an animation or tween sequence..."
  },
  { 
    id: "data", 
    label: "Data Specialist", 
    icon: <Database className="w-4 h-4" />, 
    color: "text-yellow-400", 
    bg: "bg-yellow-400/10",
    border: "hover:border-yellow-400/50",
    description: "DataStore v2, Caching, Pagination, and Analytics.",
    placeholder: "Ask about DataStore patterns or data management..."
  },
  { 
    id: "performance", 
    label: "Performance Tuner", 
    icon: <Activity className="w-4 h-4" />, 
    color: "text-emerald-400", 
    bg: "bg-emerald-400/10",
    border: "hover:border-emerald-400/50",
    description: "Diagnosing bottlenecks and micro-optimizations.",
    placeholder: "Paste code to audit for performance issues..."
  },
  { 
    id: "security", 
    label: "Security Auditor", 
    icon: <ShieldAlert className="w-4 h-4" />, 
    color: "text-red-400", 
    bg: "bg-red-400/10",
    border: "hover:border-red-400/50",
    description: "RemoteEvent security and anti-exploit patterns.",
    placeholder: "Audit your Remotes or ask about anti-exploit best practices..."
  },
];

export default function ChatView({ 
  messages, 
  pendingMessage, 
  generationStage, 
  user, 
  activeMode = "general",
  onModeChange,
  onViewUi, 
  onQuickStart,
  onRefine,
  onToggleActMode,
  chatEndRef 
}) {
  const currentUser = auth.currentUser;
  const isDev = currentUser?.email === DEV_EMAIL;

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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {CHAT_MODES.map((mode) => (
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
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {m.role === 'assistant' && <NexusRBXAvatar />}
              <div className={`max-w-[85%] md:max-w-[80%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div className={`p-4 md:p-6 rounded-3xl ${m.role === 'user' 
                  ? 'bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white shadow-[0_10px_40px_rgba(155,93,229,0.2)] border border-white/20' 
                  : 'bg-[#121212]/80 border border-white/10 backdrop-blur-xl shadow-2xl'}`}>
                  
                  {m.role === 'assistant' && m.thought && <ThoughtAccordion thought={m.thought} />}

                  {m.content && m.role === 'user' && (
                    <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-white font-medium">
                      {m.content}
                    </div>
                  )}

                  {m.explanation ? (
                    <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-100">
                      <FormatText text={m.explanation} />
                    </div>
                  ) : (
                    m.role === 'assistant' && m.content && (
                      <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-gray-400 italic">
                        <FormatText text={m.content} />
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

                  {m.role === 'assistant' && (m.uiModuleLua || m.code) && (
                    <div className="mt-6 space-y-4">
                      {m.metadata?.type === 'ui' || m.projectId ? (
                        <div className="relative group/card overflow-hidden rounded-2xl border border-white/10 bg-black/60 hover:border-[#00f5d4]/50 transition-all shadow-2xl">
                          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                            <Layout className="w-16 h-16 text-white/5 group-hover/card:text-[#00f5d4]/10 transition-colors" />
                            
                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                              <UiStatsBadge label="Instances" value={m.metadata?.instanceCount || "42"} icon={Layers} />
                              <UiStatsBadge label="Responsive" value="Yes" icon={MousePointer2} />
                            </div>

                            {/* Coming Soon Badge for Chat Preview */}
                            <div className="absolute top-3 right-3">
                              <div className={`px-2 py-1 rounded-md border backdrop-blur-md flex items-center gap-1.5 ${isDev ? 'bg-[#9b5de5]/20 border-[#9b5de5]/30 text-[#9b5de5]' : 'bg-[#00f5d4]/10 border-[#00f5d4]/20 text-[#00f5d4]'}`}>
                                <Sparkles className="w-3 h-3 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                  {isDev ? "Dev Preview" : "Coming Soon"}
                                </span>
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button 
                                onClick={() => onViewUi(m)}
                                className="px-6 py-2.5 rounded-xl bg-white text-black font-black text-sm flex items-center gap-2 hover:scale-110 transition-transform"
                              >
                                <Eye className="w-4 h-4" /> PREVIEW
                              </button>
                              <button 
                                onClick={() => onRefine(m)}
                                className="px-6 py-2.5 rounded-xl bg-[#00f5d4] text-black font-black text-sm flex items-center gap-2 hover:scale-110 transition-transform"
                              >
                                <RefreshCw className="w-4 h-4" /> REFINE
                              </button>
                            </div>
                          </div>
                          <div className="p-4 flex items-center justify-between bg-white/5 backdrop-blur-md">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-white truncate tracking-tight">{m.title || "GENERATED INTERFACE"}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Luau Component v{m.versionNumber || 1}</div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="p-2 rounded-lg bg-[#00f5d4]/10">
                                 <Sparkles className="w-4 h-4 text-[#00f5d4]" />
                               </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ScriptLoadingBarContainer
                          filename={m.title || "Generated_Script.lua"}
                          codeReady={!!(m.uiModuleLua || m.code)}
                          loading={false}
                          onView={() => onViewUi(m)}
                        />
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
                <div className="max-w-[80%] order-1">
                  <div className={`p-5 rounded-2xl bg-gradient-to-br ${pendingMessage.type === 'ui' ? 'from-[#00f5d4]/60 to-[#9b5de5]/60' : 'from-[#9b5de5]/60 to-[#00f5d4]/60'} text-white shadow-lg border border-white/10 backdrop-blur-sm`}>
                    <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt || pendingMessage.content}</div>
                  </div>
                </div>
                <UserAvatar email={user?.email} />
              </div>

              <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <NexusRBXAvatar isThinking={true} />
                <div className="max-w-[85%] md:max-w-[80%] order-2 space-y-4">
                  <GenerationStatusBar currentStage={generationStage || "Nexus is working..."} />
                  
                  {pendingMessage.content && (
                    <LiveCodeViewer content={pendingMessage.content} />
                  )}
                </div>
              </div>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      )}
    </div>
  );
}
