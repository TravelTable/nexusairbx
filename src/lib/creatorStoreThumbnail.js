import { BACKEND_URL } from "../config";

export function buildCreatorStoreThumbnailCandidates(asset) {
  const seen = new Set();
  const candidates = [];

  const push = (value) => {
    const url = String(value || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push(url);
  };

  push(asset?.thumbnailUrl);
  for (const id of asset?.previewAssetIds || []) {
    push(`${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(id)}&size=420x420`);
  }
  if (asset?.assetId) {
    push(`${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(asset.assetId)}&size=420x420`);
  }

  return candidates;
}
