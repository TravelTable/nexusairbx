import React, { useMemo, useState, useEffect, useCallback } from "react";
import { X, Download, Copy, Check, Loader, Search, Image as ImageIcon, AlertCircle, ExternalLink, Plus, Upload, Package, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import LuaPreviewRenderer from "../preview/LuaPreviewRenderer";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import luaLang from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { aiGenerateFunctionality, robloxCatalogSearch, robloxThumbnailUrl } from "../lib/uiBuilderApi";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";
import { useBilling } from "../context/BillingContext";
import PreviewTab from "./UiPreview/PreviewTab";
import CodeTab from "./UiPreview/CodeTab";
import FunctionalityTab from "./UiPreview/FunctionalityTab";
import AssetsTab from "./UiPreview/AssetsTab";
import HistoryTab from "./UiPreview/HistoryTab";
import IconWorkflowModal from "./UiPreview/IconWorkflowModal";

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
  const { refresh: refreshBilling } = useBilling();
  const [tab, setTab] = useState("preview"); // "preview" | "code" | "functionality" | "history" | "assets"
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
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

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
      setShowWorkflowModal(false);
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
      refreshBilling();
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

  // Automatically show workflow modal if new UI has temporary icons
  useEffect(() => {
    if (open && uniqueAssets.length > 0) {
      const hasUnfilledIds = uniqueAssets.some(a => !assetIds[a.url]);
      if (hasUnfilledIds) {
        setShowWorkflowModal(true);
      }
    }
  }, [open, uniqueAssets.length]);

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
              onClick={() => setTab("assets")}
              className={`px-3 py-2 rounded text-sm border whitespace-nowrap relative ${
                tab === "assets"
                  ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                  : "border-gray-800 bg-black/20 text-gray-300 hover:bg-black/30"
              }`}
            >
              Icons & Assets
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
          {tab === "preview" && (
            <PreviewTab
              lua={lua}
              lastEvent={lastEvent}
              setLastEvent={setLastEvent}
              imageNodes={imageNodes}
              setTab={setTab}
              refineInput={refineInput}
              setRefineInput={setRefineInput}
              isRefining={isRefining}
              onRefine={onRefine}
            />
          )}
          {tab === "code" && (
            <CodeTab
              lua={lua}
              copySuccess={copySuccess}
              handleCopy={handleCopy}
              onDownload={onDownload}
            />
          )}
          {tab === "functionality" && (
            <FunctionalityTab
              funcPlan={funcPlan}
              funcScripts={funcScripts}
              isGeneratingFunc={isGeneratingFunc}
              funcPrompt={funcPrompt}
              setFuncPrompt={setFuncPrompt}
              handleGenerateFunctionality={handleGenerateFunctionality}
            />
          )}
          {tab === "assets" && (
            <AssetsTab
              uniqueAssets={uniqueAssets}
              handleDownloadAllAssets={handleDownloadAllAssets}
              assetIds={assetIds}
              setAssetIds={setAssetIds}
              isFinalizing={isFinalizing}
              handleFinalizeAssets={handleFinalizeAssets}
            />
          )}
          {tab === "history" && (
            <HistoryTab
              history={history}
              activeId={activeId}
              onSelectHistory={onSelectHistory}
            />
          )}
        </div>
      </div>

      <IconWorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        uniqueAssets={uniqueAssets}
        assetIds={assetIds}
        setAssetIds={setAssetIds}
        onFinalize={handleFinalizeAssets}
        isFinalizing={isFinalizing}
        handleDownloadAllAssets={handleDownloadAllAssets}
      />
    </div>
  );
}
