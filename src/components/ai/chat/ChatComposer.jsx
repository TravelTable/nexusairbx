import React from "react";
import { Plus, X, Search, Zap, Sparkles, Loader } from "lucide-react";
import { UnifiedStatusBar, TokenBar } from "../AiComponents";

/**
 * Single composer component: status bar, suggestion chips, Plan/Act + tokens, then attach + input + mode + send.
 */
export default function ChatComposer({
  prompt,
  setPrompt,
  attachments,
  setAttachments,
  onSubmit,
  isGenerating,
  generationStage,
  placeholder,
  activeModeData,
  allModes,
  onModeChange,
  currentChatId,
  chatMode,
  setChatMode,
  onActClick,
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  themePrimary,
  themeSecondary,
  suggestions = [],
  onSuggestionClick,
  isPremium,
  onProNudge,
  onFileUpload,
  disabled,
}) {
  return (
    <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
      <div className="max-w-5xl mx-auto space-y-4">
        <UnifiedStatusBar
          isGenerating={isGenerating}
          stage={generationStage}
          mode={activeModeData?.id}
        />

        {suggestions.length > 0 && (
          <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-hide pb-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mr-2 shrink-0">
              Suggestions
            </span>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.requiresPro && !isPremium && onProNudge) {
                    onProNudge(item.proNudgeReason || "This feature");
                    return;
                  }
                  onSuggestionClick?.(item);
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 ${
                  item.primary
                    ? "bg-[#00f5d4]/5 border border-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
                {item.requiresPro && !isPremium && <Zap className="w-2 h-2 text-[#9b5de5] fill-current" />}
              </button>
            ))}
          </div>
        )}

        <div className="px-2 flex items-center justify-between gap-4 flex-wrap">
          <TokenBar
            tokensLeft={tokensLeft}
            tokensLimit={tokensLimit}
            resetsAt={resetsAt}
            plan={planKey}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {(activeModeData?.id === "ui" || activeModeData?.id === "system") && chatMode === "act" && (
              <span className="text-[9px] text-gray-500 font-medium hidden sm:inline">
                Tip: Use Plan to outline first
              </span>
            )}
            <div className="flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setChatMode("plan")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  chatMode === "plan" ? "bg-gray-800 text-[#00f5d4] shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                <Search className="w-3 h-3" /> Plan
              </button>
              <button
                type="button"
                onClick={onActClick}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  chatMode === "act" ? "bg-gray-800 text-orange-400 shadow-sm" : "text-gray-500 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" /> Act
              </button>
            </div>
          </div>
        </div>

        <div className="relative group">
          {isGenerating && (
            <div className="absolute -top-6 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-1 duration-500">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                Complex generations may take up to 5 minutes
              </span>
            </div>
          )}
          <div
            className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"
            style={{
              background: `linear-gradient(to right, ${themePrimary || "#9b5de5"}, ${themeSecondary || "#00f5d4"})`,
            }}
          />
          <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pt-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative group/file bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2 pr-8"
                  >
                    {file.isImage ? (
                      <img src={file.data} alt={file.name} className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <span className="text-gray-500 text-xs">📎</span>
                    )}
                    <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 px-2 pt-2">
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                  isGenerating ? "bg-[#00f5d4] text-black animate-pulse" : "bg-white/5 text-gray-500"
                }`}
              >
                {isGenerating ? generationStage || "Working…" : "Ready"}
              </div>
              <div className="h-px flex-1 bg-white/5" />
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
                  title="Upload Image or File"
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit?.();
                  }
                }}
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="tour-mode-toggle"
                  onClick={() => {
                    if (!allModes?.length) return;
                    const modeIds = allModes.map((m) => m.id);
                    const currentIndex = modeIds.indexOf(activeModeData?.id);
                    const nextIndex = (currentIndex + 1) % modeIds.length;
                    onModeChange?.(modeIds[nextIndex]);
                  }}
                  className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 ${activeModeData?.bg || ""} ${activeModeData?.color || "text-gray-400"}`}
                  style={
                    activeModeData?.id?.startsWith("custom_")
                      ? { color: activeModeData.color || "#9b5de5" }
                      : undefined
                  }
                  title={`Current: ${activeModeData?.label}. Click to cycle.`}
                >
                  {activeModeData?.icon}
                  <span className="hidden lg:inline">{activeModeData?.label}</span>
                </button>
                <button
                  type="button"
                  id="tour-generate-button"
                  onClick={() => onSubmit?.()}
                  disabled={disabled || (!prompt?.trim() && attachments.length === 0)}
                  className="p-3 rounded-xl transition-all disabled:opacity-50 bg-[#00f5d4] text-black hover:shadow-[0_0_20px_rgba(0,245,212,0.4)] active:scale-95"
                >
                  {isGenerating ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
