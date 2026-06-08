// src/lib/rojoExport.js
// Manual Studio bridge (replaces the removed Roblox Studio plugin):
//  1) buildRojoZip(...)    -> a Rojo-compatible project .zip (default.project.json + src/ tree)
//  2) buildStudioLoader(...) -> a single paste-into-Studio Luau snippet that rebuilds the
//     script instance tree under the correct services.
//
// Inputs are the artifact's generated Lua: { title, uiModuleLua, systemsLua, files }.
// `files` (Phase 4 multi-file output) is an array of { name, path, kind, content } where
// kind is "server" | "client" | "module". When no multi-file output is present we fall
// back to placing uiModuleLua (ModuleScript) + systemsLua (Script) sensibly.

import JSZip from "jszip";

// --- Roblox service mapping --------------------------------------------------
// kind -> { className, service folder under src/, Rojo path, Studio service }
const KIND_MAP = {
  module: {
    className: "ModuleScript",
    folder: "shared",
    ext: "lua",
    service: "ReplicatedStorage",
  },
  server: {
    className: "Script",
    folder: "server",
    ext: "server.lua",
    service: "ServerScriptService",
  },
  client: {
    className: "LocalScript",
    folder: "client",
    ext: "client.lua",
    service: "StarterPlayerScripts",
  },
};

function normalizeKind(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "server") return "server";
  if (k === "client" || k === "local") return "client";
  if (k === "module" || k === "shared" || k === "modulescript") return "module";
  return "module";
}

