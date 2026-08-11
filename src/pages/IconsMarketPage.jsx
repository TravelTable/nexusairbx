import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Loader2, 
  Grid, 
  Info,
  ShieldCheck,
  Palette,
  Box,
  Plus,
  FolderPlus,
  Folder,
  DownloadCloud,
  Trash2,
  Upload,
  Sparkles
} from "lib/icons";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { exportIcon } from "../lib/uiBuilderApi";
import NexusRBXFooter from "../components/NexusRBXFooter";
import ProNudgeModal from "../components/ProNudgeModal";
import { useBilling } from "../context/BillingContext";
import { BACKEND_URL } from "../config";
import { filterMarketplaceIcons } from "../lib/iconMarket";
import IconMarketCard from "../components/icons/IconMarketCard";
import Modal from "../components/Modal";

const API_BASE = BACKEND_URL.replace(/\/+$/, "");

export default function IconsMarketPage() {
  const [user, setUser] = useState(null);
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
  const { isPremium } = useBilling();
  const [showProNudge, setShowProNudge] = useState(false);
  const [collections, setCollections] = useState([]);
  const [activeMarketTab, setActiveMarketTab] = useState("browse"); // "browse" or "collections"
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  
  const observer = useRef();
  const collectionMenuRef = useRef(null);
  const collectionMenuTriggerRef = useRef(null);
  const newCollectionInputRef = useRef(null);
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
      
      const newIcons = filterMarketplaceIcons(Array.isArray(data.icons) ? data.icons : []);

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
    fetchIcons();
    fetchCollections();
  }, [user, search, style, category, isPro, fetchIcons]);

  useEffect(() => {
    if (!collectionMenuOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      collectionMenuRef.current?.querySelector("button")?.focus();
    });
    const closeCollectionMenu = ({ restoreFocus = true } = {}) => {
      setCollectionMenuOpen(false);
      if (restoreFocus) window.requestAnimationFrame(() => collectionMenuTriggerRef.current?.focus());
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCollectionMenu();
    };
    const handlePointerDown = (event) => {
      if (collectionMenuRef.current?.contains(event.target) || collectionMenuTriggerRef.current?.contains(event.target)) return;
      closeCollectionMenu({ restoreFocus: false });
    };

    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [collectionMenuOpen]);

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
      setSelectedIcon(null);
      setCollectionMenuOpen(false);
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <main className="flex-grow flex relative z-10">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-72 overflow-y-auto border-r border-[var(--ds-border-subtle)] bg-[var(--ds-bg-sidebar)] p-8 lg:block">
          <div className="mb-8 flex border-b border-[var(--ds-border-subtle)]">
            <button 
              onClick={() => setActiveMarketTab("browse")}
              className={`min-h-11 flex-1 py-2 text-xs font-semibold transition-colors ${activeMarketTab === "browse" ? 'border-b-2 border-[var(--ds-accent)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'}`}
            >
              Browse
            </button>
            <button 
              onClick={() => setActiveMarketTab("collections")}
              className={`min-h-11 flex-1 py-2 text-xs font-semibold transition-colors ${activeMarketTab === "collections" ? 'border-b-2 border-[var(--ds-accent)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'}`}
            >
              Collections
            </button>
          </div>

          <div className="space-y-8">
            {activeMarketTab === "browse" ? (
              <>
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--ds-text-muted)]">
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
                        className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${isPro === opt.value ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--ds-text-muted)]">
                    <Palette className="h-3 w-3" /> Visual Style
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setStyle("")}
                      className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${style === "" ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
                    >
                      All Styles
                    </button>
                    {styles.map(s => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${style === s ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--ds-text-muted)]">
                    <Box className="h-3 w-3" /> Category
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCategory("")}
                      className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${category === "" ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
                    >
                      All Categories
                    </button>
                    {categories.map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${category === c ? 'bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
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
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-3 text-xs font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
                >
                  <Plus className="h-4 w-4" /> Create Collection
                </button>

                <div className="space-y-2">
                  {collections.map(c => (
                    <div
                      key={c.id}
                      className="group flex w-full items-center justify-between rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-4 py-3 transition-colors hover:border-[var(--ds-border-strong)]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text)]">{c.name}</span>
                        <span className="text-[10px] font-semibold text-[var(--ds-text-muted)]">{c.iconIds?.length || 0} items</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleDownloadCollection(c)}
                          disabled={!c.iconIds || c.iconIds.length === 0}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-accent)] disabled:opacity-30"
                          title="Download All (ZIP)"
                        >
                          <DownloadCloud className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCollection(c.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-danger)]"
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
                  <div className="rounded-[10px] bg-[var(--ds-accent-soft)] p-2">
                    <Grid className="h-6 w-6 text-[var(--ds-accent)]" />
                  </div>
                  <h1 className="text-4xl font-semibold tracking-[-0.035em]">Icons Market</h1>
                </div>
                <p className="max-w-xl text-[var(--ds-text-muted)]">
                  Browse curated, game-ready icons. One-click export to Roblox Studio.
                </p>
              </div>

              <div className="relative w-full md:w-96">
                <label htmlFor="icon-market-search" className="sr-only">Search icons</label>
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ds-text-muted)]" aria-hidden="true" />
                <input 
                  id="icon-market-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons (e.g. 'dragon', 'sword')..."
                  className="nexus-input w-full py-4 pl-12 pr-4"
                />
              </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {icons.map((icon, index) => (
                <IconMarketCard
                  key={icon.id}
                  icon={icon}
                  isPremium={isPremium}
                  observeRef={index === icons.length - 1 ? lastIconElementRef : undefined}
                  animationDelay={(index % 20) * 0.02}
                />
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
              </div>
            )}

            {!loading && icons.length === 0 && (
              <div className="text-center py-24">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[14px] bg-[var(--ds-fill-subtle)]">
                  <Search className="h-7 w-7 text-[var(--ds-text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--ds-text-secondary)]">No icons found</h3>
                <p className="text-[var(--ds-text-muted)]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedIcon && (
        <Modal
          isOpen
          title={selectedIcon.name}
          titleClassName="sr-only"
          onClose={() => {
            setCollectionMenuOpen(false);
            setSelectedIcon(null);
          }}
          panelClassName="max-w-4xl overflow-hidden p-0"
          bodyClassName="flex flex-col text-[var(--ds-text)] md:flex-row"
          overlayClassName="z-[100] bg-[color-mix(in_srgb,var(--ds-bg-canvas)_78%,transparent)] p-4 backdrop-blur-md md:p-8"
          closeButtonClassName="right-6 top-6 rounded-full"
          closeOnBackdrop
        >
              <div className="flex w-full items-center justify-center border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] p-12 md:w-1/2 md:border-b-0 md:border-r">
                <div className="relative group">
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
                    <h2 className="text-2xl font-semibold tracking-[-0.02em]">{selectedIcon.name}</h2>
                    {selectedIcon.isPro && !isPremium && (
                      <span className="rounded-md border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ds-accent)]">Pro</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">{selectedIcon.style}</span>
                    <span className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">{selectedIcon.category}</span>
                  </div>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ds-info)]" />
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed text-[var(--ds-text-secondary)]">
                        This icon is optimized for Roblox Studio. It features a centered composition and high-contrast lighting for maximum visibility in-game.
                      </p>
                      <p className="text-[10px] italic text-[var(--ds-text-muted)]">
                        Click "Post to Roblox" to copy a Luau snippet. Paste it into a LocalScript in Studio to instantly preview the icon.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">Format</p>
                      <p className="text-sm font-semibold">PNG</p>
                    </div>
                    <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold text-[var(--ds-text-muted)]">Resolution</p>
                      <p className="text-sm font-semibold">512x512</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePostToRoblox(selectedIcon)}
                      className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--ds-accent)] py-4 text-sm font-semibold text-[var(--ds-accent-foreground)] transition-colors hover:bg-[var(--ds-accent-hover)] active:scale-[0.985]"
                    >
                      {selectedIcon.isPro && !isPremium ? <ShieldCheck className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                      {selectedIcon.isPro && !isPremium ? "Unlock" : (copied ? "Copied!" : "Post to Roblox")}
                    </button>
                    
                    <button
                      onClick={() => handleGenerateVariation(selectedIcon)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--ds-plan)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-plan)_9%,transparent)] py-4 text-sm font-semibold text-[var(--ds-plan)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-plan)_15%,transparent)]"
                    >
                      <Sparkles className="h-5 w-5" /> Variation
                    </button>
                  </div>

                  {collections.length > 0 && (
                    <div className="relative">
                      <button
                        ref={collectionMenuTriggerRef}
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-4 text-sm font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
                        aria-expanded={collectionMenuOpen}
                        aria-controls="icon-collection-popover"
                        onClick={() => setCollectionMenuOpen((open) => !open)}
                      >
                        <FolderPlus className="h-5 w-5" /> Add to Collection
                      </button>
                      {collectionMenuOpen ? (
                        <div
                          id="icon-collection-popover"
                          ref={collectionMenuRef}
                          className="nexus-menu-surface absolute bottom-full left-0 z-50 mb-2 max-h-48 w-full overflow-y-auto p-2"
                          role="group"
                          aria-label="Choose a collection"
                        >
                        {collections.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCollectionMenuOpen(false);
                              collectionMenuTriggerRef.current?.focus();
                              void handleAddToCollection(c.id, selectedIcon.id);
                            }}
                            className="nexus-menu-item flex w-full items-center gap-2 text-left"
                          >
                            <Folder className="h-3 w-3" /> {c.name}
                          </button>
                        ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDownload(selectedIcon)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-4 text-sm font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
                    >
                      <Download className="h-5 w-5" /> Download
                    </button>

                    <a 
                      href="https://create.roblox.com/dashboard/creations?activeTab=Decal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] py-4 text-sm font-semibold text-[var(--ds-accent)] transition-colors hover:bg-[var(--ds-fill-selected)]"
                    >
                      <Upload className="h-5 w-5" /> Get Asset ID
                    </a>
                  </div>
                </div>
              </div>
        </Modal>
      )}

      {showCreateCollection && (
        <Modal
          isOpen
          title="New Collection"
          onClose={() => setShowCreateCollection(false)}
          panelClassName="max-w-md p-8"
          overlayClassName="z-[110] bg-[color-mix(in_srgb,var(--ds-bg-canvas)_72%,transparent)] p-4 backdrop-blur-sm"
          initialFocusRef={newCollectionInputRef}
          closeOnBackdrop
        >
              <input 
                ref={newCollectionInputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name (e.g. 'My RPG Project')"
                className="nexus-input mb-6 w-full p-4"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreateCollection(false)}
                  className="min-h-11 flex-1 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-3 text-sm font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName}
                  className="min-h-11 flex-1 rounded-[10px] bg-[var(--ds-accent)] py-3 text-sm font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
        </Modal>
      )}

      <NexusRBXFooter />

      <ProNudgeModal 
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason="this premium icon"
      />
    </div>
  );
}
