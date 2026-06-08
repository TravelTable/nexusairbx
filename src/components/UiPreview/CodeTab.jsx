import React, { useMemo, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { FileCode, Cpu, Copy, Check, Server, Code2, Package, Pencil } from "lucide-react";

const KIND_META = {
  server: { label: "Server", icon: Server, accent: "#f15bb5" },
  client: { label: "Client", icon: Code2, accent: "#00f5d4" },
  module: { label: "Module", icon: Package, accent: "#9b5de5" },
};

// Shared Monaco theme so the editor matches the app's dark palette
// (cyan #00f5d4 / purple #9b5de5 on near-black surfaces).
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

export default function CodeTab({
  uiModuleLua,
  systemsLua,
  lua, // Fallback
  files = [],
  onDownload,
  onUpdateLua,
}) {
  const tabs = useMemo(() => {
    const list = [];
    const uiCode = uiModuleLua || lua || "";
    if (uiCode) {
      list.push({
        id: "ui",
        label: "UI Module",
        icon: FileCode,
        accent: "#00f5d4",
        language: "lua",
        content: uiCode,
        editable: true,
      });
    }
    if (systemsLua) {
      list.push({
        id: "systems",
        label: "Systems Logic",
        icon: Cpu,
        accent: "#9b5de5",
        language: "lua",
        content: systemsLua,
        editable: false,
      });
    }
    (files || []).forEach((f, i) => {
      const meta = KIND_META[f.kind] || KIND_META.module;
      list.push({
        id: `file-${i}`,
        label: f.name || f.path || `File ${i + 1}`,
        sub: meta.label,
        icon: meta.icon,
        accent: meta.accent,
        language: f.language || "lua",
        content: f.content || "",
        editable: false,
      });
    });
    if (list.length === 0) {
      list.push({
        id: "ui",
        label: "UI Module",
        icon: FileCode,
        accent: "#00f5d4",
        language: "lua",
        content: "-- No code generated",
        editable: false,
      });
    }
    return list;
  }, [uiModuleLua, systemsLua, lua, files]);

  const [activeId, setActiveId] = useState(tabs[0]?.id || "ui");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const active = tabs.find((t) => t.id === activeId) || tabs[0];

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(active?.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [active]);

  const handleEditorMount = useCallback((editor, monaco) => {
    defineNexusTheme(monaco);
    monaco.editor.setTheme("nexus-dark");
  }, []);

  const canEdit = !!(active?.editable && typeof onUpdateLua === "function");
  const readOnly = !(editing && canEdit);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* File tab strip */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-black/40 p-1 rounded-xl border border-white/5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active?.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveId(t.id);
                setEditing(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? "bg-gray-800 shadow-lg" : "text-gray-500 hover:text-gray-300"
              }`}
              style={isActive ? { color: t.accent } : undefined}
              title={t.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{t.label}</span>
              {t.sub && (
                <span className="text-[9px] uppercase tracking-wide text-gray-500">{t.sub}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 border border-gray-800 rounded-xl overflow-hidden bg-[#0D0D0D] flex flex-col relative">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setEditing((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                editing
                  ? "bg-[#00f5d4]/10 border-[#00f5d4]/40 text-[#00f5d4]"
                  : "bg-black/60 border-white/10 text-gray-400 hover:text-white"
              }`}
              title={editing ? "Editing (changes re-sync the preview)" : "Edit this file"}
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? "Editing" : "Edit"}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-black/60 border border-white/10 text-gray-400 hover:text-white transition-all"
            title="Copy this file"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <Editor
          key={active?.id}
          height="100%"
          language={active?.language || "lua"}
          theme="nexus-dark"
          value={active?.content || ""}
          onMount={handleEditorMount}
          onChange={(value) => {
            if (!readOnly && canEdit) onUpdateLua(value ?? "");
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
            padding: { top: 16, bottom: 16 },
            fontFamily:
              "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
            smoothScrolling: true,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] text-gray-500 max-w-[260px]">
          {active?.id === "ui"
            ? "The UI Module handles instantiation and layout. Ends with 'return UI'."
            : active?.id === "systems"
            ? "Systems Logic handles interactions and game state. No return required."
            : `${active?.sub || "Script"} file. Included in the downloaded package.`}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
            onClick={onDownload}
          >
            Download Package (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
