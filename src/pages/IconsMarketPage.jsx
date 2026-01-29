import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Loader2, 
  Grid, 
  X,
  Info,
  ShieldCheck,
  ArrowRight,
  Palette,
  Box,
  Plus,
  FolderPlus,
  Folder,
  DownloadCloud,
  Trash2,
  Upload,
  Sparkles
} from "lucide-react";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import { exportIcon } from "../lib/uiBuilderApi";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import ProNudgeModal from "../components/ProNudgeModal";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");

export default function IconsMarketPage() {
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [icons, setIcons] = useState([]);
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("");
  const [category, setCategory] = useState("");
  const [isPro, setIsPro] = useState(null);
  const [lastDocId, setLastDocId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [copied, setCopied] = useState(false);
  const { entitlements } = useBilling();
  const isPremium = entitlements?.includes("pro") || entitlements?.includes("team");
  const [showProNudge, setShowProNudge] = useState(false);
  const [collections, setCollections] = useState([]);
  const [activeMarketTab, setActiveMarketTab] = useState("browse"); // "browse" or "collections"
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  
  const observer = useRef();
  const fetchIcons = useCallback(async (loadMore = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (style) params.append("style", style);
      if (category) params.append("category", category);
      if (isPro !== null) params.append("isPro", isPro);
      if (loadMore && lastDocId) params.append("lastDocId", lastDocId);
      
      const res = await fetch(`${API_BASE}/api/icons/market?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      
      const newIcons = Array.isArray(data.icons) ? data.icons : [];

      if (loadMore) {
        setIcons(prev => [...prev, ...newIcons]);
      } else {
        setIcons(newIcons);
      }
      
      setLastDocId(data.lastDocId);
      setHasMore(data.hasMore);
    } catch (e) {
      console.error("Failed to fetch icons", e);
    } finally {
      setLoading(false);
    }
  }, [search, style, category, isPro, lastDocId]);

  const lastIconElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchIcons(true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchIcons]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/signin");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/collections`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.collections) setCollections(data.collections);
      } catch (e) {
        console.error("Failed to fetch collections", e);
      }
    };

    if (!user) return;
    fetchTokens();
    fetchIcons();
    fetchCollections();
  }, [user, search, style, category, isPro, fetchIcons]);

  const fetchCollections = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/collections`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.collections) setCollections(data.collections);
    } catch (e) {
      console.error("Failed to fetch collections", e);
    }
  };

  const fetchTokens = async () => {
    setTokenLoading(true);
    try {
      const data = await getEntitlements();
      setTokenInfo(data);
      const premium = data.entitlements?.includes("pro") || data.entitlements?.includes("team");
      setIsPremium(premium);
    } catch (e) {
      console.error(e);
    } finally {
      setTokenLoading(false);
    }
  };


  const handleDownload = async (icon) => {
    try {
      // Use backend proxy to bypass CORS
      const proxyUrl = `${API_BASE}/api/tools/download-proxy?url=${encodeURIComponent(icon.imageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${icon.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const handlePostToRoblox = async (icon) => {
    if (!isPremium) {
      setShowProNudge(true);
      return;
    }

    try {
      const token = await user.getIdToken();
      const data = await exportIcon({
        token,
        iconId: icon.id
      });

      if (data && data.combined) {
        navigator.clipboard.writeText(data.combined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error("Failed to export icon", e);
    }
  };

  const handleGenerateVariation = (icon) => {
    navigate("/tools/icon-generator", { state: { referenceImage: icon.imageUrl, subject: icon.name } });
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCollectionName })
      });
      if (res.ok) {
        fetchCollections();
        setNewCollectionName("");
        setShowCreateCollection(false);
      }
    } catch (e) {
      console.error("Failed to create collection", e);
    }
  };

  const handleAddToCollection = async (collectionId, iconId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/collections/${collectionId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ iconId })
      });
      if (res.ok) {
        fetchCollections();
      }
    } catch (e) {
      console.error("Failed to add to collection", e);
    }
  };

  const handleDeleteCollection = async (id) => {
    if (!window.confirm("Delete this collection?")) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/collections/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchCollections();
    } catch (e) {
      console.error("Failed to delete collection", e);
    }
  };

  const handleDownloadCollection = async (collection) => {
    if (!collection.icons || collection.icons.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(collection.name);
      
      for (const icon of collection.icons) {
        try {
          const response = await fetch(icon.imageUrl);
          const blob = await response.blob();
          folder.file(`${icon.name.replace(/\s+/g, '_')}.png`, blob);
        } catch (err) {
          console.error(`Failed to download icon ${icon.name}:`, err);
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collection.name.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Collection download failed", e);
    } finally {
      setLoading(false);
    }
  };

  const styles = ["3D Rendered", "Flat Vector", "Cartoonish", "Outline"];
  const categories = ["Egg", "UI Element", "UI Component"];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#9b5de5]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#00f5d4]/5 blur-[120px]" />
      </div>

      <NexusRBXHeader 
        navigate={navigate} 
        user={user} 
        tokenInfo={tokenInfo} 
        tokenLoading={tokenLoading} 
      />

      <main className="flex-grow flex relative z-10 mt-16">
        <aside className="w-72 border-r border-white/10 bg-black/20 backdrop-blur-xl p-8 hidden lg:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="flex border-b border-white/10 mb-8">
            <button 
              onClick={() => setActiveMarketTab("browse")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeMarketTab === "browse" ? 'text-[#00f5d4] border-b-2 border-[#00f5d4]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Browse
            </button>
            <button 
              onClick={() => setActiveMarketTab("collections")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeMarketTab === "collections" ? 'text-[#9b5de5] border-b-2 border-[#9b5de5]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Collections
            </button>
          </div>

          <div className="space-y-8">
            {activeMarketTab === "browse" ? (
              <>
                <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Filter className="h-3 w-3" /> Access
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: "All Icons", value: null },
                      { label: "Free Only", value: false },
                      { label: "Pro Only", value: true },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setIsPro(opt.value)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${isPro === opt.value ? 'bg-[#9b5de5]/20 text-[#9b5de5]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Palette className="h-3 w-3" /> Visual Style
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setStyle("")}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${style === "" ? 'bg-[#00f5d4]/20 text-[#00f5d4]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                      All Styles
                    </button>
                    {styles.map(s => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${style === s ? 'bg-[#00f5d4]/20 text-[#00f5d4]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Box className="h-3 w-3" /> Category
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCategory("")}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${category === "" ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                      All Categories
                    </button>
                    {categories.map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${category === c ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <button 
                  onClick={() => setShowCreateCollection(true)}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <Plus className="h-4 w-4" /> Create Collection
                </button>

                <div className="space-y-2">
                  {collections.map(c => (
                    <div
                      key={c.id}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#9b5de5]/30 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-gray-300 group-hover:text-white block truncate">{c.name}</span>
                        <span className="text-[10px] font-bold text-gray-500">{c.iconIds?.length || 0} items</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleDownloadCollection(c)}
                          disabled={!c.iconIds || c.iconIds.length === 0}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-[#00f5d4] transition-all disabled:opacity-30"
                          title="Download All (ZIP)"
                        >
                          <DownloadCloud className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCollection(c.id)}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all"
                          title="Delete Collection"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-grow p-8 lg:p-12 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="max-w-7xl mx-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[#00f5d4]/20">
                    <Grid className="h-6 w-6 text-[#00f5d4]" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tight">Icons Market</h1>
                </div>
                <p className="text-gray-400 max-w-xl">
                  Browse thousands of professional, game-ready icons. One-click export to Roblox Studio.
                </p>
              </div>

              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons (e.g. 'dragon', 'sword')..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-[#9b5de5] outline-none transition-all backdrop-blur-xl shadow-2xl"
                />
              </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {icons.map((icon, index) => (
                <motion.div
                  key={icon.id}
                  ref={index === icons.length - 1 ? lastIconElementRef : null}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.02 }}
                  onClick={() => navigate(`/icons/${icon.id}`)}
                  className="group relative bg-white/[0.02] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.05] hover:border-[#9b5de5]/50 transition-all cursor-pointer overflow-hidden"
                >
                  {icon.isPro && !isPremium && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="px-2 py-0.5 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[8px] font-black uppercase shadow-lg">
                        Pro
                      </div>
                    </div>
                  )}
                  
                  <div className="aspect-square rounded-xl bg-black/40 border border-white/5 mb-4 flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={icon.imageUrl} 
                      alt={icon.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1">
                        Quick View <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="text-xs font-bold text-gray-300 truncate">{icon.name}</h4>
                  <p className="text-[10px] text-gray-500 font-medium">{icon.style}</p>
                </motion.div>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-[#9b5de5] animate-spin" />
              </div>
            )}

            {!loading && icons.length === 0 && (
              <div className="text-center py-24">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Search className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">No icons found</h3>
                <p className="text-gray-600">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedIcon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIcon(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#121212] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedIcon(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-50"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>

              <div className="w-full md:w-1/2 bg-black/40 p-12 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                <div className="relative group">
                  <div className="absolute -inset-8 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-full blur-3xl opacity-20" />
                  <img 
                    src={selectedIcon.imageUrl} 
                    alt={selectedIcon.name} 
                    className="w-64 h-64 object-contain relative z-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-1/2 p-12 flex flex-col">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black">{selectedIcon.name}</h2>
                    {selectedIcon.isPro && !isPremium && (
                      <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[10px] font-black uppercase">Pro</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400">{selectedIcon.style}</span>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400">{selectedIcon.category}</span>
                  </div>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <Info className="h-5 w-5 text-[#00f5d4] shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 leading-relaxed">
                        This icon is optimized for Roblox Studio. It features a centered composition and high-contrast lighting for maximum visibility in-game.
                      </p>
                      <p className="text-[10px] text-gray-500 italic">
                        Click "Post to Roblox" to copy a Luau snippet. Paste it into a LocalScript in Studio to instantly preview the icon.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Format</p>
                      <p className="text-sm font-black">PNG</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Resolution</p>
                      <p className="text-sm font-black">512x512</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePostToRoblox(selectedIcon)}
                      className="py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-lg shadow-[#9b5de5]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {selectedIcon.isPro && !isPremium ? <ShieldCheck className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                      {selectedIcon.isPro && !isPremium ? "Unlock" : (copied ? "Copied!" : "Post to Roblox")}
                    </button>
                    
                    <button
                      onClick={() => handleGenerateVariation(selectedIcon)}
                      className="py-4 rounded-2xl bg-[#9b5de5]/10 border border-[#9b5de5]/20 text-[#9b5de5] font-black text-sm hover:bg-[#9b5de5]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-5 w-5" /> Variation
                    </button>
                  </div>

                  {collections.length > 0 && (
                    <div className="relative group/coll">
                      <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                        <FolderPlus className="h-5 w-5" /> Add to Collection
                      </button>
                      <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1A1A1A] border border-white/10 rounded-2xl p-2 shadow-2xl opacity-0 invisible group-hover/coll:opacity-100 group-hover/coll:visible transition-all z-50 max-h-48 overflow-y-auto">
                        {collections.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleAddToCollection(c.id, selectedIcon.id)}
                            className="w-full text-left px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                          >
                            <Folder className="h-3 w-3" /> {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDownload(selectedIcon)}
                      className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="h-5 w-5" /> Download
                    </button>

                    <a 
                      href="https://create.roblox.com/dashboard/creations?activeTab=Decal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4] font-black text-sm hover:bg-[#00f5d4]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="h-5 w-5" /> Get Asset ID
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateCollection && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateCollection(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6">New Collection</h3>
              <input 
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name (e.g. 'My RPG Project')"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-[#9b5de5] outline-none mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreateCollection(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-lg disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NexusRBXFooter />

      <ProNudgeModal 
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason="this premium icon"
      />
    </div>
  );
}
