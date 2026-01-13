import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export default function CodeTab({
  lua,
  copySuccess,
  handleCopy,
  onDownload
}) {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex-1 min-h-0 border border-gray-800 rounded-lg overflow-auto bg-[#181825]">
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
          {lua || "-- No code generated yet"}
        </SyntaxHighlighter>
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
