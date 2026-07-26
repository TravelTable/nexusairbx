import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Menu, FileCode2, Search, RefreshCw, Bot } from "lib/icons";

import SidebarContent from "../../components/SidebarContent";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import StarterPromoModal from "../../components/StarterPromoModal";
import NotificationToast from "../../components/NotificationToast";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import StudioPairControl from "../../components/ai/StudioPairControl";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import SiteHeader from "../../components/site/SiteHeader";
import { Segmented } from "../../components/ui";
import {
  getActiveStudioCapabilities,
  isCurrentPluginAutoPushAuthorized,
  selectedStudioSupportsCommand,
} from "../../components/ai/workspace/studioControlAccess";

import CodeFileTree from "../../components/ai/workspace/CodeFileTree";
import CodeWorkspace from "../../components/ai/workspace/CodeWorkspace";
import AgentChatPanel from "../../components/ai/workspace/AgentChatPanel";
import TaskProgressPanel from "../../components/ai/workspace/TaskProgressPanel";
import ActiveAgentsTray from "../../components/ai/workspace/ActiveAgentsTray";
import WorkspaceAssetsPanel from "../../components/ai/workspace/WorkspaceAssetsPanel";
import WorkspaceDetailsPanel from "../../components/ai/workspace/WorkspaceDetailsPanel";
import WorkspaceShell, {
  clampWorkspaceDrawerWidth,
  WORKSPACE_DRAWER_DEFAULT_WIDTH,
  WorkspaceEmptyState,
} from "../../components/ai/workspace/WorkspaceShell";
import useTaskRuntime from "../../hooks/useTaskRuntime";
import useActiveAgents from "../../hooks/useActiveAgents";
import QuickScriptWorkspace from "./QuickScriptWorkspace";
import { getStudioCommand, getStudioManifest, getStudioManifestStatus, queueStudioTool } from "../../lib/studioBridgeApi";
import { TERMINAL_AGENT_STATES } from "../../lib/agentRuntimeV2Api";
import { PENDING_AUTH_ACTIONS } from "../../lib/pendingAuthAction";
import { getStudioSessionId } from "../../lib/studioConnection";
import { buildRefineTargetFromWorkspace, messageHasRefineableFiles } from "../../lib/chatRefine";
import TutorialOverlay from "../../components/onboarding/TutorialOverlay";
import { useTutorial } from "../../components/onboarding/useTutorial";
import useAiPageZoom from "../../hooks/useAiPageZoom";

const WORKSPACE_DRAWER_WIDTH_KEY = "nexusrbx:workspace-drawer-width";

function readWorkspaceDrawerWidth() {
  if (typeof window === "undefined") return WORKSPACE_DRAWER_DEFAULT_WIDTH;
  try {
    const storedWidth = window.localStorage.getItem(WORKSPACE_DRAWER_WIDTH_KEY);
    return storedWidth == null
      ? WORKSPACE_DRAWER_DEFAULT_WIDTH
      : clampWorkspaceDrawerWidth(storedWidth);
  } catch {
    return WORKSPACE_DRAWER_DEFAULT_WIDTH;
  }
}

async function pollStudioCommand(commandId, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const command = await getStudioCommand(commandId);
    if (command.status === "succeeded" || command.status === "failed") return command;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error("Studio command timed out");
}

