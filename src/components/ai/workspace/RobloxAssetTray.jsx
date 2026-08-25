import React, { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, ImageIcon, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lib/icons";

function assetLabel(asset) {
  return asset?.name || asset?.displayName || asset?.assetId || "Roblox asset";
}

function assetType(asset) {
  return asset?.assetType || asset?.kind || asset?.normalizedMetadata?.assetType || "Asset";
}

function assetReference(asset) {
  const id = String(asset?.robloxAssetId || asset?.assetId || "").trim();
  return /^[1-9]\d*$/.test(id) ? `rbxassetid://${id}` : "";
}

function errorMessage(error) {
  if (!error) return "";
  const message = error?.message || error?.summary || String(error);
  return error?.requestId ? `${message} Support ID: ${error.requestId}` : message;
}

function AssetThumbnail({ asset }) {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = asset?.thumbnailUrl || asset?.previewCapabilities?.thumbnailUrl || "";

  useEffect(() => setFailed(false), [thumbnailUrl]);

  return (
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]">
      {thumbnailUrl && !failed ? (
        <img
          src={thumbnailUrl}
          alt={`${assetLabel(asset)} preview`}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div role="img" aria-label={`${assetLabel(asset)} preview unavailable`} className="flex flex-col items-center gap-1 text-[var(--ds-text-muted)]">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px]">Preview unavailable</span>
        </div>
      )}
    </div>
  );
}

export default function RobloxAssetTray({
  projectId,
  assets = [],
  loading = false,
  saving = false,
  error = null,
  robloxConnected = false,
  onRefresh,
  onRemove,
  notify,
}) {
  const [copiedAssetId, setCopiedAssetId] = useState("");
  const [confirmRemovalAssetId, setConfirmRemovalAssetId] = useState("");
  const [removingAssetId, setRemovingAssetId] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setCopiedAssetId("");
    setConfirmRemovalAssetId("");
    setLocalError("");
  }, [projectId]);

  const copyAssetReference = useCallback(async (asset) => {
    const reference = assetReference(asset);
    if (!reference || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setLocalError("Clipboard access is unavailable. Copy the Roblox asset ID manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reference);
      setLocalError("");
      setCopiedAssetId(asset.assetId);
    } catch {
      setLocalError("Clipboard access was denied. Copy the Roblox asset ID manually.");
    }
  }, []);

  const removeAsset = useCallback(async (asset) => {
    if (!onRemove || !asset?.assetId) return;
    if (confirmRemovalAssetId !== asset.assetId) {
      setConfirmRemovalAssetId(asset.assetId);
      return;
    }

    setRemovingAssetId(asset.assetId);
    setLocalError("");
    try {
      await onRemove(asset.assetId);
      setConfirmRemovalAssetId("");
      notify?.({ type: "success", message: `${assetLabel(asset)} removed from this chat` });
    } catch (removeError) {
      const message = errorMessage(removeError) || "The asset could not be removed from this chat.";
      setLocalError(message);
      notify?.({ type: "error", message });
    } finally {
      setRemovingAssetId("");
    }
  }, [confirmRemovalAssetId, notify, onRemove]);

  const visibleError = localError || errorMessage(error);
  const busy = saving || Boolean(removingAssetId);

  return (
    <section
      className="mx-3 mb-3 overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]"
      aria-labelledby="attached-project-assets-heading"
      aria-busy={loading || busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[var(--ds-text-muted)]" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="attached-project-assets-heading" className="text-[11px] font-black uppercase tracking-widest text-[var(--ds-text)]">
              Attached Roblox assets
            </h2>
            <div className="truncate text-[10px] text-[var(--ds-text-muted)]">
              {projectId ? `${assets.length} attached to this chat` : "Open a chat to attach assets"}
            </div>
          </div>
        </div>
        {projectId && onRefresh ? (
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading || busy}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            title="Refresh attached assets"
            aria-label="Refresh attached assets"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>

      {!projectId ? (
        <div className="px-5 py-8 text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-[var(--ds-text-muted)]" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-[var(--ds-text-secondary)]">No active chat</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">Start or open a chat before collecting Roblox assets.</p>
        </div>
      ) : null}

      {projectId && !robloxConnected && assets.length ? (
        <div className="border-b border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ds-warning)]">
          These assets remain attached. Reconnect Roblox to browse or upload more.
        </div>
      ) : null}

      {visibleError ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--ds-danger)]" role="alert">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{visibleError}</span>
          {projectId && onRefresh ? (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={loading || busy}
              className="min-h-[44px] cursor-pointer rounded-md border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] px-3 text-[10px] font-bold transition-colors hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {projectId && loading && assets.length === 0 ? (
        <div className="px-3 py-8 text-center text-[11px] text-[var(--ds-text-secondary)]" role="status">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading attached assets…
        </div>
      ) : null}

      {projectId && !loading && !visibleError && assets.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-[var(--ds-text-muted)]" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-[var(--ds-text-secondary)]">No Roblox assets attached yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">Upload a decal above or use Store to attach an existing Roblox asset.</p>
        </div>
      ) : null}

      {assets.length ? (
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {assets.map((asset) => {
            const reference = assetReference(asset);
            const confirmingRemoval = confirmRemovalAssetId === asset.assetId;
            const removing = removingAssetId === asset.assetId;
            return (
              <article key={asset.assetId} className="min-w-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2">
                <AssetThumbnail asset={asset} />
                <div className="mt-2 min-w-0">
                  <div className="truncate text-[11px] font-bold text-[var(--ds-text)]" title={assetLabel(asset)}>{assetLabel(asset)}</div>
                  <div className="truncate text-[10px] text-[var(--ds-text-muted)]">{assetType(asset)} · {asset.assetId}</div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => copyAssetReference(asset)}
                    disabled={!reference}
                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-md border border-[var(--ds-border-subtle)] px-2 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
                    aria-label={copiedAssetId === asset.assetId
                      ? `${assetLabel(asset)} Roblox asset URI copied`
                      : `Copy ${assetLabel(asset)} Roblox asset URI`}
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    {copiedAssetId === asset.assetId ? "Copied" : "Copy URI"}
                  </button>
                  {asset.openUrl ? (
                    <a
                      href={asset.openUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-md border border-[var(--ds-border-subtle)] px-2 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                      aria-label={`Open ${assetLabel(asset)} on Roblox`}
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      Roblox
                    </a>
                  ) : <span />}
                </div>

                {onRemove ? (
                  <div className="mt-2 flex items-center gap-2">
                    {confirmingRemoval ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRemovalAssetId("")}
                        disabled={removing}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-md border border-[var(--ds-border-subtle)] px-2 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeAsset(asset)}
                      disabled={busy && !removing}
                      className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] px-2 text-[10px] font-bold text-[var(--ds-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
                      aria-label={confirmingRemoval ? `Confirm removing ${assetLabel(asset)}` : `Remove ${assetLabel(asset)} from this chat`}
                    >
                      {removing ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3 w-3" aria-hidden="true" />}
                      {removing ? "Removing" : confirmingRemoval ? "Confirm remove" : "Remove"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only" role="status" aria-live="polite">
        {copiedAssetId ? `${assetLabel(assets.find((asset) => asset.assetId === copiedAssetId))} Roblox asset URI copied.` : ""}
      </span>
    </section>
  );
}
