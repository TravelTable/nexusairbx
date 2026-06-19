import { authedFetch } from "./billing";

async function readJson(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.error || text || fallbackMessage);
    error.code = data?.code || null;
    error.status = res.status;
    throw error;
  }
  return data || {};
}

export async function createModelUploadSession(file) {
  const res = await authedFetch("/api/model-files/upload-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file?.name || "model.glb",
      sizeBytes: file?.size || 0,
      contentType: file?.type || "model/gltf-binary",
    }),
  });
  return readJson(res, "Failed to create model upload session");
}

export async function uploadModelFileToSignedUrl(file, upload, onProgress) {
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open(upload.method || "PUT", upload.url);
    Object.entries(upload.headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.setRequestHeader("Content-Type", file?.type || "model/gltf-binary");
    xhr.send(file);
  });
}

export async function completeModelUpload(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/complete`, { method: "POST" });
  return readJson(res, "Failed to complete model upload");
}

export async function listModelFiles() {
  const res = await authedFetch("/api/model-files", { method: "GET", noCache: true });
  return readJson(res, "Failed to load model files");
}

export async function getModelFile(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load model file");
}

export async function getModelFileReport(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/report`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load validation report");
}

export async function getModelPreviewUrl(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/preview-url`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load preview URL");
}

export async function deleteModelFile(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}`, { method: "DELETE" });
  return readJson(res, "Failed to delete model file");
}

export async function createOptimizationPlan(modelFileId, profile = "roblox_balanced") {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/optimization-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return readJson(res, "Failed to create optimization plan");
}

export async function createDerivative(modelFileId, planId, aggressiveConfirmed = false) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, aggressiveConfirmed }),
  });
  return readJson(res, "Failed to create derivative");
}

export async function listDerivatives(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load derivatives");
}

export async function prepareRobloxModelUpload({ modelFileId, derivativeId = null, displayName, description = "", creator = { type: "user" } }) {
  const res = await authedFetch("/api/roblox/model-uploads/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: derivativeId ? "optimized_derivative" : "validated_model_file",
      modelFileId,
      derivativeId,
      displayName,
      description,
      creator,
    }),
  });
  return readJson(res, "Failed to prepare Roblox model upload");
}

export async function confirmRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rightsConfirmed: true, moderationConfirmed: true }),
  });
  return readJson(res, "Failed to confirm Roblox model upload");
}

export async function getRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox model upload");
}

export async function refreshRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/refresh`, { method: "POST" });
  return readJson(res, "Failed to refresh Roblox model upload");
}

export async function prepareUploadedModelInsertion(uploadId) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/prepare-insertion`, { method: "POST" });
  return readJson(res, "Failed to prepare Studio insertion");
}

export async function insertUploadedModel(uploadId, requestedName) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/insert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestedName,
      targetParentPath: "Workspace/NexusImports",
      placement: { mode: "camera_focus" },
      anchoringMode: "anchor_all",
      collisionMode: "visual_default",
    }),
  });
  return readJson(res, "Failed to insert uploaded model");
}
