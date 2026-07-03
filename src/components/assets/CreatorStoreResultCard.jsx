import React, { useState } from "react";
import { Eye, ImageIcon } from "lib/icons";
import { BACKEND_URL } from "../../config";

function creatorLabel(creator) {
  return creator?.name || (creator?.id ? `${creator.type || "Creator"} ${creator.id}` : "Unknown creator");
}

export default function CreatorStoreResultCard({ asset, onViewDetails }) {
  const name = asset?.name || `Asset ${asset?.assetId || ""}`.trim();
  const description = asset?.description || "";
  const thumbnailCandidates = [
    asset?.thumbnailUrl,
    ...(asset?.previewAssetIds || []).map(
      (id) =>
        `${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(id)}&size=420x420`
    ),
    asset?.assetId
      ? `${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(asset.assetId)}&size=420x420`
      : null,
  ].filter(Boolean);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const thumbnailUrl = thumbnailCandidates[thumbnailIndex] || null;

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col min-h-[260px]">
      <div className="aspect-square bg-black/35 border-b border-white/10 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${name} thumbnail`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setThumbnailIndex((current) => current + 1)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              No preview
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-black text-white leading-tight line-clamp-2">{name}</h3>
          <span className="shrink-0 rounded border border-[#00bbf9]/20 bg-[#00bbf9]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#00bbf9]">
            {asset?.assetType || "Asset"}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-gray-400 truncate">{creatorLabel(asset?.creator)}</div>
        {description ? (
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500 line-clamp-3">{description}</p>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-gray-600">No description available.</p>
        )}
        <button
          type="button"
          onClick={() => onViewDetails?.(asset)}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-white"
          aria-label={`View details for ${name}`}
        >
          <Eye className="w-3.5 h-3.5" />
          View details
        </button>
      </div>
    </article>
  );
}
