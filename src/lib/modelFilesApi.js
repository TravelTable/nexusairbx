import { authedFetch } from "./billing";

async function readJsonOrThrow(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || text || fallbackMessage);
    err.code = data?.code;
    err.status = res.status;
    err.capability = data?.capability;
    err.missingScopes = data?.missingScopes;
    err.retryAfter = data?.retryAfter;
    err.operationId = data?.operationId;
    throw err;
  }
  return data || {};
}

export async function getModelValidationRules() {
  const res = await authedFetch("/api/model-files/rules", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load model validation rules");
}

export async function listModelFiles() {
  const res = await authedFetch("/api/model-files", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load model files");
}

export async function createModelUploadSession({ filename, sizeBytes, contentType }) {
  const res = await authedFetch("/api/model-files/upload-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, sizeBytes, contentType }),
  });
  return readJsonOrThrow(res, "Failed to create model upload session");
}

export function uploadModelToSignedUrl({ url, file, headers = {}, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

export async function completeModelUpload(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/complete`, {
    method: "POST",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to verify uploaded model");
}

export async function getModelFile(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load model file");
}

export async function getModelReport(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/report`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load model validation report");
}

export async function getModelPreviewUrl(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/preview-url`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load model preview URL");
}

export async function createOptimizationPlan(modelFileId, { profile = "roblox_balanced", options = {} } = {}) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/optimization-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, options }),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to create optimization plan");
}

export async function createModelDerivative(modelFileId, { planId, aggressiveConfirmed = false }) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, aggressiveConfirmed }),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to create optimized derivative");
}

export async function listModelDerivatives(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load optimized derivatives");
}

export async function getModelDerivative(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load derivative");
}

export async function getModelDerivativeReport(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/report`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load derivative validation report");
}

export async function getModelDerivativeComparison(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/comparison`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load derivative comparison");
}

export async function getModelDerivativePreviewUrl(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/preview-url`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load derivative preview URL");
}

export async function getModelDerivativeDownloadUrl(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}/download-url`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to create derivative download URL");
}

export async function deleteModelDerivative(modelFileId, derivativeId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}/derivatives/${encodeURIComponent(derivativeId)}`, {
    method: "DELETE",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to delete derivative");
}

export async function deleteModelFile(modelFileId) {
  const res = await authedFetch(`/api/model-files/${encodeURIComponent(modelFileId)}`, {
    method: "DELETE",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to delete model file");
}

export async function prepareRobloxModelUpload(payload) {
  const res = await authedFetch("/api/roblox/model-uploads/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to prepare Roblox model upload");
}

export async function confirmRobloxModelUpload(uploadId, payload) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to queue Roblox model upload");
}

export async function getRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Roblox model upload");
}

export async function getRobloxModelUploadStatus(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/status`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Roblox model upload status");
}

export async function refreshRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/refresh`, {
    method: "POST",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to refresh Roblox moderation status");
}

export async function cancelRobloxModelUpload(uploadId) {
  const res = await authedFetch(`/api/roblox/model-uploads/${encodeURIComponent(uploadId)}/cancel`, {
    method: "POST",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to cancel Roblox model upload");
}

export async function prepareRobloxModelInsertion(uploadId, payload) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/prepare-insertion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to prepare Studio insertion");
}

export async function insertRobloxModelInStudio(uploadId, payload) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/insert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to queue Studio insertion");
}

export async function getRobloxModelInsertion(insertionId) {
  const res = await authedFetch(`/api/studio/roblox-model-insertions/${encodeURIComponent(insertionId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio insertion");
}

export async function recheckRobloxModelInsertionAccess(uploadId) {
  const res = await authedFetch(`/api/studio/roblox-model-uploads/${encodeURIComponent(uploadId)}/recheck-access`, {
    method: "POST",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to recheck Roblox asset access");
}
