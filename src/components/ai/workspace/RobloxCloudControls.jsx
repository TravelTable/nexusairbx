import React from "react";
import { Cloud, Loader2 } from "lucide-react";

export default function RobloxCloudControls({
  connected = false,
  loading = false,
  selectedCreator = null,
  assetUploadsEnabled = false,
  onAssetUploadsEnabledChange,
  uploadAvailable = false,
}) {
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

      <label
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
        title={uploadAvailable ? "Allow generated assets to upload to Roblox" : "Requires Roblox connection with asset write scope"}
      >
        <input
          type="checkbox"
          checked={Boolean(assetUploadsEnabled)}
          onChange={(e) => onAssetUploadsEnabledChange?.(e.target.checked)}
          className="accent-[#00bbf9]"
          disabled={!uploadAvailable}
        />
        Asset Uploads
      </label>
    </div>
  );
}
