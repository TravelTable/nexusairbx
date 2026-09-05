import { useCallback, useEffect, useRef } from "react";
import {
  uploadChatAttachment,
  validateAttachmentSelection,
} from "../lib/chatAttachmentApi";
export default function useChatAttachmentUpload({
  attachments,
  setAttachments,
  user,
  notify,
  enabled,
  modelsEnabled = true,
}) {
  const latest = useRef(attachments);
  latest.current = attachments;
  const active = useRef(new Map());
  useEffect(
    () => () => {
      active.current.forEach((controller) => controller.abort());
    },
    [],
  );
  const start = useCallback(
    async (file, localId) => {
      if (!latest.current.some((attachment) => attachment.localId === localId))
        return;
      const controller = new AbortController();
      active.current.set(localId, controller);
      setAttachments((previous) =>
        previous.map((a) =>
          a.localId === localId
            ? { ...a, status: "uploading", error: null }
            : a,
        ),
      );
      try {
        const attachment = await uploadChatAttachment(file, controller.signal);
        setAttachments((previous) =>
          previous.map((a) =>
            a.localId === localId
              ? { ...attachment, localId, retryFile: file }
              : a,
          ),
        );
      } catch (error) {
        if (error.name !== "AbortError")
          setAttachments((previous) =>
            previous.map((a) =>
              a.localId === localId
                ? {
                    ...a,
                    status: "failed",
                    error: error.message,
                    retryFile: file,
                  }
                : a,
            ),
          );
      } finally {
        active.current.delete(localId);
      }
    },
    [setAttachments],
  );
  const upload = useCallback(
    async (event) => {
      const files = Array.from(
        event?.target?.files || event?.dataTransfer?.files || [],
      );
      if (event?.target?.type === "file") event.target.value = "";
      if (!files.length) return;
      if (!enabled) {
        notify?.({
          message: "Chat attachments are not enabled yet.",
          type: "info",
        });
        return;
      }
      if (
        !modelsEnabled &&
        files.some((file) => /\.rbxmx?$/i.test(file.name))
      ) {
        notify?.({
          message: "Roblox model files are not enabled yet.",
          type: "info",
        });
        return;
      }
      if (!user) {
        notify?.({ message: "Sign in to attach files.", type: "info" });
        return;
      }
      try {
        validateAttachmentSelection(files, latest.current);
      } catch (error) {
        notify?.({ message: error.message, type: "error" });
        return;
      }
      const staged = files.map((file) => ({
        localId: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        status: "uploading",
        retryFile: file,
      }));
      latest.current = [...latest.current, ...staged];
      setAttachments((previous) => [...previous, ...staged]);
      // Bound concurrent uploads without turning one failed file into a failed batch.
      for (let index = 0; index < staged.length; index += 2)
        await Promise.all(
          staged
            .slice(index, index + 2)
            .map((item) => start(item.retryFile, item.localId)),
        );
    },
    [enabled, modelsEnabled, user, notify, setAttachments, start],
  );
  useEffect(() => {
    for (const [localId, controller] of active.current)
      if (!attachments.some((a) => a.localId === localId)) controller.abort();
  }, [attachments]);
  const retry = useCallback(
    (file) => {
      if (file.retryFile) return start(file.retryFile, file.localId);
      notify?.({
        message: "Choose this file again to retry the upload.",
        type: "info",
      });
    },
    [start, notify],
  );
  return { upload, retry };
}
