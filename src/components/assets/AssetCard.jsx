import React, { useState } from "react";
import { ArrowRight, Copy, RefreshCw, RotateCcw, Sparkles } from "../../lib/icons";
import { Button } from "../ui";
import AssetLifecycleBadge from "./AssetLifecycleBadge";
import CanonicalAssetPreview from "./CanonicalAssetPreview";

const RETRY_UPLOAD_STATES = new Set(["upload_failed"]);
const POLL_STATES = new Set([
  "upload_pending",
  "publishing",
  "uploading",
  "submitted",
  "roblox_processing",
  "under_moderation",
  "moderation_pending",
]);
const POLL_MODERATION_STATES = new Set(["pending", "moderation_pending"]);

function shortId(value) {
  const text = String(value || "");
  if (!text) return "Pending assignment";
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}…${text.slice(-6)}`;
}

export default function AssetCard({
  asset,
  busyAction = "",
  onOpen,
  onRetryUpload,
  onPoll,
  onSimilar,
  onReplace,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const lifecycle = String(asset?.lifecycle || "draft").toLowerCase();
  const moderation = String(asset?.moderation?.state || "").toLowerCase();
  const copyRobloxId = async () => {
    if (!asset?.robloxAssetId || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyStatus("Copy is unavailable. Select the Roblox ID in asset details to copy it manually.");
      return;
    }
    try {
      await navigator.clipboard.writeText(String(asset.robloxAssetId));
      setCopyStatus("Roblox asset ID copied.");
    } catch {
      setCopyStatus("Copy failed. Select the Roblox ID in asset details to copy it manually.");
    }
  };

  return (
    <article className="asset-card" aria-busy={Boolean(busyAction)}>
      <div className="asset-card__preview">
        <CanonicalAssetPreview asset={asset} />
        <div className="asset-card__status"><AssetLifecycleBadge status={lifecycle} /></div>
      </div>
      <div className="asset-card__body">
        <div className="asset-card__heading">
          <div>
            <p className="asset-card__kind">{asset?.kind || "icon"}</p>
            <h3>{asset?.name || "Untitled asset"}</h3>
          </div>
          {moderation && moderation !== lifecycle ? <AssetLifecycleBadge status={moderation} /> : null}
        </div>

        <dl className="asset-card__ids">
          <div><dt>Nexus ID</dt><dd title={asset?.assetId || ""}>{shortId(asset?.assetId)}</dd></div>
          <div><dt>Roblox ID</dt><dd title={asset?.robloxAssetId || ""}>{shortId(asset?.robloxAssetId)}</dd></div>
        </dl>

        <div className="asset-card__actions">
          {asset?.robloxAssetId ? (
            <Button size="sm" variant="ghost" icon={Copy} onClick={copyRobloxId} aria-label={`Copy Roblox asset ID ${asset.robloxAssetId}`}>
              Copy Roblox ID
            </Button>
          ) : null}
          {RETRY_UPLOAD_STATES.has(lifecycle) && onRetryUpload ? (
            <Button size="sm" variant="secondary" icon={RotateCcw} disabled={Boolean(busyAction)} onClick={() => onRetryUpload(asset)}>
              {busyAction === "retry" ? "Retrying…" : "Retry upload"}
            </Button>
          ) : null}
          {(POLL_STATES.has(lifecycle) || POLL_MODERATION_STATES.has(moderation)) && onPoll ? (
            <Button size="sm" variant="ghost" icon={RefreshCw} disabled={Boolean(busyAction)} onClick={() => onPoll(asset)}>
              {busyAction === "poll" ? "Checking…" : "Refresh status"}
            </Button>
          ) : null}
          {onSimilar ? <Button size="sm" variant="subtle" icon={Sparkles} disabled={Boolean(busyAction)} onClick={() => onSimilar(asset)}>Similar</Button> : null}
          {onReplace ? <Button size="sm" variant="subtle" icon={RotateCcw} disabled={Boolean(busyAction)} onClick={() => onReplace(asset)}>Replace</Button> : null}
          {onOpen ? <Button size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => onOpen(asset)}>Details</Button> : null}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{copyStatus}</span>
      </div>
    </article>
  );
}
