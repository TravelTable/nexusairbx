import React from "react";
import { Search, AlertCircle, Loader, Plus } from "lucide-react";
import { robloxThumbnailUrl } from "../../lib/uiBuilderApi";

export default function ImagesTab({
  imageNodes,
  selectedImageNode,
  setSelectedImageNode,
  imageSearchQuery,
  setImageSearchQuery,
  handleImageSearch,
  isSearchingImages,
  imageSearchResults,
  applyImageId,
  updateNodeProperty
}) {
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 scrollbar-hide">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">UI Image Elements</h4>
            {imageNodes.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm bg-black/20 rounded-xl border border-dashed border-gray-800">
                No image elements found in this UI.
              </div>
            )}
            {imageNodes.map((node) => {
              const isMissing = !node.imageId || node.imageId.includes('//0');
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedImageNode(node);
                    setImageSearchQuery(node.name || "");
                    handleImageSearch(node.name || "");
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    selectedImageNode?.id === node.id
                      ? "border-[#00f5d4] bg-[#00f5d4]/5"
                      : isMissing
                      ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                      : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-200">{node.name || "Unnamed Image"}</span>
                    {isMissing && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 truncate">
                    {node.imageId || "No ID set"}
                  </div>
                </button>
              );
            })}

            {selectedImageNode && (
              <div className="p-4 bg-[#00f5d4]/5 border border-[#00f5d4]/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-[#00f5d4] uppercase tracking-widest">Advanced Properties</h4>
                  {selectedImageNode.imageId && !selectedImageNode.imageId.includes('//0') && (
                    <div className="w-8 h-8 rounded bg-black/40 border border-white/10 overflow-hidden">
                      <img 
                        src={robloxThumbnailUrl({ assetId: selectedImageNode.imageId.match(/\d+/)?.[0] })} 
                        className="w-full h-full object-contain"
                        alt="Preview"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Rect Offset</label>
                    <input 
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white"
                      placeholder="0, 0"
                      defaultValue={selectedImageNode.imageRectOffset || ""}
                      onBlur={(e) => updateNodeProperty(selectedImageNode.id, 'ImageRectOffset', `Vector2.new(${e.target.value || "0, 0"})`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Rect Size</label>
                    <input 
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white"
                      placeholder="0, 0"
                      defaultValue={selectedImageNode.imageRectSize || ""}
                      onBlur={(e) => updateNodeProperty(selectedImageNode.id, 'ImageRectSize', `Vector2.new(${e.target.value || "0, 0"})`)}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 italic">Tip: Use these for spritesheets or specific icon crops.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 flex flex-col">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Roblox Catalog Search</h4>
            <div className="relative">
              <input
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-[#00f5d4] outline-none"
                placeholder="Search for icons, textures..."
                value={imageSearchQuery}
                onChange={e => setImageSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleImageSearch(imageSearchQuery)}
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            </div>

            <div className="flex-1 bg-black/20 rounded-xl border border-gray-800 p-2 overflow-y-auto scrollbar-hide min-h-[200px]">
              {isSearchingImages ? (
                <div className="h-full flex items-center justify-center">
                  <Loader className="w-6 h-6 animate-spin text-[#00f5d4]" />
                </div>
              ) : imageSearchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                  <Search className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">Search the Roblox catalog to find assets for your UI.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {imageSearchResults.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => selectedImageNode && applyImageId(selectedImageNode.id, asset.id)}
                      className="group relative aspect-square bg-gray-900 rounded-lg border border-gray-800 hover:border-[#00f5d4] overflow-hidden transition-all"
                      title={`${asset.name} by ${asset.creatorName || 'Unknown'}`}
                    >
                      <img 
                        src={asset.thumbnailUrl || robloxThumbnailUrl({ assetId: asset.id, size: "150x150" })} 
                        alt={asset.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          if (asset.thumbnailUrl) {
                            e.target.src = robloxThumbnailUrl({ assetId: asset.id, size: "150x150" });
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Plus className="w-5 h-5 text-[#00f5d4]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
