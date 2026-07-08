import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config";

/**
 * Fetches the dynamic AI Gateway model catalog from GET /api/models and caches it
 * in-module for the session so multiple consumers (workspace switcher, settings)
 * share a single network request.
 *
 * Each model: { id, name, provider, contextLength, tier, billingCategory, billingLabel, recommended }.
 */

const FALLBACK_MODELS = [
  { id: "openai/gpt-5-mini", name: "GPT-5 mini", provider: "openai", contextLength: 256000, tier: "free", billingCategory: "INCLUDED", billingLabel: "Included", recommended: true },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek", contextLength: 1000000, tier: "free", billingCategory: "INCLUDED", billingLabel: "Included", recommended: true },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "anthropic", contextLength: 200000, tier: "pro", billingCategory: "PREMIUM_DIRECT", billingLabel: "Premium Balance", recommended: true },
  { id: "openai/gpt-5.4", name: "GPT-5.4", provider: "openai", contextLength: 256000, tier: "pro", billingCategory: "PREMIUM_DIRECT", billingLabel: "Premium Balance", recommended: true },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", contextLength: 1000000, tier: "pro", billingCategory: "PREMIUM_DIRECT", billingLabel: "Premium Balance", recommended: true },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", contextLength: 1000000, tier: "free", billingCategory: "INCLUDED", billingLabel: "Included", recommended: true },
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
