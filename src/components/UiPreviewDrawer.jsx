import React, { useMemo, useState, useEffect } from "react";
import { X, Download, Copy, Check } from "lucide-react";
import LuaPreviewRenderer from "../preview/LuaPreviewRenderer";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import luaLang from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// Register lua highlighting
SyntaxHighlighter.registerLanguage("lua", luaLang);

export default function UiPreviewDrawer({
  open,
  onClose,
  lua,
  prompt,
  onDownload,
  history = [],
  activeId = null,
  onSelectHistory,
  userEmail,
  gameSpec,
  onRefine,
}) {
  const [tab, setTab] = useState("preview"); // "preview" | "code" | "functionality" | "history"
  const [lastEvent, setLastEvent] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [manifestInfo, setManifestInfo] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  
  // Functionality state
  const [funcPrompt, setFuncPrompt] = useState("");
  const [funcPlan, setFuncPlan] = useState("");
  const [funcScripts, setFuncScripts] = useState([]);
  const [isGeneratingFunc, setIsGeneratingFunc] = useState(false);

  const isDeveloper = userEmail === "jackt1263@gmail.com";

  const handleGenerateFunctionality = async () => {
    if (!funcPrompt.trim()) return;
    setIsGeneratingFunc(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ui-builder/ai/generate-functionality`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await window.firebaseAuth.currentUser.getIdToken()}` },
        body: JSON.stringify({ lua, prompt: funcPrompt, gameSpec }),
      });
      const data = await res.json();
      setFuncPlan(data.plan);
      setFuncScripts(data.scripts);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFunc(false);
    }
  };
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lua);
      setCopySuccess(true);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = lua;
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
    }
  };

  const activeTitle = useMemo(() => {
    const p = String(prompt || "").trim();
    return p ? p.slice(0, 60) + (p.length > 60 ? "..." : "") : "UI Preview";
  }, [prompt]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[85vw] max-w-[1350px] bg-[#0b1220] border-l border-gray-800 shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-3 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-semibold">UI Preview</div>
            <div className="text-xs text-gray-400 truncate">{activeTitle}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-100 inline-flex items-center gap-1"
              onClick={handleCopy}
              disabled={!lua}
              title="Copy Lua Code"
            >
              {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? "Copied" : "Copy"}
            </button>

            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-100 inline-flex items-center gap-1"
              onClick={onDownload}
              disabled={!lua}
              title="Download Lua"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              type="button"
              className="p-2 rounded hover:bg-gray-800 text-gray-200"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-3 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`px-3 py-2 rounded text-sm border ${
                tab === "preview"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setTab("code")}
              className={`px-3 py-2 rounded text-sm border ${
                tab === "code"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setTab("functionality")}
              className={`px-3 py-2 rounded text-sm border ${
                tab === "functionality"
                  ? "border-[#f15bb5] bg-[#f15bb5]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Functionality
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`px-3 py-2 rounded text-sm border ${
                tab === "history"
                  ? "border-[#9b5de5] bg-[#9b5de5]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              History
            </button>
          </div>
        </div>

        <div className="p-3 h-[calc(100vh-128px)] overflow-hidden">
          {tab === "preview" ? (
            <div className="h-full flex flex-col gap-3">
              <div className="text-xs text-gray-400 border border-gray-800 rounded-lg p-2 bg-black/20">
                <span className="text-gray-300 font-semibold">Test Log:</span>{" "}
                {lastEvent
                  ? `${lastEvent.type} -> ${lastEvent.label || lastEvent.id || "item"}`
                  : "Click a button in the preview to test interactions."}
              </div>

              <div className="flex-1 min-h-0 border border-gray-800 rounded-lg overflow-hidden bg-black/20 relative group">
                <LuaPreviewRenderer
                  lua={lua}
                  interactive
                  onAction={(evt) => setLastEvent(evt)}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl">
                    <div className={`w-2 h-2 rounded-full ${lua ? 'bg-[#00f5d4] animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                      {lua ? "Manifest Active" : "No Manifest"}
                    </span>
                  </div>
                </div>

                {!lua && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b1220]/90 backdrop-blur-md text-gray-400 text-sm gap-3">
                    <Loader className="w-6 h-6 animate-spin text-[#9b5de5]" />
                    <span className="font-medium tracking-wide">Waiting for Lua Engine...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <input
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00f5d4] outline-none disabled:opacity-50"
                  placeholder="Refine this UI (e.g. 'Make it more blue', 'Add a close button')"
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !isRefining && onRefine(refineInput)}
                  disabled={isRefining}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-[#00f5d4] text-black font-bold text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                  onClick={() => onRefine(refineInput)}
                  disabled={!refineInput.trim() || isRefining}
                >
                  {isRefining ? <Check className="w-4 h-4 animate-spin" /> : null}
                  {isRefining ? "Refining..." : "Refine"}
                </button>
              </div>

              <div className="text-[11px] text-gray-500">
                Note: This previews the UI manifest inside the Lua and simulates interactions.
                Full gameplay logic should be tested in Roblox Studio.
              </div>
            </div>
          ) : tab === "functionality" ? (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              {!isDeveloper ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 bg-black/40 rounded-xl border border-dashed border-gray-800">
                  <div className="p-4 rounded-full bg-[#f15bb5]/10 text-[#f15bb5]">
                    <X className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Functionality Builder</h3>
                  <p className="text-gray-400 max-w-xs">
                    This feature is currently in private beta. Coming soon for all users!
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {funcPlan && (
                      <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <h4 className="text-[#f15bb5] font-bold mb-2 uppercase text-xs tracking-widest">Implementation Plan</h4>
                        <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{funcPlan}</div>
                      </div>
                    )}
                    {funcScripts.map((s, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-400">{s.name} ({s.location})</span>
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
                    />
                    <button
                      className="px-4 py-2 rounded-lg bg-[#f15bb5] text-white font-bold text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                      onClick={handleGenerateFunctionality}
                      disabled={isGeneratingFunc || !funcPrompt.trim()}
                    >
                      {isGeneratingFunc ? <Check className="w-4 h-4 animate-spin" /> : null}
                      {isGeneratingFunc ? "Generating..." : "Generate Scripts"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : tab === "code" ? (
            <div className="h-full flex flex-col gap-3">
              <div className="flex-1 min-h-0 border border-gray-800 rounded-lg overflow-auto bg-[#181825]">
                <SyntaxHighlighter
                  language="lua"
                  style={atomOneDark}
                  customStyle={{
                    background: "transparent",
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                  showLineNumbers
                  wrapLongLines
                >
                  {lua || "-- No code generated yet"}
                </SyntaxHighlighter>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-[#00f5d4] text-black font-bold text-sm hover:scale-[1.02] transition-transform"
                  onClick={handleCopy}
                >
                  {copySuccess ? "Copied!" : "Copy Code"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
                  onClick={onDownload}
                >
                  Download .lua
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              <div className="text-xs text-gray-400">Newest first</div>
              <div className="flex-1 overflow-auto space-y-1 pr-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHistory?.(h.id)}
                    className={`w-full text-left px-2 py-2 rounded border ${
                      h.id === activeId
                        ? "border-[#9b5de5] bg-[#9b5de5]/10"
                        : "border-gray-800 hover:bg-gray-900"
                    }`}
                    title={h.prompt}
                  >
                    <div className="text-xs text-gray-200 truncate">
                      {h.prompt || "Untitled"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                    </div>
                  </button>
                ))}
                {history.length === 0 ? (
                  <div className="text-sm text-gray-500 py-6 text-center">
                    No UI generations yet.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
