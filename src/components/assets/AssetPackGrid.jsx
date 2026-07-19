import React from "react";
import { Package, Plus } from "../../lib/icons";
import { Button } from "../ui";
import AssetCard from "./AssetCard";
import AssetLifecycleBadge from "./AssetLifecycleBadge";
import { AssetEmptyState, AssetGridSkeleton } from "./AssetCollectionState";

export default function AssetPackGrid({
  pack,
  assets = [],
  loading = false,
  busyByAsset = {},
  onExtend,
  onOpenAsset,
  onRetryUpload,
  onPoll,
  onSimilar,
  onReplace,
}) {
  if (loading) return <AssetGridSkeleton count={8} label="Loading generated pack" />;
  const packAssets = assets.length ? assets : pack?.assets || [];

  return (
    <section className="asset-pack" aria-labelledby="asset-pack-title">
      <header className="asset-pack__header">
        <div>
          <p className="asset-eyebrow"><Package aria-hidden="true" /> Current pack</p>
          <div className="asset-pack__title-row">
            <h2 id="asset-pack-title">{pack?.name || "Generated assets"}</h2>
            {pack?.lifecycle ? <AssetLifecycleBadge status={pack.lifecycle} /> : null}
          </div>
          <p>
            {pack?.requestedCount ? `${packAssets.length} of ${pack.requestedCount} assets currently available.` : `${packAssets.length} assets in this result.`}
            {" "}Each card progresses independently through generation, upload, and moderation.
          </p>
        </div>
        {onExtend && pack?.packId ? <Button variant="secondary" icon={Plus} onClick={() => onExtend(pack)}>Extend pack</Button> : null}
      </header>

      {packAssets.length ? (
        <div className="asset-grid">
          {packAssets.map((asset) => (
            <AssetCard
              key={asset.assetId || `${asset.name}-${asset.createdAt}`}
              asset={asset}
              busyAction={busyByAsset[asset.assetId]}
              onOpen={onOpenAsset}
              onRetryUpload={onRetryUpload}
              onPoll={onPoll}
              onSimilar={onSimilar}
              onReplace={onReplace}
            />
          ))}
        </div>
      ) : (
        <AssetEmptyState
          title={pack ? "Pack started" : "Your generated assets will appear here"}
          description={pack ? "The operation was accepted. Asset cards will appear as generation records are created." : "Describe one icon or a coordinated pack, then start generation."}
        />
      )}
    </section>
  );
}
