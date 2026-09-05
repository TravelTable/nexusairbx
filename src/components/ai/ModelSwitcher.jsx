import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Lock, Search } from "lib/icons";

import { useModelCatalog } from "../../hooks/useModelCatalog";
import ModelProviderGlyph from "./ModelProviderGlyph";
import {
  DEFAULT_FREE_MODEL,
  LEGACY_NEXUS_FREE_MODEL,
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

const MENU_WIDTH = 336;
const MENU_MAX_HEIGHT = 500;

const SYNTHETIC_FREE_MODEL = {
  id: DEFAULT_FREE_MODEL,
  name: "Gemini 3.6 Flash",
  provider: "google",
  billingCategory: "INCLUDED",
  pricingConfigured: true,
  availableToPaid: true,
  availableToFree: true,
  recommended: true,
  recommendationScore: 20,
  capabilities: ["fast", "reasoning", "tools", "vision"],
  recommendedFor: ["general", "coding", "fast"],
};

function modelMatchesSearch(model, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [model.name, model.id, model.provider, providerLabel(model.provider)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function primaryDescriptor(model) {
  const values = new Set(
    [...(model.recommendedFor || []), ...(model.capabilities || [])].map((value) =>
      String(value).toLowerCase()
    )
  );
  if (values.has("coding")) return "Coding";
  if (values.has("reasoning")) return "Reasoning";
  if (values.has("fast")) return "Fast";
  if (values.has("vision")) return "Vision";
  return null;
}

function ModelRow({ model, selected, locked, onSelect, showDescriptor = false }) {
  const descriptor = showDescriptor ? primaryDescriptor(model) : null;
  return (
    <button
      type="button"
      role="option"
      data-model-option
      aria-selected={selected}
      aria-disabled={locked}
      onClick={() => onSelect(model)}
      className={`flex h-[38px] w-full items-center gap-2 rounded-md px-2 text-left outline-none transition-colors focus-visible:bg-[var(--ds-fill-subtle)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--ds-accent-border)] ${
        selected ? "bg-[var(--ds-fill-subtle)]" : "hover:bg-[var(--ds-fill-subtle)]"
      } ${locked ? "text-[var(--ds-text-muted)]" : "text-[var(--ds-text)]"}`}
    >
      <ModelProviderGlyph provider={model.provider} modelId={model.id} size={17} type="color" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{model.name}</span>
      {model.isNew ? (
        <span className="shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold tracking-[0.08em] text-[var(--ds-text-muted)] ring-1 ring-inset ring-[var(--ds-border-subtle)]">
          NEW
        </span>
      ) : null}
      {descriptor ? (
        <span className="shrink-0 text-[9px] text-[var(--ds-text-muted)]">{descriptor}</span>
      ) : null}
      {locked ? (
        <Lock className="h-3 w-3 shrink-0 text-[var(--ds-text-muted)]" />
      ) : selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--ds-accent)]" />
      ) : null}
    </button>
  );
}

function AutoRow({ selected, onSelect }) {
  return (
    <button
      type="button"
      role="option"
      data-model-option
      aria-selected={selected}
      onClick={onSelect}
      className={`flex min-h-[46px] w-full items-center gap-2 rounded-md px-2 text-left outline-none transition-colors hover:bg-[var(--ds-fill-subtle)] focus-visible:bg-[var(--ds-fill-subtle)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--ds-accent-border)] ${
        selected ? "bg-[var(--ds-fill-subtle)]" : ""
      }`}
    >
      <ModelProviderGlyph provider="nexus" modelId={LEGACY_NEXUS_FREE_MODEL} size={17} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold text-[var(--ds-text)]">
          Nexus Auto
        </span>
        <span className="block truncate text-[9px] text-[var(--ds-text-muted)]">
          Automatically picks the best model
        </span>
      </span>
      {selected ? <Check className="h-3.5 w-3.5 text-[var(--ds-accent)]" /> : null}
    </button>
  );
}

