import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, FolderTree, MessageSquare, FileCode2, ClipboardList, Search, RefreshCw, Bot } from "lib/icons";

import SidebarContent from "../../components/SidebarContent";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import StarterPromoModal from "../../components/StarterPromoModal";
import NotificationToast from "../../components/NotificationToast";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import StudioPairControl from "../../components/ai/StudioPairControl";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import SiteHeader from "../../components/site/SiteHeader";
import { AI_EVENTS } from "../../lib/aiEvents";
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
import BuildDetailsPanel from "../../components/ai/workspace/BuildDetailsPanel";
import RobloxDecalUploadDropdown from "../../components/ai/workspace/RobloxDecalUploadDropdown";
import useTaskRuntime from "../../hooks/useTaskRuntime";
import useActiveAgents from "../../hooks/useActiveAgents";
import QuickScriptWorkspace from "./QuickScriptWorkspace";
import { getStudioCommand, getStudioManifest, getStudioManifestStatus, queueStudioTool } from "../../lib/studioBridgeApi";
import { PENDING_AUTH_ACTIONS } from "../../lib/pendingAuthAction";
import { getStudioSessionId } from "../../lib/studioConnection";
import TutorialOverlay from "../../components/onboarding/TutorialOverlay";
import { useTutorial } from "../../components/onboarding/useTutorial";
import useAiPageZoom, { AI_PAGE_ZOOM_OPTIONS, DEFAULT_AI_PAGE_ZOOM } from "../../hooks/useAiPageZoom";

