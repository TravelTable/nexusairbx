import React, { useEffect, useRef, useState } from "react";
import { Plus, X, Sparkles, Loader, RefreshCw, Wand2, ChevronDown, Check } from "lucide-react";
import { UnifiedStatusBar, TokenBar } from "../AiComponents";
import { CHAT_MODES } from "../chatConstants";

function ModeSelector({ mode, onModeChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all disabled:opacity-40 ${current.bg} ${current.color} border-white/10 hover:bg-white/10`}
        title="Select mode"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.icon}
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-white/10 bg-[#0D0D0D] backdrop-blur-2xl shadow-2xl z-50 p-1.5"
          role="listbox"
        >
          {CHAT_MODES.map((m) => {
            const selected = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onModeChange?.(m.id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                  selected ? "bg-white/[0.07] border border-white/10" : "border border-transparent hover:bg-white/5"
                }`}
              >
                <span className={`mt-0.5 ${m.color}`}>{m.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{m.label}</span>
                    {selected && <Check className="w-3 h-3 text-[#00f5d4]" />}
                  </span>
                  <span className="block text-[10px] text-gray-500 leading-snug mt-0.5">{m.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Slim composer for the linear flow: status strip, token bar, mode selector,
 * attachments, prompt, send. The mode selector picks the Cursor-style operating
 * mode; clarifying questions only appear in Plan and Ask modes.
 */
export default function ChatComposer({
  prompt,
  setPrompt,
  attachments,
  setAttachments,
  onSubmit,
  isGenerating,
  generationStage,
  placeholder = "What do you want to build?",
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  unlimitedTokens,
  devOverride,
  themePrimary,
  themeSecondary,
  refineTarget,
  onCancelRefine,
  onFileUpload,
  onImprovePrompt,
  isImproving,
  disabled,
  mode = "agent",
  onModeChange,
}) {
  return (
    <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
      <div className="max-w-5xl mx-auto space-y-3">
        <UnifiedStatusBar isGenerating={isGenerating} stage={generationStage} />

        <div className="px-2 flex items-center justify-between gap-4 flex-wrap">
          <TokenBar
            tokensLeft={tokensLeft}
            tokensLimit={tokensLimit}
            resetsAt={resetsAt}
            plan={planKey}
            unlimitedTokens={unlimitedTokens}
            devOverride={devOverride}
          />
        </div>

        {refineTarget && (
          <div className="px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4] text-[11px] font-bold">
              <RefreshCw className="w-3.5 h-3.5" />
              Refining: {refineTarget.title || "current artifact"}
              <button
                type="button"
                onClick={onCancelRefine}
                className="ml-1 text-[#00f5d4]/70 hover:text-white transition-colors"
                aria-label="Cancel refine"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="relative group">
          <div
            className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"
            style={{
              background: `linear-gradient(to right, ${themePrimary || "#9b5de5"}, ${themeSecondary || "#00f5d4"})`,
            }}
            aria-hidden="true"
          />
          <div className="relative bg-ink-800/90 border border-white/10 rounded-2xl2 p-2 shadow-panel backdrop-blur-xl flex flex-col gap-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pt-2" aria-label="Attached files">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative group/file bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2 pr-8">
                    {file.isImage ? (
                      <img src={file.data} alt={file.name} className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <span className="text-gray-500 text-xs font-bold">FILE</span>
                    )}
                    <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 px-2 pt-2">
              <ModeSelector mode={mode} onModeChange={onModeChange} disabled={disabled} />
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                  isGenerating ? "bg-[#00f5d4] text-black animate-pulse" : "bg-white/5 text-gray-500"
                }`}
              >
                {isGenerating ? generationStage || "Working" : "Ready"}
              </div>
              <div className="h-px flex-1 bg-white/5" />
              {onImprovePrompt && (
                <button
                  type="button"
                  onClick={() => onImprovePrompt()}
                  disabled={disabled || isImproving || !prompt?.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#9b5de5] bg-[#9b5de5]/10 border border-[#9b5de5]/20 hover:bg-[#9b5de5]/20 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Expand your prompt into a detailed brief"
                  aria-label="Improve my prompt"
                >
                  {isImproving ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  {isImproving ? "Improving" : "Improve"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 p-2 pt-0">
              <div className="relative">
                <input
                  type="file"
                  id="chat-composer-file-upload"
                  className="hidden"
                  multiple
                  onChange={onFileUpload}
                  accept="image/*,.lua,.txt,.json"
                />
                <label
                  htmlFor="chat-composer-file-upload"
                  className="p-3 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
                  title="Upload image or file"
                  aria-label="Upload image or file"
                >
                  <Plus className="h-5 w-5" />
                </label>
              </div>

              <textarea
                id="tour-prompt-box"
                className="flex-1 bg-transparent border-none rounded-xl p-3 resize-none focus:ring-0 text-gray-100 placeholder-gray-500 text-[14px] md:text-[15px] leading-relaxed disabled:opacity-50 min-h-[44px]"
                rows={1}
                placeholder={placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={disabled}
                aria-label="Prompt input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit?.();
                  }
                }}
              />

              <button
                type="button"
                id="tour-generate-button"
                onClick={() => onSubmit?.()}
                disabled={disabled || (!prompt?.trim() && attachments.length === 0)}
                className="p-3 rounded-xl transition-all disabled:opacity-50 disabled:active:scale-100 bg-nexus-cyan text-black hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] active:scale-95 focus-ring"
                aria-label={isGenerating ? "Generation in progress" : "Send prompt"}
              >
                {isGenerating ? <Loader className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
