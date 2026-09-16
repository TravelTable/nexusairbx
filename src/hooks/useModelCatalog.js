import { useCallback, useEffect, useSyncExternalStore } from "react";
import { BACKEND_URL } from "../config";
import { desktopWorkspace, desktopRequest } from "../lib/workspaceRuntime";
import { isCatalogModelAvailable } from "../lib/modelProviders";

export const MODEL_CATALOG_TTL_MS = 5 * 60 * 1000;
const EMPTY_SNAPSHOT = { models: [], loading: true, refreshing: false, error: null, meta: null, fetchedAt: 0, source: "loading" };
let snapshot = EMPTY_SNAPSHOT;
let inFlight = null;
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const publish = (next) => { snapshot = next; listeners.forEach((listener) => listener()); };
const fresh = () => snapshot.source === "remote" && Date.now() - snapshot.fetchedAt < MODEL_CATALOG_TTL_MS;

async function loadCatalog({ force = false } = {}) {
  if (inFlight) return inFlight;
  if (!force && fresh()) return snapshot.models;
  // Browser storage cannot authorize a model or its pricing. Stale rows are
  // withheld until the server confirms the catalog, including on refresh failure.
  publish({ ...snapshot, models: [], loading: !snapshot.fetchedAt, refreshing: true, error: null });
  inFlight = (async () => {
    try {
      const response = await (desktopWorkspace() ? desktopRequest("/api/models") : fetch(`${BACKEND_URL}/api/models`, {
        headers: { Accept: "application/json" },
      }));
      if (!response.ok) throw new Error("Live model availability could not be checked.");
      const data = await response.json();
      if (!Array.isArray(data?.models) || ["fallback", "emergency", "unavailable"].includes(data?.meta?.source)) {
        throw new Error("A verified live model catalog is unavailable.");
      }
      const models = data.models.filter(isCatalogModelAvailable);
      publish({ models, meta: data.meta || null, fetchedAt: Date.now(), source: "remote", loading: false, refreshing: false, error: null });
      return models;
    } catch (error) {
      publish({ ...snapshot, models: [], source: "unavailable", loading: false, refreshing: false, error });
      return [];
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useModelCatalog() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_SNAPSHOT);
  const refresh = useCallback(() => loadCatalog({ force: true }), []);
  useEffect(() => {
    void loadCatalog();
    const update = () => { if (document.visibilityState !== "hidden") void loadCatalog(); };
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!state.fetchedAt || state.error) return undefined;
    const timer = window.setTimeout(() => void loadCatalog(), Math.max(1, MODEL_CATALOG_TTL_MS - (Date.now() - state.fetchedAt)));
    return () => window.clearTimeout(timer);
  }, [state.fetchedAt, state.error]);
  return { ...state, refresh };
}

export function resetModelCatalogForTests() {
  snapshot = EMPTY_SNAPSHOT;
  inFlight = null;
}

export default useModelCatalog;
