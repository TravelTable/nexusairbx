/**
 * Robustly extracts the UI manifest JSON from a Lua script.
 * Handles various AI formatting quirks like missing braces, trailing commas,
 * and different Roblox string delimiters.
 */
export function extractUiManifestFromLua(lua) {
  if (!lua || typeof lua !== "string") return null;

  // 1. Flexible match for Roblox long strings: --[==[UI_BUILDER_JSON ... ]==]
  // Matches any number of '=' signs.
  const longStringRegex = /--\[(=*)\[UI_BUILDER_JSON\s*([\s\S]*?)\s*\]\1\]/;
  const match = lua.match(longStringRegex);
  
  let jsonText = "";
  if (match && match[2]) {
    jsonText = match[2].trim();
  } else {
    // Fallback: Search for anything that looks like the manifest if the tag is missing
    const fallbackRegex = /\{[\s\S]*"canvasSize"[\s\S]*"items"[\s\S]*\}/;
    const fallbackMatch = lua.match(fallbackRegex);
    if (fallbackMatch) {
      jsonText = fallbackMatch[0].trim();
    } else {
      return null;
    }
  }

  // 2. Cleanup: Remove markdown code fences if the AI accidentally included them
  jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "");

  // 3. Handle missing outer braces
  if (jsonText.includes('"canvasSize"') && !jsonText.startsWith("{")) {
    jsonText = "{" + jsonText + "}";
  }

  // 4. Strip trailing commas (very common AI mistake that breaks JSON.parse)
  // This regex handles commas before closing braces or brackets, even with whitespace/newlines
  jsonText = jsonText.replace(/,\s*([\]}])/g, "$1");

  // 5. Attempt to parse, with a recovery loop for truncated JSON
  try {
    return attemptParse(jsonText);
  } catch (e) {
    // If it failed, it might be truncated. Try to "close" it.
    return attemptRecoverTruncatedJson(jsonText);
  }
}

function attemptParse(text) {
  const parsed = JSON.parse(text);
  // The manifest might be wrapped in { "boardState": ... } or be the boardState itself
  return parsed?.boardState || (parsed?.items ? parsed : null);
}

function attemptRecoverTruncatedJson(text) {
  let currentText = text.trim();
  // Limit attempts to prevent infinite loops
  for (let i = 0; i < 10; i++) {
    try {
      // Try adding a closing brace
      const recovered = JSON.parse(currentText + "}");
      return recovered?.boardState || (recovered?.items ? recovered : null);
    } catch {
      try {
        // Try adding a closing bracket then brace
        const recovered = JSON.parse(currentText + "]}");
        return recovered?.boardState || (recovered?.items ? recovered : null);
      } catch {
        // Remove the last character and try again in the next iteration
        // (or just keep appending if we think it's just missing ends)
        currentText += "}"; 
      }
    }
  }
  return null;
}
