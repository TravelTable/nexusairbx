const STORAGE_KEY = "nexusrbx:acquisition:v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

function safeStorage() {
  if (typeof window === "undefined") return null;

  try {
    const storage = window.localStorage;
    const probe = "__nexus_acquisition_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch (_) {
    return null;
  }
}

function clean(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 100);
  return normalized || undefined;
}

export function readCampaignFromLocation(search = "", pathname = "/") {
  const params = new URLSearchParams(search);
  const campaign = {};

  for (const key of UTM_KEYS) {
    const value = clean(params.get(key));
    if (value) campaign[key] = value;
  }

  if (!Object.keys(campaign).length) return null;

  return {
    ...campaign,
    landing_page: String(pathname || "/").slice(0, 120),
    captured_at: Date.now(),
  };
}

function readStored(storage) {
  if (!storage) return {};

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function captureAcquisitionContext() {
  if (typeof window === "undefined") return {};

  const storage = safeStorage();
  if (!storage) return {};

  const incoming = readCampaignFromLocation(window.location.search, window.location.pathname);
  const current = readStored(storage);

  if (!incoming) return current;

  const next = {
    first_touch: current.first_touch || incoming,
    last_touch: incoming,
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {
    // Attribution is best-effort and must never block product navigation.
  }

  return next;
}

export function getAcquisitionContext() {
  const storage = safeStorage();
  const stored = readStored(storage);
  const first = stored.first_touch || {};
  const last = stored.last_touch || {};

  return {
    first_touch_utm_source: first.utm_source,
    first_touch_utm_medium: first.utm_medium,
    first_touch_utm_campaign: first.utm_campaign,
    first_touch_utm_content: first.utm_content,
    first_touch_landing_page: first.landing_page,
    last_touch_utm_source: last.utm_source,
    last_touch_utm_medium: last.utm_medium,
    last_touch_utm_campaign: last.utm_campaign,
    last_touch_utm_content: last.utm_content,
    last_touch_landing_page: last.landing_page,
  };
}
