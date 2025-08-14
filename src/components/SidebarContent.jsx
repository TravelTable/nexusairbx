import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Edit, Trash2, History, Download, Eye, ChevronDown, ChevronUp, Search, Check, MessageCircle
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";

// Utility: Firestore timestamp to JS Date (hardened)
const toJsDate = (ts) =>
  ts && typeof ts === "object" && typeof ts.seconds === "number"
    ? new Date(ts.seconds * 1000)
    : ts
    ? new Date(ts)
    : undefined;

// Utility: Safe filename for download
const safeFile = (t) =>
  (t || "Script")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) + ".lua";

// Utility: Stable key for versions (use id or fallback to v-version)
const keyFor = (v, i) => v.id ?? `v-${v.version ?? i}`;

// Utility: fromNow with Firestore timestamp support (hardened)
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const fromNow = (ts) => {
  if (!ts) return "—";
  const dt = toJsDate(ts);
  if (!dt) return "—";
  const d = +dt;
  if (!Number.isFinite(d)) return "—";
  const now = Date.now();
  const diff = d - now;
  const mins = Math.round(diff / 60000);
  if (isFinite(mins) && Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hrs = Math.round(diff / 3600000);
  if (isFinite(hrs) && Math.abs(hrs) < 24) return rtf.format(hrs, "hour");
  const days = Math.round(diff / 86400000);
  if (isFinite(days)) return rtf.format(days, "day");
  return "—";
};

export default function SidebarContent({
  activeTab,
  setActiveTab,
  handleClearChat,
  setPrompt,
  scripts = [],
  currentScriptId,
  setCurrentScriptId,
  handleCreateScript,
  handleRenameScript,
  handleDeleteScript,
  currentScript,
  versionHistory = [],
  onVersionView,
  onVersionDownload,
  promptSearch,
  setPromptSearch,
  isMobile,
  onSelect, // optional: parent can pass to close drawer on mobile
}) {
  // Script management state
  const [showAddScriptModal, setShowAddScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");
  const [deleteScriptId, setDeleteScriptId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounced search state
  const [localSearch, setLocalSearch] = useState(promptSearch || "");
  useEffect(() => setLocalSearch(promptSearch || ""), [promptSearch]);
  const debRef = useRef();

  // Memoized filtered and sorted scripts (null-safe search, consistent sorting)
  const q = (promptSearch || "").toLowerCase();
  const filteredScripts = useMemo(() => {
    const list = Array.isArray(scripts) ? scripts : [];
    const filtered = q
      ? list.filter((s) => (s.title || "").toLowerCase().includes(q))
      : list;
    // Sort: latest updated first, fallback to createdAt, then title
    return filtered.slice().sort((a, b) => {
      const au = Number(+toJsDate(a.updatedAt)) || 0;
      const bu = Number(+toJsDate(b.updatedAt)) || 0;
      if (bu !== au) return bu - au;
      const ac = Number(+toJsDate(a.createdAt)) || 0;
      const bc = Number(+toJsDate(b.createdAt)) || 0;
      if (bc !== ac) return bc - ac;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [scripts, q]);

  // --- New Script Logic: clear selection and start a new script ---
  const handleNewScript = useCallback(() => {
    setCurrentScriptId(null); // Clear selection
    setShowAddScriptModal(true);
  }, [setCurrentScriptId]);

  // --- Script Selection Logic: select script and load its version history ---
  const handleScriptSelect = useCallback(
    (scriptId) => {
      setCurrentScriptId(scriptId);
      if (isMobile && typeof onSelect === "function") {
        onSelect();
      }
    },
    [isMobile, setCurrentScriptId, onSelect]
  );

  // --- Debounced search input handler ---
  const handleSearchChange = (e) => {
    const v = e.target.value;
    setLocalSearch(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setPromptSearch(v), 150);
  };

  // --- Create Script Modal handler (parent-driven state, no local setCurrentScriptId) ---
  const handleCreateScriptClick = async () => {
    await handleCreateScript(newScriptTitle || "New Script");
    setShowAddScriptModal(false);
    setNewScriptTitle("");
    // Parent will setCurrentScriptId; no local override here.
  };

  // --- Confirm Delete Handler ---
  const handleDeleteScriptConfirm = async () => {
    setDeleteLoading(true);
    await handleDeleteScript(deleteScriptId);
    setDeleteLoading(false);
    setDeleteScriptId(null);
    if (currentScriptId === deleteScriptId) {
      setCurrentScriptId(null); // Clear selection if deleted
    }
  };

  // --- Memoized callbacks for version actions ---
  const memoOnVersionView = useCallback(
    (ver) => onVersionView && onVersionView(ver),
    [onVersionView]
  );
  const memoOnVersionDownload = useCallback(
    (ver) => onVersionDownload && onVersionDownload(ver),
    [onVersionDownload]
  );

  // --- Empty state skeleton shimmer ---
  const renderSkeleton = () => (
    <div className="animate-pulse flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40">
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
        <div className="h-3 bg-gray-800 rounded w-16"></div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex border-b border-gray-800" role="tablist" aria-label="Sidebar sections">
        <SidebarTab
          label="Scripts"
          active={activeTab === "scripts"}
          onClick={() => setActiveTab("scripts")}
          role="tab"
          aria-selected={activeTab === "scripts"}
          aria-controls="panel-scripts"
          id="tab-scripts"
          tabIndex={0}
        />
        <SidebarTab
          label="History"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          role="tab"
          aria-selected={activeTab === "history"}
          aria-controls="panel-history"
          id="tab-history"
          tabIndex={0}
        />
        <SidebarTab
          label="Saved"
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
          role="tab"
          aria-selected={activeTab === "saved"}
          aria-controls="panel-saved"
          id="tab-saved"
          tabIndex={0}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {activeTab === "scripts" && (
          <div className="p-4" role="tabpanel" id="panel-scripts" aria-labelledby="tab-scripts">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Your Scripts</span>
              <button
                className="p-1 rounded hover:bg-gray-800 transition"
                title="New Script"
                onClick={handleNewScript}
                aria-label="Create new script"
              >
                <Plus className="h-5 w-5 text-[#9b5de5]" />
              </button>
            </div>
            {scripts.length === 0 && (
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                No scripts yet.{" "}
                <button
                  className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                  onClick={handleNewScript}
                >
                  Create one
                </button>
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search scripts..."
                value={localSearch}
                onChange={handleSearchChange}
                aria-label="Search scripts"
              />
            </div>
            <div className="space-y-2">
              {scripts === undefined ? (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              ) : (filteredScripts ?? []).length === 0 && scripts.length > 0 ? (
                <div className="text-gray-400 text-sm flex items-center gap-2">
                  No scripts match your search.
                  <button
                    className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                    onClick={() => {
                      setPromptSearch("");
                      setLocalSearch("");
                    }}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                (filteredScripts ?? []).map((script) => (
                  <button
                    type="button"
                    key={script.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                      currentScriptId === script.id
                        ? "border-[#00f5d4] bg-gray-800/60"
                        : "border-gray-700 bg-gray-900/40"
                    } transition-colors text-left group`}
                    aria-pressed={currentScriptId === script.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select script ${script.title || "Untitled"}`}
                    onClick={() => handleScriptSelect(script.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleScriptSelect(script.id);
                      }
                      if (e.key === "Delete") {
                        e.preventDefault();
                        setDeleteScriptId(script.id);
                      }
                      if (e.key === "F2") {
                        e.preventDefault();
                        setRenamingScriptId(script.id);
                        setRenameScriptTitle(script.title || "");
                      }
                    }}
                    title={`Select script\nF2: Rename • Delete: Delete`}
                  >
                    <div className="flex-1 min-w-0">
                      {renamingScriptId === script.id ? (
                        <input
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
                          value={renameScriptTitle}
                          onChange={(e) => setRenameScriptTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              if (renameScriptTitle.trim()) {
                                handleRenameScript(script.id, renameScriptTitle.trim());
                              }
                              setRenamingScriptId(null);
                            }
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              setRenamingScriptId(null);
                            }
                          }}
                          onBlur={() => {
                            if (renameScriptTitle.trim()) handleRenameScript(renamingScriptId, renameScriptTitle.trim());
                            setRenamingScriptId(null);
                          }}
                          aria-label="Rename script"
                        />
                      ) : (
                        <span
                          className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
                          title={script.title || "Untitled"}
                        >
                          {script.title || "Untitled"}
                        </span>
                      )}
                      <div className="text-xs text-gray-400">
                        {script.updatedAt && (
                          <span
                            title={toJsDate(script.updatedAt)?.toLocaleString()}
                          >
                            Last updated: {fromNow(script.updatedAt)}
                          </span>
                        )}
                        <span className="ml-2 text-[10px] text-gray-500 hidden group-hover:inline">
                          (F2: Rename • Delete: Delete)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {renamingScriptId === script.id ? (
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="Save"
                          tabIndex={-1}
                          aria-label="Save script name"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (renameScriptTitle.trim()) {
                              handleRenameScript(script.id, renameScriptTitle.trim());
                            }
                            setRenamingScriptId(null);
                          }}
                        >
                          <Check className="h-4 w-4 text-green-400" />
                        </button>
                      ) : (
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="Rename"
                          tabIndex={-1}
                          aria-label="Rename script"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingScriptId(script.id);
                            setRenameScriptTitle(script.title || "");
                          }}
                        >
                          <Edit className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Delete"
                        tabIndex={-1}
                        aria-label="Delete script"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteScriptId(script.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
            {/* Add Script Modal */}
            {showAddScriptModal && (
              <Modal
                onClose={() => setShowAddScriptModal(false)}
                title="Create New Script"
              >
                <div className="mb-4">
                  <input
                    className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-2 text-white"
                    placeholder="Script title"
                    value={newScriptTitle}
                    onChange={(e) => setNewScriptTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#00f5d4] text-black font-bold"
                    onClick={handleCreateScriptClick}
                    disabled={!newScriptTitle.trim()}
                  >
                    Create
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setShowAddScriptModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
            {/* Delete Script Modal */}
            {deleteScriptId && (
              <Modal
                onClose={() => setDeleteScriptId(null)}
                title="Delete Script"
              >
                <div className="mb-4 text-gray-200">
                  Are you sure you want to delete this script? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold disabled:opacity-60"
                    onClick={handleDeleteScriptConfirm}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteScriptId(null)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-4" role="tabpanel" id="panel-history" aria-labelledby="tab-history">
            <button
              onClick={() => {
                if (window.confirm("Clear this conversation? This cannot be undone.")) {
                  handleClearChat();
                }
              }}
              className="w-full py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors duration-300 text-gray-300 text-sm flex items-center justify-center focus:ring-2 focus:ring-[#9b5de5] outline-none"
              aria-label="Clear conversation"
            >
              <X className="h-4 w-4 mr-2" />
              Clear conversation
            </button>
            {/* Version History for Current Script */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-[#00f5d4]" />
                <span className="font-bold text-[#00f5d4]">Version History</span>
              </div>
              {(!versionHistory || versionHistory.length === 0) && (
                <div className="text-gray-400 text-sm">
                  No versions for this script yet. Generate your first version by submitting a prompt on the AI Console.
                </div>
              )}
              <div className="space-y-2">
                {(versionHistory ?? []).map((ver, vIdx) => (
                  <div
                    key={keyFor(ver, vIdx)}
                    className="flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors rounded"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-[#00f5d4] truncate block max-w-[12rem] md:max-w-[16rem]" title={ver.title || "Untitled"}>
                        {ver.title || "Untitled"}
                      </span>
                      <span className="text-xs text-gray-400" title={ver.createdAt ? toJsDate(ver.createdAt)?.toLocaleString() : undefined}>
                        {ver.version ? `v${ver.version}` : ""}
                        {ver.createdAt ? ` • ${fromNow(ver.createdAt)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="View"
                        aria-label="View version"
                        onClick={(e) => {
                          e.stopPropagation();
                          memoOnVersionView(ver);
                        }}
                      >
                        <Eye className="h-4 w-4 text-[#00f5d4]" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Download"
                        aria-label="Download version"
                        onClick={(e) => {
                          e.stopPropagation();
                          memoOnVersionDownload(ver);
                        }}
                      >
                        <Download className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="p-4 text-gray-400 text-sm" role="tabpanel" id="panel-saved" aria-labelledby="tab-saved">
            <div>Saved Scripts tab coming soon. (Implement as needed.)</div>
          </div>
        )}
      </div>
      <div className="mt-8 mb-8 flex flex-col items-center">
        <motion.div
          key="subscribe-bounce"
          initial={false}
          animate={{ y: [0, -40, 0] }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            duration: 1.4,
            ease: "easeInOut"
          }}
          className="w-full flex justify-center"
        >
          {/* You can import and use SubscribeButtonInline here if needed */}
        </motion.div>
      </div>
    </>
  );
}