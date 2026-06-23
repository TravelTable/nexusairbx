export function parseStructuredGameProfile(gameSpec) {
  if (!gameSpec || typeof gameSpec !== "string") return null;
  try {
    const parsed = JSON.parse(gameSpec);
    if (parsed && typeof parsed === "object" && parsed.isStructured) {
      return parsed;
    }
  } catch (_) {
    // Legacy plain-text gameSpec
  }
  return null;
}

export function formatStructuredGameProfile(profile) {
  if (!profile?.enabled) return "";
  if (!profile.genre && !profile.theme && !profile.customNotes) return "";

  return `
[GAME CONTEXT]
Genre: ${profile.genre || "Not specified"}
Platforms: ${(profile.platforms || []).join(", ") || "Not specified"}
Theme: ${profile.theme || "Not specified"}
Primary Colors: ${profile.colors?.primary || "#00f5d4"}, ${profile.colors?.secondary || "#9b5de5"}
Systems: ${(profile.systems || []).join(", ") || "None specified"}
Notes: ${profile.customNotes || ""}
[/GAME CONTEXT]
`.trim();
}

/** Returns prompt-ready game context, or "" when profile context is disabled. */
export function resolveGameSpecForPrompt(gameSpec = "") {
  const raw = typeof gameSpec === "string" ? gameSpec : "";
  const structured = parseStructuredGameProfile(raw);
  if (structured) {
    return formatStructuredGameProfile(structured);
  }
  return raw.trim();
}
