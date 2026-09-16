import { readNexusAutoPreferences } from "./nexusAutoPreferences";

// Keep request preferences in the same durable settings payload used by workers.
// Estimates and model decisions always come back from the server.
export function withModelRoutingPreferences(path, init, readPreferences = readNexusAutoPreferences) {
  if (!/\/api\/(?:ai\/|v2\/|tasks(?:\/|$)|generate|workflow|studio\/agent|ui-builder)/.test(path)
    || String(init.method || "GET").toUpperCase() !== "POST" || typeof init.body !== "string") return init;
  let body;
  try { body = JSON.parse(init.body); } catch { return init; }
  if (!body || typeof body !== "object" || Array.isArray(body)) return init;
  const settings = body.executionInput?.settings || body.settings;
  const model = body.modelVersion ?? body.model ?? settings?.modelVersion;
  if (model == null && !settings) return init;
  const autoPreferences = body.autoPreferences || settings?.autoPreferences || readPreferences();
  if (body.executionInput?.settings) {
    body.executionInput = { ...body.executionInput, settings: { ...body.executionInput.settings, autoPreferences } };
  } else if (body.settings) body.settings = { ...body.settings, autoPreferences };
  else body.autoPreferences = autoPreferences;
  return { ...init, body: JSON.stringify(body) };
}

export const MODEL_ROUTING_EVENT = "nexus:model-routing";
export function publishModelRouting(modelRouting, scope = {}) {
  if (!modelRouting?.modelId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MODEL_ROUTING_EVENT, { detail: { ...scope, modelRouting } }));
}
