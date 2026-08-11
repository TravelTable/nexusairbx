import React, { useMemo, useState } from "react";
import { Eye, ImageIcon } from "lib/icons";
import { buildCreatorStoreThumbnailCandidates } from "../../lib/creatorStoreThumbnail";

function creatorLabel(creator) {
  return creator?.name || (creator?.id ? `${creator.type || "Creator"} ${creator.id}` : "Unknown creator");
}

export default function CreatorStoreResultCard({ asset, onViewDetails }) {
  const name = asset?.name || `Asset ${asset?.assetId || ""}`.trim();
  const description = asset?.description || "";
  const thumbnailCandidates = useMemo(
    () => buildCreatorStoreThumbnailCandidates(asset),
    [asset]
  );
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const thumbnailUrl = thumbnailCandidates[thumbnailIndex] || null;

  return (
    <article className="flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)]">
      <div className="flex aspect-square items-center justify-center overflow-hidden border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]">
        {thumbnailUrl ? (
          <img
            key={thumbnailUrl}
            src={thumbnailUrl}
            alt={`${name} thumbnail`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => {
              setThumbnailIndex((current) => (
                current + 1 < thumbnailCandidates.length ? current + 1 : thumbnailCandidates.length
              ));
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--ds-text-muted)]">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              No preview
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-black text-[var(--ds-text)] leading-tight line-clamp-2">{name}</h3>
          <span className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--ds-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_8%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ds-info)]">
            {asset?.assetType || "Asset"}
          </span>
        </div>
        <div className="mt-1 truncate text-[11px] text-[var(--ds-text-secondary)]">{creatorLabel(asset?.creator)}</div>
        {description ? (
          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">{description}</p>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">No description available.</p>
        )}
        <button
          type="button"
          onClick={() => onViewDetails?.(asset)}
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-[11px] font-semibold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
          aria-label={`View details for ${name}`}
        >
          <Eye className="w-3.5 h-3.5" />
          View details
        </button>
      </div>
    </article>
  );
}
