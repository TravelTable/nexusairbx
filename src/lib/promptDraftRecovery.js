export function restoreFailedPromptDraft({
  prompt,
  attachments = [],
  setPrompt,
  setAttachments,
} = {}) {
  const promptToRestore = String(prompt || "").trim();
  const attachmentsToRestore = Array.isArray(attachments) ? [...attachments] : [];

  if (promptToRestore && typeof setPrompt === "function") {
    setPrompt((current) => (String(current || "").trim() ? current : promptToRestore));
  }
  if (attachmentsToRestore.length && typeof setAttachments === "function") {
    setAttachments((current) => (
      Array.isArray(current) && current.length ? current : attachmentsToRestore
    ));
  }
}
