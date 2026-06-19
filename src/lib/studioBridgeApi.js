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
    throw new Error(data?.error || text || fallbackMessage);
  }
  return data || {};
}

export async function startStudioPairing() {
  const res = await authedFetch("/api/studio/pair/start", { method: "POST" });
  return readJsonOrThrow(res, "Failed to start Studio pairing");
}

export async function getStudioStatus() {
  const res = await authedFetch("/api/studio/status", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Studio status");
}

export async function disconnectStudio({ sessionId = null } = {}) {
  const res = await authedFetch("/api/studio/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return readJsonOrThrow(res, "Failed to disconnect Studio");
}

export async function pushToStudio({ payload, applyMode = "manual_review", sessionId = null }) {
  const res = await authedFetch("/api/studio/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, applyMode, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to push to Studio");
}

export async function applyArtifactToStudio({ artifact, sessionId = null, studioPreconditions = [] }) {
  const res = await authedFetch("/api/studio/apply-artifact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artifact, sessionId, studioPreconditions }),
  });
  return readJsonOrThrow(res, "Failed to apply artifact to Studio");
}

export async function getStudioCommand(commandId) {
  const res = await authedFetch(`/api/studio/commands/${encodeURIComponent(commandId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio command");
}

export async function validateNativeModelSpec({ spec }) {
  const res = await authedFetch("/api/studio/native-model/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  return readJsonOrThrow(res, "Failed to validate native model");
}

export async function buildNativeModelInStudio({ spec, sessionId = null, applyMode = "manual_review" }) {
  const res = await authedFetch("/api/studio/native-model/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec, sessionId, applyMode }),
  });
  return readJsonOrThrow(res, "Failed to queue native model build");
}

export async function inspectNativeModel({ modelPath, modelId, sessionId = null }) {
  const res = await authedFetch("/api/studio/native-model/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelPath, modelId, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to inspect native model");
}

export async function validateNativeModelPatch({
  inspectionId,
  patch,
  modelId = null,
  modelPath = null,
  sessionId = null,
}) {
  const res = await authedFetch("/api/studio/native-model/patch/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionId, patch, modelId, modelPath, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to validate native model patch");
}

export async function applyNativeModelPatch({
  inspectionId,
  patch,
  expectedRevision = "",
  modelId = null,
  modelPath = null,
  sessionId = null,
  destructiveConfirmed = false,
}) {
  const res = await authedFetch("/api/studio/native-model/patch/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inspectionId,
      patch,
      expectedRevision,
      modelId,
      modelPath,
      sessionId,
      destructiveConfirmed,
    }),
  });
  return readJsonOrThrow(res, "Failed to apply native model patch");
}

export async function getStudioTools() {
  const res = await authedFetch("/api/studio/tools", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Studio tools");
}

export async function importCreatorStoreAssetToStudio({
  assetId,
  sessionId = null,
  targetParentPath = "Workspace/NexusImports",
  requestedName = "",
  placement = { mode: "camera_focus" },
}) {
  const res = await authedFetch("/api/studio/creator-store/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId, sessionId, targetParentPath, requestedName, placement }),
  });
  return readJsonOrThrow(res, "Failed to import Creator Store asset");
}

export async function prepareStudioValidation({
  sessionId = null,
  profile = "standard",
  targetType,
  targetReferenceId = "",
  modelId = "",
  entireProjectConfirmed = false,
  playtestDurationSeconds = null,
}) {
  const res = await authedFetch("/api/studio/validations/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      profile,
      targetType,
      targetReferenceId,
      modelId,
      entireProjectConfirmed,
      playtestDurationSeconds,
    }),
  });
  return readJsonOrThrow(res, "Failed to prepare Studio validation");
}

export async function startStudioValidation({ preparedValidationId, playtestConfirmed = false }) {
  const res = await authedFetch("/api/studio/validations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preparedValidationId, playtestConfirmed }),
  });
  return readJsonOrThrow(res, "Failed to start Studio validation");
}

export async function getStudioValidation(validationSessionId) {
  const res = await authedFetch(`/api/studio/validations/${encodeURIComponent(validationSessionId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio validation");
}

export async function getStudioValidationReport(validationSessionId) {
  const res = await authedFetch(`/api/studio/validations/${encodeURIComponent(validationSessionId)}/report`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio validation report");
}

export async function cancelStudioValidation(validationSessionId) {
  const res = await authedFetch(`/api/studio/validations/${encodeURIComponent(validationSessionId)}/cancel`, {
    method: "POST",
  });
  return readJsonOrThrow(res, "Failed to cancel Studio validation");
}

export async function getStudioManifest({ sessionId = null, placeId = null, revision = "", completeOnly = true, limit = 500, cursor = "" } = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  if (revision) params.set("revision", revision);
  if (!completeOnly) params.set("completeOnly", "false");
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const res = await authedFetch(`/api/studio/manifest${query ? `?${query}` : ""}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio manifest");
}

export async function getStudioManifestStatus({ sessionId = null, placeId = null } = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  const query = params.toString();
  const res = await authedFetch(`/api/studio/manifest/status${query ? `?${query}` : ""}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio manifest status");
}

export async function searchStudioManifest({
  sessionId = null,
  placeId = null,
  revision = "",
  completeOnly = true,
  query = "",
  classes = [],
  scriptOnly = false,
  limit = 200,
  cursor = "",
} = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  if (revision) params.set("revision", revision);
  if (!completeOnly) params.set("completeOnly", "false");
  if (query) params.set("query", query);
  if (classes?.length) params.set("classes", classes.join(","));
  if (scriptOnly) params.set("scriptOnly", "true");
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await authedFetch(`/api/studio/manifest/search?${params.toString()}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to search Studio manifest");
}

export async function listStudioManifestChildren({
  sessionId = null,
  placeId = null,
  revision = "",
  completeOnly = true,
  parentPath = "",
  limit = 500,
  cursor = "",
} = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  if (revision) params.set("revision", revision);
  if (!completeOnly) params.set("completeOnly", "false");
  if (parentPath) params.set("parentPath", parentPath);
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await authedFetch(`/api/studio/manifest/children?${params.toString()}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio manifest children");
}

export async function listStudioScriptPaths({
  sessionId = null,
  placeId = null,
  revision = "",
  completeOnly = true,
  limit = 500,
  cursor = "",
} = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  if (revision) params.set("revision", revision);
  if (!completeOnly) params.set("completeOnly", "false");
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await authedFetch(`/api/studio/manifest/scripts?${params.toString()}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to list Studio script paths");
}

export async function queueStudioTool({ type, payload = {}, sessionId = null, label = "", applyMode = "manual_review", runId = null, stepId = null }) {
  const res = await authedFetch("/api/studio/tools/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload, sessionId, label, applyMode, runId, stepId }),
  });
  return readJsonOrThrow(res, "Failed to queue Studio tool");
}

/** @deprecated Legacy Studio Agent panel — use unified agent run + restoreAgentRun instead. */
export async function startStudioAgent({ goal, chatId = null, sessionId = null }) {
  const res = await authedFetch("/api/studio/agent/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal, chatId, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to start Studio agent");
}

/** @deprecated Legacy Studio Agent panel */
export async function getStudioAgentRun(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio agent run");
}

/** @deprecated Legacy Studio Agent panel */
export async function continueStudioAgent(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}/continue`, {
    method: "POST",
  });
  return readJsonOrThrow(res, "Failed to continue Studio agent");
}

/** @deprecated Prefer restoreAgentRun from workflowApi for unified runs */
export async function restoreStudioAgent(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}/restore`, {
    method: "POST",
  });
  return readJsonOrThrow(res, "Failed to restore Studio snapshots");
}
