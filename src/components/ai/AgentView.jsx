import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText } from "./AiComponents";
import GenerationStatusBar from "./GenerationStatusBar";
import { Bot, Sparkles, Wand2, Search } from "lucide-react";

const agentQuickStarts = [
  { icon: <Bot className="w-4 h-4 text-blue-400" />, label: "Build Shop UI", prompt: "I want to build a professional shop UI with categories and a search bar." },
  { icon: <Wand2 className="w-4 h-4 text-purple-400" />, label: "Refine My UI", prompt: "Can you refine my current UI to look more modern and colorful?" },
  { icon: <Search className="w-4 h-4 text-green-400" />, label: "Suggest Assets", prompt: "Suggest some high-quality icons for a fantasy RPG inventory." },
];

export default function AgentView({ 
  messages, 
  isThinking, 
  user, 
  onQuickStart,
  chatEndRef 
}) {
  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      {messages.length === 0 && !isThinking ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 justify-center">
              <Sparkles className="w-8 h-8 text-[#00f5d4]" />
              Nexus AI Agent
            </h2>
            <p className="text-gray-400 max-w-md">Your autonomous assistant for building, refining, and perfecting Roblox interfaces.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            {agentQuickStarts.map((qs, i) => (
              <button
                key={i}
                onClick={() => onQuickStart(qs.prompt)}
                className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-[#00f5d4] hover:bg-gray-900/60 transition-all text-left group"
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
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {m.role === 'assistant' && <NexusRBXAvatar />}
              <div className={`max-w-[85%] md:max-w-[80%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div className={`p-4 md:p-5 rounded-2xl ${m.role === 'user' 
                  ? 'bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] text-white shadow-lg border border-white/10' 
                  : 'bg-[#121212] border border-white/5 backdrop-blur-md shadow-xl'}`}>
                  <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed">
                    <FormatText text={m.content} />
                  </div>
                  {m.action && m.action !== 'chat' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-[#00f5d4]">
                      <Sparkles className="w-3 h-3" />
                      Executing: {m.action.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              {m.role === 'user' && <UserAvatar email={user?.email} />}
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <NexusRBXAvatar isThinking={true} />
              <div className="max-w-[80%] order-2">
                <GenerationStatusBar currentStage="Agent is thinking..." />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}
    </div>
  );
}
