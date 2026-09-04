import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Lock } from "lib/icons";

import { useModelCatalog } from "../../hooks/useModelCatalog";
import ModelProviderGlyph from "./ModelProviderGlyph";
import {
  DEFAULT_FREE_MODEL,
  MODEL_ALIAS_LABELS,
  groupModelsByProvider,
  isModelSelectable,
  normalizeModelId,
  pickSuggestedModels,
  providerLabel,
  sortProviderEntries,
} from "../../lib/modelProviders";
import {
  getWorkspaceMenuHost,
  resolveAnchoredMenuPosition,
} from "../../lib/workspaceMenuPosition";

const MENU_WIDTH = 344;
const MENU_MAX_HEIGHT = 520;

const FILTERS = [
  { id: "recommended", label: "Recommended" },
  { id: "coding", label: "Coding" },
  { id: "fast", label: "Fast" },
  { id: "reasoning", label: "Reasoning" },
  { id: "vision", label: "Vision" },
  { id: "all", label: "All" },
];

const SYNTHETIC_FREE_MODEL = {
  id: DEFAULT_FREE_MODEL,
  name: "Gemini 3.6 Flash",
  provider: "google",
  contextLength: 1_000_000,
  billingCategory: "INCLUDED",
  billingLabel: "Usage",
  pricingConfigured: true,
  availableToPaid: true,
  availableToFree: true,
  recommended: true,
  recommendationScore: 20,
  capabilities: ["fast", "reasoning", "tools", "vision"],
  recommendedFor: ["general", "coding", "fast"],
  usageMultiplier: 0.8,
  costTierLabel: "0.8× usage",
};

