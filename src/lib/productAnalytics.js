import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initAnalytics } from "../firebase";
import { getExperimentAnalyticsProperties, getExperimentRequestHeaders } from "./experiments";

const ANON_USER_KEY = "nexusrbx:analytics:anon-user-id";
const FIRST_SEEN_KEY = "nexusrbx:analytics:first-seen-at";
const SESSION_KEY = "nexusrbx:analytics:session-id";
const SESSION_STARTED_KEY = "nexusrbx:analytics:session-started-at";
const OPT_OUT_KEY = "nexusrbx:analytics:opt-out";
const DEBUG_KEY = "nexusrbx:analytics:debug";
const LOCAL_EVENTS_KEY = "nexusrbx:analytics:local-events";
const MAX_LOCAL_EVENTS = 200;
const DEDUPE_TTL_MS = 2000;
const SESSION_TTL_MS = 30 * 60 * 1000;

export const PRODUCT_EVENTS = Object.freeze({
  LANDING_PAGE_VIEW: "landing_page_view",
  EXAMPLE_PROMPT_SELECTED: "example_prompt_selected",
  LANDING_PROMPT_SUBMITTED: "landing_prompt_submitted",
  INTERNAL_TOOL_LINK_CLICKED: "internal_tool_link_clicked",
  HOMEPAGE_PROMPT_STARTED: "homepage_prompt_started",
  HOMEPAGE_PROMPT_SUBMITTED: "homepage_prompt_submitted",
  AI_WORKSPACE_VIEWED: "ai_workspace_viewed",
  GENERATION_INTENT_CREATED: "generation_intent_created",
  GENERATION_INTENT_RESTORED: "generation_intent_restored",
  SIGNIN_NUDGE_VIEWED: "signin_nudge_viewed",
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  PENDING_ACTION_RESTORED: "pending_action_restored",
  PENDING_ACTION_COMPLETED: "pending_action_completed",
  PENDING_ACTION_EXPIRED: "pending_action_expired",
  ANONYMOUS_PROJECT_CLAIMED: "anonymous_project_claimed",
  PROMPT_SUBMITTED: "prompt_submitted",
  CLARIFICATION_REQUESTED: "clarification_requested",
  PLAN_DISPLAYED: "plan_displayed",
  PLAN_APPROVED: "plan_approved",
  GENERATION_STARTED: "generation_started",
  GENERATION_COMPLETED: "generation_completed",
  GENERATION_FAILED: "generation_failed",
  GENERATOR_MODE_SELECTED: "generator_mode_selected",
  QUICK_SCRIPT_EDIT_STARTED: "quick_script_edit_started",
  QUICK_SCRIPT_OPENED_AS_AGENT_BUILD: "quick_script_opened_as_agent_build",
  QUICK_SCRIPT_STUDIO_PUSH_QUEUED: "quick_script_studio_push_queued",
  GATED_ACTION_ATTEMPTED: "gated_action_attempted",
  CODE_COPIED: "code_copied",
  ARTIFACT_DOWNLOADED: "artifact_downloaded",
  PROJECT_CREATED: "project_created",
  PROJECT_SAVED: "project_saved",
  PROJECT_REOPENED: "project_reopened",
  PROJECT_VERSION_CREATED: "project_version_created",
  PROJECT_VERSION_RESTORED: "project_version_restored",
  QUICK_SCRIPT_UPGRADED_TO_AGENT: "quick_script_upgraded_to_agent",
  STUDIO_SYNC_STATUS_CHANGED: "studio_sync_status_changed",
  STUDIO_CONNECTION_STARTED: "studio_connection_started",
  STUDIO_CONNECTION_COMPLETED: "studio_connection_completed",
  ARTIFACT_PUSHED_TO_STUDIO: "artifact_pushed_to_studio",
  SUBSCRIPTION_VIEWED: "subscription_viewed",
  STARTER_PROMO_VIEWED: "starter_promo_viewed",
  STARTER_PROMO_DISMISSED: "starter_promo_dismissed",
  CHECKOUT_STARTED: "checkout_started",
  PURCHASE_COMPLETED: "purchase_completed",
  PRICING_PLAN_SELECTED: "pricing_plan_selected",
  CHECKOUT_INTENT_RESTORED: "checkout_intent_restored",
  DOCS_SEARCHED: "docs_searched",
  SUPPORT_HANDOFF_STARTED: "support_handoff_started",
  SUPPORT_TICKET_CREATED: "support_ticket_created",
  SUPPORT_REPLY_SENT: "support_reply_sent",
  SUPPORT_TICKET_RESOLVED: "support_ticket_resolved",
  DOWNLOADS_PAGE_VIEWED: "downloads_page_viewed",
  CONNECTOR_PLATFORM_DETECTED: "connector_platform_detected",
  CONNECTOR_DOWNLOAD_SELECTED: "connector_download_selected",
});

