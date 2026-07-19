import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Library, RefreshCw, Settings, Sparkles } from "../lib/icons";
import { Button } from "../components/ui";
import AssetContextBar from "../components/assets/AssetContextBar";
import AssetGenerationForm, { DEFAULT_ASSET_GENERATION_FORM } from "../components/assets/AssetGenerationForm";
import AssetPackGrid from "../components/assets/AssetPackGrid";
import AssetStyleSummary from "../components/assets/AssetStyleSummary";
import { AssetErrorState, AssetGridSkeleton } from "../components/assets/AssetCollectionState";
import {
  ASSET_PLATFORM_WRITES_ENABLED,
  createAssetOperationKey,
  extendAssetPack,
  formatAssetPlatformError,
  generateAssets,
  generateSimilarAsset,
  getAssetOperation,
  getAssetPlatformContext,
  listAssetPacks,
  listAssets,
  listStyleProfiles,
  normalizeAsset,
  normalizePack,
  pollAssetStatus,
  replaceAsset,
  retryAssetUpload,
} from "../lib/assetPlatformApi";
import { getRobloxOAuthStatus } from "../lib/robloxOAuthApi";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import "../components/assets/assetPlatform.css";

const ACTIVE_OPERATION_STATES = new Set(["accepted", "queued", "pending", "running", "in_progress", "processing", "generating", "validating", "uploading", "submitted", "moderation_pending"]);
const TERMINAL_OPERATION_STATES = new Set(["completed", "complete", "succeeded", "ready", "partially_ready", "partial_success", "failed", "cancelled"]);
const GENERATION_MODES = new Set(["single", "pack", "extend", "similar", "replacement"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function projectId(project) {
  return String(project?.projectId || project?.id || "");
}

function universeId(universe) {
  return String(universe?.universeId || universe?.id || "");
}

function contextBody(response) {
  return response?.context || response || {};
}

function getProjects(context) {
  const projects = asArray(context?.projects || context?.availableProjects);
  if (projects.length) return projects;
  return context?.project ? [context.project] : [];
}

function getUniverses(context, selectedProjectId) {
  const project = getProjects(context).find((entry) => projectId(entry) === selectedProjectId);
  const projectUniverses = asArray(project?.universes || project?.experiences);
  return projectUniverses.length ? projectUniverses : asArray(context?.universes);
}

function operationState(response) {
  return String(response?.operation?.lifecycle || response?.operation?.status || response?.lifecycle || response?.status || "queued").toLowerCase();
}

function responseAssets(response) {
  return asArray(response?.assets || response?.operation?.assets || response?.items).map(normalizeAsset);
}

function responsePack(response) {
  const pack = response?.pack || response?.operation?.pack;
  return pack ? normalizePack(pack) : null;
}

function mergeAssets(current, incoming) {
  if (!incoming.length) return current;
  const byId = new Map();
  current.forEach((asset) => byId.set(asset.assetId || `${asset.name}-${asset.createdAt}`, asset));
  incoming.forEach((asset) => byId.set(asset.assetId || `${asset.name}-${asset.createdAt}`, asset));
  return Array.from(byId.values());
}

function formatCostEstimate(context, form) {
  const estimate = context?.costEstimate || context?.pricing?.estimate;
  if (typeof estimate === "string") return estimate;
  if (estimate?.formatted) return estimate.formatted;
  const perAsset = Number(estimate?.creditsPerAsset || context?.pricing?.creditsPerAsset || 0);
  if (!perAsset) return "Confirmed before generation";
  const count = form.mode === "pack" || form.mode === "extend" ? Number(form.requestedCount || 1) : 1;
  return `${perAsset * count} credits estimated`;
}

function unsupportedModesFromContext(context) {
  const explicit = asArray(context?.unsupportedModes || context?.capabilities?.unsupportedModes);
  const declared = context?.capabilities?.generationModes || context?.generationModes;
  if (!declared || Array.isArray(declared)) return explicit;
  return Array.from(new Set([
    ...explicit,
    ...Object.entries(declared).filter(([, available]) => available === false).map(([mode]) => mode),
  ]));
}

export default function IconGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, authReady, totalRemaining, refresh: refreshBilling } = useBilling();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [context, setContext] = useState({});
  const [connection, setConnection] = useState({ connected: false });
  const [assets, setAssets] = useState([]);
  const [packs, setPacks] = useState([]);
  const [styleProfiles, setStyleProfiles] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedUniverseId, setSelectedUniverseId] = useState("");
  const [form, setForm] = useState(DEFAULT_ASSET_GENERATION_FORM);
  const [currentPack, setCurrentPack] = useState(null);
  const [resultAssets, setResultAssets] = useState([]);
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyByAsset, setBusyByAsset] = useState({});
  const [autoUploadBusy, setAutoUploadBusy] = useState(false);
  const formPanelRef = useRef(null);
  const handoffAppliedRef = useRef(false);

  useEffect(() => {
    if (authReady && !user) navigate("/signin", { replace: true, state: { from: "/tools/icon-generator" } });
  }, [authReady, user, navigate]);

  const loadWorkspace = useCallback(async (requestedProjectId = "") => {
    if (!user) return;
    setLoading(true);
    setError("");
    const query = requestedProjectId ? { projectId: requestedProjectId } : {};
    const results = await Promise.allSettled([
      getAssetPlatformContext(query),
      listAssets({ ...query, limit: 40, sort: "updated_desc" }),
      listAssetPacks({ ...query, limit: 30, sort: "updated_desc" }),
      listStyleProfiles(query),
      getRobloxOAuthStatus(),
    ]);

    const [contextResult, assetsResult, packsResult, stylesResult, connectionResult] = results;
    if (contextResult.status === "fulfilled") {
      const nextContext = contextBody(contextResult.value);
      const projects = getProjects(nextContext);
      const nextProjectId = requestedProjectId
        || String(nextContext.selectedProjectId || projectId(nextContext.project) || projectId(projects[0]) || "");
      setContext(nextContext);
      setSelectedProjectId(nextProjectId);
      const nextUniverses = getUniverses(nextContext, nextProjectId);
      setSelectedUniverseId((current) => {
        if (current && nextUniverses.some((entry) => universeId(entry) === current)) return current;
        return String(nextContext.selectedUniverseId || universeId(nextUniverses[0]) || "");
      });
    } else {
      setError(formatAssetPlatformError(contextResult.reason, "Project context could not be loaded."));
    }

    if (assetsResult.status === "fulfilled") setAssets(assetsResult.value.assets);
    if (packsResult.status === "fulfilled") setPacks(packsResult.value.packs);
    if (stylesResult.status === "fulfilled") setStyleProfiles(stylesResult.value.styleProfiles);
    if (connectionResult.status === "fulfilled") setConnection(connectionResult.value);

    if (contextResult.status === "fulfilled" && assetsResult.status === "rejected" && packsResult.status === "rejected") {
      setError(formatAssetPlatformError(assetsResult.reason, "Existing assets could not be loaded."));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadWorkspace();
  }, [user, loadWorkspace]);

  useEffect(() => {
    if (handoffAppliedRef.current) return;
    handoffAppliedRef.current = true;
    const mode = searchParams.get("mode");
    if (!GENERATION_MODES.has(mode)) return;
    const sourceAssetId = searchParams.get("assetId") || "";
    const packId = searchParams.get("packId") || "";
    setForm((current) => ({
      ...current,
      mode,
      sourceAssetId: mode === "similar" || mode === "replacement" ? sourceAssetId || current.sourceAssetId : current.sourceAssetId,
      packId: mode === "extend" ? packId || current.packId : current.packId,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!ASSET_PLATFORM_WRITES_ENABLED) return undefined;
    const operationId = operation?.operationId;
    const state = operation?.state || "";
    if (!operationId || TERMINAL_OPERATION_STATES.has(state) || !ACTIVE_OPERATION_STATES.has(state)) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const next = await getAssetOperation(operationId);
        const nextAssets = responseAssets(next);
        const nextPack = responsePack(next);
        setResultAssets((current) => mergeAssets(current, nextAssets));
        setAssets((current) => mergeAssets(current, nextAssets));
        if (nextPack) setCurrentPack(nextPack);
        const nextState = operationState(next);
        setOperation({ operationId, state: nextState });
        if (TERMINAL_OPERATION_STATES.has(nextState)) refreshBilling?.();
      } catch (pollError) {
        setError(formatAssetPlatformError(pollError, "Generation progress could not be refreshed."));
        setOperation((current) => current ? { ...current, state: "paused" } : current);
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [operation, refreshBilling]);

  const projects = useMemo(() => getProjects(context), [context]);
  const universes = useMemo(() => getUniverses(context, selectedProjectId), [context, selectedProjectId]);
  const unsupportedModes = useMemo(() => unsupportedModesFromContext(context), [context]);
  const selectedStyleProfile = styleProfiles.find((profile) => profile.styleProfileId === form.styleProfileId)
    || styleProfiles.find((profile) => profile.styleProfileId === currentPack?.styleProfileId)
    || null;
  const costEstimate = formatCostEstimate(context, form);

  const changeProject = async (nextProjectId) => {
    setSelectedProjectId(nextProjectId);
    setSelectedUniverseId("");
    setCurrentPack(null);
    setResultAssets([]);
    setOperation(null);
    await loadWorkspace(nextProjectId);
  };

  const changeAutoUpload = async (checked) => {
    if (!ASSET_PLATFORM_WRITES_ENABLED) return;
    setAutoUploadBusy(true);
    setError("");
    const result = await updateSettings({ robloxAssetUploadsEnabled: checked });
    if (!result?.ok) setError(result?.error || "The auto-upload preference could not be saved.");
    setAutoUploadBusy(false);
  };

  const applyOperationResponse = (response, submittedMode) => {
    const nextAssets = responseAssets(response);
    const nextPack = responsePack(response);
    const operationId = String(response?.operationId || response?.operation?.operationId || response?.operation?.id || "");
    const state = operationState(response);
    setResultAssets(nextAssets);
    setAssets((current) => mergeAssets(current, nextAssets));
    if (nextPack) {
      setCurrentPack(nextPack);
      setPacks((current) => {
        const others = current.filter((pack) => pack.packId !== nextPack.packId);
        return [nextPack, ...others];
      });
    } else if (response?.packId) {
      setCurrentPack(packs.find((pack) => pack.packId === response.packId) || null);
    } else if (submittedMode === "single" || submittedMode === "similar" || submittedMode === "replacement") {
      setCurrentPack(null);
    }
    setOperation(operationId ? { operationId, state } : null);
    setNotice(operationId
      ? "Generation accepted. Asset cards update independently as work completes."
      : "The asset request was accepted. Refresh the library if the result is not returned inline.");
  };

  const submitGeneration = async (submittedForm) => {
    if (!ASSET_PLATFORM_WRITES_ENABLED) {
      setError("Asset generation and Roblox writes are not enabled for this environment.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    const conceptNames = submittedForm.conceptNames
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter(Boolean);
    const payload = {
      idempotencyKey: createAssetOperationKey(),
      mode: submittedForm.mode,
      projectId: selectedProjectId,
      universeId: selectedUniverseId || null,
      prompt: submittedForm.prompt.trim(),
      requestedCount: submittedForm.mode === "pack" || submittedForm.mode === "extend" ? Number(submittedForm.requestedCount || 1) : 1,
      conceptNames,
      autoExtractConcepts: Boolean(submittedForm.autoExtractConcepts),
      styleProfileId: submittedForm.styleProfileId || null,
      artworkMode: submittedForm.artworkMode,
      backgroundMode: submittedForm.backgroundMode,
      transparencyRequired: Boolean(submittedForm.transparencyRequired),
      referenceImage: submittedForm.referenceImage || null,
      autoUpload: Boolean(settings.robloxAssetUploadsEnabled),
    };

    try {
      let response;
      if (submittedForm.mode === "extend") {
        response = await extendAssetPack(submittedForm.packId, payload);
      } else if (submittedForm.mode === "similar") {
        response = await generateSimilarAsset(submittedForm.sourceAssetId, payload);
      } else if (submittedForm.mode === "replacement") {
        response = await replaceAsset(submittedForm.sourceAssetId, payload);
      } else {
        response = await generateAssets(payload);
      }
      applyOperationResponse(response, submittedForm.mode);
      refreshBilling?.();
    } catch (generationError) {
      setError(formatAssetPlatformError(generationError, "Asset generation could not be started."));
    } finally {
      setSubmitting(false);
    }
  };

  const updateOneAsset = async (asset, action, request) => {
    if (!asset?.assetId) return;
    if (action === "retry" && !settings.robloxAssetUploadsEnabled) {
      setError("Auto Upload Assets is off. Enable it before retrying a Roblox write; the Nexus asset remains saved.");
      return;
    }
    setBusyByAsset((current) => ({ ...current, [asset.assetId]: action }));
    setError("");
    try {
      const response = await request(asset.assetId);
      const nextAsset = normalizeAsset(response?.asset || response);
      if (nextAsset.assetId) {
        setResultAssets((current) => current.map((entry) => entry.assetId === nextAsset.assetId ? nextAsset : entry));
        setAssets((current) => current.map((entry) => entry.assetId === nextAsset.assetId ? nextAsset : entry));
      }
      setNotice(action === "retry" ? "Roblox upload retry queued. The Nexus asset remains available while it runs." : "Asset status refreshed.");
    } catch (actionError) {
      setError(formatAssetPlatformError(actionError, action === "retry" ? "Roblox upload could not be retried." : "Asset status could not be refreshed."));
    } finally {
      setBusyByAsset((current) => ({ ...current, [asset.assetId]: "" }));
    }
  };

  const prepareMode = (mode, assetOrPack) => {
    setForm((current) => ({
      ...current,
      mode,
      packId: mode === "extend" ? assetOrPack.packId : current.packId,
      sourceAssetId: mode === "similar" || mode === "replacement" ? assetOrPack.assetId : current.sourceAssetId,
      prompt: mode === "replacement" && !current.prompt ? `Create an improved replacement for ${assetOrPack.name}.` : current.prompt,
    }));
    formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!authReady || !user || (loading && !projects.length && !assets.length)) {
    return (
      <main className="asset-platform-page">
        <div className="asset-platform-shell">
          <header className="asset-platform-header"><div><p className="asset-eyebrow"><Sparkles /> Nexus asset platform</p><h1>Asset workspace</h1><p>Loading your project, Roblox connection, and canonical asset records.</p></div></header>
          <AssetGridSkeleton count={6} label="Loading asset workspace" />
        </div>
      </main>
    );
  }

  return (
    <main className="asset-platform-page">
      <div className="asset-platform-shell">
        <header className="asset-platform-header">
          <div>
            <p className="asset-eyebrow"><Sparkles aria-hidden="true" /> Nexus asset platform</p>
            <h1>Icon Studio</h1>
            <p>Create a single asset or a coherent pack, preserve its generation lineage, and track every Roblox upload and moderation outcome without leaving Nexus.</p>
          </div>
          <div className="asset-platform-header__actions">
            <Button variant="ghost" icon={Library} onClick={() => navigate("/assets")}>Asset library</Button>
            <Button variant="ghost" icon={Settings} onClick={() => navigate("/settings?tab=roblox")}>Roblox settings</Button>
          </div>
        </header>

        <AssetContextBar
          projects={projects}
          universes={universes}
          selectedProjectId={selectedProjectId}
          selectedUniverseId={selectedUniverseId}
          onProjectChange={changeProject}
          onUniverseChange={setSelectedUniverseId}
          connection={connection}
          credits={totalRemaining}
          autoUpload={Boolean(settings.robloxAssetUploadsEnabled)}
          autoUploadBusy={settingsLoading || autoUploadBusy}
          onAutoUploadChange={ASSET_PLATFORM_WRITES_ENABLED ? changeAutoUpload : undefined}
          costEstimate={costEstimate}
          controlsDisabled={!ASSET_PLATFORM_WRITES_ENABLED}
        />

        {!ASSET_PLATFORM_WRITES_ENABLED ? <div className="asset-inline-notice" role="status">Read-only preview: generation, upload, replacement, visibility, and settings writes remain disabled until the Prompt 3 operation ledger is in place.</div> : null}
        {error ? <div className="asset-inline-notice asset-inline-notice--error" role="alert">{error}</div> : null}
        {notice ? <div className="asset-inline-notice asset-inline-notice--success" role="status">{notice}</div> : null}

        <div className="asset-generator-layout" style={{ marginTop: error || notice ? 14 : 0 }}>
          <section className="asset-generator-panel" ref={formPanelRef}>
            <div className="asset-panel-heading">
              <div><h2>Generation brief</h2><p>Every request creates durable records before optional Roblox upload.</p></div>
            </div>
            <AssetGenerationForm
              value={form}
              onChange={setForm}
              onSubmit={submitGeneration}
              submitting={submitting}
              disabled={!ASSET_PLATFORM_WRITES_ENABLED}
              packs={packs}
              assets={assets}
              styleProfiles={styleProfiles}
              unsupportedModes={unsupportedModes}
              costEstimate={costEstimate}
            />
            <div style={{ marginTop: 14 }}><AssetStyleSummary profile={selectedStyleProfile} compact /></div>
          </section>

          <section className="asset-results-panel" aria-live="polite">
            {operation?.operationId ? (
              <div className="asset-operation-banner">
                <Clock aria-hidden="true" />
                <span><strong>Operation {operation.state}</strong> · {operation.operationId}</span>
                {operation.state === "paused" ? <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setOperation((current) => current ? { ...current, state: "running" } : current)}>Resume updates</Button> : null}
              </div>
            ) : null}
            {error && !resultAssets.length && !currentPack && !loading ? (
              <AssetErrorState message={error} onRetry={() => loadWorkspace(selectedProjectId)} />
            ) : (
              <AssetPackGrid
                pack={currentPack}
                assets={resultAssets}
                loading={submitting && !resultAssets.length}
                busyByAsset={busyByAsset}
                onExtend={ASSET_PLATFORM_WRITES_ENABLED ? (pack) => prepareMode("extend", pack) : undefined}
                onOpenAsset={(asset) => navigate(`/assets/${encodeURIComponent(asset.assetId)}`)}
                onRetryUpload={ASSET_PLATFORM_WRITES_ENABLED ? (asset) => updateOneAsset(asset, "retry", retryAssetUpload) : undefined}
                onPoll={ASSET_PLATFORM_WRITES_ENABLED ? (asset) => updateOneAsset(asset, "poll", pollAssetStatus) : undefined}
                onSimilar={ASSET_PLATFORM_WRITES_ENABLED ? (asset) => prepareMode("similar", asset) : undefined}
                onReplace={ASSET_PLATFORM_WRITES_ENABLED ? (asset) => prepareMode("replacement", asset) : undefined}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
