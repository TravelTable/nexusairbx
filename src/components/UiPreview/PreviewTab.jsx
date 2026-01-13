import React from "react";
import { AlertCircle, Loader } from "lucide-react";
import LuaPreviewRenderer from "../../preview/LuaPreviewRenderer";

export default function PreviewTab({
  lua,
  lastEvent,
  setLastEvent,
  imageNodes,
  setTab,
  refineInput,
  setRefineInput,
  isRefining,
  onRefine
}) {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="text-xs text-gray-400 border border-gray-800 rounded-lg p-2 bg-black/20 flex items-center justify-between">
        <div>
          <span className="text-gray-300 font-semibold">Test Log:</span>{" "}
          {lastEvent
            ? `${lastEvent.type} -> ${lastEvent.label || lastEvent.id || "item"}`
            : "Click a button in the preview to test interactions."}
        </div>
        {imageNodes.some(n => !n.imageId || n.imageId.includes('//0')) && (
          <button 
            onClick={() => setTab("assets")}
            className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider animate-pulse"
          >
            <AlertCircle className="w-3 h-3" />
            Missing Icon IDs
          </button>
        )}
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
          {isRefining ? <Loader className="w-4 h-4 animate-spin" /> : null}
          {isRefining ? "Refining..." : "Refine"}
        </button>
      </div>

      <div className="text-[11px] text-gray-500">
        Note: This previews the UI manifest inside the Lua and simulates interactions.
        Full gameplay logic should be tested in Roblox Studio.
      </div>
    </div>
  );
}
