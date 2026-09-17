import { useEffect, useState } from "react";
import { downloadChatAttachment } from "../../../lib/chatAttachmentApi";

export default function useUiReferencePreview(item) {
  const [src, setSrc] = useState(item?.previewUrl || item?.url || item?.dataUrl || item?.src || "");

  useEffect(() => {
    if (!item) {
      setSrc("");
      return undefined;
    }
    const local = item.previewUrl || item.url || item.dataUrl || item.src;
    if (local) {
      setSrc(local);
      return undefined;
    }
    let revoked = "";
    if (item.retryFile) {
      revoked = URL.createObjectURL(item.retryFile);
      setSrc(revoked);
      return () => URL.revokeObjectURL(revoked);
    }
    if (!item.id || !item.versionId) return undefined;
    let active = true;
    downloadChatAttachment(item, true)
      .then((blob) => {
        if (!active || !(blob instanceof Blob)) return;
        revoked = URL.createObjectURL(blob);
        setSrc(revoked);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [
    item,
    item?.localId,
    item?.id,
    item?.versionId,
    item?.previewUrl,
    item?.url,
    item?.dataUrl,
    item?.src,
    item?.retryFile,
  ]);

  return src;
}
