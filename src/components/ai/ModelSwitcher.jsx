import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Cpu, ChevronDown, Lock, Check, Sparkles } from "lucide-react";
import { useModelCatalog } from "../../hooks/useModelCatalog";
import {
  DEFAULT_FREE_MODEL,
  MODEL_ALIAS_LABELS,
  PROVIDER_LABELS,
  groupModelsByProvider,
  isModelSelectable,
  normalizeModelId,
  sortProviderEntries,
} from "../../lib/modelProviders";

const MENU_WIDTH = 288;
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

/**
 * Compact model picker driven by the dynamic AI Gateway catalog.
 * Free users see the full catalog with locks; only Nexus Free Auto is selectable.
 */
export default function ModelSwitcher({
  value,
  onChange,
  isPremium,
  onProNudge,
  fullWidth = false,
}) {
  const { models, loading } = useModelCatalog();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedValue = useMemo(() => normalizeModelId(value), [value]);

  const catalogModels = useMemo(() => {
    if (models.some((m) => m.id === DEFAULT_FREE_MODEL)) return models;
    return [SYNTHETIC_FREE_MODEL, ...models];
  }, [models]);

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
    if (!open) return undefined;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const grouped = useMemo(() => groupModelsByProvider(catalogModels), [catalogModels]);
  const sortedProviders = useMemo(() => sortProviderEntries(grouped), [grouped]);

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
    if (!isPremium && value !== DEFAULT_FREE_MODEL) {
      onChange?.(DEFAULT_FREE_MODEL);
    }
  }, [isPremium, onChange, value]);

  const handleSelect = (model) => {
    if (!isModelSelectable(model, { isPremium })) {
      onProNudge?.("Premium AI Models");
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
            className="fixed w-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl z-[9999] p-2 scrollbar-hide"
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: Math.min(menuPosition?.maxHeight ?? window.innerHeight * 0.6, window.innerHeight * 0.6),
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="listbox"
          >
            {sortedProviders.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">No models available.</div>
            )}
            {sortedProviders.map(([provider, list]) => (
              <div key={provider} className="mb-1">
                <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600">
                  {PROVIDER_LABELS[provider] || provider}
                </div>
                {list.map((model) => {
                  const billingCategory = model.billingCategory || (model.tier === "pro" ? "PREMIUM_DIRECT" : "INCLUDED");
                  const locked = !isModelSelectable(model, { isPremium });
                  const selected = model.id === normalizedValue || model.id === value;
                  const ctx = formatContext(model.contextLength);
                  const billingLabel = model.billingLabel || (billingCategory === "PREMIUM_DIRECT" ? "Premium Balance" : "Included");
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
                              billingCategory === "PREMIUM_DIRECT" ? "text-[#9b5de5]" : "text-[#00f5d4]"
                            }`}
                          >
                            {billingLabel}
                          </span>
                          {billingCategory === "PREMIUM_DIRECT" && (
                            <span className="text-[9px] text-gray-500">Uses Premium Balance</span>
                          )}
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
            {!isPremium && (
              <p className="px-2 py-2 text-[10px] text-gray-500 text-center border-t border-white/5 mt-1">
                Upgrade to Pro to unlock model selection
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
          fullWidth ? "w-full justify-between" : "max-w-[220px]"
        }`}
        title="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Cpu className="w-3.5 h-3.5 text-[#00f5d4] shrink-0" />
          <span className="truncate">{loading ? "Loading models…" : currentLabel}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {menu}
    </div>
  );
}
