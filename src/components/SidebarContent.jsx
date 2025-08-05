import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Star, Settings, Check, History, Code, Download, Trash2, Folder, Tag, Search
} from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";

export default function SidebarContent({
  activeTab,
  setActiveTab,
  handleClearChat,
  setPrompt,
  savedScripts,
  handleUpdateScriptTitle,
  handleDeleteScript,
  folders,
  setFolders,
  selectedFolder,
  setSelectedFolder,
  tags,
  setTags,
  selectedTag,
  setSelectedTag,
  openVersionHistory,
  setShowAddFolderModal,
  setShowAddTagModal,
  promptSearch,
  setPromptSearch,
  handleFavoriteScript,
  handleTagScript
}) {
  const [editingScriptId, setEditingScriptId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [shareCopiedId, setShareCopiedId] = useState(null);

  // Filter scripts by folder/tag/search
  let filteredScripts = savedScripts;
  if (selectedFolder !== "all") {
    filteredScripts = filteredScripts.filter(s => s.folder === selectedFolder);
  }
  if (selectedTag !== "all") {
    filteredScripts = filteredScripts.filter(s => Array.isArray(s.tags) && s.tags.includes(selectedTag));
  }
  if (promptSearch) {
    filteredScripts = filteredScripts.filter(
      s =>
        (s.title && s.title.toLowerCase().includes(promptSearch.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(promptSearch.toLowerCase()))
    );
  }

  return (
    <>
      <div className="flex border-b border-gray-800">
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
        {activeTab === "chat" ? (
          <div className="p-4">
            <button
              onClick={handleClearChat}
              className="w-full py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors duration-300 text-gray-300 text-sm flex items-center justify-center focus:ring-2 focus:ring-[#9b5de5] outline-none"
              aria-label="Clear conversation"
            >
              <X className="h-4 w-4 mr-2" />
              Clear conversation
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search scripts..."
                value={promptSearch}
                onChange={e => setPromptSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Folder className="h-4 w-4 text-gray-400" />
              <select
                className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
              >
                {folders.map(f => (
                  <option key={f} value={f}>{f === "all" ? "All Folders" : f}</option>
                ))}
              </select>
              <button
                className="ml-1 p-1 rounded hover:bg-gray-800"
                title="Add Folder"
                onClick={() => setShowAddFolderModal(true)}
              >
                <Plus className="h-4 w-4 text-[#00f5d4]" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <select
                className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
              >
                {tags.map(t => (
                  <option key={t} value={t}>{t === "all" ? "All Tags" : t}</option>
                ))}
              </select>
              <button
                className="ml-1 p-1 rounded hover:bg-gray-800"
                title="Add Tag"
                onClick={() => setShowAddTagModal(true)}
              >
                <Plus className="h-4 w-4 text-[#00f5d4]" />
              </button>
              {selectedTag !== "all" && (
                <button
                  className="ml-2 px-2 py-1 rounded bg-[#00f5d4]/20 text-[#00f5d4] text-xs font-bold"
                  onClick={() => setSelectedTag("all")}
                >
                  Clear
                </button>
              )}
            </div>
            {filteredScripts.length === 0 && (
              <div className="text-gray-400 text-sm">No saved scripts yet.</div>
            )}
            {/* Favorites Section */}
            {filteredScripts.filter(s => s.favorite).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 text-[#fbbf24] mr-2" />
                  <span className="text-xs text-[#fbbf24] font-bold">Favorites</span>
                </div>
                {filteredScripts.filter(s => s.favorite).map((script) => (
                  <div
                    key={script.id}
                    className="p-3 rounded-lg bg-gray-900/30 border border-[#fbbf24] hover:border-[#fbbf24]/70 transition-colors duration-300"
                  >
                    {editingScriptId === script.id ? (
                      <>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          className="font-medium text-white bg-gray-800 border border-gray-700 rounded px-2 py-1 mr-2 w-full max-w-[180px] focus:ring-2 focus:ring-[#9b5de5] outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateScriptTitle(script.id, editingTitle);
                              setEditingScriptId(null);
                              setEditingTitle("");
                            }
                            if (e.key === "Escape") {
                              setEditingScriptId(null);
                              setEditingTitle("");
                            }
                          }}
                        />
                        <button
                          className="ml-1 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                          title="Save title"
                          onClick={() => {
                            handleUpdateScriptTitle(script.id, editingTitle);
                            setEditingScriptId(null);
                            setEditingTitle("");
                          }}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </button>
                        <button
                          className="ml-1 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                          title="Cancel"
                          onClick={() => {
                            setEditingScriptId(null);
                            setEditingTitle("");
                          }}
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <h3 className="font-medium text-white flex items-center">
                            {script.title}
                            {script.favorite && (
                              <Star className="ml-2 h-4 w-4 text-[#fbbf24]" fill="#fbbf24" />
                            )}
                          </h3>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                            title={script.favorite ? "Unfavorite" : "Favorite"}
                            onClick={() => handleFavoriteScript(script.id, !script.favorite)}
                          >
                            <Star className={`h-4 w-4 ${script.favorite ? "text-[#fbbf24]" : "text-gray-400"}`} fill={script.favorite ? "#fbbf24" : "none"} />
                          </button>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                            title="Edit title"
                            onClick={() => {
                              setEditingScriptId(script.id);
                              setEditingTitle(script.title);
                            }}
                          >
                            <Settings className="h-4 w-4 text-gray-400" />
                          </button>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                            title="Delete script"
                            onClick={() => setDeleteConfirmId(script.id)}
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                            title="Version history"
                            onClick={() => openVersionHistory(script)}
                          >
                            <History className="h-4 w-4 text-[#00f5d4]" />
                          </button>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                            title="Share"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/script/${script.id}`);
                              setShareCopiedId(script.id);
                              setTimeout(() => setShareCopiedId(null), 1200);
                            }}
                          >
                            {shareCopiedId === script.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Code className="h-4 w-4 text-[#00f5d4]" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{script.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(script.createdAt).toLocaleDateString()}
                            {script.version ? (
                              <span className="ml-2 text-[#00f5d4] font-bold">v{script.version}</span>
                            ) : null}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                              title="Download"
                              onClick={() => {
                                const blob = new Blob([script.code], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${script.title.replace(/\s+/g, "_")}.lua`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                        {/* Tag Editor */}
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-gray-400 mr-2">Tags:</span>
                          <input
                            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white"
                            value={Array.isArray(script.tags) ? script.tags.join(", ") : ""}
                            onChange={e => {
                              const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                              handleTagScript(script.id, tags);
                            }}
                            placeholder="Add tags"
                          />
                        </div>
                        <SyntaxHighlighter
                          language="lua"
                          style={atomOneDark}
                          customStyle={{ fontSize: "0.9rem", borderRadius: 6 }}
                        >
                          {script.code}
                        </SyntaxHighlighter>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Non-favorite scripts */}
            {filteredScripts.filter(s => !s.favorite).map((script) => (
              <div
                key={script.id}
                className="p-3 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-gray-700 transition-colors duration-300"
              >
                {editingScriptId === script.id ? (
                  <>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      className="font-medium text-white bg-gray-800 border border-gray-700 rounded px-2 py-1 mr-2 w-full max-w-[180px] focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateScriptTitle(script.id, editingTitle);
                          setEditingScriptId(null);
                          setEditingTitle("");
                        }
                        if (e.key === "Escape") {
                          setEditingScriptId(null);
                          setEditingTitle("");
                        }
                      }}
                    />
                    <button
                      className="ml-1 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      title="Save title"
                      onClick={() => {
                        handleUpdateScriptTitle(script.id, editingTitle);
                        setEditingScriptId(null);
                        setEditingTitle("");
                      }}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </button>
                    <button
                      className="ml-1 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      title="Cancel"
                      onClick={() => {
                        setEditingScriptId(null);
                        setEditingTitle("");
                      }}
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <h3 className="font-medium text-white flex items-center">
                        {script.title}
                        {script.favorite && (
                          <Star className="ml-2 h-4 w-4 text-[#fbbf24]" fill="#fbbf24" />
                        )}
                      </h3>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                        title={script.favorite ? "Unfavorite" : "Favorite"}
                        onClick={() => handleFavoriteScript(script.id, !script.favorite)}
                      >
                        <Star className={`h-4 w-4 ${script.favorite ? "text-[#fbbf24]" : "text-gray-400"}`} fill={script.favorite ? "#fbbf24" : "none"} />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                        title="Edit title"
                        onClick={() => {
                          setEditingScriptId(script.id);
                          setEditingTitle(script.title);
                        }}
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                        title="Delete script"
                        onClick={() => setDeleteConfirmId(script.id)}
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                        title="Version history"
                        onClick={() => openVersionHistory(script)}
                      >
                        <History className="h-4 w-4 text-[#00f5d4]" />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                        title="Share"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/script/${script.id}`);
                          setShareCopiedId(script.id);
                          setTimeout(() => setShareCopiedId(null), 1200);
                        }}
                      >
                        {shareCopiedId === script.id ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Code className="h-4 w-4 text-[#00f5d4]" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{script.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(script.createdAt).toLocaleDateString()}
                        {script.version ? (
                          <span className="ml-2 text-[#00f5d4] font-bold">v{script.version}</span>
                        ) : null}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          className="p-1 rounded hover:bg-gray-800 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                          title="Download"
                          onClick={() => {
                            const blob = new Blob([script.code], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${script.title.replace(/\s+/g, "_")}.lua`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {/* Tag Editor */}
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-400 mr-2">Tags:</span>
                      <input
                        className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white"
                        value={Array.isArray(script.tags) ? script.tags.join(", ") : ""}
                        onChange={e => {
                          const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                          handleTagScript(script.id, tags);
                        }}
                        placeholder="Add tags"
                      />
                    </div>
                    <SyntaxHighlighter
                      language="lua"
                      style={atomOneDark}
                      customStyle={{ fontSize: "0.9rem", borderRadius: 6 }}
                    >
                      {script.code}
                    </SyntaxHighlighter>
                  </>
                )}
              </div>
            ))}
            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
              <Modal
                onClose={() => setDeleteConfirmId(null)}
                title="Delete Script"
              >
                <div className="mb-4 text-gray-200">
                  Are you sure you want to delete this script? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold"
                    onClick={() => {
                      handleDeleteScript(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
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