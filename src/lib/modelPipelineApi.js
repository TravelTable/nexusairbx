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
      size: file?.size || 0,
      contentType: file?.type || "model/gltf-binary",
    }),
  });
  return readJson(res, "Failed to create model upload session");
}

export async function uploadModelFileToSignedUrl(file, upload, onProgress) {
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.({ loaded: event.loaded, total: event.total });
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

export async function getModelFileRules() {
  const res = await authedFetch("/api/model-files/rules", { method: "GET", noCache: true });
  return readJson(res, "Failed to load model-file rules");
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

export async function getModelDownloadUrl(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/download-url`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load download URL");
}

export async function cancelModelFile(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/cancel`, { method: "POST" });
  return readJson(res, "Failed to cancel model validation");
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

export async function getDerivativeReport(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/report`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load derivative report");
}

export async function getDerivativeComparison(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/comparison`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load derivative comparison");
}

export async function getDerivativePreviewUrl(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/preview-url`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load derivative preview URL");
}

export async function getDerivativeDownloadUrl(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/download-url`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load derivative download URL");
}

export async function cancelDerivative(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/cancel`, { method: "POST" });
  return readJson(res, "Failed to cancel derivative");
}

export async function deleteDerivative(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}`, { method: "DELETE" });
  return readJson(res, "Failed to delete derivative");
}

export async function prepareRobloxModelUpload({ modelFileId, derivativeId = null, displayName, description = "", creator = { type: "user" } }) {
  const res = await authedFetch("/api/roblox/model-uploads/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: derivativeId ? "derivative" : "original",
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
    body: JSON.stringify({ rightsConfirmed: true, moderationAcknowledged: true }),
  });
  return readJson(res, "Failed to confirm Roblox model upload");
}

export async function listRobloxModelUploads() {
  const res = await authedFetch("/api/roblox/model-uploads", { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox model uploads");
}

export async function getRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox model upload");
}

export async function getRobloxModelUploadStatus(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/status`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox model upload status");
}

export async function refreshRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/refresh`, { method: "POST" });
  return readJson(res, "Failed to refresh Roblox model upload");
}

export async function cancelRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/cancel`, { method: "POST" });
  return readJson(res, "Failed to cancel Roblox model upload");
}

export async function prepareUploadedModelInsertion(uploadId, options = {}) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/prepare-insertion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: options.sessionId || "",
      targetParentPath: options.targetParentPath || "Workspace/NexusImports",
      requestedName: options.requestedName || "",
      placement: options.placement || { mode: "camera_focus", position: null },
      anchoredPolicy: options.anchoredPolicy || "preserve",
      collisionPolicy: options.collisionPolicy || "preserve",
    }),
  });
  return readJson(res, "Failed to prepare Studio insertion");
}

export async function insertUploadedModel(uploadId, preparedInsertionId) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/insert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preparedInsertionId,
      confirmed: true,
    }),
  });
  return readJson(res, "Failed to insert uploaded model");
}

export async function getUploadedModelInsertion(insertionId) {
  const res = await authedFetch(`/api/studio/roblox-model-insertions/${encodeURIComponent(insertionId)}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Studio insertion receipt");
}

export async function listUploadedModelInsertions() {
  const res = await authedFetch("/api/studio/roblox-model-insertions", { method: "GET", noCache: true });
  return readJson(res, "Failed to load Studio insertion receipts");
}

export async function recheckUploadedModelAccess(uploadId) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/recheck-access`, { method: "POST" });
  return readJson(res, "Failed to recheck Roblox asset access");
}
