import React, { useState, useEffect } from "react";
import { X, Download, Upload, CheckCircle2, Loader, Package } from "lucide-react";

export default function IconWorkflowModal({
  isOpen,
  onClose,
  uniqueAssets,
  assetIds,
  setAssetIds,
  onFinalize,
  isFinalizing,
  handleDownloadAllAssets
}) {
  if (!isOpen) return null;

  const allIdsEntered = uniqueAssets.length > 0 && uniqueAssets.every(asset => assetIds[asset.url] && assetIds[asset.url].trim());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-[#0b1220] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#9b5de5]/10 to-[#00f5d4]/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-[#00f5d4]" />
              Finalize Your Icons
            </h2>
            <p className="text-sm text-gray-400 mt-1">The AI selected these icons. You need to upload them to Roblox to get permanent IDs.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="px-6 py-4 bg-black/20 border-b border-gray-800 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#9b5de5] text-white text-xs flex items-center justify-center font-bold">1</div>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Download</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#00f5d4] text-black text-xs flex items-center justify-center font-bold">2</div>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Upload</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white text-black text-xs flex items-center justify-center font-bold">3</div>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Paste IDs</span>
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {uniqueAssets.map((asset, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center gap-4 group hover:border-[#00f5d4]/30 transition-all">
              <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden p-1">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="text-sm font-bold text-white truncate">{asset.name}</div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  <a 
                    href={asset.url} 
                    download={`${asset.name.replace(/\s+/g, '_')}.png`}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                  <a 
                    href="https://create.roblox.com/dashboard/creations?activeTab=Decal" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 text-[#00f5d4] text-[10px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </a>
                </div>
              </div>

              <div className="w-full sm:w-48">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Roblox Asset ID"
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
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-black/40 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownloadAllAssets}
            className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Package className="w-4 h-4" />
            Download All (ZIP)
          </button>
          
          <button
            onClick={onFinalize}
            disabled={isFinalizing || !Object.values(assetIds).some(id => id && id.trim())}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-lg hover:shadow-[#00f5d4]/20 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {isFinalizing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {allIdsEntered ? "Finalize & Apply All IDs" : "Apply Provided IDs"}
          </button>
        </div>
      </div>
    </div>
  );
}
