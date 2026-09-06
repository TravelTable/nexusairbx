import React, { useState } from "react";
import { Button } from "../ui";
import { AnimatedAssetIcon, AnimatedCopyIcon, AnimatedExpandIcon, AnimatedRefreshIcon } from "../ui/AnimatedActionIcon";
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


        <div className="asset-card__actions">
          <details className="asset-card__more"><summary aria-label={`Actions for ${asset?.name || "asset"}`}>More</summary><div>
          {asset?.robloxAssetId ? (
            <Button size="sm" variant="ghost" icon={AnimatedCopyIcon} onClick={copyRobloxId} aria-label={`Copy Roblox asset ID ${asset.robloxAssetId}`}>
              Copy Roblox ID
            </Button>
          ) : null}
          {RETRY_UPLOAD_STATES.has(lifecycle) && onRetryUpload ? (
            <Button size="sm" variant="secondary" icon={AnimatedRefreshIcon} disabled={Boolean(busyAction)} onClick={() => onRetryUpload(asset)}>
              {busyAction === "retry" ? "Retrying…" : "Retry upload"}
            </Button>
          ) : null}
          {(POLL_STATES.has(lifecycle) || POLL_MODERATION_STATES.has(moderation)) && onPoll ? (
            <Button size="sm" variant="ghost" icon={AnimatedRefreshIcon} disabled={Boolean(busyAction)} onClick={() => onPoll(asset)}>
              {busyAction === "poll" ? "Checking…" : "Refresh status"}
            </Button>
          ) : null}
          {onSimilar ? <Button size="sm" variant="subtle" icon={AnimatedAssetIcon} disabled={Boolean(busyAction)} onClick={() => onSimilar(asset)}>Similar</Button> : null}
          {onReplace ? <Button size="sm" variant="subtle" icon={AnimatedRefreshIcon} disabled={Boolean(busyAction)} onClick={() => onReplace(asset)}>Replace</Button> : null}
          </div></details>
          {onOpen ? <Button size="sm" variant="ghost" iconRight={AnimatedExpandIcon} onClick={() => onOpen(asset)}>Open asset</Button> : null}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{copyStatus}</span>
      </div>
    </article>
  );
}
