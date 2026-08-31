import React, { useId, useRef } from "react";
import { ChevronDown } from "../../lib/icons";
import { Toggle } from "../ui";
import CreationPromptComposer from "../ai/chat/CreationPromptComposer";
import {
  AnimatedAssetIcon,
  AnimatedImageIcon,
  AnimatedRefreshIcon,
  AnimatedUiIcon,
} from "../ui/AnimatedActionIcon";
import "../ai/chat/ChatExperience.css";

export const ASSET_GENERATION_MODES = [
  { id: "single", label: "Single", description: "Create one new asset.", icon: AnimatedImageIcon },
  { id: "pack", label: "Pack", description: "Create a coordinated set. Eight is the suggested starting point, not a cap.", icon: AnimatedAssetIcon },
  { id: "extend", label: "Extend", description: "Add matching assets to an existing pack.", icon: AnimatedUiIcon },
  { id: "similar", label: "Similar", description: "Use an existing asset as the style anchor.", icon: AnimatedAssetIcon },
  { id: "replacement", label: "Replace", description: "Generate a revision while preserving replacement history.", icon: AnimatedRefreshIcon },
];

function assetId(asset) {
  return String(asset?.assetId || asset?.id || "");
}

function packId(pack) {
  return String(pack?.packId || pack?.id || "");
}

function AssetPromptComposer({
  id,
  value,
  onChange,
  disabled,
  submitting,
  unsupported,
  modeLabel,
  modeIcon,
  onOpenReference,
}) {
  const buttonLabel = disabled
    ? "Generation unavailable"
    : submitting
      ? "Starting generation…"
      : `Generate ${modeLabel.toLowerCase()}`;

  return (
    <div className="asset-prompt-composer-field">
      <span className="nexus-field-label" id={`${id}-label`}>Creative brief</span>
      <CreationPromptComposer
        prompt={value}
        setPrompt={onChange}
        attachments={[]}
        setAttachments={() => {}}
        onSubmit={(event) => event?.currentTarget?.closest?.("form")?.requestSubmit()}
        onAttachmentRequest={onOpenReference}
        attachmentLabel="Choose a saved style reference"
        isGenerating={submitting}
        disabled={disabled || unsupported}
        placeholder="Describe the visual metaphor, mood, palette, materials, and small-size details…"
        promptAriaLabel="Creative brief"
        submitLabel={buttonLabel}
        contextIcon={modeIcon}
        contextLabel={modeLabel}
        showWorkspaceOptions={false}
        regionClassName="asset-prompt-composer-region"
        composerClassName="asset-prompt-composer"
      />
      <small className="asset-field-help">Press Enter to generate · Shift+Enter for a new line</small>
    </div>
  );
}

export const DEFAULT_ASSET_GENERATION_FORM = {
  mode: "pack",
  prompt: "",
  requestedCount: 8,
  conceptNames: "",
  autoExtractConcepts: true,
  packId: "",
  sourceAssetId: "",
  variationCount: 3,
  styleProfileId: "",
  artworkMode: "transparent_game_ui_icon",
  backgroundMode: "transparent",
  transparencyRequired: true,
  referenceAssetId: "",
};

