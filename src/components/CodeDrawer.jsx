import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Download, Save } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import lua from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// Register lua highlighting
SyntaxHighlighter.registerLanguage("lua", lua);

// Container component for business logic
export default function CodeDrawerContainer({
  open,
  code = "",
  title = "Script Code",
  version = null,
  onClose,
  onSaveScript,
  liveGenerating = false,
  liveContent = "",
  onLiveOpen
}) {
  // Responsive drawer width calculation
  const getDrawerWidth = useCallback(() => {
    if (typeof window === "undefined") return "33vw";
    return window.innerWidth < 768 ? "100vw" : "33vw";
  }, []);

  const [drawerWidth, setDrawerWidth] = useState(getDrawerWidth());
  const [editTitle, setEditTitle] = useState(title || "Script Code");
  const [isEditing, setIsEditing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const inputRef = useRef(null);

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      setDrawerWidth(getDrawerWidth());
    }
    if (open) {
      window.addEventListener("resize", handleResize);
      setDrawerWidth(getDrawerWidth());
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [open, getDrawerWidth]);

  // Sync title with props
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

  // Call onLiveOpen when drawer opens
  useEffect(() => {
    if (open && typeof onLiveOpen === "function") {
      onLiveOpen();
    }
  }, [open, onLiveOpen]);

  // Reset copy success message
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Sanitize filename from title
  const sanitizeFilename = useCallback((title, ext = "lua") => {
    if (!title) return `Script.${ext}`;
    return (
      title
        .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40)
        + `.${ext}`
    );
  }, []);

  // Download file handler
  const downloadFile = useCallback((ext) => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeFilename(editTitle, ext);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, editTitle, sanitizeFilename]);

  // Copy to clipboard handler
  const handleCopy = useCallback(() => {
    const displayCode = liveGenerating && liveContent ? liveContent : code;
    navigator.clipboard.writeText(displayCode);
    setCopySuccess(true);
  }, [code, liveGenerating, liveContent]);

  // Save script handler
  const handleSaveScript = useCallback(() => {
    if (typeof onSaveScript === "function") {
      onSaveScript(editTitle, code);
    } else {
      alert("Script saved!\n\nTitle: " + editTitle);
    }
  }, [onSaveScript, editTitle, code]);

  // Title editing handlers
  const startEditing = useCallback(() => setIsEditing(true), []);
  const stopEditing = useCallback(() => setIsEditing(false), []);
  const handleTitleChange = useCallback((e) => setEditTitle(e.target.value), []);
  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      stopEditing();
    }
  }, [stopEditing]);

  // Determine display code
  const displayCode = liveGenerating
    ? (liveContent && liveContent.trim() !== "" ? liveContent : "-- Generating code... --")
    : (code && code.trim() !== "" ? code : "-- No code to display --");

  if (!open) return null;

  return (
    <CodeDrawerUI
      drawerWidth={drawerWidth}
      editTitle={editTitle}
      isEditing={isEditing}
      inputRef={inputRef}
      version={version}
      displayCode={displayCode}
      liveGenerating={liveGenerating}
      copySuccess={copySuccess}
      onClose={onClose}
      onTitleChange={handleTitleChange}
      onTitleKeyDown={handleTitleKeyDown}
      onStartEditing={startEditing}
      onStopEditing={stopEditing}
      onCopy={handleCopy}
      onDownload={downloadFile}
      onSaveScript={handleSaveScript}
    />
  );
}

// UI component for presentation
function CodeDrawerUI({
  drawerWidth,
  editTitle,
  isEditing,
  inputRef,
  version,
  displayCode,
  liveGenerating,
  copySuccess,
  onClose,
  onTitleChange,
  onTitleKeyDown,
  onStartEditing,
  onStopEditing,
  onCopy,
  onDownload,
  onSaveScript
}) {
  const drawerVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 }
  };

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#181825] sticky top-0 z-10">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                className="w-full bg-transparent border-b border-[#00f5d4] text-white font-bold text-lg outline-none px-1 py-0 transition-all focus:border-[#9b5de5]"
                value={editTitle}
                maxLength={80}
                onChange={onTitleChange}
                onBlur={onStopEditing}
                onKeyDown={onTitleKeyDown}
                aria-label="Edit script title"
              />
            ) : (
              <button
                className="font-bold text-lg text-white truncate text-left hover:text-[#00f5d4] transition-colors focus:outline-none focus:text-[#00f5d4]"
                title={`${editTitle} (click to edit)`}
                onClick={onStartEditing}
                aria-label="Edit script title"
              >
                {editTitle}
              </button>
            )}
            {version && (
              <span className="ml-2 text-xs text-gray-300 border-l border-gray-600 pl-2 font-mono">
                {version}
              </span>
            )}
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-800 transition-colors ml-2 focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-auto relative">
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
          
          {liveGenerating && (
            <div className="absolute bottom-4 left-0 w-full flex justify-center pointer-events-none">
              <span className="bg-[#181825] text-[#00f5d4] px-4 py-2 rounded-lg font-mono text-sm animate-pulse border border-[#00f5d4] shadow-lg">
                Generating code live...
              </span>
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end p-4 border-t border-gray-800 bg-[#161622] sticky bottom-0 z-10">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white ${
              copySuccess 
                ? "bg-green-600" 
                : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] hover:scale-105"
            } shadow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#00f5d4]`}
            onClick={onCopy}
            aria-label="Copy code"
          >
            <Copy className="h-5 w-5" />
            {copySuccess ? "Copied!" : "Copy"}
          </button>
          
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
              onClick={() => onDownload("lua")}
              aria-label="Download as .lua"
            >
              <Download className="h-5 w-5" />
              .lua
            </button>
            
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
              onClick={() => onDownload("txt")}
              aria-label="Download as .txt"
            >
              <Download className="h-5 w-5" />
              .txt
            </button>
          </div>
          
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-[#00f5d4] hover:bg-[#9b5de5] transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            onClick={onSaveScript}
            aria-label="Save script"
          >
            <Save className="h-5 w-5" />
            Save Script
          </button>
          
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
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