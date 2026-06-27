import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import lua from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

let luaRegistered = false;

if (!luaRegistered) {
  try {
    SyntaxHighlighter.registerLanguage("lua", lua);
    luaRegistered = true;
  } catch (_) {
    // Hot reload can attempt to register the same language more than once.
  }
}

export default function QuickScriptCodeBlock({ code }) {
  return (
    <SyntaxHighlighter
      language="lua"
      style={atomOneDark}
      customStyle={{
        margin: 0,
        background: "rgba(0,0,0,0.42)",
        padding: "16px",
        fontSize: "13px",
        lineHeight: 1.55,
        width: "max-content",
        minWidth: "100%",
      }}
      wrapLongLines={false}
      showLineNumbers
    >
      {code || "-- No code returned"}
    </SyntaxHighlighter>
  );
}
