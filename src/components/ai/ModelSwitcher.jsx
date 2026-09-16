import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Info, Lock, Search, X } from "lib/icons";
import { useModelCatalog } from "../../hooks/useModelCatalog";
import { useNexusAutoPreferences } from "../../hooks/useNexusAutoPreferences";
import { NEXUS_AUTO_MODES } from "../../lib/nexusAutoPreferences";
import ModelProviderGlyph from "./ModelProviderGlyph";
import {
  LEGACY_NEXUS_FREE_MODEL, MODEL_ALIAS_LABELS, isCatalogModelAvailable, isNexusAutoModelId,
  isModelSelectable, normalizeModelId, providerLabel,
} from "../../lib/modelProviders";
import { createModelSections, formatContextWindow, MODEL_SEARCH_THRESHOLD, presentModel } from "../../lib/modelPresentation";
import { getWorkspaceMenuHost, readWorkspaceHostScale, resolveAnchoredMenuPosition } from "../../lib/workspaceMenuPosition";
import "./ModelSwitcher.css";

const MENU_WIDTH = 420;
const MENU_MAX_HEIGHT = 640;

function Badge({ children }) {
  return <span className="nexus-model-badge">{children}</span>;
}

function ModelRow({ model, selected, locked, expanded, onSelect, onDetails }) {
  return <div className={`nexus-model-row ${selected ? "is-selected" : ""}`}>
    <button type="button" data-model-option aria-pressed={selected} aria-disabled={locked}
      aria-label={`${model.name}${locked ? ", unavailable on your plan" : ""}`}
      onClick={() => onSelect(model)} className="nexus-model-choice">
      <ModelProviderGlyph provider={model.provider} modelId={model.id} size={19} />
      <span className="nexus-model-copy">
        <span className="nexus-model-name">{model.name}</span>
        <span className="nexus-model-description">{model.description}</span>
        <span className="nexus-model-meta">
          <span className="nexus-model-badges">{model.badges.map((badge) => <Badge key={badge}>{badge}</Badge>)}</span>
          <span className="nexus-model-credit">{model.creditUsage.level === "unknown" ? model.creditUsage.label : `${model.creditUsage.label} credits`}</span>
        </span>
      </span>
      {locked ? <Lock aria-hidden="true" size={13} /> : selected ? <Check aria-hidden="true" size={15} /> : null}
    </button>
    <button type="button" className="nexus-model-info" aria-label={`About ${model.name}`}
      aria-expanded={expanded} onClick={() => onDetails(expanded ? null : model)}>
      <Info size={14} aria-hidden="true" />
    </button>
  </div>;
}

function ModelDetails({ model, onClose }) {
  const features = Array.isArray(model.capabilities) ? model.capabilities : [];
  const speed = model.characteristics?.speedLabel || (model.badges.includes("FAST") ? "Fast" : "Not measured");
  return <section className="nexus-model-details" aria-label={`Details for ${model.name}`}>
    <div className="nexus-model-detail-title"><strong>{model.name}</strong>
      <button type="button" className="nexus-model-info" onClick={onClose} aria-label="Close model details"><X size={14} aria-hidden="true" /></button>
    </div>
    <dl>
      <div><dt>Provider</dt><dd>{providerLabel(model.provider)}</dd></div>
      <div><dt>Best for</dt><dd>{model.strengths.length ? model.strengths.join(", ") : model.description}</dd></div>
      <div><dt>Context window</dt><dd>{formatContextWindow(model.contextWindow)}</dd></div>
      <div><dt>Speed</dt><dd>{speed}</dd></div>
      <div><dt>Credit usage</dt><dd>{model.creditUsage.label}</dd></div>
      {features.length > 0 && <div><dt>Capabilities</dt><dd>{features.join(", ")}</dd></div>}
    </dl>
    <p>Credit usage compares the same task across models. Request estimates use current provider pricing.</p>
  </section>;
}

