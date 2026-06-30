import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Box,
  Check,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Music,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lib/icons";
import { Button, Segmented, cx } from "../../ui";
import {
  getRobloxAsset,
  getRobloxAssetPreview,
  listRobloxAssets,
} from "../../../lib/robloxAssetLibraryApi";

const ASSET_TYPES = ["Model", "Mesh", "Image", "Decal", "Audio", "Animation", "Package", "Plugin"];
const SORTS = [
  { id: "recently_updated", label: "Updated" },
  { id: "recently_created", label: "Created" },
  { id: "name", label: "Name" },
  { id: "asset_type", label: "Type" },
  { id: "recently_used", label: "Used" },
];

function typeIcon(type) {
  if (type === "Image" || type === "Decal") return ImageIcon;
  if (type === "Audio") return Music;
  if (type === "Package") return Package;
  return Box;
}

function formatCreator(asset) {
  const creator = asset?.creator;
  if (!creator) return "Unknown creator";
  return [creator.name, creator.type, creator.id].filter(Boolean).join(" · ");
}

function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">{error.message || "Assets unavailable"}</div>
          {error.recovery ? <div className="mt-1 text-xs text-red-100/75">{error.recovery}</div> : null}
          {error.requestId ? <div className="mt-1 text-[10px] text-red-100/50">Request ID: {error.requestId}</div> : null}
        </div>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="rounded-md border border-red-200/20 px-2 py-1 text-xs font-bold hover:bg-red-200/10">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AssetPreview({ asset, preview, loading, onSelectToggle, selected }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [asset?.assetId]);

  if (!asset) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
        Select an asset to preview details.
      </div>
    );
  }

  const caps = preview?.preview || asset.previewCapabilities || {};
  const renderer = caps.renderer || "thumbnail";
  const imageUrl = caps.imageUrl || caps.thumbnailUrl || asset.thumbnailUrl;
  const Icon = typeIcon(asset.assetType);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{asset.name}</h3>
            <div className="mt-1 text-xs text-gray-500">
              {asset.assetType} · {asset.assetId}
            </div>
          </div>
          <button
            type="button"
            onClick={onSelectToggle}
            disabled={!asset.canSelect}
            className={cx(
              "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-[#00f5d4]/30 bg-[#00f5d4]/15 text-[#00f5d4]"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            )}
          >
            {selected ? <Check className="h-3 w-3" /> : null}
            {selected ? "Selected" : "Select Asset"}
          </button>
        </div>

        <div className="relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#00bbf9]" />
          ) : renderer === "image" && imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={asset.name}
                className="max-h-full max-w-full object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-white/10 bg-black/70 p-1">
                <button type="button" className="p-1 text-gray-300 hover:text-white" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button type="button" className="p-1 text-gray-300 hover:text-white" onClick={() => setZoom(1)} aria-label="Reset zoom">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button type="button" className="p-1 text-gray-300 hover:text-white" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : renderer === "audio_unavailable" ? (
            <div className="px-6 text-center">
              <Music className="mx-auto mb-3 h-8 w-8 text-gray-500" />
              <div className="text-sm font-bold text-gray-300">Audio preview unavailable</div>
              <div className="mt-1 text-xs text-gray-500">{caps.reason}</div>
            </div>
          ) : (
            <div className="px-6 text-center">
              {imageUrl ? <img src={imageUrl} alt="" className="mx-auto mb-3 h-24 w-24 rounded-lg object-cover opacity-80" /> : <Icon className="mx-auto mb-3 h-8 w-8 text-gray-500" />}
              <div className="text-sm font-bold text-gray-300">
                {renderer === "model_fallback" ? "3D preview fallback" : renderer === "animation_unavailable" ? "Animation preview unavailable" : "Preview unavailable"}
              </div>
              <div className="mt-1 text-xs text-gray-500">{caps.reason || "Roblox did not expose an inline preview for this asset."}</div>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {[
            ["Creator", formatCreator(asset)],
            ["Ownership", asset.ownershipSource || "unknown"],
            ["Availability", asset.availabilityStatus || "unknown"],
            ["Moderation", asset.moderationStatus || "unknown"],
            ["Created", asset.createdAt || "Unavailable"],
            ["Updated", asset.updatedAt || "Unavailable"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</dt>
              <dd className="mt-1 break-words text-gray-200">{value}</dd>
            </div>
          ))}
        </dl>

        {asset.description ? <p className="mt-3 text-xs leading-relaxed text-gray-400">{asset.description}</p> : null}

        {asset.openUrl ? (
          <a href={asset.openUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#00bbf9] hover:text-white">
            Open on Roblox <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function AssetLibraryModal({
  open,
  onClose,
  projectId,
  robloxIdentity,
  destination,
  persistedAssets = [],
  onConfirm,
  saving = false,
}) {
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const [source, setSource] = useState("my");
  const [assetTypes, setAssetTypes] = useState(["Model", "Mesh", "Image", "Decal"]);
  const [sort, setSort] = useState("recently_updated");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assets, setAssets] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selection, setSelection] = useState(() => new Map());
  const [sources, setSources] = useState([
    { id: "my", label: "My Assets", authorized: true },
    { id: "project", label: "Project Assets", authorized: true },
    { id: "recent", label: "Recently Used", authorized: true },
    { id: "selected", label: "Selected", authorized: true },
  ]);

  useEffect(() => {
    if (!open) return;
    const map = new Map();
    persistedAssets.forEach((asset) => map.set(String(asset.assetId), asset));
    setSelection(map);
  }, [open, persistedAssets]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [open, search]);

  const localAssets = useMemo(() => {
    if (source === "project") return persistedAssets;
    if (source === "selected") return Array.from(selection.values());
    if (source === "recent") {
      return [...persistedAssets].sort((a, b) => Number(b.lastUsedAt || 0) - Number(a.lastUsedAt || 0));
    }
    return assets;
  }, [assets, persistedAssets, selection, source]);
  const previewAssetId = previewAsset?.assetId || "";

  const displayedAssets = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const typeSet = new Set(assetTypes);
    const filtered = localAssets.filter((asset) => {
      if (assetTypes.length && !typeSet.has(asset.assetType)) return false;
      if (!q) return true;
      return String(asset.name || "").toLowerCase().includes(q) || String(asset.assetId || "").includes(q);
    });
    if (sort === "name") return [...filtered].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (sort === "asset_type") return [...filtered].sort((a, b) => String(a.assetType || "").localeCompare(String(b.assetType || "")));
    if (sort === "recently_used") return [...filtered].sort((a, b) => Number(b.lastUsedAt || 0) - Number(a.lastUsedAt || 0));
    return filtered;
  }, [assetTypes, debouncedSearch, localAssets, sort]);

  const loadAssets = useCallback(async ({ append = false, cursor = "" } = {}) => {
    if (!open || ["project", "recent", "selected"].includes(source)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listRobloxAssets({
        source,
        search: debouncedSearch,
        assetTypes,
        sort,
        cursor,
        pageSize: 24,
      });
      const nextAssets = Array.isArray(data.assets) ? data.assets : [];
      setAssets((current) => {
        const merged = new Map();
        if (append) current.forEach((asset) => merged.set(String(asset.assetId), asset));
        nextAssets.forEach((asset) => merged.set(String(asset.assetId), asset));
        return Array.from(merged.values());
      });
      setNextCursor(data.nextCursor || null);
      if (Array.isArray(data.sources) && data.sources.length) setSources(data.sources.filter((item) => item.authorized !== false));
    } catch (err) {
      setError(err);
      setAssets([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [assetTypes, debouncedSearch, open, sort, source]);

  useEffect(() => {
    setAssets([]);
    setNextCursor(null);
    loadAssets({ append: false, cursor: "" });
  }, [loadAssets]);

  useEffect(() => {
    if (!previewAssetId) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    Promise.all([
      getRobloxAsset(previewAssetId).catch(() => ({ asset: null })),
      getRobloxAssetPreview(previewAssetId).catch((err) => ({
        preview: { renderer: "unsupported", reason: err?.message || "Preview unavailable" },
        error: err,
      })),
    ])
      .then(([assetData, previewData]) => {
        if (cancelled) return;
        setPreviewAsset((current) => current?.assetId === previewAssetId ? { ...current, ...(assetData.asset || {}) } : current);
        setPreview(previewData);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewAssetId]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    window.setTimeout(() => searchRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      const items = Array.from(focusable).filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose, open]);

  const toggleType = (assetType) => {
    setAssetTypes((current) => {
      if (current.includes(assetType)) {
        const next = current.filter((type) => type !== assetType);
        return next.length ? next : current;
      }
      return [...current, assetType];
    });
  };

  const toggleSelection = (asset) => {
    if (!asset?.assetId || !asset.canSelect) return;
    setSelection((current) => {
      const next = new Map(current);
      const key = String(asset.assetId);
      if (next.has(key)) next.delete(key);
      else next.set(key, asset);
      return next;
    });
  };

  const confirm = async () => {
    await onConfirm?.(Array.from(selection.values()));
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-library-title"
        className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0D0D0D] shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <h2 id="asset-library-title" className="text-lg font-black text-white">Asset Library</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span>{robloxIdentity?.profile?.preferred_username || robloxIdentity?.profile?.name || "Roblox connected"}</span>
              {destination ? <span>Destination {destination.type} {destination.id}</span> : <span>No destination selected</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => loadAssets({ append: false, cursor: "" })} className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 hover:bg-white/10 hover:text-white" aria-label="Refresh assets">
              <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 hover:bg-white/10 hover:text-white" aria-label="Close asset library">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 p-3">
          {sources.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSource(item.id)}
              className={cx(
                "rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-all",
                source === item.id ? "border-[#00bbf9]/30 bg-[#00bbf9]/15 text-[#00bbf9]" : "border-white/10 bg-white/5 text-gray-500 hover:text-gray-200"
              )}
            >
              {item.label}
            </button>
          ))}
          <div className="h-px flex-1 bg-white/5" />
          <Segmented size="sm" value={sort} onChange={setSort} options={SORTS} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <main className="flex min-h-0 flex-col border-r border-white/10">
            <div className="shrink-0 space-y-3 border-b border-white/10 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by asset name or ID"
                  className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-9 text-sm text-white outline-none focus:border-[#00bbf9]/40"
                  aria-label="Search assets"
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Asset type filters">
                {ASSET_TYPES.map((assetType) => (
                  <button
                    key={assetType}
                    type="button"
                    onClick={() => toggleType(assetType)}
                    className={cx(
                      "rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
                      assetTypes.includes(assetType) ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]" : "border-white/10 bg-white/5 text-gray-500"
                    )}
                  >
                    {assetType}
                  </button>
                ))}
              </div>
              <ErrorState error={error} onRetry={() => loadAssets({ append: false, cursor: "" })} />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3" aria-live="polite">
              {loading && !displayedAssets.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                  ))}
                </div>
              ) : displayedAssets.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {displayedAssets.map((asset) => {
                    const selected = selection.has(String(asset.assetId));
                    const Icon = typeIcon(asset.assetType);
                    return (
                      <article key={asset.assetId} className={cx("rounded-lg border bg-white/[0.03] p-2 transition-all", selected ? "border-[#00f5d4]/30" : "border-white/10 hover:border-white/20")}>
                        <button type="button" onClick={() => setPreviewAsset(asset)} className="block w-full text-left" aria-label={`Preview ${asset.name}`}>
                          <div className="relative mb-2 aspect-video overflow-hidden rounded-md bg-black/40">
                            {asset.thumbnailUrl ? <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="m-auto h-full w-8 text-gray-600" />}
                            <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-black uppercase text-gray-300">{asset.assetType}</span>
                          </div>
                          <div className="truncate text-sm font-bold text-white">{asset.name}</div>
                          <div className="mt-1 truncate text-[10px] text-gray-500">{asset.assetId} · {formatCreator(asset)}</div>
                          {asset.availabilityStatus !== "available" || asset.moderationStatus === "moderated" ? (
                            <div className="mt-2 rounded border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">
                              {asset.availabilityStatus || asset.moderationStatus}
                            </div>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSelection(asset)}
                          disabled={!asset.canSelect}
                          className={cx(
                            "mt-2 flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40",
                            selected ? "border-[#00f5d4]/25 bg-[#00f5d4]/15 text-[#00f5d4]" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          )}
                          aria-label={selected ? `Remove ${asset.name} from selection` : `Select ${asset.name}`}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                          {selected ? "Selected" : "Select"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center text-center">
                  <div>
                    <Box className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                    <div className="text-sm font-bold text-gray-300">No assets found</div>
                    <div className="mt-1 text-xs text-gray-500">Adjust filters, search, or refresh Roblox permissions.</div>
                  </div>
                </div>
              )}

              {nextCursor && !["project", "recent", "selected"].includes(source) ? (
                <div className="mt-4 flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => loadAssets({ append: true, cursor: nextCursor })} disabled={loading} iconRight={ChevronRight}>
                    {loading ? "Loading" : "Load More"}
                  </Button>
                </div>
              ) : null}
            </div>
          </main>

          <aside className="min-h-[360px] min-w-0 border-t border-white/10 lg:border-t-0">
            <AssetPreview
              asset={previewAsset}
              preview={preview}
              loading={previewLoading}
              selected={previewAsset ? selection.has(String(previewAsset.assetId)) : false}
              onSelectToggle={() => previewAsset && toggleSelection(previewAsset)}
            />
          </aside>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3">
          <div className="text-xs text-gray-400" aria-live="polite">
            <span className="font-black text-white">{selection.size}</span> selected
            {!projectId ? <span className="ml-2 text-amber-200">Open a project before adding assets.</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelection(new Map())} disabled={saving || selection.size === 0}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirm} disabled={saving || !projectId || selection.size === 0}>
              {saving ? "Adding..." : "Add Selected Assets"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