const ALLOWED_EVENTS = new Set(Object.values(PRODUCT_EVENTS));
const SERVER_CONFIRMED_ONLY = new Set([
  PRODUCT_EVENTS.GENERATION_COMPLETED,
  PRODUCT_EVENTS.ARTIFACT_PUSHED_TO_STUDIO,
  PRODUCT_EVENTS.PURCHASE_COMPLETED,
]);

const FORBIDDEN_PROPERTY_RE = /(code|source|email|project[_-]?name|title|password|token|secret)/i;
const PROPERTY_ALIASES = {
  mode: "generator_mode",
  artifactType: "output_type",
  type: "output_type",
  from: "landing_page",
  length: "prompt_length",
  failureReason: "error_category",
  reason: "error_category",
  plan: "subscription_plan",
};

let analyticsPromise = null;
let providerPromise = null;
let authUnsubscribe = null;
let currentUserId = null;
const recentEvents = new Map();

function storage(kind = "localStorage") {
  if (typeof window === "undefined") return null;
  try {
    const s = window[kind];
    const probe = "__nexusrbx_analytics_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (_) {
    return null;
  }
}

function now() {
  return Date.now();
}

function randomId(prefix) {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${id}`;
}

export function getAnonymousUserId() {
  const s = storage("localStorage");
  if (!s) return randomId("anon");
  let id = s.getItem(ANON_USER_KEY);
  if (!id) {
    id = randomId("anon");
    s.setItem(ANON_USER_KEY, id);
  }
  if (!s.getItem(FIRST_SEEN_KEY)) s.setItem(FIRST_SEEN_KEY, String(now()));
  return id;
}

export function getAnonymousSessionId() {
  const s = storage("sessionStorage") || storage("localStorage");
  if (!s) return randomId("sess");
  const started = Number(s.getItem(SESSION_STARTED_KEY) || 0);
  let id = s.getItem(SESSION_KEY);
  if (!id || now() - started > SESSION_TTL_MS) {
    id = randomId("sess");
    s.setItem(SESSION_KEY, id);
    s.setItem(SESSION_STARTED_KEY, String(now()));
  }
  return id;
}

export function getProductAnalyticsContext() {
  const local = storage("localStorage");
  const firstSeenAt = Number(local?.getItem(FIRST_SEEN_KEY) || 0);
  return {
    anonymous_user_id: getAnonymousUserId(),
    anonymous_session_id: getAnonymousSessionId(),
    new_or_returning: firstSeenAt && now() - firstSeenAt > 24 * 60 * 60 * 1000 ? "returning" : "new",
    authenticated: Boolean(getAuth()?.currentUser),
  };
}

export function getProductAnalyticsHeaders() {
  const ctx = getProductAnalyticsContext();
  return {
    "X-Nexus-Anonymous-User-Id": ctx.anonymous_user_id,
    "X-Nexus-Anonymous-Session-Id": ctx.anonymous_session_id,
    ...getExperimentRequestHeaders(),
  };
}

function shouldRespectOptOut() {
  const local = storage("localStorage");
  const dnt =
    typeof navigator !== "undefined" &&
    (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1");
  return dnt || local?.getItem(OPT_OUT_KEY) === "true";
}

export function setProductAnalyticsOptOut(value) {
  const local = storage("localStorage");
  if (!local) return;
  local.setItem(OPT_OUT_KEY, value ? "true" : "false");
}

export function isAnalyticsDebugEnabled() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search || "");
  return params.get("analytics_debug") === "1" || storage("localStorage")?.getItem(DEBUG_KEY) === "true";
}

export function setAnalyticsDebugMode(value) {
  const local = storage("localStorage");
  if (!local) return;
  local.setItem(DEBUG_KEY, value ? "true" : "false");
}

function getAnalyticsInstance() {
  if (!analyticsPromise) analyticsPromise = initAnalytics();
  return analyticsPromise;
}

async function getProvider() {
  if (!providerPromise) {
    providerPromise = import("firebase/analytics").catch(() => null);
  }
  return providerPromise;
}

function landingPage() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname || "/"}${window.location.search || ""}`.slice(0, 120);
}

