import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText } from "./AiComponents";
import ScriptLoadingBarContainer from "../ScriptLoadingBarContainer";
import GenerationStatusBar from "./GenerationStatusBar";
import { Zap, Rocket, Layout, Sparkles, Eye } from "lucide-react";

const quickStarts = [
  { icon: <Layout className="w-4 h-4 text-[#00f5d4]" />, label: "Build UI", prompt: "Build a modern shop UI with categories and a clean layout." },
  { icon: <Zap className="w-4 h-4 text-yellow-400" />, label: "Optimize Script", prompt: "Can you optimize this Luau script for better performance?" },
  { icon: <Rocket className="w-4 h-4 text-blue-400" />, label: "Generate System", prompt: "Generate a basic DataStore system with leaderboards." },
];

export default function ChatView({ 
  messages, 
  pendingMessage, 
  generationStage, 
  user, 
  onViewUi, 
  onQuickStart,
  chatEndRef 
}) {
  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      {messages.length === 0 && !pendingMessage ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">AI Coding Assistant</h2>
            <p className="text-gray-400 max-w-md">Ask anything about Roblox development, from debugging to complex systems.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            {quickStarts.map((qs, i) => (
              <button
                key={i}
                onClick={() => onQuickStart(qs.prompt)}
                className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-[#9b5de5] hover:bg-gray-900/60 transition-all text-left group"
              >
                <div className="mb-3 p-2 rounded-lg bg-gray-800 w-fit group-hover:scale-110 transition-transform">
                  {qs.icon}
                </div>
                <div className="font-bold text-white mb-1">{qs.label}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{qs.prompt}</div>
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
                <div className={`p-4 md:p-5 rounded-2xl ${m.role === 'user' 
                  ? 'bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white shadow-lg border border-white/10' 
                  : 'bg-[#121212] border border-white/5 backdrop-blur-md shadow-xl'}`}>
                  {m.content && m.role === 'user' && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-white">{m.content}</div>}
                  {m.explanation ? (
                    <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-gray-100"><FormatText text={m.explanation} /></div>
                  ) : (
                    m.role === 'assistant' && m.content && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-gray-400 italic"><FormatText text={m.content} /></div>
                  )}
                  
                  {m.role === 'assistant' && m.action && m.action !== 'chat' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] font-bold text-[#00f5d4] uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" />
                      Nexus Action: {m.action}
                    </div>
                  )}

                  {m.role === 'assistant' && m.code && (
                    <div className="mt-4 space-y-3">
                      {m.metadata?.type === 'ui' || m.projectId ? (
                        <div className="relative group/card overflow-hidden rounded-xl border border-white/10 bg-black/40 hover:border-[#00f5d4]/50 transition-all">
                          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative">
                            <Layout className="w-12 h-12 text-white/10 group-hover/card:text-[#00f5d4]/20 transition-colors" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button 
                                onClick={() => onViewUi(m)}
                                className="px-4 py-2 rounded-lg bg-[#00f5d4] text-black font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                              >
                                <Eye className="w-4 h-4" /> Preview
                              </button>
                            </div>
                          </div>
                          <div className="p-3 flex items-center justify-between bg-white/5">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{m.title || "Generated UI"}</div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Luau Interface Component</div>
                            </div>
                            <div className="flex items-center gap-2">
                               <Sparkles className="w-4 h-4 text-[#00f5d4] animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ScriptLoadingBarContainer
                          filename={m.title || "Generated_Script.lua"}
                          codeReady={!!m.code}
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
                <div className="max-w-[80%] order-2">
                  <GenerationStatusBar currentStage={generationStage || "Nexus is working..."} />
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
