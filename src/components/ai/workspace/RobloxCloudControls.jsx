import React from "react";
import { Cloud, ImagePlus, Loader2 } from "lucide-react";

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
            ? "border-[#00bbf9]/25 bg-[#00bbf9]/10 text-[#00bbf9]"
            : "border-white/10 bg-white/5 text-gray-500"
        }`}
        title={connected ? "Roblox OAuth is connected" : "Connect Roblox from Settings"}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
        {connected ? "Roblox" : "Cloud off"}
      </span>

      {connected && selectedCreator && (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-gray-400"
          title="Selected Roblox creator target"
        >
          {selectedCreator.type} {selectedCreator.id}
        </span>
      )}

      <button
        type="button"
        onClick={assetLibraryAvailable ? onOpenAssetLibrary : handleDisabledAssetClick}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
          selectedAssetCount > 0
            ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]"
            : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        } ${!assetLibraryAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
        title={assetLibraryAvailable ? "Browse and attach Roblox assets to this project" : assetLibraryDisabledReason || "Assets unavailable"}
        aria-label="Select Roblox assets"
      >
        <ImagePlus className="w-3 h-3" />
        {loading ? "Loading Assets" : selectedAssetCount > 0 ? `Select Assets · ${selectedAssetCount}` : "Select Assets"}
      </button>

      <label
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
        title={uploadAvailable ? `Generated asset upload state: ${uploadState}` : uploadDisabledReason || "Requires Roblox connection with asset write scope"}
        onClick={handleDisabledUploadClick}
      >
        <input
          type="checkbox"
          checked={Boolean(assetUploadsEnabled)}
          onChange={(e) => onAssetUploadsEnabledChange?.(e.target.checked)}
          className="accent-[#00bbf9]"
          disabled={!uploadAvailable}
        />
        Auto Upload Generated Assets
      </label>
    </div>
  );
}
