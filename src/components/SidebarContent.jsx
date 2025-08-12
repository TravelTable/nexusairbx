import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Edit, Trash2, History, Download, Eye, ChevronDown, ChevronUp, Folder, Search, Check, MessageCircle
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";

/**
 * SidebarContent for multi-chat, script history, and versioning.
 * Props:
 * - activeTab, setActiveTab
 * - handleClearChat
 * - setPrompt
 * - chats: [{id, title, createdAt, updatedAt}]
 * - currentChatId, setCurrentChatId
 * - handleCreateChat, handleRenameChat, handleDeleteChat
 * - scripts: [{id, prompt, sections, status, versions: []}]
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
  chats = [],
  currentChatId,
  setCurrentChatId,
  handleCreateChat,
  handleRenameChat,
  handleDeleteChat,
  scripts = [],
  currentScript,
  versionHistory = [],
  onVersionView,
  onVersionDownload,
  promptSearch,
  setPromptSearch,
}) {
  // Chat management state
  const [showAddChatModal, setShowAddChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const [deleteChatId, setDeleteChatId] = useState(null);

  // Script version dropdown
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(true);

  // Script search
  let filteredScripts = scripts;
  if (promptSearch) {
    filteredScripts = filteredScripts.filter(
      s =>
        (s.sections?.title && s.sections.title.toLowerCase().includes(promptSearch.toLowerCase())) ||
        (s.prompt && s.prompt.toLowerCase().includes(promptSearch.toLowerCase()))
    );
  }

  return (
    <>
      <div className="flex border-b border-gray-800">
        <SidebarTab
          label="Chats"
          active={activeTab === "chats"}
          onClick={() => setActiveTab("chats")}
        />
        <SidebarTab
          label="Chat"
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        />
        <SidebarTab
          label="Saved Scripts"
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {activeTab === "chats" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Your Chats</span>
              <button
                className="p-1 rounded hover:bg-gray-800 transition"
                title="New Chat"
                onClick={() => setShowAddChatModal(true)}
              >
                <Plus className="h-5 w-5 text-[#9b5de5]" />
              </button>
            </div>
            {chats.length === 0 && (
              <div className="text-gray-400 text-sm mb-2">No chats yet. Create one!</div>
            )}
            <div className="space-y-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${currentChatId === chat.id ? "border-[#00f5d4] bg-gray-800/60" : "border-gray-700 bg-gray-900/40"} transition-colors`}
                  tabIndex={0}
                  aria-selected={currentChatId === chat.id}
                  onClick={() => setCurrentChatId(chat.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex-1 min-w-0">
                    {renamingChatId === chat.id ? (
                      <input
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
                        value={renameChatTitle}
                        onChange={e => setRenameChatTitle(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            handleRenameChat(chat.id, renameChatTitle);
                            setRenamingChatId(null);
                          }
                          if (e.key === "Escape") {
                            setRenamingChatId(null);
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
  title={chat.title}
>
  {chat.title}
</span>
                    )}
                    <div className="text-xs text-gray-400">
                      {chat.updatedAt && (
                        <span>
                          Last updated: {new Date(chat.updatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {renamingChatId === chat.id ? (
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Save"
                        onClick={() => {
                          handleRenameChat(chat.id, renameChatTitle);
                          setRenamingChatId(null);
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
                          setRenamingChatId(chat.id);
                          setRenameChatTitle(chat.title);
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
                        setDeleteChatId(chat.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Add Chat Modal */}
            {showAddChatModal && (
              <Modal
                onClose={() => setShowAddChatModal(false)}
                title="Create New Chat"
              >
                <div className="mb-4">
                  <input
                    className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-2 text-white"
                    placeholder="Chat title"
                    value={newChatTitle}
                    onChange={e => setNewChatTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#00f5d4] text-black font-bold"
                    onClick={() => {
                      handleCreateChat(newChatTitle || "New Chat");
                      setShowAddChatModal(false);
                      setNewChatTitle("");
                    }}
                  >
                    Create
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setShowAddChatModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
            {/* Delete Chat Modal */}
            {deleteChatId && (
              <Modal
                onClose={() => setDeleteChatId(null)}
                title="Delete Chat"
              >
                <div className="mb-4 text-gray-200">
                  Are you sure you want to delete this chat? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold"
                    onClick={() => {
                      handleDeleteChat(deleteChatId);
                      setDeleteChatId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteChatId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="p-4">
            <button
              onClick={handleClearChat}
              className="w-full py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors duration-300 text-gray-300 text-sm flex items-center justify-center focus:ring-2 focus:ring-[#9b5de5] outline-none"
              aria-label="Clear conversation"
            >
              <X className="h-4 w-4 mr-2" />
              Clear conversation
            </button>
            {/* Script History for Current Chat */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-[#00f5d4]" />
                <span className="font-bold text-[#00f5d4]">Script History</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                  placeholder="Search scripts in this chat..."
                  value={promptSearch}
                  onChange={e => setPromptSearch(e.target.value)}
                />
              </div>
              {filteredScripts.length === 0 && (
                <div className="text-gray-400 text-sm">No scripts in this chat yet.</div>
              )}
              <div className="space-y-2">
                {filteredScripts.map((script, idx) => (
                  <div
                    key={script.id}
                    className="p-3 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-[#00f5d4] transition-colors duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white">
                          {script.sections?.title || `Script ${idx + 1}`}
                        </span>
                        {script.sections?.version && (
                          <span className="ml-2 text-xs text-gray-400 font-bold">
                            v{script.sections.version}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="View latest version"
                          onClick={() => onVersionView && onVersionView(script.versions?.[0] || script.sections)}
                        >
                          <Eye className="h-4 w-4 text-[#00f5d4]" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="Download latest version"
                          onClick={() => onVersionDownload && onVersionDownload(script.versions?.[0] || script.sections)}
                        >
                          <Download className="h-4 w-4 text-gray-400" />
                        </button>
                        {/* Version History Dropdown */}
                        {script.versions && script.versions.length > 1 && (
                          <button
                            className="p-1 rounded hover:bg-gray-700"
                            title="Show version history"
                            onClick={() => setVersionDropdownOpen(v => !v)}
                          >
                            {versionDropdownOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Version History List */}
                    {versionDropdownOpen && script.versions && script.versions.length > 1 && (
                      <div className="mt-2 bg-gray-900 border border-gray-800 rounded-lg max-h-40 overflow-y-auto">
                        {script.versions.map((ver, vIdx) => (
                          <div
                            key={ver.createdAt || vIdx}
                            className="flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-semibold text-[#00f5d4] truncate">
                                {ver.title || script.sections?.title || "Script"}
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
                    )}
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