function AutoControls({ preferences, onChange, providers }) {
  const selectedMode = NEXUS_AUTO_MODES.find(({ id }) => id === preferences.mode) || NEXUS_AUTO_MODES[1];
  const ceilingId = useId();
  const updateMode = (mode) => onChange({ ...preferences, mode });
  const toggleProvider = (provider) => {
    const current = preferences.allowedProviders || providers;
    const allowedProviders = current.includes(provider) ? current.filter((entry) => entry !== provider) : [...current, provider];
    onChange({ ...preferences, allowedProviders });
  };
  return <div className="nexus-auto-controls">
    <div role="radiogroup" aria-label="Nexus Auto mode" className="nexus-auto-modes">
      {NEXUS_AUTO_MODES.map((mode, index) => <button key={mode.id} type="button" role="radio"
        aria-checked={preferences.mode === mode.id} tabIndex={preferences.mode === mode.id ? 0 : -1}
        aria-label={`${mode.label}${mode.recommended ? ", recommended" : ""}`}
        onClick={() => updateMode(mode.id)} onKeyDown={(event) => {
          if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
          const next = (index + delta + NEXUS_AUTO_MODES.length) % NEXUS_AUTO_MODES.length;
          updateMode(NEXUS_AUTO_MODES[next].id);
          event.currentTarget.parentElement.children[next].focus();
        }}>
        <span>{mode.label}</span>{mode.recommended && <span className="nexus-auto-mode-hint">RECOMMENDED</span>}
      </button>)}
    </div>
    <p className="nexus-auto-mode-description" aria-live="polite">{selectedMode.description}</p>
    <details className="nexus-auto-advanced">
      <summary>Auto preferences</summary>
      <fieldset>
        <legend>Allowed providers</legend>
        <label className="nexus-auto-provider-all"><input type="checkbox" checked={!preferences.allowedProviders}
          onChange={(event) => onChange({ ...preferences, allowedProviders: event.target.checked ? undefined : [...providers] })} />
          All available providers, including new additions</label>
        <div className="nexus-auto-providers">{providers.map((provider) => <label key={provider}>
          <input type="checkbox" checked={!preferences.allowedProviders || preferences.allowedProviders.includes(provider)}
            onChange={() => toggleProvider(provider)} />{providerLabel(provider)}
        </label>)}</div>
        {preferences.allowedProviders && !providers.some((provider) => preferences.allowedProviders.includes(provider)) &&
          <p className="nexus-model-warning" role="alert">No available providers are allowed. Auto cannot start until one is enabled.</p>}
      </fieldset>
      <label className="nexus-auto-ceiling" htmlFor={ceilingId}>
        <span>Maximum credits per request<small>Applies to each model call. Agent runs may use several.</small></span>
        <input id={ceilingId} type="number" min="0" step="1" placeholder="No limit" inputMode="numeric"
          value={preferences.creditCeiling ?? ""} onChange={(event) => {
            const value = event.target.value;
            if (value === "" || (Number.isSafeInteger(Number(value)) && Number(value) >= 0)) {
              onChange({ ...preferences, creditCeiling: value === "" ? undefined : Number(value) });
            }
          }} />
      </label>
      <p className="nexus-auto-storage-note">Saved on this device. Applies whenever Nexus Auto is selected.</p>
    </details>
  </div>;
}

