export function preserveFailedUiRequest(message, document, history = []) {
  if (document?.sourceFiles?.length || document?.screens?.some(screen => screen.nodes?.length)
    || document?.designMemory) return message;

  const original = history.find(entry => entry.role === 'user'
    && typeof entry.content === 'string' && entry.content.trim())?.content.trim();
  if (!original || message.includes(original)) return message;
  return `Original UI request (preserve these requirements):\n${original}\n\nCurrent follow-up:\n${message}`;
}
