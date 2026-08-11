import React from "react";
import { Cloud, ImagePlus, Loader2 } from "lib/icons";

export default function RobloxCloudControls({
  connected = false,
  loading = false,
  selectedCreator = null,
  selectedAssetCount = 0,
  onOpenAssetLibrary,
  assetLibraryAvailable = false,
  assetLibraryDisabledReason = "",
  assetUploadsEnabled = false,
  onAssetUploadsEnabledChange,
  uploadAvailable = false,
  uploadState = "disabled",
  uploadDisabledReason = "",
}) {
  const handleDisabledAssetClick = () => {
    if (!assetLibraryAvailable && assetLibraryDisabledReason) {
      window.alert(assetLibraryDisabledReason);
    }
  };

  const handleDisabledUploadClick = (event) => {
    if (!uploadAvailable && uploadDisabledReason) {
      event.preventDefault();
      window.alert(uploadDisabledReason);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
          connected
            ? "border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_10%,transparent)] text-[var(--ds-info)]"
            : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]"
        }`}
        title={connected ? "Roblox OAuth is connected" : "Connect Roblox from Settings"}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
        {connected ? "Roblox" : "Cloud off"}
      </span>

      {connected && selectedCreator && (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[9px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]"
          title="Selected Roblox creator target"
        >
          {selectedCreator.type} {selectedCreator.id}
        </span>
      )}

      <button
        type="button"
        onClick={assetLibraryAvailable ? onOpenAssetLibrary : handleDisabledAssetClick}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
          selectedAssetCount > 0
            ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]"
            : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
        } ${!assetLibraryAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
        title={assetLibraryAvailable ? "Browse and attach Roblox assets to this project" : assetLibraryDisabledReason || "Assets unavailable"}
        aria-label="Select Roblox assets"
      >
        <ImagePlus className="w-3 h-3" />
        {loading ? "Loading Assets" : selectedAssetCount > 0 ? `Select Assets · ${selectedAssetCount}` : "Select Assets"}
      </button>

      <label
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)] cursor-pointer"
        title={uploadAvailable ? `Auto-upload generated icons to Roblox (${uploadState})` : uploadDisabledReason || "Requires Roblox connection with asset write scope"}
        onClick={handleDisabledUploadClick}
      >
        <input
          type="checkbox"
          checked={Boolean(assetUploadsEnabled)}
          onChange={(e) => onAssetUploadsEnabledChange?.(e.target.checked)}
          className="accent-[var(--ds-info)]"
          disabled={!uploadAvailable}
        />
        Auto-upload icons to Roblox
      </label>
    </div>
  );
}
