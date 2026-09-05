import { authedFetch } from "./billing";
export const CHAT_ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.lua,.luau,.txt,.md,.json,.rbxm,.rbxmx";
export const CHAT_ATTACHMENT_LIMITS = {
  files: 16,
  fileBytes: 20 * 1024 * 1024,
  messageBytes: 100 * 1024 * 1024,
};
async function json(res) {
  const body = await res.json();
  if (!res.ok)
    throw Object.assign(
      new Error(body.error || "Attachment operation failed."),
      { code: body.code },
    );
  return body;
}
export async function uploadChatAttachment(file, signal) {
  const form = new FormData();
  form.append("file", file);
  return json(
    await authedFetch("/api/attachments", {
      method: "POST",
      body: form,
      signal,
    }),
  );
}
export async function readChatAttachment(file, options = {}) {
  const query = new URLSearchParams({ versionId: file.versionId, ...options });
  return json(await authedFetch(`/api/attachments/${file.id}/read?${query}`));
}
export async function downloadChatAttachment(file, preview = false) {
  const res = await authedFetch(
    `/api/attachments/${file.id}/download?${new URLSearchParams({ versionId: file.versionId, preview: String(preview) })}`,
  );
  if (!res.ok) return json(res);
  return res.blob();
}
export async function insertChatAttachment(
  file,
  targetParentPath = "Workspace",
  sessionId,
) {
  return json(
    await authedFetch(`/api/attachments/${file.id}/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: file.versionId,
        contentHash: file.contentHash,
        targetParentPath,
        sessionId,
      }),
    }),
  );
}
export async function deleteChatAttachment(file) {
  return json(
    await authedFetch(`/api/attachments/${file.id}`, { method: "DELETE" }),
  );
}
export async function getChatAttachmentImport(file) {
  return json(
    await authedFetch(
      `/api/attachments/${file.id}/import?${new URLSearchParams({ versionId: file.versionId })}`,
    ),
  );
}
export async function undoChatAttachmentImport(file) {
  return json(
    await authedFetch(`/api/attachments/${file.id}/undo-import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: file.versionId }),
    }),
  );
}
export function validateAttachmentSelection(files, existing = []) {
  if (files.length + existing.length > CHAT_ATTACHMENT_LIMITS.files)
    throw new Error("Attach no more than 16 files per message.");
  if (
    [...existing, ...files].reduce(
      (n, f) => n + Number(f.sizeBytes || f.size || 0),
      0,
    ) > CHAT_ATTACHMENT_LIMITS.messageBytes
  )
    throw new Error("Attachments must total no more than 100 MiB.");
  for (const file of files) {
    if (
      !CHAT_ATTACHMENT_ACCEPT.split(",").includes(
        `.${file.name.split(".").pop().toLowerCase()}`,
      )
    )
      throw new Error(
        `${file.name}: unsupported format. Use images, text, Luau, JSON, RBXM or RBXMX.`,
      );
    if (!file.size || file.size > CHAT_ATTACHMENT_LIMITS.fileBytes)
      throw new Error(
        `${file.name}: choose a nonempty file no larger than 20 MiB.`,
      );
  }
}
