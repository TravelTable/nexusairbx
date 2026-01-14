import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText } from "./AiComponents";
import ScriptLoadingBarContainer from "../ScriptLoadingBarContainer";
import GenerationStatusBar from "./GenerationStatusBar";
import { MessageSquare, Zap, Bug, Rocket } from "lucide-react";

const quickStarts = [
  { icon: <Zap className="w-4 h-4 text-yellow-400" />, label: "Optimize Script", prompt: "Can you optimize this Luau script for better performance?" },
  { icon: <Bug className="w-4 h-4 text-red-400" />, label: "Debug Error", prompt: "I'm getting an error in my script, can you help me debug it?" },
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
                  {m.explanation && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-gray-100"><FormatText text={m.explanation} /></div>}
                  {m.role === 'assistant' && m.code && (
                    <div className="mt-4">
                      <ScriptLoadingBarContainer
                        filename={m.title || "Generated_Script.lua"}
                        codeReady={!!m.code}
                        loading={false}
                        onView={() => onViewUi(m)}
                      />
                    </div>
                  )}
                </div>
              </div>
              {m.role === 'user' && <UserAvatar email={user?.email} />}
            </div>
          ))}

          {pendingMessage && pendingMessage.type === "chat" && (
            <>
              <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-[80%] order-1">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#9b5de5]/60 to-[#00f5d4]/60 text-white shadow-lg border border-white/10 backdrop-blur-sm">
                    <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt}</div>
                  </div>
                </div>
                <UserAvatar email={user?.email} />
              </div>

              <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <NexusRBXAvatar isThinking={true} />
                <div className="max-w-[80%] order-2">
                  <GenerationStatusBar currentStage={generationStage} />
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