function SectionHeading({ children }) {
  return (
    <div className="flex h-6 items-end px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">
      {children}
    </div>
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
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const paid = Boolean(isPremium || isStarterOrAbove);
  const autoSelected = value === LEGACY_NEXUS_FREE_MODEL;
  const normalizedValue = useMemo(() => normalizeModelId(value), [value]);

  const catalogModels = useMemo(() => {
    const list = Array.isArray(models) ? models : [];
    return list.some((model) => model.id === DEFAULT_FREE_MODEL)
      ? list
      : [SYNTHETIC_FREE_MODEL, ...list];
  }, [models]);
  const selectOptions = useMemo(
    () => ({ isPremium, isStarterOrAbove }),
    [isPremium, isStarterOrAbove]
  );
  const recommendedModels = useMemo(() => {
    const picked = pickSuggestedModels(catalogModels, 4);
    const preferred = recommendedModelId
      ? picked.find((model) => model.id === recommendedModelId)
      : null;
    const ordered = preferred
      ? [preferred, ...picked.filter((model) => model.id !== preferred.id)]
      : picked;
    return ordered.slice(0, 4);
  }, [catalogModels, recommendedModelId]);
  const searchedModels = useMemo(
    () => catalogModels.filter((model) => modelMatchesSearch(model, query)),
    [catalogModels, query]
  );
  const searchedRecommended = useMemo(
    () => recommendedModels.filter((model) => modelMatchesSearch(model, query)),
    [query, recommendedModels]
  );
  const sortedProviders = useMemo(
    () => sortProviderEntries(groupModelsByProvider(searchedModels)),
    [searchedModels]
  );
  const current = useMemo(
    () =>
      autoSelected
        ? null
        : catalogModels.find(
            (model) => model.id === normalizedValue || model.id === value
          ),
    [autoSelected, catalogModels, normalizedValue, value]
  );
  const currentLabel = autoSelected
    ? "Auto"
    : current?.name ||
      MODEL_ALIAS_LABELS[value] ||
      MODEL_ALIAS_LABELS[normalizedValue] ||
      value ||
      "Select model";
  const autoVisible = "nexus auto automatically picks the best model".includes(
    query.trim().toLowerCase()
  );

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
      return undefined;
    }
    updateMenuPosition();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!paid && value !== DEFAULT_FREE_MODEL && value !== LEGACY_NEXUS_FREE_MODEL) {
      onChange?.(DEFAULT_FREE_MODEL);
    }
  }, [paid, onChange, value]);

  const closeAndSelect = (id) => {
    onChange?.(id);
    setOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  };
  const handleSelect = (model) => {
    if (!isModelSelectable(model, selectOptions)) {
      onStarterNudge?.("Model Selection");
      setOpen(false);
      return;
    }
    closeAndSelect(model.id);
  };
  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const options = [...(menuRef.current?.querySelectorAll("[data-model-option]") || [])];
    if (!options.length) return;
    event.preventDefault();
    const currentIndex = options.indexOf(document.activeElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? delta > 0 ? 0 : options.length - 1
      : (currentIndex + delta + options.length) % options.length;
    options[nextIndex]?.focus();
  };

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="AI models"
          onKeyDown={handleMenuKeyDown}
          className="z-[90] overflow-y-auto rounded-[10px] border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] p-1.5 shadow-xl scrollbar-subtle"
          style={{
            position: menuPosition?.strategy || "fixed",
            width: menuPosition?.width ?? MENU_WIDTH,
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
            visibility: menuPosition ? "visible" : "hidden",
          }}
        >
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ds-text-muted)]" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models..."
              aria-label="Search models"
              className="h-8 w-full rounded-[7px] border border-[var(--ds-border-subtle)] bg-transparent pl-8 pr-2.5 text-[11px] text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-border-strong)] focus-visible:ring-1 focus-visible:ring-[var(--ds-accent-border)]"
            />
          </div>

          {autoVisible ? (
            <div className="border-b border-[var(--ds-border-subtle)] pb-1">
              <AutoRow selected={autoSelected} onSelect={() => closeAndSelect(LEGACY_NEXUS_FREE_MODEL)} />
            </div>
          ) : null}

          {searchedRecommended.length ? (
            <div>
              <SectionHeading>Recommended</SectionHeading>
              {searchedRecommended.map((model) => (
                <ModelRow
                  key={`recommended:${model.id}`}
                  model={model}
                  selected={!autoSelected && (model.id === normalizedValue || model.id === value)}
                  locked={!isModelSelectable(model, selectOptions)}
                  onSelect={handleSelect}
                  showDescriptor
                />
              ))}
            </div>
          ) : null}

          {sortedProviders.length ? (
            <div className="mt-1 border-t border-[var(--ds-border-subtle)] pt-0.5">
              <SectionHeading>All models</SectionHeading>
              {sortedProviders.map(([provider, providerModels]) => (
                <div key={provider} className="mb-0.5">
                  <div className="flex h-[22px] items-center gap-1.5 px-2 text-[9px] font-medium text-[var(--ds-text-muted)]">
                    <ModelProviderGlyph provider={provider} size={12} type="mono" />
                    {providerLabel(provider)}
                  </div>
                  {providerModels.map((model) => (
                    <ModelRow
                      key={`${provider}:${model.id}`}
                      model={model}
                      selected={!autoSelected && (model.id === normalizedValue || model.id === value)}
                      locked={!isModelSelectable(model, selectOptions)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {!autoVisible && !searchedModels.length ? (
            <div className="px-3 py-7 text-center text-[11px] text-[var(--ds-text-muted)]">
              No models found.
            </div>
          ) : null}
          {refreshing ? (
            <div className="px-2 py-1 text-right text-[8px] text-[var(--ds-text-muted)]">
              Updating models…
            </div>
          ) : null}
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
        className={`inline-flex h-9 items-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 text-[11px] font-medium text-[var(--ds-text-secondary)] outline-none transition-colors hover:border-[var(--ds-border-subtle)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:border-[var(--ds-accent-border)] focus-visible:ring-1 focus-visible:ring-[var(--ds-accent-border)] ${
          fullWidth ? "w-full justify-between" : "max-w-[220px]"
        }`}
        title="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <ModelProviderGlyph
            provider={autoSelected ? "nexus" : current?.provider || "nexus"}
            modelId={autoSelected ? LEGACY_NEXUS_FREE_MODEL : current?.id}
            size={15}
            type="mono"
          />
          <span className="truncate">{loading ? "Loading models…" : currentLabel}</span>
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}
