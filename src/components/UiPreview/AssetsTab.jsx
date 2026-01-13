import React from "react";
import { Package, Image as ImageIcon, Download, Upload, CheckCircle2, Loader } from "lucide-react";

export default function AssetsTab({
  uniqueAssets,
  handleDownloadAllAssets,
  assetIds,
  setAssetIds,
  isFinalizing,
  handleFinalizeAssets
}) {
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Asset Management</h3>
          <p className="text-xs text-gray-400">Download assets, upload to Roblox, and paste the IDs below.</p>
        </div>
        <button
          onClick={handleDownloadAllAssets}
          disabled={uniqueAssets.length === 0}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Package className="w-4 h-4" />
          Download All (ZIP)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
        {uniqueAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-full bg-gray-800/50 text-gray-500">
              <ImageIcon className="w-12 h-12" />
            </div>
            <p className="text-gray-400 text-sm">No external assets found in this UI.</p>
          </div>
        ) : (
          uniqueAssets.map((asset, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 flex items-center gap-4 group hover:border-gray-700 transition-all">
              <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/5 flex-shrink-0 overflow-hidden p-1">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{asset.name}</div>
                <div className="text-[10px] text-gray-500 mb-2">Used in {asset.nodes.length} elements</div>
                <div className="flex items-center gap-2">
                  <a 
                    href={asset.url} 
                    download={`${asset.name}.png`}
                    className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                    title="Download Individual"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://create.roblox.com/dashboard/creations?activeTab=Decal" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-[#00f5d4] transition-all"
                    title="Upload to Roblox"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <div className="w-48">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Roblox Asset ID"
                    className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-xs text-white outline-none transition-all ${
                      assetIds[asset.url] ? "border-[#00f5d4]/50 focus:border-[#00f5d4]" : "border-gray-800 focus:border-[#9b5de5]"
                    }`}
                    value={assetIds[asset.url] || ""}
                    onChange={(e) => setAssetIds(prev => ({ ...prev, [asset.url]: e.target.value }))}
                  />
                  {assetIds[asset.url] && (
                    <CheckCircle2 className="absolute right-2 top-2 w-4 h-4 text-[#00f5d4]" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {uniqueAssets.length > 0 && (
        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={handleFinalizeAssets}
            disabled={isFinalizing || !Object.values(assetIds).some(id => id && id.trim())}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-lg hover:shadow-[#00f5d4]/20 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {isFinalizing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Finalize & Apply Asset IDs
          </button>
        </div>
      )}
    </div>
  );
}
