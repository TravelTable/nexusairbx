import React, { useMemo } from "react";
import { Terminal, Code2, FileText, Sparkles } from "lucide-react";
import { FormatText } from "./AiComponents";

export default function LiveCodeViewer({ content = "" }) {
  // Parse the streaming content to separate explanation and code
  const parsed = useMemo(() => {
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
    const explanationMatch = content.match(/<explanation>([\s\S]*?)<\/explanation>/i);
    const codeMatch = content.match(/<code>([\s\S]*?)<\/code>/i);

    // If we haven't found tags yet, it might be raw streaming text
    let explanation = explanationMatch ? explanationMatch[1].trim() : "";
    let code = codeMatch ? codeMatch[1].trim() : "";
    let title = titleMatch ? titleMatch[1].trim() : "Nexus Generation";

    // Fallback for raw streaming before tags are closed
    if (!explanation && !code) {
      const rawExplanation = content.split("<explanation>")[1] || "";
      explanation = rawExplanation.split("</explanation>")[0].trim();
      
      const rawCode = content.split("<code>")[1] || "";
      code = rawCode.split("</code>")[0].trim();
    }

    // Support for new UI module format in stream
    if (!code) {
      const uiModuleMatch = content.match(/<uiModuleLua>([\s\S]*?)<\/uiModuleLua>/i);
      if (uiModuleMatch) code = uiModuleMatch[1].trim();
      else {
        const rawUiModule = content.split("<uiModuleLua>")[1] || "";
        code = rawUiModule.split("</uiModuleLua>")[0].trim();
      }
    }

    return { title, explanation, code };
  }, [content]);

  const hasCode = parsed.code.length > 0;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
      {/* Header / Window Controls */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className="flex items-center gap-2">
            {hasCode ? (
              <Code2 className="w-3.5 h-3.5 text-[#00f5d4]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#9b5de5]" />
            )}
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[150px]">
              {parsed.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-[#00f5d4]/10 border border-[#00f5d4]/20 flex items-center gap-1.5">
            <Sparkles className="w-2.5 h-2.5 text-[#00f5d4] animate-pulse" />
            <span className="text-[9px] font-black text-[#00f5d4] uppercase tracking-tighter">Live Stream</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-[200px] max-h-[400px] overflow-hidden">
        {/* Explanation Section */}
        {parsed.explanation && (
          <div className={`p-4 text-[13px] leading-relaxed text-gray-300 border-b border-white/5 bg-white/[0.02] overflow-y-auto ${hasCode ? 'max-h-[120px]' : 'flex-1'}`}>
            <FormatText text={parsed.explanation} />
          </div>
        )}

        {/* Code Section */}
        <div className="flex-1 bg-black/40 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border-b border-white/5">
            <Terminal className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Roblox Luau</span>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-[12px] text-gray-300 scrollbar-hide">
            {parsed.code ? (
              <pre className="whitespace-pre">
                {parsed.code}
                <span className="inline-block w-1.5 h-4 ml-1 bg-[#00f5d4] animate-pulse align-middle" />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for code...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between">
        <div className="text-[9px] text-gray-500 font-medium">
          {parsed.code.length > 0 ? `${parsed.code.split('\n').length} lines generated` : 'Initializing...'}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-ping" />
          <span className="text-[9px] text-[#00f5d4] font-bold uppercase">Syncing</span>
        </div>
      </div>
    </div>
  );
}
