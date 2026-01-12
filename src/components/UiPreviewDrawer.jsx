import React, { useMemo, useState, useEffect, useCallback } from "react";
import { X, Download, Copy, Check, Loader, Search, Image as ImageIcon, AlertCircle, ExternalLink, Plus, Upload, Package, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import LuaPreviewRenderer from "../preview/LuaPreviewRenderer";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import luaLang from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { aiGenerateFunctionality, robloxCatalogSearch, robloxThumbnailUrl } from "../lib/uiBuilderApi";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";

// Register lua highlighting
SyntaxHighlighter.registerLanguage("lua", luaLang);

export default function UiPreviewDrawer({
  open,
  onClose,
  lua,
  prompt,
  onDownload,
  history = [],
  activeId = null,
  onSelectHistory,
  user,
  settings,
  onRefine,
  onUpdateLua,
}) {
  const [tab, setTab] = useState("preview"); // "preview" | "code" | "functionality" | "history" | "images" | "assets"
  const [lastEvent, setLastEvent] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  
  // Functionality state
  const [funcPrompt, setFuncPrompt] = useState("");
  const [funcPlan, setFuncPlan] = useState("");
  const [funcScripts, setFuncScripts] = useState([]);
  const [isGeneratingFunc, setIsGeneratingFunc] = useState(false);

  // Image Assistant state
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [selectedImageNode, setSelectedImageNode] = useState(null);

  const manifest = useMemo(() => extractUiManifestFromLua(lua), [lua]);
  const imageNodes = useMemo(() => {
    if (!manifest?.items) return [];
    return manifest.items.filter(item => 
      item.type === "ImageLabel" || item.type === "ImageButton"
    );
  }, [manifest]);

  // Asset Management State
  const [assetIds, setAssetIds] = useState({}); // { [tempUrl]: robloxId }
  const [isFinalizing, setIsFinalizing] = useState(false);

  const uniqueAssets = useMemo(() => {
    const assets = new Map();
    imageNodes.forEach(node => {
      if (node.imageId && node.imageId.startsWith("http")) {
        assets.set(node.imageId, {
          url: node.imageId,
          name: node.name || "Icon",
          nodes: [...(assets.get(node.imageId)?.nodes || []), node.id]
        });
      }
    });
    return Array.from(assets.values());
  }, [imageNodes]);

  const handleDownloadAllAssets = async () => {
    if (uniqueAssets.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("ui_assets");
    
    const promises = uniqueAssets.map(async (asset, index) => {
      try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        const fileName = `${asset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${index}.png`;
        folder.file(fileName, blob);
      } catch (e) {
        console.error("Failed to download asset:", asset.url, e);
      }
    });

    await Promise.all(promises);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus_ui_assets.zip";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFinalizeAssets = () => {
    if (!lua) return;
    setIsFinalizing(true);
    
    let newLua = lua;
    let replacedCount = 0;

    Object.entries(assetIds).forEach(([tempUrl, robloxId]) => {
      if (robloxId && robloxId.trim()) {
        const cleanId = robloxId.replace(/\D/g, "");
        if (cleanId) {
          const rbxAssetId = `rbxassetid://${cleanId}`;
          // Replace in Lua code (both in the Instance properties and the JSON manifest)
          // We use a global regex to replace all occurrences of the temp URL
          const escapedUrl = tempUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newLua = newLua.replace(new RegExp(escapedUrl, 'g'), rbxAssetId);
          replacedCount++;
        }
      }
    });

    if (replacedCount > 0) {
      onUpdateLua(newLua);
      setTab("preview");
      // notify is not available here, but we can use a local state or just rely on the preview update
    }
    setIsFinalizing(false);
  };

  const handleGenerateFunctionality = async () => {
    if (!funcPrompt.trim() || !user) return;
    setIsGeneratingFunc(true);
    try {
      const token = await user.getIdToken();
      const data = await aiGenerateFunctionality({
        token,
        lua,
        prompt: funcPrompt,
        gameSpec: settings?.gameSpec || ""
      });
      setFuncPlan(data.plan);
      setFuncScripts(data.scripts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFunc(false);
    }
  };

  const handleImageSearch = async (query) => {
    if (!query.trim()) return;
    setIsSearchingImages(true);
    try {
      const response = await robloxCatalogSearch({ keyword: query, limit: 12 });
      // Backend now returns both 'results' and 'data' for safety
      setImageSearchResults(response?.results || response?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const updateNodeProperty = (nodeId, property, value) => {
    if (!lua || !nodeId) return;
    
    const lines = lua.split('\n');
    let inTargetNode = false;
    let inManifest = false;
    
    const newLines = lines.map(line => {
      // Handle Lua Instance part
      if (line.includes(`nodes["${nodeId}"]`)) inTargetNode = true;
      if (inTargetNode && line.includes(`node.${property} =`)) {
        inTargetNode = false;
        const formattedValue = typeof value === 'string' ? `"${value}"` : value;
        return line.replace(new RegExp(`node\\.${property}\\s*=\\s*.*`), `node.${property} = ${formattedValue}`);
      }

      // Handle Manifest JSON part
      if (line.includes(`"id": "${nodeId}"`)) inManifest = true;
      const jsonProp = property.charAt(0).toLowerCase() + property.slice(1);
      if (inManifest && line.includes(`"${jsonProp}":`)) {
        inManifest = false;
        const formattedValue = typeof value === 'string' ? `"${value}"` : value;
        return line.replace(new RegExp(`"${jsonProp}":\\s*.*`), `"${jsonProp}": ${formattedValue},`);
      }
      return line;
    });

    onUpdateLua(newLines.join('\n'));
  };

  const applyImageId = async (nodeId, assetId) => {
    // Roblox Decal IDs are often 1 digit away from the actual Image ID.
    // The Toolbox API returns the AssetId which usually works directly.
    updateNodeProperty(nodeId, 'Image', `rbxassetid://${assetId}`);
    console.log(`Applied Asset ID: ${assetId} to node: ${nodeId}`);
  };
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lua);
      setCopySuccess(true);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = lua;
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
    }
  };

  const activeTitle = useMemo(() => {
    const p = String(prompt || "").trim();
    return p ? p.slice(0, 60) + (p.length > 60 ? "..." : "") : "UI Preview";
  }, [prompt]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[85vw] max-w-[1350px] bg-[#0b1220] border-l border-gray-800 shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-3 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-semibold">UI Preview</div>
            <div className="text-xs text-gray-400 truncate">{activeTitle}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-100 inline-flex items-center gap-1"
              onClick={handleCopy}
              disabled={!lua}
              title="Copy Lua Code"
            >
              {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? "Copied" : "Copy"}
            </button>

            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-100 inline-flex items-center gap-1"
              onClick={onDownload}
              disabled={!lua}
              title="Download Lua"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              type="button"
              className="p-2 rounded hover:bg-gray-800 text-gray-200"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-3 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap ${
                tab === "preview"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setTab("code")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap ${
                tab === "code"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setTab("functionality")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap ${
                tab === "functionality"
                  ? "border-[#f15bb5] bg-[#f15bb5]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Functionality
            </button>
            <button
              type="button"
              onClick={() => setTab("images")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap relative ${
                tab === "images"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Images
              {imageNodes.some(n => !n.imageId || n.imageId.includes('//0')) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("assets")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap relative ${
                tab === "assets"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Assets
              {uniqueAssets.length > 0 && !uniqueAssets.every(a => assetIds[a.url]) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00f5d4] rounded-full animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap ${
                tab === "history"
                  ? "border-[#9b5de5] bg-[#9b5de5]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              History
            </button>
          </div>
        </div>

        <div className="p-3 h-[calc(100vh-128px)] overflow-hidden">
          {tab === "preview" ? (
            <div className="h-full flex flex-col gap-3">
              <div className="text-xs text-gray-400 border border-gray-800 rounded-lg p-2 bg-black/20 flex items-center justify-between">
                <div>
                  <span className="text-gray-300 font-semibold">Test Log:</span>{" "}
                  {lastEvent
                    ? `${lastEvent.type} -> ${lastEvent.label || lastEvent.id || "item"}`
                    : "Click a button in the preview to test interactions."}
                </div>
                {imageNodes.some(n => !n.imageId || n.imageId.includes('//0')) && (
                  <button 
                    onClick={() => setTab("images")}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider animate-pulse"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Missing Image IDs
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 border border-gray-800 rounded-lg overflow-hidden bg-black/20 relative group">
                <LuaPreviewRenderer
                  lua={lua}
                  interactive
                  onAction={(evt) => setLastEvent(evt)}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl">
                    <div className={`w-2 h-2 rounded-full ${lua ? 'bg-[#00f5d4] animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                      {lua ? "Manifest Active" : "No Manifest"}
                    </span>
                  </div>
                </div>

                {!lua && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b1220]/90 backdrop-blur-md text-gray-400 text-sm gap-3">
                    <Loader className="w-6 h-6 animate-spin text-[#9b5de5]" />
                    <span className="font-medium tracking-wide">Waiting for Lua Engine...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <input
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00f5d4] outline-none disabled:opacity-50"
                  placeholder="Refine this UI (e.g. 'Make it more blue', 'Add a close button')"
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !isRefining && onRefine(refineInput)}
                  disabled={isRefining}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-[#00f5d4] text-black font-bold text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                  onClick={() => onRefine(refineInput)}
                  disabled={!refineInput.trim() || isRefining}
                >
                  {isRefining ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {isRefining ? "Refining..." : "Refine"}
                </button>
              </div>

              <div className="text-[11px] text-gray-500">
                Note: This previews the UI manifest inside the Lua and simulates interactions.
                Full gameplay logic should be tested in Roblox Studio.
              </div>
            </div>
          ) : tab === "functionality" ? (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                  {funcPlan && (
                    <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
                      <h4 className="text-[#f15bb5] font-bold mb-2 uppercase text-xs tracking-widest">Implementation Plan</h4>
                      <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{funcPlan}</div>
                    </div>
                  )}
                  {funcScripts.length === 0 && !isGeneratingFunc && !funcPlan && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
                      <div className="p-4 rounded-full bg-[#f15bb5]/10 text-[#f15bb5]">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Functionality Builder</h3>
                      <p className="text-gray-400 max-w-xs text-sm">
                        Describe the logic you need (e.g. "Handle buying items", "Open/Close logic") and Nexus will generate the scripts.
                      </p>
                    </div>
                  )}
                  {funcScripts.map((s, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-200">{s.name}</span>
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-[#f15bb5] font-bold uppercase tracking-wider border border-[#f15bb5]/20">
                            {s.location || "StarterPlayerScripts"}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(s.code);
                            // Could add a temporary "Copied!" state here
                          }}
                          className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title="Copy Script"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="bg-[#181825] rounded-xl border border-gray-800 overflow-hidden">
                        <SyntaxHighlighter
                          language="lua"
                          style={atomOneDark}
                          customStyle={{ background: "transparent", padding: "1rem", fontSize: "12px" }}
                        >
                          {s.code}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  <input
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[#f15bb5] outline-none disabled:opacity-50"
                    placeholder="What functionality do you need? (e.g. 'Handle buying items', 'Open/Close logic')"
                    value={funcPrompt}
                    onChange={e => setFuncPrompt(e.target.value)}
                    disabled={isGeneratingFunc}
                    onKeyDown={e => e.key === "Enter" && handleGenerateFunctionality()}
                  />
                  <button
                    className="px-4 py-2 rounded-lg bg-[#f15bb5] text-white font-bold text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    onClick={handleGenerateFunctionality}
                    disabled={isGeneratingFunc || !funcPrompt.trim()}
                  >
                    {isGeneratingFunc ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    {isGeneratingFunc ? "Generating..." : "Generate Scripts"}
                  </button>
                </div>
              </div>
            </div>
          ) : tab === "images" ? (
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
          ) : tab === "assets" ? (
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
          ) : tab === "code" ? (
            <div className="h-full flex flex-col gap-3">
              <div className="flex-1 min-h-0 border border-gray-800 rounded-lg overflow-auto bg-[#181825]">
                <SyntaxHighlighter
                  language="lua"
                  style={atomOneDark}
                  customStyle={{
                    background: "transparent",
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                  showLineNumbers
                  wrapLongLines
                >
                  {lua || "-- No code generated yet"}
                </SyntaxHighlighter>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-[#00f5d4] text-black font-bold text-sm hover:scale-[1.02] transition-transform"
                  onClick={handleCopy}
                >
                  {copySuccess ? "Copied!" : "Copy Code"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
                  onClick={onDownload}
                >
                  Download .lua
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              <div className="text-xs text-gray-400">Newest first</div>
              <div className="flex-1 overflow-auto space-y-1 pr-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHistory?.(h.id)}
                    className={`w-full text-left px-2 py-2 rounded border ${
                      h.id === activeId
                        ? "border-[#9b5de5] bg-[#9b5de5]/10"
                        : "border-gray-800 hover:bg-gray-900"
                    }`}
                    title={h.prompt}
                  >
                    <div className="text-xs text-gray-200 truncate">
                      {h.prompt || "Untitled"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                    </div>
                  </button>
                ))}
                {history.length === 0 ? (
                  <div className="text-sm text-gray-500 py-6 text-center">
                    No UI generations yet.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
