import { authedFetch } from "./billing";
import { readJsonResponse } from "./apiErrors";

async function request(path, method = "GET", body) {
  const response = await authedFetch(`/api/animations${path}`, {
    method,
    ...(method === "GET" ? { noCache: true } : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }),
  });
  return readJsonResponse(response, "The animation set request could not be completed.");
}

function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export async function listAnimationSets(options = {}) {
  return (await request(`/sets?${queryString(options)}`)).sets || [];
}

export async function getAnimationSet(id) {
  return (await request(`/sets/${encodeURIComponent(id)}`)).set;
}

export async function planAnimationSet(input) {
  return (await request("/sets/plan", "POST", input)).set;
}

export async function saveAnimationSet(set) {
  const result = set.id
    ? await request(`/sets/${encodeURIComponent(set.id)}`, "PUT", { set, expectedVersion: set.version })
    : await request("/sets", "POST", { set });
  return result.set;
}

export async function validateAnimationSet(id, options = {}) {
  return (await request(`/sets/${encodeURIComponent(id)}/validate`, "POST", options)).validation;
}

export async function compileAnimationSet(id, options = {}) {
  return (await request(`/sets/${encodeURIComponent(id)}/compile`, "POST", options)).artifact;
}

export async function sendAnimationSetToStudio(id, options = {}) {
  return (await request(`/sets/${encodeURIComponent(id)}/send-to-studio`, "POST", options)).deployment;
}

export async function getAnimationSetDeployment(setId, deploymentId) {
  return (await request(`/sets/${encodeURIComponent(setId)}/deployments/${encodeURIComponent(deploymentId)}`)).deployment;
}

export async function searchAnimationResources(options = {}) {
  return (await request(`/resources/search?${queryString(options)}`)).resources || [];
}

export async function importAnimationResource(file, options = {}) {
  const body = new FormData();
  body.append("file", file);
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") body.append(key, String(value));
  });
  const response = await authedFetch("/api/animations/resources/import", { method: "POST", body });
  return readJsonResponse(response, "The animation file could not be imported.");
}

export async function controlAnimationSetPreview(setId, deploymentId, options) {
  return (await request(`/sets/${encodeURIComponent(setId)}/deployments/${encodeURIComponent(deploymentId)}/preview`, "POST", options)).preview;
}

export async function getAnimationSetPreviewReceipt(setId, deploymentId, commandId) {
  return (await request(`/sets/${encodeURIComponent(setId)}/deployments/${encodeURIComponent(deploymentId)}/preview/${encodeURIComponent(commandId)}`)).preview;
}

export async function inspectAnimationSetResource(setId, resourceId) {
  return (await request(`/sets/${encodeURIComponent(setId)}/inspect-resource`, "POST", { resourceId })).inspection;
}

export async function applyAnimationSetResourceInspection(setId, resourceId, commandId, expectedVersion) {
  return (await request(`/sets/${encodeURIComponent(setId)}/apply-inspection`, "POST", { resourceId, commandId, expectedVersion })).set;
}

export async function probeAnimationSetResourceAccess(setId, resourceId, rigPath) {
  return (await request(`/sets/${encodeURIComponent(setId)}/probe-access`, "POST", { resourceId, rigPath })).probe;
}

export async function applyAnimationSetAccessProbe(setId, resourceId, commandId, expectedVersion) {
  return (await request(`/sets/${encodeURIComponent(setId)}/apply-access-probe`, "POST", { resourceId, commandId, expectedVersion })).set;
}
