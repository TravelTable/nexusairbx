export function stripTags(text) {
  if (!text) return "";
  return text
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<plan>[\s\S]*?<\/plan>/gi, "")
    .replace(/<explanation>([\s\S]*?)<\/explanation>/gi, "$1")
    .replace(/<code>[\s\S]*?<\/code>/gi, "")
    .trim();
}
