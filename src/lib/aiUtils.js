import md5 from 'md5'; // Import md5

/**
 * Robustly extracts and parses JSON from AI response text.
 */
export function safeParseJson(text, fallback = null) {
  if (!text || typeof text !== "string") return fallback;

  // Helper to extract code blocks (if any)
  const extractCodeBlock = (t) => {
    if (!t || typeof t !== "string") return "";
    const regex = /(?:```|''')(?:[a-zA-Z0-9]+)?\s*([\s\S]*?)\s*(?:```|''')/i;
    const match = t.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    let cleaned = t.trim();
    cleaned = cleaned.replace(/^(?:```|''')(?:[a-zA-Z0-9]+)?\s*/i, "");
    cleaned = cleaned.replace(/\s*(?:```|''')$/i, "");
    return cleaned.trim();
  };

  const code = extractCodeBlock(text, "json");
  try {
    return JSON.parse(code);
  } catch (e) {
    // If direct parse fails, try to find the first { or [ and last } or ]
    const firstBrace = code.indexOf("{");
    const firstBracket = code.indexOf("[");

    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;

    const lastBrace = code.lastIndexOf("}");
    const lastBracket = code.lastIndexOf("]");

    let end = -1;
    if (lastBrace !== -1 && lastBracket !== -1) end = Math.max(lastBrace, lastBracket);
    else if (lastBrace !== -1) end = lastBrace;
    else if (lastBracket !== -1) end = lastBracket;

    if (start !== -1 && end !== -1 && end > start) {
      const candidate = code.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (e2) {
        // Try stripping trailing commas
        const stripped = candidate.replace(/,\s*([\]}])/g, "$1");
        try {
          return JSON.parse(stripped);
        } catch (e3) {
          return fallback;
        }
      }
    }
  }
  return fallback;
}

/**
 * Formats a number with commas for readability.
 */
export const formatNumber = (num) => {
  if (typeof num !== "number" || isNaN(num)) return "0";
  return num.toLocaleString();
};

/**
 * Formats a date for display, typically for reset dates.
 */
export const formatResetDate = (dateInput) => {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Generates a Gravatar URL for a given email.
 */
export const getGravatarUrl = (email) => {
  if (!email) return "https://www.gravatar.com/avatar/?d=mp"; // Default gravatar
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=mp`;
};

/**
 * Extracts initials from an email address or name.
 */
export const getUserInitials = (email) => {
  if (!email) return "?";
  const parts = email.split('@')[0].split('.');
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email[0].toUpperCase();
};

/**
 * Converts a UTC timestamp to a local time string.
 */
export const toLocalTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString();
};
