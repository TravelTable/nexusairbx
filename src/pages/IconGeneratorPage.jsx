import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Library, Settings, Sparkles } from "../lib/icons";
import { Button } from "../components/ui";
import AssetContextBar from "../components/assets/AssetContextBar";
import AssetGenerationForm, { DEFAULT_ASSET_GENERATION_FORM } from "../components/assets/AssetGenerationForm";
import AssetPackGrid from "../components/assets/AssetPackGrid";
import AssetStyleSummary from "../components/assets/AssetStyleSummary";
import { AssetErrorState, AssetGridSkeleton } from "../components/assets/AssetCollectionState";
import {
  canAssetPlatformAction,
  createAssetOperationKey,
  formatAssetPlatformError,
  generateAsset,
  generateAssetPack,
  generateAssetVariation,
  getAsset,
  getAssetPlatformCapabilities,
  getAssetPlatformContext,
  getRobloxUploadStatus,
  listAssetPacks,
  listAssets,
  listStyleProfiles,
  normalizeAsset,
  normalizePack,
  publishAssetToRoblox,
} from "../lib/assetPlatformApi";
import { getRobloxOAuthStatus } from "../lib/robloxOAuthApi";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import "../components/assets/assetPlatform.css";

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

function responseOutput(response) {
  const output = response?.output || response?.result || response || {};
  const data = output?.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? { ...output, ...data }
    : output;
}

function operationState(response) {
  const output = responseOutput(response);
  return String(output?.operationState || output?.operation?.lifecycle || output?.operation?.status || output?.lifecycle || output?.status || "succeeded").toLowerCase();
}

function responseAssets(response) {
  const output = responseOutput(response);
  const collection = output?.assets || output?.operation?.assets || output?.items;
  if (Array.isArray(collection)) return collection.map(normalizeAsset);
  const single = output?.asset || response?.asset;
  return single ? [normalizeAsset(single)] : [];
}

function responsePack(response) {
  const output = responseOutput(response);
  const pack = output?.pack || output?.operation?.pack;
  return pack ? normalizePack(pack) : null;
}

function generationActionForMode(mode) {
  if (mode === "pack" || mode === "extend") return "generate_asset_pack";
  if (mode === "similar" || mode === "replacement") return "generate_asset_variation";
  return "generate_asset";
}