function sanitizeInstanceName(name, fallback = "Script") {
  const cleaned = String(name || "")
    .replace(/\.(server|client)\.lua$/i, "")
    .replace(/\.lua$/i, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

function baseNameFromFile(file, index) {
  if (file?.name && String(file.name).trim()) return file.name;
  if (file?.path) {
    const seg = String(file.path).replace(/\\/g, "/").split("/").pop();
    if (seg) return seg;
  }
  return `Script${index + 1}`;
}

/**
 * Normalize the various inputs into a flat list of scripts to place.
 * @returns {Array<{ name, kind, className, source }>}
 */
export function collectScripts({ uiModuleLua, systemsLua, files } = {}) {
  const scripts = [];
  const used = new Set(); // dedupe by `${kind}:${name}`

  const add = (rawName, kind, source, fallbackName) => {
    if (!source || !String(source).trim()) return;
    const normKind = normalizeKind(kind);
    let name = sanitizeInstanceName(rawName, fallbackName);
    let unique = name;
    let n = 2;
    while (used.has(`${normKind}:${unique}`)) unique = `${name}${n++}`;
    used.add(`${normKind}:${unique}`);
    scripts.push({
      name: unique,
      kind: normKind,
      className: KIND_MAP[normKind].className,
      source: String(source),
    });
  };

  // UI module is always a shared ModuleScript when present.
  if (uiModuleLua && String(uiModuleLua).trim()) {
    add("UI", "module", uiModuleLua, "UI");
  }

  const hasFiles = Array.isArray(files) && files.length > 0;
  if (hasFiles) {
    // Multi-file output supersedes the single systemsLua blob.
    files.forEach((f, i) => add(baseNameFromFile(f, i), f?.kind, f?.content, `Script${i + 1}`));
  } else if (systemsLua && String(systemsLua).trim()) {
    // Fallback: gameplay logic as a server Script.
    add("Systems", "server", systemsLua, "Systems");
  }

  return scripts;
}

export function safeProjectName(title) {
  const cleaned = String(title || "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return cleaned || "NexusRBX_Project";
}

/**
 * Build the Rojo project files (pure, no I/O).
 * @returns {{ projectName, projectJson, files: Array<{ path, content }>, scripts }}
 */
export function buildRojoProject({ title, uiModuleLua, systemsLua, files } = {}) {
  const projectName = safeProjectName(title);
  const scripts = collectScripts({ uiModuleLua, systemsLua, files });

  const out = [];
  const folders = new Set();
  scripts.forEach((s) => {
    const map = KIND_MAP[s.kind];
    folders.add(map.folder);
    out.push({ path: `src/${map.folder}/${s.name}.${map.ext}`, content: s.source });
  });

  // Only describe services that actually have content.
  const tree = { $className: "DataModel" };
  if (folders.has("shared")) tree.ReplicatedStorage = { $path: "src/shared" };
  if (folders.has("server")) tree.ServerScriptService = { $path: "src/server" };
  if (folders.has("client")) {
    tree.StarterPlayer = { StarterPlayerScripts: { $path: "src/client" } };
  }

  const projectJson = { name: projectName, tree };

  const projectJsonText = JSON.stringify(projectJson, null, 2);
  out.unshift({ path: "default.project.json", content: projectJsonText });
  out.push({ path: "README.md", content: buildReadme(projectName, scripts) });

  return { projectName, projectJson, projectJsonText, files: out, scripts };
}

function buildReadme(projectName, scripts) {
  const list = scripts.length
    ? scripts
        .map((s) => {
          const map = KIND_MAP[s.kind];
          return `- \`src/${map.folder}/${s.name}.${map.ext}\` -> ${s.className} in ${map.service}`;
        })
        .join("\n")
    : "- (no scripts)";
  return `# ${projectName}

Rojo project exported from NexusRBX.

## Use with Rojo

1. Install [Rojo](https://rojo.space/) and the Studio plugin (or the Rojo CLI).
2. From this folder run:

   \`\`\`bash
   rojo serve
   \`\`\`

3. In Roblox Studio, open the Rojo plugin and click **Connect**.

## Tree mapping

${list}

> Naming conventions: \`*.server.lua\` = Script, \`*.client.lua\` = LocalScript,
> plain \`*.lua\` = ModuleScript. \`init.lua\` would turn a folder into a script;
> these scripts are flat files so no \`init.lua\` is needed.

No Rojo? Use the **Copy Studio Loader** action instead and paste the snippet
into the Studio command bar.
`;
}

/**
 * Build the project and return a downloadable .zip Blob.
 * @returns {Promise<Blob>}
 */
export async function buildRojoZip(input) {
  const { files } = buildRojoProject(input);
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.path, f.content));
  return zip.generateAsync({ type: "blob" });
}

// --- Studio command-bar loader ----------------------------------------------

// Pick a long-string bracket level ([=[ ... ]=]) that does not collide with the
// source content, so arbitrary Lua (including nested long strings) embeds safely.
function safeLongBracket(source) {
  let level = 0;
  // Increase the number of '=' until the closing delimiter is absent from source.
  // Cap to avoid pathological loops; 32 levels is far beyond anything real.
  while (level < 32 && source.includes(`]${"=".repeat(level)}]`)) level += 1;
  const eq = "=".repeat(level);
  return { open: `[${eq}[`, close: `]${eq}]` };
}

function longString(source) {
  const { open, close } = safeLongBracket(source);
  // A leading newline after the opening bracket is ignored by Lua, which keeps
  // sources that start with a comment/line clean.
  return `${open}\n${source}\n${close}`;
}

/**
 * Generate a single self-contained Luau snippet for the Studio command bar that
 * recreates the script instances (correct ClassName + Parent) with their source.
 * @returns {string}
 */
export function buildStudioLoader({ title, uiModuleLua, systemsLua, files } = {}) {
  const projectName = safeProjectName(title);
  const scripts = collectScripts({ uiModuleLua, systemsLua, files });

  const lines = [];
  lines.push(`-- NexusRBX Studio Loader: ${projectName}`);
  lines.push(`-- HOW TO USE: open Roblox Studio, show the Command Bar (View > Command Bar),`);
  lines.push(`-- paste this whole snippet, and press Enter. It rebuilds the generated`);
  lines.push(`-- scripts as instances under the correct services. Re-running replaces them.`);
  lines.push(``);
  lines.push(`local ReplicatedStorage = game:GetService("ReplicatedStorage")`);
  lines.push(`local ServerScriptService = game:GetService("ServerScriptService")`);
  lines.push(`local StarterPlayer = game:GetService("StarterPlayer")`);
  lines.push(`local StarterPlayerScripts = StarterPlayer:FindFirstChild("StarterPlayerScripts")`);
  lines.push(`if not StarterPlayerScripts then`);
  lines.push(`\tStarterPlayerScripts = Instance.new("StarterPlayerScripts")`);
  lines.push(`\tStarterPlayerScripts.Parent = StarterPlayer`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`-- All generated instances are nested under one folder per service so they`);
  lines.push(`-- are easy to find and a re-run cleanly replaces the previous export.`);
  lines.push(`local FOLDER_NAME = ${JSON.stringify(projectName)}`);
  lines.push(``);
  lines.push(`local function container(parent)`);
  lines.push(`\tlocal existing = parent:FindFirstChild(FOLDER_NAME)`);
  lines.push(`\tif existing then existing:Destroy() end`);
  lines.push(`\tlocal folder = Instance.new("Folder")`);
  lines.push(`\tfolder.Name = FOLDER_NAME`);
  lines.push(`\tfolder.Parent = parent`);
  lines.push(`\treturn folder`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`local function place(parent, className, name, source)`);
  lines.push(`\tlocal inst = Instance.new(className)`);
  lines.push(`\tinst.Name = name`);
  lines.push(`\tinst.Source = source`);
  lines.push(`\tinst.Parent = parent`);
  lines.push(`\treturn inst`);
  lines.push(`end`);
  lines.push(``);

  if (scripts.length === 0) {
    lines.push(`warn("[NexusRBX] Nothing to load: no script source was provided.")`);
    return lines.join("\n");
  }

  // Only create the folders we actually need.
  const byService = {
    ReplicatedStorage: scripts.filter((s) => s.kind === "module"),
    ServerScriptService: scripts.filter((s) => s.kind === "server"),
    StarterPlayerScripts: scripts.filter((s) => s.kind === "client"),
  };
  const serviceVar = {
    ReplicatedStorage: "ReplicatedStorage",
    ServerScriptService: "ServerScriptService",
    StarterPlayerScripts: "StarterPlayerScripts",
  };

  let total = 0;
  Object.entries(byService).forEach(([service, group]) => {
    if (group.length === 0) return;
    const folderVar = `folder_${service}`;
    lines.push(`local ${folderVar} = container(${serviceVar[service]})`);
    group.forEach((s) => {
      lines.push(
        `place(${folderVar}, ${JSON.stringify(s.className)}, ${JSON.stringify(s.name)}, ${longString(
          s.source
        )})`
      );
      total += 1;
    });
    lines.push(``);
  });

  lines.push(`print(("[NexusRBX] Loaded %d script(s) under '%s'."):format(${total}, FOLDER_NAME))`);
  return lines.join("\n");
}
