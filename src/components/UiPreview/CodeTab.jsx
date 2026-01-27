import React, { useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { ChevronDown, ChevronRight, FileCode, Cpu, Copy, Check } from "lucide-react";

export default function CodeTab({
  uiModuleLua,
  systemsLua,
  lua, // Fallback
  copySuccess,
  handleCopy,
  onDownload
}) {
  const [activeTab, setActiveTab] = useState("ui"); // "ui" | "systems"
  const [localCopySuccess, setLocalCopySuccess] = useState(false);

  const uiCode = uiModuleLua || lua || "-- No UI code generated";
  const systemsCode = systemsLua || "-- No systems logic generated yet";

  const handleLocalCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setLocalCopySuccess(true);
      setTimeout(() => setLocalCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Tab Switcher */}
      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab("ui")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "ui" ? "bg-gray-800 text-[#00f5d4] shadow-lg" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          UI Module
        </button>
        <button
          onClick={() => setActiveTab("systems")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "systems" ? "bg-gray-800 text-[#9b5de5] shadow-lg" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Systems Logic
        </button>
      </div>

      <div className="flex-1 min-h-0 border border-gray-800 rounded-xl overflow-hidden bg-[#0D0D0D] flex flex-col relative group">
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleLocalCopy(activeTab === "ui" ? uiCode : systemsCode)}
            className="p-2 rounded-lg bg-black/60 border border-white/10 text-gray-400 hover:text-white transition-all"
            title="Copy this file"
          >
            {localCopySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide">
          <SyntaxHighlighter
            language="lua"
            style={atomOneDark}
            customStyle={{
              background: "transparent",
              margin: 0,
              padding: "1.5rem",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
            showLineNumbers
            wrapLongLines
          >
            {activeTab === "ui" ? uiCode : systemsCode}
          </SyntaxHighlighter>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] text-gray-500 max-w-[200px]">
          {activeTab === "ui" 
            ? "The UI Module handles instantiation and layout. Ends with 'return UI'." 
            : "Systems Logic handles interactions and game state. No return required."}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
            onClick={onDownload}
          >
            Download Package (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
