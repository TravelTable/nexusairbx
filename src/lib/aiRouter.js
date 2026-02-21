import { BACKEND_URL } from "../config";

const VALID_ACTIONS = new Set([
  "chat",
  "pipeline",
  "refine",
  "lint",
  "suggest_assets",
]);

function normalizeAction(action) {
  const next = String(action || "chat").toLowerCase();
  return VALID_ACTIONS.has(next) ? next : "chat";
}

export function createHeuristicRouteDecision({
  prompt,
  attachments = [],
  activeMode,
  chatMode = "plan",
  hasActiveUi,
}) {
  const normalizedPrompt = String(prompt || "").trim();
  const p = normalizedPrompt.toLowerCase();
  const hasImageAttachment = (attachments || []).some((a) => a?.isImage);
  const hasAttachment = (attachments || []).length > 0;

  const isUiRequest =
    p.startsWith("/ui") ||
    ["build ui", "menu", "screen", "hud", "shop", "layout", "frame", "interface"].some((k) => p.includes(k));

  const isRefineRequest =
    p.startsWith("refine:") ||
    p.startsWith("tweak:") ||
    p.includes("refine ui") ||
    (hasActiveUi && ["refine", "improve this ui", "tweak this ui", "polish this ui"].some((k) => p.includes(k)));

  const isLintRequest = [
    "audit",
    "security",
    "vulnerability",
    "remoteevent",
    "anti exploit",
    "exploit",
    "performance",
    "memory leak",
  ].some((k) => p.includes(k));

  const isAssetRequest =
    p.includes("asset") ||
    p.includes("icon") ||
    p.includes("image query") ||
    p.includes("suggest image") ||
    p.includes("texture");

  const isImportImageRequest =
    hasImageAttachment &&
    ["import", "extract", "from image", "from screenshot", "use this image", "recreate this"].some((k) =>
      p.includes(k)
    );

  if (isImportImageRequest) {
    return {
      action: "pipeline",
      targetMode: "ui",
      normalizedPrompt,
      reason: "heuristic: image-to-ui intent",
      source: "fallback",
    };
  }

  if (isRefineRequest) {
    return {
      action: "refine",
      targetMode: "ui",
      normalizedPrompt,
      reason: "heuristic: refine intent",
      source: "fallback",
    };
  }

  if (isUiRequest) {
    return {
      action: "pipeline",
      targetMode: "ui",
      normalizedPrompt,
      reason: "heuristic: ui intent",
      source: "fallback",
    };
  }

  if (hasAttachment && chatMode === "act" && activeMode === "ui" && hasActiveUi) {
    return {
      action: "refine",
      targetMode: "ui",
      normalizedPrompt,
      reason: "heuristic: act attachment refine",
      source: "fallback",
    };
  }

  if (isLintRequest) {
    return {
      action: "lint",
      targetMode: activeMode === "general" ? "security" : activeMode,
      normalizedPrompt,
      reason: "heuristic: lint intent",
      source: "fallback",
    };
  }

  if (isAssetRequest) {
    return {
      action: "suggest_assets",
      targetMode: activeMode === "general" ? "ui" : activeMode,
      normalizedPrompt,
      reason: "heuristic: asset intent",
      source: "fallback",
    };
  }

  return {
    action: "chat",
    targetMode: activeMode,
    normalizedPrompt,
    reason: "heuristic: default",
    source: "fallback",
  };
}

function parseRouteResponse(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  return {
    action: normalizeAction(data.action),
    targetMode: data.targetMode || fallback.targetMode,
    normalizedPrompt: String(data.normalizedPrompt || fallback.normalizedPrompt || "").trim(),
    reason: data.reason || fallback.reason,
    source: "backend",
  };
}

export async function resolveAiRouteDecision({
  user,
  prompt,
  attachments = [],
  activeMode = "general",
  chatMode = "plan",
  hasActiveUi = false,
  enabled = process.env.REACT_APP_AI_PAGE_V2 !== "false",
  backendUrl = BACKEND_URL,
  fetchImpl = fetch,
}) {
  const fallback = createHeuristicRouteDecision({
    prompt,
    attachments,
    activeMode,
    chatMode,
    hasActiveUi,
  });
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) return fallback;
  if (!enabled) return fallback;

  // Guests still get deterministic client fallback.
  if (!user) return fallback;

  try {
    const token = await user.getIdToken();
    const payload = {
      prompt: normalizedPrompt,
      attachments: (attachments || []).map((a) => ({
        type: a.type,
        isImage: !!a.isImage,
      })),
      activeMode,
      chatMode,
      hasActiveUi,
    };

    const res = await fetchImpl(`${backendUrl}/api/ui-builder/ai/route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    return parseRouteResponse(data, fallback);
  } catch (err) {
    return fallback;
  }
}

export default resolveAiRouteDecision;
