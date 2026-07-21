import React, { useState, useCallback, useEffect } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { Copy, Check, Pencil, Eye, RotateCcw, FileCode2, Save, RefreshCw, Files } from "lib/icons";
import CodeEditorTabs from "./CodeEditorTabs";
import ArtifactInspector from "./ArtifactInspector";
import ExportActions from "./ExportActions";

// Shared Monaco theme matching the app's dark palette.
function defineNexusTheme(monaco) {
  try {
    monaco.editor.defineTheme("nexus-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "keyword", foreground: "9b5de5" },
        { token: "string", foreground: "00f5d4" },
        { token: "number", foreground: "f15bb5" },
      ],
      colors: {
        "editor.background": "#0D0D0D",
        "editor.foreground": "#e5e7eb",
        "editorLineNumber.foreground": "#3f3f46",
        "editorLineNumber.activeForeground": "#9b5de5",
        "editor.selectionBackground": "#9b5de540",
        "editor.lineHighlightBackground": "#ffffff08",
        "editorCursor.foreground": "#00f5d4",
      },
    });
  } catch {
    /* theme already defined */
  }
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
  saving = false,
  conflict = null,
  notify,
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");

  useEffect(() => {
    if (!conflict) {
      setMergeOpen(false);
      setMergeSource("");
      return;
    }
    setMergeSource(conflict.localSource || conflict.attemptedSource || "");
  }, [conflict]);

  const handleEditorMount = useCallback((editor, monaco) => {
    defineNexusTheme(monaco);
    monaco.editor.setTheme("nexus-dark");
  }, []);

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

  if (!artifact) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-ink-950">
        <div className="p-4 rounded-2xl bg-nexus-cyan/[0.04] border border-nexus-cyan/10 mb-4 shadow-[0_0_40px_-10px_rgba(0,245,212,0.25)]">
          <FileCode2 className="w-10 h-10 text-nexus-cyan/70" />
        </div>
        <h2 className="font-display text-lg font-bold text-gray-200">Your code workspace</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
          Ask the agent to build a Roblox system. Generated server, client, and module scripts appear
          here as editable files, organized by their Studio placement.
        </p>
      </div>
    );
  }

  const readOnly = !editing;

  return (
    <div className="h-full flex flex-col min-h-0 bg-ink-950">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold text-white truncate">{artifact.title}</div>
          {artifact.summary && (
            <div className="text-[11px] text-gray-500 truncate">{artifact.summary}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {artifact.dirtyCount > 0 && (
            <button
              type="button"
              onClick={() => onRevertEdits?.(artifact.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all"
              title="Revert local edits"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert
            </button>
          )}
          {onRevertFile && activeFile?.dirty && (
            <button
              type="button"
              onClick={() => onRevertFile(activeFile)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert File
            </button>
          )}
          {onRefreshFile && activeFile && (
            <button
              type="button"
              onClick={() => onRefreshFile(activeFile)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
              editing
                ? "bg-[#00f5d4]/10 border-[#00f5d4]/40 text-[#00f5d4]"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {editing ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {editing ? "Editing" : "Read-only"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> : <Copy className="w-3.5 h-3.5" />}
            Copy
          </button>
          {onSaveFile && activeFile && (
            <button
              type="button"
              onClick={() => onSaveFile(activeFile)}
              disabled={saving || readOnly}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00f5d4] text-black border border-[#00f5d4]/70 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all"
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#fee440] text-black border border-[#fee440]/70 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all"
              title="Save all open files to Studio"
            >
              <Files className="w-3.5 h-3.5" />
              Save All
            </button>
          )}
        </div>
      </div>

      {conflict && (
        <div className="border-b border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-100 space-y-3">
          <div className="font-bold">Source conflict: Studio changed since this file was opened.</div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="rounded bg-black/30 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Base</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.baseSource || ""}</pre>
            </div>
            <div className="rounded bg-black/30 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Local</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.localSource || conflict.attemptedSource || ""}</pre>
            </div>
            <div className="rounded bg-black/30 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Studio</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap">{conflict.studioSource || conflict.currentSource || ""}</pre>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="min-h-[220px] rounded-lg overflow-hidden border border-white/10">
              <DiffEditor
                height="220px"
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
              <div className="min-h-[220px] rounded-lg overflow-hidden border border-white/10">
                <Editor
                  height="220px"
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
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-gray-300">
                Choose whether to keep the latest Studio version, overwrite Studio with your local edits, retry against the latest hash, or open the merge editor and apply a merged version.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {conflict.onKeepStudio && (
              <button
                type="button"
                onClick={conflict.onKeepStudio}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-200"
              >
                Keep Studio
              </button>
            )}
            {conflict.onOverwriteStudio && (
              <button
                type="button"
                onClick={conflict.onOverwriteStudio}
                className="px-2.5 py-1.5 rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[10px] font-bold uppercase tracking-widest text-[#00f5d4]"
              >
                Overwrite Studio
              </button>
            )}
            {conflict.onRetryWithLatest && (
              <button
                type="button"
                onClick={conflict.onRetryWithLatest}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-200"
              >
                Retry Latest Hash
              </button>
            )}
            <button
              type="button"
              onClick={() => setMergeOpen((value) => !value)}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-200"
            >
              {mergeOpen ? "Hide Merge" : "Open Merge"}
            </button>
            {mergeOpen && conflict.onApplyMerge && (
              <button
                type="button"
                onClick={() => conflict.onApplyMerge(mergeSource)}
                className="px-2.5 py-1.5 rounded-lg border border-[#fee440]/40 bg-[#fee440]/10 text-[10px] font-bold uppercase tracking-widest text-[#fee440]"
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
          theme="nexus-dark"
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
