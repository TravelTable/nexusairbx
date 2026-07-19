import React from "react";
import { ArrowRight, ImageIcon, RefreshCw, RotateCcw, Sparkles } from "../../lib/icons";
import { Button } from "../ui";
import AssetLifecycleBadge from "./AssetLifecycleBadge";

const RETRY_UPLOAD_STATES = new Set(["upload_failed"]);
const POLL_STATES = new Set(["uploading", "submitted", "moderation_pending"]);
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
  const lifecycle = String(asset?.lifecycle || "draft").toLowerCase();
  const moderation = String(asset?.moderation?.state || "").toLowerCase();

  return (
    <article className="asset-card">
      <div className="asset-card__preview">
        {asset?.previewUrl ? (
          <img src={asset.previewUrl} alt={`${asset.name || "Asset"} preview`} loading="lazy" />
        ) : (
          <div className="asset-card__placeholder" aria-label="Preview is not available yet">
            <ImageIcon aria-hidden="true" />
            <span>Preview pending</span>
          </div>
        )}
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
      </div>
    </article>
  );
}
