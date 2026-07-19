import React, { useId, useRef, useState } from "react";
import { ImagePlus, Layers, Package, RefreshCw, Sparkles, Upload, WandSparkles, X } from "../../lib/icons";
import { Button, Toggle } from "../ui";

export const ASSET_GENERATION_MODES = [
  { id: "single", label: "Single", description: "Create one new asset.", icon: ImagePlus },
  { id: "pack", label: "Pack", description: "Create a coordinated set. Eight is the suggested starting point, not a cap.", icon: Package },
  { id: "extend", label: "Extend", description: "Add matching assets to an existing pack.", icon: Layers },
  { id: "similar", label: "Similar", description: "Use an existing asset as the style anchor.", icon: Sparkles },
  { id: "replacement", label: "Replace", description: "Generate a revision while preserving replacement history.", icon: RefreshCw },
];

function assetId(asset) {
  return String(asset?.assetId || asset?.id || "");
}

function packId(pack) {
  return String(pack?.packId || pack?.id || "");
}

export const DEFAULT_ASSET_GENERATION_FORM = {
  mode: "pack",
  prompt: "",
  requestedCount: 8,
  conceptNames: "",
  autoExtractConcepts: true,
  packId: "",
  sourceAssetId: "",
  styleProfileId: "",
  artworkMode: "transparent_game_ui_icon",
  backgroundMode: "transparent",
  transparencyRequired: true,
  referenceImage: null,
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
  const fileRef = useRef(null);
  const [fileError, setFileError] = useState("");

  const patch = (next) => onChange?.({ ...form, ...next });
  const selectedMode = ASSET_GENERATION_MODES.find((mode) => mode.id === form.mode) || ASSET_GENERATION_MODES[0];
  const unsupported = unsupportedModes.includes(form.mode);

  const handleReference = (event) => {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ referenceImage: { name: file.name, type: file.type, size: file.size, dataUrl: reader.result } });
    reader.onerror = () => setFileError("The reference image could not be read.");
    reader.readAsDataURL(file);
  };

  const handleModeChange = (mode) => {
    if (unsupportedModes.includes(mode)) return;
    patch({ mode, requestedCount: mode === "pack" && !form.requestedCount ? 8 : form.requestedCount });
  };

  return (
    <form className="asset-generation-form" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit?.(form); }}>
      <fieldset className="asset-mode-picker" disabled={disabled}>
        <legend>Generation mode</legend>
        <div className="asset-mode-picker__grid">
          {ASSET_GENERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            const modeDisabled = unsupportedModes.includes(mode.id);
            return (
              <label key={mode.id} className={`asset-mode-option ${form.mode === mode.id ? "asset-mode-option--active" : ""} ${modeDisabled || disabled ? "asset-mode-option--disabled" : ""}`}>
                <input type="radio" name={`${fieldId}-mode`} value={mode.id} checked={form.mode === mode.id} disabled={disabled || modeDisabled} onChange={() => handleModeChange(mode.id)} />
                <Icon aria-hidden="true" />
                <span><strong>{mode.label}</strong><small>{modeDisabled ? "Unavailable for this context" : mode.description}</small></span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="asset-generation-form__brief">
        <label htmlFor={`${fieldId}-prompt`}>
          <span className="nexus-field-label">Creative brief</span>
          <textarea
            id={`${fieldId}-prompt`}
            className="nexus-textarea"
            rows={5}
            value={form.prompt}
            disabled={disabled}
            onChange={(event) => patch({ prompt: event.target.value })}
            placeholder="Describe the player action, visual metaphor, mood, palette, and any details that must remain legible at small sizes."
            required
          />
        </label>

        <div className="asset-reference-input">
          <span className="nexus-field-label">Reference image <small>optional</small></span>
          {form.referenceImage ? (
            <div className="asset-reference-input__selected">
              <img src={form.referenceImage.dataUrl} alt="Selected style reference" />
              <span><strong>{form.referenceImage.name}</strong><small>Used as visual context, not copied as a result.</small></span>
              <Button variant="subtle" size="sm" icon={X} aria-label="Remove reference image" disabled={disabled} onClick={() => { patch({ referenceImage: null }); if (fileRef.current) fileRef.current.value = ""; }} />
            </div>
          ) : (
            <button className="asset-reference-input__button" type="button" disabled={disabled} onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden="true" /><span><strong>Add a visual reference</strong><small>PNG, JPG, or WebP</small></span>
            </button>
          )}
          <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={handleReference} />
          {fileError ? <span className="asset-field-error" role="alert">{fileError}</span> : null}
        </div>
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
        <label>
          <span className="nexus-field-label">Source asset</span>
          <select className="nexus-input" required value={form.sourceAssetId} disabled={disabled} onChange={(event) => patch({ sourceAssetId: event.target.value })}>
            <option value="">Select an existing asset</option>
            {assets.map((asset) => <option key={assetId(asset)} value={assetId(asset)}>{asset.name || assetId(asset)}</option>)}
          </select>
          <small className="asset-field-help">{form.mode === "replacement" ? "The new record will retain the superseded asset relationship." : "The source is used as a style anchor; it is not overwritten."}</small>
        </label>
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
        <Button type="submit" size="lg" icon={WandSparkles} disabled={disabled || submitting || unsupported || !form.prompt.trim()}>
          {disabled ? "Generation unavailable" : submitting ? "Starting generation…" : `Generate ${selectedMode.label.toLowerCase()}`}
        </Button>
      </footer>
    </form>
  );
}
