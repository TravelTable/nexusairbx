import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Loader, Settings2, Sliders, Grid3X3, Smartphone, Tablet, Monitor, MousePointer2, Move, ScanLine, GitCompare } from "lucide-react";
import LuaPreviewRenderer, { PREVIEW_DEVICES } from "../../preview/LuaPreviewRenderer";
import RefineChips from "../ai/RefineChips";

export default function PreviewTab({
  lua,
  boardState,
  lastEvent,
  setLastEvent,
  imageNodes,
  setTab,
  refineInput,
  setRefineInput,
  isRefining,
  onRefine,
}) {
  const [showGrid, setShowGrid] = React.useState(false);
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [showSafeArea, setShowSafeArea] = React.useState(true);
  const [device, setDevice] = useState("pc");
  const [editMode, setEditMode] = useState(false);
  const [tweaks, setTweaks] = React.useState({
    radius: 12,
    strokeThickness: 2,
    transparency: 0
  });

  // Before/after diff: stash the previously-rendered boardState whenever a new
  // one arrives (e.g. after a refine) so the user can compare last vs current.
  const [previousBoard, setPreviousBoard] = useState(null);
  const [compare, setCompare] = useState(false);
  const prevBoardRef = useRef(boardState);

  useEffect(() => {
    if (boardState && prevBoardRef.current && boardState !== prevBoardRef.current) {
      setPreviousBoard(prevBoardRef.current);
    }
    prevBoardRef.current = boardState;
  }, [boardState]);

  // If there is nothing to compare against, never leave the toggle stuck on.
  useEffect(() => {
    if (!previousBoard && compare) setCompare(false);
  }, [previousBoard, compare]);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {Object.entries(PREVIEW_DEVICES).map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              className={`p-2 rounded-lg transition-all ${device === id ? 'bg-[#00f5d4] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
              title={cfg.name}
            >
              {id === 'pc' && <Monitor className="w-4 h-4" />}
              {id === 'tablet' && <Tablet className="w-4 h-4" />}
              {(id === 'phone' || id === 'portrait') && <Smartphone className={`w-4 h-4 ${id === 'portrait' ? '' : 'rotate-90'}`} />}
            </button>
          ))}
        </div>

        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${editMode ? 'bg-[#00f5d4] text-black border-[#00f5d4]' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
        >
          {editMode ? <Move className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
          {editMode ? 'Exit Visual Edit' : 'Visual Nudge'}
        </button>
      </div>

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
        <div className={`h-full w-full ${showGrid ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]' : ''}`}>
          {compare && previousBoard ? (
            <div className="h-full w-full grid grid-cols-2 gap-px bg-white/10">
              <div className="relative bg-black/20 overflow-hidden">
                <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  Before
                </span>
                <LuaPreviewRenderer
                  boardState={previousBoard}
                  interactive={false}
                  device={device}
                  showSafeArea={showSafeArea}
                />
              </div>
              <div className="relative bg-black/20 overflow-hidden">
                <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-[#00f5d4]/20 border border-[#00f5d4]/40 text-[9px] font-black uppercase tracking-widest text-[#00f5d4]">
                  After
                </span>
                <LuaPreviewRenderer
                  lua={lua}
                  boardState={boardState}
                  interactive={false}
                  device={device}
                  showSafeArea={showSafeArea}
                />
              </div>
            </div>
          ) : (
            <LuaPreviewRenderer
              lua={lua}
              boardState={boardState}
              interactive={!editMode}
              device={device}
              editMode={editMode}
              showSafeArea={showSafeArea}
              onAction={(evt) => setLastEvent(evt)}
            />
          )}
        </div>

        {/* Compare toggle (only when a previous layout exists) */}
        {previousBoard && (
          <button
            onClick={() => setCompare((c) => !c)}
            className={`absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${compare ? 'bg-[#9b5de5] border-[#9b5de5] text-white' : 'bg-black/80 border-white/10 text-gray-300 hover:text-white'}`}
            title="Compare the previous layout with the current one"
            aria-pressed={compare}
          >
            <GitCompare className="w-3.5 h-3.5" />
            {compare ? 'Exit Compare' : 'Compare'}
          </button>
        )}

        {/* Status Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={() => setShowSafeArea(!showSafeArea)}
            className={`p-1.5 rounded-lg border transition-all ${showSafeArea ? 'bg-[#00f5d4] border-[#00f5d4] text-black' : 'bg-black/80 border-white/10 text-gray-400 hover:text-white'}`}
            title="Toggle Roblox topbar / safe-area overlay"
          >
            <ScanLine className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTweaks(!showTweaks)}
            className={`p-1.5 rounded-lg border transition-all ${showTweaks ? 'bg-[#9b5de5] border-[#9b5de5] text-white' : 'bg-black/80 border-white/10 text-gray-400 hover:text-white'}`}
            title="Live Tweaks"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border transition-all ${showGrid ? 'bg-[#00f5d4] border-[#00f5d4] text-black' : 'bg-black/80 border-white/10 text-gray-400 hover:text-white'}`}
            title="Toggle Grid Overlay"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl pointer-events-none">
            <div className={`w-2 h-2 rounded-full ${boardState ? 'bg-[#00f5d4] animate-pulse' : lua ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
              {boardState ? "Live Preview" : lua ? "Lua Fallback" : "No Manifest"}
            </span>
          </div>
        </div>


        {!lua && !boardState && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b1220]/90 backdrop-blur-md text-gray-400 text-sm gap-3">
            <Loader className="w-6 h-6 animate-spin text-[#9b5de5]" />
            <span className="font-medium tracking-wide">Waiting for Lua Engine...</span>
          </div>
        )}

        {/* Tweaks Panel */}
        {showTweaks && (
          <div className="absolute top-14 right-3 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-4 text-[#9b5de5]">
              <Sliders className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Tweaks</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Corner Radius</span>
                  <span className="text-white">{tweaks.radius}px</span>
                </div>
                <input 
                  type="range" min="0" max="32" value={tweaks.radius}
                  onChange={(e) => setTweaks({...tweaks, radius: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#9b5de5]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Stroke Weight</span>
                  <span className="text-white">{tweaks.strokeThickness}px</span>
                </div>
                <input 
                  type="range" min="0" max="8" value={tweaks.strokeThickness}
                  onChange={(e) => setTweaks({...tweaks, strokeThickness: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#9b5de5]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Transparency</span>
                  <span className="text-white">{tweaks.transparency}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={tweaks.transparency}
                  onChange={(e) => setTweaks({...tweaks, transparency: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#9b5de5]"
                />
              </div>
              <button 
                onClick={() => onRefine(`Apply these tweaks: radius ${tweaks.radius}, stroke ${tweaks.strokeThickness}, transparency ${tweaks.transparency/100}`)}
                className="w-full py-2 rounded-lg bg-[#9b5de5] text-white text-xs font-bold hover:bg-[#8a4cd4] transition-colors mt-2"
              >
                Apply Tweaks with AI
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <RefineChips onRefine={onRefine} isRefining={isRefining} />
        <div className="flex items-center gap-2">
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
      </div>

      <div className="text-[11px] text-gray-500">
        Note: This previews the UI manifest inside the Lua and simulates interactions.
        Full gameplay logic should be tested in Roblox Studio.
      </div>
    </div>
  );
}
