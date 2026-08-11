import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Download, Search, Minus, Plus, ArrowRight, Bookmark } from "lib/icons";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import lua from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { findLiteralMatches } from "../lib/codeSearch";
import { shouldPreserveNativeCopy } from "./codeDrawerKeyboard";

// Register lua highlighting
let __luaRegistered = false;
try {
  if (!__luaRegistered) {
    SyntaxHighlighter.registerLanguage("lua", lua);
    __luaRegistered = true;
  }
} catch {/* safe if already registered */}


const FONT_SIZE_KEY = "codeDrawerFontSize";

const getExplanationBlocks = (explanation = "") => {
  if (!explanation.trim()) return [];
  return explanation
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const isList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));
      if (isList) {
        return {
          type: "list",
          items: lines.map((line) => line.replace(/^[-*]\s+/, "")),
        };
      }
      return { type: "paragraph", text: block };
    });
};

// Container component for business logic
export default function CodeDrawerContainer({
  open,
  code = "",
  explanation = "",
  title = "Script Code",
  filename = null,
  version = null,
  onClose,
  onSaveScript,
  liveGenerating = false,
  liveContent = "",
  onLiveOpen,
  isSavedScript = false, // <-- add this prop for badge
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
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    return stored ? Number(stored) : 16;
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchMatches, setSearchMatches] = useState([]);
  const [gotoLine, setGotoLine] = useState("");
  const [highlightLine, setHighlightLine] = useState(null);

  const inputRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const openerRef = useRef(null);

  // Focus trap refs
  const focusableRefs = useRef([]);

  // Keep latest handlers without putting them in effect deps
  const saveHandlerRef = useRef(null);
  const copyHandlerRef = useRef(null);

  // Handle window resize (throttled)
  useEffect(() => {
    let frame;
    function handleResize() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setDrawerWidth(getDrawerWidth());
        frame = null;
      });
    }
    if (open) {
      window.addEventListener("resize", handleResize);
      setDrawerWidth(getDrawerWidth());
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
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

  // Focus management: focus close or title input on open, restore on close
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      setTimeout(() => {
        if (isEditing && inputRef.current) {
          inputRef.current.focus();
        } else if (closeBtnRef.current) {
          closeBtnRef.current.focus();
        }
      }, 0);
    } else if (openerRef.current) {
      openerRef.current.focus();
    }
    // eslint-disable-next-line
  }, [open]);

  // Keyboard shortcuts and focus trap (no TDZ: use refs for handlers)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      // Focus trap
      if (e.key === "Tab") {
        const focusables = focusableRefs.current.filter(Boolean);
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault();
            focusables[focusables.length - 1].focus();
          }
        } else {
          if (idx === focusables.length - 1) {
            e.preventDefault();
            focusables[0].focus();
          }
        }
      }

      // Shortcuts
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Ctrl/Cmd+S -> save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Use latest handler via ref
        if (saveHandlerRef.current) saveHandlerRef.current();
      }

      // Ctrl/Cmd+C -> copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (shouldPreserveNativeCopy(e)) return;
        e.preventDefault();
        if (copyHandlerRef.current) copyHandlerRef.current();
      }

      // Ctrl/Cmd+F -> toggle search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setTimeout(() => {
          const el = document.getElementById("code-drawer-search-input");
          if (el) el.focus();
        }, 0);
      }
    }

    const node = drawerRef.current;
    if (node) node.addEventListener("keydown", handleKeyDown);
    return () => {
      if (node) node.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, setSearchOpen]);

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

  // Sanitize filename from title or filename prop
  const sanitizeFilename = useCallback((input, ext = "lua") => {
    if (!input) return `Script.${ext}`;
    return (
      input
        .replace(
          /[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ""
        )
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) +
      `.${ext}`
    );
  }, []);

  // Download file handler
  const downloadFile = useCallback(
    (ext) => {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sanitizeFilename(filename || editTitle, ext);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [code, editTitle, filename, sanitizeFilename]
  );

  // Determine display code (memoized)
  const displayCode = useMemo(() => {
    return code && code.trim() !== "" ? code : "-- No code to display --";
  }, [code]);

  // Copy to clipboard handler (with fallback)
  const handleCopy = useCallback(() => {
    function fallbackCopy(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (err) {}
      document.body.removeChild(textarea);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(displayCode)
        .then(() => setCopySuccess(true))
        .catch(() => {
          fallbackCopy(displayCode);
          setCopySuccess(true);
        });
    } else {
      fallbackCopy(displayCode);
      setCopySuccess(true);
    }
  }, [displayCode]);

  // Save script handler (async, supports backend versioning)
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSaveScript = useCallback(async () => {
    setSaveError("");
    if (typeof onSaveScript === "function") {
      try {
        const result = await onSaveScript(editTitle, code);
        if (result !== false) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        } else {
          setSaveError("Failed to save script.");
        }
      } catch (e) {
        setSaveError("Save error: " + (e?.message || e));
      }
    } else {
      alert("Script saved!\n\nTitle: " + editTitle);
    }
  }, [onSaveScript, editTitle, code]);

  // Keep handler refs updated for use in keyboard shortcut effect
  useEffect(() => { copyHandlerRef.current = handleCopy; }, [handleCopy]);
  useEffect(() => { saveHandlerRef.current = handleSaveScript; }, [handleSaveScript]);

  // Title editing handlers
  const startEditing = useCallback(() => setIsEditing(true), []);
  const stopEditing = useCallback(() => setIsEditing(false), []);
  const handleTitleChange = useCallback(
    (e) => setEditTitle(e.target.value),
    []
  );
  const handleTitleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        stopEditing();
      }
    },
    [stopEditing]
  );

  // Font size controls
  const handleFontSize = useCallback(
    (delta) => {
      setFontSize((prev) => {
        let next = Math.max(12, Math.min(28, prev + delta));
        localStorage.setItem(FONT_SIZE_KEY, next);
        return next;
      });
    },
    []
  );

  // Search logic
  useEffect(() => {
    if (!searchTerm) {
      setSearchMatches([]);
      setSearchIndex(0);
      return;
    }
    setSearchMatches(findLiteralMatches(displayCode, searchTerm));
    setSearchIndex(0);
  }, [searchTerm, displayCode]);

  // Go-to-line logic
  const handleGotoLine = useCallback(
    (e) => {
      e.preventDefault();
      const line = parseInt(gotoLine, 10);
      if (!isNaN(line) && line > 0) {
        setHighlightLine(line);
        setTimeout(() => setHighlightLine(null), 1200);
        // Scroll to line
        const codeBlock = document.getElementById("code-drawer-codeblock");
        if (codeBlock) {
          const lines = codeBlock.querySelectorAll("pre > code > span");
          if (lines[line - 1]) {
            lines[line - 1].scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
      }
    },
    [gotoLine]
  );

  // Focusable elements for focus trap
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    focusableRefs.current = Array.from(
      drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
  }, [open, isEditing, searchOpen]);

  if (!open) return null;

  return (
    <CodeDrawerUI
      drawerWidth={drawerWidth}
      editTitle={editTitle}
      isEditing={isEditing}
      inputRef={inputRef}
      closeBtnRef={closeBtnRef}
      version={version}
      displayCode={displayCode}
      explanation={explanation}
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
      filename={filename}
      fontSize={fontSize}
      onFontSize={handleFontSize}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchIndex={searchIndex}
      setSearchIndex={setSearchIndex}
      searchMatches={searchMatches}
      gotoLine={gotoLine}
      setGotoLine={setGotoLine}
      onGotoLine={handleGotoLine}
      highlightLine={highlightLine}
      drawerRef={drawerRef}
      saveSuccess={saveSuccess}
      saveError={saveError}
      isSavedScript={isSavedScript}
    />
  );
}

