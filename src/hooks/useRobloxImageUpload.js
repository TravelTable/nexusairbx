import { useCallback, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { uploadRobloxDecalBatch } from "../lib/robloxDecalUploadApi";
import { beginRobloxOAuth, beginRobloxReauthorization } from "../lib/robloxOAuthApi";

const ACCEPTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tga"]);
export const ROBLOX_DECAL_ACCEPT = ".png,.jpg,.jpeg,.bmp,.tga,image/png,image/jpeg,image/bmp,image/x-tga,image/tga";
export const UNSUPPORTED_DECAL_IMAGE_MESSAGE = "Use PNG, JPG, BMP, or TGA images for Roblox decals.";

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `decal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function extensionFor(fileName = "") {
  const index = String(fileName).lastIndexOf(".");
  return index >= 0 ? String(fileName).slice(index).toLowerCase() : "";
}

export function isRobloxDecalImage(file) {
  if (!file) return false;
  return ACCEPTED_EXTENSIONS.has(extensionFor(file.name));
}

export function displayNameFor(file) {
  const name = String(file?.name || "NexusRBX Decal");
  const ext = extensionFor(name);
  return name.slice(0, name.length - ext.length).replace(/[_-]+/g, " ").trim().slice(0, 50) || "NexusRBX Decal";
}

export function readinessCheck(robloxStatus) {
  const connected = robloxStatus?.connected === true;
  const selectedCreator = robloxStatus?.connection?.selectedCreator || null;
  const capability =
    robloxStatus?.capabilities?.roblox_upload_asset
    || robloxStatus?.capabilities?.asset_upload
    || null;
  const needsReauthorization =
    capability?.authorized === false || (capability?.missingScopes?.length > 0);

  if (!connected) {
    return {
      ready: false,
      message: "Connect Roblox before uploading images to your account.",
      action: "connect",
    };
  }
  if (needsReauthorization) {
    return {
      ready: false,
      message: "Reauthorize Roblox to grant asset upload access.",
      action: "reauthorize",
    };
  }
  if (!selectedCreator?.id) {
    return {
      ready: false,
      message: "Select a Roblox creator target in Settings before uploading.",
      action: "settings",
    };
  }
  return { ready: true, message: null, action: null };
}

export function useRobloxImageUpload({
  user,
  robloxStatus,
  currentChatId,
  openChatById,
  onRefreshProjectAssets,
  notify,
  onSignInRequired,
}) {
  const [uploading, setUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState([]);

  const ensureChatForUpload = useCallback(async () => {
    if (currentChatId) return currentChatId;
    if (!user) throw new Error("Sign in required");
    const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
      title: "Asset upload",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    openChatById?.(newChatRef.id);
    return newChatRef.id;
  }, [currentChatId, openChatById, user]);

  const uploadImages = useCallback(async (files) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return { ok: false };

    if (!user) {
      onSignInRequired?.();
      return { ok: false, reason: "auth_required" };
    }

    const readiness = readinessCheck(robloxStatus);
    if (!readiness.ready) {
      notify?.({ message: readiness.message, type: "info" });
      if (readiness.action === "connect") {
        try {
          await beginRobloxOAuth({ bundles: ["core"], returnPath: "/ai" });
        } catch (err) {
          notify?.({ message: err.message || "Failed to start Roblox authorization.", type: "error" });
        }
      } else if (readiness.action === "reauthorize") {
        try {
          await beginRobloxReauthorization({ bundles: ["core"], returnPath: "/ai" });
        } catch (err) {
          notify?.({ message: err.message || "Failed to start Roblox reauthorization.", type: "error" });
        }
      }
      return { ok: false, reason: readiness.action };
    }

    const validImages = fileList.filter(isRobloxDecalImage);
    const unsupportedImages = fileList.filter(
      (file) => file.type?.startsWith("image/") && !isRobloxDecalImage(file)
    );
    if (unsupportedImages.length) {
      notify?.({ message: UNSUPPORTED_DECAL_IMAGE_MESSAGE, type: "info" });
    }
    if (!validImages.length) return { ok: false, reason: "no_valid_images" };

    const requestId = createClientId();
    const pending = validImages.map((file) => ({
      id: createClientId(),
      fileName: file.name,
      status: "uploading",
    }));
    setActiveUploads((current) => [...current, ...pending]);
    setUploading(true);

    try {
      const projectId = await ensureChatForUpload();
      const items = validImages.map((file) => ({
        clientId: createClientId(),
        fileName: file.name,
        displayName: displayNameFor(file),
      }));
      const payload = await uploadRobloxDecalBatch({
        requestId,
        files: validImages,
        items,
        projectId,
      });

      const succeeded = (payload.results || []).filter((item) => item.status === "succeeded").length;
      const failed = (payload.results || []).filter((item) => item.status === "failed").length;
      const attached = Array.isArray(payload.attachedAssets) ? payload.attachedAssets.length : 0;

      if (onRefreshProjectAssets) await onRefreshProjectAssets();

      if (failed && !succeeded) {
        notify?.({
          message: payload.results?.find((item) => item.error)?.error || "Roblox image upload failed.",
          type: "error",
        });
      } else if (failed) {
        notify?.({
          message: `${succeeded} image${succeeded === 1 ? "" : "s"} uploaded, ${failed} failed.`,
          type: "error",
        });
      } else {
        notify?.({
          message: attached
            ? `${succeeded} image${succeeded === 1 ? "" : "s"} uploaded to Roblox and attached to this chat.`
            : `${succeeded} image${succeeded === 1 ? "" : "s"} uploaded to Roblox.`,
          type: "success",
        });
      }

      setActiveUploads((current) => current.filter((item) => !pending.some((p) => p.id === item.id)));
      return { ok: succeeded > 0, payload };
    } catch (err) {
      notify?.({ message: err?.message || "Roblox image upload failed.", type: "error" });
      if (err?.code === "ROBLOX_REAUTHORIZATION_REQUIRED") {
        try {
          await beginRobloxReauthorization({ bundles: ["core"], returnPath: "/ai" });
        } catch (reauthErr) {
          notify?.({ message: reauthErr.message || "Failed to start Roblox reauthorization.", type: "error" });
        }
      }
      setActiveUploads((current) => current.filter((item) => !pending.some((p) => p.id === item.id)));
      return { ok: false, error: err };
    } finally {
      setUploading(false);
    }
  }, [
    user,
    robloxStatus,
    ensureChatForUpload,
    notify,
    onSignInRequired,
    onRefreshProjectAssets,
  ]);

  return {
    uploading,
    activeUploads,
    uploadImages,
    readiness: readinessCheck(robloxStatus),
  };
}

export default useRobloxImageUpload;
