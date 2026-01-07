export function extractUiManifestFromLua(lua) {
  if (!lua || typeof lua !== "string") return null;

  // Matches the block:
  // --[==[UI_BUILDER_JSON
  // {...}
  // ]==]
  const m = lua.match(/--\[\=\=\[UI_BUILDER_JSON\s*([\s\S]*?)\s*\]\=\=\]/);
  if (!m || !m[1]) return null;

  try {
    const parsed = JSON.parse(m[1].trim());
    return parsed?.boardState || null;
  } catch {
    return null;
  }
}
