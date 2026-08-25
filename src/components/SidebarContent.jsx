import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import ProjectTreeSidebar from "./sidebar/ProjectTreeSidebar";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../lib/aiEvents";
import { useAiLibrary } from "../hooks/useAiLibrary";
import { useProjectBindings } from "../hooks/useProjectBindings";
import { useBilling } from "../context/BillingContext";
import { resolveGameIdentityFromStudioStatus, resolveGameTitleFromTarget } from "../lib/studioPlaceBinding";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { isActiveRunStatus } from "./sidebar/sidebarTreeModel";

const STALE_PROJECT_ACTION_MESSAGE =
  "Project state changed while this action was running. Review the current account and try again.";

export default function SidebarContent({
  scripts = [],
  currentChatId,
  currentProjectId = null,
  studioConnected = false,
  studioPlacePreference = null,
  onSelectChat,
  onDeleteChat = () => {},
  onRenameChat = () => {},
  onMoveChat = () => {},
  generatingChatIds = [],
  activeAgentStatusByChat = {},
  user = null,
  authReady = true,
  notify = () => {},
  isMobile = false,
  onSelect = () => {},
  onCollapse = () => {},
}) {
  const { isFreeUsagePlan, limits, plan } = useBilling();
  const retentionDays =
    limits?.chatRetentionDays ?? (isFreeUsagePlan ? 7 : String(plan || "").toUpperCase() === "STARTER" ? 30 : null);
  const { allChats } = useAiLibrary(user, { retentionDays, authReady });
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    openGameProject,
    deleteProject,
    renameProject,
    refresh: refreshProjects,
  } = useProjectBindings(user, { authReady });
  const [creatingProject, setCreatingProject] = useState(false);
  const [studioOptions, setStudioOptions] = useState([]);
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(
    () =>
      onAiEvent(AI_EVENTS.PROJECTS_CHANGED, () => {
        void refreshProjects();
      }),
    [refreshProjects]
  );
  const connectedProjectId = useMemo(() => {
    if (!studioConnected) return null;
    const targetId = String(studioPlacePreference?.targetId || studioPlacePreference?.studioTargetId || "").trim();
    const placeId = String(studioPlacePreference?.placeId || "").trim();
    const match = projects.find(
      (project) =>
        (targetId && String(project.studioTargetId || "").trim() === targetId) ||
        (placeId && String(project.placeId || project.defaultPlaceId || "").trim() === placeId)
    );
    return match?.projectId || null;
  }, [projects, studioConnected, studioPlacePreference]);

  const finishMobileSelection = () => {
    if (isMobile) onSelect();
  };
  const createChat = (projectId = null) => {
    emitAiEvent(AI_EVENTS.START_DRAFT, {
      projectId: projectId || currentProjectId || null,
    });
    finishMobileSelection();
  };
  const openChat = (id) => {
    if (onSelectChat) onSelectChat(id);
    else emitAiEvent(AI_EVENTS.OPEN_CHAT, { id });
    finishMobileSelection();
  };
  const openScript = (id) => {
    emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, { scriptId: id });
    finishMobileSelection();
  };
  const adoptIdentity = async (identity) => {
    const project = await openGameProject(identity);
    if (!project) {
      notify({ message: STALE_PROJECT_ACTION_MESSAGE, type: "info" });
      return null;
    }
    setStudioOptions([]);
    notify({
      message: `Added ${project?.title || "game"} to Projects`,
      type: "success",
    });
    return project;
  };
  const openFromStudio = async () => {
    if (!user) {
      notify({
        message: "Sign in before adding a Studio game to Projects.",
        type: "error",
      });
      return;
    }
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const identity = resolveGameIdentityFromStudioStatus(await getStudioStatus());
      if (identity.status === "needs_connect") {
        throw new Error("Connect Roblox Studio to detect the open project.");
      }
      if (identity.status === "needs_selection") {
        setStudioOptions(identity.options || []);
        return;
      }
      await adoptIdentity(identity);
    } catch (error) {
      notify({
        message: error.message || "Could not detect the open Studio project",
        type: "error",
      });
    } finally {
      setCreatingProject(false);
    }
  };
  const chooseStudioOption = async (option) => {
    setCreatingProject(true);
    try {
      const title = resolveGameTitleFromTarget(option);
      await adoptIdentity({
        title,
        placeId: option.placeId,
        universeId: option.universeId,
        studioTargetId: option.studioTargetId || option.id,
        studioTargetLabel: option.label || title,
        source: "studio",
        target: option,
      });
    } catch (error) {
      notify({
        message: error.message || "Could not open that game",
        type: "error",
      });
    } finally {
      setCreatingProject(false);
    }
  };
  const renameGameProject = async (projectId, title) => {
    try {
      const project = await renameProject(projectId, title);
      if (!project) {
        return { ok: false, error: STALE_PROJECT_ACTION_MESSAGE };
      }
      notify({ message: "Project renamed", type: "success" });
      return { ok: true, project };
    } catch (error) {
      const message = error?.message || "Failed to rename project";
      notify({ message, type: "error" });
      return { ok: false, error: message };
    }
  };
  const confirmChatDelete = async () => {
    if (!deleteChatId || isActiveRunStatus(activeAgentStatusByChat[deleteChatId])) return;
    setDeleting(true);
    try {
      await onDeleteChat(deleteChatId);
      setDeleteChatId(null);
    } finally {
      setDeleting(false);
    }
  };
  const hasActiveRunForProject = (projectId) => {
    const projectChatIds = new Set(allChats.filter((chat) => chat.projectId === projectId).map((chat) => chat.id));
    return [...projectChatIds].some(
      (chatId) => generatingChatIds.includes(chatId) || isActiveRunStatus(activeAgentStatusByChat[chatId])
    );
  };
  const confirmProjectDelete = async () => {
    if (!deleteProjectId || hasActiveRunForProject(deleteProjectId)) return;
    setDeleting(true);
    try {
      const result = await deleteProject(deleteProjectId);
      if (!result) {
        notify({ message: STALE_PROJECT_ACTION_MESSAGE, type: "info" });
        return;
      }
      setDeleteProjectId(null);
      notify({
        message: `Deleted game project and ${result?.counts?.chats || 0} chats. Roblox content was not changed.`,
        type: "success",
      });
    } catch (error) {
      notify({
        message: error.message || "Project deletion stopped and can be retried.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  const projectCounts = useMemo(() => {
    if (!deleteProjectId) return { chats: 0, creations: 0, activeRuns: 0 };
    const projectChatIds = new Set(
      allChats.filter((chat) => chat.projectId === deleteProjectId).map((chat) => chat.id)
    );
    return {
      chats: projectChatIds.size,
      creations: scripts.filter(
        (script) => script.workspaceProjectId === deleteProjectId || projectChatIds.has(script.chatId)
      ).length,
      activeRuns: [...projectChatIds].filter(
        (chatId) => generatingChatIds.includes(chatId) || isActiveRunStatus(activeAgentStatusByChat[chatId])
      ).length,
    };
  }, [activeAgentStatusByChat, allChats, deleteProjectId, generatingChatIds, scripts]);

  return (
    <>
      <ProjectTreeSidebar
        userKey={user?.uid || "guest"}
        projects={projects}
        chats={allChats}
        scripts={scripts}
        currentChatId={currentChatId}
        currentProjectId={currentProjectId}
        connectedProjectId={connectedProjectId}
        generatingChatIds={generatingChatIds}
        activeAgentStatusByChat={activeAgentStatusByChat}
        projectsLoading={projectsLoading}
        projectsError={projectsError}
        creatingProject={creatingProject}
        studioOptions={studioOptions}
        onNewChat={createChat}
        onOpenChat={openChat}
        onOpenCreation={openScript}
        onRenameChat={onRenameChat}
        onRenameProject={renameGameProject}
        onMoveChat={onMoveChat}
        onDeleteChat={setDeleteChatId}
        onDeleteProject={setDeleteProjectId}
        onDetectProject={openFromStudio}
        onRetryProjects={refreshProjects}
        onChooseStudioOption={chooseStudioOption}
        onCollapse={onCollapse}
      />

      <Modal isOpen={Boolean(deleteChatId)} onClose={() => setDeleteChatId(null)} title="Delete chat?">
        <p className="text-sm text-muted-foreground">
          This removes the chat and all its messages. Saved creations will remain.
        </p>
        {isActiveRunStatus(activeAgentStatusByChat[deleteChatId]) && (
          <p className="mt-3 text-sm text-[var(--ds-warning)]">Finish or cancel the active run first.</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteChatId(null)}
            className="min-h-11 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmChatDelete}
            disabled={deleting || isActiveRunStatus(activeAgentStatusByChat[deleteChatId])}
            className="min-h-11 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
          >
            Delete chat
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteProjectId)} onClose={() => setDeleteProjectId(null)} title="Delete game project?">
        <p className="text-sm text-muted-foreground">
          This removes {projectCounts.chats} chats, {projectCounts.creations} creations, their messages, Nexus asset
          records, and Nexus-hosted files. It never deletes the Roblox experience or assets already uploaded to Roblox.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          An active agent run must be finished or cancelled first. Partial failures can be retried.
        </p>
        {projectCounts.activeRuns > 0 && (
          <p role="status" className="mt-3 text-sm text-[var(--ds-warning)]">
            Finish or cancel{" "}
            {projectCounts.activeRuns === 1 ? "the active run" : `${projectCounts.activeRuns} active runs`} first.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteProjectId(null)}
            className="min-h-11 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmProjectDelete}
            disabled={deleting || projectCounts.activeRuns > 0}
            className="min-h-11 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
          >
            Delete Nexus data
          </button>
        </div>
      </Modal>
    </>
  );
}
