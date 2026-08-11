import React, { useEffect, useState, useRef } from "react";
import {
  X, Copy, Check, Download, Trash2, Edit, Save, Loader, Share2, Plus, Wand2, Info, ListChecks
} from "lib/icons";
import { useBilling } from "./context/BillingContext";
import { motion, AnimatePresence } from "framer-motion";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import lua from "react-syntax-highlighter/dist/esm/languages/hljs/lua";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { BACKEND_URL } from "./config";
SyntaxHighlighter.registerLanguage("lua", lua);

const API_BASE = `${BACKEND_URL.replace(/\/+$/, "")}/api`;

async function fetchScript(id) {
  const res = await fetch(`${API_BASE}/script/${id}`);
  if (!res.ok) throw new Error("Script not found");
  return await res.json();
}
async function fetchVersions(baseScriptId) {
  const res = await fetch(`${API_BASE}/scripts/${baseScriptId}/versions`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return await res.json();
}
async function updateTags(id, tags) {
  const res = await fetch(`${API_BASE}/scripts/${id}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags })
  });
  if (!res.ok) throw new Error("Failed to update tags");
  return await res.json();
}
async function deleteScript(id) {
  const res = await fetch(`${API_BASE}/scripts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete script");
  return await res.json();
}
function improveScript(code) {
  return fetch(`${API_BASE}/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code })
  }).then(r => r.json());
}
function explainScript(code) {
  return fetch(`${API_BASE}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code })
  }).then(r => r.json());
}
function lintScript(code) {
  return fetch(`${API_BASE}/lint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code })
  }).then(r => r.json());
}

export default function CodeModal({
  open,
  onClose,
  scriptId,
  user,
  readOnly = false // If true, disables editing/deleting/favoriting/tagging
}) {
  const { refresh: refreshBilling } = useBilling();
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
const [tags, setTags] = useState([]);
const [tagInput, setTagInput] = useState("");
const [tagEdit, setTagEdit] = useState(false);
const [tagLoading, setTagLoading] = useState(false);
const [allVersions, setAllVersions] = useState([]);
const [versionLoading, setVersionLoading] = useState(false);
const [selectedVersion, setSelectedVersion] = useState(null);
const [editMode, setEditMode] = useState(false);
const [editCode, setEditCode] = useState("");
const [editSaving, setEditSaving] = useState(false);
const [deleteLoading, setDeleteLoading] = useState(false);
const [aiLoading, setAiLoading] = useState(false);
const [aiResult, setAiResult] = useState("");
const [aiType, setAiType] = useState(""); // "improve", "explain", "lint"
const [shareCopied, setShareCopied] = useState(false);
const [actionError, setActionError] = useState("");
const [actionSuccess, setActionSuccess] = useState("");

useEffect(() => {
  if (!open || !scriptId) return;
  setLoading(true);
  setError("");
  setScript(null);
  setAllVersions([]);
  setSelectedVersion(null);
    fetchScript(scriptId)
      .then(res => {
        setScript(res);
        setTags(res.tags || []);
      setSelectedVersion(res);
      if (res.baseScriptId) {
        setVersionLoading(true);
        fetchVersions(res.baseScriptId)
          .then(versions => {
            setAllVersions(versions || []);
            setVersionLoading(false);
          })
          .catch(() => setVersionLoading(false));
      }
      setLoading(false);
    })
    .catch(e => {
      setError(e.message || "Failed to load script.");
      setLoading(false);
    });
}, [open, scriptId]);

  // Copy code
  const handleCopy = () => {
    navigator.clipboard.writeText(selectedVersion.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Download code
  const handleDownload = () => {
    const blob = new Blob([selectedVersion.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedVersion.title.replace(/\s+/g, "_")}.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share link
  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/script/${selectedVersion.id}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  };


  // Tagging
const handleAddTag = async () => {
  if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
  setTagLoading(true);
  setActionError("");
  setActionSuccess("");
  const newTags = [...tags, tagInput.trim()];
  setTags(newTags);
  setTagInput("");
  try {
    const updated = await updateTags(selectedVersion.id, newTags);
    setTags(updated.tags);
    setSelectedVersion(sv => ({ ...sv, tags: updated.tags }));
    setScript(s => ({ ...s, tags: updated.tags }));
    setActionSuccess("Tag added!");
  } catch {
    setTags(tags);
    setActionError("Failed to update tags.");
  }
  setTagLoading(false);
};
const handleRemoveTag = async (tag) => {
  setTagLoading(true);
  setActionError("");
  setActionSuccess("");
  const newTags = tags.filter(t => t !== tag);
  setTags(newTags);
  try {
    const updated = await updateTags(selectedVersion.id, newTags);
    setTags(updated.tags);
    setSelectedVersion(sv => ({ ...sv, tags: updated.tags }));
    setScript(s => ({ ...s, tags: updated.tags }));
    setActionSuccess("Tag removed!");
  } catch {
    setTags(tags);
    setActionError("Failed to update tags.");
  }
  setTagLoading(false);
};

  // Delete
const handleDelete = async () => {
  if (!window.confirm("Are you sure you want to delete this script?")) return;
  setDeleteLoading(true);
  setActionError("");
  setActionSuccess("");
  try {
    await deleteScript(selectedVersion.id);
    setDeleteLoading(false);
    setActionSuccess("Script deleted.");
    setTimeout(() => onClose(), 1000);
  } catch {
    setDeleteLoading(false);
    setActionError("Failed to delete script.");
  }
};

  // Version switch
const handleVersionSwitch = (ver) => {
  setSelectedVersion(ver);
  setTags(ver.tags || []);
  setEditMode(false);
  setAiResult("");
  setAiType("");
  setScript(ver);
};

  // Edit code
  const handleEdit = () => {
    setEditMode(true);
    setEditCode(selectedVersion.code);
  };
const handleEditSave = async () => {
  setEditSaving(true);
  setActionError("");
  setActionSuccess("");
  try {
    const payload = {
      uid: script.uid,
      title: script.title,
      description: script.description,
      code: editCode,
      language: script.language,
      tags: tags,
      baseScriptId: script.baseScriptId || script.id
    };
    const res = await fetch(`${API_BASE}/scripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to save new version");
    const newVersion = await res.json();
    setEditSaving(false);
    setEditMode(false);
    setSelectedVersion(newVersion);
    setScript(newVersion);
    setAllVersions((prev) => [...prev, newVersion]);
    setAiResult("");
    setAiType("");
    setActionSuccess("New version saved!");
  } catch (err) {
    setEditSaving(false);
    setActionError("Failed to save new version.");
  }
};

  // AI actions
  const handleAI = (type) => {
    setAiLoading(true);
    setAiType(type);
    setAiResult("");
    let fn;
    if (type === "improve") fn = improveScript;
    else if (type === "explain") fn = explainScript;
    else if (type === "lint") fn = lintScript;
    fn(selectedVersion.code)
      .then(res => {
        setAiResult(res.improved || res.explanation || res.lint || "No result.");
        setAiLoading(false);
        refreshBilling();
      })
      .catch(() => {
        setAiResult("Failed to get result.");
        setAiLoading(false);
      });
  };

  // Responsive modal close on outside click
  const modalRef = useRef();
  useEffect(() => {
    function handleClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 py-4">
      <AnimatePresence>
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--ds-surface-overlay)] border border-[var(--ds-border-subtle)] text-[var(--ds-text)] rounded-xl shadow-[var(--ds-shadow-overlay)] w-full max-w-2xl mx-auto p-0 flex flex-col"
          style={{ maxHeight: "90vh", overflow: "hidden" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ds-border-subtle)]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[var(--ds-text)]">{selectedVersion?.title || "Script"}</span>
                <span className="text-xs text-accent">v{selectedVersion?.version || 1}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.map(tag => (
                  <span key={tag} className="bg-[var(--ds-accent-soft)] text-accent px-2 py-1 rounded text-xs flex items-center">
                    {tag}
                    {!readOnly && tagEdit && (
                      <button className="ml-1" onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {!readOnly && tagEdit && (
 <form
  onSubmit={e => { e.preventDefault(); handleAddTag(); }}
  className="flex items-center"
>
  <input
    className="bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)] rounded px-2 py-1 text-xs text-[var(--ds-text)] w-20"
    value={tagInput}
    onChange={e => setTagInput(e.target.value)}
    placeholder="Add tag"
    disabled={tagLoading}
  />
  <button type="submit" className="ml-1" disabled={tagLoading}>
    {tagLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-accent" />}
  </button>
</form>
                )}
                {!readOnly && (
                  <button
                    className="ml-2 text-xs text-accent underline"
                    onClick={() => setTagEdit(e => !e)}
                  >
                    {tagEdit ? "Done" : "Edit Tags"}
                  </button>
                )}
              </div>
            </div>
            <button className="p-2 rounded hover:bg-[var(--ds-fill-hover)]" onClick={onClose}>
              <X className="h-6 w-6 text-[var(--ds-text-muted)]" />
            </button>
          </div>
          {/* Version Switcher */}
          {versionLoading ? (
            <div className="flex items-center px-6 py-2 text-[var(--ds-text-muted)] text-sm">
              <Loader className="h-4 w-4 animate-spin mr-2" /> Loading versions...
            </div>
          ) : allVersions.length > 1 && (
            <div className="flex items-center px-6 py-2 gap-2 overflow-x-auto">
              <span className="text-xs text-[var(--ds-text-muted)]">Versions:</span>
              {allVersions.map(ver => (
                <button
                  key={ver.id}
                  className={`px-2 py-1 rounded text-xs font-bold border transition-colors duration-200 ${
                    selectedVersion.id === ver.id
                      ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-border)] text-accent"
                      : "bg-[var(--ds-surface-2)] border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)]"
                  }`}
                  onClick={() => handleVersionSwitch(ver)}
                >
                  v{ver.version}
                </button>
              ))}
            </div>
          )}
          {/* Actions */}
<div className="flex flex-wrap gap-2 px-6 py-3 border-b border-[var(--ds-border-subtle)]">
  <button
    className="flex items-center gap-1 px-3 py-1 rounded bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-fill-hover)] text-accent text-xs font-bold"
    onClick={handleCopy}
    disabled={loading}
  >
    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    Copy
  </button>
  <button
    className="flex items-center gap-1 px-3 py-1 rounded bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-fill-hover)] text-accent text-xs font-bold"
    onClick={handleDownload}
    disabled={loading}
  >
    <Download className="h-4 w-4" />
    Download
  </button>
  <button
    className="flex items-center gap-1 px-3 py-1 rounded bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-warning)_18%,transparent)] text-[var(--ds-warning)] text-xs font-bold"
    onClick={handleShare}
    disabled={loading}
  >
    <Share2 className="h-4 w-4" />
    {shareCopied ? "Copied!" : "Share"}
  </button>
  {!readOnly && (
    <>
      <button
        className="flex items-center gap-1 px-3 py-1 rounded bg-[var(--ds-surface-2)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] text-xs font-bold"
        onClick={handleEdit}
        disabled={editMode || loading}
      >
        <Edit className="h-4 w-4" />
        Edit
      </button>
      <button
        className="flex items-center gap-1 px-3 py-1 rounded bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_18%,transparent)] text-[var(--ds-danger)] text-xs font-bold"
        onClick={handleDelete}
        disabled={deleteLoading || loading}
      >
        {deleteLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Delete
      </button>
    </>
  )}
</div>
{(actionError || actionSuccess) && (
  <div className={`px-6 py-2 text-xs ${actionError ? "text-[var(--ds-danger)]" : "text-[var(--ds-success)]"}`}>
    {actionError || actionSuccess}
  </div>
)}
          {/* Code */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--ds-bg-workspace)]">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-[var(--ds-text-muted)]">
                <Loader className="h-6 w-6 animate-spin mr-2" />
                Loading script...
              </div>
            ) : error ? (
              <div className="text-[var(--ds-danger)] text-center">{error}</div>
            ) : editMode ? (
              <div>
                <textarea
                  className="w-full rounded bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)] px-3 py-2 text-[var(--ds-text)] font-mono text-sm"
                  rows={12}
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  disabled={editSaving}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    className="flex items-center gap-1 px-4 py-2 rounded bg-accent text-accent-foreground font-bold hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
                    onClick={handleEditSave}
                    disabled={editSaving}
                  >
                    {editSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                  <button
                    className="flex items-center gap-1 px-4 py-2 rounded bg-[var(--ds-surface-2)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)]"
                    onClick={() => setEditMode(false)}
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <SyntaxHighlighter
                language="lua"
                style={atomOneDark}
                customStyle={{ fontSize: "1rem", borderRadius: 6, minHeight: 200 }}
                wrapLongLines={true}
              >
                {selectedVersion.code}
              </SyntaxHighlighter>
            )}
          </div>
          {/* AI Actions */}
          {!editMode && !loading && !error && (
            <div className="flex flex-wrap gap-2 px-6 py-3 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]">
              <button
                className="flex items-center gap-1 px-3 py-1 rounded bg-[color-mix(in_srgb,var(--ds-plan)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-plan)_18%,transparent)] text-[var(--ds-plan)] text-xs font-bold"
                onClick={() => handleAI("improve")}
                disabled={aiLoading}
              >
                <Wand2 className="h-4 w-4" />
                Improve
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1 rounded bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-info)_18%,transparent)] text-[var(--ds-info)] text-xs font-bold"
                onClick={() => handleAI("explain")}
                disabled={aiLoading}
              >
                <Info className="h-4 w-4" />
                Explain
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1 rounded bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-warning)_18%,transparent)] text-[var(--ds-warning)] text-xs font-bold"
                onClick={() => handleAI("lint")}
                disabled={aiLoading}
              >
                <ListChecks className="h-4 w-4" />
                Lint
              </button>
              {aiLoading && (
                <span className="flex items-center gap-1 text-xs text-[var(--ds-text-muted)] ml-2">
                  <Loader className="h-4 w-4 animate-spin" /> Running...
                </span>
              )}
            </div>
          )}
          {/* AI Result */}
          {aiResult && (
            <div className="px-6 py-3 bg-[var(--ds-bg-workspace)] border-t border-[var(--ds-border-subtle)] text-sm text-[var(--ds-text-secondary)] whitespace-pre-line">
              <b className="block mb-1 capitalize">{aiType} result:</b>
              {aiResult}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
