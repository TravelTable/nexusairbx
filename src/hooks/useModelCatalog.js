import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config";

/**
 * Fetches the dynamic AI Gateway model catalog from GET /api/models and caches it
 * in-module for the session so multiple consumers (workspace switcher, settings)
 * share a single network request.
 *
 * Each model: { id, name, provider, contextLength, tier, recommended, creditMultiplier, costTierLabel }.
 */

const FALLBACK_MODELS = [
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "deepseek", contextLength: 128000, tier: "free", recommended: true, creditMultiplier: 1, costTierLabel: "1x credits" },
  { id: "openai/gpt-5-mini", name: "GPT-5 mini", provider: "openai", contextLength: 256000, tier: "free", recommended: true, creditMultiplier: 1, costTierLabel: "1x credits" },
  { id: "openai/gpt-5.4", name: "GPT-5.4", provider: "openai", contextLength: 256000, tier: "pro", recommended: true, creditMultiplier: 8, costTierLabel: "8x credits" },
];

let moduleCache = null;
let inFlight = null;

async function loadCatalog() {
  if (moduleCache) return moduleCache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models`);
      if (!res.ok) throw new Error(`models responded ${res.status}`);
      const data = await res.json();
      const models = Array.isArray(data?.models) ? data.models : [];
      moduleCache = models.length ? models : FALLBACK_MODELS;
    } catch (e) {
      moduleCache = FALLBACK_MODELS;
    } finally {
      inFlight = null;
    }
    return moduleCache;
  })();

  return inFlight;
}

export function useModelCatalog() {
  const [models, setModels] = useState(moduleCache || []);
  const [loading, setLoading] = useState(!moduleCache);

  useEffect(() => {
    let active = true;
    if (moduleCache) {
      setModels(moduleCache);
      setLoading(false);
      return undefined;
    }
    loadCatalog().then((list) => {
      if (!active) return;
      setModels(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { models, loading };
}

export default useModelCatalog;
