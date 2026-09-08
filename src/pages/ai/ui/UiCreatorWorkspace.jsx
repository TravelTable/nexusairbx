import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lib/icons";
import { Button } from "../../../components/ui";
import CreationPromptComposer from "../../../components/ai/chat/CreationPromptComposer";
import MessageList from "../../../components/ai/chat/MessageList";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../../../components/ai-elements/conversation";
import {
  AnimatedMotionIcon,
  AnimatedUiIcon,
  AnimatedUploadIcon,
} from "../../../components/ui/AnimatedActionIcon";
import UiPreviewPane from "./UiPreviewPane";
import useUiCreatorRun, { UI_RUN_MESSAGE_METADATA, UI_RUN_STAGE, UI_RUN_STEP } from "./useUiCreatorRun";
import {
  acceptUiDraft,
  compileUiDesign,
  createUiCheckpoint,
  createUiDesign,
  generateUiDraft,
  getUiDesign,
  listUiDesigns,
  saveUiHooks,
} from "../../../lib/uiDesignApi";
import { getUiPreviewManifest, readUiCapture, requestUiCapture } from "../../../lib/uiPreviewApi";
import { getStudioCommand, queueStudioTool } from "../../../lib/studioBridgeApi";
import { readStudioUiReceipt } from "../../../lib/studioUiReceipt";
import { STEP_STATUSES } from "../../../lib/agentSteps";
import "./UiCreatorWorkspace.css";

const UI_CREATOR_LEFT_WIDTH_KEY = "nexusrbx:ui-creator-left-width";
const UI_CREATOR_PANEL_MIN = 232;
const UI_CREATOR_PANEL_MAX = 480;
const UI_CREATOR_LEFT_DEFAULT = 320;
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

function shortRevision(value) {
  return String(value || "").slice(0, 8);
}

function commandStepStatus(status) {
  if (status === "pending_approval") return "awaiting_approval";
  return STEP_STATUSES.includes(status) ? status : "running";
}

async function waitForStudioCommand(commandId, timeoutMs = 45_000, onStatus) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const command = await getStudioCommand(commandId);
    onStatus?.(command);
    if (["succeeded", "failed"].includes(command.status)) return command;
    if (["awaiting_approval", "pending_approval"].includes(command.status)) return command;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: "queued", commandId };
}

