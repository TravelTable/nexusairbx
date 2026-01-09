/**
 * Robustly extracts the UI manifest JSON from a Lua script.
 * Handles various AI formatting quirks like missing braces, trailing commas,
 * and different Roblox string delimiters.
 */
export function extractUiManifestFromLua(lua) {
  if (!lua || typeof lua !== "string") return null;

  // 1. Flexible match for Roblox long strings: --[==[UI_BUILDER_JSON ... ]==]
  // Matches any number of '=' signs, and handles variations in the tag name.
  const longStringRegex = /--\[(=*)\[(?:UI_BUILDER_JSON|UI_MANIFEST|BOARD_STATE)\s*([\s\S]*?)\s*\]\1\]/i;
  const match = lua.match(longStringRegex);
  
  let jsonText = "";
  if (match && match[2]) {
    jsonText = match[2].trim();
  } else {
    // Fallback: Search for anything that looks like the manifest if the tag is missing.
    // We look for the core structure: canvasSize and items.
    const fallbackRegex = /\{[\s\S]*?"canvasSize"[\s\S]*?"items"[\s\S]*?\}/;
    const fallbackMatch = lua.match(fallbackRegex);
    if (fallbackMatch) {
      jsonText = fallbackMatch[0].trim();
    } else {
      // Last ditch effort: find the largest JSON-like block
      const lastDitchRegex = /\{[\s\S]*\}/;
      const lastDitchMatch = lua.match(lastDitchRegex);
      if (lastDitchMatch && lastDitchMatch[0].includes('"items"')) {
        jsonText = lastDitchMatch[0].trim();
      } else {
        return null;
      }
    }
  }

  // 2. Cleanup: Remove markdown code fences and normalize quotes
  jsonText = jsonText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .replace(/[\u201C\u201D]/g, '"') // Normalize smart double quotes
    .replace(/[\u2018\u2019]/g, "'"); // Normalize smart single quotes

  // 3. Handle missing outer braces
  if (jsonText.includes('"canvasSize"') && !jsonText.startsWith("{")) {
    jsonText = "{" + jsonText;
  }
  if (jsonText.includes('"items"') && !jsonText.endsWith("}")) {
    jsonText = jsonText + "}";
  }

  // 4. Strip trailing commas (very common AI mistake that breaks JSON.parse)
  jsonText = jsonText.replace(/,\s*([\]}])/g, "$1");

  // 5. Attempt to parse, with a recovery loop for truncated JSON
  try {
    return attemptParse(jsonText);
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting recovery...", e);
    return attemptRecoverTruncatedJson(jsonText);
  }
}

function attemptParse(text) {
  try {
    const parsed = JSON.parse(text);
    
    // 1. Standard boardState wrapper
    if (parsed?.boardState && Array.isArray(parsed.boardState.items)) {
      return parsed.boardState;
    }
    
    // 2. Direct boardState object
    if (parsed?.items && Array.isArray(parsed.items)) {
      return parsed;
    }
    
    // 3. Raw array of items
    if (Array.isArray(parsed)) {
      return {
        canvasSize: { w: 1280, h: 720 },
        items: parsed
      };
    }
    
    return null;
  } catch (e) {
    throw e;
  }
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