export default function AssetGenerationForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  disabled = false,
  packs = [],
  assets = [],
  styleProfiles = [],
  unsupportedModes = [],
  costEstimate,
}) {
  const form = { ...DEFAULT_ASSET_GENERATION_FORM, ...value };
  const fieldId = useId();
  const referenceSelectRef = useRef(null);

  const patch = (next) => onChange?.({ ...form, ...next });
  const selectedMode = ASSET_GENERATION_MODES.find((mode) => mode.id === form.mode) || ASSET_GENERATION_MODES[0];
  const SelectedModeIcon = selectedMode.icon;
  const unsupported = unsupportedModes.includes(form.mode);

  const handleModeChange = (mode) => {
    if (unsupportedModes.includes(mode)) return;
    patch({ mode, requestedCount: mode === "pack" && !form.requestedCount ? 8 : form.requestedCount });
  };

  return (
    <form className="asset-generation-form" aria-busy={submitting} onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit?.(form); }}>
      <fieldset className="asset-mode-picker" disabled={disabled}>
        <legend className="sr-only">Generation mode</legend>
        <details>
          <summary>
            <span><SelectedModeIcon aria-hidden="true" /><span><small>Output</small><strong>{selectedMode.label}</strong></span></span>
            <span>{selectedMode.description}<ChevronDown aria-hidden="true" /></span>
          </summary>
          <div className="asset-mode-picker__grid">
          {ASSET_GENERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            const modeDisabled = unsupportedModes.includes(mode.id);
            return (
              <label key={mode.id} className={`asset-mode-option ${form.mode === mode.id ? "asset-mode-option--active" : ""} ${modeDisabled || disabled ? "asset-mode-option--disabled" : ""}`}>
                <input type="radio" name={`${fieldId}-mode`} value={mode.id} checked={form.mode === mode.id} disabled={disabled || modeDisabled} aria-describedby={`${fieldId}-mode-description`} onChange={(event) => { handleModeChange(mode.id); event.currentTarget.closest("details")?.removeAttribute("open"); }} />
                <Icon aria-hidden="true" />
                <span><strong>{mode.label}</strong><small>{modeDisabled ? "Unavailable for this context" : mode.description}</small></span>
              </label>
            );
          })}
          </div>
        </details>
        <p className="asset-mode-picker__description" id={`${fieldId}-mode-description`}>
          {unsupported ? `${selectedMode.label} is unavailable for this project.` : selectedMode.description}
        </p>
      </fieldset>

      <div className="asset-generation-form__brief">
        <AssetPromptComposer
          id={`${fieldId}-prompt`}
          value={form.prompt}
          disabled={disabled}
          submitting={submitting}
          unsupported={unsupported}
          modeLabel={selectedMode.label}
          modeIcon={selectedMode.icon}
          onOpenReference={() => referenceSelectRef.current?.focus()}
          onChange={(prompt) => patch({ prompt })}
        />

        <label className="asset-reference-input">
          <span className="nexus-field-label">Style reference asset <small>optional</small></span>
          <select ref={referenceSelectRef} className="nexus-input" value={form.referenceAssetId} disabled={disabled} onChange={(event) => patch({ referenceAssetId: event.target.value })}>
            <option value="">Use project style context</option>
            {assets.filter((asset) => assetId(asset)).map((asset) => (
              <option key={assetId(asset)} value={assetId(asset)}>{asset.name || assetId(asset)}</option>
            ))}
          </select>
          <small className="asset-field-help">Uses a saved NexusRBX asset as visual context.</small>
        </label>
      </div>

      {(form.mode === "pack" || form.mode === "extend") ? (
        <div className="asset-generation-form__row">
          <label>
            <span className="nexus-field-label">Asset count</span>
            <input className="nexus-input" type="number" min="1" step="1" value={form.requestedCount} disabled={disabled} onChange={(event) => patch({ requestedCount: Math.max(1, Number(event.target.value) || 1) })} />
            <small className="asset-field-help">Eight is the soft default. Choose the size your interface actually needs.</small>
          </label>
          {form.mode === "extend" ? (
            <label>
              <span className="nexus-field-label">Pack to extend</span>
              <select className="nexus-input" required value={form.packId} disabled={disabled} onChange={(event) => patch({ packId: event.target.value })}>
                <option value="">Select a pack</option>
                {packs.map((pack) => <option key={packId(pack)} value={packId(pack)}>{pack.name || packId(pack)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {(form.mode === "pack" || form.mode === "extend") ? (
        <label>
          <span className="nexus-field-label">Named icon list <small>optional</small></span>
          <textarea className="nexus-textarea" rows={3} value={form.conceptNames} disabled={disabled} onChange={(event) => patch({ conceptNames: event.target.value })} placeholder={"Inventory\nQuest log\nFast travel\nSettings"} />
          <span className="asset-inline-toggle"><Toggle checked={form.autoExtractConcepts} disabled={disabled} onChange={(checked) => patch({ autoExtractConcepts: checked })} aria-label="Automatically extract missing icon concepts from the brief" /><span>Automatically extract missing concepts from the brief</span></span>
        </label>
      ) : null}

      {(form.mode === "similar" || form.mode === "replacement") ? (
        <div className="asset-generation-form__row">
          <label>
            <span className="nexus-field-label">Source asset</span>
            <select className="nexus-input" required value={form.sourceAssetId} disabled={disabled} onChange={(event) => patch({ sourceAssetId: event.target.value })}>
              <option value="">Select an existing asset</option>
              {assets.map((asset) => <option key={assetId(asset)} value={assetId(asset)}>{asset.name || assetId(asset)}</option>)}
            </select>
            <small className="asset-field-help">{form.mode === "replacement" ? "A new variation keeps the source lineage; the existing asset is not overwritten." : "The source is used as a style anchor; it is not overwritten."}</small>
          </label>
          <label>
            <span className="nexus-field-label">Variation count</span>
            <input
              className="nexus-input"
              type="number"
              min="1"
              max="3"
              step="1"
              value={form.variationCount}
              disabled={disabled}
              onChange={(event) => patch({ variationCount: Math.min(3, Math.max(1, Number(event.target.value) || 1)) })}
            />
            <small className="asset-field-help">Create up to three variations from the saved source.</small>
          </label>
        </div>
      ) : null}

      <details className="asset-generation-form__advanced">
        <summary>Style and output controls</summary>
        <div className="asset-generation-form__row">
          <label>
            <span className="nexus-field-label">Style profile</span>
            <select className="nexus-input" value={form.styleProfileId} disabled={disabled} onChange={(event) => patch({ styleProfileId: event.target.value })}>
              <option value="">Project default</option>
              {styleProfiles.map((profile) => <option key={profile.styleProfileId} value={profile.styleProfileId}>{profile.name}</option>)}
            </select>
          </label>
          <label>
            <span className="nexus-field-label">Artwork mode</span>
            <select className="nexus-input" value={form.artworkMode} disabled={disabled} onChange={(event) => patch({ artworkMode: event.target.value })}>
              <option value="transparent_game_ui_icon">Transparent game UI icon</option>
              <option value="badge_artwork">Badge artwork</option>
              <option value="game_pass_artwork">Game pass artwork</option>
              <option value="template_based_artwork">Template-based artwork</option>
              <option value="not_artwork">Not artwork</option>
            </select>
          </label>
          <label>
            <span className="nexus-field-label">Background</span>
            <select className="nexus-input" value={form.backgroundMode} disabled={disabled} onChange={(event) => patch({ backgroundMode: event.target.value, transparencyRequired: event.target.value === "transparent" })}>
              <option value="transparent">Transparent</option>
              <option value="background_enabled">Background enabled</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </label>
        </div>
      </details>

      {unsupported ? <div className="asset-capability-warning" role="alert">{selectedMode.label} generation is not supported for the current project or Roblox creator. Nexus will not simulate this operation.</div> : null}

      <footer className="asset-generation-form__footer">
        <div><span>Estimated cost</span><strong>{costEstimate || "Confirmed by the server before work starts"}</strong></div>
      </footer>
    </form>
  );
}