// SecondaryButton needs to be forwardRef to support ref={closeBtnRef}
const SecondaryButton = forwardRef(function SecondaryButton(
  { children, onClick, icon: Icon, className = "", "aria-label": ariaLabel },
  ref
) {
  return (
    <button
      type="button"
      ref={ref}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-[var(--ds-text)] border border-[var(--ds-border-strong)] bg-transparent hover:bg-[var(--ds-fill-hover)] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children}
    </button>
  );
});

function LiveStatus({ liveGenerating }) {
  if (!liveGenerating) return null;
  return (
    <span className="flex items-center gap-1 ml-2">
      <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
      <span className="text-xs text-accent font-mono">Generating...</span>
    </span>
  );
}

function GlowButton({
  children,
  onClick,
  icon: Icon,
  className = "",
  glowColor = "from-[var(--ds-accent-pressed)] to-accent",
  disabled = false,
  "aria-label": ariaLabel,
  locked = false,
}) {
  return (
    <span className="relative group inline-flex">
      <span
        className={`absolute inset-0 rounded-md bg-gradient-to-r ${glowColor} blur-sm opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 pointer-events-none code-drawer-glow${
          locked ? " opacity-0" : ""
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-[var(--ds-text)] bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)] text-sm shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent ${
          locked
            ? "pointer-events-none bg-[var(--ds-success)] border-[var(--ds-success)] text-[var(--ds-success-foreground)] shadow-none"
            : "hover:shadow-lg hover:scale-[1.03] active:scale-100"
        } ${className}`}
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
        tabIndex={0}
      >
        {Icon && <Icon className="h-5 w-5" />}
        {children}
      </button>
    </span>
  );
}

