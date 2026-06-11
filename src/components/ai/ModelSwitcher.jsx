import React, { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, ChevronDown, Lock, Check, Sparkles } from "lucide-react";
import { useModelCatalog } from "../../hooks/useModelCatalog";

const PROVIDER_LABELS = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  meta: "Meta",
  alibaba: "Alibaba",
  mistral: "Mistral",
  other: "Other",
};

// Legacy alias values still possible in persisted settings.
const ALIAS_LABELS = {
  "deepseek-free": "DeepSeek Core (Free)",
  "nexus-4": "Nexus-5 (GPT-5.2)",
  "nexus-3": "Nexus-4 (Legacy)",
};

function formatContext(len) {
  if (!len) return null;
  if (len >= 1000) return `${Math.round(len / 1000)}k ctx`;
  return `${len} ctx`;
}

/**
 * Compact in-workspace model picker driven by the dynamic CometAPI catalog.
 * Pro-tier models are locked for non-premium users and route to the ProNudge flow.
 */
export default function ModelSwitcher({ value, onChange, isPremium, onProNudge, compact = true }) {
  const { models, loading } = useModelCatalog();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const grouped = useMemo(() => {
    const groups = {};
    for (const m of models) {
      const key = m.provider || "other";
      (groups[key] = groups[key] || []).push(m);
    }
    // Sort: recommended first, then free before pro, then by name.
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => {
        if (!!b.recommended !== !!a.recommended) return b.recommended ? 1 : -1;
        if (a.tier !== b.tier) return a.tier === "free" ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      })
    );
    return groups;
  }, [models]);

  const current = useMemo(() => models.find((m) => m.id === value), [models, value]);
  const currentLabel = current?.name || ALIAS_LABELS[value] || value || "Select model";

  const handleSelect = (model) => {
    const locked = model.tier === "pro" && !isPremium;
    if (locked) {
      onProNudge?.("Premium AI Models");
      setOpen(false);
      return;
    }
    onChange?.(model.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all max-w-[220px]"
        title="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Cpu className="w-3.5 h-3.5 text-[#00f5d4] shrink-0" />
        <span className="truncate">{loading ? "Loading models…" : currentLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl z-50 p-2 scrollbar-hide"
          role="listbox"
        >
          {Object.keys(grouped).length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">No models available.</div>
          )}
          {Object.entries(grouped).map(([provider, list]) => (
            <div key={provider} className="mb-1">
              <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600">
                {PROVIDER_LABELS[provider] || provider}
              </div>
              {list.map((model) => {
                const locked = model.tier === "pro" && !isPremium;
                const selected = model.id === value;
                const ctx = formatContext(model.contextLength);
                const costLabel = model.costTierLabel || (model.creditMultiplier ? `${model.creditMultiplier}x credits` : null);
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(model)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all ${
                      selected ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30" : "border border-transparent hover:bg-white/5"
                    } ${locked ? "opacity-60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{model.name}</span>
                        {model.recommended && <Sparkles className="w-3 h-3 text-[#9b5de5] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ctx && <span className="text-[9px] text-gray-500 font-mono">{ctx}</span>}
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest ${
                            model.tier === "pro" ? "text-[#9b5de5]" : "text-gray-500"
                          }`}
                        >
                          {model.tier === "pro" ? "Pro" : "Free"}
                        </span>
                        {costLabel && <span className="text-[9px] text-gray-500 font-mono">{costLabel}</span>}
                      </div>
                    </div>
                    {locked ? (
                      <Lock className="w-3.5 h-3.5 text-[#9b5de5] shrink-0" />
                    ) : selected ? (
                      <Check className="w-3.5 h-3.5 text-[#00f5d4] shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
