import React, { useEffect, useState } from "react";
import {
  downloadChatAttachment,
  readChatAttachment,
  insertChatAttachment,
  deleteChatAttachment,
  getChatAttachmentImport,
  undoChatAttachmentImport,
} from "../../../lib/chatAttachmentApi";
function ModelHierarchy({ instances, onRead, busy }) {
  const ids = new Set(instances.map((instance) => instance.id));
  const renderInstance = (instance) => (
    <details
      key={instance.id}
      className="border-l border-[var(--ds-border-subtle)] pl-2 py-1"
    >
      <summary
        className="cursor-pointer focus-ring"
        onClick={() => {
          if (!instance.properties) onRead(instance);
        }}
      >
        {instance.name}{" "}
        <span className="text-[var(--ds-text-muted)]">
          {instance.className}
        </span>
      </summary>
      {instance.properties && (
        <pre className="max-h-52 overflow-auto whitespace-pre-wrap">
          {instance.source ?? JSON.stringify(instance.properties, null, 2)}
        </pre>
      )}
      {instance.nextSourceOffset && (
        <button
          type="button"
          className="focus-ring py-1"
          disabled={busy}
          onClick={() => onRead(instance, instance.nextSourceOffset)}
        >
          Read more of this script
        </button>
      )}
      {instances
        .filter((child) => child.parentId === instance.id)
        .map(renderInstance)}
    </details>
  );
  return (
    <div className="max-h-72 overflow-auto">
      {instances
        .filter((instance) => !instance.parentId || !ids.has(instance.parentId))
        .map(renderInstance)}
    </div>
  );
}
export default function AttachmentCard({
  file,
  onRemove,
  onRetry,
  onPublish,
  studioConnected = false,
  studioSessionId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [insertion, setInsertion] = useState(null);
  const [importRevision, setImportRevision] = useState(0);
  useEffect(() => {
    if (!expanded || file.kind !== "model" || !file.versionId || deleted)
      return undefined;
    let cancelled = false,
      timer;
    const refresh = async () => {
      try {
        const result = await getChatAttachmentImport(file);
        if (cancelled) return;
        setInsertion(result);
        if (
          result &&
          !["succeeded", "failed", "cancelled", "expired", "rejected"].includes(
            result.status,
          )
        )
          timer = setTimeout(refresh, 2500);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };
    refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expanded, file.id, file.versionId, file.kind, deleted, importRevision]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!expanded || file.kind !== "image" || !file.versionId) return undefined;
    let url,
      cancelled = false;
    downloadChatAttachment(file, true)
      .then((blob) => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setPreview(url);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [expanded, file.id, file.versionId, file.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const readInstance = (instance, sourceOffset = 0) =>
    act(async () => {
      const full = await readChatAttachment(file, {
        instanceId: instance.id,
        sourceOffset,
      });
      setDetail((previous) => ({
        ...previous,
        instances: previous.instances.map((item) =>
          item.id === instance.id
            ? {
                ...full,
                source: sourceOffset
                  ? `${item.source || ""}${full.source || ""}`
                  : full.source,
              }
            : item,
        ),
      }));
    });
  const ready = !file.status || file.status === "ready";
  const button =
    "rounded px-2 py-1 text-xs text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] focus-ring disabled:opacity-50";
  if (deleted)
    return (
      <p className="text-xs text-[var(--ds-text-muted)]">
        {file.name} · deleted
      </p>
    );
  return (
    <article
      className="min-w-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2 text-xs text-[var(--ds-text)]"
      aria-label={`Attachment ${file.name}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left font-semibold focus-ring"
          disabled={!ready || !file.versionId}
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
            if (!expanded && file.kind !== "image")
              act(async () => setDetail(await readChatAttachment(file)));
          }}
        >
          {file.name}
        </button>
        {file.versionId && (
          <span className="text-[var(--ds-text-muted)]" title={file.versionId}>
            v{file.versionId.slice(0, 4)}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            className={button}
            aria-label={`Remove ${file.name}`}
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-1 text-[var(--ds-text-muted)]" role="status">
        {ready
          ? file.summary || "Ready"
          : file.status === "failed"
            ? file.error
            : "Uploading and processing…"}
      </p>
      {file.status === "failed" && onRetry && (
        <button type="button" className={button} onClick={onRetry}>
          Retry upload
        </button>
      )}
      {expanded && (
        <div className="mt-2 space-y-2">
          {preview && (
            <img
              src={preview}
              alt={file.name}
              className="max-h-52 max-w-full rounded object-contain"
            />
          )}
          {detail?.warning && <p role="status">{detail.warning}</p>}
          {detail?.instances && (
            <>
              <ModelHierarchy
                instances={detail.instances}
                onRead={readInstance}
                busy={busy}
              />
              {detail.nextLine && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const page = await readChatAttachment(file, {
                        startLine: detail.nextLine,
                      });
                      setDetail((previous) => ({
                        ...page,
                        instances: [...previous.instances, ...page.instances],
                      }));
                    })
                  }
                >
                  Load more objects
                </button>
              )}
            </>
          )}
          {detail?.lines && (
            <>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap">
                {detail.lines
                  .map((line) => String(line.line) + ": " + line.text)
                  .join("\n")}
              </pre>
              {detail.nextLine && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const page = await readChatAttachment(file, {
                        startLine: detail.nextLine,
                        startColumn: detail.nextColumn || 0,
                      });
                      setDetail((previous) => ({
                        ...page,
                        lines: [...previous.lines, ...page.lines],
                      }));
                    })
                  }
                >
                  Read more
                </button>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const blob = await downloadChatAttachment(file);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = file.name;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                })
              }
            >
              Download
            </button>
            {file.kind === "image" && onPublish && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => act(onPublish)}
              >
                Publish to Roblox
              </button>
            )}
            {!onRemove && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() =>
                  confirmDelete
                    ? act(async () => {
                        await deleteChatAttachment(file);
                        setDeleted(true);
                      })
                    : setConfirmDelete(true)
                }
              >
                {confirmDelete
                  ? "Confirm delete stored file"
                  : "Delete stored file"}
              </button>
            )}
            {confirmDelete && (
              <button
                type="button"
                className={button}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            )}
            {file.kind === "model" && (
              <button
                type="button"
                className={button}
                disabled={busy || !studioConnected}
                title={
                  !studioConnected ? "Connect Studio to insert this model" : ""
                }
                onClick={() =>
                  act(async () => {
                    await insertChatAttachment(
                      file,
                      detail?.instances?.every(
                        (n) => n.parentId || n.className === "ScreenGui",
                      )
                        ? "StarterGui"
                        : "Workspace",
                      studioSessionId,
                    );
                    setImportRevision((n) => n + 1);
                  })
                }
              >
                {insertion?.status === "failed"
                  ? "Retry insertion"
                  : "Insert into Studio"}
              </button>
            )}
            {insertion?.status === "succeeded" && !insertion.undo && (
              <button
                type="button"
                className={button}
                disabled={busy || !studioConnected}
                onClick={() =>
                  act(async () => {
                    await undoChatAttachmentImport(file);
                    setImportRevision((n) => n + 1);
                  })
                }
              >
                Undo insertion
              </button>
            )}
          </div>
          {insertion && (
            <p role="status">
              {insertion.status === "succeeded"
                ? insertion.undo
                  ? "Insertion undone and verified."
                  : "Inserted and verified in Studio."
                : insertion.status === "failed"
                  ? `Studio needs attention: ${insertion.error?.message || insertion.error || "Insertion failed."}`
                  : `${insertion.undo ? "Undo" : "Insertion"} ${insertion.status}.`}
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="status" className="mt-1 text-[var(--ds-text-secondary)]">
          {error}
        </p>
      )}
    </article>
  );
}
