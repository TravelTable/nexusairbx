import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Library, Package, Search, Sparkles } from "../lib/icons";
import { Button } from "../components/ui";
import AssetCard from "../components/assets/AssetCard";
import AssetLifecycleBadge from "../components/assets/AssetLifecycleBadge";
import { AssetEmptyState, AssetErrorState, AssetGridSkeleton } from "../components/assets/AssetCollectionState";
import {
  canAssetPlatformAction,
  formatAssetPlatformError,
  getAssetPlatformCapabilities,
  getAssetPlatformContext,
  getRobloxUploadStatus,
  listAuthorizedCreators,
  listAssetPacks,
  listAssets,
  normalizeAsset,
  retryAssetUpload,
} from "../lib/assetPlatformApi";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import "../components/assets/assetPlatform.css";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function contextBody(response) {
  return response?.context || response || {};
}

function itemId(item, field) {
  return String(item?.[field] || item?.id || "");
}

function projectOptions(context) {
  const projects = asArray(context?.projects || context?.availableProjects);
  if (projects.length) return projects;
  return context?.project ? [context.project] : [];
}

function universeOptions(context, selectedProjectId) {
  const project = projectOptions(context).find((entry) => itemId(entry, "projectId") === selectedProjectId);
  const nested = asArray(project?.universes || project?.experiences);
  return nested.length ? nested : asArray(context?.universes);
}

function generatorUrl(mode, field, value) {
  const params = new URLSearchParams({ mode });
  if (value) params.set(field, value);
  return `/tools/icon-generator?${params.toString()}`;
}

function normalizeCreator(value = {}) {
  const creator = value?.creator && typeof value.creator === "object" ? value.creator : value;
  const rawType = String(creator?.type || creator?.creatorType || "").trim().toLowerCase();
  const type = rawType === "user" ? "User" : rawType === "group" ? "Group" : "";
  const id = String(creator?.id || creator?.creatorId || "").trim();
  if (!type || !id) return null;
  return {
    ...creator,
    type,
    id,
    name: String(creator?.name || creator?.displayName || creator?.username || "").trim(),
  };
}

function creatorKey(creator = {}) {
  const normalized = normalizeCreator(creator);
  return normalized ? `${normalized.type}:${normalized.id}` : "";
}

function creatorLabel(creator = {}) {
  const name = creator.name || creator.displayName || creator.username;
  const type = creator.type || creator.creatorType;
  const id = creator.id || creator.creatorId;
  return name || `${type || "Creator"} ${id || ""}`.trim();
}

function creatorsFromResponse(response) {
  const output = response?.output || response?.result || response || {};
  const data = output?.data && typeof output.data === "object" ? output.data : {};
  return asArray(data.creators || output.creators || response?.data?.creators || response?.creators)
    .map(normalizeCreator)
    .filter(Boolean);
}

function responseAsset(response) {
  const candidate = response?.asset
    || response?.output?.asset
    || response?.result?.asset
    || response?.output
    || response?.result;
  if (!candidate || typeof candidate !== "object") return null;
  const asset = normalizeAsset(candidate);
  return asset.assetId ? asset : null;
}

