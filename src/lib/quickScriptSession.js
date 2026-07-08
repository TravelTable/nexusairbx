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
    if (parsed.result) {
      parsed.result = normalizeQuickScriptResult(parsed.result, parsed.prompt || "");
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

function unwrapEmbeddedQuickScriptJson(value) {
  const text = String(value || "").trim();
  if (!text.startsWith("{") || !/"code"\s*:/.test(text)) return null;
  try {
    const nested = JSON.parse(text);
    if (!nested || typeof nested !== "object" || Array.isArray(nested) || !nested.code) return null;
    return nested;
  } catch (_) {
    return null;
  }
}

function coerceQuickScriptRaw(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const embedded = unwrapEmbeddedQuickScriptJson(raw.code);
    if (embedded) return { ...raw, ...embedded, code: embedded.code };
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const embedded = unwrapEmbeddedQuickScriptJson(parsed.code);
          if (embedded) return { ...parsed, ...embedded, code: embedded.code };
          return parsed;
        }
      } catch (_) {
        return { code: raw };
      }
    }
    return { code: raw };
  }
  return {};
}

function extractQuickScriptCode(parsed = {}, raw = "") {
  const embedded = unwrapEmbeddedQuickScriptJson(parsed.code);
  const source = embedded || parsed;
  const direct = String(source.code || "").replace(/\r\n/g, "\n").trim();
  if (!direct) return "";
  if (direct.startsWith("{") && direct.includes('"code"')) return String((embedded || {}).code || "").trim();
  const fenced = direct.match(/```(?:lua|luau)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return direct;
}

export function normalizeQuickScriptResult(raw, prompt = "") {
  const parsed = coerceQuickScriptRaw(raw);
  const code = extractQuickScriptCode(parsed, raw);
  const inferScriptType = (text = "", fallback = "Script") => {
    const value = String(text || "").toLowerCase();
    if (value.includes("localscript") || value.includes("client")) return "LocalScript";
    if (value.includes("modulescript") || value.includes("module")) return "ModuleScript";
    if (value.includes("server") || value.includes("serverscriptservice")) return "Script";
    return fallback;
  };
  const defaultLocationForScriptType = (scriptType) => {
    if (scriptType === "LocalScript") return "StarterPlayer/StarterPlayerScripts";
    if (scriptType === "ModuleScript") return "ReplicatedStorage";
    return "ServerScriptService";
  };
  const cleanList = (value, maxItems = 8) => {
    const list = Array.isArray(value) ? value : String(value || "").split(/\n+/);
    return list.map((item) => String(item || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, maxItems);
  };
  const scriptType = String(parsed.scriptType || parsed.script_type || inferScriptType(`${prompt}\n${code}`)).trim() || "Script";

  return {
    title: String(parsed.title || "Quick").replace(/\s+/g, " ").trim().slice(0, 100) || "Quick",
    code,
    language: "luau",
    scriptType,
    studioLocation: String(
      parsed.studioLocation || parsed.recommendedLocation || parsed.location || defaultLocationForScriptType(scriptType)
    ).replace(/\s+/g, " ").trim().slice(0, 180) || defaultLocationForScriptType(scriptType),
    setup: cleanList(parsed.setup || parsed.setupInstructions || ["Create the script at the recommended location and paste the code."]),
    requiredObjects: cleanList(parsed.requiredObjects || parsed.dependencies || []),
    testing: cleanList(parsed.testing || parsed.testingInstructions || ["Run Play in Studio and verify the behavior described in the prompt."]),
    limitations: cleanList(parsed.limitations || []),
    assumptions: cleanList(parsed.assumptions || []),
  };
}

export function quickScriptResultToAgentPrompt(prompt, result) {
  const normalized = normalizeQuickScriptResult(result, prompt);
  const code = String(normalized.code || "").trim();
  const setup = Array.isArray(normalized.setup) ? normalized.setup : [];
  const testing = Array.isArray(normalized.testing) ? normalized.testing : [];
  const requiredObjects = Array.isArray(normalized.requiredObjects) ? normalized.requiredObjects : [];
  const limitations = Array.isArray(normalized.limitations) ? normalized.limitations : [];

  return [
    "Expand this Quick result into an Agent Build. Preserve the user's original intent and use the existing generated script as context.",
    "",
    `Original prompt:\n${String(prompt || "").trim()}`,
    "",
    "Quick result:",
    `Title: ${normalized.title || "Quick"}`,
    `Script type: ${normalized.scriptType || "Script"}`,
    `Studio placement: ${normalized.studioLocation || "ServerScriptService"}`,
    requiredObjects.length ? `Required objects:\n${requiredObjects.map((item) => `- ${item}`).join("\n")}` : "",
    setup.length ? `Setup:\n${setup.map((item) => `- ${item}`).join("\n")}` : "",
    testing.length ? `Testing:\n${testing.map((item) => `- ${item}`).join("\n")}` : "",
    limitations.length ? `Limitations:\n${limitations.map((item) => `- ${item}`).join("\n")}` : "",
    code ? `Generated Luau:\n\`\`\`lua\n${code}\n\`\`\`` : "",
    "",
    "Agent Build may ask clarifying questions, create a plan, and produce multiple files or Studio workflow steps if needed.",
  ].filter(Boolean).join("\n");
}
