import React, { useState, useCallback, useEffect } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { Copy, Check, Pencil, Eye, RotateCcw, FileCode2, Save, RefreshCw, Files } from "lib/icons";
import CodeEditorTabs from "./CodeEditorTabs";
import ArtifactInspector from "./ArtifactInspector";
import ExportActions from "./ExportActions";

// Monaco owns an isolated color system, so define both variants and select the
// active one from the document theme rather than coupling the editor to Settings.
function defineNexusThemes(monaco) {
  try {
    monaco.editor.defineTheme("nexus-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "878A91", fontStyle: "italic" },
        { token: "keyword", foreground: "A78BFA" },
        { token: "string", foreground: "8BC59A" },
        { token: "number", foreground: "D8AD65" },
      ],
      colors: {
        "editor.background": "#0B0B0C",
        "editor.foreground": "#F5F5F3",
        "editorLineNumber.foreground": "#666970",
        "editorLineNumber.activeForeground": "#D2D3D5",
        "editor.selectionBackground": "#A78BFA4D",
        "editor.inactiveSelectionBackground": "#A78BFA26",
        "editor.lineHighlightBackground": "#F5F5F30A",
        "editorCursor.foreground": "#A78BFA",
        "editorWidget.background": "#17181B",
        "editorWidget.border": "#3A3D44",
      },
    });

    monaco.editor.defineTheme("nexus-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64666D", fontStyle: "italic" },
        { token: "keyword", foreground: "6D28D9" },
        { token: "string", foreground: "2F7045" },
        { token: "number", foreground: "80530F" },
      ],
      colors: {
        "editor.background": "#FBFBF8",
        "editor.foreground": "#171719",
        "editorLineNumber.foreground": "#96989F",
        "editorLineNumber.activeForeground": "#393A3F",
        "editor.selectionBackground": "#6D28D933",
        "editor.inactiveSelectionBackground": "#6D28D91F",
        "editor.lineHighlightBackground": "#1717190A",
        "editorCursor.foreground": "#6D28D9",
        "editorWidget.background": "#FDFDFA",
        "editorWidget.border": "#D1D2CE",
      },
    });
  } catch {
    /* Monaco may already have registered these themes. */
  }
}

function readDocumentTheme() {
  if (typeof document !== "undefined") {
    const theme = document.documentElement?.dataset?.theme;
    if (theme === "light" || theme === "dark") return theme;
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches) {
    return "light";
  }
  return "dark";
}

function useDocumentTheme() {
  const [theme, setTheme] = useState(readDocumentTheme);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setTheme(readDocumentTheme());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    media?.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", update);
    };
  }, []);

  return theme;
}

function monacoLanguage(lang) {
  const l = String(lang || "luau").toLowerCase();
  if (l === "luau" || l === "lua") return "lua";
  if (l === "markdown" || l === "md") return "markdown";
  if (l === "json") return "json";
  return l;
}

