const DEFAULT_ATTACHMENT_LIMIT = 5;
const DEFAULT_DATA_LIMIT = 120000;
const DEFAULT_PROMPT_LIMIT = 12000;

function cleanText(value, limit = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeOneAttachment(attachment, options = {}) {
  if (!attachment || typeof attachment !== "object") return null;
  const includeData = options.includeData !== false;
  const dataLimit = Number(options.dataLimit || DEFAULT_DATA_LIMIT);
  const name = cleanText(attachment.name || attachment.fileName || "attachment", 160);
  const type = cleanText(attachment.type || attachment.mimeType || "application/octet-stream", 120);
  const isImage = Boolean(attachment.isImage || /^image\//i.test(type));
  const normalized = { name, type, isImage };
  if (includeData && attachment.data != null) {
    normalized.data = String(attachment.data).slice(0, dataLimit);
  }
  return normalized;
}

export function normalizeChatAttachments(attachments = [], options = {}) {
  if (!Array.isArray(attachments)) return [];
  const limit = Number(options.limit || DEFAULT_ATTACHMENT_LIMIT);
  return attachments
    .slice(0, limit)
    .map((attachment) => normalizeOneAttachment(attachment, options))
    .filter(Boolean);
}

export function describeChatAttachments(attachments = []) {
  const normalized = normalizeChatAttachments(attachments, { includeData: false });
  if (!normalized.length) return "";
  const names = normalized.map((attachment) => attachment.name).filter(Boolean);
  return `Attached: ${names.join(", ")}`;
}

export function formatChatAttachmentsForPrompt(attachments = [], options = {}) {
  const maxChars = Number(options.maxChars || DEFAULT_PROMPT_LIMIT);
  const normalized = normalizeChatAttachments(attachments, {
    includeData: true,
    dataLimit: maxChars,
  });
  if (!normalized.length) return "";

  let remaining = maxChars;
  const lines = [];
  for (const attachment of normalized) {
    if (remaining <= 0) break;
    lines.push(`- ${attachment.name} (${attachment.type})`);
    remaining -= lines[lines.length - 1].length;
    if (attachment.isImage) {
      lines.push("  [image data attached]");
      remaining -= 23;
      continue;
    }
    const data = String(attachment.data || "");
    if (!data) continue;
    if (/^data:/i.test(data)) {
      lines.push("  [binary data omitted]");
      remaining -= 23;
      continue;
    }
    const excerpt = data.slice(0, Math.max(0, remaining));
    lines.push(`\`\`\`\n${excerpt}\n\`\`\``);
    remaining -= excerpt.length;
  }
  return lines.length ? `Attached files:\n${lines.join("\n")}` : "";
}

export function messageToConversationEntry(message) {
  if (!message || typeof message !== "object") return null;
  const role = ["system", "assistant", "user"].includes(message.role) ? message.role : "user";
  const content = String(message.content || message.explanation || "").trim();
  const attachmentContext = formatChatAttachmentsForPrompt(message.attachments, { maxChars: 4000 });
  const combined = [content, attachmentContext].filter(Boolean).join("\n\n").trim();
  return combined ? { role, content: combined } : null;
}
