import React, { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Copy, Check, Pencil, Eye, RotateCcw, FileCode2 } from "lucide-react";
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
  notify,
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

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
      <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-[#050505]">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 mb-4">
          <FileCode2 className="w-10 h-10 text-gray-700" />
        </div>
        <h2 className="text-lg font-bold text-gray-300">Your code workspace</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
          Ask the agent to build a Roblox system. Generated server, client, and module scripts appear
          here as editable files, organized by their Studio placement.
        </p>
      </div>
    );
  }

  const readOnly = !editing;

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#050505]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-black/30">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{artifact.title}</div>
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
        </div>
      </div>

      <CodeEditorTabs files={artifact.files} activeFileId={activeFile?.id} onSelectFile={onSelectFile} />

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
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      </div>

      <ArtifactInspector file={activeFile} />

      <ExportActions artifact={artifact} activeFile={activeFile} notify={notify} />
    </div>
  );
}