export default function AssetLibraryPage() {
  const navigate = useNavigate();
  const { user, authReady } = useBilling();
  const { settings } = useSettings();
  const [context, setContext] = useState({});
  const [contextReady, setContextReady] = useState(false);
  const [assets, setAssets] = useState([]);
  const [packs, setPacks] = useState([]);
  const [creators, setCreators] = useState([]);
  const [assetTotal, setAssetTotal] = useState(null);
  const [packTotal, setPackTotal] = useState(null);
  const [tab, setTab] = useState("assets");
  const [scope, setScope] = useState("project");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedUniverseId, setSelectedUniverseId] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [creator, setCreator] = useState("all");
  const [moderation, setModeration] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [usage, setUsage] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyByAsset, setBusyByAsset] = useState({});

  useEffect(() => {
    if (authReady && !user) navigate("/signin", { replace: true, state: { from: "/assets" } });
  }, [authReady, user, navigate]);

  const loadContext = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const response = await getAssetPlatformContext();
      const nextContext = contextBody(response);
      const projects = projectOptions(nextContext);
      const nextProjectId = String(nextContext.selectedProjectId || itemId(nextContext.project, "projectId") || itemId(projects[0], "projectId") || "");
      const universes = universeOptions(nextContext, nextProjectId);
      setContext(nextContext);
      setSelectedProjectId(nextProjectId);
      setSelectedUniverseId(String(nextContext.selectedUniverseId || itemId(universes[0], "universeId") || ""));
      setContextReady(true);
    } catch (loadError) {
      setError(formatAssetPlatformError(loadError, "Asset library context could not be loaded."));
      setContextReady(true);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadContext();
  }, [user, loadContext]);

  useEffect(() => {
    if (!user || !contextReady) return undefined;
    const capabilities = getAssetPlatformCapabilities(context);
    if (!canAssetPlatformAction(capabilities, "list_authorized_creators")) {
      setCreators([]);
      return undefined;
    }
    let active = true;
    listAuthorizedCreators({
      projectId: selectedProjectId || undefined,
      universeId: selectedUniverseId || undefined,
    }).then((response) => {
      if (!active) return;
      setCreators(creatorsFromResponse(response));
    }).catch(() => {
      if (active) setCreators([]);
    });
    return () => { active = false; };
  }, [user, contextReady, context, selectedProjectId, selectedUniverseId]);

  const loadRecords = useCallback(async () => {
    if (!user || !contextReady) return;
    setLoading(true);
    setError("");
    const baseQuery = {
      scope,
      projectId: scope === "project" ? selectedProjectId : "",
      universeId: scope === "universe" ? selectedUniverseId : "",
      search: search.trim(),
      limit: 200,
      sort: "updated_desc",
    };
    const [assetResult, packResult] = await Promise.allSettled([
      listAssets({
        ...baseQuery,
        kind: kind === "all" ? "" : kind,
        moderation: moderation === "all" ? "" : moderation,
        lifecycle: lifecycle === "all" ? "" : lifecycle,
        usage: usage === "all" ? "" : usage,
        visibility: visibility === "all" ? "" : visibility,
      }),
      listAssetPacks(baseQuery),
    ]);

    if (assetResult.status === "fulfilled") {
      setAssets(assetResult.value.assets);
      setAssetTotal(Number.isFinite(Number(assetResult.value.total)) ? Number(assetResult.value.total) : assetResult.value.assets.length);
    } else {
      setAssets([]);
      setAssetTotal(0);
    }
    if (packResult.status === "fulfilled") {
      setPacks(packResult.value.packs);
      setPackTotal(Number.isFinite(Number(packResult.value.total)) ? Number(packResult.value.total) : packResult.value.packs.length);
    } else {
      setPacks([]);
      setPackTotal(0);
    }
    if (assetResult.status === "rejected" && packResult.status === "rejected") {
      setError(formatAssetPlatformError(assetResult.reason, "Assets could not be loaded."));
    } else if (tab === "assets" && assetResult.status === "rejected") {
      setError(formatAssetPlatformError(assetResult.reason, "Assets could not be loaded."));
    } else if (tab === "packs" && packResult.status === "rejected") {
      setError(formatAssetPlatformError(packResult.reason, "Asset packs could not be loaded."));
    }
    setLoading(false);
  }, [user, contextReady, scope, selectedProjectId, selectedUniverseId, search, kind, moderation, lifecycle, usage, visibility, tab]);

  useEffect(() => {
    if (!contextReady) return undefined;
    const timer = window.setTimeout(loadRecords, 220);
    return () => window.clearTimeout(timer);
  }, [contextReady, loadRecords]);

  const projects = useMemo(() => projectOptions(context), [context]);
  const universes = useMemo(() => universeOptions(context, selectedProjectId), [context, selectedProjectId]);
  const capabilities = useMemo(() => getAssetPlatformCapabilities(context), [context]);
  const canGenerateAsset = canAssetPlatformAction(capabilities, "generate_asset");
  const canGeneratePack = canAssetPlatformAction(capabilities, "generate_asset_pack");
  const canGenerateVariation = canAssetPlatformAction(capabilities, "generate_asset_variation");
  const canPublishAsset = canAssetPlatformAction(capabilities, "publish_asset_to_roblox");
  const canGetUploadStatus = canAssetPlatformAction(capabilities, "get_roblox_upload_status");
  const canGenerate = canGenerateAsset || canGeneratePack;
  const creatorOptions = useMemo(() => {
    const byKey = new Map();
    [...creators, ...assets.map((entry) => entry.creator)].forEach((entry) => {
      const normalized = normalizeCreator(entry);
      const key = creatorKey(normalized || {});
      if (normalized && key && !byKey.has(key)) byKey.set(key, normalized);
    });
    return [...byKey.values()];
  }, [creators, assets]);
  const visibleAssets = useMemo(
    () => creator === "all" ? assets : assets.filter((entry) => creatorKey(entry.creator) === creator),
    [assets, creator]
  );

  const updateOneAsset = async (asset, actionName, busyAction, request, { requiresUploadConsent = false } = {}) => {
    if (!asset?.assetId) return;
    if (!canAssetPlatformAction(capabilities, actionName)) {
      setError("This asset action is not authorized for the current project and Roblox connection.");
      return;
    }
    if (requiresUploadConsent && !settings.robloxAssetUploadsEnabled) {
      setError("Auto Upload Assets is off. Enable it in Roblox settings before retrying a write. The Nexus asset remains saved.");
      return;
    }
    setBusyByAsset((current) => ({ ...current, [asset.assetId]: busyAction }));
    setError("");
    try {
      const response = await request(asset.assetId);
      const nextAsset = responseAsset(response);
      if (nextAsset) {
        setAssets((current) => current.map((entry) => entry.assetId === nextAsset.assetId ? nextAsset : entry));
      } else {
        await loadRecords();
      }
      setNotice(busyAction === "retry" ? "Roblox upload retry queued. The Nexus asset is still available." : "Asset status refreshed.");
    } catch (actionError) {
      setError(formatAssetPlatformError(actionError, busyAction === "retry" ? "Roblox upload could not be retried." : "Asset status could not be refreshed."));
    } finally {
      setBusyByAsset((current) => ({ ...current, [asset.assetId]: "" }));
    }
  };

  if (!authReady || !user || (!contextReady && loading)) {
    return (
      <main className="asset-platform-page">
        <div className="asset-platform-shell">
          <header className="asset-platform-header"><div><p className="asset-eyebrow"><Library /> Nexus asset platform</p><h1>Asset library</h1><p>Loading canonical asset records.</p></div></header>
          <AssetGridSkeleton count={8} label="Loading asset library" />
        </div>
      </main>
    );
  }

  return (
    <main className="asset-platform-page">
      <div className="asset-platform-shell">
        <header className="asset-platform-header">
          <div>
            <p className="asset-eyebrow"><Library aria-hidden="true" /> Nexus asset platform</p>
            <h1>Asset library</h1>
            <p>Browse durable Nexus records across projects and universes. Roblox IDs appear only after upload succeeds.</p>
          </div>
          <div className="asset-platform-header__actions">
            {canGenerate ? <Button icon={Sparkles} onClick={() => navigate("/tools/icon-generator")}>Generate assets</Button> : null}
          </div>
        </header>

        {!canGenerate && !canPublishAsset ? <div className="asset-inline-notice" role="status">Your canonical asset library is available. Creation and publishing controls will appear when this server authorizes those asset actions.</div> : null}
        {error ? <div className="asset-inline-notice asset-inline-notice--error" role="alert">{error}</div> : null}
        {notice ? <div className="asset-inline-notice asset-inline-notice--success" role="status">{notice}</div> : null}

        <section className="asset-library-panel" style={{ marginTop: error || notice ? 14 : 0 }}>
          <div className="asset-library-tabs" role="tablist" aria-label="Library record type">
            <button type="button" role="tab" aria-selected={tab === "assets"} className={`asset-library-tab ${tab === "assets" ? "asset-library-tab--active" : ""}`} onClick={() => setTab("assets")}>Assets {assetTotal === null ? "" : `(${creator === "all" ? assetTotal : visibleAssets.length})`}</button>
            <button type="button" role="tab" aria-selected={tab === "packs"} className={`asset-library-tab ${tab === "packs" ? "asset-library-tab--active" : ""}`} onClick={() => setTab("packs")}>Packs {packTotal === null ? "" : `(${packTotal})`}</button>
          </div>

          <div className="asset-library-filters">
            <label className="asset-library-search">
              <span className="sr-only">Search assets</span>
              <Search aria-hidden="true" />
              <input className="nexus-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, IDs, or briefs" />
            </label>
            <select className="nexus-input" aria-label="Library scope" value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="project">Project</option>
              <option value="universe">Universe</option>
              <option value="global">All my assets</option>
            </select>
            <select className="nexus-input" aria-label="Project" value={selectedProjectId} disabled={scope === "global"} onChange={(event) => { setSelectedProjectId(event.target.value); setSelectedUniverseId(""); }}>
              {projects.length ? projects.map((project) => <option key={itemId(project, "projectId")} value={itemId(project, "projectId")}>{project.name || project.displayName || "Untitled project"}</option>) : <option value="">No projects</option>}
            </select>
            <select className="nexus-input" aria-label="Universe" value={selectedUniverseId} disabled={scope !== "universe"} onChange={(event) => setSelectedUniverseId(event.target.value)}>
              {universes.length ? universes.map((universe) => <option key={itemId(universe, "universeId")} value={itemId(universe, "universeId")}>{universe.name || universe.displayName || "Untitled universe"}</option>) : <option value="">No universes</option>}
            </select>
            {tab === "assets" ? (
              <select className="nexus-input" aria-label="Asset kind" value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="all">All types</option>
                <option value="icon">Icons</option>
                <option value="image">Images</option>
                <option value="decal">Decals</option>
                <option value="texture">Textures</option>
                <option value="experience_marketing_image">Marketing images</option>
                <option value="model">Models</option>
                <option value="audio">Audio</option>
                <option value="badge_artwork">Badge artwork</option>
                <option value="game_pass_artwork">Game pass artwork</option>
                <option value="badge">Badges</option>
                <option value="game_pass">Game passes</option>
                <option value="developer_product">Developer products</option>
              </select>
            ) : <span />}
            {tab === "assets" && creatorOptions.length ? (
              <select className="nexus-input" aria-label="Roblox creator" value={creator} onChange={(event) => setCreator(event.target.value)}>
                <option value="all">All creators</option>
                {creatorOptions.map((entry) => {
                  const key = creatorKey(entry);
                  return <option key={key} value={key}>{creatorLabel(entry)}</option>;
                })}
              </select>
            ) : null}
            {tab === "assets" ? (
              <select className="nexus-input" aria-label="Moderation status" value={moderation} onChange={(event) => setModeration(event.target.value)}>
                <option value="all">Any moderation</option>
                <option value="not_submitted">Not submitted</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="unknown">Unknown</option>
              </select>
            ) : null}
            {tab === "assets" ? (
              <select className="nexus-input" aria-label="Lifecycle status" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>
                <option value="all">Any lifecycle</option>
                <option value="generating">Generating</option>
                <option value="validation_failed">Validation failed</option>
                <option value="ready_to_publish">Ready to publish</option>
                <option value="publishing">Publishing</option>
                <option value="roblox_processing">Roblox processing</option>
                <option value="under_moderation">Under moderation</option>
                <option value="ready">Ready</option>
                <option value="implemented">Implemented</option>
                <option value="failed">Failed</option>
                <option value="archived">Archived</option>
                <option value="replaced">Replaced</option>
              </select>
            ) : null}
            {tab === "assets" ? (
              <select className="nexus-input" aria-label="Usage state" value={usage} onChange={(event) => setUsage(event.target.value)}>
                <option value="all">Any usage</option>
                <option value="unused">Unused</option>
                <option value="used">In use</option>
              </select>
            ) : null}
            {tab === "assets" ? (
              <select className="nexus-input" aria-label="Visibility" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="all">Any visibility</option>
                <option value="project">This project only</option>
                <option value="universe_shared">Universe shared</option>
                <option value="user_global">My global library</option>
              </select>
            ) : null}
          </div>

          <div className="asset-library-summary">
            <span>{scope === "global" ? "All assets you can access" : scope === "universe" ? "Selected universe" : "Selected project"}</span>
            <span>Canonical Nexus IDs stay stable through upload, moderation, and replacement.</span>
          </div>

          {loading ? <AssetGridSkeleton count={8} label={`Loading ${tab}`} /> : error ? (
            <AssetErrorState message={error} onRetry={loadRecords} />
          ) : tab === "assets" ? (
            visibleAssets.length ? (
              <div className="asset-grid">
                {visibleAssets.map((asset) => (
                  <AssetCard
                    key={asset.assetId}
                    asset={asset}
                    busyAction={busyByAsset[asset.assetId]}
                    onOpen={() => navigate(`/assets/${encodeURIComponent(asset.assetId)}`)}
                    onRetryUpload={canPublishAsset ? (entry) => updateOneAsset(entry, "publish_asset_to_roblox", "retry", retryAssetUpload, { requiresUploadConsent: true }) : undefined}
                    onPoll={canGetUploadStatus ? (entry) => updateOneAsset(entry, "get_roblox_upload_status", "poll", (assetId) => getRobloxUploadStatus(assetId, { operationId: entry.robloxOperationId || undefined })) : undefined}
                    onSimilar={canGenerateVariation ? (entry) => navigate(generatorUrl("similar", "assetId", entry.assetId)) : undefined}
                    onReplace={canGenerateVariation ? (entry) => navigate(generatorUrl("replacement", "assetId", entry.assetId)) : undefined}
                  />
                ))}
              </div>
            ) : <AssetEmptyState title="No matching assets" description="No canonical asset records match these filters." action={canGenerate ? <Button icon={Sparkles} onClick={() => navigate("/tools/icon-generator")}>Generate assets</Button> : null} />
          ) : packs.length ? (
            <div className="asset-pack-list">
              {packs.map((pack) => (
                <article className="asset-pack-row" key={pack.packId}>
                  <div><h3>{pack.name}</h3><p>{pack.generationBrief?.prompt || "Coherent asset pack"}</p></div>
                  <dl>
                    <div><dt>Nexus pack ID</dt><dd title={pack.packId}>{pack.packId || "Pending"}</dd></div>
                    <div><dt>Assets</dt><dd>{pack.assets.length || pack.iconAssetIds.length || pack.requestedCount || 0}</dd></div>
                    <div><dt>Status</dt><dd><AssetLifecycleBadge status={pack.lifecycle} /></dd></div>
                  </dl>
                  {canGeneratePack ? <Button size="sm" variant="ghost" icon={Package} iconRight={ArrowRight} onClick={() => navigate(generatorUrl("extend", "packId", pack.packId))}>Extend pack</Button> : null}
                </article>
              ))}
            </div>
          ) : <AssetEmptyState title="No matching packs" description="No pack records match these filters." action={canGeneratePack ? <Button icon={Package} onClick={() => navigate("/tools/icon-generator?mode=pack")}>Create a pack</Button> : null} />}
        </section>
      </div>
    </main>
  );
}
