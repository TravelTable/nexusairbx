import { useEffect, useRef } from "react";
export default function useChatDraftPersistence({
  uid,
  chatId,
  prompt,
  attachments,
  setPrompt,
  setAttachments,
}) {
  const skipSave = useRef(false);
  const key = uid ? `nexus:chat-draft:v2:${uid}:${chatId || "new"}` : null;
  useEffect(() => {
    skipSave.current = true;
    let draft = null;
    try {
      draft = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
    } catch {
      /* Corrupt or unavailable local storage must not prevent chat. */
    }
    setPrompt(typeof draft?.prompt === "string" ? draft.prompt : "");
    setAttachments(
      Array.isArray(draft?.attachments)
        ? draft.attachments.filter(
            (a) => a.id && a.versionId && a.status === "ready",
          )
        : [],
    );
  }, [key, setPrompt, setAttachments]);
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!key) return;
    try {
      const ready = attachments
        .filter((a) => a.id && a.versionId && a.status === "ready")
        .map(({ retryFile, localId, ...a }) => a);
      if (!prompt && !ready.length) localStorage.removeItem(key);
      else
        localStorage.setItem(
          key,
          JSON.stringify({ prompt, attachments: ready }),
        );
    } catch {
      /* Draft persistence is best effort when storage is unavailable. */
    }
  }, [key, prompt, attachments]);
}
