import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Lock, Check, Sparkles } from "lib/icons";
import { useModelCatalog } from "../../hooks/useModelCatalog";
import ModelProviderGlyph from "./ModelProviderGlyph";
import {
  DEFAULT_FREE_MODEL,
  MODEL_ALIAS_LABELS,
  PROVIDER_LABELS,
  groupModelsByProvider,
  isModelSelectable,
  normalizeModelId,
  pickSuggestedModels,
  sortProviderEntries,
} from "../../lib/modelProviders";

const MENU_WIDTH = 304;
const VIEWPORT_GUTTER = 8;

const SYNTHETIC_FREE_MODEL = {
  id: DEFAULT_FREE_MODEL,
  name: "Nexus Free Auto",
  provider: "nexus",
  billingCategory: "INCLUDED",
  billingLabel: "Included",
  recommended: true,
};

function formatContext(len) {
  if (!len) return null;
  if (len >= 1000) return `${Math.round(len / 1000)}k ctx`;
  return `${len} ctx`;
}

function ModelRow({ model, selected, locked, onSelect }) {
  const billingCategory = model.billingCategory || (model.tier === "pro" ? "PREMIUM_DIRECT" : "INCLUDED");
  const billingLabel = model.billingLabel || (billingCategory === "PREMIUM_DIRECT" ? "Premium Balance" : "Included");
  const ctx = formatContext(model.contextLength);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(model)}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all ${
        selected ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30" : "border border-transparent hover:bg-white/5"
      } ${locked ? "opacity-60" : ""}`}
    >
      <ModelProviderGlyph provider={model.provider} modelId={model.id} size={16} type="color" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate">{model.name}</span>
          {model.recommended && <Sparkles className="w-3 h-3 text-[#9b5de5] shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {ctx && <span className="text-[9px] text-gray-500 font-mono">{ctx}</span>}
          <span
            className={`text-[8px] font-black uppercase tracking-widest ${
              billingCategory === "PREMIUM_DIRECT" ? "text-[#9b5de5]" : "text-[#00f5d4]"
            }`}
          >
            {billingLabel}
          </span>
        </div>
      </div>
      {locked ? (
        <Lock className="w-3.5 h-3.5 text-[#9b5de5] shrink-0" />
      ) : selected ? (
        <Check className="w-3.5 h-3.5 text-[#00f5d4] shrink-0" />
      ) : null}
    </button>
  );
}

/**
 * Compact model picker driven by the dynamic AI Gateway catalog.
 * Free users see Suggested + Browse all with locks; only Nexus Free Auto is selectable.
 */
export default function ModelSwitcher({
  value,
  onChange,
  isPremium,
  isStarterOrAbove = false,
  onProNudge,
  onStarterNudge,
  fullWidth = false,
}) {
  const { models, loading } = useModelCatalog();
  const [open, setOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedValue = useMemo(() => normalizeModelId(value), [value]);

  const catalogModels = useMemo(() => {
    if (models.some((m) => m.id === DEFAULT_FREE_MODEL)) return models;
    return [SYNTHETIC_FREE_MODEL, ...models];
  }, [models]);

  const suggestedModels = useMemo(() => {
    const picked = pickSuggestedModels(catalogModels);
    // Free users keep Nexus Free Auto pinned at the top of Suggested.
    if (!isStarterOrAbove && !isPremium) {
      const free = catalogModels.find((m) => m.id === DEFAULT_FREE_MODEL);
      if (free && !picked.some((m) => m.id === DEFAULT_FREE_MODEL)) {
        return [free, ...picked];
      }
    }
    return picked;
  }, [catalogModels, isPremium, isStarterOrAbove]);

  const modelSelectOpts = useMemo(
    () => ({ isPremium, isStarterOrAbove }),
    [isPremium, isStarterOrAbove]
  );

  const suggestedIds = useMemo(() => new Set(suggestedModels.map((m) => m.id)), [suggestedModels]);

  const browseModels = useMemo(
    () => catalogModels.filter((m) => !suggestedIds.has(m.id)),
    [catalogModels, suggestedIds]
  );

  const grouped = useMemo(() => groupModelsByProvider(browseModels), [browseModels]);
  const sortedProviders = useMemo(() => sortProviderEntries(grouped), [grouped]);

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER);

    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.min(Math.max(VIEWPORT_GUTTER, rect.right - MENU_WIDTH), maxLeft),
      maxHeight: Math.max(160, window.innerHeight - rect.bottom - 24),
    });
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setBrowseOpen(false);
      return undefined;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const current = useMemo(
    () => catalogModels.find((m) => m.id === normalizedValue || m.id === value),
    [catalogModels, normalizedValue, value]
  );
  const currentLabel =
    current?.name
    || MODEL_ALIAS_LABELS[value]
    || MODEL_ALIAS_LABELS[normalizedValue]
    || value
    || "Select model";

  useEffect(() => {
    if (!isStarterOrAbove && !isPremium && value !== DEFAULT_FREE_MODEL) {
      onChange?.(DEFAULT_FREE_MODEL);
    }
  }, [isPremium, isStarterOrAbove, onChange, value]);

  const handleSelect = (model) => {
    if (!isModelSelectable(model, modelSelectOpts)) {
      const billing = model.billingCategory || (model.tier === "pro" ? "PREMIUM_DIRECT" : "INCLUDED");
      if (billing === "PREMIUM_DIRECT" || billing === "premium_direct") {
        onProNudge?.("Premium AI Models");
      } else {
        onStarterNudge?.("Model Selection");
      }
      setOpen(false);
      return;
    }
    onChange?.(model.id);
    setOpen(false);
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl z-[9999] p-2 scrollbar-hide"
            style={{
              width: MENU_WIDTH,
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: Math.min(menuPosition?.maxHeight ?? window.innerHeight * 0.6, window.innerHeight * 0.6),
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="listbox"
          >
            {suggestedModels.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600">
                  Suggested
                </div>
                {suggestedModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    selected={model.id === normalizedValue || model.id === value}
                    locked={!isModelSelectable(model, modelSelectOpts)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {sortedProviders.length > 0 && (
              <div className="border-t border-white/5 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => setBrowseOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-xl text-left hover:bg-white/5 transition-colors"
                  aria-expanded={browseOpen}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                    Browse all models
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-500 transition-transform ${browseOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {browseOpen && (
                  <div className="mt-0.5">
                    {sortedProviders.map(([provider, list]) => (
                      <div key={provider} className="mb-1">
                        <div className="px-2 py-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600">
                          <ModelProviderGlyph provider={provider} size={12} type="mono" />
                          {PROVIDER_LABELS[provider] || provider}
                        </div>
                        {list.map((model) => (
                          <ModelRow
                            key={model.id}
                            model={model}
                            selected={model.id === normalizedValue || model.id === value}
                            locked={!isModelSelectable(model, modelSelectOpts)}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {suggestedModels.length === 0 && sortedProviders.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">No models available.</div>
            )}

            {!isStarterOrAbove && !isPremium && (
              <p className="px-2 py-2 text-[10px] text-gray-500 text-center border-t border-white/5 mt-1">
                Upgrade to Starter to unlock model selection
              </p>
            )}
            {isStarterOrAbove && !isPremium && (
              <p className="px-2 py-2 text-[10px] text-gray-500 text-center border-t border-white/5 mt-1">
                Premium Direct models require Pro
              </p>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${fullWidth ? "w-full" : ""}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateMenuPosition();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all ${
          fullWidth ? "w-full justify-between" : "max-w-[240px]"
        }`}
        title="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          {current ? (
            <ModelProviderGlyph provider={current.provider} modelId={current.id} size={14} type="mono" />
          ) : (
            <ModelProviderGlyph provider="openai" size={14} type="mono" />
          )}
          <span className="truncate">{loading ? "Loading models…" : currentLabel}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {menu}
    </div>
  );
}
