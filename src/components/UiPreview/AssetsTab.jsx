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
          <h3 className="text-lg font-bold text-white">Icon & Asset Workflow</h3>
          <p className="text-xs text-gray-400">Follow these steps to get your icons into Roblox.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAllAssets}
            disabled={uniqueAssets.length === 0}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            Download All (ZIP)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#9b5de5] text-white text-[10px] flex items-center justify-center font-bold">1</div>
            <span className="text-xs font-bold text-gray-200">Download</span>
          </div>
          <p className="text-[10px] text-gray-400">Get the icon files to your computer.</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#00f5d4] text-black text-[10px] flex items-center justify-center font-bold">2</div>
            <span className="text-xs font-bold text-gray-200">Upload</span>
          </div>
          <p className="text-[10px] text-gray-400">Upload them as Decals on Roblox Creator Dashboard.</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">3</div>
            <span className="text-xs font-bold text-gray-200">Paste ID</span>
          </div>
          <p className="text-[10px] text-gray-400">Copy the Asset ID and paste it here to update the UI.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
        {uniqueAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-full bg-gray-800/50 text-gray-500">
              <ImageIcon className="w-12 h-12" />
            </div>
            <p className="text-gray-400 text-sm">No icons found in this UI.</p>
          </div>
        ) : (
          uniqueAssets.map((asset, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-gray-900/40 border border-gray-800 flex flex-col sm:flex-row items-center gap-4 group hover:border-gray-700 transition-all">
              <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/5 flex-shrink-0 overflow-hidden p-1">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="text-sm font-bold text-white truncate">{asset.name}</div>
                <div className="text-[10px] text-gray-500 mb-2">Used in {asset.nodes.length} elements</div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <a 
                    href={asset.url} 
                    download={`${asset.name.replace(/\s+/g, '_')}.png`}
                    className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                  <a 
                    href="https://create.roblox.com/dashboard/creations?activeTab=Decal" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 text-[#00f5d4] text-[10px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    Upload to Roblox
                  </a>
                </div>
              </div>

              <div className="w-full sm:w-48">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Paste Roblox ID here..."
                    className={`w-full bg-black/60 border rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all ${
                      assetIds[asset.url] ? "border-[#00f5d4]/50 focus:border-[#00f5d4]" : "border-gray-800 focus:border-[#9b5de5]"
                    }`}
                    value={assetIds[asset.url] || ""}
                    onChange={(e) => setAssetIds(prev => ({ ...prev, [asset.url]: e.target.value }))}
                  />
                  {assetIds[asset.url] && (
                    <CheckCircle2 className="absolute right-3 top-2.5 w-4 h-4 text-[#00f5d4]" />
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
            Apply All Roblox IDs to UI
          </button>
        </div>
      )}
    </div>
  );
}