function landingPageCategory(path = landingPage()) {
  if (path === "/" || path.startsWith("/?")) return "homepage";
  if (path.startsWith("/ai")) return "ai_workspace";
  if (path.startsWith("/subscribe") || path.startsWith("/billing")) return "billing";
  if (path.startsWith("/icons")) return "icons";
  if (path.startsWith("/docs")) return "docs";
  if (path.startsWith("/downloads")) return "downloads";
  return "other";
}

function referrerCategory() {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (/google|bing|duckduckgo|yahoo|baidu|yandex/.test(host)) return "search";
    if (/nexusrbx|nexusairbx/.test(host)) return "internal";
    if (/youtube|twitter|x\.com|reddit|facebook|instagram|tiktok|discord/.test(host)) return "social";
    return "referral";
  } catch (_) {
    return "unknown";
  }
}

function deviceCategory() {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth || 0;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function deploymentVersion() {
  return (
    process.env.REACT_APP_DEPLOYMENT_VERSION ||
    process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA ||
    process.env.REACT_APP_GIT_SHA ||
    "unknown"
  );
}

function safeCountry() {
  if (typeof window === "undefined") return undefined;
  const value = window.__NEXUS_COUNTRY__;
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : undefined;
}

function normalizeScalar(value) {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim().slice(0, 100);
  return undefined;
}

export function categorizePrompt(value = "") {
  const text = String(value || "").toLowerCase();
  if (!text.trim()) return "empty";
  if (/(debug|fix|error|bug|broken|issue)/.test(text)) return "debug_fix";
  if (/(ui|interface|screen|button|menu|hud|inventory|shop)/.test(text)) return "ui";
  if (/(script|lua|luau|code|function|module)/.test(text)) return "script";
  if (/(model|asset|map|obby|terrain|part|building)/.test(text)) return "world_asset";
  if (/(game|round|leaderboard|quest|combat|tycoon|simulator)/.test(text)) return "gameplay";
  return "general";
}

function standardProperties(extra = {}) {
  const ctx = getProductAnalyticsContext();
  return {
    landing_page: landingPage(),
    landing_page_category: landingPageCategory(),
    referrer_category: referrerCategory(),
    device_category: deviceCategory(),
    country: safeCountry(),
    new_or_returning: ctx.new_or_returning,
    authenticated: ctx.authenticated,
    anonymous_user_id: ctx.anonymous_user_id,
    anonymous_session_id: ctx.anonymous_session_id,
    generator_mode: undefined,
    output_type: undefined,
    prompt_category: undefined,
    generation_latency_ms: undefined,
    error_category: undefined,
    subscription_plan: undefined,
    experiment_variant: undefined,
    ...getExperimentAnalyticsProperties(),
    deployment_version: deploymentVersion(),
    ...extra,
  };
}

export function sanitizeAnalyticsProperties(properties = {}) {
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(properties || {})) {
    const key = PROPERTY_ALIASES[rawKey] || rawKey;
    if (key === "prompt_text" || key === "full_prompt" || key === "prompt") continue;
    if (!key || FORBIDDEN_PROPERTY_RE.test(key)) continue;
    const value = normalizeScalar(rawValue);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function validateProductEvent(eventName, properties = {}) {
  if (!ALLOWED_EVENTS.has(eventName)) {
    return { ok: false, reason: "unsupported_event" };
  }
  if (SERVER_CONFIRMED_ONLY.has(eventName)) {
    return { ok: false, reason: "server_confirmed_only" };
  }
  const sanitized = sanitizeAnalyticsProperties(standardProperties(properties));
  return { ok: true, properties: sanitized };
}

function appendLocalEvent(event) {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(storage("localStorage")?.getItem(LOCAL_EVENTS_KEY) || "[]");
    const next = Array.isArray(current) ? current.slice(-MAX_LOCAL_EVENTS + 1) : [];
    next.push(event);
    storage("localStorage")?.setItem(LOCAL_EVENTS_KEY, JSON.stringify(next));
    window.__nexusAnalyticsEvents = next;
  } catch (_) {
    // Debug storage is best-effort only.
  }
}

function dedupeKeyFor(eventName, properties, options) {
  if (options?.dedupe === false) return null;
  if (options?.dedupeKey) return `${eventName}:${options.dedupeKey}`;
  return `${eventName}:${JSON.stringify(properties)}`;
}

function shouldDedupe(key) {
  if (!key) return false;
  const last = recentEvents.get(key) || 0;
  recentEvents.set(key, now());
  return now() - last < DEDUPE_TTL_MS;
}

async function identifyProviderUser(user) {
  try {
    const analytics = await getAnalyticsInstance();
    const provider = await getProvider();
    if (!analytics || !provider) return;
    provider.setUserId?.(analytics, user?.uid || null);
    if (user?.uid) {
      provider.setUserProperties?.(analytics, { authenticated: "true" });
    }
  } catch (_) {
    // Best-effort identity only.
  }
}

export function initProductAnalytics() {
  if (typeof window !== "undefined" && !window.nexusAnalytics) {
    window.nexusAnalytics = {
      debug: setAnalyticsDebugMode,
      optOut: setProductAnalyticsOptOut,
      events: () => {
        try {
          return JSON.parse(storage("localStorage")?.getItem(LOCAL_EVENTS_KEY) || "[]");
        } catch (_) {
          return [];
        }
      },
      context: getProductAnalyticsContext,
    };
  }
  if (!authUnsubscribe) {
    authUnsubscribe = onAuthStateChanged(getAuth(), (user) => {
      const previousUserId = currentUserId;
      currentUserId = user?.uid || null;
      void identifyProviderUser(user || null);
      if (user?.uid && previousUserId !== user.uid) {
        appendLocalEvent({
          event: "identity_linked",
          ts: now(),
          anonymous_user_id: getAnonymousUserId(),
          anonymous_session_id: getAnonymousSessionId(),
          authenticated_user_id: user.uid,
        });
      }
    });
  }
}

export async function trackProductEvent(eventName, properties = {}, options = {}) {
  try {
    initProductAnalytics();
    const validation = validateProductEvent(eventName, properties);
    if (!validation.ok) {
      if (isAnalyticsDebugEnabled()) {
        appendLocalEvent({ event: eventName, rejected: validation.reason, ts: now() });
      }
      return false;
    }
    const event = {
      event: eventName,
      ts: now(),
      properties: validation.properties,
    };
    if (shouldDedupe(dedupeKeyFor(eventName, event.properties, options))) return false;
    appendLocalEvent(event);
    if (isAnalyticsDebugEnabled() || shouldRespectOptOut()) return true;

    const analytics = await getAnalyticsInstance();
    if (!analytics) return true;
    const provider = await getProvider();
    provider?.logEvent?.(analytics, eventName, event.properties);
    return true;
  } catch (_) {
    return false;
  }
}

export function resetProductAnalyticsForTests() {
  analyticsPromise = null;
  providerPromise = null;
  currentUserId = null;
  recentEvents.clear();
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
}
