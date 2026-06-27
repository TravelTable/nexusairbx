const STORAGE_KEY = "nexusrbx:quick-script-session";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function storage() {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = "__nexusrbx_quick_script_probe__";
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

export function loadQuickScriptSession() {
  const s = storage();
  if (!s) return null;
  try {
    const parsed = JSON.parse(s.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (Number(parsed.updatedAt || 0) + MAX_AGE_MS < now()) {
      s.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function saveQuickScriptSession(next) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify({ ...(next || {}), updatedAt: now() }));
    return true;
  } catch (_) {
    return false;
  }
}

export function clearQuickScriptSession() {
  storage()?.removeItem(STORAGE_KEY);
}

export function quickScriptResultToAgentPrompt(prompt, result) {
  const code = String(result?.code || "").trim();
  const setup = Array.isArray(result?.setup) ? result.setup : [];
  const testing = Array.isArray(result?.testing) ? result.testing : [];
  const requiredObjects = Array.isArray(result?.requiredObjects) ? result.requiredObjects : [];
  const limitations = Array.isArray(result?.limitations) ? result.limitations : [];

  return [
    "Expand this Quick Script into an Agent Build. Preserve the user's original intent and use the existing generated script as context.",
    "",
    `Original prompt:\n${String(prompt || "").trim()}`,
    "",
    "Quick Script result:",
    `Title: ${result?.title || "Quick Script"}`,
    `Script type: ${result?.scriptType || "Script"}`,
    `Studio placement: ${result?.studioLocation || "ServerScriptService"}`,
    requiredObjects.length ? `Required objects:\n${requiredObjects.map((item) => `- ${item}`).join("\n")}` : "",
    setup.length ? `Setup:\n${setup.map((item) => `- ${item}`).join("\n")}` : "",
    testing.length ? `Testing:\n${testing.map((item) => `- ${item}`).join("\n")}` : "",
    limitations.length ? `Limitations:\n${limitations.map((item) => `- ${item}`).join("\n")}` : "",
    code ? `Generated Luau:\n\`\`\`lua\n${code}\n\`\`\`` : "",
    "",
    "Agent Build may ask clarifying questions, create a plan, and produce multiple files or Studio workflow steps if needed.",
  ].filter(Boolean).join("\n");
}