/** Persisted design messages are `{ id, role, prompt | text, createdAt, draftId? }`. */
function toChatMessage(message) {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: String(message.prompt || message.text || ""),
    createdAt: message.createdAt || "",
    draftId: message.draftId,
    metadata: UI_RUN_MESSAGE_METADATA,
  };
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
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(() => readPanelWidth(UI_CREATOR_LEFT_WIDTH_KEY, UI_CREATOR_LEFT_DEFAULT));
  const [compactViewport, setCompactViewport] = useState(readCompactViewport);
  const [mode, setMode] = useState("preview");
  const [prompt, setPrompt] = useState("");
  const [composerMode, setComposerMode] = useState("agent");
  const [compiled, setCompiled] = useState(null);
  const compileAttemptRef = useRef(null);
  const [hooksSource, setHooksSource] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [lastStudioTreeHash, setLastStudioTreeHash] = useState("");
  const [studioTreeConflict, setStudioTreeConflict] = useState(false);
  const [pendingStudioCommand, setPendingStudioCommand] = useState(null);
  const [studioReceipt, setStudioReceipt] = useState(null);
  const [previewManifestRecord, setPreviewManifestRecord] = useState(null);
  const [previewManifestNonce, setPreviewManifestNonce] = useState(0);
  const [captureBusy, setCaptureBusy] = useState(false);
  const previewManifestKeyRef = useRef("");
  const initialLoadKeyRef = useRef("");
  const documentRef = useRef(null);
  const bodyRef = useRef(null);
  const leftPanelRef = useRef(null);
  const leftReopenRef = useRef(null);
  const panelReturnFocusRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const awaitingRenderRef = useRef(null);
  const approvalContinuationRef = useRef(null);
  const continueAfterApprovalRef = useRef(null);
  const uiRun = useUiCreatorRun();
  // Long-lived effects (Studio polling, mode changes) read the run API through
  // this ref so they never restart because a step advanced.
  const uiRunRef = useRef(uiRun);
  uiRunRef.current = uiRun;

  const studioReady = Boolean(studio?.connected && studioSessionId);
  const hasNodes = Boolean(document?.screens?.[0]?.nodes?.length);
  const working = Boolean(busy) || captureBusy || uiRun.isActive;

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
      setCompiled(null);
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
      if (event.matches) setLeftOpen(false);
    };
    updateViewport(mobileQuery);
    mobileQuery.addEventListener?.("change", updateViewport);
    return () => mobileQuery.removeEventListener?.("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!compactViewport || !leftOpen) return undefined;
    const panel = leftPanelRef.current;
    panel?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLeftOpen(false);
        window.setTimeout(() => (leftReopenRef.current || panelReturnFocusRef.current)?.focus?.(), 0);
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
  }, [compactViewport, leftOpen]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const setPanelWidth = useCallback((value, persist = false) => {
    const next = clampPanelWidth(value, UI_CREATOR_LEFT_DEFAULT);
    setLeftWidth(next);
    if (persist) {
      try {
        window.localStorage.setItem(UI_CREATOR_LEFT_WIDTH_KEY, String(next));
      } catch {
        // Layout persistence is optional.
      }
    }
    window.dispatchEvent(new Event("resize"));
  }, []);

  const beginPanelResize = useCallback((event) => {
    if (compactViewport || event.button !== 0) return;
    event.preventDefault();
    resizeCleanupRef.current?.();
    const widthFor = (clientX) => {
      const bounds = bodyRef.current?.getBoundingClientRect();
      return bounds ? clientX - bounds.left : null;
    };
    const handleMove = (moveEvent) => {
      const value = widthFor(moveEvent.clientX);
      if (value != null) setPanelWidth(value);
    };
    const finish = (upEvent) => {
      const value = widthFor(upEvent.clientX);
      if (value != null) setPanelWidth(value, true);
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

  const resizePanelWithKeyboard = useCallback((event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = leftWidth;
    if (event.key === "Home") next = UI_CREATOR_PANEL_MIN;
    else if (event.key === "End") next = UI_CREATOR_PANEL_MAX;
    else next += event.key === "ArrowRight" ? 16 : -16;
    setPanelWidth(next, true);
  }, [leftWidth, setPanelWidth]);

  const openLeftPanel = useCallback((trigger) => {
    panelReturnFocusRef.current = trigger || null;
    setLeftOpen(true);
  }, []);

  const closeLeftPanel = useCallback(() => {
    setLeftOpen(false);
    if (compactViewport) {
      window.setTimeout(() => (leftReopenRef.current || panelReturnFocusRef.current)?.focus?.(), 0);
    }
  }, [compactViewport]);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const replaceDocument = useCallback((nextDocument) => {
    if (!nextDocument) return;
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setDesign((current) => current ? { ...current, document: nextDocument, revision: nextDocument.revision } : current);
  }, []);

  const compile = useCallback(async () => {
    if (!document) return null;
    setBusy("compiling");
    try {
      const response = await compileUiDesign(document.designId, { expectedRevision: document.revision });
      if (response.document) replaceDocument(response.document);
      setCompiled(response);
      setHooksSource((current) => current || response.compiled.hooksLua || "");
      return response;
    } catch (reason) {
      showError(reason, "The UI could not be compiled.");
      return null;
    } finally {
      setBusy("");
    }
  }, [document, replaceDocument, showError]);

  useEffect(() => {
    if (mode !== "code") { compileAttemptRef.current = null; return; }
    const key = document ? `${document.designId}:${document.revision}` : null;
    if (key && !compiled && !busy && compileAttemptRef.current !== key) {
      compileAttemptRef.current = key;
      compile();
    }
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

  /**
   * Applies the given revision to Studio. When a chat run is active and holds an
   * `apply_artifact` step, the real Studio command status is mirrored into it.
   * Returns `{ ok, rootPath, awaitingApproval?, pending?, error? }`; the caller
   * decides how the run continues.
   */
  const applyToStudio = useCallback(async (replaceModifiedRoot = false, nextDocument = null) => {
    const currentDocument = nextDocument || document;
    if (!currentDocument) return { ok: false };
    const tracked = Boolean(uiRun.stepStatus(UI_RUN_STEP.apply.id));
    const step = (patch) => { if (tracked) uiRun.updateStep({ ...UI_RUN_STEP.apply, ...patch }); };
    if (!studio?.connected || !studioSessionId) {
      const reason = new Error("Connect Roblox Studio before applying this UI.");
      showError(reason, reason.message);
      step({ status: "failed", error: reason.message });
      return { ok: false, error: reason };
    }
    setBusy("applying");
    if (tracked) uiRun.setStage(UI_RUN_STAGE.applying);
    step({ status: "running" });
    let rootPath = "";
    try {
      const response = await compileUiDesign(currentDocument.designId, {
        forStudio: true,
        expectedRevision: currentDocument.revision,
        expectedTreeHash: lastStudioTreeHash || null,
        replaceModifiedRoot: replaceModifiedRoot === true,
      });
      const compiledDocument = response.document || currentDocument;
      if (response.document) replaceDocument(response.document);
      setCompiled(response);
      rootPath = response.compiled?.uiRoots?.[0]?.targetPath || "";
      if (!response.studioReady) throw new Error("Publish, replace, or remove every unresolved required image before applying to Studio.");
      await createUiCheckpoint(currentDocument.designId, {
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
      step({ status: "queued", operationId: queued.commandId, result: { path: rootPath } });
      const command = await waitForStudioCommand(queued.commandId, 45_000, (update) => {
        step({ status: commandStepStatus(update.status), operationId: queued.commandId, result: { path: rootPath } });
      });
      if (!["succeeded", "failed"].includes(command.status)) {
        const pending = { commandId: queued.commandId, designId: currentDocument.designId };
        setPendingStudioCommand(pending);
        try { sessionStorage.setItem(`nexusrbx:ui-pending:${user.uid}:${currentDocument.designId}`, JSON.stringify(pending)); } catch { /* Optional recovery. */ }
      }
      if (command.status === "failed") {
        const commandError = command.error || command.result?.error || "Studio rejected the UI apply.";
        const commandCode = typeof commandError === "object" ? commandError.code : "";
        const commandMessage = typeof commandError === "object"
          ? (commandError.message || commandError.code || "Studio rejected the UI apply.")
          : String(commandError);
        if (/ui_tree_(?:conflict|precondition_required)/i.test(`${commandCode} ${commandMessage}`)) setStudioTreeConflict(true);
        const reason = new Error(commandMessage);
        if (commandCode) reason.code = commandCode;
        throw reason;
      }
      if (["awaiting_approval", "pending_approval"].includes(command.status)) {
        step({ status: "awaiting_approval", operationId: queued.commandId, result: { path: rootPath } });
        if (tracked) uiRun.setStage(UI_RUN_STAGE.approval);
        notify?.({ message: "UI is ready for Studio approval.", type: "info" });
        return { ok: false, awaitingApproval: true, rootPath };
      }
      if (command.status === "succeeded") {
        const receipt = readStudioUiReceipt(command);
        setLastStudioTreeHash(receipt.treeHash);
        try { window.localStorage.setItem(`nexusrbx:ui-tree-hash:${currentDocument.designId}`, receipt.treeHash); } catch { /* Optional recovery. */ }
        setStudioReceipt(receipt);
        setStudioTreeConflict(false);
        step({ status: "succeeded", operationId: queued.commandId, result: { path: rootPath, treeHash: receipt.treeHash, nodeCount: receipt.nodeCount } });
        notify?.({ message: "Editable UI applied and verified in Studio.", type: "success" });
        return { ok: true, rootPath };
      }
      step({ status: "queued", operationId: queued.commandId, result: { path: rootPath } });
      if (tracked) uiRun.setStage("Waiting for Studio...");
      notify?.({ message: "UI apply queued for Studio.", type: "info" });
      return { ok: false, pending: true, rootPath };
    } catch (reason) {
      showError(reason, "The UI could not be applied to Studio.");
      step({ status: "failed", error: reason?.message || "The UI could not be applied to Studio.", errorCode: reason?.code });
      return { ok: false, rootPath, error: reason };
    } finally {
      setBusy("");
    }
  }, [document, lastStudioTreeHash, notify, replaceDocument, showError, studio, studioSessionId, uiRun, user?.uid]);

  const previewDesignId = design?.designId || null;
  const previewRevision = document?.revision || "";

  useEffect(() => {
    if (!previewDesignId) return undefined;
    const requestKey = `${previewDesignId}:${previewRevision}:${previewManifestNonce}`;
    previewManifestKeyRef.current = requestKey;
    const controller = new AbortController();
    getUiPreviewManifest(previewDesignId, controller.signal).then((manifest) => {
      if (previewManifestKeyRef.current !== requestKey) return;
      setPreviewManifestRecord({ designId: previewDesignId, requestKey, manifest, error: "" });
    }).catch((reason) => {
      if (previewManifestKeyRef.current !== requestKey || reason?.name === "AbortError") return;
      setPreviewManifestRecord({
        designId: previewDesignId,
        requestKey,
        manifest: null,
        error: reason?.message || "The preview manifest could not be loaded.",
      });
    });
    return () => controller.abort();
  }, [previewDesignId, previewManifestNonce, previewRevision]);

  // Derived, not stored: a manifest captured for another design can never reach the stage.
  const previewManifest = previewManifestRecord?.designId === previewDesignId ? previewManifestRecord : null;
  const previewCapabilities = previewManifest?.manifest?.capabilities
    || (previewManifest?.error
      ? { previewEnabled: false, rendererAvailable: false, captureUnavailableReason: previewManifest.error }
      : null);
  const previewCaptureRootPath = compiled?.compiled?.uiRoots?.[0]?.targetPath
    || (previewDesignId ? `StarterGui/NexusRBX_UI/UI_${cleanIdentifier(previewDesignId) || "NexusUI"}` : "");
  const previewSourceRevision = previewManifest?.manifest?.sourceRevision || "";

  /** Requests a Studio edit-mode capture. Returns `{ ok, snapshotId, sourceRevision, error }`. */
  const refreshUiCapture = useCallback(async (sourceRevisionOverride = "", rootPathOverride = "") => {
    const sourceRevision = String(sourceRevisionOverride || previewSourceRevision || documentRef.current?.revision || "").trim();
    const rootPath = String(rootPathOverride || previewCaptureRootPath || "").trim();
    if (!previewDesignId || !rootPath || !sourceRevision) {
      return { ok: false, error: new Error("The UI revision is not ready for a Studio capture yet.") };
    }
    setCaptureBusy(true);
    setError("");
    try {
      const idempotencyKey = `ui-capture-${cleanIdentifier(previewDesignId) || "design"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const started = await requestUiCapture(previewDesignId, {
        mode: "studio_edit",
        rootPath,
        sourceRevision,
      }, { idempotencyKey });
      if (started.status === "unavailable") {
        throw new Error(started.capability?.reason || "Studio capture is not available for this connection.");
      }
      let record = started;
      const deadline = Date.now() + 90_000;
      while (!["ready", "failed", "unavailable"].includes(record.status)) {
        if (Date.now() >= deadline) throw new Error("Studio has not returned this capture yet. Retry once Studio responds.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        record = await readUiCapture(previewDesignId, started.captureRequestId);
      }
      if (record.status !== "ready") throw new Error(record.message || "Studio could not capture this UI.");
      setPreviewManifestNonce((value) => value + 1);
      return { ok: true, snapshotId: record.capture?.snapshotId || record.snapshotId || "", sourceRevision };
    } catch (reason) {
      showError(reason, "The Studio UI capture could not be completed.");
      return { ok: false, error: reason };
    } finally {
      setCaptureBusy(false);
    }
  }, [previewCaptureRootPath, previewDesignId, previewSourceRevision, showError]);

  /**
   * Capture then render, reporting into the active run. The render step is
   * completed by the stage through `handleRenderStatus` once the image exists.
   */
  const captureAndRender = useCallback(async (sourceRevision = "", rootPath = "") => {
    uiRun.setStage(UI_RUN_STAGE.capturing);
    uiRun.updateStep({ ...UI_RUN_STEP.capture, status: "running" });
    const captured = await refreshUiCapture(sourceRevision, rootPath);
    if (!captured.ok) {
      uiRun.fail(captured.error, {
        stepId: UI_RUN_STEP.capture.id,
        content: "The UI is in Studio, but Studio did not return a capture. Use Sync Studio to try again.",
      });
      return false;
    }
    uiRun.updateStep({
      ...UI_RUN_STEP.capture,
      status: "succeeded",
      result: { snapshotId: captured.snapshotId, sourceRevision: captured.sourceRevision },
    });
    uiRun.setStage(UI_RUN_STAGE.rendering);
    uiRun.updateStep({ ...UI_RUN_STEP.render, status: "running" });
    awaitingRenderRef.current = { sourceRevision: captured.sourceRevision, snapshotId: captured.snapshotId };
    return true;
  }, [refreshUiCapture, uiRun]);

  const handleRenderStatus = useCallback((report) => {
    const waiting = awaitingRenderRef.current;
    if (!waiting || !uiRun.isActiveNow()) return;
    // A previous capture of the same revision can already be "ready"; when the
    // capture returned a snapshot id, only that snapshot closes the step.
    const matches = waiting.snapshotId
      ? report.snapshotId === waiting.snapshotId
      : report.sourceRevision === waiting.sourceRevision;
    if (!matches) return;
    if (report.status === "ready" && report.preview) {
      awaitingRenderRef.current = null;
      uiRun.finish({
        content: `UI revision ${shortRevision(report.sourceRevision)} is in Studio and previewed.`,
        step: {
          ...UI_RUN_STEP.render,
          status: "succeeded",
          result: {
            snapshotId: report.snapshotId,
            rendererBackend: report.preview.rendererBackend || "",
            imageHash: report.preview.imageHash || "",
            viewportId: report.preview.viewportId || "",
          },
        },
      });
      return;
    }
    if (report.status === "error" || report.status === "unavailable") {
      awaitingRenderRef.current = null;
      uiRun.fail(new Error(report.error || "The preview could not be rendered."), {
        stepId: UI_RUN_STEP.render.id,
        content: "The UI is in Studio, but the preview image could not be drawn.",
      });
    }
  }, [uiRun]);

  // Leaving Preview unmounts the renderer; close the run honestly instead of leaving it spinning.
  useEffect(() => {
    const api = uiRunRef.current;
    if (mode === "preview" || !awaitingRenderRef.current || !api.isActiveNow()) return;
    awaitingRenderRef.current = null;
    api.finish({
      content: "The UI is in Studio and captured. Open Preview to draw the image.",
      step: { ...UI_RUN_STEP.render, status: "queued" },
    });
  }, [mode]);

  const generateRef = useRef(null);
  const generate = useCallback(async (requestedPrompt) => {
    if (typeof generateRef.current === "function") return generateRef.current(requestedPrompt);
  }, []);

  generateRef.current = async (requestedPrompt) => {
    if (!document || busy || uiRun.isActiveNow()) return;
    const cleanPrompt = String(requestedPrompt || "").trim();
    if (!cleanPrompt) return;
    if (!studioReady) {
      showError(null, "Connect Roblox Studio before generating UI.");
      return;
    }
    setBusy("generating");
    setError("");
    uiRun.begin({
      prompt: cleanPrompt,
      stage: UI_RUN_STAGE.generating,
      steps: [
        { ...UI_RUN_STEP.generate, status: "running" },
        UI_RUN_STEP.apply,
        UI_RUN_STEP.capture,
        UI_RUN_STEP.render,
      ],
    });
    try {
      const response = await generateUiDraft(document.designId, {
        workspace: "ui_creator",
        designId: document.designId,
        baseRevision: document.revision,
        uiIntent: hasNodes ? "edit" : "create",
        prompt: cleanPrompt,
        model: modelVersion,
      });
      if (Array.isArray(response.messages)) {
        setDesign((current) => current ? { ...current, messages: response.messages } : current);
      }
      if (!response.draft?.draftId) throw new Error("The UI generator did not return a draft.");
      uiRun.attachDraft(response.draft.draftId);
      const accepted = await acceptUiDraft(document.designId, response.draft.draftId);
      replaceDocument(accepted.document);
      setCompiled(null);
      setPrompt("");
      onBillingRefresh?.();
      uiRun.updateStep({
        ...UI_RUN_STEP.generate,
        status: "succeeded",
        result: {
          revision: accepted.document.revision,
          draftId: response.draft.draftId,
          nodeCount: accepted.document.screens?.[0]?.nodes?.length || 0,
        },
      });
      setMode("preview");
      const applied = await applyToStudio(false, accepted.document);
      if (applied.ok) {
        await captureAndRender(accepted.document.revision, applied.rootPath);
        return;
      }
      if (applied.awaitingApproval || applied.pending) {
        approvalContinuationRef.current = { sourceRevision: accepted.document.revision, rootPath: applied.rootPath };
        return;
      }
      uiRun.fail(applied.error || new Error("Studio did not apply this UI."), {
        stepId: UI_RUN_STEP.apply.id,
        content: "The UI revision is saved, but it is not in Studio yet. Use Apply to Studio to retry.",
      });
    } catch (reason) {
      showError(reason, "The UI revision could not be generated.");
      const generated = uiRun.stepStatus(UI_RUN_STEP.generate.id) === "succeeded";
      uiRun.fail(reason, { stepId: generated ? UI_RUN_STEP.apply.id : UI_RUN_STEP.generate.id });
    } finally {
      setBusy("");
    }
  };

  const applyAndPreview = useCallback(async (replaceModifiedRoot = false) => {
    if (!document || uiRun.isActiveNow()) return;
    setError("");
    uiRun.begin({
      stage: UI_RUN_STAGE.applying,
      steps: [UI_RUN_STEP.apply, UI_RUN_STEP.capture, UI_RUN_STEP.render],
    });
    const applied = await applyToStudio(replaceModifiedRoot, null);
    if (applied.ok) {
      setMode("preview");
      await captureAndRender(documentRef.current?.revision || document.revision, applied.rootPath);
      return;
    }
    if (applied.awaitingApproval || applied.pending) {
      approvalContinuationRef.current = { sourceRevision: documentRef.current?.revision || document.revision, rootPath: applied.rootPath };
      return;
    }
    uiRun.fail(applied.error || new Error("Studio did not apply this UI."), { stepId: UI_RUN_STEP.apply.id });
  }, [applyToStudio, captureAndRender, document, uiRun]);

  const syncStudio = useCallback(async () => {
    if (!document || uiRun.isActiveNow()) return;
    setError("");
    uiRun.begin({
      stage: UI_RUN_STAGE.capturing,
      steps: [UI_RUN_STEP.capture, UI_RUN_STEP.render],
    });
    setMode("preview");
    await captureAndRender();
  }, [captureAndRender, document, uiRun]);

  continueAfterApprovalRef.current = async (receipt) => {
    const continuation = approvalContinuationRef.current;
    approvalContinuationRef.current = null;
    if (!continuation || !uiRun.isActiveNow()) return;
    uiRun.updateStep({
      ...UI_RUN_STEP.apply,
      status: "succeeded",
      result: { path: continuation.rootPath, treeHash: receipt.treeHash, nodeCount: receipt.nodeCount },
    });
    setMode("preview");
    await captureAndRender(continuation.sourceRevision, continuation.rootPath);
  };

  useEffect(() => {
    if (!user?.uid || !document?.designId) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`nexusrbx:ui-pending:${user.uid}:${document.designId}`) || "null");
      setPendingStudioCommand(saved);
    } catch { setPendingStudioCommand(null); }
  }, [user?.uid, document?.designId]);

  useEffect(() => {
    if (!pendingStudioCommand || pendingStudioCommand.designId !== document?.designId) return;
    let stopped = false;
    let timer;
    const poll = async () => {
      try {
        const command = await getStudioCommand(pendingStudioCommand.commandId);
        if (stopped) return;
        if (["succeeded", "failed", "canceled", "cancelled", "expired"].includes(command.status)) {
          setPendingStudioCommand(null);
          try { sessionStorage.removeItem(`nexusrbx:ui-pending:${user.uid}:${document.designId}`); } catch { /* Optional recovery. */ }
          if (command.status !== "succeeded") {
            const reason = new Error(`Studio could not apply this UI. ${command.error?.message || "Review Studio activity before retrying."}`);
            approvalContinuationRef.current = null;
            const api = uiRunRef.current;
            if (api.isActiveNow()) api.fail(reason, { stepId: UI_RUN_STEP.apply.id });
            throw reason;
          }
          const receipt = readStudioUiReceipt(command);
          setStudioReceipt(receipt);
          setLastStudioTreeHash(receipt.treeHash);
          setStudioTreeConflict(false);
          try { localStorage.setItem(`nexusrbx:ui-tree-hash:${document.designId}`, receipt.treeHash); } catch { /* Optional recovery. */ }
          notify?.({ message: "Editable UI applied and verified in Studio.", type: "success" });
          continueAfterApprovalRef.current?.(receipt);
          return;
        }
      } catch (reason) {
        if (stopped) return;
        if (reason?.status === 401 || reason?.status === 403 || reason?.status === 404) { setPendingStudioCommand(null); showError(reason, "Studio status is unavailable."); return; }
        // Terminal failures are displayed once. Transient network errors retry.
        if (/Studio could not|without a verified/.test(reason?.message || "")) { showError(reason, "Studio apply failed."); return; }
      }
      if (!stopped) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [pendingStudioCommand, document?.designId, notify, showError, user?.uid]);

  // Chat transcript: persisted design messages, with completed local runs
  // standing in for the server's one-line "revision ready" reply so the step
  // cards stay attached to the prompt that produced them.
  const chatMessages = useMemo(() => {
    const completedByDraft = new Map(uiRun.completed.filter((item) => item.draftId).map((item) => [item.draftId, item]));
    const pendingDraftId = uiRun.run?.draftId || null;
    const usedRunIds = new Set();
    const persisted = [];
    for (const message of design?.messages || []) {
      const mapped = toChatMessage(message);
      if (mapped.role === "assistant" && mapped.draftId) {
        if (mapped.draftId === pendingDraftId) continue;
        const local = completedByDraft.get(mapped.draftId);
        if (local) {
          usedRunIds.add(local.requestId);
          persisted.push({ ...local, createdAt: mapped.createdAt || local.createdAt });
          continue;
        }
      }
      persisted.push(mapped);
    }
    const extras = uiRun.completed.filter((item) => !usedRunIds.has(item.requestId));
    if (!extras.length) return persisted;
    return [...persisted, ...extras].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }, [design?.messages, uiRun.completed, uiRun.run?.draftId]);

  if (!user) {
    return <div className="ui-creator-gate"><AnimatedUiIcon /><h1>Roblox UI Creator</h1><p>Sign in to build Roblox UI in Studio and preview it here.</p><Button type="button" onClick={onRequireAuth}>Sign in</Button><div className="ui-creator-gate__composer"><CreationPromptComposer prompt="" setPrompt={() => {}} attachments={[]} setAttachments={() => {}} onSubmit={() => {}} disabled contextIcon={AnimatedUiIcon} contextLabel="UI generation" promptAriaLabel="UI prompt unavailable until sign in" submitLabel="Sign in to generate" showWorkspaceOptions={false} /></div></div>;
  }
  if (!isStarterOrAbove) {
    return <div className="ui-creator-gate"><AnimatedUiIcon /><h1>Roblox UI Creator</h1><p>Studio-built UI, AI revisions, and rendered previews are available on Pro.</p><Button type="button" onClick={onRequireStarter}>Compare plans</Button><div className="ui-creator-gate__composer"><CreationPromptComposer prompt="" setPrompt={() => {}} attachments={[]} setAttachments={() => {}} onSubmit={() => {}} disabled contextIcon={AnimatedUiIcon} contextLabel="UI generation" promptAriaLabel="UI prompt unavailable on this plan" submitLabel="Pro required" showWorkspaceOptions={false} /></div></div>;
  }
  if (!document) {
    return <div className="ui-creator-loading" role="status"><span className="nx-build-signal" data-active="true" />Opening UI Creator…</div>;
  }

  const codeWorkspace = (
    <div className="ui-code-workspace">
      <section>
        <header><div><span>GENERATED · READ ONLY</span><strong>GeneratedUI.lua</strong></div><Button type="button" size="sm" variant="secondary" onClick={compile} icon={RotateCcw}>Compile</Button></header>
        <pre><code>{compiled?.compiled?.generatedLua || (busy === "compiling" ? "Compiling Luau…" : "Code preview is not ready.")}</code></pre>
        {!compiled && !busy ? <Button type="button" variant="secondary" size="sm" onClick={compile}>Retry code preview</Button> : null}
      </section>
      <section>
        <header><div><span>STUDIO ONLY · EDITABLE</span><strong>Hooks.client.lua</strong></div><Button type="button" size="sm" variant="secondary" onClick={saveHooks} icon={Save}>Save hooks</Button></header>
        <textarea value={hooksSource} onChange={(event) => setHooksSource(event.target.value)} spellCheck="false" aria-label="Editable Hooks.client.lua" />
      </section>
    </div>
  );

  const stageRun = uiRun.run ? { stage: uiRun.run.stage, activeStep: uiRun.activeStep } : null;
  const canApply = studioReady && !working && !pendingStudioCommand;

  return (
    <section className="ui-creator" aria-label="Roblox UI Creator" aria-busy={working}>
      {pendingStudioCommand ? <div className="ui-creator__mode-hint" role="status">Waiting for Studio · Approve the change in Studio if prompted. The preview updates once Studio confirms it.</div> : null}
      <div className="ui-creator__mode-hint" role="status">{mode === "code" ? "Code · Review the generated Luau and add your game hooks." : "Preview · A redraw of the UI as it exists in your Studio place. Buttons and hooks run in Studio, not here."}</div>
      <header className="ui-creator__toolbar">
        <div className="ui-creator__design-switcher">
          <div className="ui-creator__design-identity">
            <span>UI design</span>
            <select value={document.designId} disabled={working} onChange={(event) => openDesign(event.target.value)} aria-label="UI design">
              {designs.map((item) => <option key={item.designId} value={item.designId}>{item.title}</option>)}
            </select>
          </div>
          <Button type="button" variant="secondary" size="sm" title="New UI design" aria-label="Create a new UI design" disabled={working} onClick={async () => {
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
          <Button type="button" icon={AnimatedMotionIcon} variant={mode === "preview" ? "primary" : "secondary"} size="sm" role="tab" aria-selected={mode === "preview"} tabIndex={mode === "preview" ? 0 : -1} data-active={mode === "preview"} onClick={() => setMode("preview")}>Preview</Button>
          <Button type="button" icon={Code} variant={mode === "code" ? "primary" : "secondary"} size="sm" role="tab" aria-selected={mode === "code"} tabIndex={mode === "code" ? 0 : -1} data-active={mode === "code"} onClick={() => setMode("code")}>Code</Button>
        </div>
        <div className="ui-creator__toolbar-actions">
          <Button type="button" variant="secondary" size="sm" className="ui-creator__apply" disabled={!canApply} title={studioReady ? "Re-apply this revision to Studio and refresh the preview" : "Connect Roblox Studio to apply"} onClick={() => applyAndPreview(false)} icon={AnimatedUploadIcon}>Apply to Studio</Button>
        </div>
      </header>

      <div
        ref={bodyRef}
        className="ui-creator__body"
        data-left-open={leftOpen}
        data-compact={compactViewport}
        style={{ "--ui-left-width": `${leftWidth}px` }}
      >
        {compactViewport && leftOpen ? <Button type="button" variant="ghost" size="sm" className="ui-creator__panel-backdrop" aria-label="Close conversation panel" onClick={closeLeftPanel} /> : null}
        <aside ref={leftPanelRef} className="ui-creator__left" aria-label="Conversation" role={compactViewport ? "dialog" : undefined} aria-modal={compactViewport ? "true" : undefined} aria-hidden={compactViewport && !leftOpen ? "true" : undefined} tabIndex={compactViewport ? -1 : undefined}>
          <div className="ui-creator__panel-header">
            <div><span>Conversation</span><strong>{design?.title || "UI design"}</strong></div>
            <Button type="button" variant="secondary" onClick={closeLeftPanel} aria-label="Collapse conversation panel" icon={compactViewport ? X : ChevronLeft} />
          </div>
          <Conversation className="ui-creator__conversation">
            <ConversationContent className="ui-creator__conversation-content" scrollClassName="ui-creator__conversation-scroll">
              {chatMessages.length || uiRun.pendingMessage ? (
                <MessageList
                  messages={chatMessages}
                  pendingMessage={uiRun.pendingMessage}
                  activeMode="ui"
                  isBusy={working}
                  studioConnected={Boolean(studio?.connected)}
                  studioSessionId={studioSessionId}
                  notify={notify}
                />
              ) : (
                <div className="ui-panel-empty"><Sparkles /><strong>Start with intent</strong><p>Describe the screen, what the player does on it, and the visual style. Every step Nexus takes in Studio shows up here.</p></div>
              )}
            </ConversationContent>
            <ConversationScrollButton className="ui-creator__conversation-scroll-button" />
          </Conversation>
          {!compactViewport ? <div className="ui-creator__panel-resizer ui-creator__panel-resizer--left" role="separator" aria-label="Resize conversation panel" aria-orientation="vertical" aria-valuemin={UI_CREATOR_PANEL_MIN} aria-valuemax={UI_CREATOR_PANEL_MAX} aria-valuenow={leftWidth} tabIndex={0} onPointerDown={beginPanelResize} onKeyDown={resizePanelWithKeyboard} onDoubleClick={() => setPanelWidth(UI_CREATOR_LEFT_DEFAULT, true)} /> : null}
        </aside>
        {!leftOpen ? <Button ref={leftReopenRef} type="button" variant="secondary" size="sm" className="ui-creator__reopen ui-creator__reopen--left" onClick={(event) => openLeftPanel(event.currentTarget)} aria-label="Open conversation" icon={ChevronRight}><span>Conversation</span></Button> : null}

        <main className="ui-creator__stage" role="tabpanel" aria-label={`${mode} workspace`}>
          {mode === "code" ? codeWorkspace : (
            <div className="ui-creator__preview-host">
              <UiPreviewPane
                designId={previewDesignId}
                projectId={projectId}
                sourceRevision={previewSourceRevision}
                capture={previewManifest?.manifest?.capture || null}
                states={previewManifest?.manifest?.states || []}
                viewports={previewManifest?.manifest?.viewports || []}
                capabilities={previewCapabilities}
                onRefreshCapture={studioReady && previewCaptureRootPath && previewSourceRevision ? syncStudio : undefined}
                captureBusy={captureBusy}
                run={stageRun}
                studioConnected={studioReady}
                hasNodes={hasNodes}
                studioReceipt={studioReceipt}
                pendingStudioCommand={pendingStudioCommand}
                onApplyToStudio={studioReady ? () => applyAndPreview(false) : undefined}
                applyBusy={busy === "applying"}
                onRenderStatus={handleRenderStatus}
              />
            </div>
          )}
          <div className="ui-creator__composer-host">
            <CreationPromptComposer
              prompt={prompt}
              setPrompt={setPrompt}
              attachments={[]}
              setAttachments={() => {}}
              onSubmit={(event) => {
                event?.preventDefault?.();
                return generate(prompt);
              }}
              disabled={!studioReady}
              isGenerating={working}
              placeholder={studioReady ? "Describe the UI to build or change…" : "Connect Roblox Studio to generate UI"}
              promptAriaLabel="Prompt input"
              submitLabel={studioReady ? "Send prompt" : "Connect Studio to generate"}
              contextIcon={AnimatedUiIcon}
              contextLabel="UI generation"
              mode={composerMode}
              onModeChange={setComposerMode}
              showDock={false}
              showWorkspaceOptions={false}
              studioConnectionRequired={false}
              studioConnected={Boolean(studio?.connected)}
              studioConnectionType={studio?.connectionType}
            />
          </div>
        </main>
      </div>
      {error ? <div className="ui-creator__error" role="alert">{error}<Button type="button" variant="ghost" size="sm" onClick={() => setError("")}>Dismiss</Button></div> : null}
      {studioReceipt ? <div className="ui-creator__receipt" role="status"><Check /><div><strong>Studio apply verified</strong><span>{studioReceipt.nodeCount} editable objects added to your game</span></div><Button type="button" variant="ghost" size="sm" onClick={() => navigateTo?.("/ai?mode=agent")}>Studio activity</Button><Button type="button" variant="ghost" size="sm" aria-label="Dismiss Studio receipt" onClick={() => setStudioReceipt(null)}>×</Button></div> : null}
      {studioTreeConflict ? <div className="ui-creator__studio-conflict" role="alert"><div><strong>Studio has a different managed UI tree.</strong><span>Keep the Studio copy, or explicitly replace it with this Nexus revision.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => { setStudioTreeConflict(false); setError(""); }}>Keep Studio</Button><Button type="button" variant="primary" size="sm" disabled={working} onClick={() => applyAndPreview(true)}>Replace Studio</Button></div> : null}
      {busy && !uiRun.isActive ? <div className="ui-creator__busy" role="status"><span className="nx-build-signal" data-active="true" />{busy.replace(/-/g, " ")}</div> : null}
    </section>
  );
}
