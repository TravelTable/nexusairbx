import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, FolderTree, History, FileCode2, MessageSquare, ClipboardList, Search, RefreshCw, TerminalSquare, Bot } from "lib/icons";

import SidebarContent from "../../components/SidebarContent";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import NotificationToast from "../../components/NotificationToast";
import GameProfileWizard from "../../components/ai/GameProfileWizard";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import StudioPairControl from "../../components/ai/StudioPairControl";
import DailyPromptBadge from "../../components/ai/DailyPromptBadge";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import SiteHeader from "../../components/site/SiteHeader";
import { AI_EVENTS } from "../../lib/aiEvents";
import { Segmented } from "../../components/ui";

import CodeFileTree from "../../components/ai/workspace/CodeFileTree";
import CodeWorkspace from "../../components/ai/workspace/CodeWorkspace";
import AgentChatPanel from "../../components/ai/workspace/AgentChatPanel";
import BuildDetailsPanel from "../../components/ai/workspace/BuildDetailsPanel";
import QuickScriptWorkspace from "./QuickScriptWorkspace";
import { getStudioCommand, getStudioManifest, getStudioManifestStatus, queueStudioTool } from "../../lib/studioBridgeApi";
import { cancelWorkspaceCommand, createWorkspaceCommand, getWorkspaceCommand, streamWorkspaceCommandEvents } from "../../lib/workspaceApi";
import { PENDING_AUTH_ACTIONS } from "../../lib/pendingAuthAction";
import TutorialOverlay from "../../components/onboarding/TutorialOverlay";
import { useTutorial } from "../../components/onboarding/useTutorial";

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
  const { billing, uiState, refs, modules, handlers, studio, roblox } = controller;
  const { planKey, totalRemaining, subLimit, resetsAt, isPremium, unlimitedTokens, devOverride, dailyUsage, includedUsage, isFreeUsagePlan } = billing;
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
  } = uiState;

  const { chat, game, scriptManager, unified, workspace, settings } = modules;

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

  const { chatEndRef } = refs;

  const [leftView, setLeftView] = useState("files");
  const tutorial = useTutorial();

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
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalCwd, setTerminalCwd] = useState("");
  const [terminalCommand, setTerminalCommand] = useState(null);
  const [terminalHistory, setTerminalHistory] = useState(() => {
    try {
      const raw = window.localStorage.getItem("nexusWorkspaceCommandHistory");
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });
  const [terminalHistoryIndex, setTerminalHistoryIndex] = useState(-1);
  const terminalAbortRef = useRef(null);
  const manifestRefreshInFlightRef = useRef(null);
  const autoManifestRefreshKeyRef = useRef("");

  const appendTerminal = useCallback((line, kind = "stdout") => {
    const text = String(line ?? "");
    const normalizedText = kind === "stdout" || kind === "stderr" || text.endsWith("\n")
      ? text
      : `${text}\n`;
    setTerminalLines((prev) => [
      ...prev.slice(-400),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, text: normalizedText },
    ]);
  }, []);

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
        sessionId: studio?.lastAuthorizedSessionId || null,
        revision,
        limit: 1000,
        cursor,
      });
      items.push(...(data.manifest?.items || []));
      nextCursor = data.manifest?.nextCursor || "";
      cursor = nextCursor;
    } while (nextCursor);
    return items;
  }, [studio?.lastAuthorizedSessionId]);

  const waitForManifestCompletion = useCallback(async (previousRevision = "") => {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      let status = null;
      try {
        const data = await getStudioManifestStatus({
          sessionId: studio?.lastAuthorizedSessionId || null,
        });
        status = data.status || null;
      } catch (_) {
        // Transient failure (e.g. no paired session yet); keep polling until ready or timeout.
        status = null;
      }
      const readyRevision = status?.lastCompleteRevision || "";
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
  }, [studio?.lastAuthorizedSessionId]);

  const refreshStudioManifest = useCallback(async () => {
    if (manifestRefreshInFlightRef.current) {
      return manifestRefreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      setStudioBusy(true);
      setStudioConflict(null);
      try {
        let previousRevision = "";
        try {
          const previous = await getStudioManifestStatus({
            sessionId: studio?.lastAuthorizedSessionId || null,
          });
          previousRevision = previous.status?.lastCompleteRevision || previous.status?.activeRevision || "";
        } catch (_) {
          previousRevision = "";
        }
        if (studio?.connected) {
          const queued = await queueStudioTool({
            type: "get_project_manifest",
            payload: { maxDepth: 24, maxInstances: 10000, pageSize: 500, includeSource: false },
            sessionId: studio?.lastAuthorizedSessionId || null,
            label: "Refresh Studio manifest",
            applyMode: "unrestricted_dev",
          });
          appendTerminal(`queued manifest refresh ${queued.commandId}`, "state");
          const status = await waitForManifestCompletion(previousRevision);
          const items = await fetchManifestPage(status.lastCompleteRevision || status.activeRevision || "");
          setStudioManifest(items);
        } else {
          const data = await getStudioManifest({ sessionId: studio?.lastAuthorizedSessionId || null, limit: 1000 });
          if (data.disconnected) {
            setStudioManifest([]);
            return;
          }
          setStudioManifest(data.manifest?.items || []);
        }
      } catch (err) {
        notify?.({ message: err?.message || "Could not refresh Studio manifest", type: "error" });
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
  }, [appendTerminal, fetchManifestPage, notify, studio?.connected, studio?.lastAuthorizedSessionId, waitForManifestCompletion]);

  useEffect(() => {
    const sessionId = studio?.lastAuthorizedSessionId;
    if (!sessionId || !studio?.connected) return;

    const autoRefreshKey = `${sessionId}:${studio?.connected ? "live" : "cached"}`;
    if (autoManifestRefreshKeyRef.current === autoRefreshKey) return;
    autoManifestRefreshKeyRef.current = autoRefreshKey;

    refreshStudioManifest().catch(() => {
      autoManifestRefreshKeyRef.current = "";
    });
  }, [refreshStudioManifest, studio?.connected, studio?.lastAuthorizedSessionId]);

  const studioResults = useMemo(() => {
    const query = studioSearch.trim().toLowerCase();
    return (studioManifest || [])
      .filter((item) => !query || `${item.canonicalPath || item.path} ${item.className}`.toLowerCase().includes(query))
      .slice(0, 200);
  }, [studioManifest, studioSearch]);

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
        sessionId: studio?.lastAuthorizedSessionId || null,
        label: `Read ${path}`,
        applyMode: "unrestricted_dev",
      });
      appendTerminal(`queued read ${path}`, "state");
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") throw new Error(command.error || "Studio read failed");
      const script = command.result?.scripts?.[0];
      if (!script || script.error) throw new Error(script?.error || "Script source unavailable");
      const nextFile = toStudioFile(script);
      setStudioFiles((prev) => [...prev, nextFile]);
      setActiveStudioFileId(nextFile.id);
      appendTerminal(`opened ${script.path}`, "state");
    } catch (err) {
      notify?.({ message: err?.message || "Could not open Studio script", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.lastAuthorizedSessionId, studioFiles, toStudioFile]);

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
        sessionId: studio?.lastAuthorizedSessionId || null,
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
      appendTerminal(`refreshed ${file.path}`, "state");
    } catch (err) {
      notify?.({ message: err?.message || "Could not refresh Studio file", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.lastAuthorizedSessionId, toStudioFile]);

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
        sessionId: studio?.lastAuthorizedSessionId || null,
        label: `Save ${file.path}`,
        applyMode: "unrestricted_dev",
      });
      appendTerminal(`queued save ${file.path}`, "state");
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") {
        if (command.result?.code === "source_conflict" || command.result?.error?.code === "source_conflict") {
          const read = await queueStudioTool({
            type: "read_script",
            payload: { paths: [file.path], maxChars: 200000 },
            sessionId: studio?.lastAuthorizedSessionId || null,
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
      appendTerminal(`saved ${file.path}`, "state");
      notify?.({ message: "Saved to Studio", type: "success" });
    } catch (err) {
      notify?.({ message: err?.message || "Could not save to Studio", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.lastAuthorizedSessionId]);

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

  const studioWorkspaceRunId = workspace.agentRun?.runId || chat.currentChatId || "studio-workspace";
  const terminalStorageKey = useMemo(
    () => `nexusWorkspaceActiveCommand:${studioWorkspaceRunId}`,
    [studioWorkspaceRunId]
  );

  const connectTerminalCommand = useCallback(async (commandId) => {
    if (!commandId) return;
    terminalAbortRef.current?.abort?.();
    const abortController = new AbortController();
    terminalAbortRef.current = abortController;
    setTerminalLines([]);
    try {
      const info = await getWorkspaceCommand(commandId);
      setTerminalCommand(info.command || null);
      await streamWorkspaceCommandEvents(commandId, {
        signal: abortController.signal,
        onEvent: (evt) => {
          if (evt.event === "stdout" || evt.event === "stderr") {
            appendTerminal(evt.data?.text || "", evt.event);
          }
          if (evt.event === "state") {
            setTerminalCommand((prev) => ({
              ...(prev || {}),
              id: commandId,
              ...(evt.data || {}),
              status: evt.data?.status || prev?.status,
            }));
            if (["succeeded", "failed", "cancelled", "timed_out", "disabled"].includes(evt.data?.status)) {
              window.localStorage.removeItem(terminalStorageKey);
            }
          }
        },
      });
      const finalInfo = await getWorkspaceCommand(commandId).catch(() => null);
      if (finalInfo?.command) {
        setTerminalCommand(finalInfo.command);
        if (["succeeded", "failed", "cancelled", "timed_out", "disabled"].includes(finalInfo.command.status)) {
          window.localStorage.removeItem(terminalStorageKey);
        }
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        notify?.({ message: err?.message || "Workspace terminal disconnected", type: "error" });
      }
    }
  }, [appendTerminal, notify, terminalStorageKey]);

  useEffect(() => {
    const commandId = window.localStorage.getItem(terminalStorageKey);
    if (!commandId) return undefined;
    connectTerminalCommand(commandId).catch(() => {});
    return () => terminalAbortRef.current?.abort?.();
  }, [connectTerminalCommand, terminalStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem("nexusWorkspaceCommandHistory", JSON.stringify(terminalHistory.slice(0, 40)));
    } catch (_) {
      // ignore localStorage failures
    }
  }, [terminalHistory]);

  const runWorkspaceCommand = useCallback(async () => {
    const command = terminalInput.trim();
    if (!command) return;
    try {
      const result = await createWorkspaceCommand({
        runId: studioWorkspaceRunId,
        command,
        cwd: terminalCwd.trim(),
      });
      setTerminalCommand({ id: result.commandId, status: result.status, cwd: terminalCwd.trim() || "." });
      setTerminalLines([]);
      setTerminalHistory((prev) => [command, ...prev.filter((item) => item !== command)].slice(0, 40));
      setTerminalHistoryIndex(-1);
      window.localStorage.setItem(terminalStorageKey, result.commandId);
      await connectTerminalCommand(result.commandId);
    } catch (err) {
      notify?.({ message: err?.message || "Could not start workspace command", type: "error" });
    }
  }, [connectTerminalCommand, notify, studioWorkspaceRunId, terminalCwd, terminalInput, terminalStorageKey]);

  const cancelTerminalCommandRun = useCallback(async () => {
    if (!terminalCommand?.id) return;
    try {
      await cancelWorkspaceCommand(terminalCommand.id);
    } catch (err) {
      notify?.({ message: err?.message || "Could not cancel workspace command", type: "error" });
    }
  }, [notify, terminalCommand?.id]);

  const copyTerminalOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(terminalLines.map((line) => line.text).join(""));
      notify?.({ message: "Terminal output copied", type: "success" });
    } catch (_) {
      notify?.({ message: "Could not copy terminal output", type: "error" });
    }
  }, [notify, terminalLines]);

  const requireUser = (fallback, actionType = PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, source = "workspace_gate") => {
    if (!user) {
      handleAuthRequired?.(actionType, source);
      return false;
    }
    if (typeof fallback === "function") fallback();
    return true;
  };

  const requirePremium = (reason, next) => {
    if (!requireUser()) return false;
    if (!isPremium) {
      setProNudgeReason(reason || "This feature");
      setShowProNudge(true);
      return false;
    }
    if (typeof next === "function") next();
    return true;
  };

  const onRefine = (m) => {
    if (!requirePremium("Refinement & Iteration")) return;
    handleStartRefine(m);
  };

  const agentChat = (
    <AgentChatPanel
      messages={chat.messages}
      pendingMessage={unified.pendingMessage}
      generationStage={unified.generationStage}
      user={user}
      profile={roblox?.connected ? roblox?.status?.connection?.profile || null : null}
      activeMode={chat.activeMode}
      isBusy={unified.isGenerating}
      onApprovePlan={onApprovePlan}
      onClarifySubmit={onClarifySubmit}
      onEditPlan={handleEditPlan}
      onRefine={onRefine}
      onOpenArtifact={handleOpenArtifact}
      onQuickStart={handleQuickStart}
      notify={notify}
      chatEndRef={chatEndRef}
      prompt={prompt}
      setPrompt={setPrompt}
      attachments={attachments}
      setAttachments={setAttachments}
      onSubmit={(e) => handlePromptSubmit(e)}
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
      isFreeUsagePlan={isFreeUsagePlan}
      themePrimary={currentTheme.primary}
      themeSecondary={currentTheme.secondary}
      onModeChange={(m) => chat.updateChatMode(chat.currentChatId, m)}
      artifact={workspace.activeArtifact}
      agentRun={workspace.agentRun}
      onApproveStep={handleApproveStep}
      onRestoreRun={handleRestoreRun}
      approvingStepId={studio?.approvingStepId}
      restoringRun={studio?.restoringRun}
      studioConnected={studio?.connected}
      studioLoading={studio?.loading}
      studioEnabled={studio?.enabled}
      onStudioEnabledChange={handleStudioEnabledChange}
      studioApplyMode={studio?.applyMode}
      onStudioApplyModeChange={handleStudioApplyModeChange}
      studioAutoPushEnabled={studio?.autoPushEnabled}
      onStudioAutoPushEnabledChange={handleStudioAutoPushEnabledChange}
      studioAutoPushPolicy={studio?.autoPushPolicy}
      onStudioAutoPushPolicyChange={handleStudioAutoPushPolicyChange}
      studioAutoPushAuthorized={Boolean(studio?.lastAuthorizedSessionId)}
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
            onClick={refreshStudioManifest}
            disabled={studioBusy}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white disabled:opacity-40"
            title="Refresh Studio manifest"
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
        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
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
            <div className="px-2 py-4 text-center text-xs text-gray-600">No persisted Studio manifest yet.</div>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-2">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            <div className="flex items-center gap-1.5">
              <TerminalSquare className="w-3.5 h-3.5" />
              Terminal
            </div>
            {terminalCommand?.status && (
              <span className="text-[9px] text-gray-400">{terminalCommand.status}</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
              <span className="text-[10px] text-gray-500">cwd</span>
              <input
                value={terminalCwd}
                onChange={(e) => setTerminalCwd(e.target.value)}
                placeholder="relative path, e.g. src"
                className="min-w-0 flex-1 bg-transparent text-[11px] text-gray-200 placeholder:text-gray-600 outline-none"
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runWorkspaceCommand().catch(() => {});
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    const nextIndex = Math.min(terminalHistoryIndex + 1, terminalHistory.length - 1);
                    setTerminalHistoryIndex(nextIndex);
                    if (nextIndex >= 0) setTerminalInput(terminalHistory[nextIndex] || "");
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const nextIndex = Math.max(terminalHistoryIndex - 1, -1);
                    setTerminalHistoryIndex(nextIndex);
                    setTerminalInput(nextIndex >= 0 ? terminalHistory[nextIndex] || "" : "");
                  }
                }}
                placeholder="npm test"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-gray-200 placeholder:text-gray-600 outline-none"
              />
              <button
                type="button"
                onClick={() => runWorkspaceCommand().catch(() => {})}
                className="px-2 py-1.5 rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[10px] font-bold uppercase tracking-widest text-[#00f5d4]"
              >
                Run
              </button>
              <button
                type="button"
                onClick={() => cancelTerminalCommandRun().catch(() => {})}
                disabled={!terminalCommand?.id || !["queued", "running", "cancelling"].includes(terminalCommand.status)}
                className="px-2 py-1.5 rounded-lg border border-red-400/20 bg-red-400/10 text-[10px] font-bold uppercase tracking-widest text-red-200 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
              <span>{terminalCommand?.cwd || terminalCwd || "."}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTerminalLines([])} className="text-gray-400 hover:text-white">Clear</button>
                <button type="button" onClick={() => copyTerminalOutput().catch(() => {})} className="text-gray-400 hover:text-white">Copy</button>
              </div>
            </div>
          </div>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed">
            {terminalLines.length ? terminalLines.map((line) => line.text).join("") : "Run workspace commands here. Output streams live and reconnects to the active command after refresh."}
          </pre>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] min-h-[100svh] ai-page font-sans flex flex-col relative overflow-hidden" role="application" aria-label="Nexus AI Workspace">
      <div
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.primary}14` }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.secondary}10` }}
        aria-hidden="true"
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
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
                { id: "history", label: "History", icon: History },
              ]}
              value={leftView}
              onChange={setLeftView}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {leftView === "files" ? (
              fileTree
            ) : (
              <SidebarContent
                activeTab="chats"
                setActiveTab={() => setActiveTab("chat")}
                scripts={scripts}
                currentChatId={chat.currentChatId}
                generatingChatIds={chat.generatingChatIds}
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
                onOpenGameContext={() => {
                  if (!requireUser()) return;
                  game.setShowWizard(true);
                }}
                onDeleteChat={chat.handleDeleteChat}
                handleClearChat={chat.handleClearChat}
                gameProfile={game.profile}
                user={user}
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
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SiteHeader
          variant="workspace"
          robloxStatusOverride={roblox?.status ?? null}
          robloxLoadingOverride={Boolean(roblox?.loading)}
            workspaceLeft={(
              <>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-xl transition-all ${sidebarOpen ? "bg-[#00f5d4]/10 text-[#00f5d4]" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  title="Toggle sidebar"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
                <div data-tour="mode-switcher" className="hidden md:inline-flex">
                  <Segmented
                    size="sm"
                    options={[
                      { id: "quick_script", label: "Quick Script", icon: FileCode2 },
                      { id: "agent_build", label: "Agent Build", icon: Bot },
                    ]}
                    value={generatorMode}
                    onChange={(mode) => setGeneratorMode(mode, "mode_control")}
                  />
                </div>
                <div className="h-4 w-px bg-white/10 hidden md:block" aria-hidden="true" />
                {generatorMode === "agent_build" && (
                  <>
                    <ModelSwitcher
                      value={settings.modelVersion}
                      isPremium={isPremium}
                      onChange={(id) => updateSettings({ modelVersion: id })}
                      onProNudge={(reason) => {
                        if (!requireUser()) return;
                        setProNudgeReason(reason || "Premium AI Models");
                        setShowProNudge(true);
                      }}
                    />
                    <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
                  </>
                )}
                <div data-tour="studio-pair">
                  <StudioPairControl
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
                    <DailyPromptBadge
                      totalRemaining={totalRemaining}
                      subLimit={subLimit}
                      resetsAt={resetsAt}
                      planKey={planKey}
                      unlimitedTokens={unlimitedTokens}
                      devOverride={devOverride}
                    />
                    <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
                    <ProjectContextStatus
                      context={projectContext}
                      plan={planKey}
                      onViewStructure={() => setArchitecturePanelOpen(true)}
                      onSync={async () => {
                        if (!requireUser()) return;
                        game.setShowWizard(true);
                      }}
                    />
                  </>
                ) : (
                  <div className="hidden text-right text-[11px] font-semibold text-gray-500 sm:block">
                    No plan approval in Quick Script
                  </div>
                )}
              </>
            )}
          />

          {/* Desktop center + right; mobile single-pane via tabs */}
          {generatorMode === "quick_script" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 border-b border-white/5 bg-black/20 px-4 py-2 md:hidden">
                <Segmented
                  fullWidth
                  size="sm"
                  options={[
                    { id: "quick_script", label: "Quick Script", icon: FileCode2 },
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
            <div className={`flex-1 min-w-0 ${isMobile ? (mobileTab === "chat" ? "flex pb-16" : "hidden") : "flex"} flex-col`}>
              {agentChat}
            </div>

            {/* Mobile-only file tree + details panes */}
            {isMobile && mobileTab === "files" && (
              <div className="flex-1 min-w-0 overflow-y-auto bg-[#0a0a0a]">{fileTree}</div>
            )}
            {isMobile && mobileTab === "details" && (
              <div className="flex-1 min-w-0 bg-[#0a0a0a]">
                <BuildDetailsPanel
                  artifact={workspace.activeArtifact}
                  agentRun={workspace.agentRun}
                  onApproveStep={handleApproveStep}
                  onRestoreRun={handleRestoreRun}
                  approvingStepId={studio?.approvingStepId}
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
              onSync={async () => {
                if (!requireUser()) return;
                setArchitecturePanelOpen(false);
                game.setShowWizard(true);
              }}
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
          await scriptManager.handleCreateScript(title, code, "logic");
          notify({ message: "Script saved to library", type: "success" });
          track("project_saved", { output_type: "script" });
        }}
      />

      {settings.enableGameWizard !== false && (
        <GameProfileWizard
          isOpen={game.showWizard}
          onClose={() => game.setShowWizard(false)}
          profile={game.profile}
          onUpdate={game.updateProfile}
        />
      )}

      <SignInNudgeModal
        isOpen={showSignInNudge}
        onClose={() => setShowSignInNudge(false)}
        reason={signInNudgeReason}
      />
      <ProNudgeModal isOpen={showProNudge} onClose={() => setShowProNudge(false)} reason={proNudgeReason} />

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
            message={currentToast.count > 1 ? `${currentToast.message} (x${currentToast.count})` : currentToast.message}
            type={currentToast.type}
            duration={currentToast.duration}
            cta={currentToast.cta}
            secondary={currentToast.secondary}
            onClose={() => dismissToast(currentToast.id)}
          />
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
