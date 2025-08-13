import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Edit, Trash2, History, Download, Eye, ChevronDown, ChevronUp, Search, Check, MessageCircle
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";

/**
 * SidebarContent for scripts and versioning.
 * Props:
 * - activeTab, setActiveTab
 * - handleClearChat
 * - setPrompt
 * - scripts: [{id, title, createdAt, updatedAt, latestVersion}]
 * - currentScriptId, setCurrentScriptId
 * - handleCreateScript, handleRenameScript, handleDeleteScript
 * - currentScript
 * - versionHistory: [{version, code, createdAt, id, title}]
 * - onVersionView, onVersionDownload
 * - promptSearch, setPromptSearch
 */
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
}) {
  // Script management state
  const [showAddScriptModal, setShowAddScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");
  const [deleteScriptId, setDeleteScriptId] = useState(null);

  // Version dropdown state per script
  const [versionDropdownOpen, setVersionDropdownOpen] = useState({});

  // Script search
  let filteredScripts = scripts;
  if (promptSearch) {
    filteredScripts = filteredScripts.filter(
      s =>
        (s.title && s.title.toLowerCase().includes(promptSearch.toLowerCase()))
    );
  }

  return (
    <>
      <div className="flex border-b border-gray-800">
        <SidebarTab
          label="Scripts"
          active={activeTab === "scripts"}
          onClick={() => setActiveTab("scripts")}
        />
        <SidebarTab
          label="History"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        />
        <SidebarTab
          label="Saved"
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {activeTab === "scripts" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Your Scripts</span>
              <button
                className="p-1 rounded hover:bg-gray-800 transition"
                title="New Script"
                onClick={() => setShowAddScriptModal(true)}
              >
                <Plus className="h-5 w-5 text-[#9b5de5]" />
              </button>
            </div>
            {scripts.length === 0 && (
              <div className="text-gray-400 text-sm mb-2">No scripts yet. Create one!</div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search scripts..."
                value={promptSearch}
                onChange={e => setPromptSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {filteredScripts.map(script => (
                <div
                  key={script.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${currentScriptId === script.id ? "border-[#00f5d4] bg-gray-800/60" : "border-gray-700 bg-gray-900/40"} transition-colors`}
                  tabIndex={0}
                  aria-selected={currentScriptId === script.id}
                  onClick={() => setCurrentScriptId(script.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex-1 min-w-0">
                    {renamingScriptId === script.id ? (
                      <input
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
                        value={renameScriptTitle}
                        onChange={e => setRenameScriptTitle(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            handleRenameScript(script.id, renameScriptTitle);
                            setRenamingScriptId(null);
                          }
                          if (e.key === "Escape") {
                            setRenamingScriptId(null);
                          }
                        }}
                      />
                    ) : (
                      <span
                        className="font-semibold text-white truncate"
                        style={{
                          maxWidth: "140px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          verticalAlign: "bottom",
                          whiteSpace: "nowrap",
                        }}
                        title={script.title}
                      >
                        {script.title}
                      </span>
                    )}
                    <div className="text-xs text-gray-400">
                      {script.updatedAt && (
                        <span>
                          Last updated: {new Date(script.updatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {renamingScriptId === script.id ? (
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Save"
                        onClick={() => {
                          handleRenameScript(script.id, renameScriptTitle);
                          setRenamingScriptId(null);
                        }}
                      >
                        <Check className="h-4 w-4 text-green-400" />
                      </button>
                    ) : (
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Rename"
                        onClick={e => {
                          e.stopPropagation();
                          setRenamingScriptId(script.id);
                          setRenameScriptTitle(script.title);
                        }}
                      >
                        <Edit className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                    <button
                      className="p-1 rounded hover:bg-gray-700"
                      title="Delete"
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteScriptId(script.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
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
                    onChange={e => setNewScriptTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#00f5d4] text-black font-bold"
                    onClick={() => {
                      handleCreateScript(newScriptTitle || "New Script");
                      setShowAddScriptModal(false);
                      setNewScriptTitle("");
                    }}
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
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold"
                    onClick={() => {
                      handleDeleteScript(deleteScriptId);
                      setDeleteScriptId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteScriptId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-4">
            <button
              onClick={handleClearChat}
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
                <div className="text-gray-400 text-sm">No versions for this script yet.</div>
              )}
              <div className="space-y-2">
                {versionHistory && versionHistory.map((ver, vIdx) => (
                  <div
                    key={ver.id || vIdx}
                    className="flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors rounded"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-[#00f5d4] truncate">
                        {ver.title || "Script"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ver.version ? `v${ver.version}` : ""}
                        {ver.createdAt && (
                          <span className="ml-2">
                            {new Date(ver.createdAt).toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="View"
                        onClick={() => onVersionView && onVersionView(ver)}
                      >
                        <Eye className="h-4 w-4 text-[#00f5d4]" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Download"
                        onClick={() => onVersionDownload && onVersionDownload(ver)}
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

        {/* Saved Scripts tab can be implemented as before, or you can add your own logic */}
        {activeTab === "saved" && (
          <div className="p-4 text-gray-400 text-sm">
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