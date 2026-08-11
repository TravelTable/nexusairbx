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
import {
  getWorkspaceMenuHost,
  resolveAnchoredMenuPosition,
} from "../../lib/workspaceMenuPosition";

const MENU_WIDTH = 304;
const MENU_MAX_HEIGHT = 420;

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
      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
        selected ? "bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-border)]" : "border border-transparent hover:bg-[var(--ds-fill-subtle)]"
      } ${locked ? "opacity-60" : ""}`}
    >
      <ModelProviderGlyph provider={model.provider} modelId={model.id} size={16} type="color" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--ds-text)] truncate">{model.name}</span>
          {model.recommended && <Sparkles className="h-3 w-3 shrink-0 text-[var(--ds-accent)]" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {ctx && <span className="text-[9px] text-[var(--ds-text-muted)] font-mono">{ctx}</span>}
          <span
            className={`text-[9px] font-medium ${billingCategory === "PREMIUM_DIRECT" ? "text-[var(--ds-accent)]" : "text-[var(--ds-text-muted)]"}`}
          >
            {billingLabel}
          </span>
        </div>
      </div>
      {locked ? (
        <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)]" />
      ) : selected ? (
        <Check className="w-3.5 h-3.5 text-[var(--ds-accent)] shrink-0" />
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
    setMenuPosition(resolveAnchoredMenuPosition(buttonRef.current, {
      menuWidth: MENU_WIDTH,
      menuMaxHeight: MENU_MAX_HEIGHT,
      minHeight: 160,
    }));
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
            className="z-[90] overflow-y-auto rounded-xl border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] p-1.5 scrollbar-subtle"
            style={{
              position: menuPosition?.strategy || "fixed",
              width: menuPosition?.width ?? MENU_WIDTH,
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="listbox"
          >
            {suggestedModels.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-[10px] font-medium text-[var(--ds-text-muted)]">
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
              <div className="border-t border-[var(--ds-border-subtle)] pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => setBrowseOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-xl text-left hover:bg-[var(--ds-fill-subtle)] transition-colors"
                  aria-expanded={browseOpen}
                >
                  <span className="text-[10px] font-medium text-[var(--ds-text-muted)]">
                    Browse all models
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--ds-text-muted)] transition-transform ${browseOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {browseOpen && (
                  <div className="mt-0.5">
                    {sortedProviders.map(([provider, list]) => (
                      <div key={provider} className="mb-1">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-[var(--ds-text-muted)]">
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
              <div className="px-3 py-4 text-xs text-[var(--ds-text-muted)] text-center">No models available.</div>
            )}

            {!isStarterOrAbove && !isPremium && (
              <p className="px-2 py-2 text-[10px] text-[var(--ds-text-muted)] text-center border-t border-[var(--ds-border-subtle)] mt-1">
                Upgrade to Starter to unlock model selection
              </p>
            )}
            {isStarterOrAbove && !isPremium && (
              <p className="px-2 py-2 text-[10px] text-[var(--ds-text-muted)] text-center border-t border-[var(--ds-border-subtle)] mt-1">
                Premium Direct models require Pro
              </p>
            )}
          </div>,
          getWorkspaceMenuHost() || document.body
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
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ds-border-subtle)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] xl:min-h-0 ${
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
