import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, ImageIcon, Loader2, Send, ShieldCheck, X } from "lib/icons";
import { BACKEND_URL } from "../../config";
import {
  getStudioCommand,
  getStudioStatus,
  importCreatorStoreAssetToStudio,
  startStudioPairing,
} from "../../lib/studioBridgeApi";
import { getStudioSessionId, selectPluginStudioSession } from "../../lib/studioConnection";

function creatorText(creator) {
  if (!creator) return "Unknown creator";
  const name = creator.name || "Unknown creator";
  return creator.type ? `${name} (${creator.type})` : name;
}

const TARGET_PARENT_PATH = "Workspace/NexusImports";
const IMPORTABLE_TYPES = new Set(["Model", "Mesh"]);

function importErrorMessage(error) {
  if (error?.code === "THIRD_PARTY_ASSETS_DISABLED") {
    return "Roblox Studio blocked this public Creator Store asset. Open Experience Settings and enable Allow Loading Third Party Assets, then retry.";
  }
  if (error?.code === "STUDIO_SESSION_MISSING") return "Connect the NexusRBX Studio plugin before importing.";
  if (error?.code === "PLUGIN_PROTOCOL_OUTDATED") return "Update the NexusRBX Studio plugin before importing Creator Store assets.";
  if (error?.code === "CREATOR_STORE_REAUTHORIZATION_REQUIRED") return "Reconnect Roblox and grant Creator Store read access before importing.";
  if (error?.code === "UNSUPPORTED_ASSET_TYPE") return "Only Model and Mesh assets can be imported to Studio.";
  return error?.message || "Creator Store import failed.";
}

function commandFailure(command) {
  const result = command?.result || {};
  const error = result?.error || command?.error || {};
  return {
    code: result.code || error.code || null,
    message: result.message || error.message || command?.error || "Creator Store import failed.",
  };
}

