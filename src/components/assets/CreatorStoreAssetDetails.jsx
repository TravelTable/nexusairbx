import React, { useState } from "react";
import { Check, Copy, ImageIcon, X } from "lucide-react";

function creatorText(creator) {
  if (!creator) return "Unknown creator";
  const name = creator.name || "Unknown creator";
  return creator.type ? `${name} (${creator.type})` : name;
}

export default function CreatorStoreAssetDetails({ asset, loading = false, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!asset && !loading) return null;

  const name = asset?.name || "Creator Store asset";
  const assetId = asset?.assetId || "";

  const copyAssetId = async () => {
    if (!assetId) return;
    await navigator.clipboard?.writeText(assetId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-label="Creator Store asset details">
      <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-[#080a12] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#00bbf9]">Creator Store</div>
            <h2 className="text-base font-black text-white truncate">{loading ? "Loading asset" : name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-white/10 p-2 text-gray-400 hover:bg-white/5 hover:text-white"
            aria-label="Close asset details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          <div className="aspect-square rounded-md border border-white/10 bg-black/35 overflow-hidden flex items-center justify-center">
            {asset?.thumbnailUrl && !imageFailed ? (
              <img
                src={asset.thumbnailUrl}
                alt={`${name} thumbnail`}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <ImageIcon className="w-8 h-8" />
                <span className="text-[10px] font-bold uppercase tracking-wider">No preview</span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-2/3 rounded bg-white/10" />
                <div className="h-20 rounded bg-white/5" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[#00bbf9]/20 bg-[#00bbf9]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#00bbf9]">
                    {asset?.assetType || "Asset"}
                  </span>
                  <span className="text-xs text-gray-500">ID {assetId}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {asset?.description || "No description available."}
                </p>
                <dl className="mt-4 grid gap-3 text-xs">
                  <div>
                    <dt className="font-black uppercase tracking-wider text-gray-500">Creator</dt>
                    <dd className="mt-1 text-gray-200">{creatorText(asset?.creator)}</dd>
                  </div>
                  <div>
                    <dt className="font-black uppercase tracking-wider text-gray-500">Roblox Asset ID</dt>
                    <dd className="mt-1 flex items-center gap-2 text-gray-200">
                      <span>{assetId}</span>
                      <button
                        type="button"
                        onClick={copyAssetId}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-white"
                        aria-label="Copy asset ID"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
