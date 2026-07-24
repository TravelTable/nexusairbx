import { authedFetch as sharedAuthedFetch } from "./billing";
import {
  getRetryDelayMs,
  isRetryableApiError,
  NexusApiError,
  parseRetryAfterMs,
  readJsonResponse,
} from "./apiErrors";
import {
  jitterDelay,
  PollingLimitError,
  waitForPollingDelay,
} from "./boundedPolling";

const activeGenerationPolls = new Map();
const activeGenerationPollOwners = new Map();
const TERMINAL_GENERATION_STATUSES = new Set([
  "succeeded",
  "completed",
  "done",
  "failed",
  "cancelled",
  "canceled",
  "blocked",
  "iteration_limit",
  "timed_out",
]);

export function getGravatarUrl(email, size = 40) {
  if (!email) return null;
  function fallbackMd5(str) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
  const hash = fallbackMd5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

export function getUserInitials(email) {
  if (!email) return "U";
  const parts = email.split("@")[0].split(/[._]/);
  return parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2);
}

export function getExplanationBlocks(explanation = "") {
  if (!explanation.trim()) return [];
  return explanation
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const isBulletList = lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line));
      const isNumberList = lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));
      if (isBulletList) {
        return { type: "list", ordered: false, items: lines.map((line) => line.replace(/^[-*•]\s+/, "")) };
      }
      if (isNumberList) {
        return { type: "list", ordered: true, items: lines.map((line) => line.replace(/^\d+\.\s+/, "")) };
      }
      if (lines.length === 1) {
        const line = lines[0];
        if (line.startsWith("#")) return { type: "header", text: line.replace(/^#+\s*/, "") };
        if (line.startsWith("**") && line.endsWith("**") && line.length < 60) return { type: "header", text: line.replace(/\*\*/g, "") };
        if (/^[A-Z][a-zA-Z ]+:$/.test(line)) return { type: "header", text: line };
      }
      return { type: "paragraph", text: block };
    });
}

export async function authedFetch(user, url, init = {}) {
  if (!user) {
    throw new NexusApiError("Not signed in", {
      status: 401,
      code: "AUTH_REQUIRED",
      kind: "authentication",
      retryable: false,
    });
  }
  // Preserve the legacy call signature while routing generation requests
  // through the canonical ID-token + App Check + request-ID implementation.
  return sharedAuthedFetch(url, init);
}

async function runJobPoll(
  user,
  jobId,
  onTick,
  {
    signal,
    backendUrl,
    maxAttempts = 100,
    maxDurationMs = 5 * 60 * 1000,
    random = Math.random,
  }
) {
  let delay = 1200;
  let attempts = 0;
  const startedAt = Date.now();

  while (attempts < maxAttempts && Date.now() - startedAt < maxDurationMs) {
    attempts += 1;
    const res = await authedFetch(user, `${backendUrl}/api/jobs/${jobId}`, { method: "GET", signal });
    if (!res.ok) {
      let error;
      try {
        await readJsonResponse(res, "Failed to load generation job");
      } catch (caught) {
        error = caught;
      }
      if (!isRetryableApiError(error)) throw error;
      const retryAfterMs =
        parseRetryAfterMs(res.headers?.get?.("Retry-After")) ??
        getRetryDelayMs(error, delay);
      await waitForPollingDelay(jitterDelay(retryAfterMs, random), { signal });
      delay = Math.min(Math.round(delay * 1.8), 30000);
      continue;
    }

    const data = await readJsonResponse(res, "Failed to load generation job");
    onTick?.(data);
    if (TERMINAL_GENERATION_STATUSES.has(data.status)) return data;

    await waitForPollingDelay(jitterDelay(delay, random), { signal });
    delay = Math.min(Math.round(delay * 1.25), 3000);
  }

  throw new PollingLimitError(
    `Generation status polling stopped after ${attempts} attempts.`
  );
}

export function pollJob(user, jobId, onTick, options = {}) {
  const ownerKey = `${user?.uid || "anonymous"}:${options.backendUrl || ""}`;
  const pollKey = `${ownerKey}:${jobId}`;
  const activePoll = activeGenerationPolls.get(pollKey);
  if (activePoll) return activePoll;

  const priorOwnerPoll = activeGenerationPollOwners.get(ownerKey);
  if (priorOwnerPoll && priorOwnerPoll.pollKey !== pollKey) {
    priorOwnerPoll.controller.abort();
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", forwardAbort, { once: true });
  }

  const pollPromise = runJobPoll(user, jobId, onTick, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    options.signal?.removeEventListener("abort", forwardAbort);
    if (activeGenerationPolls.get(pollKey) === pollPromise) {
      activeGenerationPolls.delete(pollKey);
    }
    if (activeGenerationPollOwners.get(ownerKey)?.pollKey === pollKey) {
      activeGenerationPollOwners.delete(ownerKey);
    }
  });
  activeGenerationPolls.set(pollKey, pollPromise);
  activeGenerationPollOwners.set(ownerKey, {
    pollKey,
    controller,
  });
  return pollPromise;
}

export function safeGet(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function safeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function getAiBubbleSizing(text = "") {
  const len = text.length;
  if (len < 240) return { wrapClass: "max-w-2xl", bubbleClass: "text-base px-5 py-4" };
  if (len < 1200) return { wrapClass: "max-w-3xl", bubbleClass: "text-[15px] leading-6 px-6 py-5" };
  return { wrapClass: "max-w-4xl", bubbleClass: "text-[14px] leading-7 px-7 py-6" };
}

export function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString();
}

export function formatResetDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const toLocalTime = (ts) => {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts) || Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

export const safeFile = (title) =>
  ((title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) || "Script") + ".lua";