export default function CreatorStoreAssetDetails({ asset, loading = false, onClose, notify }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [studioChecking, setStudioChecking] = useState(false);
  const [studioSession, setStudioSession] = useState(null);
  const [pairingCode, setPairingCode] = useState("");
  const [importState, setImportState] = useState("idle");
  const [confirming, setConfirming] = useState(false);
  const [commandId, setCommandId] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [importError, setImportError] = useState(null);
  const pollTimerRef = useRef(null);

  const name = asset?.name || "Creator Store asset";
  const assetId = asset?.assetId || "";
  const previewAssetId = asset?.previewAssetIds?.[0] || assetId;
  const thumbnailUrl =
    asset?.thumbnailUrl ||
    (previewAssetId
      ? `${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(previewAssetId)}&size=420x420`
      : null);
  const canImportAsset = IMPORTABLE_TYPES.has(asset?.assetType);
  const studioSessionId = getStudioSessionId(studioSession);
  const studioConnected = Boolean(studioSessionId);

  useEffect(() => {
    let cancelled = false;
    if (!asset || loading) return undefined;
    setStudioChecking(true);
    getStudioStatus()
      .then((status) => {
        if (cancelled) return;
        setStudioSession(selectPluginStudioSession(status.sessions));
      })
      .catch(() => {
        if (!cancelled) setStudioSession(null);
      })
      .finally(() => {
        if (!cancelled) setStudioChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [asset, loading]);

  useEffect(() => () => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
  }, []);

  if (!asset && !loading) return null;

  const copyAssetId = async () => {
    if (!assetId) return;
    await navigator.clipboard?.writeText(assetId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const pairStudio = async () => {
    try {
      const pair = await startStudioPairing();
      setPairingCode(pair.code || "");
      notify?.({ type: "info", message: pair.code ? `Studio pairing code: ${pair.code}` : "Studio pairing started" });
    } catch (err) {
      setImportError({ message: err?.message || "Failed to start Studio pairing" });
    }
  };

  const pollCommand = (id) => {
    if (!id) return;
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const command = await getStudioCommand(id);
        if (command.status === "succeeded") {
          setReceipt(command.result || null);
          setImportState("succeeded");
          return;
        }
        if (command.status === "failed") {
          setImportError(commandFailure(command));
          setImportState("failed");
          return;
        }
        setImportState(command.status === "delivered" ? "waiting_for_studio" : "queued");
        pollCommand(id);
      } catch (err) {
        setImportError({ message: err?.message || "Failed to read Studio import result" });
        setImportState("failed");
      }
    }, 1500);
  };

  const queueImport = async () => {
    if (!assetId || !studioConnected || importState === "queueing") return;
    setImportState("queueing");
    setImportError(null);
    setReceipt(null);
    try {
      const queued = await importCreatorStoreAssetToStudio({
        assetId,
        sessionId: studioSessionId,
        targetParentPath: TARGET_PARENT_PATH,
        requestedName: name,
        placement: { mode: "camera_focus" },
      });
      setCommandId(queued.commandId || "");
      setConfirming(false);
      setImportState("queued");
      pollCommand(queued.commandId);
    } catch (err) {
      setImportError(err);
      setImportState("failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ds-bg-canvas)_72%,transparent)] px-4 py-6" role="dialog" aria-modal="true" aria-label="Creator Store asset details">
      <div className="w-full max-w-3xl overflow-hidden rounded-[14px] bg-[var(--ds-surface-overlay)] shadow-[var(--ds-shadow-overlay)]">
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-[var(--ds-info)]">Creator Store</div>
            <h2 className="text-base font-black text-[var(--ds-text)] truncate">{loading ? "Loading asset" : name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
            aria-label="Close asset details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-6 p-6 pt-2 md:grid-cols-[240px_1fr]">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[12px] bg-[var(--ds-bg-workspace)]">
            {thumbnailUrl && !imageFailed ? (
              <img
                src={thumbnailUrl}
                alt={`${name} thumbnail`}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--ds-text-muted)]">
                <ImageIcon className="w-8 h-8" />
                <span className="text-[10px] font-bold uppercase tracking-wider">No preview</span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-2/3 rounded bg-[var(--ds-fill-active)]" />
                <div className="h-20 rounded bg-[var(--ds-fill-subtle)]" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[color-mix(in_srgb,var(--ds-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_8%,transparent)] px-2 py-1 text-[10px] font-semibold text-[var(--ds-info)]">
                    {asset?.assetType || "Asset"}
                  </span>
                  <span className="text-xs text-[var(--ds-text-muted)]">ID {assetId}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                  {asset?.description || "No description available."}
                </p>
                <dl className="mt-4 grid gap-3 text-xs">
                  <div>
                    <dt className="font-semibold text-[var(--ds-text-muted)]">Creator</dt>
                    <dd className="mt-1 text-[var(--ds-text-secondary)]">{creatorText(asset?.creator)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--ds-text-muted)]">Roblox Asset ID</dt>
                    <dd className="mt-1 flex items-center gap-2 text-[var(--ds-text-secondary)]">
                      <span>{assetId}</span>
                      <button
                        type="button"
                        onClick={copyAssetId}
                        className="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-2 py-1 text-[11px] font-semibold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                        aria-label="Copy asset ID"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </dd>
                  </div>
                </dl>
                {canImportAsset && (
                  <div className="mt-6 rounded-[14px] bg-[var(--ds-fill-subtle)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-xs text-[var(--ds-text-secondary)]">
                        <div className="font-semibold text-[var(--ds-text-muted)]">Studio import</div>
                        <div className="mt-1">
                          {studioConnected
                            ? `Target: ${TARGET_PARENT_PATH}`
                            : studioChecking
                              ? "Checking Studio connection..."
                              : "Connect the NexusRBX Studio plugin before importing."}
                        </div>
                        {pairingCode && <div className="mt-1 font-mono text-[var(--ds-info)]">Pairing code: {pairingCode}</div>}
                      </div>
                      {studioConnected ? (
                        <button
                          type="button"
                          onClick={() => setConfirming(true)}
                          disabled={importState === "queueing" || importState === "queued" || importState === "waiting_for_studio"}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--ds-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_8%,transparent)] px-3 py-2 text-[11px] font-semibold text-[var(--ds-info)] hover:bg-[color-mix(in_srgb,var(--ds-info)_14%,transparent)] disabled:opacity-40"
                        >
                          {importState === "queueing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Import to Studio
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={pairStudio}
                          className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-[11px] font-semibold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                        >
                          Pair Studio
                        </button>
                      )}
                    </div>
                    {["queued", "waiting_for_studio"].includes(importState) && (
                      <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ds-text-secondary)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {importState === "queued" ? "Queued for Studio plugin." : "Waiting for Studio to finish the import."}
                      </div>
                    )}
                    {importState === "succeeded" && receipt && (
                      <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--ds-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_8%,transparent)] p-3 text-[12px] text-[var(--ds-success)]">
                        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Import queued and applied</div>
                        <div className="mt-2">Inserted: {receipt.insertedName || name}</div>
                        {(receipt.insertedPath || receipt.insertedRootPath) && <div className="mt-1">Path: {receipt.insertedPath || receipt.insertedRootPath}</div>}
                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                          <span>Scripts removed: {receipt.removed?.scripts ?? receipt.scan?.scriptsRemoved ?? 0}</span>
                          <span>Networking removed: {(receipt.removed?.remotes ?? receipt.scan?.remoteObjectsRemoved ?? 0) + (receipt.removed?.bindables ?? receipt.scan?.bindableObjectsRemoved ?? 0)}</span>
                        </div>
                        {receipt.warnings?.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            {receipt.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                    {importState === "failed" && importError && (
                      <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] p-3 text-[12px] text-[var(--ds-danger)]">
                        {importErrorMessage(importError)}
                        {studioConnected && (
                          <button
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="mt-2 block min-h-11 rounded-[10px] border border-[color-mix(in_srgb,var(--ds-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] px-3 py-2 text-[11px] font-semibold hover:bg-[color-mix(in_srgb,var(--ds-danger)_14%,transparent)]"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                    {commandId && <div className="mt-2 text-[10px] text-[var(--ds-text-muted)]">Command {commandId}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[color-mix(in_srgb,var(--ds-bg-canvas)_76%,transparent)] px-4 py-6" role="dialog" aria-modal="true" aria-label="Confirm Creator Store import">
          <div className="w-full max-w-md rounded-[14px] bg-[var(--ds-surface-overlay)] p-6 shadow-[var(--ds-shadow-overlay)]">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]">
                {thumbnailUrl && !imageFailed ? <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-[var(--ds-text)]">Import safely</h3>
                <div className="mt-1 text-xs text-[var(--ds-text-secondary)]">{name}</div>
                <div className="mt-1 text-[11px] text-[var(--ds-text-muted)]">{creatorText(asset?.creator)} · ID {assetId}</div>
              </div>
            </div>
            <dl className="mt-4 grid gap-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-[var(--ds-text-muted)]">Target</dt><dd className="text-[var(--ds-text-secondary)]">{TARGET_PARENT_PATH}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--ds-text-muted)]">Sanitization</dt><dd className="text-[var(--ds-text-secondary)]">Strict</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-[var(--ds-text-secondary)]">
              NexusRBX removes scripts and networking objects before placing this asset in your project.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-full border border-[var(--ds-border)] bg-transparent px-4 py-2 text-[11px] font-semibold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)]">
                Cancel
              </button>
              <button type="button" onClick={queueImport} disabled={importState === "queueing"} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ds-accent)] px-4 py-2 text-[11px] font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-40">
                {importState === "queueing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Import safely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
