import React, { useEffect, useState } from "react";
import { getAssetFileBlob } from "../../../lib/assetPlatformApi";
import "./UiArtworkFrame.css";

export default function UiArtworkFrame({
  src = "",
  assetId = "",
  projectId = "",
  alt = "Generated artwork",
  className = "",
  generating = false,
}) {
  const [resolved, setResolved] = useState(src || "");

  useEffect(() => {
    if (src) {
      setResolved(src);
      return undefined;
    }
    if (!assetId) {
      setResolved("");
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = "";
    setResolved("");
    getAssetFileBlob(assetId, "preview", {
      signal: controller.signal,
      projectId,
    }).then((blob) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved(objectUrl);
    }).catch(() => {
      if (!controller.signal.aborted) setResolved("");
    });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, projectId, src]);

  if (resolved) {
    return <img src={resolved} alt={alt} className={className} />;
  }

  return (
    <div
      className={`uc-artwork-skeleton ${className}`.trim()}
      role="status"
      aria-busy={generating ? "true" : undefined}
      aria-label={generating ? `${alt} is generating` : alt}
    />
  );
}
