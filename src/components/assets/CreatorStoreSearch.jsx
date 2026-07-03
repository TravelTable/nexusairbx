import React, { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, ShieldAlert } from "lib/icons";
import { CREATOR_STORE_READ_CAPABILITIES, ensureRobloxCapabilities } from "../../lib/robloxOAuthApi";
import { getCreatorStoreAsset, searchCreatorStore } from "../../lib/robloxCreatorStoreApi";
import CreatorStoreAssetDetails from "./CreatorStoreAssetDetails";
import CreatorStoreResultCard from "./CreatorStoreResultCard";

const DEFAULT_ASSET_TYPES = ["Model", "Mesh"];
const PAGE_SIZE = 20;

function requestKey({ query, assetTypes, cursor }) {
  return JSON.stringify({
    query: String(query || "").trim(),
    assetTypes: [...assetTypes].sort(),
    cursor: cursor || null,
  });
}

function safeResults(value) {
  return Array.isArray(value?.results) ? value.results : [];
}

export default function CreatorStoreSearch({ notify, className = "mx-3 mb-2" }) {
  const [query, setQuery] = useState("");
  const [assetTypes, setAssetTypes] = useState(DEFAULT_ASSET_TYPES);
  const [results, setResults] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const activeRequestKeyRef = useRef("");

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2 && assetTypes.length > 0;
  const reauthorizationRequired = error?.code === "ROBLOX_REAUTHORIZATION_REQUIRED" || error?.code === "CREATOR_STORE_REAUTHORIZATION_REQUIRED";

  const orderedAssetTypes = useMemo(
    () => DEFAULT_ASSET_TYPES.filter((type) => assetTypes.includes(type)),
    [assetTypes]
  );

  const toggleAssetType = (assetType) => {
    setAssetTypes((prev) => {
      if (prev.includes(assetType)) {
        const next = prev.filter((value) => value !== assetType);
        return next.length ? next : prev;
      }
      return [...prev, assetType];
    });
  };

  const runSearch = async ({ cursor = null, append = false } = {}) => {
    if (!canSearch) {
      setError({ message: "Enter at least two characters to search." });
      return;
    }
    const key = requestKey({ query: trimmedQuery, assetTypes: orderedAssetTypes, cursor });
    if ((loading || loadingMore) && activeRequestKeyRef.current === key) return;
    activeRequestKeyRef.current = key;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    if (!append) {
      setHasSearched(true);
      setResults([]);
      setNextCursor(null);
    }
    try {
      const authorization = await ensureRobloxCapabilities({
        capabilities: CREATOR_STORE_READ_CAPABILITIES,
        returnPath: "/ai?roblox=creator-store",
        pendingAction: { type: "creator_store_search" },
      });
      if (authorization.authorized === false) return;
      const data = await searchCreatorStore({
        query: trimmedQuery,
        assetTypes: orderedAssetTypes,
        pageSize: PAGE_SIZE,
        cursor,
      });
      setResults((prev) => append ? [...prev, ...safeResults(data)] : safeResults(data));
      setNextCursor(data?.nextCursor || null);
    } catch (err) {
      setError(err);
      notify?.({ type: "error", message: err?.message || "Creator Store search failed" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      activeRequestKeyRef.current = "";
    }
  };

  const openDetails = async (asset) => {
    setSelectedAsset(asset);
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const data = await getCreatorStoreAsset(asset.assetId);
      setSelectedAsset(data?.asset || asset);
    } catch (err) {
      setDetailsError(err?.message || "Failed to load asset details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const reauthorize = async () => {
    try {
      await ensureRobloxCapabilities({
        capabilities: CREATOR_STORE_READ_CAPABILITIES,
        returnPath: "/ai?roblox=creator-store",
        pendingAction: { type: "creator_store_search" },
      });
    } catch (err) {
      setError(err);
      notify?.({ type: "error", message: err?.message || "Failed to start Roblox reauthorization" });
    }
  };

  return (
    <section className={`${className} rounded-lg border border-white/10 bg-black/35 backdrop-blur-xl overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-white/10 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest text-white">Creator Store</div>
            <div className="text-[10px] text-gray-500 truncate">Search Roblox development assets</div>
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#00bbf9]/25 bg-[#00bbf9]/10 px-3 py-2 text-[11px] font-black text-[#00bbf9] hover:bg-[#00bbf9]/20 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </button>
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
        >
          <label className="sr-only" htmlFor="creator-store-query">Search Creator Store</label>
          <input
            id="creator-store-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="low poly medieval tree"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#00bbf9]/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="sr-only"
          >
            Submit Creator Store search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_ASSET_TYPES.map((assetType) => (
            <label
              key={assetType}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-gray-200"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[#00bbf9]"
                checked={assetTypes.includes(assetType)}
                onChange={() => toggleAssetType(assetType)}
              />
              {assetType}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="border-b border-red-400/15 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{reauthorizationRequired ? "Creator Store access needs additional Roblox permission." : error.message}</span>
            </div>
            {reauthorizationRequired && (
              <button
                type="button"
                onClick={reauthorize}
                className="inline-flex items-center justify-center rounded-md border border-red-300/25 bg-red-300/10 px-3 py-1.5 text-[11px] font-black text-red-50 hover:bg-red-300/20"
              >
                Reauthorize Roblox
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-3">
        {loading && (
          <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching Creator Store
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-sm text-gray-500">
            No Creator Store assets found.
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((asset) => (
                <CreatorStoreResultCard
                  key={asset.assetId}
                  asset={asset}
                  onViewDetails={openDetails}
                />
              ))}
            </div>
            {nextCursor && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => runSearch({ cursor: nextCursor, append: true })}
                  disabled={loadingMore}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-gray-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedAsset && (
        <CreatorStoreAssetDetails
          asset={selectedAsset}
          loading={detailsLoading}
          notify={notify}
          onClose={() => {
            setSelectedAsset(null);
            setDetailsError("");
          }}
        />
      )}
      {detailsError && (
        <div className="px-3 pb-3 text-[11px] text-red-200">{detailsError}</div>
      )}
    </section>
  );
}
