import React from "react";
import { Sparkles, Zap, Settings2, Plus, Users, Layout, Rocket } from "lucide-react";
import { CHAT_MODES } from "../chatConstants";

export default function ChatEmptyState({
  activeMode,
  modeTab,
  setModeTab,
  onModeChange,
  customModes = [],
  onCreateCustomMode,
  onEditCustomMode,
  onInstallCommunityMode,
  onToggleActMode,
  onPlanUI,
  onPlanSystem,
  communityModes = [],
  loadingCommunity,
  fetchCommunityModes,
  user,
  isPremium,
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-10 py-12">
      <div className="space-y-3">
        {(onPlanUI || onPlanSystem) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {onPlanUI && (
              <button
                type="button"
                onClick={onPlanUI}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-sm font-bold hover:bg-[#00f5d4]/20 transition-all"
              >
                <Layout className="w-4 h-4" />
                Plan a UI
              </button>
            )}
            {onPlanSystem && (
              <button
                type="button"
                onClick={onPlanSystem}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 text-sm font-bold hover:bg-blue-400/20 transition-all"
              >
                <Rocket className="w-4 h-4" />
                Plan a system
              </button>
            )}
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
          <Sparkles className="w-3 h-3 text-[#00f5d4]" />
          Select Assistant Mode
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter">
          How can Nexus help today?
        </h2>
        <p className="text-gray-400 max-w-md mx-auto text-sm font-medium">
          Choose a specialized mode to get the most accurate and optimized results for your task.
        </p>
      </div>

      <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit mx-auto">
        <button
          onClick={() => setModeTab("official")}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "official" ? "bg-gray-800 text-[#00f5d4]" : "text-gray-500 hover:text-white"}`}
        >
          Official
        </button>
        <button
          onClick={() => setModeTab("custom")}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "custom" ? "bg-gray-800 text-[#9b5de5]" : "text-gray-500 hover:text-white"}`}
        >
          My Experts
        </button>
        <button
          onClick={() => {
            setModeTab("community");
            fetchCommunityModes();
          }}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modeTab === "community" ? "bg-gray-800 text-cyan-400" : "text-gray-500 hover:text-white"}`}
        >
          Community
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {modeTab === "official" &&
          CHAT_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? "border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10" : `border-gray-800 ${mode.border}`}`}
            >
              {["security", "performance", "data", "system", "animator"].includes(mode.id) && (
                <div className="absolute top-3 right-3 z-10">
                  <Zap className="w-3 h-3 text-[#9b5de5] fill-current" />
                </div>
              )}
              {activeMode === mode.id && (
                <div className={`absolute inset-0 opacity-10 ${mode.bg}`} />
              )}
              <div
                className={`mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform ${mode.bg} ${mode.color}`}
              >
                {mode.icon}
              </div>
              <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mode.label}
                  {["security", "performance", "data", "system", "animator"].includes(mode.id) &&
                    !isPremium && (
                      <span className="px-1.5 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-[8px] font-black uppercase tracking-widest">
                        Pro
                      </span>
                    )}
                </div>
                {activeMode === mode.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
              <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                {mode.description}
              </div>
            </button>
          ))}

        {modeTab === "custom" && (
          <>
            {customModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? "border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10" : "border-gray-800 hover:border-white/20"}`}
              >
                {activeMode === mode.id && (
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: mode.color }}
                  />
                )}
                <div
                  className="mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform bg-white/5"
                  style={{ color: mode.color }}
                >
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mode.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCustomMode(mode);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    >
                      <Settings2 className="w-3 h-3" />
                    </button>
                    {activeMode === mode.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                  {mode.description || "Custom AI Expert"}
                </div>
              </button>
            ))}
            <button
              onClick={() => {
                if (!isPremium && user?.plan !== "PRO" && user?.plan !== "TEAM" && onToggleActMode) {
                  onToggleActMode({ prompt: "Create Custom Expert" });
                  return;
                }
                onCreateCustomMode();
              }}
              className="p-5 rounded-2xl bg-white/5 border border-dashed border-white/10 hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/5 transition-all text-center group relative flex flex-col items-center justify-center gap-3"
            >
              {user?.plan !== "PRO" && user?.plan !== "TEAM" && (
                <div className="absolute top-3 right-3">
                  <Zap className="w-3 h-3 text-[#9b5de5] fill-current" />
                </div>
              )}
              <div className="p-3 rounded-full bg-white/5 group-hover:bg-[#00f5d4]/20 group-hover:text-[#00f5d4] transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">
                Create Expert
              </div>
            </button>
          </>
        )}

        {modeTab === "community" && (
          <>
            {loadingCommunity ? (
              <div className="col-span-full py-12 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  Browsing Community Experts...
                </p>
              </div>
            ) : communityModes.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  No community experts found yet.
                </p>
              </div>
            ) : (
              communityModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onModeChange(mode.id)}
                  className={`p-5 rounded-2xl bg-gray-900/40 border transition-all text-left group relative overflow-hidden ${activeMode === mode.id ? "border-white/20 ring-2 ring-offset-2 ring-offset-black ring-white/10" : "border-gray-800 hover:border-white/20"}`}
                >
                  {activeMode === mode.id && (
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ backgroundColor: mode.color }}
                    />
                  )}
                  <div
                    className="mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform bg-white/5"
                    style={{ color: mode.color }}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-white mb-1 text-sm flex items-center justify-between">
                    {mode.label}
                    {activeMode === mode.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
                    {mode.description || "Community Expert"}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center text-[8px] font-bold text-white">
                        {mode.authorName?.[0] || "?"}
                      </div>
                      <span className="text-[9px] text-gray-500 font-bold">
                        {mode.authorName || "Anonymous"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstallCommunityMode(mode);
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                    >
                      Install
                    </button>
                  </div>
                </button>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
