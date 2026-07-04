import { BACKEND_URL } from "../config";
import { parseApiErrorPayload } from "./billingErrors";

export const RECOVERY_WALL_TIMEOUT_MS = Number(
  process.env.REACT_APP_RECOVERY_WALL_TIMEOUT_MS || 15 * 60 * 1000
);

/** Extra wall-clock grace while a job is blocked on Studio plugin round-trips. */
export const STUDIO_WAIT_GRACE_MS = Number(
  process.env.REACT_APP_STUDIO_WAIT_GRACE_MS || 10 * 60 * 1000
);

const STAGE_LABELS = {
  queued: "Queued...",
  billing: "Checking billing...",
  generating: "Generating...",
  inspecting: "Waiting for Roblox Studio — open Studio with the Nexus plugin connected",
  validating: "Validating...",
  applying: "Applying to Studio...",
  running: "Generating...",
  planning: "Planning...",
};

export function isStudioWaitPayload(payload = {}) {
  return payload.waitingFor === "studio" || payload.jobStatus === "waiting_for_tool";
}

export function buildStreamUrl({ jobId, mode, afterSeq = 0, streamToken = null }) {
  const params = new URLSearchParams({
    jobId: String(jobId),
    mode: String(mode || "plan"),
    afterSeq: String(Number(afterSeq) || 0),
  });
  if (streamToken) {
    params.set("streamToken", String(streamToken));
  }
  return `${BACKEND_URL}/api/generate/stream?${params.toString()}`;
}

export function formatRecoveryStage(payload = {}) {
  if (isStudioWaitPayload(payload)) {
    return STAGE_LABELS.inspecting;
  }
  const stage = String(payload.stage || payload.jobStatus || "").toLowerCase();
  if (STAGE_LABELS[stage]) return STAGE_LABELS[stage];
  if (payload.stage) {
    const raw = String(payload.stage).replace(/_/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1) + (raw.endsWith("...") ? "" : "...");
  }
  return "Generating...";
}

export function updateSeqFromPayload(lastSeq, data) {
  const seq = Number(data?.seq);
  return Number.isFinite(seq) && seq > lastSeq ? seq : lastSeq;
}

/**
 * Poll /api/generate/result until done, failed, or timeout.
 * Calls onPending with each in-flight snapshot so the UI can show real backend stage.
 */
export async function pollJobResult({
  resultUrl,
  token,
  maxPolls = 45,
  pollBaseMs = 1000,
  wallTimeoutMs = RECOVERY_WALL_TIMEOUT_MS,
  onPending,
  fetchImpl = fetch,
  waitImpl = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const startedAt = Date.now();
  let waitedMs = 0;
  let effectiveDeadline = startedAt + wallTimeoutMs;

  for (let attempt = 0; attempt < maxPolls; attempt++) {
    if (Date.now() >= effectiveDeadline) {
      throw Object.assign(
        new Error(
          "Generation timed out while recovering the stream. The job may still be running on the server — try refreshing or starting a new chat."
        ),
        { code: "RECOVERY_TIMEOUT" }
      );
    }

    const res = await fetchImpl(resultUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : {};

    const billingFailure = parseApiErrorPayload(data);
    if (billingFailure || res.status === 402) {
      const err = new Error(billingFailure?.message || data?.message || "You're out of tokens.");
      err.code = "INSUFFICIENT_TOKENS";
      throw err;
    }

    if (res.status === 404) {
      throw new Error("Generation job not found.");
    }

    if (data?.status === "failed") {
      const err = new Error(data?.message || data?.error || "Generation failed");
      err.code = data?.code || "GENERATION_FAILED";
      throw err;
    }

    if (data?.done === true || data?.status === "done") {
      return data.result || data;
    }

    if (res.status === 202 || data?.status === "pending") {
      onPending?.(data);
      if (isStudioWaitPayload(data)) {
        effectiveDeadline = Math.max(effectiveDeadline, Date.now() + STUDIO_WAIT_GRACE_MS);
      }
      const delay = pollBaseMs * (attempt + 1);
      await waitImpl(delay);
      waitedMs += delay;
      continue;
    }

    if (!res.ok) {
      const text = typeof data?.message === "string" ? data.message : await res.text().catch(() => "");
      throw new Error(text || data?.error || `Failed to recover result (${res.status})`);
    }

    return data?.result || data;
  }

  throw Object.assign(new Error("Timed out while recovering streamed generation"), {
    code: "RECOVERY_TIMEOUT",
  });
}
