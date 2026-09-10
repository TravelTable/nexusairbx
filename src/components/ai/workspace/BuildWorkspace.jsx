import NexusSelect from "../../ui/NexusSelect";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

const TABS = [
  ["file", "Files"], ["change", "Studio"], ["asset", "Assets"], ["test", "Tests"],
];
const statusLabel = status => ({ not_run: "Not yet run", unavailable: "Unavailable", passed: "Passed", failed: "Failed", running: "Running" }[status]
  || String(status || "Pending").replaceAll("_", " "));

// Monaco Uri.parse treats text before the first ":" as a URI scheme. scopeKey is
// JSON.stringify(scope), so `${scopeKey}:artifact:path` is not a legal URI.
function toMonacoModelPath(identity) {
  return `inmemory://model/${encodeURIComponent(identity)}`;
}

/**
 * items are canonical, current-project output references, NOT chat messages.
 * readFile({artifactId, revision, path}, {signal}) must perform an authenticated
 * backend read and return the exact {source, revision} stored for that output.
 */
export default function BuildWorkspace({ scopeKey, items = [], readFile, connection = "connected", error = "", onReconnect,
  onClose, activity, studioContent, advanced, initialView = "file", embedded = false }) {
  const [tab, setTab] = useState(initialView);
  const [showActivity, setShowActivity] = useState(initialView === "activity");
  const [selectedId, setSelectedId] = useState("");
  const [historySelection, setHistorySelection] = useState(null);
  const [fileState, setFileState] = useState({ key: "", identity: "", status: "empty", source: "", hasSource: false, loadedRevision: "", error: "" });
  const requestRef = useRef(0);
  const files = useMemo(() => items.filter(item => item.kind === "file"), [items]);
  const fileGroups = useMemo(() => {
    const groups = new Map();
    for (const file of files) {
      const directory = file.path?.split("/").slice(0, -1).join("/") || "Project";
      if (!groups.has(directory)) groups.set(directory, []);
      groups.get(directory).push(file);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [files]);
  const selected = files.find(file => file.id === selectedId) || files[0] || null;
  const fileIdentity = selected ? `${scopeKey}:${selected.artifactId}:${selected.path}` : "";
  const revisions = [...new Set([selected?.revision, ...(selected?.revisions || [])].filter(Boolean))];
  const selectedRevision = historySelection?.identity === fileIdentity && revisions.includes(historySelection.revision)
    ? historySelection.revision : selected?.revision;
  const fileKey = selected ? `${fileIdentity}:${selectedRevision}` : "";
  const artifactId = selected?.artifactId;
  const path = selected?.path;

  useEffect(() => { setSelectedId(""); setTab(initialView === "activity" ? "change" : initialView); setShowActivity(initialView === "activity"); }, [scopeKey, initialView]);
  useEffect(() => {
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    if (!fileKey) {
      setFileState({ key: "", identity: "", status: "empty", source: "", hasSource: false, loadedRevision: "", error: "" });
      return () => controller.abort();
    }
    const reference = { artifactId, revision: selectedRevision, path };
    setFileState(previous => previous.identity === fileIdentity
      ? { ...previous, key: fileKey, status: "loading", error: "" }
      : { key: fileKey, identity: fileIdentity, status: "loading", source: "", hasSource: false, loadedRevision: "", error: "" });
    Promise.resolve().then(() => {
      if (typeof readFile !== "function") throw new Error("The file reader is not connected.");
      return readFile(reference, { signal: controller.signal });
    }).then(result => {
      if (controller.signal.aborted || requestRef.current !== requestId) return;
      if (typeof result?.source !== "string" || result.revision !== reference.revision) {
        throw new Error("The file revision changed. Reopen the latest version.");
      }
      setFileState({ key: fileKey, identity: fileIdentity, status: "ready", source: result.source, hasSource: true, loadedRevision: result.revision, error: "" });
    }).catch(error => {
      if (controller.signal.aborted || requestRef.current !== requestId) return;
      setFileState(previous => ({ ...previous, key: fileKey, status: "error", error: error?.message || "Could not load this file." }));
    });
    return () => controller.abort();
  }, [fileKey, fileIdentity, readFile, artifactId, selectedRevision, path]);

  const visible = items.filter(item => item.kind === tab);
  const ready = fileState.hasSource && fileState.key === fileKey;
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col border-l border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]"
      aria-label="Build workspace">
      {!embedded ? <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Build</h2>
        <button type="button" onClick={onClose} aria-label="Close build workspace"
          className="rounded px-2 py-1 text-xs hover:underline">Close</button>
      </header> : null}
      <nav className="flex shrink-0 gap-1 border-b border-[var(--ds-border-subtle)] px-2" aria-label="Build views">
        {TABS.map(([kind, label]) => (
          <button key={kind} type="button" aria-pressed={tab === kind && !showActivity} onClick={() => { setTab(kind); setShowActivity(false); }}
            className={`px-3 py-2 text-xs ${tab === kind ? "border-b-2 border-[var(--ds-accent)] font-semibold" : "text-[var(--ds-text-muted)]"}`}>
            {label} {items.filter(item => item.kind === kind).length || ""}
          </button>
        ))}
      </nav>
      {activity ? <div className="shrink-0 px-3 py-2"><button type="button" onClick={() => setShowActivity(value => !value)} aria-expanded={showActivity}
        className="text-xs underline focus-visible:outline">{showActivity ? "Hide build activity" : "Activity and actions"}</button></div> : null}
      {error ? <div role="alert" className="px-4 py-2 text-xs">{error} {onReconnect ? <button type="button" onClick={onReconnect} className="underline">Retry connection</button> : null}</div> : null}
      {connection !== "connected" ? <p role="status" className="px-4 py-2 text-xs">{connection === "waiting" ? "Waiting for the build to start…"
        : connection === "loading" ? "Loading saved build outputs…" : "Reconnecting to saved build outputs…"}</p> : null}
      {showActivity ? <div className="min-h-0 flex-1 overflow-y-auto">{activity}
        {advanced ? <details className="m-3 text-xs"><summary className="cursor-pointer">Advanced diagnostics</summary>{advanced}</details> : null}
      </div> : tab === "file" ? (
        files.length ? <div className="flex min-h-0 flex-1 flex-col">
          <label className="shrink-0 px-3 pt-2 text-xs text-[var(--ds-text-muted)]">Open file
            <NexusSelect aria-label="Generated file path" value={selected?.id || ""} onChange={event => setSelectedId(event.target.value)}
              className="mt-1 w-full min-w-0 rounded border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-2 py-1">
              {fileGroups.map(([directory, entries]) => <optgroup key={directory} label={directory}>
                {entries.map(file => <option key={file.id} value={file.id}>{file.path?.split("/").pop() || file.name || "File"}</option>)}
              </optgroup>)}
            </NexusSelect>
          </label>
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--ds-border-subtle)] p-2" aria-label="Generated files">
            {files.map(file => <button key={file.id} type="button" onClick={() => setSelectedId(file.id)}
              aria-pressed={selected?.id === file.id} title={file.path}
              className={`shrink-0 rounded px-2 py-1 text-xs ${selected?.id === file.id ? "bg-[var(--ds-fill-subtle)]" : "text-[var(--ds-text-muted)]"}`}>
              {file.path || file.name || "File"}
            </button>)}
          </div>
          <div className="shrink-0 break-all px-3 py-2 text-xs text-[var(--ds-text-muted)]">
            {selected?.path} · {selected?.status || "Draft"}
            {ready ? ` · showing revision ${fileState.loadedRevision}` : ""}
            {revisions.length > 1 ? <label className="mt-2 flex items-center gap-2">Revision
              <NexusSelect aria-label="Saved file revision" value={selectedRevision}
                onChange={event => setHistorySelection({ identity: fileIdentity, revision: event.target.value })}
                className="min-w-0 rounded border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] p-1">
                {revisions.map(revision => <option key={revision} value={revision}>{revision}{revision === selected?.revision ? " (current)" : " (saved)"}</option>)}
              </NexusSelect>
            </label> : null}
          </div>
          {ready && fileState.status !== "ready" ? <p role={fileState.status === "error" ? "alert" : "status"}
            className="shrink-0 px-3 pb-2 text-xs text-[var(--ds-text-muted)]">
            {fileState.status === "error" ? `${fileState.error} The last loaded revision remains visible.` : "Loading the latest saved revision…"}
          </p> : null}
          <div className="min-h-0 flex-1">
            {ready ? <Editor height="100%" language="lua" path={toMonacoModelPath(fileIdentity)} theme="vs-dark" value={fileState.source}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false,
                automaticLayout: true, wordWrap: "off", padding: { top: 12 } }} />
              : <p role={fileState.status === "error" ? "alert" : "status"} className="p-4 text-sm">
                {fileState.status === "error" ? fileState.error : "Loading the saved file…"}
              </p>}
          </div>
        </div> : !error ? <p className="p-4 text-sm text-[var(--ds-text-muted)]">No files have been saved for this build yet.</p> : null
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "change" && studioContent ? <details className="mb-3 text-xs"><summary className="cursor-pointer py-2">Inspect live Studio files</summary>{studioContent}</details> : null}
          {!visible.length ? <p className="text-sm text-[var(--ds-text-muted)]">Nothing recorded here yet.</p> : (
            <ul className="space-y-3">
              {visible.map(item => <li key={item.id} className="border-b border-[var(--ds-border-subtle)] pb-3 text-sm">
                {tab === "asset" && /^https:\/\//i.test(item.thumbnailUrl || "") ? <img src={item.thumbnailUrl} alt=""
                  loading="lazy" className="mb-2 h-20 w-20 rounded object-contain" /> : null}
                <div className="break-all font-medium">{item.name || item.path || item.id}</div>
                <div className="mt-1 text-xs text-[var(--ds-text-muted)]">{statusLabel(item.status || (tab === "test" ? "not_run" : "Pending"))}</div>
                {tab === "asset" && item.path ? <div className="mt-1 break-all text-xs">Used in {item.path}</div> : null}
                {item.message ? <p className="mt-1 text-xs">{item.message}</p> : null}
                {tab === "test" && (item.detail || item.manualSteps?.length) ? <div className="mt-3 text-xs">
                  <h3 className="font-medium">Manual verification required</h3>
                  {item.detail ? <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.detail}</p> : null}
                  {item.manualSteps?.length ? <>
                    <p className="mt-2 leading-relaxed">In Roblox Studio, start a playtest and check these requirements against the saved build:</p>
                    <ol className="mt-2 list-decimal space-y-2 pl-5">
                      {item.manualSteps.map((step, index) => <li key={index} className="whitespace-pre-wrap break-words leading-relaxed">{step}</li>)}
                    </ol>
                  </> : null}
                  <p className="mt-2 text-[var(--ds-text-muted)]">This check remains unverified until a result is recorded for this build.</p>
                </div> : null}
              </li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
