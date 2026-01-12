import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  Zap, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2, 
  Grid, 
  List,
  ChevronRight,
  X,
  Info,
  ShieldCheck,
  ArrowRight,
  Layers,
  Palette,
  Box
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";

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
  const [isPremium, setIsPremium] = useState(false);
  
  const observer = useRef();
  const lastIconElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchIcons(true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/signin");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchTokens();
    fetchIcons();
  }, [user, search, style, category, isPro]);

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

  const fetchIcons = async (loadMore = false) => {
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
  };

  const handlePostToRoblox = (icon) => {
    if (icon.isPro && !isPremium) {
      navigate("/subscribe");
      return;
    }
    // For now, we'll just copy the URL or show a snippet
    const luaSnippet = `-- NexusRBX Icon Export\nlocal icon = Instance.new("ImageLabel")\nicon.Image = "${icon.imageUrl}"\nicon.Size = UDim2.fromOffset(100, 100)\nicon.BackgroundTransparency = 1\nicon.Parent = game.Players.LocalPlayer.PlayerGui:FindFirstChildOfClass("ScreenGui")`;
    navigator.clipboard.writeText(luaSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = ["3D Rendered", "Flat Vector", "Cartoonish", "Outline"];
  const categories = ["Egg", "UI Element"];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background Blobs */}
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
        {/* Sidebar Filters */}
        <aside className="w-72 border-r border-white/10 bg-black/20 backdrop-blur-xl p-8 hidden lg:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="space-y-8">
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
          </div>
        </aside>

        {/* Main Content */}
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

            {/* Icons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {icons.map((icon, index) => (
                <motion.div
                  key={icon.id}
                  ref={index === icons.length - 1 ? lastIconElementRef : null}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.02 }}
                  onClick={() => setSelectedIcon(icon)}
                  className="group relative bg-white/[0.02] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.05] hover:border-[#9b5de5]/50 transition-all cursor-pointer overflow-hidden"
                >
                  {icon.isPro && (
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

      {/* Icon Detail Modal */}
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

              {/* Left: Preview */}
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

              {/* Right: Details */}
              <div className="w-full md:w-1/2 p-12 flex flex-col">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black">{selectedIcon.name}</h2>
                    {selectedIcon.isPro && (
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
                  <button
                    onClick={() => handlePostToRoblox(selectedIcon)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-lg shadow-[#9b5de5]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {selectedIcon.isPro && !isPremium ? <ShieldCheck className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                    {selectedIcon.isPro && !isPremium ? "Upgrade to Unlock" : (copied ? "Copied Lua Snippet!" : "Post to Roblox")}
                  </button>
                  
                  <a 
                    href={selectedIcon.imageUrl} 
                    download 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" /> Download PNG
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NexusRBXFooter />
    </div>
  );
}
