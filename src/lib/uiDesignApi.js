import { authedFetch } from "./billing";

async function request(path, init = {}) {
  const response = await authedFetch(`/api/ui-designs${path}`, {
    noCache: String(init.method || "GET").toUpperCase() === "GET",
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init.headers,
  });
  const text = await response.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.message || data.error || "The UI design request failed.");
    error.status = response.status;
    error.code = data.code || "UI_DESIGN_REQUEST_FAILED";
    error.details = data.details || null;
    throw error;
  }
  return data;
}

export function listUiDesigns(projectId = "") {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return request(`/${query}`);
}

export function createUiDesign(input = {}) {
  return request("/", { method: "POST", body: JSON.stringify(input) });
}

export function getUiDesign(designId) {
  return request(`/${encodeURIComponent(designId)}`);
}

export function patchUiDesign(designId, expectedRevision, operations) {
  return request(`/${encodeURIComponent(designId)}`, {
    method: "PATCH",
    body: JSON.stringify({ expectedRevision, operations }),
  });
}

export function saveUiHooks(designId, expectedRevision, source) {
  return request(`/${encodeURIComponent(designId)}/hooks`, {
    method: "PUT",
    body: JSON.stringify({ expectedRevision, source }),
  });
}

export function generateUiDraft(designId, input) {
  return request(`/${encodeURIComponent(designId)}/generate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function acceptUiDraft(designId, draftId) {
  return request(`/${encodeURIComponent(designId)}/drafts/${encodeURIComponent(draftId)}/accept`, {
    method: "POST",
  });
}

export function discardUiDraft(designId, draftId) {
  return request(`/${encodeURIComponent(designId)}/drafts/${encodeURIComponent(draftId)}/discard`, {
    method: "POST",
  });
}

export function compileUiDesign(designId, input = {}) {
  return request(`/${encodeURIComponent(designId)}/compile`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createUiCheckpoint(designId, input = {}) {
  return request(`/${encodeURIComponent(designId)}/checkpoints`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listUiCheckpoints(designId) {
  return request(`/${encodeURIComponent(designId)}/checkpoints`);
}

export function restoreUiCheckpoint(designId, checkpointId, expectedRevision) {
  return request(`/${encodeURIComponent(designId)}/checkpoints/${encodeURIComponent(checkpointId)}/restore`, {
    method: "POST",
    body: JSON.stringify({ expectedRevision }),
  });
}