export default function AgentWorkspaceLayout({ controller }) {
  const { billing, uiState, modules, handlers, studio, roblox, starterPromo } = controller;
  const { planKey, totalRemaining, subLimit, resetsAt, isPremium, isStarterOrAbove, unlimitedTokens, devOverride, dailyUsage, includedUsage, premiumBalance, isFreeUsagePlan, billingLoading, billingError } = billing;
  const {
    user,
    sidebarOpen,
    generatorMode,
    quickScript,
    prompt,
    isImproving,
    refineTarget,
    rewindTarget,
    attachments,
    robloxImageUploading,
    robloxImageUploads,
    scripts,
    projectContext,
    showSignInNudge,
    signInNudgeReason,
    showProNudge,
    proNudgeReason,
    codeDrawerOpen,
    codeDrawerData,
    currentTheme,
    currentToast,
    authReady,
  } = uiState;

  const { chat, scriptManager, unified, workspace, settings } = modules;
  const activeAgentRuntime = useActiveAgents(user, {
    fallbackChatIds: unified.generatingChatIds,
  });
  const activeAgentStatusByChat = useMemo(() => {
    const statuses = {};
    activeAgentRuntime.agents.forEach((agent) => {
      if (agent.chatId) statuses[agent.chatId] = agent.status;
    });
    return statuses;
  }, [activeAgentRuntime.agents]);
  const studioCommandSessionId =
    getStudioSessionId(studio?.manifestSession) ||
    getStudioSessionId(studio?.compatiblePluginSession) ||
    null;
  const studioCapabilities = getActiveStudioCapabilities(studio);
  const studioManifestSupported = selectedStudioSupportsCommand(studio, "get_project_manifest");
  const studioAutoPushAuthorized = isCurrentPluginAutoPushAuthorized(studio);
  const currentProjectId = chat.currentChatMeta?.projectId || roblox?.selectedAssetProjectId || "";

  const {
    setSidebarOpen,
    setActiveTab,
    setPrompt,
    setRewindTarget,
    cancelRewind,
    setGeneratorMode,
    setAttachments,
    setShowSignInNudge,
    setShowProNudge,
    setProNudgeReason,
    setCodeDrawerOpen,
    dismissToast,
    updateSettings,
    handlePromptSubmit,
    runQuickScript,
    handleQuickScriptCopy,
    handleQuickScriptSave,
    handleQuickScriptExport,
    handleQuickScriptStudioPush,
    handleQuickScriptContinueEditing,
    handleQuickScriptOpenAgentBuild,
    handleAuthRequired,
    onApprovePlan,
    onClarifySubmit,
    handleEditPlan,
    handleStartRefine,
    cancelRefine,
    handleImprovePrompt,
    handleFileUpload,
    handleQuickStart,
    handleOpenArtifact,
    track,
    notify,
    handleApproveStep,
    handleSelectStudioTarget,
    handleRestoreRun,
    handleStudioEnabledChange,
    handleStudioApplyModeChange,
    handleStudioAutoPushEnabledChange,
    handleStudioAutoPushPolicyChange,
    handleRobloxAssetUploadsEnabledChange,
    handleOpenAssetLibrary,
    handleCloseAssetLibrary,
    handleConfirmProjectAssets,
    handleRemoveProjectAsset,
  } = handlers;

  const [activeDockPanel, setActiveDockPanel] = useState(null);
  const [drawerWidth, setDrawerWidth] = useState(readWorkspaceDrawerWidth);
  const [detailsView, setDetailsView] = useState("build");
  const [hasUnseenArtifact, setHasUnseenArtifact] = useState(false);
  const previousArtifactFileCountRef = useRef(null);
  const tutorial = useTutorial();
  const aiPageRef = useRef(null);
  useAiPageZoom(aiPageRef);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_DRAWER_WIDTH_KEY, String(drawerWidth));
    } catch {
      // Storage may be disabled; the drawer remains resizable for this session.
    }
  }, [drawerWidth]);

  const handleDockPanelChange = useCallback((panelId) => {
    setActiveDockPanel(panelId);
    if (panelId === "files" || panelId === "code") {
      setHasUnseenArtifact(false);
    }
  }, []);

  useEffect(() => {
    const { documentElement, body } = document;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const handleRestartTour = () => {
      tutorial.startTutorial();
    };
    window.addEventListener("nexus-restart-tour", handleRestartTour);
    return () => window.removeEventListener("nexus-restart-tour", handleRestartTour);
  }, [tutorial]);
  const [studioManifest, setStudioManifest] = useState([]);
  const [studioSearch, setStudioSearch] = useState("");
  const [studioFiles, setStudioFiles] = useState([]);
  const [activeStudioFileId, setActiveStudioFileId] = useState(null);
  const [studioConflict, setStudioConflict] = useState(null);
  const [studioBusy, setStudioBusy] = useState(false);
  const manifestRefreshInFlightRef = useRef(null);
  const autoManifestRefreshKeyRef = useRef("");
  const manifestWaitsRef = useRef(new Map());
  /** One automatic conflict recovery per session+revision failure (survives re-renders). */
  const manifestRecoveryAttemptedRef = useRef(new Set());
  const taskRuntime = useTaskRuntime({
    user,
    projectId: currentProjectId,
    chatId: chat.currentChatId || "",
    enabled: generatorMode === "agent_build" && Boolean(user),
  });

  const toStudioFile = useCallback((script) => ({
    id: `studio:${script.path}`,
    name: script.name || String(script.path || "").split("/").pop(),
    path: script.path,
    placement: String(script.path || "").split("/")[0] || "ReplicatedStorage",
    kind: script.className === "LocalScript" ? "client" : script.className === "Script" ? "server" : "module",
    language: "luau",
    content: script.source || "",
    originalContent: script.source || "",
    sourceHash: script.sourceHash || "",
    className: script.className || "ModuleScript",
    dirty: false,
    status: "synced",
  }), []);

  const fetchManifestPage = useCallback(async (revision = "") => {
    const items = [];
    let cursor = "";
    let nextCursor = "";
    do {
      const data = await getStudioManifest({
        sessionId: studioCommandSessionId,
        revision,
        limit: 1000,
        cursor,
      });
      items.push(...(data.manifest?.items || []));
      nextCursor = data.manifest?.nextCursor || "";
      cursor = nextCursor;
    } while (nextCursor);
    return items;
  }, [studioCommandSessionId]);

  const waitForManifestCompletion = useCallback(async (previousRevision = "") => {
    const sessionId = studioCommandSessionId || "default";
    const waitKey = `${sessionId}:${previousRevision || "none"}`;
    if (manifestWaitsRef.current.has(waitKey)) {
      return manifestWaitsRef.current.get(waitKey);
    }

    const waitPromise = (async () => {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        let status = null;
        try {
          const data = await getStudioManifestStatus({
            sessionId: studioCommandSessionId,
          });
          status = data.status || null;
        } catch (_) {
          // Transient failure (e.g. no paired session yet); keep polling until ready or timeout.
          status = null;
        }
        const readyRevision = status?.lastCompleteRevision || "";
        const manifestFailed =
          status?.conflicted === true ||
          ["failed", "conflicted"].includes(String(status?.continuationStatus || "").toLowerCase());
        if (manifestFailed) {
          const error = new Error(
            status?.error ||
              status?.terminalError ||
              "Studio manifest refresh failed because the project index conflicted. Rescan the project and try again."
          );
          error.code = status?.code || "STUDIO_MANIFEST_CONFLICTED";
          throw error;
        }
        if (
          readyRevision &&
          status?.activeRevision === readyRevision &&
          status?.complete &&
          (!previousRevision || readyRevision !== previousRevision)
        ) {
          return status;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error("Studio manifest refresh timed out");
    })();

    manifestWaitsRef.current.set(waitKey, waitPromise);
    try {
      return await waitPromise;
    } finally {
      if (manifestWaitsRef.current.get(waitKey) === waitPromise) {
        manifestWaitsRef.current.delete(waitKey);
      }
    }
  }, [studioCommandSessionId]);

  const refreshStudioManifest = useCallback(async (options = {}) => {
    const force = options?.force === true;
    const isRecovery = options?.recovery === true;
    if (manifestRefreshInFlightRef.current) {
      return manifestRefreshInFlightRef.current;
    }

    const MANIFEST_FRESH_TTL_MS = 5 * 60 * 1000;
    const pluginLive = Boolean(studio?.pluginConnected);
    const canQueuePluginManifest = pluginLive && studioManifestSupported && Boolean(studioCommandSessionId);

    const refreshPromise = (async () => {
      setStudioBusy(true);
      setStudioConflict(null);
      let previousRevision = "";
      try {
        let previousStatus = null;
        try {
          const previous = await getStudioManifestStatus({
            sessionId: studioCommandSessionId,
          });
          previousStatus = previous.status || null;
          previousRevision = previous.status?.lastCompleteRevision || previous.status?.activeRevision || "";
        } catch (_) {
          previousRevision = "";
        }

        // Cache-first: if a complete revision already exists and is recent, load
        // it from the backend instead of re-indexing the live place. Only an
        // explicit Rescan (force) or a stale/absent revision triggers a live
        // get_project_manifest. This stops the manifest from being rebuilt on
        // every connect.
        const lastCompleteAt = Number(previousStatus?.lastCompleteAt || 0);
        const isFresh =
          Boolean(previousStatus?.lastCompleteRevision) &&
          !previousStatus?.conflicted &&
          (!lastCompleteAt || Date.now() - lastCompleteAt < MANIFEST_FRESH_TTL_MS);

        if (!force && isFresh) {
          const items = await fetchManifestPage(
            previousStatus.lastCompleteRevision || previousStatus.activeRevision || ""
          );
          setStudioManifest(items);
          return;
        }

        // MCP-only sessions must never queue plugin-owned get_project_manifest.
        if (!canQueuePluginManifest) {
          if (!pluginLive) {
            return;
          }
          const data = await getStudioManifest({ sessionId: studioCommandSessionId, limit: 1000 });
          if (data.disconnected) {
            setStudioManifest([]);
            return;
          }
          setStudioManifest(data.manifest?.items || []);
          return;
        }

        await queueStudioTool({
          type: "get_project_manifest",
          payload: { maxDepth: 24, maxInstances: 10000, pageSize: 500, includeSource: false },
          sessionId: studioCommandSessionId,
          label: force ? "Rescan Studio project" : "Refresh Studio manifest",
          applyMode: "unrestricted_dev",
        });
        const status = await waitForManifestCompletion(previousRevision);
        const items = await fetchManifestPage(status.lastCompleteRevision || status.activeRevision || "");
        setStudioManifest(items);
      } catch (err) {
        const conflictCode = String(err?.code || "");
        const isConflict =
          conflictCode === "STUDIO_MANIFEST_CONFLICTED" ||
          /project index conflicted|manifest revision .+ conflicted|overlapping[_ ]canonical/i.test(
            String(err?.message || "")
          );
        const recoveryKey = `${studioCommandSessionId || "none"}:${previousRevision || "none"}`;
        if (
          isConflict &&
          !isRecovery &&
          !manifestRecoveryAttemptedRef.current.has(recoveryKey)
        ) {
          manifestRecoveryAttemptedRef.current.add(recoveryKey);
          setStudioBusy(false);
          manifestRefreshInFlightRef.current = null;
          return refreshStudioManifest({ force: true, recovery: true });
        }
        notify?.({
          message: isConflict
            ? "Studio's project index got out of sync while scanning. Rescan the project and try again."
            : (err?.message || "Could not refresh Studio manifest"),
          type: "error",
        });
      } finally {
        setStudioBusy(false);
      }
    })();

    manifestRefreshInFlightRef.current = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      if (manifestRefreshInFlightRef.current === refreshPromise) {
        manifestRefreshInFlightRef.current = null;
      }
    }
  }, [
    fetchManifestPage,
    notify,
    studio?.pluginConnected,
    studioCommandSessionId,
    studioManifestSupported,
    waitForManifestCompletion,
  ]);

  useEffect(() => {
    const sessionId = studioCommandSessionId;
    // Plugin-owned manifest only — never auto-queue against MCP-only sessions.
    if (!sessionId || !studio?.pluginConnected || !studioManifestSupported) return;

    const autoRefreshKey = `${sessionId}:plugin-live`;
    if (autoManifestRefreshKeyRef.current === autoRefreshKey) return;
    autoManifestRefreshKeyRef.current = autoRefreshKey;

    refreshStudioManifest().catch(() => {
      autoManifestRefreshKeyRef.current = "";
    });
  }, [refreshStudioManifest, studio?.pluginConnected, studioCommandSessionId, studioManifestSupported]);

  const studioResults = useMemo(() => {
    const query = studioSearch.trim().toLowerCase();
    return (studioManifest || [])
      .filter((item) => !query || `${item.canonicalPath || item.path} ${item.className}`.toLowerCase().includes(query))
      .slice(0, 200);
  }, [studioManifest, studioSearch]);

  const studioScriptCount = useMemo(
    () =>
      (studioManifest || []).filter((item) =>
        ["Script", "LocalScript", "ModuleScript"].includes(String(item?.className || ""))
      ).length,
    [studioManifest]
  );

  const openStudioScript = useCallback(async (item) => {
    const path = item?.canonicalPath || item?.path;
    if (!path) return;
    const existingId = `studio:${path}`;
    const existing = studioFiles.find((file) => file.id === existingId);
    if (existing) {
      setActiveStudioFileId(existing.id);
      return;
    }
    setStudioBusy(true);
    setStudioConflict(null);
    try {
      const queued = await queueStudioTool({
        type: "read_script",
        payload: { paths: [path], maxChars: 200000 },
        sessionId: studioCommandSessionId,
        label: `Read ${path}`,
        applyMode: "unrestricted_dev",
      });
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") throw new Error(command.error || "Studio read failed");
      const script = command.result?.scripts?.[0];
      if (!script || script.error) throw new Error(script?.error || "Script source unavailable");
      const nextFile = toStudioFile(script);
      setStudioFiles((prev) => [...prev, nextFile]);
      setActiveStudioFileId(nextFile.id);
    } catch (err) {
      notify?.({ message: err?.message || "Could not open Studio script", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [notify, studioCommandSessionId, studioFiles, toStudioFile]);

  const studioArtifact = useMemo(() => {
    if (!studioFiles.length) return workspace.activeArtifact;
    const dirtyCount = studioFiles.filter((file) => file.dirty).length;
    return {
      id: "studio-live",
      title: "Studio live workspace",
      summary: dirtyCount ? `${dirtyCount} unsaved Studio edit(s)` : "Live Studio files",
      files: studioFiles,
      dirtyCount,
    };
  }, [studioFiles, workspace.activeArtifact]);

  const artifactFileCount = studioArtifact?.files?.length || 0;
  useEffect(() => {
    if (
      previousArtifactFileCountRef.current !== null
      && artifactFileCount > previousArtifactFileCountRef.current
      && activeDockPanel !== "files"
      && activeDockPanel !== "code"
    ) {
      setHasUnseenArtifact(true);
    }
    previousArtifactFileCountRef.current = artifactFileCount;
  }, [activeDockPanel, artifactFileCount]);

  const studioActiveFile = useMemo(() => {
    if (!studioFiles.length) return workspace.activeFile;
    return studioFiles.find((file) => file.id === activeStudioFileId) || studioFiles[0] || null;
  }, [activeStudioFileId, studioFiles, workspace.activeFile]);

  const handleStudioFileChange = useCallback((_artifactId, _fileId, content) => {
    if (studioFiles.length) {
      setStudioFiles((prev) => prev.map((file) => (
        file.id === _fileId
          ? { ...file, content, dirty: content !== file.originalContent, status: content !== file.originalContent ? "edited" : "synced" }
          : file
      )));
    } else {
      workspace.updateFileContent(_artifactId, _fileId, content);
    }
  }, [studioFiles.length, workspace]);

  const refreshStudioFile = useCallback(async (file) => {
    if (!file?.path) return;
    setStudioBusy(true);
    try {
      const queued = await queueStudioTool({
        type: "read_script",
        payload: { paths: [file.path], maxChars: 200000 },
        sessionId: studioCommandSessionId,
        label: `Refresh ${file.path}`,
        applyMode: "unrestricted_dev",
      });
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") throw new Error(command.error || "Studio refresh failed");
      const script = command.result?.scripts?.[0];
      if (!script || script.error) throw new Error(script?.error || "Script source unavailable");
      const refreshed = toStudioFile(script);
      setStudioFiles((prev) => prev.map((entry) => (entry.id === file.id ? refreshed : entry)));
      setStudioConflict((prev) => (prev?.fileId === file.id ? null : prev));
    } catch (err) {
      notify?.({ message: err?.message || "Could not refresh Studio file", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [notify, studioCommandSessionId, toStudioFile]);

  const saveStudioFile = useCallback(async (file, options = {}) => {
    if (!file?.path) return;
    setStudioBusy(true);
    try {
      const queued = await queueStudioTool({
        type: "write_script",
        payload: {
          path: file.path,
          className: file.className || "ModuleScript",
          source: options.sourceOverride ?? file.content ?? "",
          expectedSourceHash: options.overrideSourceHash ?? file.sourceHash ?? "",
          createParents: false,
          snapshot: true,
        },
        sessionId: studioCommandSessionId,
        label: `Save ${file.path}`,
        applyMode: "unrestricted_dev",
      });
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") {
        if (command.result?.code === "source_conflict" || command.result?.error?.code === "source_conflict") {
          const read = await queueStudioTool({
            type: "read_script",
            payload: { paths: [file.path], maxChars: 200000 },
            sessionId: studioCommandSessionId,
            label: `Read conflict ${file.path}`,
            applyMode: "unrestricted_dev",
          });
          const current = await pollStudioCommand(read.commandId);
          const latestScript = current.result?.scripts?.[0] || {};
          setStudioConflict({
            fileId: file.id,
            path: file.path,
            baseSource: file.originalContent || "",
            localSource: file.content || "",
            studioSource: latestScript.source || "",
            latestSourceHash: latestScript.sourceHash || "",
            onKeepStudio: () => {
              setStudioFiles((prev) => prev.map((entry) => (
                entry.id === file.id
                  ? {
                    ...entry,
                    content: latestScript.source || "",
                    originalContent: latestScript.source || "",
                    sourceHash: latestScript.sourceHash || entry.sourceHash,
                    dirty: false,
                    status: "synced",
                  }
                  : entry
              )));
              setStudioConflict(null);
            },
            onOverwriteStudio: () => saveStudioFile(file, {
              overrideSourceHash: latestScript.sourceHash || "",
              sourceOverride: file.content || "",
            }),
            onRetryWithLatest: () => saveStudioFile(file, {
              overrideSourceHash: latestScript.sourceHash || "",
              sourceOverride: file.content || "",
            }),
            onApplyMerge: (mergeSource) => saveStudioFile(file, {
              overrideSourceHash: latestScript.sourceHash || "",
              sourceOverride: mergeSource,
            }),
          });
          throw new Error("Studio source conflict detected");
        }
        throw new Error(command.error || "Studio save failed");
      }
      const nextSource = options.sourceOverride ?? file.content ?? "";
      setStudioFiles((prev) => prev.map((entry) => (
        entry.id === file.id
          ? {
            ...entry,
            content: nextSource,
            originalContent: nextSource,
            sourceHash: command.result?.sourceHash || entry.sourceHash,
            dirty: false,
            status: "synced",
          }
          : entry
      )));
      setStudioConflict((prev) => (prev?.fileId === file.id ? null : prev));
      notify?.({ message: "Saved to Studio", type: "success" });
    } catch (err) {
      notify?.({ message: err?.message || "Could not save to Studio", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [notify, studioCommandSessionId]);

  const saveAllStudioFiles = useCallback(async (files) => {
    for (const file of files.filter((entry) => entry.dirty)) {
      // Sequential saves preserve the expected hash per file.
      // eslint-disable-next-line no-await-in-loop
      await saveStudioFile(file);
    }
  }, [saveStudioFile]);

  const closeStudioFile = useCallback((fileId) => {
    setStudioFiles((prev) => {
      const next = prev.filter((file) => file.id !== fileId);
      if (!next.find((file) => file.id === activeStudioFileId)) {
        setActiveStudioFileId(next[0]?.id || null);
      }
      return next;
    });
    setStudioConflict((prev) => (prev?.fileId === fileId ? null : prev));
  }, [activeStudioFileId]);

  const revertStudioFile = useCallback((file) => {
    if (!file) return;
    setStudioFiles((prev) => prev.map((entry) => (
      entry.id === file.id
        ? { ...entry, content: entry.originalContent || "", dirty: false, status: "synced" }
        : entry
    )));
    setStudioConflict((prev) => (prev?.fileId === file.id ? null : prev));
  }, []);

  const revertAllStudioFiles = useCallback(() => {
    setStudioFiles((prev) => prev.map((file) => ({
      ...file,
      content: file.originalContent || "",
      dirty: false,
      status: "synced",
    })));
    setStudioConflict(null);
  }, []);

  const requireUser = useCallback((fallback, actionType = PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, source = "workspace_gate") => {
    if (!user) {
      handleAuthRequired?.(actionType, source);
      return false;
    }
    if (typeof fallback === "function") fallback();
    return true;
  }, [user, handleAuthRequired]);

  const requireStarterOrAbove = useCallback((reason, next) => {
    if (!requireUser()) return false;
    if (!isStarterOrAbove) {
      starterPromo?.notifyStarterGate(reason || "This feature");
      return false;
    }
    if (typeof next === "function") next();
    return true;
  }, [requireUser, isStarterOrAbove, starterPromo]);

  const onRefine = (m) => {
    if (!requireStarterOrAbove("Refinement & Iteration")) return;
    handleStartRefine(m);
  };

  const invokeTaskAction = (operation) => {
    Promise.resolve()
      .then(operation)
      .catch((err) => {
        notify?.({
          message: err?.message || "The durable task could not be updated.",
          type: "error",
        });
      });
  };

  const taskSubmissionOptions = useMemo(() => ({
    projectId: currentProjectId,
    studioConnected: Boolean(studio?.connected),
    studioTarget: studio?.placePreference || null,
    studioTargetPreference: studio?.placePreference || null,
    targeting: {
      projectId: currentProjectId || null,
      studioConnected: Boolean(studio?.connected),
      studioTarget: studio?.placePreference || null,
    },
    activeTaskId: taskRuntime.taskId || "",
    showPlan: chat.activeMode === "plan",
    onTaskAccepted: taskRuntime.selectTask,
  }), [
    chat.activeMode,
    currentProjectId,
    studio?.connected,
    studio?.placePreference,
    taskRuntime.selectTask,
    taskRuntime.taskId,
  ]);

  const handleAgentPromptSubmit = useCallback((event, overridePromptOrOptions = null, maybeOptions = {}) => {
    const overrideIsPrompt = typeof overridePromptOrOptions === "string";
    const overridePrompt = overrideIsPrompt ? overridePromptOrOptions : null;
    const planSubmissionOptions = overrideIsPrompt
      ? (maybeOptions && typeof maybeOptions === "object" ? maybeOptions : {})
      : (overridePromptOrOptions && typeof overridePromptOrOptions === "object"
        ? overridePromptOrOptions
        : {});
    return handlePromptSubmit(event, overridePrompt, {
      ...taskSubmissionOptions,
      ...planSubmissionOptions,
    });
  }, [handlePromptSubmit, taskSubmissionOptions]);

  const onStartRefineCommand = useCallback(() => {
    if (!requireStarterOrAbove("Refinement & Iteration")) return;
    const latestRefineable = [...(chat.messages || [])]
      .reverse()
      .find((message) => message?.role === "assistant" && messageHasRefineableFiles(message));
    const target = buildRefineTargetFromWorkspace(
      workspace.projectArtifactSnapshot,
      latestRefineable || null
    );
    if (!target) {
      notify?.({
        message: "Nothing to refine yet. Generate a project first, then use @refine.",
        type: "info",
      });
      return;
    }
    handleStartRefine(target);
  }, [
    chat.messages,
    handleStartRefine,
    notify,
    requireStarterOrAbove,
    workspace.projectArtifactSnapshot,
  ]);

  const handleRetryMessage = useCallback((payload) => {
    const nextPrompt = String(
      (typeof payload === "string" ? payload : payload?.prompt) || ""
    ).trim();
    if (!nextPrompt) return undefined;
    const message = typeof payload === "object" && payload ? payload.message : null;
    const sourceUserMessage = typeof payload === "object" && payload
      ? payload.sourceUserMessage
      : null;
    const pivotMessage = message?.id ? message : null;
    const retryAttachments = pivotMessage?.role === "user"
      ? (Array.isArray(pivotMessage.attachments) ? pivotMessage.attachments : [])
      : (Array.isArray(sourceUserMessage?.attachments) ? sourceUserMessage.attachments : []);
    const rewindMode = pivotMessage?.role === "assistant" ? "replace" : "after";
    return handlePromptSubmit(null, nextPrompt, {
      ...taskSubmissionOptions,
      attachmentsOverride: retryAttachments,
      ...(pivotMessage?.id
        ? {
            rewindFromMessageId: pivotMessage.id,
            rewindMode,
          }
        : {}),
    });
  }, [handlePromptSubmit, taskSubmissionOptions]);

  const handleAgentApprovePlan = useCallback((message) => {
    return onApprovePlan(message, taskSubmissionOptions);
  }, [onApprovePlan, taskSubmissionOptions]);

  const handleAgentClarifySubmit = useCallback((message, answers) => {
    return onClarifySubmit(message, answers, taskSubmissionOptions);
  }, [onClarifySubmit, taskSubmissionOptions]);

  const handleStopActiveWork = useCallback(() => {
    if (unified.cancelCurrentFlow?.()) return;

    const currentAgent = activeAgentRuntime.agents.find(
      (agent) => agent.chatId === chat.currentChatId
    );
    const currentRuns = [
      ...(currentAgent?.currentRun ? [currentAgent.currentRun] : []),
      ...(Array.isArray(currentAgent?.runs) ? currentAgent.runs : []),
    ];
    const currentRun = [...currentRuns].reverse().find((run) => {
      const status = String(run?.status || run?.state || "").toLowerCase();
      return !status || (!TERMINAL_AGENT_STATES.has(status) && status !== "canceled");
    });
    const runId =
      unified.pendingMessage?.runId
      || currentRun?.runId
      || currentRun?.id;

    if (!runId) {
      notify?.({
        message: "This run is already stopping or has just finished.",
        type: "info",
      });
      return;
    }

    Promise.resolve(activeAgentRuntime.cancelRun(runId)).catch((error) => {
      notify?.({
        message: error?.message || "The agent run could not be stopped.",
        type: "error",
      });
    });
  }, [
    activeAgentRuntime,
    chat.currentChatId,
    notify,
    unified,
  ]);

  const agentChat = (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentChatPanel
          currentChatId={chat.currentChatId}
          chatTitle={chat.currentChatMeta?.title || "New chat"}
          projectTitle={
            projectContext?.name ||
            projectContext?.title ||
            studio?.placePreference?.placeName ||
            studio?.placePreference?.name ||
            "Workspace"
          }
          projectId={currentProjectId}
          messages={chat.messages}
          pendingMessage={unified.pendingMessage}
          pendingMessages={unified.pendingMessages}
          generationStage={unified.generationStage}
          user={user}
          profile={roblox?.connected ? roblox?.status?.connection?.profile || null : null}
          activeMode={chat.activeMode}
          isBusy={unified.isGenerating}
          onApprovePlan={handleAgentApprovePlan}
          onPlanTaskAccepted={taskRuntime.selectTask}
          executionTask={taskRuntime.task}
          onClarifySubmit={handleAgentClarifySubmit}
          onEditPlan={handleEditPlan}
          onRefine={onRefine}
          onStartRefine={onStartRefineCommand}
          onOpenArtifact={handleOpenArtifact}
          onQuickStart={handleQuickStart}
          onRenameChat={(title) => chat.handleRenameChat(chat.currentChatId, title)}
          onOpenNavigation={() => setSidebarOpen(true)}
          onRetryMessage={handleRetryMessage}
          notify={notify}
          prompt={prompt}
          setPrompt={setPrompt}
          setRewindTarget={setRewindTarget}
          attachments={attachments}
          setAttachments={setAttachments}
          robloxImageUploading={robloxImageUploading}
          robloxImageUploads={robloxImageUploads}
          onSubmit={handleAgentPromptSubmit}
          onStop={handleStopActiveWork}
          refineTarget={refineTarget}
          onCancelRefine={cancelRefine}
          rewindTarget={rewindTarget}
          onCancelRewind={cancelRewind}
          onFileUpload={handleFileUpload}
          onImprovePrompt={handleImprovePrompt}
          isImproving={isImproving}
          tokensLeft={totalRemaining}
          tokensLimit={subLimit}
          resetsAt={resetsAt}
          planKey={planKey}
          unlimitedTokens={unlimitedTokens}
          devOverride={devOverride}
          dailyUsage={dailyUsage}
          includedUsage={includedUsage}
          premiumBalance={premiumBalance}
          isFreeUsagePlan={isFreeUsagePlan}
          billingLoading={billingLoading}
          billingError={billingError}
          composerLocked={false}
          themePrimary={currentTheme.primary}
          themeSecondary={currentTheme.secondary}
          onModeChange={(m) => chat.updateChatMode(chat.currentChatId, m)}
          artifact={workspace.activeArtifact}
          agentRun={workspace.agentRun}
          onApproveStep={handleApproveStep}
          onSelectStudioTarget={handleSelectStudioTarget}
          onRestoreRun={handleRestoreRun}
          approvingStepId={studio?.approvingStepId}
          selectingStudioTargetId={studio?.selectingStudioTargetId}
          restoringRun={studio?.restoringRun}
          studioConnected={studio?.connected}
          studioConnectionType={studio?.connectionType}
          studioConnectionState={studio?.connectionState}
          studioCapabilities={studioCapabilities}
          studioCollaborators={studio?.collaborators}
          studioLoading={studio?.loading}
          studioEnabled={studio?.enabled}
          onStudioEnabledChange={handleStudioEnabledChange}
          studioApplyMode={studio?.applyMode}
          onStudioApplyModeChange={handleStudioApplyModeChange}
          studioAutoPushEnabled={studio?.autoPushEnabled}
          onStudioAutoPushEnabledChange={handleStudioAutoPushEnabledChange}
          studioAutoPushPolicy={studio?.autoPushPolicy}
          onStudioAutoPushPolicyChange={handleStudioAutoPushPolicyChange}
          studioAutoPushAuthorized={studioAutoPushAuthorized}
          studioPlacePreference={studio?.placePreference || null}
          studioPlaceOptions={studio?.placeOptions || []}
          studioPlacePickerOpen={studio?.placePickerOpen}
          onStudioPlacePickerOpenChange={studio?.setPlacePickerOpen}
          onSelectStudioPlace={handleSelectStudioTarget}
          robloxConnected={roblox?.connected}
          robloxLoading={roblox?.loading}
          robloxSelectedCreator={roblox?.selectedCreator}
          robloxUploadAvailable={roblox?.uploadAvailable}
          robloxUploadState={roblox?.uploadState}
          robloxUploadDisabledReason={roblox?.uploadDisabledReason}
          robloxAssetUploadsEnabled={roblox?.assetUploadsEnabled}
          robloxAssetProjectId={roblox?.assetProjectId}
          onRobloxAssetUploadsEnabledChange={handleRobloxAssetUploadsEnabledChange}
          robloxAssetLibraryAvailable={roblox?.assetLibraryAvailable}
          robloxAssetLibraryDisabledReason={roblox?.assetLibraryDisabledReason}
          robloxProjectAssets={roblox?.selectedAssets || []}
          onOpenAssetLibrary={handleOpenAssetLibrary}
          assetLibraryOpen={roblox?.assetLibraryOpen}
          onCloseAssetLibrary={handleCloseAssetLibrary}
          onConfirmProjectAssets={handleConfirmProjectAssets}
          onRemoveProjectAsset={handleRemoveProjectAsset}
          projectAssetSaving={roblox?.projectAssetSaving}
          selectedAssetProjectId={roblox?.selectedAssetProjectId}
          robloxStatus={roblox?.status}
      />
    </div>
  );

  const codeWorkspace = studioArtifact?.files?.length ? (
    <CodeWorkspace
      artifact={studioArtifact}
      activeFile={studioActiveFile}
      onSelectFile={(fileId) => {
        if (studioFiles.length) {
          setActiveStudioFileId(fileId);
        } else {
          workspace.openFile(workspace.activeArtifact?.id, fileId);
        }
      }}
      onChangeContent={handleStudioFileChange}
      onRevertEdits={studioFiles.length ? revertAllStudioFiles : workspace.revertArtifactEdits}
      onRevertFile={studioFiles.length ? revertStudioFile : null}
      onRefreshFile={studioFiles.length ? refreshStudioFile : null}
      onCloseFile={studioFiles.length ? closeStudioFile : null}
      onSaveFile={studioFiles.length ? saveStudioFile : null}
      onSaveAllFiles={studioFiles.length ? saveAllStudioFiles : null}
      saving={studioBusy}
      conflict={studioConflict}
      notify={notify}
    />
  ) : (
    <WorkspaceEmptyState
      title="No code to show yet"
      description="Generated and opened Studio scripts will appear here."
    />
  );

  const fileTree = (
    <div className="p-2">
      <CodeFileTree
        artifact={studioFiles.length ? studioArtifact : workspace.activeArtifact}
        activeFileId={studioFiles.length ? studioActiveFile?.id : workspace.activeFile?.id}
        onSelectFile={(fileId) => {
          if (studioFiles.length) {
            setActiveStudioFileId(fileId);
          } else {
            workspace.openFile(workspace.activeArtifact?.id, fileId);
          }
          handleDockPanelChange("code");
        }}
      />
      <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Studio Manifest</div>
          <button
            type="button"
            onClick={() => refreshStudioManifest({ force: true })}
            disabled={studioBusy || !studioManifestSupported}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white disabled:opacity-40"
            title={studioManifestSupported
              ? "Rescan Studio project (re-index the live place)"
              : "Manifest rescan is unavailable for the selected MCP session"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${studioBusy ? "animate-spin" : ""}`} />
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            value={studioSearch}
            onChange={(e) => setStudioSearch(e.target.value)}
            placeholder="Search Studio paths..."
            className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 outline-none"
          />
        </label>
        <div className="space-y-0.5 pr-1">
          {studioResults.map((item) => {
            const isScript = ["Script", "LocalScript", "ModuleScript"].includes(item.className);
            return (
              <button
                key={item.id || item.canonicalPath}
                type="button"
                onClick={() => {
                  if (!isScript) return;
                  openStudioScript(item);
                  handleDockPanelChange("code");
                }}
                disabled={!isScript || studioBusy}
                className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] transition-[border-color,background-color,color,opacity] ${
                  studioActiveFile?.path === (item.canonicalPath || item.path)
                    ? "border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]"
                    : "border-transparent bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06]"
                } disabled:opacity-40`}
                title={item.canonicalPath || item.path}
              >
                <div className="truncate">{item.canonicalPath || item.path}</div>
                <div className="text-[10px] text-gray-600">{item.className}{item.sourceHash ? ` · ${String(item.sourceHash).slice(0, 8)}` : ""}</div>
              </button>
            );
          })}
          {!studioResults.length && (
            <div className="px-2 py-4 text-center text-xs text-gray-600">
              {studioManifestSupported
                ? "No persisted Studio manifest yet."
                : "No place index on MCP sessions — Ask uses live script search instead."}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const activityPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ActiveAgentsTray
        agents={activeAgentRuntime.agents}
        onOpenChat={chat.openChatById}
        onCancelRun={(runId) => {
          Promise.resolve(activeAgentRuntime.cancelRun(runId)).catch((error) => {
            notify?.({
              message: error?.message || "The agent run could not be cancelled.",
              type: "error",
            });
          });
        }}
      />
      {taskRuntime.task ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-subtle">
          <TaskProgressPanel
            task={taskRuntime.task}
            events={taskRuntime.events}
            connectionState={taskRuntime.connectionState}
            error={taskRuntime.error}
            busyAction={taskRuntime.busyAction}
            onRetry={() => invokeTaskAction(taskRuntime.retry)}
            onCancel={() => invokeTaskAction(taskRuntime.cancel)}
            onAmend={(payload) => invokeTaskAction(() => taskRuntime.amend(payload))}
            onApprove={(payload) => invokeTaskAction(() => taskRuntime.approve(payload))}
          />
        </div>
      ) : (
        <WorkspaceEmptyState
          icon={Activity}
          title="No active run"
          description="Agent runs, task progress, and approvals will appear here."
        />
      )}
    </div>
  );

  const renderDockPanel = (panelId) => {
    if (panelId === "files") {
      return <div className="h-full overflow-y-auto scrollbar-subtle">{fileTree}</div>;
    }
    if (panelId === "code") return codeWorkspace;
    if (panelId === "activity") return activityPanel;
    if (panelId === "assets") {
      return (
        <WorkspaceAssetsPanel
          user={user}
          planKey={planKey}
          devOverride={devOverride}
          roblox={roblox}
          projectId={roblox?.selectedAssetProjectId || currentProjectId}
          onAttached={roblox?.refreshProjectAssets}
          onAuthRequired={handleAuthRequired}
          notify={notify}
        />
      );
    }
    if (panelId === "details") {
      return (
        <WorkspaceDetailsPanel
          view={detailsView}
          onViewChange={setDetailsView}
          projectContext={projectContext}
          artifact={workspace.activeArtifact}
          agentRun={workspace.agentRun}
          onApproveStep={handleApproveStep}
          onSelectStudioTarget={handleSelectStudioTarget}
          onRestoreRun={handleRestoreRun}
          approvingStepId={studio?.approvingStepId}
          selectingStudioTargetId={studio?.selectingStudioTargetId}
          restoringRun={studio?.restoringRun}
          notify={notify}
        />
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 overflow-hidden" role="application" aria-label="Nexus AI Workspace">
      <div ref={aiPageRef} className="ai-page relative flex flex-col overflow-hidden font-sans">
      <div
        className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full blur-[120px] transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.primary}14` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[45%] w-[45%] rounded-full blur-[140px] transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.secondary}10` }}
        aria-hidden="true"
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: projects and chats */}
        {generatorMode === "agent_build" && (
          <>
            <button
              type="button"
              aria-label="Close project sidebar"
              className="nexus-project-sidebar-backdrop"
              data-open={sidebarOpen}
              tabIndex={sidebarOpen ? 0 : -1}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="nexus-project-sidebar z-40 flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-white/[.06] bg-[#0d0d0f]"
              data-open={sidebarOpen}
              aria-label="Project sidebar"
              aria-hidden={!sidebarOpen}
            >
              <SidebarContent
                scripts={scripts}
                currentChatId={chat.currentChatId}
                currentProjectId={currentProjectId || null}
                studioConnected={Boolean(studio?.connected)}
                studioPlacePreference={studio?.placePreference}
                generatingChatIds={unified.generatingChatIds}
                activeAgentStatusByChat={activeAgentStatusByChat}
                setCurrentScriptId={scriptManager.setCurrentScriptId}
                onSelectChat={(id) => {
                  chat.openChatById(id);
                  setActiveTab("chat");
                  if (window.innerWidth < 1200) setSidebarOpen(false);
                }}
                onDeleteChat={chat.handleDeleteChat}
                onRenameChat={chat.handleRenameChat}
                onMoveChat={chat.handleMoveChat}
                user={user}
                authReady={authReady}
                notify={notify}
                isMobile={typeof window !== "undefined" && window.innerWidth < 1200}
                onSelect={() => setSidebarOpen(false)}
                onCollapse={() => setSidebarOpen(false)}
              />
            </aside>
          </>
        )}

        {/* CENTER: Studio agent chat */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SiteHeader
          variant="workspace"
          robloxStatusOverride={roblox?.status ?? null}
          robloxLoadingOverride={Boolean(roblox?.loading)}
            workspaceLeft={(
              <>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`shrink-0 rounded-xl p-2 transition-[background-color,color] ${sidebarOpen ? "bg-[#00f5d4]/10 text-[#00f5d4]" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  title="Toggle sidebar"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="hidden h-4 w-px bg-white/10 xl:block" aria-hidden="true" />
                <div data-tour="mode-switcher" className="hidden shrink-0 md:inline-flex">
                  <Segmented
                    size="sm"
                    options={[
                      { id: "quick_script", label: "Quick", icon: FileCode2 },
                      { id: "agent_build", label: "Agent Build", icon: Bot },
                    ]}
                    value={generatorMode}
                    onChange={(mode) => setGeneratorMode(mode, "mode_control")}
                  />
                </div>
                <div className="hidden h-4 w-px bg-white/10 xl:block" aria-hidden="true" />
                {generatorMode === "agent_build" && (
                  <>
                    <div className="shrink-0">
                      <ModelSwitcher
                        value={settings.modelVersion}
                        isPremium={isPremium}
                        isStarterOrAbove={isStarterOrAbove}
                        onChange={(id) => updateSettings({ modelVersion: id })}
                        onProNudge={(reason) => {
                          if (!requireUser()) return;
                          setProNudgeReason(reason || "Premium AI Models");
                          setShowProNudge(true);
                        }}
                        onStarterNudge={(reason) => {
                          if (!requireUser()) return;
                          starterPromo?.notifyStarterGate(reason || "Model Selection");
                        }}
                      />
                    </div>
                    <div className="hidden h-4 w-px bg-white/10 xl:block" aria-hidden="true" />
                  </>
                )}
                <div data-tour="studio-pair" className="shrink-0">
                  <StudioPairControl
                    connection={studio}
                    connected={studio?.connected}
                    loading={studio?.loading}
                    refresh={studio?.refresh}
                    notify={notify}
                    requireUser={(next) => requireUser(next, PENDING_AUTH_ACTIONS.STUDIO_CONNECTION, "studio_pair_control")}
                  />
                </div>
              </>
            )}
            workspaceRight={(
              <>
                {generatorMode === "agent_build" ? (
                  <div className="hidden shrink-0 opacity-75 transition-opacity hover:opacity-100 2xl:block">
                    <ProjectContextStatus
                      context={projectContext}
                      plan={planKey}
                      studioConnected={Boolean(studio?.connected)}
                      studioConnectionType={studio?.connectionType || null}
                      studioManifestCount={studioScriptCount}
                      studioManifestSupported={studioManifestSupported}
                      onViewStructure={() => {
                        setDetailsView("architecture");
                        handleDockPanelChange("details");
                      }}
                    />
                  </div>
                ) : (
                  <div className="hidden text-right text-[11px] font-semibold text-gray-500 sm:block">
                    No plan approval in Quick
                  </div>
                )}
              </>
            )}
          />

          {generatorMode === "quick_script" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div data-tour="mobile-mode-switcher" className="shrink-0 border-b border-white/5 bg-black/20 px-4 py-2 md:hidden">
                <Segmented
                  fullWidth
                  size="sm"
                  options={[
                    { id: "quick_script", label: "Quick", icon: FileCode2 },
                    { id: "agent_build", label: "Agent Build", icon: Bot },
                  ]}
                  value={generatorMode}
                  onChange={(mode) => setGeneratorMode(mode, "mode_control")}
                />
              </div>
              <QuickScriptWorkspace
                prompt={prompt}
                setPrompt={setPrompt}
                quickScript={quickScript}
                user={user}
                onGenerate={() => runQuickScript(prompt, { source: "composer" })}
                onRetry={() => runQuickScript(quickScript?.prompt || prompt, { source: quickScript?.source || "retry", retry: true })}
                onCopy={handleQuickScriptCopy}
                onSave={handleQuickScriptSave}
                onExport={handleQuickScriptExport}
                onStudioPush={handleQuickScriptStudioPush}
                onContinueEditing={handleQuickScriptContinueEditing}
                onOpenAgentBuild={handleQuickScriptOpenAgentBuild}
                onImprovePrompt={handleImprovePrompt}
                isImproving={isImproving}
              />
            </div>
          ) : (
            <WorkspaceShell
              activePanel={activeDockPanel}
              onPanelChange={handleDockPanelChange}
              drawerWidth={drawerWidth}
              onDrawerWidthChange={setDrawerWidth}
              panelBadges={{
                files: hasUnseenArtifact,
                code: hasUnseenArtifact,
                activity:
                  activeAgentRuntime.agents.length
                  || Boolean(taskRuntime.task && !taskRuntime.isTerminal),
              }}
              renderPanel={renderDockPanel}
            >
              {agentChat}
            </WorkspaceShell>
          )}
        </main>
      </div>

      <CodeDrawer
        open={codeDrawerOpen}
        onClose={() => setCodeDrawerOpen(false)}
        code={codeDrawerData.code}
        title={codeDrawerData.title}
        explanation={codeDrawerData.explanation}
        onSaveScript={async (title, code) => {
          await scriptManager.handleCreateScript(
            title,
            code,
            "logic",
            chat.currentChatId,
            chat.currentChatMeta?.projectId || null
          );
          notify({ message: "Script saved to creations", type: "success" });
          track("project_saved", { output_type: "script" });
        }}
      />

      <SignInNudgeModal
        isOpen={showSignInNudge}
        onClose={() => setShowSignInNudge(false)}
        reason={signInNudgeReason}
      />
      <ProNudgeModal isOpen={showProNudge} onClose={() => setShowProNudge(false)} reason={proNudgeReason} />
      <StarterPromoModal
        isOpen={starterPromo?.isOpen}
        blocking={starterPromo?.blocking}
        trigger={starterPromo?.trigger}
        dailyUsagePercent={starterPromo?.dailyUsagePercent}
        checkoutBusy={starterPromo?.checkoutBusy}
        setCheckoutBusy={starterPromo?.setCheckoutBusy}
        onClose={starterPromo?.handleClose}
        onDismiss={starterPromo?.handleClose}
        onDismissLong={starterPromo?.handleDismissLong}
      />

      <TutorialOverlay
        activeStep={tutorial.activeStep}
        isActive={tutorial.isActive}
        nextStep={tutorial.nextStep}
        prevStep={tutorial.prevStep}
        skipTutorial={tutorial.skipTutorial}
      />

      {currentToast && (
        <div className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[120] sm:inset-x-auto sm:bottom-8 sm:right-8" role="status" aria-live="polite">
          <NotificationToast
            key={currentToast.id}
            message={currentToast.count > 1 ? `${currentToast.message} (x${currentToast.count})` : currentToast.message}
            type={currentToast.type}
            duration={currentToast.duration}
            cta={currentToast.cta}
            secondary={currentToast.secondary}
            onClose={() => dismissToast(currentToast.id)}
          />
        </div>
      )}

      </div>
    </div>
  );
}
