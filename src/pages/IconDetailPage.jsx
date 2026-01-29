import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  Loader2, 
  Info, 
  ShieldCheck, 
  Sparkles,
  Palette,
  Maximize2,
  Box,
  Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import { exportIcon } from "../lib/uiBuilderApi";
import { useBilling } from "../context/BillingContext";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import ProNudgeModal from "../components/ProNudgeModal";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");

export default function IconDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [icon, setIcon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { entitlements } = useBilling();
  const [isPremium, setIsPremium] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showProNudge, setShowProNudge] = useState(false);
  
  // Preview States
  const [previewBg, setPreviewBg] = useState("dark"); // dark, light, transparent, scene
  const [tintColor, setTintColor] = useState("#ffffff");
  const [relatedIcons, setRelatedIcons] = useState([]);

  const fetchRelated = useCallback(async (category, style) => {
    try {
      const params = new URLSearchParams({ category, style, limit: 6 });
      const res = await fetch(`${API_BASE}/api/icons/market?${params.toString()}`);
      const data = await res.json();
      setRelatedIcons(data.icons?.filter((i) => i.id !== id) || []);
    } catch (e) {
      console.error("Failed to fetch related icons", e);
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchIcon = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/icons/${id}`);
        if (!res.ok) throw new Error("Icon not found");
        const data = await res.json();
        setIcon(data);
        fetchRelated(data.category, data.style);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
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

    fetchIcon();
    fetchTokens();
  }, [fetchRelated, id]);

  useEffect(() => {
    setIsPremium(entitlements?.includes("pro") || entitlements?.includes("team"));
  }, [entitlements]);


  const handleDownload = async () => {
    if (icon.isPro && !isPremium) {
      setShowProNudge(true);
      return;
    }
    try {
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

  const handlePostToRoblox = async () => {
    if (icon.isPro && !isPremium) {
      setShowProNudge(true);
      return;
    }

    try {
      const token = await user.getIdToken();
      const data = await exportIcon({
        token,
        iconId: icon.id,
        tintColor
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#9b5de5] animate-spin" />
      </div>
    );
  }

  if (error || !icon) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl font-black mb-4">Icon Not Found</h1>
        <button onClick={() => navigate("/icons-market")} className="flex items-center gap-2 text-[#00f5d4] font-bold">
          <ArrowLeft className="w-5 h-5" /> Back to Market
        </button>
      </div>
    );
  }

  const bgClasses = {
    dark: "bg-[#1A1A1A]",
    light: "bg-gray-200",
    transparent: "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-gray-800",
    scene: "bg-[url('https://tr.rbxcdn.com/180f60d8652861d4599641327a4396db/420/420/Image/Png')] bg-cover bg-center"
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative overflow-x-hidden">
      <Helmet>
        <title>{`${icon.name} - Roblox Icon | NexusRBX`}</title>
        <meta name="description" content={`Download the ${icon.name} icon for your Roblox game. Professional ${icon.style} style ${icon.category} asset. One-click export to Studio.`} />
        <meta property="og:title" content={`${icon.name} - Professional Roblox Icon`} />
        <meta property="og:image" content={icon.imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <NexusRBXHeader navigate={navigate} user={user} tokenInfo={tokenInfo} tokenLoading={tokenLoading} />

      <main className="flex-grow pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => navigate("/icons-market")}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Preview Section */}
            <div className="lg:col-span-7 space-y-8">
              <div className={`relative aspect-square rounded-[40px] overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center transition-colors duration-500 ${bgClasses[previewBg]}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <img 
                  src={icon.imageUrl} 
                  alt={icon.name} 
                  className="w-2/3 h-2/3 object-contain relative z-10 transition-transform duration-500 hover:scale-110"
                  style={{ filter: tintColor !== "#ffffff" ? `drop-shadow(0 0 0 ${tintColor})` : undefined, color: tintColor }}
                />
                
                {/* Preview Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl z-20">
                  {Object.keys(bgClasses).map(bg => (
                    <button
                      key={bg}
                      onClick={() => setPreviewBg(bg)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${previewBg === bg ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale Preview */}
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" /> Scale Preview
                </h3>
                <div className="flex flex-wrap items-end gap-8">
                  {[256, 128, 64, 32].map(size => (
                    <div key={size} className="flex flex-col items-center gap-3">
                      <div 
                        className="bg-black/40 border border-white/5 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ width: size, height: size }}
                      >
                        <img src={icon.imageUrl} alt="" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{size}px</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-black tracking-tight">{icon.name}</h1>
                  {icon.isPro && !isPremium && (
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[10px] font-black uppercase shadow-lg">Pro</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Palette className="w-3 h-3" /> {icon.style}
                  </span>
                  <span className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Box className="w-3 h-3" /> {icon.category}
                  </span>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">ImageColor3 Tint</h3>
                    <input 
                      type="color" 
                      value={tintColor} 
                      onChange={(e) => setTintColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Simulate how this icon will look when tinted in Roblox Studio using the ImageColor3 property.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Format</p>
                    <p className="text-sm font-black">PNG</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Resolution</p>
                    <p className="text-sm font-black">512x512</p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#00f5d4]/5 border border-[#00f5d4]/20 flex items-start gap-4">
                  <Info className="w-5 h-5 text-[#00f5d4] shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    This asset is licensed for use in Roblox experiences. High-contrast lighting and centered composition ensure visibility across all devices.
                  </p>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handlePostToRoblox}
                    className="py-5 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-sm shadow-xl shadow-[#9b5de5]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {icon.isPro && !isPremium ? <ShieldCheck className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                    {icon.isPro && !isPremium ? "Unlock Pro" : (copied ? "Copied Lua!" : "Post to Roblox")}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" /> Download PNG
                  </button>
                </div>

                <a 
                  href="https://create.roblox.com/dashboard/creations?activeTab=Decal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-500 font-bold text-xs hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" /> Upload to Roblox Dashboard
                </a>
              </div>
            </div>
          </div>

          {/* Related Icons */}
          {relatedIcons.length > 0 && (
            <section className="mt-32">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#9b5de5]" /> Related Icons
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {relatedIcons.map(rel => (
                  <motion.div
                    key={rel.id}
                    whileHover={{ y: -5 }}
                    onClick={() => navigate(`/icons/${rel.id}`)}
                    className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-[#9b5de5]/50 transition-all"
                  >
                    <div className="aspect-square rounded-xl bg-black/40 mb-3 flex items-center justify-center overflow-hidden">
                      <img src={rel.imageUrl} alt={rel.name} className="w-full h-full object-contain" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-400 truncate">{rel.name}</h4>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <ProNudgeModal 
        isOpen={showProNudge} 
        onClose={() => setShowProNudge(false)} 
        reason={icon.name}
      />

      <NexusRBXFooter />
    </div>
  );
}
