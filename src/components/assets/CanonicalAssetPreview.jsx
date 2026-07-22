import React, { useEffect, useState } from "react";
import { ImageIcon } from "../../lib/icons";
import { getAssetFileBlob } from "../../lib/assetPlatformApi";

export default function CanonicalAssetPreview({
  asset,
  role = "preview",
  alt,
  className = "",
  imageClassName = "",
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const assetId = String(asset?.assetId || "");
  const projectId = String(asset?.sourceProjectId || asset?.projectId || "");
  const universeId = String(asset?.universeId || "");

  useEffect(() => {
    if (!assetId) {
      setObjectUrl("");
      setFailed(false);
      return undefined;
    }

    const controller = new AbortController();
    let nextObjectUrl = "";
    setObjectUrl("");
    setFailed(false);
    getAssetFileBlob(assetId, role, {
      signal: controller.signal,
      projectId,
      universeId,
    }).then((blob) => {
      if (controller.signal.aborted) return;
      nextObjectUrl = URL.createObjectURL(blob);
      setObjectUrl(nextObjectUrl);
    }).catch((error) => {
      if (error?.name !== "AbortError" && !controller.signal.aborted) setFailed(true);
    });

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [assetId, projectId, role, universeId]);

  return (
    <div className={className}>
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={alt || `${asset?.name || "Asset"} preview`}
          className={imageClassName}
          loading="lazy"
        />
      ) : (
        <div
          className="asset-card__placeholder"
          role="img"
          aria-busy={!failed}
          aria-label={failed ? "Asset preview is unavailable" : "Asset preview is loading"}
        >
          <ImageIcon aria-hidden="true" />
          <span>{failed ? "Preview unavailable" : "Preview loading"}</span>
        </div>
      )}
    </div>
  );
}