// The center panel: file tabs, Monaco editor, per-file inspector, and export bar.
// This is the primary surface of the workspace (code-first, no preview).
export default function CodeWorkspace({
  artifact,
  activeFile,
  onSelectFile,
  onChangeContent,
  onRevertEdits,
  onSaveFile,
  onSaveAllFiles,
  onRevertFile,
  onRefreshFile,
  onCloseFile,
  onSaveToCreations,
  saving = false,
  conflict = null,
  notify,
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");
  const [savingToCreations, setSavingToCreations] = useState(false);
  const documentTheme = useDocumentTheme();
  const monacoTheme = documentTheme === "light" ? "nexus-light" : "nexus-dark";

  useEffect(() => {
    if (!conflict) {
      setMergeOpen(false);
      setMergeSource("");
      return;
    }
    setMergeSource(conflict.localSource || conflict.attemptedSource || "");
  }, [conflict]);

  const handleEditorMount = useCallback((editor, monaco) => {
    defineNexusThemes(monaco);
    monaco.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify?.({ message: "Failed to copy file", type: "error" });
    }
  }, [activeFile, notify]);

  const handleSaveToCreations = useCallback(async () => {
    if (!onSaveToCreations || !activeFile || savingToCreations) return;
    setSavingToCreations(true);
    try {
      await onSaveToCreations(artifact?.title || "Script", activeFile.content || "");
    } finally {
      setSavingToCreations(false);
    }
  }, [activeFile, artifact?.title, onSaveToCreations, savingToCreations]);

  if (!artifact) {
    return (
      <div className="pc-page-gutter h-full flex flex-col items-center justify-center text-center bg-[var(--ds-bg-workspace)]">
        <div className="mb-5 text-[var(--ds-accent)]">
          <FileCode2 className="w-9 h-9" />
        </div>
        <h2 className="pc-display-heading text-3xl text-[var(--ds-text)]">Your code workspace</h2>
        <p className="mt-2 text-sm text-[var(--ds-text-muted)] max-w-sm leading-relaxed">
          Ask the agent to build a Roblox system. Generated server, client, and module scripts appear
          here as editable files, organized by their Studio placement.
        </p>
      </div>
    );
  }

  const readOnly = !editing;

  return (
    <div className="h-full flex flex-col min-h-0 bg-[var(--ds-bg-workspace)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold text-[var(--ds-text)] truncate">{artifact.title}</div>
          {artifact.summary && (
            <div className="text-[11px] text-[var(--ds-text-muted)] truncate">{artifact.summary}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {artifact.dirtyCount > 0 && (
            <button
              type="button"
              onClick={() => onRevertEdits?.(artifact.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
              title="Revert local edits"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert
            </button>
          )}
          {onRevertFile && activeFile?.dirty && (
            <button
              type="button"
              onClick={() => onRevertFile(activeFile)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert File
            </button>
          )}
          {onRefreshFile && activeFile && (
            <button
              type="button"
              onClick={() => onRefreshFile(activeFile)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
              editing
                ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-border)] text-[var(--ds-accent)]"
                : "bg-[var(--ds-fill-subtle)] border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]"
            }`}
          >
            {editing ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {editing ? "Editing" : "Read-only"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
            Copy
          </button>
          {onSaveToCreations && activeFile && (
            <button
              type="button"
              onClick={handleSaveToCreations}
              disabled={savingToCreations}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ds-accent-foreground)] transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-40"
              aria-label="Save to creations"
            >
              <Save className="w-3.5 h-3.5" />
              {savingToCreations ? "Saving" : "Save to creations"}
            </button>
          )}
          {onSaveFile && activeFile && (
            <button
              type="button"
              onClick={() => onSaveFile(activeFile)}
              disabled={saving || readOnly}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ds-accent-foreground)] transition-[background-color,border-color,color,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-40"
              title="Save this file to Studio"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
          {onSaveAllFiles && artifact.files?.some((file) => file.dirty) && (
            <button
              type="button"
              onClick={() => onSaveAllFiles(artifact.files)}
              disabled={saving || readOnly}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ds-warning)] text-[var(--ds-warning-foreground)] border border-[color-mix(in_srgb,var(--ds-warning)_60%,transparent)] text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-[background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
              title="Save all open files to Studio"
            >
              <Files className="w-3.5 h-3.5" />
              Save All
            </button>
          )}
        </div>
      </div>

      {artifact.explanation && (
        <details className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-4 py-2.5 text-xs text-[var(--ds-text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--ds-text)] focus-ring">Explanation</summary>
          <div className="mt-2 whitespace-pre-wrap leading-relaxed">{artifact.explanation}</div>
        </details>
      )}

      {conflict && (
        <div className="border-b border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-4 py-3 text-xs text-[var(--ds-danger)] space-y-3">
          <div className="font-bold">Source conflict: Studio changed since this file was opened.</div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="rounded bg-[var(--ds-fill-subtle)] p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)]">Base</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.baseSource || ""}</pre>
            </div>
            <div className="rounded bg-[var(--ds-fill-subtle)] p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)]">Local</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.localSource || conflict.attemptedSource || ""}</pre>
            </div>
            <div className="rounded bg-[var(--ds-fill-subtle)] p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-secondary)]">Studio</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.studioSource || conflict.currentSource || ""}</pre>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="min-h-[220px] rounded-lg overflow-hidden border border-[var(--ds-border-subtle)]">
              <DiffEditor
                height="220px"
                beforeMount={defineNexusThemes}
                theme={monacoTheme}
                language={monacoLanguage(activeFile?.language)}
                original={conflict.studioSource || conflict.currentSource || ""}
                modified={conflict.localSource || conflict.attemptedSource || ""}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            {mergeOpen ? (
              <div className="min-h-[220px] rounded-lg overflow-hidden border border-[var(--ds-border-subtle)]">
                <Editor
                  height="220px"
                  beforeMount={defineNexusThemes}
                  theme={monacoTheme}
                  language={monacoLanguage(activeFile?.language)}
                  value={mergeSource}
                  onMount={handleEditorMount}
                  onChange={(value) => setMergeSource(value ?? "")}
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: "on",
                  }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3 text-[11px] text-[var(--ds-text-secondary)]">
                Choose whether to keep the latest Studio version, overwrite Studio with your local edits, retry against the latest hash, or open the merge editor and apply a merged version.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {conflict.onKeepStudio && (
              <button
                type="button"
                onClick={conflict.onKeepStudio}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text)]"
              >
                Keep Studio
              </button>
            )}
            {conflict.onOverwriteStudio && (
              <button
                type="button"
                onClick={conflict.onOverwriteStudio}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-accent)]"
              >
                Overwrite Studio
              </button>
            )}
            {conflict.onRetryWithLatest && (
              <button
                type="button"
                onClick={conflict.onRetryWithLatest}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text)]"
              >
                Retry Latest Hash
              </button>
            )}
            <button
              type="button"
              onClick={() => setMergeOpen((value) => !value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text)]"
            >
              {mergeOpen ? "Hide Merge" : "Open Merge"}
            </button>
            {mergeOpen && conflict.onApplyMerge && (
              <button
                type="button"
                onClick={() => conflict.onApplyMerge(mergeSource)}
                className="px-2.5 py-1.5 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] text-[10px] font-bold uppercase tracking-widest text-[var(--ds-warning)]"
              >
                Apply Merge
              </button>
            )}
          </div>
        </div>
      )}

      <CodeEditorTabs files={artifact.files} activeFileId={activeFile?.id} onSelectFile={onSelectFile} onCloseFile={onCloseFile} />

      <div className="flex-1 min-h-0">
        <Editor
          key={`${artifact.id}:${activeFile?.id}`}
          height="100%"
          language={monacoLanguage(activeFile?.language)}
          beforeMount={defineNexusThemes}
          theme={monacoTheme}
          value={activeFile?.content || ""}
          onMount={handleEditorMount}
          onChange={(value) => {
            if (!readOnly && activeFile) onChangeContent?.(artifact.id, activeFile.id, value ?? "");
          }}
          options={{
            readOnly,
            domReadOnly: readOnly,
            fontSize: 13,
            lineHeight: 21,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            renderLineHighlight: editing ? "all" : "none",
            padding: { top: 14, bottom: 14 },
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 3,
              horizontalScrollbarSize: 3,
              verticalSliderSize: 3,
              horizontalSliderSize: 3,
            },
          }}
        />
      </div>

      <ArtifactInspector file={activeFile} />

      <ExportActions artifact={artifact} activeFile={activeFile} notify={notify} />
    </div>
  );
}
