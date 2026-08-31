/**
 * Cursor-style @ commands available in the AI workspace composer.
 * Keep ids stable — they are inserted as `@id` tokens and used for action routing.
 */

export const COMPOSER_COMMANDS = Object.freeze([
  {
    id: "studio",
    label: "@studio",
    description: "View the active Studio plugin connection",
    action: "open_studio_place",
  },
  {
    id: "asset",
    label: "@asset",
    description: "Attach Roblox assets from your library",
    action: "open_asset_library",
  },
  {
    id: "file",
    label: "@file",
    description: "Upload an image or attach a code/text file",
    action: "attach_file",
  },
  {
    id: "controls",
    label: "@controls",
    description: "Show Live Studio and Roblox controls",
    action: "open_controls",
  },
  {
    id: "improve",
    label: "@improve",
    description: "Expand your prompt into a detailed brief",
    action: "improve_prompt",
  },
  {
    id: "refine",
    label: "@refine",
    description: "Refine the current workspace project surgically",
    action: "start_refine",
  },
]);

export const COMPOSER_PLACEHOLDER_HINTS = Object.freeze([
  "Ask the Studio agent to build, inspect, wire, or fix…",
  "Type @studio to open the Studio connection",
  "Type @asset to attach Roblox assets",
  "Type @file to upload an image or script",
  "Type @controls for Live Studio settings",
  "Type @improve to expand your prompt",
  "Type @refine to iterate on the current project",
]);

export function filterComposerCommands(query = "", commands = COMPOSER_COMMANDS) {
  const q = String(query || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) return [...commands];
  return commands.filter((command) => {
    const id = String(command.id || "").toLowerCase();
    const label = String(command.label || "").toLowerCase().replace(/^@/, "");
    const description = String(command.description || "").toLowerCase();
    return id.startsWith(q)
      || label.startsWith(q)
      || id.includes(q)
      || label.includes(q)
      || (command.kind === "file" && description.includes(q));
  });
}

/**
 * Detect an active @-mention query at the caret.
 * @returns {{ start: number, end: number, query: string } | null}
 */
export function getActiveComposerMention(text = "", caret = 0) {
  const value = String(text || "");
  const pos = Math.max(0, Math.min(Number(caret) || 0, value.length));
  const before = value.slice(0, pos);
  const match = before.match(/(^|[\s([{])@([^\s@]*)$/);
  if (!match) return null;
  const query = match[2] || "";
  const start = before.length - query.length - 1;
  return { start, end: pos, query };
}

export function applyComposerMention(text = "", mention, commandId, insertionToken = null) {
  const value = String(text || "");
  const token = String(insertionToken || `@${commandId}`).trim();
  if (!mention || typeof mention.start !== "number") {
    const needsSpace = value && !/\s$/.test(value);
    return `${value}${needsSpace ? " " : ""}${token} `;
  }
  const before = value.slice(0, mention.start);
  const after = value.slice(mention.end);
  const insertion = `${token} `;
  return `${before}${insertion}${after}`;
}

export function extractComposerFileReferences(text = "") {
  const references = [];
  const seen = new Set();
  const matcher = /@\{([^}\r\n]+)\}/g;
  let match = matcher.exec(String(text || ""));
  while (match) {
    const path = String(match[1] || "").trim();
    const key = path.toLowerCase();
    if (path && !seen.has(key)) {
      seen.add(key);
      references.push({ path, token: match[0] });
    }
    match = matcher.exec(String(text || ""));
  }
  return references;
}

export function removeComposerFileReference(text = "", path = "") {
  const target = String(path || "").trim().toLowerCase();
  if (!target) return String(text || "");
  return String(text || "")
    .replace(/@\{([^}\r\n]+)\}\s*/g, (token, candidate) => (
      String(candidate || "").trim().toLowerCase() === target ? "" : token
    ))
    .replace(/[ \t]{2,}/g, " ")
    .trimStart();
}
