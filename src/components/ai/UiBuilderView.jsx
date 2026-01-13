import React from "react";
import { NexusRBXAvatar, UserAvatar, FormatText } from "./AiComponents";
import ScriptLoadingBarContainer from "../ScriptLoadingBarContainer";
import GenerationStatusBar from "./GenerationStatusBar";
import { Layout, Palette, MousePointer2, Sparkles } from "lucide-react";

const uiQuickStarts = [
  { icon: <Layout className="w-4 h-4 text-[#00f5d4]" />, label: "Main Menu", prompt: "Military themed main menu with Play, Settings, Shop" },
  { icon: <Palette className="w-4 h-4 text-[#9b5de5]" />, label: "RPG HUD", prompt: "Fantasy RPG HUD with health/mana orbs and level bar" },
  { icon: <MousePointer2 className="w-4 h-4 text-[#f15bb5]" />, label: "Modern Shop", prompt: "Modern shop UI with item categories and grid layout" },
];

export default function UiBuilderView({ 
  messages, 
  pendingMessage, 
  generationStage, 
  user, 
  onViewUi, 
  onQuickStart,
  chatEndRef 
}) {
  const uiMessages = messages.filter(m => m.metadata?.type === "ui" || m.type === "ui" || (m.role === 'assistant' && m.code));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {uiMessages.length === 0 && !pendingMessage ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/20">
                <Sparkles className="w-6 h-6 text-[#00f5d4]" />
              </div>
              <h2 className="text-3xl font-bold text-white">UI Builder</h2>
            </div>
            <p className="text-gray-400 max-w-md">Describe any interface—from main menus to complex inventory systems. Nexus will design and code it for you.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            {uiQuickStarts.map((qs, i) => (
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
        <>
          {uiMessages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {m.role === 'assistant' && <NexusRBXAvatar />}
              <div className={`max-w-[85%] md:max-w-[80%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div className={`p-4 md:p-5 rounded-2xl ${m.role === 'user' 
                  ? 'bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] text-white shadow-lg border border-white/10' 
                  : 'bg-[#121212] border border-white/5 backdrop-blur-md shadow-xl'}`}>
                  {m.content && m.role === 'user' && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-white">{m.content}</div>}
                  {m.explanation && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-gray-100"><FormatText text={m.explanation} /></div>}
                  {m.role === 'assistant' && m.code && (
                    <div className="mt-4">
                      <ScriptLoadingBarContainer
                        filename={m.title || "Generated_UI.lua"}
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

          {pendingMessage && pendingMessage.type === "ui" && (
            <>
              <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-[80%] order-1">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#00f5d4]/60 to-[#9b5de5]/60 text-white shadow-lg border border-white/10 backdrop-blur-sm">
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
        </>
      )}
    </div>
  );
}