const DRAWER_VARIANTS = {
  hidden: { x: "100%" },
  visible: { x: 0 },
};

// UI component for presentation
function CodeDrawerUI({
  drawerWidth,
  editTitle,
  isEditing,
  inputRef,
  closeBtnRef,
  version,
  displayCode,
  explanation,
  liveGenerating,
  copySuccess,
  onClose,
  onTitleChange,
  onTitleKeyDown,
  onStartEditing,
  onStopEditing,
  onCopy,
  onDownload,
  onSaveScript,
  filename,
  fontSize,
  onFontSize,
  searchOpen,
  setSearchOpen,
  searchTerm,
  setSearchTerm,
  searchIndex,
  setSearchIndex,
  searchMatches,
  gotoLine,
  setGotoLine,
  onGotoLine,
  highlightLine,
  drawerRef,
  saveSuccess = false,
  saveError = "",
  isSavedScript = false, // <-- add this prop
}) {
  // Highlight search matches in code
  const highlightedCode = useMemo(() => {
    if (!searchTerm || searchMatches.length === 0) return displayCode;
    let lastIndex = 0;
    const result = [];
    searchMatches.forEach((m, i) => {
      result.push(displayCode.slice(lastIndex, m.start));
      result.push(
        <mark
          className={`code-drawer-search-highlight${
            i === searchIndex ? " code-drawer-search-highlight-active" : ""
          }`}
          key={`code-search-match-${m.start}-${i}`}
        >
          {displayCode.slice(m.start, m.end)}
        </mark>
      );
      lastIndex = m.end;
    });
    result.push(displayCode.slice(lastIndex));
    return result;
  }, [displayCode, searchTerm, searchMatches, searchIndex]);

  // Line highlighting for go-to-line
  function lineProps(lineNumber) {
    if (highlightLine === lineNumber) {
      return {
        style: {
          background: "var(--ds-accent-soft)",
          transition: "background 0.3s",
        },
        className: "code-drawer-goto-highlight",
      };
    }
    return {};
  }

  // Search navigation
  function handleSearchNav(dir) {
    if (!searchMatches.length) return;
    setSearchIndex((prev) => {
      let next = prev + dir;
      if (next < 0) next = searchMatches.length - 1;
      if (next >= searchMatches.length) next = 0;
      return next;
    });
  }

  // Search input clear
  function handleSearchClear() {
    setSearchTerm("");
    setSearchOpen(false);
    setSearchIndex(0);
  }

  // ARIA
  const ariaLabelledBy = "drawer-title";
  const ariaDescribedBy = "drawer-body";

  return (
    <AnimatePresence>
      <motion.div
        key="drawer"
        ref={drawerRef}
        className="fixed right-0 top-0 z-[120] h-full flex flex-col bg-[var(--ds-surface-1)] text-[var(--ds-text)] border-l border-[var(--ds-border-strong)] shadow-[var(--ds-shadow-overlay)] code-drawer-root"
        style={{
          width: drawerWidth,
          minWidth: 280,
          maxWidth: "100vw",
          maxHeight: "100vh",
          pointerEvents: "auto",
        }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={DRAWER_VARIANTS}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {/* Scoped CSS for glow and highlights */}
        <style>{`
          .code-drawer-glow {
            animation: code-drawer-glow-anim 2.5s linear infinite;
          }
          @keyframes code-drawer-glow-anim {
            0% { filter: blur(8px) brightness(1.1); }
            50% { filter: blur(12px) brightness(1.3); }
            100% { filter: blur(8px) brightness(1.1); }
          }
          .code-drawer-search-highlight {
            background: var(--ds-accent-soft);
            color: var(--ds-accent);
            border-radius: 2px;
            padding: 0 2px;
          }
          .code-drawer-search-highlight-active {
            background: var(--ds-accent);
            color: var(--ds-accent-foreground);
          }
          .code-drawer-goto-highlight {
            animation: code-drawer-goto-flash 1.2s;
          }
          @keyframes code-drawer-goto-flash {
            0% { background: rgba(var(--ds-accent-rgb), 0.35);}
            100% { background: transparent;}
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] sticky top-0 z-10">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                className="w-full bg-transparent border-b border-accent text-[var(--ds-text)] font-bold text-lg outline-none px-1 py-0 transition-all focus:border-[var(--ds-accent-hover)]"
                value={editTitle}
                maxLength={80}
                onChange={onTitleChange}
                onBlur={onStopEditing}
                onKeyDown={onTitleKeyDown}
                aria-label="Edit script title"
                tabIndex={0}
              />
            ) : (
              <button
                className="font-bold text-lg text-[var(--ds-text)] truncate text-left hover:text-accent transition-colors focus:outline-none focus:text-accent"
                title={`${editTitle} (click to edit)`}
                onClick={onStartEditing}
                aria-label="Edit script title"
                tabIndex={0}
              >
                <span id={ariaLabelledBy}>{editTitle}</span>
              </button>
            )}
            {filename && (
              <span
                className="ml-2 text-xs text-[var(--ds-text-muted)] truncate max-w-[140px]"
                title={filename}
              >
                {filename.length > 24
                  ? filename.slice(0, 21) + "..."
                  : filename}
              </span>
            )}
            {version && (
              <span className="ml-2 text-xs text-[var(--ds-text-secondary)] border-l border-[var(--ds-border-strong)] pl-2 font-mono">
                {version}
              </span>
            )}
            {isSavedScript && (
              <span className="ml-2 px-2 py-1 rounded bg-[var(--ds-accent-soft)] text-accent text-xs font-semibold">
                Saved Version
              </span>
            )}
            <LiveStatus liveGenerating={liveGenerating} />
          </div>
          {/* Header controls: Search, Font size, Go-to-line */}
          <div className="flex items-center gap-2 ml-2">
            {/* Search */}
            <button
              className="p-2 rounded-full hover:bg-[var(--ds-fill-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => {
                setSearchOpen((v) => !v);
                setTimeout(() => {
                  const el = document.getElementById("code-drawer-search-input");
                  if (el) el.focus();
                }, 0);
              }}
              aria-label="Search in code"
              tabIndex={0}
            >
              <Search className="h-5 w-5 text-[var(--ds-text)]" />
            </button>
            {/* Font size */}
            <button
              className="p-2 rounded-full hover:bg-[var(--ds-fill-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => onFontSize(-2)}
              aria-label="Decrease font size"
              tabIndex={0}
            >
              <Minus className="h-5 w-5 text-[var(--ds-text)]" />
            </button>
            <span className="text-xs text-[var(--ds-text-muted)] font-mono w-6 text-center select-none">
              {fontSize}
            </span>
            <button
              className="p-2 rounded-full hover:bg-[var(--ds-fill-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => onFontSize(2)}
              aria-label="Increase font size"
              tabIndex={0}
            >
              <Plus className="h-5 w-5 text-[var(--ds-text)]" />
            </button>
            {/* Go-to-line */}
            <form
              className="flex items-center gap-1 ml-2"
              onSubmit={onGotoLine}
              autoComplete="off"
            >
              <span className="text-xs text-[var(--ds-text-muted)] font-mono">:</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={gotoLine}
                onChange={(e) => setGotoLine(e.target.value)}
                className="w-10 bg-transparent border-b border-[var(--ds-border-strong)] text-[var(--ds-text)] text-xs px-1 py-0 outline-none focus:border-accent transition-all"
                placeholder="#"
                aria-label="Go to line"
                tabIndex={0}
              />
              <button
                type="submit"
                className="p-1 rounded hover:bg-[var(--ds-fill-hover)] transition-colors"
                aria-label="Go to line"
                tabIndex={0}
              >
                <ArrowRight className="h-4 w-4 text-[var(--ds-text)]" />
              </button>
            </form>
            {/* Close */}
            <SecondaryButton
              ref={closeBtnRef}
              onClick={onClose}
              icon={X}
              aria-label="Close drawer"
              className="ml-2"
            >
              Close
            </SecondaryButton>
          </div>
        </div>
        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-5 py-2 bg-[var(--ds-surface-overlay)] border-b border-[var(--ds-border-subtle)]">
            <input
              id="code-drawer-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-b border-accent text-[var(--ds-text)] text-sm px-2 py-1 outline-none focus:border-[var(--ds-accent-hover)] transition-all"
              placeholder="Search in code…"
              aria-label="Search in code"
              tabIndex={0}
            />
            <span className="text-xs text-[var(--ds-text-muted)] font-mono">
              {searchMatches.length > 0
                ? `${searchIndex + 1}/${searchMatches.length}`
                : ""}
            </span>
            <button
              className="p-1 rounded hover:bg-[var(--ds-fill-hover)] transition-colors text-[var(--ds-text)]"
              onClick={() => handleSearchNav(-1)}
              aria-label="Previous match"
              tabIndex={0}
              disabled={searchMatches.length === 0}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className="p-1 rounded hover:bg-[var(--ds-fill-hover)] transition-colors text-[var(--ds-text)]"
              onClick={() => handleSearchNav(1)}
              aria-label="Next match"
              tabIndex={0}
              disabled={searchMatches.length === 0}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className="p-1 rounded hover:bg-[var(--ds-fill-hover)] transition-colors"
              onClick={handleSearchClear}
              aria-label="Clear search"
              tabIndex={0}
            >
              <X className="h-4 w-4 text-[var(--ds-text)]" />
            </button>
          </div>
        )}
        {/* Code Viewer */}
        <div
          className="flex-1 overflow-auto relative"
          id={ariaDescribedBy}
          tabIndex={0}
        >
          <div id="code-drawer-codeblock">
            {explanation && (
              <div className="px-5 pt-4 pb-3 border-b border-[var(--ds-border-subtle)]">
                <div className="text-xs uppercase tracking-wide text-[var(--ds-plan)] font-semibold mb-2">
                  Explanation
                </div>
                <div className="space-y-3 text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                  {getExplanationBlocks(explanation).map((block, idx) => {
                    if (block.type === "list") {
                      return (
                        <ul
                          key={`drawer-exp-list-${idx}`}
                          className="list-disc pl-5 space-y-1"
                        >
                          {block.items.map((item, itemIdx) => (
                            <li key={`drawer-exp-item-${idx}-${itemIdx}`}>{item}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={`drawer-exp-paragraph-${idx}`} className="whitespace-pre-line">
                        {block.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
            <SyntaxHighlighter
              language="lua"
              style={atomOneDark}
              customStyle={{
                background: "var(--ds-bg-workspace)",
                margin: 0,
                borderRadius: 0,
                fontSize: `${fontSize}px`,
                minHeight: "100%",
                padding: "1.5rem 1.25rem",
                outline: "none",
              }}
              showLineNumbers
              wrapLongLines
              lineProps={lineNumber => lineProps(lineNumber)}
              useInlineStyles={true}
              PreTag="pre"
              CodeTag="code"
            >
              {(!searchTerm || searchMatches.length === 0) ? displayCode : null}
            </SyntaxHighlighter>
            {(searchTerm && searchMatches.length > 0) && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                  background: "transparent",
                }}
              >
                <pre
                  style={{
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                    margin: 0,
                    padding: "1.5rem 1.25rem",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {highlightedCode}
                </pre>
              </div>
            )}
          </div>
        </div>
        {/* Bottom Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end p-4 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] sticky bottom-0 z-10">
          {!isSavedScript && (
            <GlowButton
              onClick={onSaveScript}
              icon={Bookmark}
              aria-label="Save to Creations"
              locked={saveSuccess}
              glowColor="from-[var(--ds-accent-pressed)] to-accent"
            >
              {saveSuccess ? "Saved!" : "Save to Creations"}
            </GlowButton>
          )}
          <GlowButton
            onClick={onCopy}
            icon={Copy}
            aria-label="Copy code"
            locked={copySuccess}
          >
            {copySuccess ? "Copied!" : "Copy"}
          </GlowButton>
          <GlowButton
            onClick={() => onDownload("lua")}
            icon={Download}
            aria-label="Download as .lua"
          >
            .lua
          </GlowButton>
          <GlowButton
            onClick={() => onDownload("txt")}
            icon={Download}
            aria-label="Download as .txt"
          >
            .txt
          </GlowButton>
          <SecondaryButton
            onClick={onClose}
            icon={X}
            aria-label="Close"
          >
            Close
          </SecondaryButton>
          {saveError && (
            <span className="ml-4 text-xs text-[var(--ds-danger)]">{saveError}</span>
          )}
          {/* Live status badge in bottom bar */}
          {liveGenerating && (
            <span className="flex items-center gap-1 ml-4">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent font-mono">Generating code live…</span>
            </span>
          )}
        </div>
        {/* Scoped CSS for glow and highlights */}
        <style>{`
          .code-drawer-glow {
            animation: code-drawer-glow-anim 2.5s linear infinite;
          }
          @keyframes code-drawer-glow-anim {
            0% { filter: blur(8px) brightness(1.1); }
            50% { filter: blur(12px) brightness(1.3); }
            100% { filter: blur(8px) brightness(1.1); }
          }
          .code-drawer-search-highlight {
            background: var(--ds-accent-soft);
            color: var(--ds-accent);
            border-radius: 2px;
            padding: 0 2px;
          }
          .code-drawer-search-highlight-active {
            background: var(--ds-accent);
            color: var(--ds-accent-foreground);
          }
          .code-drawer-goto-highlight {
            animation: code-drawer-goto-flash 1.2s;
          }
          @keyframes code-drawer-goto-flash {
            0% { background: rgba(var(--ds-accent-rgb), 0.35);}
            100% { background: transparent;}
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
