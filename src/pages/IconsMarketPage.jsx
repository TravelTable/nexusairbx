import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, 
  Filter, 
  Loader2, 
  Grid, 
  Palette,
  Box,
  Plus,
  DownloadCloud,
  Trash2
} from "lib/icons";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import NexusRBXFooter from "../components/NexusRBXFooter";
import { useBilling } from "../context/BillingContext";
import { BACKEND_URL } from "../config";
import { filterMarketplaceIcons } from "../lib/iconMarket";
import IconMarketCard from "../components/icons/IconMarketCard";
import NexusDisplayIcon from "../components/icons/NexusDisplayIcon";
import Modal from "../components/Modal";
import { editorialDisplayClass } from "../components/site/editorialUi";
import "../components/assets/assetPlatform.css";
import "../components/assets/assetLedgerOverrides.css";

const API_BASE = BACKEND_URL.replace(/\/+$/, "");
const MARKET_ACCESS_OPTIONS = [
  { label: "All Icons", value: null },
  { label: "Free Only", value: false },
  { label: "Pro Only", value: true },
];
const MARKET_STYLES = ["3D Rendered", "Flat Vector", "Cartoonish", "Outline"];
const MARKET_CATEGORIES = ["Egg", "UI Element", "UI Component"];
const MARKET_TABS = [
  { label: "Browse", value: "browse" },
  { label: "Collections", value: "collections" },
];
const MARKET_STYLE_OPTIONS = [
  { label: "All Styles", value: "" },
  ...MARKET_STYLES.map((value) => ({ label: value, value })),
];
const MARKET_CATEGORY_OPTIONS = [
  { label: "All Categories", value: "" },
  ...MARKET_CATEGORIES.map((value) => ({ label: value, value })),
];

function MarketTabs({ activeTab, onChange }) {
  return (
    <div className="flex border-b border-[var(--ds-border-subtle)]" aria-label="Creator Store sections">
      {MARKET_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={activeTab === tab.value}
          onClick={() => onChange(tab.value)}
          className={`min-h-11 flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === tab.value ? 'border-b-2 border-[var(--ds-text)] text-[var(--ds-text)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function MarketFilterGroup({ icon: Icon, label, options, value, onChange }) {
  return (
    <section aria-label={label}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--ds-text-muted)] lg:mb-4">
        <Icon className="h-3 w-3" aria-hidden="true" /> {label}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${value === option.value ? 'bg-[var(--ds-fill-active)] text-[var(--ds-text)]' : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function MarketFilterControls({ isPro, setIsPro, style, setStyle, category, setCategory }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-8">
      <MarketFilterGroup
        icon={Filter}
        label="Access"
        options={MARKET_ACCESS_OPTIONS}
        value={isPro}
        onChange={setIsPro}
      />
      <MarketFilterGroup
        icon={Palette}
        label="Visual Style"
        options={MARKET_STYLE_OPTIONS}
        value={style}
        onChange={setStyle}
      />
      <MarketFilterGroup
        icon={Box}
        label="Category"
        options={MARKET_CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
      />
    </div>
  );
}

function MarketCollections({ collections, onCreate, onDownload, onDelete }) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onCreate}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] py-3 text-xs font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Create Collection
      </button>

      <div className="space-y-2">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="group flex w-full items-center justify-between rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-4 py-3 transition-colors hover:border-[var(--ds-border-strong)]"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text)]">{collection.name}</span>
              <span className="text-xs font-semibold text-[var(--ds-text-muted)]">{collection.iconIds?.length || 0} items</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDownload(collection)}
                disabled={!collection.iconIds || collection.iconIds.length === 0}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:opacity-30"
                aria-label={`Download ${collection.name} as ZIP`}
              >
                <DownloadCloud className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(collection.id)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-danger)]"
                aria-label={`Delete ${collection.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { isPremium } = useBilling();
  const [collections, setCollections] = useState([]);
  const [activeMarketTab, setActiveMarketTab] = useState("browse"); // "browse" or "collections"
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  
  const observer = useRef();
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

  return (
    <div className="creator-store-page relative flex min-h-screen flex-col bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <main className="relative z-10 flex flex-grow items-stretch">
        <aside className="hidden w-72 shrink-0 bg-[var(--ds-bg-sidebar)] p-8 lg:block">
          <div className="mb-8"><MarketTabs activeTab={activeMarketTab} onChange={setActiveMarketTab} /></div>

          <div>
            {activeMarketTab === "browse" ? (
              <MarketFilterControls
                isPro={isPro}
                setIsPro={setIsPro}
                style={style}
                setStyle={setStyle}
                category={category}
                setCategory={setCategory}
              />
            ) : (
              <MarketCollections
                collections={collections}
                onCreate={() => setShowCreateCollection(true)}
                onDownload={handleDownloadCollection}
                onDelete={handleDeleteCollection}
              />
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-grow px-4 py-12 sm:px-8 lg:px-14 lg:py-16">
          <div className="max-w-7xl mx-auto">
            <header className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end lg:mb-20">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Grid className="h-6 w-6 text-[var(--ds-text-muted)]" aria-hidden="true" />
                  <h1 className={`${editorialDisplayClass} text-5xl`}>Creator Store</h1>
                </div>
                <p className="max-w-xl text-[var(--ds-text-muted)]">
                  Browse curated, game-ready icons, upload them to Roblox, and copy an editable Studio snippet.
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
                  className="min-h-12 w-full rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-1)] py-3 pl-12 pr-5 text-sm outline-none placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-accent-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                />
              </div>
            </header>

            <div className="mb-8 space-y-4 lg:hidden">
              <MarketTabs activeTab={activeMarketTab} onChange={setActiveMarketTab} />
              {activeMarketTab === "browse" ? (
                <details className="group rounded-[14px] bg-[var(--ds-surface-1)]">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--ds-text)] focus-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-[var(--ds-text-muted)]" aria-hidden="true" />
                      Filter icons
                    </span>
                    <span className="text-xs text-[var(--ds-text-muted)]">
                      {[isPro !== null, Boolean(style), Boolean(category)].filter(Boolean).length || "All"}
                    </span>
                  </summary>
                  <div className="border-t border-[var(--ds-border-subtle)] p-4">
                    <MarketFilterControls
                      isPro={isPro}
                      setIsPro={setIsPro}
                      style={style}
                      setStyle={setStyle}
                      category={category}
                      setCategory={setCategory}
                    />
                  </div>
                </details>
              ) : (
                <MarketCollections
                  collections={collections}
                  onCreate={() => setShowCreateCollection(true)}
                  onDownload={handleDownloadCollection}
                  onDelete={handleDeleteCollection}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
              <div className="py-28 text-center">
                <NexusDisplayIcon name="ask" className="mx-auto mb-5 h-20 w-20" size={80} />
                <h3 className="text-xl font-semibold text-[var(--ds-text-secondary)]">No icons found</h3>
                <p className="text-[var(--ds-text-muted)]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCreateCollection && (
        <Modal
          isOpen
          title="New Collection"
          onClose={() => setShowCreateCollection(false)}
          panelClassName="max-w-md p-8"
          overlayClassName="z-[110] bg-[color-mix(in_srgb,var(--ds-bg-canvas)_82%,transparent)] p-4"
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
                  className="min-h-11 flex-1 rounded-[10px] bg-[var(--ds-text)] py-3 text-sm font-semibold text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
        </Modal>
      )}

      <NexusRBXFooter />

    </div>
  );
}
