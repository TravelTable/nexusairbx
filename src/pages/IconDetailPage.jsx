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
} from "lib/icons";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { exportIcon } from "../lib/uiBuilderApi";
import { useBilling } from "../context/BillingContext";
import NexusRBXFooter from "../components/NexusRBXFooter";
import ProNudgeModal from "../components/ProNudgeModal";
import IconMarketCard from "../components/icons/IconMarketCard";
import { BACKEND_URL } from "../config";
import { filterMarketplaceIcons, isMarketplaceEligible } from "../lib/iconMarket";
import NoIndexMeta from "../components/seo/NoIndexMeta";

const API_BASE = BACKEND_URL.replace(/\/+$/, "");

export default function IconDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [icon, setIcon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isPremium } = useBilling();
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
      setRelatedIcons(filterMarketplaceIcons(data.icons || []).filter((i) => i.id !== id));
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
        if (!isMarketplaceEligible(data)) throw new Error("Icon not found");
        setIcon(data);
        fetchRelated(data.category, data.style);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchIcon();
  }, [fetchRelated, id]);


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
      <main className="flex min-h-screen items-center justify-center bg-[var(--ds-bg-canvas)]" aria-busy="true">
        <NoIndexMeta title="Loading Icon | NexusRBX" />
        <Loader2 className="h-12 w-12 animate-spin text-[var(--ds-accent)]" />
        <span className="sr-only">Loading icon details</span>
      </main>
    );
  }

  if (error || !icon) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--ds-bg-canvas)] p-4 text-[var(--ds-text)]">
        <NoIndexMeta title="Icon Not Found | NexusRBX" />
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.035em]">Icon Not Found</h1>
        <button onClick={() => navigate("/icons-market")} className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-[var(--ds-accent)] hover:bg-[var(--ds-fill-hover)]">
          <ArrowLeft className="w-5 h-5" /> Back to Market
        </button>
      </main>
    );
  }

  const bgClasses = {
    dark: "bg-[#1A1A1A]",
    light: "bg-gray-200",
    transparent: "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-gray-800",
    scene: "bg-[url('https://tr.rbxcdn.com/180f60d8652861d4599641327a4396db/420/420/Image/Png')] bg-cover bg-center"
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <NoIndexMeta
        title={`${icon.name} - Roblox Icon | NexusRBX`}
        description={`Download the ${icon.name} icon for your Roblox game. Professional ${icon.style} style ${icon.category} asset. One-click export to Studio.`}
      >
        <meta property="og:title" content={`${icon.name} - Professional Roblox Icon`} />
        <meta property="og:image" content={icon.imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </NoIndexMeta>

      <main className="flex-grow pt-12 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => navigate("/icons-market")}
            className="focus-ring mb-8 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Preview Section */}
            <div className="lg:col-span-7 space-y-8">
              <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] shadow-[var(--ds-shadow-panel)] transition-colors duration-500 ${bgClasses[previewBg]}`}>
                <img 
                  src={icon.imageUrl} 
                  alt={icon.name} 
                  className="w-2/3 h-2/3 object-contain relative z-10 transition-opacity duration-200 hover:opacity-95"
                  style={{ filter: tintColor !== "#ffffff" ? `drop-shadow(0 0 0 ${tintColor})` : undefined, color: tintColor }}
                />
                
                {/* Preview Controls */}
                <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-1.5 shadow-[var(--ds-shadow-overlay)] backdrop-blur-md">
                  {Object.keys(bgClasses).map(bg => (
                    <button
                      key={bg}
                      onClick={() => setPreviewBg(bg)}
                      className={`min-h-11 rounded-lg px-4 py-2 text-[10px] font-semibold capitalize transition-colors ${previewBg === bg ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale Preview */}
              <div className="nexus-page-card p-8">
                <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-[var(--ds-text-muted)]">
                  <Maximize2 className="w-4 h-4" /> Scale Preview
                </h3>
                <div className="flex flex-wrap items-end gap-8">
                  {[256, 128, 64, 32].map(size => (
                    <div key={size} className="flex flex-col items-center gap-3">
                      <div 
                        className="flex items-center justify-center overflow-hidden rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]"
                        style={{ width: size, height: size }}
                      >
                        <img src={icon.imageUrl} alt="" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--ds-text-muted)]">{size}px</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-semibold tracking-[-0.035em]">{icon.name}</h1>
                  {icon.isPro && !isPremium && (
                    <span className="rounded-full border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--ds-accent)]">Pro</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-1.5 text-xs font-semibold text-[var(--ds-text-muted)]">
                    <Palette className="w-3 h-3" /> {icon.style}
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-1.5 text-xs font-semibold text-[var(--ds-text-muted)]">
                    <Box className="w-3 h-3" /> {icon.category}
                  </span>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <div className="nexus-page-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[var(--ds-text-muted)]">ImageColor3 Tint</h3>
                    <input 
                      type="color" 
                      value={tintColor} 
                      onChange={(e) => setTintColor(e.target.value)}
                      className="h-11 w-11 cursor-pointer rounded-lg border border-[var(--ds-border)] bg-transparent"
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
                    Simulate how this icon will look when tinted in Roblox Studio using the ImageColor3 property.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-5 text-center">
                    <p className="mb-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">Format</p>
                    <p className="text-sm font-semibold">PNG</p>
                  </div>
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-5 text-center">
                    <p className="mb-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">Resolution</p>
                    <p className="text-sm font-semibold">512x512</p>
                  </div>
                </div>

                <div className="nexus-page-card flex items-start gap-4 border-[color-mix(in_srgb,var(--ds-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_7%,transparent)] p-6">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ds-info)]" />
                  <p className="text-xs leading-relaxed text-[var(--ds-text-secondary)]">
                    This asset is licensed for use in Roblox experiences. High-contrast lighting and centered composition ensure visibility across all devices.
                  </p>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handlePostToRoblox}
                    className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--ds-accent)] py-5 text-sm font-semibold text-[var(--ds-accent-foreground)] transition-colors hover:bg-[var(--ds-accent-hover)] active:scale-[0.985]"
                  >
                    {icon.isPro && !isPremium ? <ShieldCheck className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                    {icon.isPro && !isPremium ? "Unlock Pro" : (copied ? "Copied Lua!" : "Post to Roblox")}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-5 text-sm font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
                  >
                    <Download className="h-5 w-5" /> Download PNG
                  </button>
                </div>

                <a 
                  href="https://create.roblox.com/dashboard/creations?activeTab=Decal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] py-4 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                >
                  <Upload className="h-4 w-4" /> Upload to Roblox Dashboard
                </a>
              </div>
            </div>
          </div>

          {/* Related Icons */}
          {relatedIcons.length > 0 && (
            <section className="mt-32">
              <h2 className="mb-8 flex items-center gap-3 text-2xl font-semibold">
                <Sparkles className="h-6 w-6 text-[var(--ds-accent)]" /> Related Icons
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {relatedIcons.map((rel) => (
                  <IconMarketCard key={rel.id} icon={rel} isPremium={isPremium} headingLevel={3} />
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