function formatContext(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  if (number >= 1_000_000) {
    const millions = number / 1_000_000;
    return Number.isInteger(millions) ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return String(number);
}

function formatUsageMultiplier(model) {
  const multiplier = Number(model.usageMultiplier ?? model.creditMultiplier);
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;
  const value = Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(1);
  return `${value}× usage`;
}

function modelUses(model, category) {
  if (category === "all" || category === "recommended") return true;
  const values = new Set(
    [...(model.capabilities || []), ...(model.recommendedFor || [])].map((value) =>
      String(value).toLowerCase()
    )
  );
  return values.has(category);
}

function modelMatchesSearch(model, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    model.name,
    model.id,
    model.provider,
    providerLabel(model.provider),
    ...(model.capabilities || []),
    ...(model.recommendedFor || []),
    formatContext(model.contextLength),
    formatUsageMultiplier(model),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

function descriptorText(model) {
  const uses = model.recommendedFor || [];
  return ["coding", "reasoning", "fast", "vision"]
    .filter(
      (value) => uses.includes(value) || (model.capabilities || []).includes(value)
    )
    .slice(0, 2)
    .map((value) => {
      if (value === "coding") return "Coding";
      if (value === "reasoning") return "Reasoning";
      if (value === "fast") return "Fast";
      if (value === "vision") return "Vision";
      return value;
    });
}

function ModelRow({ model, selected, locked, onSelect, recommendedOverride = null }) {
  const context = formatContext(model.contextLength);
  const usage = formatUsageMultiplier(model);
  const descriptors = descriptorText(model);
  const recommended = recommendedOverride ?? model.recommended;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(model)}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        selected
          ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]"
          : "border-transparent hover:bg-[var(--ds-fill-subtle)]"
      } ${locked ? "opacity-60" : ""}`}
    >
      <ModelProviderGlyph
        provider={model.provider}
        modelId={model.id}
        size={17}
        type="color"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-[var(--ds-text)]">
            {model.name}
          </span>
          {model.isNew && (
            <span className="shrink-0 text-[8px] font-semibold tracking-wide text-[var(--ds-accent)]">
              NEW
            </span>
          )}
          {recommended && (
            <span
              className="shrink-0 text-[8px] font-medium text-[var(--ds-text-muted)]"
              title="Recommended by Nexus"
            >
              Recommended
            </span>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[9px] text-[var(--ds-text-muted)]">
          {descriptors.map((descriptor) => (
            <span key={descriptor}>{descriptor}</span>
          ))}
          {context && (
            <>
              {descriptors.length > 0 && <span>·</span>}
              <span className="font-mono">{context}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {usage && (
          <span
            className="text-[9px] font-medium text-[var(--ds-text-muted)]"
            title="Estimated relative usage based on current model input/output pricing"
          >
            {usage}
          </span>
        )}
        {locked ? (
          <Lock className="h-3.5 w-3.5 text-[var(--ds-text-muted)]" />
        ) : selected ? (
          <Check className="h-3.5 w-3.5 text-[var(--ds-accent)]" />
        ) : null}
      </div>
    </button>
  );
}

export default function ModelSwitcher({
  value,
  onChange,
  isPremium,
  isStarterOrAbove = false,
  onStarterNudge,
  fullWidth = false,
  recommendedModelId = null,
}) {
  const { models, loading, refreshing } = useModelCatalog();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("recommended");
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const paid = Boolean(isPremium || isStarterOrAbove);
  const normalizedValue = useMemo(() => normalizeModelId(value), [value]);

  const catalogModels = useMemo(() => {
    const list = Array.isArray(models) ? models : [];
    if (list.some((model) => model.id === DEFAULT_FREE_MODEL)) return list;
    return [SYNTHETIC_FREE_MODEL, ...list];
  }, [models]);

  const selectOptions = useMemo(
    () => ({ isPremium, isStarterOrAbove }),
    [isPremium, isStarterOrAbove]
  );

  const recommendedModels = useMemo(() => {
    const picked = pickSuggestedModels(catalogModels, 6);
    if (paid) return picked;
    const free = catalogModels.find((model) => model.id === DEFAULT_FREE_MODEL);
    if (!free) return picked;
    return [free, ...picked.filter((model) => model.id !== free.id)];
  }, [catalogModels, paid]);

  const visibleModels = useMemo(() => {
    const base =
      filter === "recommended"
        ? recommendedModels
        : catalogModels.filter((model) => modelUses(model, filter));
    return base.filter((model) => modelMatchesSearch(model, query));
  }, [catalogModels, filter, query, recommendedModels]);

  const grouped = useMemo(() => groupModelsByProvider(visibleModels), [visibleModels]);
  const sortedProviders = useMemo(() => sortProviderEntries(grouped), [grouped]);
  const current = useMemo(
    () =>
      catalogModels.find(
        (model) => model.id === normalizedValue || model.id === value
      ),
    [catalogModels, normalizedValue, value]
  );
  const currentLabel =
    current?.name ||
    MODEL_ALIAS_LABELS[value] ||
    MODEL_ALIAS_LABELS[normalizedValue] ||
    value ||
    "Select model";

  const updateMenuPosition = useCallback(() => {
    setMenuPosition(
      resolveAnchoredMenuPosition(buttonRef.current, {
        menuWidth: MENU_WIDTH,
        menuMaxHeight: MENU_MAX_HEIGHT,
        minHeight: 220,
      })
    );
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFilter("recommended");
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

  useEffect(() => {
    if (!paid && value !== DEFAULT_FREE_MODEL) onChange?.(DEFAULT_FREE_MODEL);
  }, [paid, onChange, value]);

  const handleSelect = (model) => {
    if (!isModelSelectable(model, selectOptions)) {
      onStarterNudge?.("Model Selection");
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
            role="listbox"
            className="z-[90] overflow-y-auto rounded-xl border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] p-1.5 scrollbar-subtle"
            style={{
              position: menuPosition?.strategy || "fixed",
              width: menuPosition?.width ?? MENU_WIDTH,
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            <div className="px-1 pb-1.5">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models"
                className="h-8 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-transparent px-2.5 text-xs text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-border-strong)]"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto px-1 pb-1.5 scrollbar-none">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--ds-fill-subtle)] text-[var(--ds-text)]"
                        : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {filter === "recommended" ? (
              <div>
                <div className="px-2 py-1 text-[9px] font-medium text-[var(--ds-text-muted)]">
                  Recommended for Nexus
                </div>
                {visibleModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    selected={model.id === normalizedValue || model.id === value}
                    locked={!isModelSelectable(model, selectOptions)}
                    onSelect={handleSelect}
                    recommendedOverride={
                      recommendedModelId ? model.id === recommendedModelId : null
                    }
                  />
                ))}
              </div>
            ) : (
              sortedProviders.map(([provider, providerModels]) => (
                <div key={provider} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-medium text-[var(--ds-text-muted)]">
                    <ModelProviderGlyph provider={provider} size={12} type="mono" />
                    {providerLabel(provider)}
                  </div>
                  {providerModels.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      selected={model.id === normalizedValue || model.id === value}
                      locked={!isModelSelectable(model, selectOptions)}
                      onSelect={handleSelect}
                      recommendedOverride={
                        recommendedModelId ? model.id === recommendedModelId : null
                      }
                    />
                  ))}
                </div>
              ))
            )}

            {visibleModels.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-[var(--ds-text-muted)]">
                No models found.
              </div>
            )}

            <div className="mt-1 border-t border-[var(--ds-border-subtle)] px-2 py-2 text-center text-[9px] text-[var(--ds-text-muted)]">
              {paid
                ? "All models use your monthly usage balance."
                : "Upgrade to Starter to choose any model."}
              {refreshing && <span className="ml-1">Updating models…</span>}
            </div>
          </div>,
          getWorkspaceMenuHost() || document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateMenuPosition();
          setOpen((currentOpen) => !currentOpen);
        }}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ds-border-subtle)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] xl:min-h-0 ${
          fullWidth ? "w-full justify-between" : "max-w-[240px]"
        }`}
        title="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {current ? (
            <ModelProviderGlyph
              provider={current.provider}
              modelId={current.id}
              size={14}
              type="mono"
            />
          ) : (
            <ModelProviderGlyph provider="nexus" size={14} type="mono" />
          )}
          <span className="truncate">{loading ? "Loading models…" : currentLabel}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {menu}
    </div>
  );
}
