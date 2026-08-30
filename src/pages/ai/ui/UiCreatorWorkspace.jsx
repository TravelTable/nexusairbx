import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hotkeysCoreFeature, selectionFeature, syncDataLoaderFeature } from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code,
  History,
  ImagePlus,
  Layers,
  Menu,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Square,
  UploadCloud,
  X,
} from "lib/icons";
import { Button } from "../../../components/ui";
import ChatComposer from "../../../components/ai/chat/ChatComposer";
import { Tree, TreeItem, TreeItemLabel } from "../../../components/ui/tree";
import RobloxUiPreview from "./RobloxUiPreview";
import { indexUiNodes, UI_DEVICE_PRESETS } from "../../../lib/robloxUiPreview";
import {
  acceptUiDraft,
  compileUiDesign,
  createUiCheckpoint,
  createUiDesign,
  discardUiDraft,
  generateUiDraft,
  getUiDesign,
  listUiCheckpoints,
  listUiDesigns,
  patchUiDesign,
  restoreUiCheckpoint,
  saveUiHooks,
} from "../../../lib/uiDesignApi";
import {
  ASSET_PLATFORM_WRITES_ENABLED,
  createAssetOperationKey,
  generateAsset,
  getAssetFileBlob,
} from "../../../lib/assetPlatformApi";
import { getStudioCommand, queueStudioTool } from "../../../lib/studioBridgeApi";
import "./UiCreatorWorkspace.css";

const NODE_TYPES = ["Frame", "TextLabel", "TextButton", "ImageLabel", "ImageButton", "TextBox", "ScrollingFrame"];
const ACTION_TYPES = ["setState", "setVisible", "toggleVisible", "selectTab", "openModal", "closeModal", "setText", "emitHook"];
const TARGET_ACTIONS = new Set(["setVisible", "toggleVisible", "selectTab", "openModal", "closeModal", "setText"]);
const UI_CREATOR_LEFT_WIDTH_KEY = "nexusrbx:ui-creator-left-width";
const UI_CREATOR_RIGHT_WIDTH_KEY = "nexusrbx:ui-creator-right-width";
const UI_CREATOR_PANEL_MIN = 232;
const UI_CREATOR_PANEL_MAX = 420;
const UI_CREATOR_LEFT_DEFAULT = 280;
const UI_CREATOR_RIGHT_DEFAULT = 320;
const UI_CREATOR_COMPACT_QUERY = "(max-width: 900px)";

function clampPanelWidth(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(UI_CREATOR_PANEL_MAX, Math.max(UI_CREATOR_PANEL_MIN, Math.round(numeric)));
}

function readPanelWidth(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored == null || stored === "" ? fallback : clampPanelWidth(stored, fallback);
  } catch {
    return fallback;
  }
}

function readCompactViewport() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(UI_CREATOR_COMPACT_QUERY).matches;
}

function moveTabFocus(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)'));
  const currentIndex = tabs.indexOf(event.target.closest('[role="tab"]'));
  if (currentIndex < 0 || !tabs.length) return;
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  event.preventDefault();
  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}

