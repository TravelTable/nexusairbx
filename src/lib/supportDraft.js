export const SUPPORT_DRAFT_KEY = "nexusrbx:support-draft:v1";
export const SUPPORT_DRAFT_TTL_MS = 30 * 60 * 1000;

export const SUPPORT_CATEGORIES = Object.freeze([
  { id: "technical", label: "Roblox Studio / technical" },
  { id: "account", label: "Account" },
  { id: "billing", label: "Billing" },
  { id: "creator_store", label: "Creator Store" },
  { id: "security_privacy", label: "Security / privacy" },
  { id: "partnerships", label: "Partnerships" },
  { id: "other", label: "Other" },
]);

const CATEGORY_IDS = new Set(SUPPORT_CATEGORIES.map((category) => category.id));

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
}

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeSupportDraft(value = {}, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const category = CATEGORY_IDS.has(value.category) ? value.category : "technical";
  const createdAt = Number(value.createdAt ?? now);
  const expiresAt = Number(value.expiresAt ?? createdAt + SUPPORT_DRAFT_TTL_MS);
  const lifetime = expiresAt - createdAt;
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt > now ||
    expiresAt <= now ||
    lifetime <= 0 ||
    lifetime > SUPPORT_DRAFT_TTL_MS
  ) {
    return null;
  }
  return {
    category,
    subject: text(value.subject, 120),
    message: text(value.message, 10_000),
    errorMessage: text(value.errorMessage, 2_000),
    reproductionSteps: text(value.reproductionSteps, 5_000),
    studioVersion: text(value.studioVersion, 120),
    pluginVersion: text(value.pluginVersion, 120),
    invoiceReference: text(value.invoiceReference, 160),
    privacyRequestType: text(value.privacyRequestType, 80),
    articleUrl: text(value.articleUrl, 1_000),
    createdAt,
    expiresAt,
  };
}

export function saveSupportDraft(value, now = Date.now()) {
  const draft = normalizeSupportDraft({
    ...value,
    createdAt: value?.createdAt || now,
    expiresAt: value?.expiresAt || now + SUPPORT_DRAFT_TTL_MS,
  }, now);
  if (!draft) return null;
  try {
    storage()?.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(draft));
  } catch (_) {
    // The form remains usable when same-tab storage is unavailable.
  }
  return draft;
}

export function readSupportDraft(now = Date.now()) {
  let parsed = null;
  try {
    parsed = JSON.parse(storage()?.getItem(SUPPORT_DRAFT_KEY) || "null");
  } catch (_) {
    parsed = null;
  }
  const draft = normalizeSupportDraft(parsed, now);
  if (!draft) clearSupportDraft();
  return draft;
}

export function clearSupportDraft() {
  try {
    storage()?.removeItem(SUPPORT_DRAFT_KEY);
  } catch (_) {
    // Best effort.
  }
}

export function supportDraftFromSearchParams(searchParams, now = Date.now()) {
  if (!searchParams) return null;
  const source = searchParams.get("source");
  const subject = searchParams.get("subject");
  const message = searchParams.get("message");
  const article = searchParams.get("article");
  if (!source && !subject && !message && !article) return null;
  return normalizeSupportDraft({
    category: subject === "support" ? "technical" : subject,
    subject: source === "docs" ? "Docs issue" : "",
    message,
    articleUrl: article,
    createdAt: now,
    expiresAt: now + SUPPORT_DRAFT_TTL_MS,
  }, now);
}
