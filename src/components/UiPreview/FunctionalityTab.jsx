import React from "react";
import { Image as ImageIcon, Copy, Loader } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export default function FunctionalityTab({
  funcPlan,
  funcScripts,
  isGeneratingFunc,
  funcPrompt,
  setFuncPrompt,
  handleGenerateFunctionality
}) {
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
          {funcPlan && (
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
              <h4 className="text-[#f15bb5] font-bold mb-2 uppercase text-xs tracking-widest">Implementation Plan</h4>
              <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{funcPlan}</div>
            </div>
          )}
          {funcScripts.length === 0 && !isGeneratingFunc && !funcPlan && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-[#f15bb5]/10 text-[#f15bb5]">
                <ImageIcon className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-white">Functionality Builder</h3>
              <p className="text-gray-400 max-w-xs text-sm">
                Describe the logic you need (e.g. "Handle buying items", "Open/Close logic") and Nexus will generate the scripts.
              </p>
            </div>
          )}
          {funcScripts.map((s, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-200">{s.name}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-[#f15bb5] font-bold uppercase tracking-wider border border-[#f15bb5]/20">
                    {s.location || "StarterPlayerScripts"}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(s.code);
                  }}
                  className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Copy Script"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-[#181825] rounded-xl border border-gray-800 overflow-hidden">
                <SyntaxHighlighter
                  language="lua"
                  style={atomOneDark}
                  customStyle={{ background: "transparent", padding: "1rem", fontSize: "12px" }}
                >
                  {s.code}
                </SyntaxHighlighter>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <input
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[#f15bb5] outline-none disabled:opacity-50"
            placeholder="What functionality do you need? (e.g. 'Handle buying items', 'Open/Close logic')"
            value={funcPrompt}
            onChange={e => setFuncPrompt(e.target.value)}
            disabled={isGeneratingFunc}
            onKeyDown={e => e.key === "Enter" && handleGenerateFunctionality()}
          />
          <button
            className="px-4 py-2 rounded-lg bg-[#f15bb5] text-white font-bold text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            onClick={handleGenerateFunctionality}
            disabled={isGeneratingFunc || !funcPrompt.trim()}
          >
            {isGeneratingFunc ? <Loader className="w-4 h-4 animate-spin" /> : null}
            {isGeneratingFunc ? "Generating..." : "Generate Scripts"}
          </button>
        </div>
      </div>
    </div>
  );
}
