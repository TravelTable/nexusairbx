const SPECIAL_LABEL_RE = /[()&:+#/]|-->|->/;

function escapeLabel(text) {
  return String(text).replace(/"/g, "#quot;");
}

function quoteLabel(text) {
  return `"${escapeLabel(String(text).trim())}"`;
}

function isQuoted(text) {
  const t = String(text).trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
}

function labelNeedsQuoting(text) {
  if (!text || isQuoted(text)) return false;
  return SPECIAL_LABEL_RE.test(text);
}

function sanitizeSubroutineNodes(line) {
  return line.replace(
    /(\b[A-Za-z_][\w]*)\s*\[\s*\/([^[\]\n]+?)\/\s*\]/g,
    (_, id, label) => `${id}[${quoteLabel(label)}]`
  );
}

function sanitizeSquareBracketNodes(line) {
  return line.replace(/(\b[A-Za-z_][\w]*)\s*\[([^\]\n]+)\]/g, (match, id, label) => {
    const trimmed = label.trim();
    if (isQuoted(trimmed)) return match;
    // Preserve cylinder/database nodes like ID[(Label)].
    if (trimmed.startsWith("(")) return match;
    if (!labelNeedsQuoting(label)) return match;
    return `${id}[${quoteLabel(label)}]`;
  });
}

function findMatchingParen(text, openIndex) {
  if (text[openIndex] !== "(") return -1;
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function sanitizeRoundBracketNodes(line) {
  const pattern = /\b([A-Za-z_][\w]*)\s*\(/g;
  const replacements = [];
  let match = pattern.exec(line);

  while (match) {
    const id = match[1];
    const openParenIndex = match.index + match[0].length - 1;
    const closeIndex = findMatchingParen(line, openParenIndex);
    if (closeIndex !== -1) {
      const label = line.slice(openParenIndex + 1, closeIndex);
      if (labelNeedsQuoting(label)) {
        replacements.push({
          start: match.index,
          end: closeIndex + 1,
          text: `${id}[${quoteLabel(label)}]`,
        });
      }
    }
    match = pattern.exec(line);
  }

  let result = line;
  for (let i = replacements.length - 1; i >= 0; i -= 1) {
    const replacement = replacements[i];
    result = result.slice(0, replacement.start) + replacement.text + result.slice(replacement.end);
  }
  return result;
}

function sanitizeEdgeLabels(line) {
  return line.replace(/(-->|---|-\.->|==>)\s*\|([^|\n]+)\|/g, (match, arrow, label) => {
    const trimmed = label.trim();
    if (isQuoted(trimmed) || !labelNeedsQuoting(trimmed)) return match;
    return `${arrow}|${quoteLabel(trimmed)}|`;
  });
}

/**
 * Best-effort fixes for Mermaid 11 flowcharts produced by LLMs.
 * Converts invalid shapes/labels into quoted rectangle nodes.
 */
export function sanitizeMermaidChart(chart) {
  if (!chart || typeof chart !== "string") return "";

  return chart
    .split("\n")
    .map((line) => {
      if (!line.trim() || line.trim().startsWith("%%")) return line;
      let next = line;
      next = sanitizeSubroutineNodes(next);
      next = sanitizeSquareBracketNodes(next);
      next = sanitizeRoundBracketNodes(next);
      next = sanitizeEdgeLabels(next);
      return next;
    })
    .join("\n");
}
