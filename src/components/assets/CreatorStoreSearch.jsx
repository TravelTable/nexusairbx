import React, { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Search } from "lib/icons";
import { CREATOR_STORE_READ_CAPABILITIES, ensureRobloxCapabilities, formatRobloxApiError } from "../../lib/robloxOAuthApi";
import { getCreatorStoreAsset, searchCreatorStore } from "../../lib/robloxCreatorStoreApi";
import CreatorStoreAssetDetails from "./CreatorStoreAssetDetails";
import CreatorStoreResultCard from "./CreatorStoreResultCard";
import RobloxAuthorizationRequired from "../roblox/RobloxAuthorizationRequired";
import NexusDisplayIcon from "../icons/NexusDisplayIcon";

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
  const errorMessage = error ? formatRobloxApiError(error) : "";

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
    <section className={`${className} overflow-hidden rounded-[14px] bg-[var(--ds-surface-1)]`}>
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest text-[var(--ds-text)]">Creator Store</div>
            <div className="truncate text-[10px] text-[var(--ds-text-muted)]">Search Roblox development assets</div>
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[3px] border border-[var(--ds-border)] bg-[var(--ds-surface-2)] px-4 py-2 text-[11px] font-semibold text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] disabled:opacity-40"
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
            className="min-h-12 min-w-0 flex-1 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-2)] px-4 py-2 text-sm text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-accent-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
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
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[3px] border border-[var(--ds-border)] bg-transparent px-3.5 py-1.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--ds-accent)]"
                checked={assetTypes.includes(assetType)}
                onChange={() => toggleAssetType(assetType)}
              />
              {assetType}
            </label>
          ))}
        </div>
      </div>

      {error && (
        reauthorizationRequired ? (
          <div className="border-b border-[color-mix(in_srgb,var(--ds-warning)_24%,transparent)] px-3 py-2">
            <RobloxAuthorizationRequired
              connected
              capabilityIds={CREATOR_STORE_READ_CAPABILITIES}
              onAuthorize={reauthorize}
            />
          </div>
        ) : (
          <div className="border-b border-[color-mix(in_srgb,var(--ds-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--ds-danger)]">
            {errorMessage}
          </div>
        )
      )}

      <div className="p-5 pt-1">
        {loading && (
          <div className="flex min-h-36 items-center justify-center gap-2 rounded-[14px] bg-[var(--ds-fill-subtle)] text-sm text-[var(--ds-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching Creator Store
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-[14px] bg-[var(--ds-fill-subtle)] px-4 text-center text-sm text-[var(--ds-text-muted)]">
            <NexusDisplayIcon name="ask" size={64} className="h-16 w-16" />
            <span>No Creator Store assets found.</span>
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-none border-0 border-b border-[var(--ds-border)] bg-transparent px-5 py-2 text-[12px] font-semibold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] disabled:opacity-40"
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
        <div className="px-3 pb-3 text-[11px] text-[var(--ds-danger)]">{detailsError}</div>
      )}
    </section>
  );
}