function generationStyle(form) {
  return {
    ...(form.styleProfileId ? { styleProfileId: form.styleProfileId } : {}),
    artworkMode: form.artworkMode,
    backgroundMode: form.backgroundMode,
    transparencyRequired: Boolean(form.transparencyRequired),
  };
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

  const projects = useMemo(() => getProjects(context), [context]);
  const universes = useMemo(() => getUniverses(context, selectedProjectId), [context, selectedProjectId]);
  const capabilities = useMemo(() => getAssetPlatformCapabilities(context), [context]);
  const canGenerateAsset = canAssetPlatformAction(capabilities, "generate_asset");
  const canGeneratePack = canAssetPlatformAction(capabilities, "generate_asset_pack");
  const canGenerateVariation = canAssetPlatformAction(capabilities, "generate_asset_variation");
  const canPublishAsset = canAssetPlatformAction(capabilities, "publish_asset_to_roblox");
  const canGetUploadStatus = canAssetPlatformAction(capabilities, "get_roblox_upload_status");
  const canGenerateAny = canGenerateAsset || canGeneratePack || canGenerateVariation;
  const unsupportedModes = useMemo(() => Array.from(new Set([
    ...unsupportedModesFromContext(context),
    ...(!canGenerateAsset ? ["single"] : []),
    ...(!canGeneratePack ? ["pack", "extend"] : []),
    ...(!canGenerateVariation ? ["similar", "replacement"] : []),
  ])), [context, canGenerateAsset, canGeneratePack, canGenerateVariation]);
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
    if (!canPublishAsset) return;
    setAutoUploadBusy(true);
    setError("");
    const result = await updateSettings({ robloxAssetUploadsEnabled: checked });
    if (!result?.ok) setError(result?.error || "The auto-upload preference could not be saved.");
    setAutoUploadBusy(false);
  };

  const applyOperationResponse = (response, submittedMode) => {
    const output = responseOutput(response);
    const nextAssets = responseAssets(response);
    const nextPack = responsePack(response);
    const operationId = String(output?.operationId || output?.operation?.operationId || output?.operation?.id || "");
    const state = operationState(response);
    setResultAssets(nextAssets);
    setAssets((current) => mergeAssets(current, nextAssets));
    if (nextPack) {
      setCurrentPack(nextPack);
      setPacks((current) => {
        const others = current.filter((pack) => pack.packId !== nextPack.packId);
        return [nextPack, ...others];
      });
    } else if (output?.packId) {
      setCurrentPack(packs.find((pack) => pack.packId === output.packId) || null);
    } else if (submittedMode === "single" || submittedMode === "similar" || submittedMode === "replacement") {
      setCurrentPack(null);
    }
    setOperation(operationId ? { operationId, state } : null);
    setNotice(nextAssets.length
      ? `Generated ${nextAssets.length} asset${nextAssets.length === 1 ? "" : "s"} and saved ${nextAssets.length === 1 ? "it" : "them"} to NexusRBX.`
      : output?.summary || "Generation completed.");
    return nextAssets;
  };

  const submitGeneration = async (submittedForm) => {
    const actionName = generationActionForMode(submittedForm.mode);
    if (!canAssetPlatformAction(capabilities, actionName)) {
      setError("This generation mode is not enabled for the current project and connection.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    const conceptNames = submittedForm.conceptNames
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter(Boolean);
    const referenceAssetIds = submittedForm.referenceAssetId ? [submittedForm.referenceAssetId] : [];
    const commonPayload = {
      idempotencyKey: createAssetOperationKey(),
      projectId: selectedProjectId,
      prompt: submittedForm.prompt.trim(),
      style: generationStyle(submittedForm),
      ...(referenceAssetIds.length ? { referenceAssetIds } : {}),
    };

    try {
      let response;
      if (submittedForm.mode === "pack" || submittedForm.mode === "extend") {
        response = await generateAssetPack({
          ...commonPayload,
          ...(submittedForm.mode === "extend" ? { packId: submittedForm.packId } : {}),
          ...(conceptNames.length
            ? { concepts: conceptNames }
            : { count: Number(submittedForm.requestedCount || 1) }),
        });
      } else if (submittedForm.mode === "similar" || submittedForm.mode === "replacement") {
        response = await generateAssetVariation({
          idempotencyKey: commonPayload.idempotencyKey,
          assetId: submittedForm.sourceAssetId,
          projectId: selectedProjectId,
          prompt: submittedForm.prompt.trim(),
          variationCount: Number(submittedForm.variationCount || 1),
        });
      } else {
        response = await generateAsset({ ...commonPayload, assetType: "icon" });
      }
      const generatedAssets = applyOperationResponse(response, submittedForm.mode);
      refreshBilling?.();

      const publishCandidates = generatedAssets.filter((asset) => asset.assetId);
      if (settings.robloxAssetUploadsEnabled && canPublishAsset && publishCandidates.length) {
        const publishResults = await Promise.allSettled(publishCandidates.map((asset) => publishAssetToRoblox(asset.assetId, {
          idempotencyKey: createAssetOperationKey(),
          projectId: selectedProjectId,
          ...(selectedUniverseId ? { universeId: selectedUniverseId } : {}),
        })));
        const publishedAssets = publishResults
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => responseAssets(result.value));
        if (publishedAssets.length) {
          setResultAssets((current) => mergeAssets(current, publishedAssets));
          setAssets((current) => mergeAssets(current, publishedAssets));
        }
        const failed = publishResults.filter((result) => result.status === "rejected");
        if (failed.length) {
          setError(`${formatAssetPlatformError(failed[0].reason, "Roblox publishing could not be started.")} ${generatedAssets.length === 1 ? "The generated asset remains" : "All generated assets remain"} saved in NexusRBX.`);
          setNotice(`${publishResults.length - failed.length} of ${publishResults.length} Roblox publish request${publishResults.length === 1 ? "" : "s"} started.`);
        } else {
          setNotice(`${publishResults.length} Roblox publish request${publishResults.length === 1 ? "" : "s"} started. Generated assets remain available while Roblox processes them.`);
        }
      }
    } catch (generationError) {
      setError(formatAssetPlatformError(generationError, "Asset generation could not be started."));
    } finally {
      setSubmitting(false);
    }
  };

  const updateOneAsset = async (asset, actionName, busyKey, request, {
    requiresUploadConsent = false,
    successMessage = "Asset updated.",
    failureMessage = "The asset action could not be completed.",
  } = {}) => {
    if (!asset?.assetId) return;
    if (!canAssetPlatformAction(capabilities, actionName)) {
      setError("This asset action is not enabled for the current project and connection.");
      return;
    }
    if (requiresUploadConsent && !settings.robloxAssetUploadsEnabled) {
      setError("Auto Upload Assets is off. Enable it before retrying a Roblox write; the Nexus asset remains saved.");
      return;
    }
    setBusyByAsset((current) => ({ ...current, [asset.assetId]: busyKey }));
    setError("");
    setNotice("");
    try {
      const response = await request();
      const returnedAssets = responseAssets(response);
      let nextAsset = returnedAssets.find((entry) => entry.assetId === asset.assetId) || returnedAssets[0];
      if (!nextAsset) {
        const refreshed = await getAsset(asset.assetId);
        nextAsset = refreshed.asset;
      }
      if (nextAsset?.assetId) {
        setResultAssets((current) => mergeAssets(current, [nextAsset]));
        setAssets((current) => mergeAssets(current, [nextAsset]));
      }
      setNotice(successMessage);
    } catch (actionError) {
      setError(formatAssetPlatformError(actionError, failureMessage));
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
          autoUploadDisabled={!canPublishAsset}
          onAutoUploadChange={canPublishAsset ? changeAutoUpload : undefined}
          costEstimate={costEstimate}
          controlsDisabled={!capabilities.reads}
        />

        {!canGenerateAny ? <div className="asset-inline-notice" role="status">Your existing assets remain available. Generation controls will appear when this server grants an exact asset-generation capability.</div> : null}
        {canGenerateAny && settings.robloxAssetUploadsEnabled && !canPublishAsset ? <div className="asset-inline-notice" role="status">Assets can be generated and saved in NexusRBX, but Roblox publishing is unavailable for this connection.</div> : null}
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
              disabled={!canGenerateAny}
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
                onExtend={canGeneratePack ? (pack) => prepareMode("extend", pack) : undefined}
                onOpenAsset={(asset) => navigate(`/assets/${encodeURIComponent(asset.assetId)}`)}
                onRetryUpload={canPublishAsset ? (asset) => updateOneAsset(
                  asset,
                  "publish_asset_to_roblox",
                  "retry",
                  () => publishAssetToRoblox(asset.assetId, {
                    idempotencyKey: createAssetOperationKey(),
                    projectId: selectedProjectId,
                    ...(selectedUniverseId ? { universeId: selectedUniverseId } : {}),
                  }),
                  {
                    requiresUploadConsent: true,
                    successMessage: "Roblox publishing queued. The Nexus asset remains available while it runs.",
                    failureMessage: "Roblox publishing could not be started.",
                  },
                ) : undefined}
                onPoll={canGetUploadStatus ? (asset) => updateOneAsset(
                  asset,
                  "get_roblox_upload_status",
                  "poll",
                  () => getRobloxUploadStatus(asset.assetId, {
                    ...(asset.robloxOperationId ? { operationId: asset.robloxOperationId } : {}),
                    projectId: selectedProjectId,
                  }),
                  {
                    successMessage: "Roblox processing status refreshed.",
                    failureMessage: "Roblox processing status could not be refreshed.",
                  },
                ) : undefined}
                onSimilar={canGenerateVariation ? (asset) => prepareMode("similar", asset) : undefined}
                onReplace={canGenerateVariation ? (asset) => prepareMode("replacement", asset) : undefined}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
