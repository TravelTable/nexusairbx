// src/lib/normalizeArtifact.js
//
// Normalizes any backend generation payload into ONE canonical multi-file
// artifact shape used by the code-first agent workspace. It accepts both:
//   - the new files[]-first worker payload, and
//   - the legacy shapes (single `code`/`content`, or UI `uiModuleLua`/`systemsLua`).
//
// boardState (the old preview manifest) is intentionally dropped — the workspace
// is code-first and never renders a visual canvas.

import { v4 as uuidv4 } from "uuid";

// The seven Roblox service placements the workspace groups files under.
export const ROBLOX_PLACEMENTS = [
  "ServerScriptService",
  "ReplicatedStorage",
  "StarterPlayerScripts",
  "StarterGui",
  "Workspace",
  "ServerStorage",
  "StarterPack",
];

export const FILE_KINDS = ["server", "client", "module", "ui", "config", "docs"];

const KIND_TO_PLACEMENT = {
  server: "ServerScriptService",
  client: "StarterPlayerScripts",
  module: "ReplicatedStorage",
  ui: "StarterGui",
  config: "ReplicatedStorage",
  docs: "ReplicatedStorage",
};

export function placementForKind(kind) {
  return KIND_TO_PLACEMENT[String(kind || "").toLowerCase()] || "ReplicatedStorage";
}

export function normalizeKind(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "server") return "server";
  if (k === "client" || k === "local" || k === "localscript") return "client";
  if (k === "ui" || k === "gui" || k === "screengui") return "ui";
  if (k === "config" || k === "configuration" || k === "data") return "config";
  if (k === "docs" || k === "doc" || k === "readme" || k === "markdown") return "docs";
  if (k === "module" || k === "shared" || k === "modulescript") return "module";
  return "";
}

// Best-effort classification when the backend doesn't tag a file.
export function inferKind(name = "", path = "", content = "") {
  const explicit = normalizeKind(name) || normalizeKind(path);
  const hay = `${name} ${path}`.toLowerCase();
  if (/\.md$/.test(hay) || /readme/.test(hay)) return "docs";
  if (/\.(json|toml)$/.test(hay) || /config/.test(hay)) return "config";
  if (/\.client\b|localscript|\bclient\b/.test(hay)) return "client";
  if (/\.server\b|serverscript|\bserver\b|sss/.test(hay)) return "server";
  if (/screengui|startergui|\bui\b|\bhud\b|\bmenu\b/.test(hay)) return "ui";
  const code = String(content || "");
  if (/LocalPlayer|PlayerGui|UserInputService|game\.Players\.LocalPlayer/.test(code)) return "client";
  if (/PlayerAdded|DataStoreService|:OnServerEvent|:OnServerInvoke|game:GetService\("ServerScriptService"\)/.test(code))
    return "server";
  if (/^\s*local\s+\w+\s*=\s*\{[\s\S]*\}\s*return\s+\w+\s*$/m.test(code)) return "module";
  if (/return\s+\w+\s*$/m.test(code)) return "module";
  return explicit || "module";
}

function languageForKind(kind, explicit) {
  if (explicit) return explicit;
  if (kind === "docs") return "markdown";
  if (kind === "config") return "json";
  return "luau";
}

function safeName(name, path, index) {
  if (name && String(name).trim()) return String(name).trim();
  if (path) {
    const seg = String(path).replace(/\\/g, "/").split("/").filter(Boolean).pop();
    if (seg) return seg;
  }
  return `Script${index + 1}`;
}

function toStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v?.message || v?.text || ""))
      .map((v) => String(v).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

// Normalize a single raw file entry into the canonical file shape.
export function normalizeFile(rawFile, index = 0) {
  const raw = rawFile || {};
  const content = typeof raw.content === "string" ? raw.content : String(raw.code || raw.source || "");
  const name = safeName(raw.name, raw.path, index);
  const kind = normalizeKind(raw.kind) || inferKind(name, raw.path, content);
  const placement = raw.placement && String(raw.placement).trim() ? String(raw.placement).trim() : placementForKind(kind);
  return {
    id: raw.id || `${index}-${name}`,
    name,
    path: raw.path ? String(raw.path) : `${placement}/${name}`,
    placement,
    kind,
    language: languageForKind(kind, raw.language),
    content,
    purpose: raw.purpose || raw.description || "",
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.filter(Boolean) : [],
    warnings: toStringArray(raw.warnings || raw.notes),
    validation: raw.validation || null,
    status: raw.status || "generated",
  };
}

function inferArtifactType(raw, files) {
  const explicit = String(raw.artifactType || raw.type || raw.metadata?.type || "").toLowerCase();
  if (["script", "project", "ui", "system"].includes(explicit)) return explicit;
  if (files.length > 1) return "project";
  if (files.some((f) => f.kind === "ui")) return "ui";
  return "script";
}

// Build the canonical artifact from any backend payload (done event / assistant
// message / legacy UI payload).
export function normalizeArtifact(raw = {}, opts = {}) {
  let files = [];

  if (Array.isArray(raw.files) && raw.files.length) {
    files = raw.files.map((f, i) => normalizeFile(f, i));
  } else {
    // Legacy synthesis: UI module + systems, or a single code/content blob.
    const uiModule = raw.uiModuleLua || (raw.metadata?.type === "ui" ? raw.code || raw.content : "");
    const systems = raw.systemsLua || "";
    const single = raw.code || raw.content || "";

    if (uiModule && String(uiModule).trim()) {
      files.push(
        normalizeFile(
          { name: "UI", kind: "module", placement: "ReplicatedStorage", content: uiModule, purpose: "Generated UI module (instantiates and lays out the interface)." },
          files.length
        )
      );
    }
    if (systems && String(systems).trim()) {
      files.push(
        normalizeFile(
          { name: "Systems", kind: "client", placement: "StarterPlayerScripts", content: systems, purpose: "Client logic that drives the interface." },
          files.length
        )
      );
    }
    if (!files.length && single && String(single).trim()) {
      const kind = inferKind(raw.title || "", "", single);
      files.push(
        normalizeFile(
          { name: raw.title || "Script", kind, content: single, purpose: raw.explanation ? "" : "Generated Luau script." },
          0
        )
      );
    }
  }

  const generatedAt = raw.generatedAt || opts.generatedAt || Date.now();
  return {
    id: raw.id || raw.artifactId || raw.projectId || opts.id || uuidv4(),
    title: raw.title || opts.title || "Generated Artifact",
    summary: raw.summary || raw.explanation || opts.summary || "",
    type: inferArtifactType(raw, files),
    prompt: raw.prompt || opts.prompt || "",
    files,
    setupSteps: toStringArray(raw.setupSteps),
    testingSteps: toStringArray(raw.testingSteps),
    securityNotes: toStringArray(raw.securityNotes),
    warnings: toStringArray(raw.warnings),
    plan: raw.plan || "",
    qaReport: raw.metadata?.qaReport || raw.qaReport || null,
    versionNumber: raw.versionNumber || 1,
    artifactId: raw.artifactId || null,
    projectId: raw.projectId || null,
    generatedAt,
    updatedAt: raw.updatedAt || generatedAt,
  };
}

// True when an assistant chat message carries a generated artifact worth opening
// in the workspace (i.e. it produced code/files, not just a plan/clarify).
export function messageHasArtifact(m) {
  if (!m || m.role !== "assistant") return false;
  if (m.stage === "plan" || m.stage === "plan_approved" || m.stage === "clarify" || m.stage === "clarify_answered")
    return false;
  if (m.metadata?.mode === "plan") return false;
  return !!(
    (Array.isArray(m.files) && m.files.length) ||
    m.code ||
    m.uiModuleLua ||
    m.content
  );
}

export function artifactFromMessage(m) {
  if (!messageHasArtifact(m)) return null;
  return normalizeArtifact(
    {
      ...m,
      title: m.title || "Generated Artifact",
      generatedAt: m.createdAt?.toMillis?.() || m.createdAt || Date.now(),
    },
    { id: m.id, prompt: m.prompt || "" }
  );
}
