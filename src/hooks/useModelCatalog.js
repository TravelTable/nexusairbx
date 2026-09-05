import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = "nexus:model-catalog:v2";

const FALLBACK_MODELS = [
  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    provider: "anthropic",
    contextLength: 1_000_000,
    tier: "pro",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: false,
    recommended: true,
    recommendationScore: 101,
    codingRecommendationScore: 101,
    capabilities: ["coding", "reasoning", "tools", "vision"],
    recommendedFor: ["coding", "reasoning"],
    usageMultiplier: 1.8,
    creditMultiplier: 1.8,
    costTier: "premium",
    costTierLabel: "1.8× usage",
  },
  {
    id: "openai/gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "openai",
    contextLength: 1_000_000,
    tier: "pro",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: false,
    recommended: true,
    recommendationScore: 99,
    codingRecommendationScore: 99,
    capabilities: ["coding", "reasoning", "tools", "vision"],
    recommendedFor: ["coding", "reasoning"],
    usageMultiplier: 1.2,
    creditMultiplier: 1.2,
    costTier: "standard",
    costTierLabel: "1.2× usage",
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "anthropic",
    contextLength: 1_000_000,
    tier: "pro",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: false,
    recommended: true,
    recommendationScore: 96,
    codingRecommendationScore: 96,
    capabilities: ["coding", "reasoning", "tools", "vision"],
    recommendedFor: ["coding", "reasoning"],
    usageMultiplier: 1.2,
    creditMultiplier: 1.2,
    costTier: "standard",
    costTierLabel: "1.2× usage",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "google",
    contextLength: 1_000_000,
    tier: "pro",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: false,
    recommended: true,
    recommendationScore: 93,
    codingRecommendationScore: 93,
    capabilities: ["coding", "reasoning", "tools", "vision"],
    recommendedFor: ["coding", "reasoning"],
    usageMultiplier: 1.2,
    creditMultiplier: 1.2,
    costTier: "standard",
    costTierLabel: "1.2× usage",
  },
  {
    id: "google/gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    contextLength: 1_000_000,
    tier: "free",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: true,
    recommended: true,
    recommendationScore: 62,
    codingRecommendationScore: 62,
    capabilities: ["fast", "reasoning", "tools", "vision"],
    recommendedFor: ["general", "coding", "fast"],
    usageMultiplier: 0.8,
    creditMultiplier: 0.8,
    costTier: "economy",
    costTierLabel: "0.8× usage",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    provider: "openai",
    contextLength: 256_000,
    tier: "pro",
    billingCategory: "INCLUDED",
    billingLabel: "Usage",
    pricingConfigured: true,
    availableToPaid: true,
    availableToFree: false,
    recommended: true,
    recommendationScore: 65,
    codingRecommendationScore: 65,
    capabilities: ["fast", "reasoning", "tools"],
    recommendedFor: ["general", "coding", "fast"],
    usageMultiplier: 0.8,
    creditMultiplier: 0.8,
    costTier: "economy",
    costTierLabel: "0.8× usage",
  },
];

let moduleCache = null;
let inFlight = null;

function readStoredCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.models) || !parsed.models.length) return null;
    return { models: parsed.models, fetchedAt: Number(parsed.fetchedAt) || 0 };
  } catch (_) {
    return null;
  }
}

function writeStoredCache(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (_) {
    // Cache persistence is optional.
  }
}

function getInitialCache() {
  if (moduleCache) return moduleCache;
  const stored = readStoredCache();
  if (stored) moduleCache = stored;
  return stored;
}

function isFresh(cached) {
  return Boolean(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);
}

async function fetchCatalog() {
  const response = await fetch(`${BACKEND_URL}/api/models`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`models responded ${response.status}`);
  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  if (!models.length) throw new Error("empty model catalog");
  return models;
}

async function loadCatalog({ force = false } = {}) {
  const existing = getInitialCache();
  if (!force && isFresh(existing)) return existing.models;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const models = await fetchCatalog();
      moduleCache = { models, fetchedAt: Date.now() };
      writeStoredCache(moduleCache);
      return models;
    } catch (_) {
      if (moduleCache?.models?.length) return moduleCache.models;
      moduleCache = { models: FALLBACK_MODELS, fetchedAt: 0 };
      return FALLBACK_MODELS;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useModelCatalog() {
  const initial = getInitialCache();
  const [models, setModels] = useState(initial?.models || []);
  const [loading, setLoading] = useState(!initial?.models?.length);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await loadCatalog({ force: true });
      setModels(list);
      setError(null);
      return list;
    } catch (err) {
      setError(err);
      return moduleCache?.models || FALLBACK_MODELS;
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const cached = getInitialCache();
    if (cached?.models?.length) {
      setModels(cached.models);
      setLoading(false);
    }

    const shouldRefresh = !isFresh(cached);
    if (shouldRefresh) setRefreshing(Boolean(cached?.models?.length));
    loadCatalog({ force: shouldRefresh })
      .then((list) => {
        if (!active) return;
        setModels(list);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { models, loading, refreshing, error, refresh };
}

export default useModelCatalog;
