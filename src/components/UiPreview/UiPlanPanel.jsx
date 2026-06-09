import React, { useState, useCallback } from "react";
import {
  Sparkles,
  Loader,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Coins,
  Wand2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  aiPlanUi,
  aiGenerateAssets,
  aiRegenerateAsset,
  aiRegenerateComponent,
} from "../../lib/uiBuilderApi";

function Swatch({ name, hex }) {
  if (!hex) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded border border-white/20"
        style={{ backgroundColor: hex }}
      />
      <span className="text-[10px] text-gray-400">{name}</span>
    </div>
  );
}

function CostIndicator({ estimate }) {
  if (!estimate) return null;
  const {
    totalEstimatedTokens = 0,
    imagesToGenerate = 0,
    reusableAssets = 0,
    nativeReplaceable = 0,
    notes = [],
    plan,
  } = estimate;
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-[#ffcb05]" />
        <span className="text-xs font-bold text-gray-200">Estimated cost</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-500">{plan}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-black text-white">{totalEstimatedTokens.toLocaleString()}</div>
          <div className="text-[9px] text-gray-500">tokens</div>
        </div>
        <div>
          <div className="text-sm font-black text-white">{imagesToGenerate}</div>
          <div className="text-[9px] text-gray-500">images</div>
        </div>
        <div>
          <div className="text-sm font-black text-[#00f5d4]">{reusableAssets + nativeReplaceable}</div>
          <div className="text-[9px] text-gray-500">saved (reuse/native)</div>
        </div>
      </div>
      {notes.length > 0 && (
        <ul className="space-y-0.5">
          {notes.map((n, i) => (
            <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#00f5d4] mt-0.5 shrink-0" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Plan & Assets panel: structured UI plan + reusable asset generation +
 * per-asset / per-component regeneration + a cost/budget indicator.
 *
 * Props:
 *  - user: firebase user (for getIdToken)
 *  - prompt: default prompt text
 *  - boardState: current boardState (assets attach to matching item ids)
 *  - onUpdateBoardState(boardState): apply asset attachments back to the canvas
 */
export default function UiPlanPanel({ user, prompt: defaultPrompt = "", boardState, onUpdateBoardState }) {
  const [prompt, setPrompt] = useState(defaultPrompt || "");
  const [plan, setPlan] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [assets, setAssets] = useState({}); // asset_id -> metadata
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [componentInstruction, setComponentInstruction] = useState("");
  const [componentTarget, setComponentTarget] = useState("");

  const getToken = useCallback(async () => {
    if (!user?.getIdToken) throw new Error("Please sign in to use the UI planner.");
    return user.getIdToken();
  }, [user]);

  const handlePlan = useCallback(async () => {
    setError("");
    if (!prompt.trim()) {
      setError("Describe the UI you want to plan.");
      return;
    }
    setLoading("plan");
    try {
      const token = await getToken();
      const data = await aiPlanUi({ token, prompt: prompt.trim(), projectId });
      setPlan(data.plan);
      setEstimate(data.estimate);
    } catch (e) {
      setError(e?.message || "Failed to generate plan.");
    } finally {
      setLoading("");
    }
  }, [prompt, projectId, getToken]);

  const handleGenerateAssets = useCallback(async () => {
    if (!plan) return;
    setError("");
    setLoading("assets");
    try {
      const token = await getToken();
      const data = await aiGenerateAssets({ token, projectId, plan, boardState });
      setProjectId(data.projectId);
      const map = { ...assets };
      for (const r of data.results || []) {
        if (r.ok && r.asset) map[r.asset.asset_id] = r.asset;
      }
      setAssets(map);
      if (data.boardState && onUpdateBoardState) onUpdateBoardState(data.boardState);
    } catch (e) {
      setError(e?.message || "Failed to generate assets.");
    } finally {
      setLoading("");
    }
  }, [plan, projectId, boardState, assets, getToken, onUpdateBoardState]);

  const handleRegenAsset = useCallback(
    async (assetId) => {
      if (!projectId) {
        setError("Generate assets first, then individual assets can be regenerated.");
        return;
      }
      setError("");
      setLoading(`asset:${assetId}`);
      try {
        const token = await getToken();
        const data = await aiRegenerateAsset({ token, assetId, projectId, boardState });
        if (data.asset) setAssets((prev) => ({ ...prev, [assetId]: data.asset }));
        if (data.boardState && onUpdateBoardState) onUpdateBoardState(data.boardState);
      } catch (e) {
        setError(e?.message || "Failed to regenerate asset.");
      } finally {
        setLoading("");
      }
    },
    [projectId, boardState, getToken, onUpdateBoardState]
  );

  const handleRegenComponent = useCallback(async () => {
    if (!boardState) {
      setError("Open a generated UI first to revise a component.");
      return;
    }
    if (!componentTarget.trim() || !componentInstruction.trim()) {
      setError("Enter the component id and an instruction.");
      return;
    }
    setError("");
    setLoading("component");
    try {
      const token = await getToken();
      const data = await aiRegenerateComponent({
        token,
        componentId: componentTarget.trim(),
        boardState,
        instruction: componentInstruction.trim(),
        projectId,
      });
      if (data.boardState && onUpdateBoardState) onUpdateBoardState(data.boardState);
      setComponentInstruction("");
    } catch (e) {
      setError(e?.message || "Failed to revise component.");
    } finally {
      setLoading("");
    }
  }, [boardState, componentTarget, componentInstruction, projectId, getToken, onUpdateBoardState]);

  const palette = plan?.color_palette || {};

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#9b5de5]" /> UI Plan & Assets
        </h3>
        <p className="text-xs text-gray-400">
          Plan a genre-aware UI, then generate reusable image assets. The final UI stays editable.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. anime battleground HUD with ability hotbar and ult meter"
          className="flex-1 bg-black/60 border border-gray-800 focus:border-[#9b5de5] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
          onKeyDown={(e) => e.key === "Enter" && handlePlan()}
        />
        <button
          onClick={handlePlan}
          disabled={loading === "plan"}
          className="px-4 py-2 rounded-xl bg-[#9b5de5] hover:bg-[#8a4dd4] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {loading === "plan" ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Plan UI
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-hide">
        {!plan ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="p-4 rounded-full bg-gray-800/50 text-gray-500">
              <Layers className="w-10 h-10" />
            </div>
            <p className="text-gray-400 text-sm">No plan yet. Describe your UI and click Plan UI.</p>
          </div>
        ) : (
          <>
            {/* Plan summary */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#9b5de5]/20 text-[#c79bff] text-[10px] font-bold uppercase">
                  {plan.game_genre}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#00f5d4]/15 text-[#00f5d4] text-[10px] font-bold uppercase">
                  {plan.screen_type}
                </span>
              </div>
              <p className="text-xs text-gray-300">{plan.style}</p>
              <div className="flex flex-wrap gap-3 pt-1">
                {Object.entries(palette).map(([name, hex]) => (
                  <Swatch key={name} name={name} hex={hex} />
                ))}
              </div>
              {Array.isArray(plan.components) && plan.components.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {plan.components.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] text-gray-300">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <CostIndicator estimate={estimate} />

            {/* Asset list */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200">
                Assets to generate ({plan.asset_list?.length || 0})
              </span>
              <button
                onClick={handleGenerateAssets}
                disabled={loading === "assets" || !plan.asset_list?.length}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[10px] font-black flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading === "assets" ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                Generate All
              </button>
            </div>

            <div className="space-y-2">
              {(plan.asset_list || []).map((spec) => {
                const meta = assets[spec.asset_id];
                const busy = loading === `asset:${spec.asset_id}`;
                return (
                  <div
                    key={spec.asset_id}
                    className="p-2.5 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {meta?.storageUrl ? (
                        <img src={meta.storageUrl} alt={spec.asset_id} className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{spec.asset_id}</div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {spec.asset_type} · {spec.recommended_size} · {spec.intended_component || "—"}
                      </div>
                      {meta?.status === "ready" && (
                        <div className="text-[9px] text-[#00f5d4] flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> ready · {meta.sourceProvider}
                          {meta.reused ? " · reused" : ""}
                        </div>
                      )}
                      {meta?.status === "error" && (
                        <div className="text-[9px] text-red-400">error</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRegenAsset(spec.asset_id)}
                      disabled={busy}
                      title="Regenerate this asset"
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {busy ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Component-level revision */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-gray-200">Revise one component</span>
              <p className="text-[10px] text-gray-500">
                e.g. make the quest panel darker, resize the mobile jump button. Requires an open UI.
              </p>
              <input
                type="text"
                value={componentTarget}
                onChange={(e) => setComponentTarget(e.target.value)}
                placeholder="Component id (e.g. QuestPanel)"
                className="w-full bg-black/60 border border-gray-800 focus:border-[#9b5de5] rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={componentInstruction}
                  onChange={(e) => setComponentInstruction(e.target.value)}
                  placeholder="Instruction"
                  className="flex-1 bg-black/60 border border-gray-800 focus:border-[#9b5de5] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleRegenComponent()}
                />
                <button
                  onClick={handleRegenComponent}
                  disabled={loading === "component" || !boardState}
                  className="px-3 py-2 rounded-lg bg-[#00f5d4]/15 hover:bg-[#00f5d4]/25 text-[#00f5d4] text-[10px] font-black flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading === "component" ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
