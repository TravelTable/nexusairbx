import React, { useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { ChevronDown, ChevronRight, FileCode, Cpu } from "lucide-react";

export default function CodeTab({
  lua,
  copySuccess,
  handleCopy,
  onDownload
}) {
  const [manifestOpen, setManifestOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(true);

  const manifestMatch = lua?.match(/--\[==\[UI_BUILDER_JSON[\s\S]*?]==\]/);
  const manifestCode = manifestMatch ? manifestMatch[0] : "";
  const systemsCode = lua?.replace(manifestCode, "").trim() || "";

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto scrollbar-hide">
        {/* Manifest Section */}
        <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#181825]">
          <button
            onClick={() => setManifestOpen(!manifestOpen)}
            className="w-full px-4 py-2 bg-black/40 flex items-center justify-between hover:bg-black/60 transition-colors"
            aria-expanded={manifestOpen}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <FileCode className="w-4 h-4 text-[#00f5d4]" />
              UI Manifest (JSON)
            </div>
            {manifestOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {manifestOpen && (
            <SyntaxHighlighter
              language="lua"
              style={atomOneDark}
              customStyle={{
                background: "transparent",
                margin: 0,
                padding: "1rem",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
              wrapLongLines
            >
              {manifestCode || "-- No manifest found"}
            </SyntaxHighlighter>
          )}
        </div>

        {/* Systems Section */}
        <div className="flex-1 border border-gray-800 rounded-lg overflow-hidden bg-[#181825] flex flex-col">
          <button
            onClick={() => setSystemsOpen(!systemsOpen)}
            className="w-full px-4 py-2 bg-black/40 flex items-center justify-between hover:bg-black/60 transition-colors"
            aria-expanded={systemsOpen}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-[#9b5de5]" />
              Systems Logic (Luau)
            </div>
            {systemsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {systemsOpen && (
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language="lua"
                style={atomOneDark}
                customStyle={{
                  background: "transparent",
                  margin: 0,
                  padding: "1.5rem",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
                showLineNumbers
                wrapLongLines
              >
                {systemsCode || "-- No systems logic generated yet"}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded bg-[#00f5d4] text-black font-bold text-sm hover:scale-[1.02] transition-transform"
          onClick={handleCopy}
        >
          {copySuccess ? "Copied!" : "Copy Code"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
          onClick={onDownload}
        >
          Download .lua
        </button>
      </div>
    </div>
  );
}
