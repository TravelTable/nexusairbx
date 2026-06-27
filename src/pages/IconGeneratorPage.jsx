import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2, 
  Box, 
  Zap,
  Info,
  History,
  Image as ImageIcon,
  AlertCircle,
  ShieldCheck,
  Upload,
  Wand2,
  Layers,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import ProNudgeModal from "../components/ProNudgeModal";
import { Button, Toggle, cx } from "../components/ui";
import { useBilling } from "../context/BillingContext";
import { BACKEND_URL } from "../config";

const API_BASE = BACKEND_URL.replace(/\/+$/, "");

export default function IconGeneratorPage() {
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const { isPremium } = useBilling();
  const [showProNudge, setShowProNudge] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [noBackground, setNoBackground] = useState(false);
  
  const [filters, setFilters] = useState({
    style: "3D Rendered",
    subject: "",
    colorMood: "Vibrant",
    extraDetails: "",
    customStyle: "",
    customMood: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/signin");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/tools/icon-history`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.history) setHistory(data.history);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    };

    if (!user) return;
    fetchTokens();
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/icon-history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const fetchTokens = async () => {
    setTokenLoading(true);
    try {
      const data = await getEntitlements();
      setTokenInfo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleGenerate = async (variationImg = null) => {
    if (!filters.subject && !referenceImage && !variationImg) {
      setError("Please describe what you want the icon to be or upload a reference image.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/generate-icon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...filters,
          style: filters.style === "Custom" ? filters.customStyle : filters.style,
          colorMood: filters.colorMood === "Custom" ? filters.customMood : filters.colorMood,
          noBackground,
          referenceImage: variationImg || referenceImage,
          isVariation: !!variationImg
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedImage(data.imageUrl);
      if (data.entitlements) setTokenInfo(data.entitlements);
      fetchTokens();
      fetchHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!filters.subject) return;
    setEnhancing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/enhance-prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject: filters.subject, style: filters.style })
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setFilters(prev => ({ ...prev, subject: data.enhancedPrompt }));
      }
    } catch (e) {
      console.error("Enhancement failed", e);
    } finally {
      setEnhancing(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexus-icon-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const styles = ["3D Rendered", "Flat Vector", "Cartoonish", "Cyberpunk", "Hand-Drawn", "Minimalist", "Anime", "Oil Painting", "Custom"];
  const moods = ["Vibrant", "Dark & Moody", "Pastel", "Neon", "Monochrome", "Golden Hour", "Glassmorphism", "Custom"];

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

      <main className="flex-grow container mx-auto px-4 py-12 relative z-10 mt-16">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#9b5de5]/20">
                <Sparkles className="h-6 w-6 text-[#9b5de5]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Roblox Icon Generator</h1>
              {!isPremium && (
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[10px] font-black uppercase">Pro Feature</span>
              )}
            </div>
            <p className="text-gray-400 max-w-2xl">
              Create high-end, professional game icons for your UI in seconds. Optimized for Roblox Studio with centered compositions and vibrant lighting.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar: Controls */}
            <div className="lg:col-span-4 space-y-6">
              <section className="nexus-page-card p-6">
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Box className="h-4 w-4" /> Configuration
                </h2>

                <div className="space-y-6">
                  {/* Subject */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="nexus-field-label block">Icon Subject</label>
                      <button 
                        onClick={handleEnhancePrompt}
                        disabled={enhancing || !filters.subject}
                        className="focus-ring flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-[#00f5d4] transition hover:bg-[#00f5d4]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {enhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        Magic Enhance
                      </button>
                    </div>
                    <textarea 
                      value={filters.subject}
                      onChange={(e) => setFilters({...filters, subject: e.target.value})}
                      placeholder="e.g. A legendary flaming dragon sword with blue aura"
                      className="nexus-textarea h-24 p-3"
                    />
                  </div>

                  {/* Reference Image */}
                  <div>
                    <label className="nexus-field-label mb-2 block">Reference Image (Optional)</label>
                    {referenceImage ? (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setReferenceImage(null)}
                          className="nexus-icon-button absolute top-2 right-2 h-8 w-8 border-white/15 bg-black/70 hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-100"
                          aria-label="Remove reference image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="focus-within:ring-2 focus-within:ring-[#00f5d4]/45 flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-black/40 transition hover:border-[#00f5d4]/35 hover:bg-[#00f5d4]/5">
                        <Upload className="h-6 w-6 text-gray-500 mb-2" />
                        <span className="text-[10px] font-bold text-gray-500">Upload Reference</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>

                  {/* Style Grid */}
                  <div>
                    <label className="nexus-field-label mb-2 block">Visual Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {styles.map(s => (
                        <button
                          key={s}
                          onClick={() => setFilters({...filters, style: s})}
                          className={cx("nexus-select-pill", filters.style === s && "nexus-select-pill-active")}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {filters.style === "Custom" && (
                      <input 
                        type="text"
                        value={filters.customStyle}
                        onChange={(e) => setFilters({...filters, customStyle: e.target.value})}
                        placeholder="Enter custom style..."
                        className="nexus-input mt-2 p-2 text-xs"
                      />
                    )}
                  </div>

                  {/* Mood */}
                  <div>
                    <label className="nexus-field-label mb-2 block">Color Mood</label>
                    <div className="grid grid-cols-3 gap-2">
                      {moods.map(m => (
                        <button
                          key={m}
                          onClick={() => setFilters({...filters, colorMood: m})}
                          className={cx("nexus-select-pill", filters.colorMood === m && "nexus-select-pill-active")}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {filters.colorMood === "Custom" && (
                      <input 
                        type="text"
                        value={filters.customMood}
                        onChange={(e) => setFilters({...filters, customMood: e.target.value})}
                        placeholder="Enter custom mood..."
                        className="nexus-input mt-2 p-2 text-xs"
                      />
                    )}
                  </div>

                  {/* Extra Details */}
                  <div>
                    <label className="nexus-field-label mb-2 block">Extra Details (Optional)</label>
                    <input 
                      type="text"
                      value={filters.extraDetails}
                      onChange={(e) => setFilters({...filters, extraDetails: e.target.value})}
                      placeholder="e.g. glowing particles, cinematic fog"
                      className="nexus-input p-3"
                    />
                  </div>

                  {/* No Background Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#00f5d4]" />
                      <span className="text-xs font-bold text-gray-300">Remove Background</span>
                    </div>
                        <Toggle
                          checked={noBackground}
                          onChange={setNoBackground}
                          aria-label="Remove background"
                        />
                  </div>

                  <Button
                    onClick={() => {
                      if (!isPremium) {
                        setShowProNudge(true);
                        return;
                      }
                      handleGenerate();
                    }}
                    disabled={loading}
                    className="w-full py-4 text-sm font-black"
                  >
                    {!isPremium && <ShieldCheck className="h-5 w-5" />}
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isPremium ? <Zap className="h-5 w-5 fill-white" /> : null)}
                    {loading ? "Generating..." : (isPremium ? "Generate Icon" : "Upgrade to Unlock")}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-bold">
                    <Zap className="h-3 w-3" /> Cost: 1,000 Tokens
                  </div>
                </div>
              </section>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </div>

            {/* Main Area: Preview */}
            <div className="lg:col-span-8 space-y-8">
              <div className="nexus-page-card relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden p-8">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <div className="relative">
                        <div className="w-64 h-64 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-12 w-12 text-[#9b5de5] animate-spin" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white mb-1">Neural Processing...</p>
                        <p className="text-sm text-gray-500">DALL-E 3 is crafting your Roblox asset</p>
                      </div>
                    </motion.div>
                  ) : generatedImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-8 w-full"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-[40px] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <img 
                          src={generatedImage} 
                          alt="Generated Roblox Icon" 
                          className="w-80 h-80 rounded-2xl border border-white/10 shadow-2xl relative z-10"
                        />
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 relative z-10">
                        <button 
                          onClick={handleDownload}
                          className="focus-ring flex items-center gap-2 rounded-xl border border-[#00f5d4]/30 bg-[#00f5d4] px-6 py-3 text-sm font-bold text-black shadow-panel transition hover:bg-[#5fffee] active:bg-[#00d9bf]"
                        >
                          <Download className="h-4 w-4" /> Download PNG
                        </button>
                        <a 
                          href="https://create.roblox.com/dashboard/creations?activeTab=Decal" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="focus-ring flex items-center gap-2 rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-6 py-3 text-sm font-bold text-[#00f5d4] transition hover:border-[#00f5d4]/35 hover:bg-[#00f5d4]/15 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" /> Publish to Roblox
                        </a>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedImage);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="focus-ring flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          {copied ? "Copied URL" : "Copy URL"}
                        </button>
                        <button 
                          onClick={() => handleGenerate(generatedImage)}
                          disabled={loading}
                          className="focus-ring flex items-center gap-2 rounded-xl border border-[#9b5de5]/20 bg-[#9b5de5]/10 px-6 py-3 text-sm font-bold text-[#c9b3f7] transition hover:border-[#9b5de5]/35 hover:bg-[#9b5de5]/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Sparkles className="h-4 w-4" /> Create Variation
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3 max-w-md">
                        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-300/70 leading-relaxed">
                          <b>Pro Tip:</b> Use the "Publish to Roblox" link to open the Creator Dashboard. Drag your downloaded PNG there to get your Asset ID for Studio.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center text-center gap-4"
                    >
                      <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                        <ImageIcon className="h-10 w-10 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-400">Ready to Generate</p>
                        <p className="text-sm text-gray-600 max-w-xs">Select your style and subject on the left to begin.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* History */}
              {history.length > 0 && (
                <section>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="h-4 w-4" /> Recent Generations
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {history.map((item, i) => (
                      <button 
                        key={item.id || i} 
                        onClick={() => setGeneratedImage(item.imageUrl)}
                        className={`focus-ring h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${generatedImage === item.imageUrl ? 'border-[#00f5d4]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <NexusRBXFooter />

      <ProNudgeModal 
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason="the AI Icon Generator"
      />
    </div>
  );
}