export default function ModelSwitcher({
  value, onChange, isPremium, isStarterOrAbove = false, plan, onStarterNudge,
  fullWidth = false, autoPreferences: controlledPreferences,
  onAutoPreferencesChange,
}) {
  const { models, loading, refreshing, error: catalogError, refresh, meta } = useModelCatalog();
  const localPreferences = useNexusAutoPreferences();
  const autoPreferences = controlledPreferences || localPreferences.autoPreferences;
  const setAutoPreferences = onAutoPreferencesChange || localPreferences.setAutoPreferences;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [provider, setProvider] = useState("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const autoRef = useRef(null);
  const detailsRef = useRef(null);
  const menuId = useId();
  const autoSelected = !value || isNexusAutoModelId(value);
  const normalizedValue = normalizeModelId(value);
  const catalogModels = useMemo(() => (models || []).filter(isCatalogModelAvailable), [models]);
  const options = { isPremium, isStarterOrAbove, plan };
  const metadataOptions = useMemo(() => ({ newBadgeDays: meta?.newBadgeDays ?? meta?.metadataPolicy?.newBadgeDays ?? 30 }), [meta]);
  const sections = useMemo(() => createModelSections(catalogModels, { ...metadataOptions, query, filter, provider }),
    [catalogModels, metadataOptions, query, filter, provider]);
  const providers = useMemo(() => [...new Set(catalogModels.filter((model) => isModelSelectable(model, { isPremium, isStarterOrAbove, plan }))
    .map((model) => model.provider).filter(Boolean))].sort((a, b) => providerLabel(a).localeCompare(providerLabel(b))), [catalogModels, isPremium, isStarterOrAbove, plan]);
  const allProviders = useMemo(() => [...new Set(catalogModels.map((model) => model.provider).filter(Boolean))]
    .sort((a, b) => providerLabel(a).localeCompare(providerLabel(b))), [catalogModels]);
  const current = catalogModels.find((model) => model.id === normalizedValue || model.id === value);
  const detailsModel = catalogModels.find((model) => model.id === detailsId);
  const details = detailsModel ? presentModel(detailsModel, metadataOptions) : null;
  const searching = Boolean(query || filter !== "all" || provider !== "all");
  const showSearch = catalogModels.length >= MODEL_SEARCH_THRESHOLD;
  const currentLabel = autoSelected ? `Auto · ${NEXUS_AUTO_MODES.find(({ id }) => id === autoPreferences.mode)?.label || "Balanced"}`
    : current?.displayName || current?.name || MODEL_ALIAS_LABELS[value] || MODEL_ALIAS_LABELS[normalizedValue] || "Model unavailable";

  const updateMenuPosition = useCallback(() => {
    const position = resolveAnchoredMenuPosition(buttonRef.current, { menuWidth: MENU_WIDTH, menuMaxHeight: MENU_MAX_HEIGHT, minHeight: 120 });
    if (!position) return;
    const host = getWorkspaceMenuHost();
    const inHost = position.strategy === "absolute" && host;
    const scale = inHost ? readWorkspaceHostScale(host) : 1;
    const triggerTop = (buttonRef.current.getBoundingClientRect().top - (inHost ? host.getBoundingClientRect().top : 0)) / scale;
    const containerHeight = inHost ? host.clientHeight : window.innerHeight;
    const below = containerHeight - position.top - 8;
    const above = triggerTop - 16;
    if (below < Math.min(360, above)) {
      const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(120, above));
      setMenuPosition({ ...position, top: Math.max(8, triggerTop - maxHeight - 8), maxHeight });
    } else setMenuPosition({ ...position, maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, below)) });
  }, []);

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery(""); setFilter("all"); setProvider("all"); setDetailsId(null);
      return undefined;
    }
    updateMenuPosition();
    const frame = window.requestAnimationFrame(() => (searchRef.current || autoRef.current)?.focus());
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) closeMenu(false);
    };
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open, updateMenuPosition, closeMenu]);

  useEffect(() => {
    if (value == null || value === "") onChange?.(LEGACY_NEXUS_FREE_MODEL);
  }, [value, onChange]);

  const select = (id) => { onChange?.(id); closeMenu(); };
  const selectModel = (model) => {
    if (!isModelSelectable(model, options)) { onStarterNudge?.("Model Selection"); return; }
    select(model.id);
  };
  const openDetails = (model) => {
    setDetailsId(model?.id || null);
    if (model) window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView?.({ block: "nearest" }));
  };
  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMenu(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (event.target.matches("select, input:not([type='search']), summary, [role='radio']")) return;
    if (event.target.matches("input") && ["Home", "End"].includes(event.key)) return;
    if (!event.target.hasAttribute("data-model-option") && event.target !== searchRef.current) return;
    const choices = [...(menuRef.current?.querySelectorAll("[data-model-option]") || [])];
    if (!choices.length) return;
    event.preventDefault();
    const currentIndex = choices.indexOf(document.activeElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1
      : currentIndex < 0 ? delta > 0 ? 0 : choices.length - 1 : (currentIndex + delta + choices.length) % choices.length;
    choices[nextIndex].focus();
  };

  const menu = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} id={menuId} role="dialog" aria-label="Choose AI model" onKeyDown={handleMenuKeyDown}
      className="nexus-model-picker scrollbar-subtle" style={{ position: menuPosition?.strategy || "fixed",
        width: menuPosition?.width ?? MENU_WIDTH, top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0,
        maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT, visibility: menuPosition ? "visible" : "hidden" }}>
      <div className="nexus-model-picker-heading"><span>AI model</span><span>Quality. Speed. Credits.</span></div>
      <section className="nexus-auto-section" aria-label="Nexus Auto">
        <button ref={autoRef} type="button" data-model-option aria-pressed={autoSelected} className={`nexus-auto-choice ${autoSelected ? "is-selected" : ""}`}
          onClick={() => select(LEGACY_NEXUS_FREE_MODEL)}>
          <ModelProviderGlyph provider="nexus" modelId={LEGACY_NEXUS_FREE_MODEL} size={21} />
          <span className="nexus-model-copy"><span className="nexus-auto-title">Nexus Auto <Badge>RECOMMENDED</Badge></span>
            <span className="nexus-model-description">Automatically selects the best model for your task.</span></span>
          {autoSelected && <Check size={15} aria-hidden="true" />}
        </button>
        <AutoControls preferences={autoPreferences} providers={providers} onChange={(next) => {
          setAutoPreferences(next); onChange?.(LEGACY_NEXUS_FREE_MODEL);
        }} />
      </section>
      {showSearch && <div className="nexus-model-search-tools">
        <div className="nexus-model-search"><Search size={15} aria-hidden="true" />
          <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models or strengths" aria-label="Search models" /></div>
        <div className="nexus-model-filters">
          <select aria-label="Filter models" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All models</option><option value="recommended">Recommended</option><option value="latest">Latest</option>
            <option value="low">Low credit usage</option><option value="fast">Fast</option><option value="context">Long context</option>
          </select>
          <select aria-label="Filter by provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="all">All providers</option>{allProviders.map((id) => <option value={id} key={id}>{providerLabel(id)}</option>)}
          </select>
        </div>
      </div>}
      {!autoSelected && (!current || !isModelSelectable(current, options)) && !loading && <p className="nexus-model-warning" role="status">Your saved model is unavailable. Choose a model or Nexus Auto.</p>}
      <div role="group" aria-label="Individual models">
        {sections.map((section) => <section className="nexus-model-section" key={section.id} aria-label={section.label}>
          {section.id === "more" && !searching ? <button type="button" className="nexus-more-models" aria-expanded={moreOpen}
            onClick={() => setMoreOpen((currentOpen) => !currentOpen)}><span>More Models <span>{section.models.length}</span></span>
            <ChevronDown size={13} aria-hidden="true" className={moreOpen ? "is-open" : ""} /></button>
            : <h3>{section.label}</h3>}
          {(section.id !== "more" || moreOpen || searching) && section.models.map((model) =>
            <ModelRow key={model.id} model={model} selected={!autoSelected && model.id === current?.id}
              locked={!isModelSelectable(model, options)} expanded={model.id === detailsId} onSelect={selectModel} onDetails={openDetails} />)}
        </section>)}
      </div>
      {details && <div ref={detailsRef}><ModelDetails model={details} onClose={() => {
        const trigger = [...menuRef.current.querySelectorAll(".nexus-model-info")].find((element) => element.getAttribute("aria-label") === `About ${details.name}`);
        setDetailsId(null); trigger?.focus();
      }} /></div>}
      {loading || refreshing ? <p role="status" className="nexus-model-empty">Checking live model availability…</p>
        : catalogError ? <div role="status" className="nexus-model-catalog-error"><span>Live models are temporarily unavailable.</span>
          <button type="button" onClick={() => void refresh?.()}>Retry</button></div>
          : !sections.length ? <p role="status" className="nexus-model-empty">{searching ? "No models match these filters." : "No billable models are available right now."}</p> : null}
      <p className="nexus-model-picker-footnote">Exact usage depends on context and output. Auto explains which model it selects.</p>
    </div>, getWorkspaceMenuHost() || document.body) : null;

  return <div ref={rootRef} className={fullWidth ? "relative w-full" : "relative"}>
    <button ref={buttonRef} type="button" title="Select AI model" aria-haspopup="dialog" aria-expanded={open}
      aria-controls={open ? menuId : undefined} className={`nexus-model-trigger ${fullWidth ? "is-full-width" : ""}`}
      onClick={() => { updateMenuPosition(); setOpen((currentOpen) => !currentOpen); }}
      onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
      <ModelProviderGlyph provider={autoSelected ? "nexus" : current?.provider || "nexus"}
        modelId={autoSelected ? LEGACY_NEXUS_FREE_MODEL : current?.id} size={15} type="mono" />
      <span>{currentLabel}</span><ChevronDown size={12} aria-hidden="true" className={open ? "is-open" : ""} />
    </button>{menu}
  </div>;
}