const MOBILE_TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "code", label: "Code", icon: FileCode2 },
  { id: "details", label: "Details", icon: ClipboardList },
];

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
    isMobile,
    sidebarOpen,
    mobileTab,
    generatorMode,
    quickScript,
    prompt,
    isImproving,
    refineTarget,
    attachments,
    robloxImageUploading,
    robloxImageUploads,
    scripts,
    projectContext,
    architecturePanelOpen,
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
    setMobileTab,
    setActiveTab,
    setPrompt,
    setGeneratorMode,
    setAttachments,
    setArchitecturePanelOpen,
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

  const [leftView, setLeftView] = useState("files");
  const tutorial = useTutorial();
  const aiPageRef = useRef(null);
  const { zoom: aiPageZoom, setZoom: setAiPageZoom } = useAiPageZoom(aiPageRef, DEFAULT_AI_PAGE_ZOOM);

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

  const requireUser = (fallback, actionType = PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, source = "workspace_gate") => {
    if (!user) {
      handleAuthRequired?.(actionType, source);
      return false;
    }
    if (typeof fallback === "function") fallback();
    return true;
  };

  const requireStarterOrAbove = (reason, next) => {
    if (!requireUser()) return false;
    if (!isStarterOrAbove) {
      starterPromo?.notifyStarterGate(reason || "This feature");
      return false;
    }
    if (typeof next === "function") next();
    return true;
  };

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

  const handleAgentPromptSubmit = useCallback((event, planSubmissionOptions = {}) => {
    return handlePromptSubmit(event, null, {
      ...taskSubmissionOptions,
      ...(planSubmissionOptions && typeof planSubmissionOptions === "object"
        ? planSubmissionOptions
        : {}),
    });
  }, [handlePromptSubmit, taskSubmissionOptions]);

  const handleAgentApprovePlan = useCallback((message) => {
    return onApprovePlan(message, taskSubmissionOptions);
  }, [onApprovePlan, taskSubmissionOptions]);

  const handleAgentClarifySubmit = useCallback((message, answers) => {
    return onClarifySubmit(message, answers, taskSubmissionOptions);
  }, [onClarifySubmit, taskSubmissionOptions]);

  const agentChat = (
    <div className="flex min-h-0 flex-1 flex-col">
      <ActiveAgentsTray
        agents={activeAgentRuntime.agents}
        onOpenChat={chat.openChatById}
        onCancelRun={(runId) => activeAgentRuntime.cancelRun(runId).catch((error) => {
          notify({ message: error?.message || "Could not cancel that run", type: "error" });
        })}
      />
      {taskRuntime.task && (
        <div className="shrink-0 border-b border-white/5 p-3">
          <TaskProgressPanel
            task={taskRuntime.task}
            events={taskRuntime.events}
            connectionState={taskRuntime.connectionState}
            error={taskRuntime.error}
            busyAction={taskRuntime.busyAction}
            onRetry={() => invokeTaskAction(taskRuntime.retry)}
            onCancel={() => invokeTaskAction(taskRuntime.cancel)}
            onApprove={(payload) => invokeTaskAction(() => taskRuntime.approve(payload || {}))}
            onAmend={(instructionOrPayload) => invokeTaskAction(() => taskRuntime.amend(instructionOrPayload))}
            className="max-h-[42vh] overflow-y-auto scrollbar-subtle"
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <AgentChatPanel
          currentChatId={chat.currentChatId}
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
          onClarifySubmit={handleAgentClarifySubmit}
          onEditPlan={handleEditPlan}
          onRefine={onRefine}
          onOpenArtifact={handleOpenArtifact}
          onQuickStart={handleQuickStart}
          notify={notify}
          prompt={prompt}
          setPrompt={setPrompt}
          attachments={attachments}
          setAttachments={setAttachments}
          robloxImageUploading={robloxImageUploading}
          robloxImageUploads={robloxImageUploads}
          onSubmit={handleAgentPromptSubmit}
          refineTarget={refineTarget}
          onCancelRefine={cancelRefine}
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
    </div>
  );

  const codeWorkspace = (
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
          if (isMobile) setMobileTab("code");
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
                  if (isMobile) setMobileTab("code");
                }}
                disabled={!isScript || studioBusy}
                className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] transition-all ${
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
        {/* LEFT: project / artifacts / file tree / history */}
        {generatorMode === "agent_build" && (
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#0D0D0D]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transform transition-all duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 ${sidebarOpen ? "lg:w-80" : "lg:w-0 lg:opacity-0 lg:pointer-events-none"}`}
          aria-label="Project sidebar"
        >
          <div className="flex items-center px-3 py-2.5 border-b border-white/10">
            <Segmented
              fullWidth
              options={[
                { id: "files", label: "Files", icon: FolderTree },
                { id: "history", label: "Chats", icon: MessageSquare },
              ]}
              value={leftView}
              onChange={setLeftView}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {leftView === "files" ? (
              <div className="h-full overflow-y-auto scrollbar-subtle">{fileTree}</div>
            ) : (
              <SidebarContent
                activeTab="chats"
                setActiveTab={() => setActiveTab("chat")}
                scripts={scripts}
                currentChatId={chat.currentChatId}
                generatingChatIds={unified.generatingChatIds}
                activeAgentStatusByChat={activeAgentStatusByChat}
                currentScriptId={scriptManager.currentScriptId}
                setCurrentScriptId={scriptManager.setCurrentScriptId}
                handleCreateScript={scriptManager.handleCreateScript}
                handleRenameScript={scriptManager.handleRenameScript}
                handleDeleteScript={scriptManager.handleDeleteScript}
                currentScript={scriptManager.currentScript}
                versionHistory={scriptManager.versionHistory}
                selectedVersionId={scriptManager.selectedVersionId}
                onSelectChat={(id) => {
                  chat.openChatById(id);
                  setActiveTab("chat");
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                onDeleteChat={chat.handleDeleteChat}
                onRenameChat={chat.handleRenameChat}
                handleClearChat={chat.handleClearChat}
                user={user}
                authReady={authReady}
                notify={notify}
                onVersionView={(ver) => {
                  if (!ver.code) return;
                  controller.handlers.emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                    code: ver.code,
                    title: ver.title || scriptManager.currentScript?.title || "Script",
                    explanation: ver.explanation || "",
                    versionNumber: ver.versionNumber,
                  });
                }}
              />
            )}
          </div>
        </aside>
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
                  className={`shrink-0 p-2 rounded-xl transition-all ${sidebarOpen ? "bg-[#00f5d4]/10 text-[#00f5d4]" : "bg-white/5 text-gray-400 hover:text-white"}`}
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
                <label className="hidden shrink-0 items-center gap-1.5 sm:inline-flex" title="Workspace zoom">
                  <span className="hidden text-[10px] font-black uppercase tracking-widest text-gray-500 2xl:inline">Zoom</span>
                  <select
                    value={String(aiPageZoom)}
                    onChange={(event) => setAiPageZoom(Number(event.target.value))}
                    className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-semibold text-gray-200 outline-none focus-ring"
                    aria-label="Workspace zoom"
                  >
                    {AI_PAGE_ZOOM_OPTIONS.map((value) => (
                      <option key={value} value={String(value)}>
                        {Math.round(value * 100)}%
                      </option>
                    ))}
                  </select>
                </label>
                <div className="hidden h-4 w-px bg-white/10 xl:block" aria-hidden="true" />
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
                  <>
                    <RobloxDecalUploadDropdown
                      user={user}
                      planKey={planKey}
                      devOverride={devOverride}
                      roblox={roblox}
                      projectId={roblox?.selectedAssetProjectId}
                      onAttached={roblox?.refreshProjectAssets}
                      onAuthRequired={handleAuthRequired}
                      notify={notify}
                    />
                    <div className="hidden h-4 w-px bg-white/10 xl:block" aria-hidden="true" />
                    <div className="hidden shrink-0 opacity-75 transition-opacity hover:opacity-100 2xl:block">
                      <ProjectContextStatus
                        context={projectContext}
                        plan={planKey}
                        studioConnected={Boolean(studio?.connected)}
                        studioConnectionType={studio?.connectionType || null}
                        studioManifestCount={studioScriptCount}
                        studioManifestSupported={studioManifestSupported}
                        onViewStructure={() => setArchitecturePanelOpen(true)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="hidden text-right text-[11px] font-semibold text-gray-500 sm:block">
                    No plan approval in Quick
                  </div>
                )}
              </>
            )}
          />

          {/* Desktop center + right; mobile single-pane via tabs */}
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
          <div className="flex-1 min-h-0 flex">
            <div className={`flex-1 min-h-0 min-w-0 ${isMobile ? (mobileTab === "chat" ? "flex pb-16" : "hidden") : "flex"} flex-col`}>
              {agentChat}
            </div>

            {/* Mobile-only file tree + details panes */}
            {isMobile && mobileTab === "files" && (
              <div className="flex-1 min-w-0 overflow-y-auto bg-[#0a0a0a] scrollbar-subtle">{fileTree}</div>
            )}
            {isMobile && mobileTab === "details" && (
              <div className="flex-1 min-w-0 bg-[#0a0a0a]">
                <BuildDetailsPanel
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
              </div>
            )}

            {/* RIGHT: generated code workspace */}
            <div className={`w-full lg:w-[46%] xl:w-[42%] 2xl:w-[38%] lg:min-w-[420px] lg:max-w-[720px] lg:shrink-0 border-l border-white/5 ${isMobile && mobileTab !== "code" ? "hidden" : "flex"} flex-col min-h-0`}>
              {codeWorkspace}
            </div>
          </div>
          )}
        </main>

        {architecturePanelOpen && (
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md h-full shadow-2xl">
            <ProjectArchitecturePanel
              context={projectContext}
              onClose={() => setArchitecturePanelOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile tab bar */}
      {isMobile && generatorMode === "agent_build" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
          {MOBILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = mobileTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMobileTab(t.id)}
                className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 ${active ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
                aria-pressed={active}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

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
