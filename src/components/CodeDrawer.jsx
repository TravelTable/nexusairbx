import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Download, Save } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import lua from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// Register lua highlighting if not already
SyntaxHighlighter.registerLanguage("lua", lua);

// Helper for responsive drawer width
function getDrawerWidth() {
  if (typeof window === "undefined") return "33vw";
  if (window.innerWidth < 768) return "100vw";
  return "33vw";
}

export default function SimpleCodeDrawer({
  open,
  code = "",
  title = "Script Code",
  onClose,
  onSaveScript // function: (newTitle, code) => void
}) {
  // Responsive drawer width (updates on resize)
  const [drawerWidth, setDrawerWidth] = React.useState(getDrawerWidth());
  useEffect(() => {
    function handleResize() {
      setDrawerWidth(getDrawerWidth());
    }
    if (open) {
      window.addEventListener("resize", handleResize);
      setDrawerWidth(getDrawerWidth());
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  // Editable title state
  const [editTitle, setEditTitle] = useState(title || "Script Code");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // Keep editTitle in sync with prop title
  useEffect(() => {
    setEditTitle(title || "Script Code");
  }, [title]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Download helpers
  const downloadFile = (ext) => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editTitle.replace(/\s+/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Animations
  const drawerVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 }
  };

  // Save script handler
  const handleSaveScript = () => {
    if (typeof onSaveScript === "function") {
      onSaveScript(editTitle, code);
    } else {
      // fallback: show alert
      alert("Script saved!\n\nTitle: " + editTitle);
    }
  };

  // Only show the drawer if open
  if (!open) return null;

  // Code display logic
  const displayCode = code && code.trim() !== "" ? code : "-- No code to display --";

  return (
    <AnimatePresence>
      <motion.div
        key="drawer"
        className="fixed right-0 top-0 z-[120] h-full flex flex-col bg-[#181825] border-l border-[#9b5de5] shadow-2xl"
        style={{
          width: drawerWidth,
          minWidth: 280,
          maxWidth: "100vw",
          maxHeight: "100vh",
          pointerEvents: "auto"
        }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={drawerVariants}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#181825]">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                className="w-full bg-transparent border-b border-[#00f5d4] text-white font-bold text-lg outline-none px-1 py-0"
                value={editTitle}
                maxLength={80}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditing(false);
                  }
                }}
                aria-label="Edit script title"
              />
            ) : (
              <span
                className="font-bold text-lg text-white truncate cursor-pointer"
                title={editTitle}
                tabIndex={0}
                onClick={() => setIsEditing(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") setIsEditing(true);
                }}
                aria-label="Edit script title"
                style={{ outline: "none" }}
              >
                {editTitle}
              </span>
            )}
          </div>
          <button
            className="p-2 rounded hover:bg-gray-800 transition-colors ml-2"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        {/* Code Viewer */}
        <div className="flex-1 overflow-auto p-0">
          <div className="relative">
            <SyntaxHighlighter
              language="lua"
              style={atomOneDark}
              customStyle={{
                background: "#181825",
                margin: 0,
                borderRadius: 0,
                fontSize: "1rem",
                minHeight: "100%",
                padding: "1.5rem 1.25rem"
              }}
              showLineNumbers
              wrapLongLines
            >
              {displayCode}
            </SyntaxHighlighter>
          </div>
        </div>
        {/* Bottom Buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end p-4 border-t border-gray-800 bg-[#161622]">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] shadow hover:scale-105 transition-transform"
            onClick={() => {
              navigator.clipboard.writeText(displayCode);
            }}
            aria-label="Copy code"
          >
            <Copy className="h-5 w-5" />
            Copy
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            onClick={() => downloadFile("lua")}
            aria-label="Download as .lua"
          >
            <Download className="h-5 w-5" />
            .lua
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            onClick={() => downloadFile("txt")}
            aria-label="Download as .txt"
          >
            <Download className="h-5 w-5" />
            .txt
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-[#00f5d4] hover:bg-[#9b5de5] transition-colors"
            onClick={handleSaveScript}
            aria-label="Save script"
          >
            <Save className="h-5 w-5" />
            Save Script
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 transition-colors ml-2"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}