function cleanIdentifier(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

function createNode(className, parentId, index) {
  const id = `${className.toLowerCase()}_${Date.now().toString(36)}`;
  return {
    id,
    name: `${className}${index + 1}`,
    className,
    parentId,
    order: index,
    props: {
      position: { x: { scale: parentId ? 0 : 0.5, offset: 0 }, y: { scale: parentId ? 0 : 0.5, offset: 0 } },
      size: { x: { scale: 0, offset: className.startsWith("Text") ? 180 : 240 }, y: { scale: 0, offset: className.includes("Button") ? 48 : 100 } },
      anchorPoint: { x: parentId ? 0 : 0.5, y: parentId ? 0 : 0.5 },
      backgroundColor: className.startsWith("Image") ? "#302931" : "#241f25",
      text: className.startsWith("Text") ? className.replace(/([A-Z])/g, " $1").trim() : "",
      textColor: "#f4eef4",
      textSize: 18,
      visible: true,
    },
    style: { cornerRadius: 4 },
    interactions: {},
    accessibilityLabel: className,
  };
}

function responseAsset(response) {
  return response?.asset || response?.assets?.[0] || response?.data?.asset || response?.data?.assets?.[0] || null;
}

function CommitField({ label, value, type = "text", onCommit, min, max, step, disabled = false }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  return (
    <label className="ui-inspector-field">
      <span>{label}</span>
      <input
        type={type}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = type === "number" ? Number(draft) : draft;
          if (!disabled && String(next) !== String(value)) onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </label>
  );
}

const UI_TREE_ROOT = "__nexus_ui_root__";

function LayerTree({ index, selectedId, onSelect, onMove, disabled = false }) {
  const treeData = useMemo(() => {
    const items = {
      [UI_TREE_ROOT]: {
        id: UI_TREE_ROOT,
        name: "UI",
        children: (index.children.get("__root__") || []).map((node) => node.id),
      },
    };
    const reorder = new Map();
    const folders = [UI_TREE_ROOT];

    index.byId.forEach((node) => {
      const siblings = index.children.get(node.parentId || "__root__") || [];
      const children = (index.children.get(node.id) || []).map((child) => child.id);
      items[node.id] = { id: node.id, name: node.name, className: node.className, node, children };
      reorder.set(node.id, { siblings, nodeIndex: siblings.findIndex((sibling) => sibling.id === node.id) });
      if (children.length) folders.push(node.id);
    });

    return { items, reorder, folders };
  }, [index]);
  const folderKey = treeData.folders.join("|");
  const [expandedItems, setExpandedItems] = useState(treeData.folders);

  useEffect(() => {
    setExpandedItems(treeData.folders);
  }, [folderKey, treeData.folders]);

  const selectedItems = useMemo(() => (selectedId ? [selectedId] : []), [selectedId]);
  const setSelectedItems = useCallback((nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(selectedItems) : nextValue;
    const nextId = Array.isArray(next) ? next[next.length - 1] : null;
    if (nextId && nextId !== UI_TREE_ROOT) onSelect(nextId);
  }, [onSelect, selectedItems]);

  const tree = useTree({
    rootItemId: UI_TREE_ROOT,
    state: { expandedItems, selectedItems },
    setExpandedItems,
    setSelectedItems,
    getItemName: (item) => item.getItemData()?.name || "Layer",
    isItemFolder: (item) => Boolean(item.getItemData()?.children?.length),
    dataLoader: {
      getItem: (itemId) => treeData.items[itemId],
      getChildren: (itemId) => treeData.items[itemId]?.children || [],
    },
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });

  return (
    <Tree className="ui-layer-tree" indent={0} tree={tree}>
      {tree.getItems().map((item) => {
        const data = item.getItemData();
        const meta = treeData.reorder.get(item.getId());
        if (!data?.node || !meta) return null;
        const { node } = data;
        const { siblings, nodeIndex } = meta;

        return (
          <TreeItem item={item} asChild key={item.getId()}>
            <div className="ui-layer-tree__row" data-active={selectedId === node.id ? "true" : "false"}>
              <TreeItemLabel asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ui-layer-tree__select"
                  title={node.name}
                  disabled={disabled}
                  onClick={() => onSelect(node.id)}
                >
                  <span className="ui-layer-tree__check" aria-hidden="true" />
                  <span className="ui-layer-tree__name">{node.name}</span>
                  <small>{node.className}</small>
                </Button>
              </TreeItemLabel>
              <div className="ui-layer-tree__move" aria-label={`Reorder ${node.name}`}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={ChevronUp}
                  aria-label={`Move ${node.name} up`}
                  disabled={disabled || nodeIndex === 0}
                  onClick={(event) => { event.stopPropagation(); onMove(node, siblings[nodeIndex - 1]); }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={ChevronDown}
                  aria-label={`Move ${node.name} down`}
                  disabled={disabled || nodeIndex === siblings.length - 1}
                  onClick={(event) => { event.stopPropagation(); onMove(node, siblings[nodeIndex + 1]); }}
                />
              </div>
            </div>
          </TreeItem>
        );
      })}
    </Tree>
  );
}

async function waitForStudioCommand(commandId, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const command = await getStudioCommand(commandId);
    if (["succeeded", "failed"].includes(command.status)) return command;
    if (["awaiting_approval", "pending_approval"].includes(command.status)) return command;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: "queued", commandId };
}

export default function UiCreatorWorkspace({
  user,
  projectId,
  projectTitle,
  modelVersion,
  studio,
  studioSessionId,
  isStarterOrAbove,
  onRequireStarter,
  onRequireAuth,
  onBillingRefresh,
  notify,
  navigateTo,
}) {
  const [designs, setDesigns] = useState([]);
  const [design, setDesign] = useState(null);
  const [document, setDocument] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [leftView, setLeftView] = useState("layers");
  const [rightView, setRightView] = useState("properties");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(() => readPanelWidth(UI_CREATOR_LEFT_WIDTH_KEY, UI_CREATOR_LEFT_DEFAULT));
  const [rightWidth, setRightWidth] = useState(() => readPanelWidth(UI_CREATOR_RIGHT_WIDTH_KEY, UI_CREATOR_RIGHT_DEFAULT));
  const [compactViewport, setCompactViewport] = useState(readCompactViewport);
  const [mode, setMode] = useState("design");
  const [deviceId, setDeviceId] = useState("desktop");
  const [prompt, setPrompt] = useState("");
  const [composerMode, setComposerMode] = useState("agent");
  const [lastPrompt, setLastPrompt] = useState("");
  const [draft, setDraft] = useState(null);
  const [compiled, setCompiled] = useState(null);
  const [hooksSource, setHooksSource] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [interactionDraft, setInteractionDraft] = useState({ trigger: "Activated", type: "toggleVisible", targetId: "", hook: "", key: "", value: "" });
  const [assetPrompt, setAssetPrompt] = useState("");
  const [assetPreviewUrls, setAssetPreviewUrls] = useState({});
  const [newNodeType, setNewNodeType] = useState("Frame");
  const [lastStudioTreeHash, setLastStudioTreeHash] = useState("");
  const [studioTreeConflict, setStudioTreeConflict] = useState(false);
  const [studioReceipt, setStudioReceipt] = useState(null);
  const initialLoadKeyRef = useRef("");
  const documentRef = useRef(null);
  const mutationQueueRef = useRef(Promise.resolve());
  const pendingMutationCountRef = useRef(0);
  const bodyRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const leftReopenRef = useRef(null);
  const rightReopenRef = useRef(null);
  const panelReturnFocusRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const device = UI_DEVICE_PRESETS[deviceId];
  const index = useMemo(() => indexUiNodes(document), [document]);
  const selectedNode = selectedId ? index.byId.get(selectedId) || null : null;
  const visibleDocument = draft?.document || document;
  const privatePreviewAssetKey = (visibleDocument?.assets || [])
    .filter((asset) => asset.canonicalAssetId && !asset.previewUrl)
    .map((asset) => asset.canonicalAssetId)
    .sort()
    .join("|");
  const previewDocument = useMemo(() => {
    if (!visibleDocument) return null;
    return {
      ...visibleDocument,
      assets: (visibleDocument.assets || []).map((asset) => ({
        ...asset,
        previewUrl: asset.previewUrl || assetPreviewUrls[asset.canonicalAssetId] || "",
      })),
    };
  }, [assetPreviewUrls, visibleDocument]);

  useEffect(() => {
    const assetIds = privatePreviewAssetKey ? privatePreviewAssetKey.split("|") : [];
    const controller = new AbortController();
    const objectUrls = [];
    let active = true;

    setAssetPreviewUrls({});
    if (!assetIds.length || typeof URL.createObjectURL !== "function") {
      return () => controller.abort();
    }

    Promise.all(assetIds.map(async (assetId) => {
      try {
        const blob = await getAssetFileBlob(assetId, "preview", {
          signal: controller.signal,
          projectId: projectId || "",
        });
        const previewUrl = URL.createObjectURL(blob);
        objectUrls.push(previewUrl);
        return [assetId, previewUrl];
      } catch (reason) {
        if (reason?.name !== "AbortError") console.warn("UI asset preview could not be loaded", reason);
        return null;
      }
    })).then((entries) => {
      if (active) setAssetPreviewUrls(Object.fromEntries(entries.filter(Boolean)));
    });

    return () => {
      active = false;
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [privatePreviewAssetKey, projectId]);

  const showError = useCallback((reason, fallback) => {
    const message = reason?.message || fallback;
    setError(message);
    notify?.({ message, type: "error" });
  }, [notify]);

  const openDesign = useCallback(async (designId) => {
    setBusy("loading");
    setError("");
    try {
      const response = await getUiDesign(designId);
      setDesign(response.design);
      documentRef.current = response.design.document;
      setDocument(response.design.document);
      setHooksSource(response.design.hooksSource || "");
      setDraft(null);
      setCompiled(null);
      setSelectedId(null);
      setUndoStack([]);
      setRedoStack([]);
      setStudioTreeConflict(false);
      setStudioReceipt(null);
      try {
        setLastStudioTreeHash(window.localStorage.getItem(`nexusrbx:ui-tree-hash:${designId}`) || "");
      } catch {
        setLastStudioTreeHash("");
      }
    } catch (reason) {
      showError(reason, "Could not load the UI design.");
    } finally {
      setBusy("");
    }
  }, [showError]);

  const refreshDesignList = useCallback(async () => {
    if (!user || !isStarterOrAbove) return;
    setBusy("loading");
    try {
      const response = await listUiDesigns(projectId);
      let items = response.designs || [];
      if (!items.length) {
        const created = await createUiDesign({ projectId: projectId || null, title: `${projectTitle || "Game"} UI` });
        items = [{
          designId: created.design.designId,
          title: created.design.title,
          revision: created.design.revision,
          updatedAt: created.design.updatedAt,
        }];
      }
      setDesigns(items);
      await openDesign(items[0].designId);
    } catch (reason) {
      showError(reason, "Could not open UI Creator.");
      initialLoadKeyRef.current = "";
      setBusy("");
    }
  }, [isStarterOrAbove, openDesign, projectId, projectTitle, showError, user]);

  useEffect(() => {
    if (!user) return;
    if (!isStarterOrAbove) return;
    const loadKey = `${user.uid || user.email || "user"}:${projectId || "unassigned"}`;
    if (initialLoadKeyRef.current === loadKey) return;
    initialLoadKeyRef.current = loadKey;
    refreshDesignList();
  }, [isStarterOrAbove, projectId, refreshDesignList, user]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mobileQuery = window.matchMedia(UI_CREATOR_COMPACT_QUERY);
    const updateViewport = (event) => {
      setCompactViewport(event.matches);
      if (event.matches) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    updateViewport(mobileQuery);
    mobileQuery.addEventListener?.("change", updateViewport);
    return () => mobileQuery.removeEventListener?.("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!compactViewport || (!leftOpen && !rightOpen)) return undefined;
    const panel = leftOpen ? leftPanelRef.current : rightPanelRef.current;
    panel?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const returnRef = leftOpen ? leftReopenRef : rightReopenRef;
        if (leftOpen) setLeftOpen(false);
        if (rightOpen) setRightOpen(false);
        window.setTimeout(() => (returnRef.current || panelReturnFocusRef.current)?.focus?.(), 0);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && window.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [compactViewport, leftOpen, rightOpen]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const savePanelWidth = useCallback((key, value) => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Layout persistence is optional; editing must continue when storage is unavailable.
    }
  }, []);

  const setPanelWidth = useCallback((side, value, persist = false) => {
    const fallback = side === "left" ? UI_CREATOR_LEFT_DEFAULT : UI_CREATOR_RIGHT_DEFAULT;
    const next = clampPanelWidth(value, fallback);
    if (side === "left") setLeftWidth(next);
    else setRightWidth(next);
    if (persist) savePanelWidth(side === "left" ? UI_CREATOR_LEFT_WIDTH_KEY : UI_CREATOR_RIGHT_WIDTH_KEY, next);
    window.dispatchEvent(new Event("resize"));
  }, [savePanelWidth]);

  const beginPanelResize = useCallback((side, event) => {
    if (compactViewport || event.button !== 0) return;
    event.preventDefault();
    resizeCleanupRef.current?.();
    const handleMove = (moveEvent) => {
      const bounds = bodyRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const value = side === "left" ? moveEvent.clientX - bounds.left : bounds.right - moveEvent.clientX;
      setPanelWidth(side, value);
    };
    const finish = (upEvent) => {
      const bounds = bodyRef.current?.getBoundingClientRect();
      if (bounds) {
        const value = side === "left" ? upEvent.clientX - bounds.left : bounds.right - upEvent.clientX;
        setPanelWidth(side, value, true);
      }
      resizeCleanupRef.current?.();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.document.body.style.cursor = "";
      window.document.body.style.userSelect = "";
      resizeCleanupRef.current = null;
    };
    resizeCleanupRef.current = cleanup;
    window.document.body.style.cursor = "col-resize";
    window.document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }, [compactViewport, setPanelWidth]);

  const resizePanelWithKeyboard = useCallback((side, event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = side === "left" ? leftWidth : rightWidth;
    let next = current;
    if (event.key === "Home") next = UI_CREATOR_PANEL_MIN;
    else if (event.key === "End") next = UI_CREATOR_PANEL_MAX;
    else {
      const visualDirection = side === "left" ? 1 : -1;
      next += (event.key === "ArrowRight" ? 16 : -16) * visualDirection;
    }
    setPanelWidth(side, next, true);
  }, [leftWidth, rightWidth, setPanelWidth]);

  const openPanel = useCallback((side, trigger) => {
    panelReturnFocusRef.current = trigger || null;
    if (side === "left") {
      setRightOpen(compactViewport ? false : rightOpen);
      setLeftOpen(true);
    } else {
      setLeftOpen(compactViewport ? false : leftOpen);
      setRightOpen(true);
    }
  }, [compactViewport, leftOpen, rightOpen]);

  const closePanel = useCallback((side) => {
    if (side === "left") setLeftOpen(false);
    else setRightOpen(false);
    if (compactViewport) {
      const returnRef = side === "left" ? leftReopenRef : rightReopenRef;
      window.setTimeout(() => (returnRef.current || panelReturnFocusRef.current)?.focus?.(), 0);
    }
  }, [compactViewport]);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const mutate = useCallback((operations, { recordHistory = true } = {}) => {
    if (!documentRef.current) return Promise.resolve(null);
    pendingMutationCountRef.current += 1;
    setBusy((current) => current || "saving");
    setError("");

    const run = async () => {
      const currentDocument = documentRef.current;
      if (!currentDocument) return null;
      const previous = currentDocument;
      try {
        const response = await patchUiDesign(
          currentDocument.designId,
          currentDocument.revision,
          operations,
        );
        if (recordHistory) {
          setUndoStack((items) => [...items.slice(-39), previous]);
          setRedoStack([]);
        }
        documentRef.current = response.document;
        setDocument(response.document);
        setDesign((current) => current ? { ...current, document: response.document, revision: response.document.revision } : current);
        setCompiled(null);
        return response.document;
      } catch (reason) {
        if (reason.code === "UI_REVISION_CONFLICT") await openDesign(currentDocument.designId);
        showError(reason, "The UI edit could not be saved.");
        return null;
      }
    };

    const queued = mutationQueueRef.current.then(run, run);
    mutationQueueRef.current = queued.catch(() => null);
    return queued.finally(() => {
      pendingMutationCountRef.current = Math.max(0, pendingMutationCountRef.current - 1);
      if (pendingMutationCountRef.current === 0) {
        setBusy((current) => current === "saving" ? "" : current);
      }
    });
  }, [openDesign, showError]);

  const undo = useCallback(async () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous || !document) return;
    const current = document;
    const restored = await mutate([{ type: "replaceDocument", document: previous }], { recordHistory: false });
    if (restored) {
      setUndoStack((items) => items.slice(0, -1));
      setRedoStack((items) => [...items, current]);
    }
  }, [document, mutate, undoStack]);

  const redo = useCallback(async () => {
    const next = redoStack[redoStack.length - 1];
    if (!next || !document) return;
    const current = document;
    const restored = await mutate([{ type: "replaceDocument", document: next }], { recordHistory: false });
    if (restored) {
      setRedoStack((items) => items.slice(0, -1));
      setUndoStack((items) => [...items, current]);
    }
  }, [document, mutate, redoStack]);

  const generate = useCallback(async (requestedPrompt) => {
    if (!document || busy) return;
    const cleanPrompt = String(requestedPrompt || "").trim();
    if (!cleanPrompt) return;
    setBusy("generating");
    setError("");
    setLastPrompt(cleanPrompt);
    try {
      const response = await generateUiDraft(document.designId, {
        workspace: "ui_creator",
        designId: document.designId,
        baseRevision: document.revision,
        uiIntent: document.screens?.[0]?.nodes?.length ? "edit" : "create",
        prompt: cleanPrompt,
        model: modelVersion,
      });
      setDraft(response.draft);
      if (Array.isArray(response.messages)) {
        setDesign((current) => current ? { ...current, messages: response.messages } : current);
      }
      setPrompt("");
      setMode("design");
      onBillingRefresh?.();
    } catch (reason) {
      showError(reason, "The UI revision could not be generated.");
    } finally {
      setBusy("");
    }
  }, [busy, document, modelVersion, onBillingRefresh, showError]);

  const acceptDraft = useCallback(async () => {
    if (!draft || !document) return;
    setBusy("accepting");
    try {
      const response = await acceptUiDraft(document.designId, draft.draftId);
      setUndoStack((items) => [...items.slice(-39), document]);
      setRedoStack([]);
      documentRef.current = response.document;
      setDocument(response.document);
      setDesign((current) => current ? { ...current, document: response.document, revision: response.document.revision } : current);
      setDraft(null);
      setSelectedId(null);
      setCompiled(null);
      notify?.({ message: "AI revision accepted", type: "success" });
    } catch (reason) {
      showError(reason, "The draft could not be accepted.");
    } finally {
      setBusy("");
    }
  }, [document, draft, notify, showError]);

  const discardDraft = useCallback(async ({ regenerate = false } = {}) => {
    if (!draft || !document || busy) return;
    const pendingDraftId = draft.draftId;
    setBusy("discarding-draft");
    try {
      await discardUiDraft(document.designId, pendingDraftId);
      setDraft(null);
      if (regenerate) {
        setBusy("");
        await generate(lastPrompt);
      }
    } catch (reason) {
      showError(reason, "The AI draft could not be discarded.");
    } finally {
      setBusy("");
    }
  }, [busy, document, draft, generate, lastPrompt, showError]);

  const compile = useCallback(async () => {
    if (!document) return null;
    setBusy("compiling");
    try {
      const response = await compileUiDesign(document.designId, { expectedRevision: document.revision });
      if (response.document) {
        documentRef.current = response.document;
        setDocument(response.document);
        setDesign((current) => current ? { ...current, document: response.document, revision: response.document.revision } : current);
      }
      setCompiled(response);
      setHooksSource((current) => current || response.compiled.hooksLua || "");
      return response;
    } catch (reason) {
      showError(reason, "The UI could not be compiled.");
      return null;
    } finally {
      setBusy("");
    }
  }, [document, showError]);

  useEffect(() => {
    if (mode === "code" && document && !compiled && !busy) compile();
  }, [busy, compile, compiled, document, mode]);

  const saveHooks = useCallback(async () => {
    if (!document) return;
    setBusy("saving-hooks");
    try {
      await saveUiHooks(document.designId, document.revision, hooksSource);
      notify?.({ message: "Hooks.client.lua saved", type: "success" });
    } catch (reason) {
      showError(reason, "The hooks file could not be saved.");
    } finally {
      setBusy("");
    }
  }, [document, hooksSource, notify, showError]);

  const applyToStudio = useCallback(async (replaceModifiedRoot = false) => {
    if (!studio?.connected || !studioSessionId) {
      showError(null, "Connect Roblox Studio before applying this UI.");
      return;
    }
    setBusy("applying");
    try {
      const response = await compileUiDesign(document.designId, {
        forStudio: true,
        expectedRevision: document.revision,
        expectedTreeHash: lastStudioTreeHash || null,
        replaceModifiedRoot: replaceModifiedRoot === true,
      });
      const compiledDocument = response.document || document;
      if (response.document) {
        documentRef.current = response.document;
        setDocument(response.document);
        setDesign((current) => current ? { ...current, document: response.document, revision: response.document.revision } : current);
      }
      if (!response.studioReady) throw new Error("Publish, replace, or remove every unresolved required image before applying to Studio.");
      await createUiCheckpoint(document.designId, {
        expectedRevision: compiledDocument.revision,
        reason: "before_studio_apply",
      });
      const queued = await queueStudioTool({
        type: "apply_artifact",
        payload: response.compiled,
        sessionId: studioSessionId,
        label: `Apply ${compiledDocument.title}`,
        applyMode: studio.applyMode || "manual_review",
      });
      const command = await waitForStudioCommand(queued.commandId);
      if (command.status === "failed") {
        const commandError = command.error || command.result?.error || "Studio rejected the UI apply.";
        const commandCode = typeof commandError === "object" ? commandError.code : "";
        const commandMessage = typeof commandError === "object"
          ? (commandError.message || commandError.code || "Studio rejected the UI apply.")
          : String(commandError);
        if (/ui_tree_(?:conflict|precondition_required)/i.test(`${commandCode} ${commandMessage}`)) setStudioTreeConflict(true);
        throw new Error(commandMessage);
      }
      if (["awaiting_approval", "pending_approval"].includes(command.status)) {
        notify?.({ message: "UI is ready for Studio approval.", type: "info" });
      } else if (command.status === "succeeded") {
        const receiptResult = command.result?.result || command.result || {};
        const rootReceipt = receiptResult.uiRoots?.[0] || null;
        const snapshot = receiptResult.snapshots?.[0] || null;
        const nextTreeHash = rootReceipt?.treeHash || "";
        if (nextTreeHash) {
          setLastStudioTreeHash(nextTreeHash);
          try {
            window.localStorage.setItem(`nexusrbx:ui-tree-hash:${document.designId}`, nextTreeHash);
          } catch {
            // Optimistic Studio concurrency remains available for this browser session.
          }
        }
        setStudioReceipt({
          nodeCount: Number(rootReceipt?.nodeCount || 0),
          treeHash: nextTreeHash,
          snapshotId: typeof snapshot === "string" ? snapshot : snapshot?.id || "",
        });
        setStudioTreeConflict(false);
        notify?.({ message: "Editable UI applied and verified in Studio.", type: "success" });
      } else {
        notify?.({ message: "UI apply queued for Studio.", type: "info" });
      }
    } catch (reason) {
      showError(reason, "The UI could not be applied to Studio.");
    } finally {
      setBusy("");
    }
  }, [document, lastStudioTreeHash, notify, showError, studio, studioSessionId]);

  const addNode = useCallback((className) => {
    if (!document) return;
    const parent = selectedNode && ["Frame", "ScrollingFrame"].includes(selectedNode.className) ? selectedNode.id : null;
    const node = createNode(className, parent, document.screens[0].nodes.length);
    mutate([{ type: "createNode", node }]).then((next) => next && setSelectedId(node.id));
  }, [document, mutate, selectedNode]);

  const moveLayer = useCallback((node, sibling) => {
    if (!node || !sibling || draft) return;
    mutate([
      { type: "moveNode", nodeId: node.id, parentId: node.parentId || null, order: sibling.order },
      { type: "moveNode", nodeId: sibling.id, parentId: sibling.parentId || null, order: node.order },
    ]);
  }, [draft, mutate]);

  const updateSelected = useCallback((patch) => {
    if (selectedNode && !draft) mutate([{ type: "updateNode", nodeId: selectedNode.id, patch }]);
  }, [draft, mutate, selectedNode]);

  const generateIcon = useCallback(async () => {
    if (!document || !assetPrompt.trim()) return;
    setBusy("asset");
    try {
      const palette = Object.values(document.tokens?.colors || {}).slice(0, 6).join(", ");
      const response = await generateAsset({
        idempotencyKey: createAssetOperationKey(),
        projectId: projectId || undefined,
        prompt: `${assetPrompt.trim()}. Transparent background, Roblox UI icon, readable at small size. Palette: ${palette}.`,
        assetType: "icon",
        style: { transparentBackground: true, candidateCount: 1 },
      });
      const asset = responseAsset(response);
      if (!asset?.assetId) throw new Error("The icon was generated but its Nexus asset record was unavailable.");
      const refId = `asset_${asset.assetId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
      setBusy("");
      await mutate([{
        type: "upsertAsset",
        asset: {
          refId,
          canonicalAssetId: asset.assetId,
          name: asset.name || assetPrompt.trim(),
          kind: "icon",
          required: true,
          previewUrl: asset.previewUrl,
          robloxAssetId: asset.robloxAssetId || null,
          status: asset.robloxAssetId ? "ready" : "generated",
        },
      }]);
      setAssetPrompt("");
      onBillingRefresh?.();
      notify?.({ message: "One transparent icon was generated and attached to this design.", type: "success" });
    } catch (reason) {
      showError(reason, "The icon could not be generated.");
    } finally {
      setBusy("");
    }
  }, [assetPrompt, document, mutate, notify, onBillingRefresh, projectId, showError]);

  const loadHistory = useCallback(async () => {
    if (!document) return;
    try {
      const response = await listUiCheckpoints(document.designId);
      setCheckpoints(response.checkpoints || []);
    } catch (reason) {
      showError(reason, "Revision history could not be loaded.");
    }
  }, [document, showError]);

  const saveCheckpoint = useCallback(async () => {
    if (!document || busy) return;
    setBusy("checkpointing");
    try {
      await createUiCheckpoint(document.designId, { expectedRevision: document.revision, reason: "explicit_save" });
      notify?.({ message: "UI checkpoint saved", type: "success" });
      await loadHistory();
    } catch (reason) {
      showError(reason, "The UI checkpoint could not be saved.");
    } finally {
      setBusy("");
    }
  }, [busy, document, loadHistory, notify, showError]);

  const restoreCheckpoint = useCallback(async (checkpointId) => {
    if (!document || busy) return;
    const previous = document;
    setBusy("restoring");
    try {
      const response = await restoreUiCheckpoint(document.designId, checkpointId, document.revision);
      setUndoStack((items) => [...items.slice(-39), previous]);
      setRedoStack([]);
      documentRef.current = response.document;
      setDocument(response.document);
      setDesign((current) => current ? { ...current, document: response.document, revision: response.document.revision } : current);
      setSelectedId(null);
      setCompiled(null);
      setCheckpoints([]);
      notify?.({ message: "UI checkpoint restored", type: "success" });
    } catch (reason) {
      showError(reason, "The UI checkpoint could not be restored.");
    } finally {
      setBusy("");
    }
  }, [busy, document, notify, showError]);

  if (!user) {
    return <div className="ui-creator-gate"><Sparkles /><h1>Roblox UI Creator</h1><p>Sign in to create persistent UI sessions and publish assets.</p><Button type="button" onClick={onRequireAuth}>Sign in</Button></div>;
  }
  if (!isStarterOrAbove) {
    return <div className="ui-creator-gate"><Sparkles /><h1>Roblox UI Creator</h1><p>Browser preview, AI revisions, and Studio apply are available on Starter and Pro.</p><Button type="button" onClick={onRequireStarter}>View Starter</Button></div>;
  }
  if (!document) {
    return <div className="ui-creator-loading" role="status"><span className="nx-build-signal" data-active="true" />Opening UI Creator…</div>;
  }

  const visibleIndex = indexUiNodes(visibleDocument);
  const visibleSelected = selectedId ? visibleIndex.byId.get(selectedId) || null : null;
  const draftScore = Number(draft?.evaluation?.overall ?? draft?.validation?.quality?.overall);
  const fidelity = compiled?.compiled?.diagnostics?.fidelity || draft?.validation?.fidelity || {
    supported: ["layout", "selection", "text", "images", "declarative actions", "tweens"],
    approximate: ["font metrics", "text wrapping", "safe-area insets"],
    studioOnly: ["custom hooks"],
  };
  const interactionNeedsTarget = TARGET_ACTIONS.has(interactionDraft.type);
  const interactionNeedsValue = ["setState", "setText", "setVisible"].includes(interactionDraft.type);
  const interactionHookName = cleanIdentifier(interactionDraft.hook);
  const canAddInteraction = !draft
    && (!interactionNeedsTarget || Boolean(interactionDraft.targetId))
    && (interactionDraft.type !== "emitHook" || Boolean(interactionHookName))
    && (interactionDraft.type !== "setState" || Boolean(interactionDraft.key.trim()));
  const publishingAssetId = [...(document.assets || [])]
    .reverse()
    .find((asset) => asset.canonicalAssetId && !asset.robloxAssetId)?.canonicalAssetId || "";

  return (
    <section className="ui-creator" aria-label="Roblox UI Creator" aria-busy={Boolean(busy)}>
      <header className="ui-creator__toolbar">
        <div className="ui-creator__design-switcher">
          <div className="ui-creator__design-identity">
            <span>UI design</span>
            <select value={document.designId} onChange={(event) => openDesign(event.target.value)} aria-label="UI design">
              {designs.map((item) => <option key={item.designId} value={item.designId}>{item.title}</option>)}
            </select>
          </div>
          <Button type="button" variant="secondary" size="sm" title="New UI design" aria-label="Create a new UI design" disabled={Boolean(busy)} onClick={async () => {
            setBusy("creating");
            try {
              const created = await createUiDesign({ projectId: projectId || null, title: "Untitled UI" });
              setDesigns((items) => [{ designId: created.design.designId, title: created.design.title }, ...items]);
              await openDesign(created.design.designId);
            } catch (reason) {
              showError(reason, "A new UI design could not be created.");
            } finally {
              setBusy("");
            }
          }} icon={Plus}><span>New</span></Button>
        </div>
        <div className="ui-creator__mode-switch" role="tablist" aria-label="Creator mode" onKeyDown={moveTabFocus}>
          <Button type="button" icon={Square} variant={mode === "design" ? "primary" : "secondary"} size="sm" role="tab" aria-selected={mode === "design"} tabIndex={mode === "design" ? 0 : -1} data-active={mode === "design"} onClick={() => setMode("design")}>Design</Button>
          <Button type="button" icon={Play} variant={mode === "preview" ? "primary" : "secondary"} size="sm" role="tab" aria-selected={mode === "preview"} tabIndex={mode === "preview" ? 0 : -1} data-active={mode === "preview"} onClick={() => setMode("preview")}>Preview</Button>
          <Button type="button" icon={Code} variant={mode === "code" ? "primary" : "secondary"} size="sm" role="tab" aria-selected={mode === "code"} tabIndex={mode === "code" ? 0 : -1} data-active={mode === "code"} onClick={() => setMode("code")}>Code</Button>
        </div>
        <div className="ui-creator__toolbar-actions">
          <Button type="button" variant="secondary" size="sm" icon={RotateCcw} title="Undo" aria-label="Undo UI edit" disabled={!undoStack.length || Boolean(busy)} onClick={undo} />
          <Button type="button" variant="secondary" size="sm" icon={RefreshCw} title="Redo" aria-label="Redo UI edit" disabled={!redoStack.length || Boolean(busy)} onClick={redo} />
          {compactViewport ? (
            <details className="ui-creator__overflow">
              <summary role="button" tabIndex={0} aria-label="More UI Creator actions"><Menu /></summary>
              <div className="ui-creator__overflow-menu">
                <label><span>Preview device</span><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} aria-label="Preview device">{Object.values(UI_DEVICE_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.label} · {preset.width}×{preset.height}</option>)}</select></label>
                <div className="ui-creator__overflow-fidelity"><strong><Check />Preview fidelity</strong><span>Supported: {(fidelity.supported || []).join(", ") || "None"}</span><span>Approximate: {(fidelity.approximate || []).join(", ") || "None"}</span><span>Studio-only: {(fidelity.studioOnly || []).join(", ") || "None"}</span></div>
                <Button type="button" variant="secondary" size="sm" className="ui-creator__apply" disabled={Boolean(busy)} onClick={() => applyToStudio(false)} icon={UploadCloud}>Apply to Studio</Button>
              </div>
            </details>
          ) : (
            <>
              <label className="ui-creator__device"><Monitor aria-hidden="true" /><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} aria-label="Preview device">{Object.values(UI_DEVICE_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.label} · {preset.width}×{preset.height}</option>)}</select></label>
              <details className="ui-creator__fidelity">
                <summary><Check />Fidelity</summary>
                <div className="ui-creator__fidelity-popover">
                  <p><strong>Supported</strong><span>{(fidelity.supported || []).join(", ") || "None"}</span></p>
                  <p><strong>Approximate</strong><span>{(fidelity.approximate || []).join(", ") || "None"}</span></p>
                  <p><strong>Studio-only</strong><span>{(fidelity.studioOnly || []).join(", ") || "None"}</span></p>
                </div>
              </details>
              <Button type="button" variant="secondary" size="sm" className="ui-creator__apply" disabled={Boolean(busy)} onClick={() => applyToStudio(false)} icon={UploadCloud}>Apply to Studio</Button>
            </>
          )}
        </div>
      </header>

      <div
        ref={bodyRef}
        className="ui-creator__body"
        data-left-open={leftOpen}
        data-right-open={rightOpen}
        data-compact={compactViewport}
        style={{ "--ui-left-width": `${leftWidth}px`, "--ui-right-width": `${rightWidth}px` }}
      >
        {compactViewport && (leftOpen || rightOpen) ? <Button type="button" variant="ghost" size="sm" className="ui-creator__panel-backdrop" aria-label="Close editor panel" onClick={() => leftOpen ? closePanel("left") : closePanel("right")} /> : null}
        <aside ref={leftPanelRef} className="ui-creator__left" aria-label="Chat and layers" role={compactViewport ? "dialog" : undefined} aria-modal={compactViewport ? "true" : undefined} aria-hidden={compactViewport && !leftOpen ? "true" : undefined} tabIndex={compactViewport ? -1 : undefined}>
          <div className="ui-creator__panel-header">
            <div><span>Workspace</span><strong>{leftView === "chat" ? "Nexus chat" : "UI hierarchy"}</strong></div>
            <Button type="button" variant="secondary" onClick={() => closePanel("left")} aria-label="Collapse left panel" icon={compactViewport ? X : ChevronLeft} />
          </div>
          <div className="ui-creator__panel-tabs" role="tablist" aria-label="Creator navigation" onKeyDown={moveTabFocus}>
            <Button id="ui-left-tab-chat" type="button" variant={leftView === "chat" ? "primary" : "secondary"} size="sm" role="tab" aria-controls="ui-left-panel-chat" aria-selected={leftView === "chat"} tabIndex={leftView === "chat" ? 0 : -1} data-active={leftView === "chat"} onClick={() => setLeftView("chat")} icon={Sparkles}>Chat</Button>
            <Button id="ui-left-tab-layers" type="button" variant={leftView === "layers" ? "primary" : "secondary"} size="sm" role="tab" aria-controls="ui-left-panel-layers" aria-selected={leftView === "layers"} tabIndex={leftView === "layers" ? 0 : -1} data-active={leftView === "layers"} onClick={() => setLeftView("layers")} icon={Layers}>Layers</Button>
          </div>
          {leftView === "chat" ? (
            <div id="ui-left-panel-chat" className="ui-creator__chat-log" role="tabpanel" aria-labelledby="ui-left-tab-chat">
              {(design?.messages || []).length ? design.messages.map((message) => (
                <article key={message.id} data-role={message.role}>
                  <span>{message.role === "user" ? "You" : "Nexus"}</span>
                  <p>{message.prompt || message.text}</p>
                </article>
              )) : (
                <div className="ui-panel-empty"><Sparkles /><strong>Start with intent</strong><p>Describe the screen, player goal, hierarchy, and visual style.</p></div>
              )}
            </div>
          ) : (
            <div id="ui-left-panel-layers" className="ui-creator__layers" role="tabpanel" aria-labelledby="ui-left-tab-layers">
              <div className="ui-add-row">
                <select aria-label="Component type" value={newNodeType} onChange={(event) => setNewNodeType(event.target.value)}>
                  {NODE_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
                <Button type="button" variant="secondary" size="sm" onClick={() => addNode(newNodeType)} icon={Plus}>Add</Button>
              </div>
              <LayerTree index={visibleIndex} selectedId={selectedId} onSelect={setSelectedId} onMove={moveLayer} disabled={Boolean(draft) || Boolean(busy)} />
            </div>
          )}
          {!compactViewport ? <div className="ui-creator__panel-resizer ui-creator__panel-resizer--left" role="separator" aria-label="Resize Chat and Layers panel" aria-orientation="vertical" aria-valuemin={UI_CREATOR_PANEL_MIN} aria-valuemax={UI_CREATOR_PANEL_MAX} aria-valuenow={leftWidth} tabIndex={0} onPointerDown={(event) => beginPanelResize("left", event)} onKeyDown={(event) => resizePanelWithKeyboard("left", event)} onDoubleClick={() => setPanelWidth("left", UI_CREATOR_LEFT_DEFAULT, true)} /> : null}
        </aside>
        {!leftOpen ? <Button type="button" variant="secondary" size="sm" className="ui-creator__reopen ui-creator__reopen--left" onClick={(event) => openPanel("left", event.currentTarget)} aria-label="Open Chat and Layers" icon={ChevronRight}><span>Chat & Layers</span></Button> : null}

        <main className="ui-creator__stage" role="tabpanel" aria-label={`${mode} workspace`}>
          {mode === "code" ? (
            <div className="ui-code-workspace">
              <section>
                <header><div><span>GENERATED · READ ONLY</span><strong>GeneratedUI.lua</strong></div><Button type="button" size="sm" variant="secondary" onClick={compile} icon={RotateCcw}>Compile</Button></header>
                <pre><code>{compiled?.compiled?.generatedLua || "Compiling deterministic Luau…"}</code></pre>
              </section>
              <section>
                <header><div><span>STUDIO ONLY · EDITABLE</span><strong>Hooks.client.lua</strong></div><Button type="button" size="sm" variant="secondary" onClick={saveHooks} icon={Save}>Save hooks</Button></header>
                <textarea value={hooksSource} onChange={(event) => setHooksSource(event.target.value)} spellCheck="false" aria-label="Editable Hooks.client.lua" />
              </section>
            </div>
          ) : (
            <RobloxUiPreview
              document={previewDocument}
              device={device}
              mode={draft && mode === "design" ? "review" : mode}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNodeChange={(nodeId, patch) => !draft && mutate([{ type: "updateNode", nodeId, patch }])}
            />
          )}
          {draft ? (
            <div className="ui-draft-bar" role="status">
              <div><Sparkles /><span><strong>AI draft</strong> · {draft.document.screens[0].nodes.length} nodes{Number.isFinite(draftScore) ? ` · ${Math.round(draftScore)}/100` : ""}{draft.repairPasses ? ` · ${draft.repairPasses} repair ${draft.repairPasses === 1 ? "pass" : "passes"}` : ""} · review before replacing the current revision</span></div>
              <div>
                 <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => discardDraft({ regenerate: true })}>Try another</Button>
                 <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => discardDraft()}>Revert</Button>
                <Button type="button" variant="primary" size="sm" className="ui-draft-bar__accept" onClick={acceptDraft} icon={Check}>Accept</Button>
              </div>
            </div>
          ) : null}
          <div className="ui-creator__composer-host">
            <ChatComposer
              prompt={prompt}
              setPrompt={setPrompt}
              attachments={[]}
              setAttachments={() => {}}
              onSubmit={(event) => {
                event?.preventDefault?.();
                return generate(prompt);
              }}
              isGenerating={Boolean(busy)}
              placeholder="Tell Nexus what UI to build or change…"
              mode={composerMode}
              onModeChange={setComposerMode}
              showDock={false}
              studioConnectionRequired={false}
              studioConnected={Boolean(studio?.connected)}
              studioConnectionType={studio?.connectionType}
            />
          </div>
        </main>

        {!rightOpen ? <Button type="button" variant="secondary" size="sm" className="ui-creator__reopen ui-creator__reopen--right" onClick={(event) => openPanel("right", event.currentTarget)} aria-label="Open inspector" icon={ChevronLeft}><span>Inspector</span></Button> : null}
        <aside ref={rightPanelRef} className="ui-creator__right" aria-label="Inspector" role={compactViewport ? "dialog" : undefined} aria-modal={compactViewport ? "true" : undefined} aria-hidden={compactViewport && !rightOpen ? "true" : undefined} tabIndex={compactViewport ? -1 : undefined}>
          <div className="ui-creator__panel-header">
            <div><span>Inspector</span><strong>{visibleSelected?.name || "Nothing selected"}</strong></div>
            <Button type="button" variant="secondary" onClick={() => closePanel("right")} aria-label="Collapse inspector" icon={compactViewport ? X : ChevronRight} />
          </div>
          <div className="ui-creator__panel-tabs" role="tablist" aria-label="Inspector sections" onKeyDown={moveTabFocus}>
            <Button id="ui-right-tab-properties" type="button" variant={rightView === "properties" ? "primary" : "secondary"} size="sm" role="tab" aria-controls="ui-right-panel-properties" aria-selected={rightView === "properties"} tabIndex={rightView === "properties" ? 0 : -1} data-active={rightView === "properties"} onClick={() => setRightView("properties")} icon={Settings2}>Properties</Button>
            <Button id="ui-right-tab-interactions" type="button" variant={rightView === "interactions" ? "primary" : "secondary"} size="sm" role="tab" aria-controls="ui-right-panel-interactions" aria-selected={rightView === "interactions"} tabIndex={rightView === "interactions" ? 0 : -1} data-active={rightView === "interactions"} onClick={() => setRightView("interactions")} icon={Play}>Actions</Button>
            <Button id="ui-right-tab-assets" type="button" variant={rightView === "assets" ? "primary" : "secondary"} size="sm" role="tab" aria-controls="ui-right-panel-assets" aria-selected={rightView === "assets"} tabIndex={rightView === "assets" ? 0 : -1} data-active={rightView === "assets"} onClick={() => setRightView("assets")} icon={ImagePlus}>Assets</Button>
          </div>
          {rightView === "properties" ? (
            visibleSelected ? <div id="ui-right-panel-properties" className="ui-inspector-scroll" role="tabpanel" aria-labelledby="ui-right-tab-properties">
              <div className="ui-inspector-heading"><span>{visibleSelected.className}</span><strong>{visibleSelected.name}</strong></div>
              {draft ? <p className="ui-inline-note">Accept or revert this AI draft before making direct property changes.</p> : null}
              <section className="ui-inspector-section"><h3>Content</h3>
                <CommitField disabled={Boolean(draft)} label="Name" value={visibleSelected.name} onCommit={(name) => updateSelected({ name })} />
                {visibleSelected.props.text !== undefined ? <CommitField disabled={Boolean(draft)} label="Text" value={visibleSelected.props.text} onCommit={(text) => updateSelected({ props: { text } })} /> : null}
              </section>
              <section className="ui-inspector-section"><h3>Layout</h3><div className="ui-inspector-grid">
                  <CommitField disabled={Boolean(draft)} label="X offset" type="number" value={visibleSelected.props.position.x.offset} onCommit={(offset) => updateSelected({ props: { position: { x: { offset } } } })} />
                  <CommitField disabled={Boolean(draft)} label="Y offset" type="number" value={visibleSelected.props.position.y.offset} onCommit={(offset) => updateSelected({ props: { position: { y: { offset } } } })} />
                  <CommitField disabled={Boolean(draft)} label="Width" type="number" min="8" value={visibleSelected.props.size.x.offset} onCommit={(offset) => updateSelected({ props: { size: { x: { offset } } } })} />
                  <CommitField disabled={Boolean(draft)} label="Height" type="number" min="8" value={visibleSelected.props.size.y.offset} onCommit={(offset) => updateSelected({ props: { size: { y: { offset } } } })} />
                </div></section>
              <section className="ui-inspector-section"><h3>Appearance</h3>
                <CommitField disabled={Boolean(draft)} label="Background" type="color" value={visibleSelected.props.backgroundColor} onCommit={(backgroundColor) => updateSelected({ props: { backgroundColor } })} />
                {visibleSelected.props.textColor ? <CommitField disabled={Boolean(draft)} label="Text color" type="color" value={visibleSelected.props.textColor} onCommit={(textColor) => updateSelected({ props: { textColor } })} /> : null}
                <CommitField disabled={Boolean(draft)} label="Corner radius" type="number" min="0" max="128" value={visibleSelected.style?.cornerRadius || 0} onCommit={(cornerRadius) => updateSelected({ style: { cornerRadius } })} />
                {visibleSelected.props.assetRef !== undefined ? <label className="ui-inspector-field"><span>Image asset</span><select disabled={Boolean(draft)} value={visibleSelected.props.assetRef || ""} onChange={(event) => updateSelected({ props: { assetRef: event.target.value || null } })}><option value="">None</option>{document.assets.map((asset) => <option key={asset.refId} value={asset.refId}>{asset.name}</option>)}</select></label> : null}
              </section>
              <Button type="button" variant="danger" size="sm" className="ui-danger-action" disabled={Boolean(draft)} onClick={() => mutate([{ type: "deleteNode", nodeId: visibleSelected.id }]).then((next) => next && setSelectedId(null))}>Delete node</Button>
            </div> : <div id="ui-right-panel-properties" className="ui-panel-empty" role="tabpanel" aria-labelledby="ui-right-tab-properties"><Settings2 /><strong>No selection</strong><p>Select an element in the preview or Layers panel.</p></div>
          ) : null}
          {rightView === "interactions" ? (
            visibleSelected ? <div id="ui-right-panel-interactions" className="ui-inspector-scroll" role="tabpanel" aria-labelledby="ui-right-tab-interactions">
              <div className="ui-inspector-heading"><span>DECLARATIVE</span><strong>{visibleSelected.name}</strong></div>
              {draft ? <p className="ui-inline-note">Accept or revert this AI draft before changing actions.</p> : null}
              <section className="ui-inspector-section"><h3>New action</h3>
              <label className="ui-inspector-field"><span>Trigger</span><select disabled={Boolean(draft)} value={interactionDraft.trigger} onChange={(event) => setInteractionDraft((value) => ({ ...value, trigger: event.target.value }))}>{["Activated", "MouseEnter", "MouseLeave", "Focused", "FocusLost"].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="ui-inspector-field"><span>Action</span><select disabled={Boolean(draft)} value={interactionDraft.type} onChange={(event) => setInteractionDraft((value) => ({ ...value, type: event.target.value }))}>{ACTION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
              {interactionDraft.type === "emitHook" ? (
                <label className="ui-inspector-field"><span>Hook name</span><input disabled={Boolean(draft)} value={interactionDraft.hook} onChange={(event) => setInteractionDraft((value) => ({ ...value, hook: event.target.value }))} /></label>
              ) : interactionDraft.type === "setState" ? (
                <label className="ui-inspector-field"><span>State key</span><input disabled={Boolean(draft)} value={interactionDraft.key} onChange={(event) => setInteractionDraft((value) => ({ ...value, key: event.target.value }))} /></label>
              ) : interactionNeedsTarget ? (
                <label className="ui-inspector-field"><span>Target</span><select disabled={Boolean(draft)} value={interactionDraft.targetId} onChange={(event) => setInteractionDraft((value) => ({ ...value, targetId: event.target.value }))}><option value="">Choose node</option>{document.screens[0].nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
              ) : null}
              {interactionNeedsValue ? (
                interactionDraft.type === "setVisible" ? (
                  <label className="ui-inspector-field"><span>Visible</span><select disabled={Boolean(draft)} value={interactionDraft.value || "true"} onChange={(event) => setInteractionDraft((value) => ({ ...value, value: event.target.value }))}><option value="true">True</option><option value="false">False</option></select></label>
                ) : (
                  <label className="ui-inspector-field"><span>{interactionDraft.type === "setText" ? "Text" : "State value"}</span><input disabled={Boolean(draft)} value={interactionDraft.value} onChange={(event) => setInteractionDraft((value) => ({ ...value, value: event.target.value }))} /></label>
                )
              ) : null}
              <Button type="button" variant="primary" size="sm" className="ui-primary-action" disabled={!canAddInteraction || Boolean(busy)} onClick={() => {
                const interactions = { ...visibleSelected.interactions };
                interactions[interactionDraft.trigger] = [...(interactions[interactionDraft.trigger] || []), {
                  id: `action_${Date.now().toString(36)}`,
                  type: interactionDraft.type,
                  targetId: interactionNeedsTarget ? interactionDraft.targetId : null,
                  key: interactionDraft.type === "setState" ? interactionDraft.key.trim() : null,
                  hook: interactionDraft.type === "emitHook" ? interactionHookName : null,
                  value: interactionDraft.type === "setVisible" ? interactionDraft.value !== "false" : interactionNeedsValue ? interactionDraft.value : null,
                }];
                const operations = [{ type: "setInteraction", nodeId: visibleSelected.id, interactions }];
                if (interactionDraft.type === "emitHook") {
                  const existingHook = (document.hooks || []).find((hook) => hook.name === interactionHookName);
                  operations.push({
                    type: "upsertHook",
                    hook: {
                      id: existingHook?.id || `hook_${interactionHookName}`,
                      name: interactionHookName,
                      event: interactionDraft.trigger,
                    },
                  });
                }
                mutate(operations);
              }} icon={Plus}>Add action</Button></section>
              <section className="ui-inspector-section"><h3>Configured actions</h3>{Object.entries(visibleSelected.interactions || {}).flatMap(([trigger, actions]) => actions.map((action, actionIndex) => <div className="ui-action-row" key={action.id}><div><span>{trigger}</span><strong>{action.type}</strong><small>{action.targetId || action.hook || "State"}</small></div><Button type="button" variant="secondary" size="sm" onClick={() => {
                const interactions = { ...visibleSelected.interactions, [trigger]: actions.filter((_, indexValue) => indexValue !== actionIndex) };
                mutate([{ type: "setInteraction", nodeId: visibleSelected.id, interactions }]);
              }} disabled={Boolean(draft) || Boolean(busy)}>Remove</Button></div>))}</section>
            </div> : <div id="ui-right-panel-interactions" className="ui-panel-empty" role="tabpanel" aria-labelledby="ui-right-tab-interactions"><Play /><strong>No selection</strong><p>Select a button or input to author preview-safe behavior.</p></div>
          ) : null}
          {rightView === "assets" ? <div id="ui-right-panel-assets" className="ui-inspector-scroll" role="tabpanel" aria-labelledby="ui-right-tab-assets">
            <div className="ui-inspector-heading"><span>CANONICAL ASSETS</span><strong>Icons</strong></div>
            <section className="ui-inspector-section"><h3>Generate</h3><label className="ui-inspector-field"><span>Icon brief</span><textarea rows="4" value={assetPrompt} onChange={(event) => setAssetPrompt(event.target.value)} placeholder="A crisp gold coin shop icon…" /></label>
            <Button type="button" variant="primary" size="sm" className="ui-primary-action" disabled={!ASSET_PLATFORM_WRITES_ENABLED || !assetPrompt.trim() || Boolean(busy)} onClick={generateIcon} icon={ImagePlus}>Generate one icon</Button></section>
            {!ASSET_PLATFORM_WRITES_ENABLED ? <p className="ui-inline-note">Asset generation is disabled in this environment. You can still attach existing Nexus assets from the Asset workspace.</p> : null}
            <section className="ui-inspector-section"><h3>Attached assets</h3><div className="ui-asset-list">{document.assets.map((asset) => {
              const previewUrl = asset.previewUrl || assetPreviewUrls[asset.canonicalAssetId] || "";
              return <article key={asset.refId}>{previewUrl ? <img src={previewUrl} alt="" /> : <div className="ui-asset-placeholder"><ImagePlus /></div>}<div><strong>{asset.name}</strong><span>{asset.robloxAssetId ? `Roblox ${asset.robloxAssetId}` : "Nexus preview only"}</span></div><i data-ready={asset.status === "ready"}>{asset.status}</i></article>;
            })}</div></section>
            <Button type="button" variant="secondary" size="sm" className="ui-secondary-action" disabled={!publishingAssetId} onClick={() => navigateTo?.(`/assets/${encodeURIComponent(publishingAssetId)}`)} icon={UploadCloud}>Review publishing</Button>
          </div> : null}
          <div className="ui-history-controls">
            <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={saveCheckpoint} icon={Save}>Checkpoint</Button>
            <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={loadHistory} icon={History}>History</Button>
          </div>
          {checkpoints.length ? <div className="ui-checkpoint-list" aria-label="UI revision history">{checkpoints.slice(0, 8).map((checkpoint) => <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} key={checkpoint.checkpointId} onClick={() => restoreCheckpoint(checkpoint.checkpointId)} icon={RotateCcw}><span>{checkpoint.reason.replace(/_/g, " ")}<small>{String(checkpoint.revision || "").slice(0, 8)}</small></span></Button>)}</div> : null}
          {!compactViewport ? <div className="ui-creator__panel-resizer ui-creator__panel-resizer--right" role="separator" aria-label="Resize inspector panel" aria-orientation="vertical" aria-valuemin={UI_CREATOR_PANEL_MIN} aria-valuemax={UI_CREATOR_PANEL_MAX} aria-valuenow={rightWidth} tabIndex={0} onPointerDown={(event) => beginPanelResize("right", event)} onKeyDown={(event) => resizePanelWithKeyboard("right", event)} onDoubleClick={() => setPanelWidth("right", UI_CREATOR_RIGHT_DEFAULT, true)} /> : null}
        </aside>
      </div>
      {error ? <div className="ui-creator__error" role="alert">{error}<Button type="button" variant="ghost" size="sm" onClick={() => setError("")}>Dismiss</Button></div> : null}
      {studioReceipt ? <div className="ui-creator__receipt" role="status"><Check /><div><strong>Studio apply verified</strong><span>{studioReceipt.nodeCount} nodes · tree {studioReceipt.treeHash.slice(0, 8) || "verified"}{studioReceipt.snapshotId ? ` · snapshot ${studioReceipt.snapshotId.slice(0, 8)}` : ""}</span></div><Button type="button" variant="ghost" size="sm" onClick={() => navigateTo?.("/ai?mode=agent")}>Studio activity</Button><Button type="button" variant="ghost" size="sm" aria-label="Dismiss Studio receipt" onClick={() => setStudioReceipt(null)}>×</Button></div> : null}
      {studioTreeConflict ? <div className="ui-creator__studio-conflict" role="alert"><div><strong>Studio has a different managed UI tree.</strong><span>Keep the Studio copy, or explicitly replace it with this Nexus revision.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => { setStudioTreeConflict(false); setError(""); }}>Keep Studio</Button><Button type="button" variant="primary" size="sm" onClick={() => applyToStudio(true)}>Replace Studio</Button></div> : null}
      {busy ? <div className="ui-creator__busy" role="status"><span className="nx-build-signal" data-active="true" />{busy.replace(/-/g, " ")}</div> : null}
    </section>
  );
}
