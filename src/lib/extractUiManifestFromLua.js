/**
 * Robustly extracts the UI manifest JSON from a Lua script.
 * Handles various AI formatting quirks like missing braces, trailing commas,
 * and different Roblox string delimiters.
 */
export function extractUiManifestFromLua(lua) {
  if (!lua || typeof lua !== "string") return null;

  // 1. Flexible match for Roblox long strings: --[==[UI_BUILDER_JSON ... ]==]
  // Matches any number of '=' signs, and handles variations in the tag name.
  const longStringRegex = /--\[(=*)\[(?:UI_BUILDER_JSON|UI_MANIFEST|BOARD_STATE|JSON)\s*([\s\S]*?)\s*\]\1\]/i;
  const match = lua.match(longStringRegex);
  
  let jsonText = "";
  if (match && match[2]) {
    jsonText = match[2].trim();
  } else {
    // Fallback: Search for anything that looks like the manifest if the tag is missing.
    // We look for the core structure: canvasSize/width and items/elements.
    const fallbackRegex = /\{[\s\S]*?(?:"canvasSize"|"width")[\s\S]*?(?:"items"|"elements")[\s\S]*?\}/;
    const fallbackMatch = lua.match(fallbackRegex);
    if (fallbackMatch) {
      jsonText = fallbackMatch[0].trim();
    } else {
      // Last ditch effort: find the largest JSON-like block
      const lastDitchRegex = /\{[\s\S]*\}/;
      const lastDitchMatch = lua.match(lastDitchRegex);
      if (lastDitchMatch && (lastDitchMatch[0].includes('"items"') || lastDitchMatch[0].includes('"elements"'))) {
        jsonText = lastDitchMatch[0].trim();
      } else {
        // Check for boardState wrapper specifically
        if (lua.includes('"boardState"')) {
           const boardStateRegex = /\{[\s\S]*?"boardState"[\s\S]*?\}/;
           const boardStateMatch = lua.match(boardStateRegex);
           if (boardStateMatch) {
             jsonText = boardStateMatch[0].trim();
           } else {
             return null;
           }
        } else {
          return null;
        }
      }
    }
  }

  // 2. Cleanup: Remove markdown code fences and normalize quotes
  jsonText = jsonText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/[\u201C\u201D]/g, '"') // Normalize smart double quotes
    .replace(/[\u2018\u2019]/g, "'"); // Normalize smart single quotes

  // 3. Handle missing outer braces
  if ((jsonText.includes('"canvasSize"') || jsonText.includes('"width"')) && !jsonText.startsWith("{")) {
    jsonText = "{" + jsonText;
  }
  if ((jsonText.includes('"items"') || jsonText.includes('"elements"')) && !jsonText.endsWith("}")) {
    jsonText = jsonText + "}";
  }

  // 4. Strip trailing commas (very common AI mistake that breaks JSON.parse)
  jsonText = jsonText.replace(/,\s*([\]}])/g, "$1");

  // 5. Attempt to parse, with a robust recovery for truncated JSON
  try {
    return attemptParse(jsonText);
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting robust recovery...", e);
    return balanceAndParseJson(jsonText);
  }
}

/**
 * Balances unclosed braces and brackets in a truncated JSON string.
 */
function balanceAndParseJson(text) {
  let clean = text.trim();
  
  // If it's obviously truncated (ends with a comma or property name)
  // try to find the last valid object/array boundary
  const lastComma = clean.lastIndexOf(",");
  const lastOpenBrace = clean.lastIndexOf("{");
  const lastOpenBracket = clean.lastIndexOf("[");
  
  // If it ends mid-property or mid-value, back up to the last comma or brace
  if (clean.match(/[:"a-zA-Z0-9]$/)) {
    const backupIndex = Math.max(lastComma, lastOpenBrace, lastOpenBracket);
    if (backupIndex !== -1) {
      clean = clean.slice(0, backupIndex);
    }
  }

  const stack = [];
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}') {
      if (stack[stack.length - 1] === '}') stack.pop();
    } else if (char === ']') {
      if (stack[stack.length - 1] === ']') stack.pop();
    }
  }

  // Close everything in reverse order
  let recoveredText = clean;
  while (stack.length > 0) {
    recoveredText += stack.pop();
  }

  try {
    return attemptParse(recoveredText);
  } catch (e) {
    // Final fallback: try to extract any valid items array we can find
    try {
      const itemsMatch = recoveredText.match(/"(?:items|elements)"\s*:\s*\[([\s\S]*?)\]/);
      if (itemsMatch) {
        const itemsJson = "[" + itemsMatch[1].replace(/,\s*$/, "") + "]";
        const items = JSON.parse(itemsJson);
        return attemptParse(JSON.stringify({ items }));
      }
    } catch (e2) {
      console.error("Manifest recovery failed completely", e2);
    }
    return null;
  }
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    w: item.w ?? item.width,
    h: item.h ?? item.height
  }));
}

function attemptParse(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed) return null;

    const normalize = (obj) => {
      const items = obj.items || obj.elements;
      if (!Array.isArray(items)) return null;
      
      return {
        items: normalizeItems(items),
        canvasSize: obj.canvasSize || { 
          w: obj.w ?? obj.width ?? 1280, 
          h: obj.h ?? obj.height ?? 720 
        },
        catalog: obj.catalog || []
      };
    };

    // 1. Standard boardState wrapper
    if (parsed.boardState) {
      // Handle double nesting: { boardState: { boardState: { items: [] }, canvasSize: {} } }
      const innerBS = parsed.boardState.boardState || parsed.boardState;
      const result = normalize(innerBS);
      if (result) {
        // If the outer wrapper had canvasSize, prefer it
        if (parsed.boardState.canvasSize) {
          result.canvasSize = parsed.boardState.canvasSize;
        }
        return result;
      }
    }

    // 2. Direct boardState object
    const result = normalize(parsed);
    if (result) return result;
    
    // 3. Raw array of items
    if (Array.isArray(parsed)) {
      return {
        canvasSize: { w: 1280, h: 720 },
        items: normalizeItems(parsed)
      };
    }
    
    return null;
  } catch (e) {
    throw e;
  }
}
