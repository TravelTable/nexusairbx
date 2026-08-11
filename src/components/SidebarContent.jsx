import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import ProjectTreeSidebar from "./sidebar/ProjectTreeSidebar";
import { AI_EVENTS, emitAiEvent } from "../lib/aiEvents";
import { useAiLibrary } from "../hooks/useAiLibrary";
import { useProjectBindings } from "../hooks/useProjectBindings";
import { useBilling } from "../context/BillingContext";
import {
  resolveGameIdentityFromStudioStatus,
  resolveGameTitleFromTarget,
} from "../lib/studioPlaceBinding";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { isActiveRunStatus } from "./sidebar/sidebarTreeModel";

export default function SidebarContent({
  scripts = [],
  currentChatId,
  currentProjectId = null,
  studioConnected = false,
  studioPlacePreference = null,
  setCurrentScriptId = () => {},
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
  const retentionDays = limits?.chatRetentionDays
    ?? (isFreeUsagePlan ? 7 : (String(plan || "").toUpperCase() === "STARTER" ? 30 : null));
  const { allChats } = useAiLibrary(user, { retentionDays, authReady });
  const {
    projects,
    loading: projectsLoading,
    openGameProject,
    deleteProject,
    renameProject,
  } = useProjectBindings(user, { authReady });
  const [creatingProject, setCreatingProject] = useState(false);
  const [studioOptions, setStudioOptions] = useState([]);
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const connectedProjectId = useMemo(() => {
    if (!studioConnected) return null;
    const targetId = String(
      studioPlacePreference?.targetId || studioPlacePreference?.studioTargetId || ""
    ).trim();
    const placeId = String(studioPlacePreference?.placeId || "").trim();
    const match = projects.find((project) => (
      (targetId && String(project.studioTargetId || "").trim() === targetId)
      || (placeId && String(project.placeId || project.defaultPlaceId || "").trim() === placeId)
    ));
    return match?.projectId || null;
  }, [projects, studioConnected, studioPlacePreference]);

  const finishMobileSelection = () => {
    if (isMobile) onSelect();
  };
  const createChat = (projectId = null) => {
    emitAiEvent(AI_EVENTS.START_DRAFT, { projectId: projectId || null });
    finishMobileSelection();
  };
  const openChat = (id) => {
    if (onSelectChat) onSelectChat(id);
    else emitAiEvent(AI_EVENTS.OPEN_CHAT, { id });
    finishMobileSelection();
  };
  const openScript = (id) => {
    setCurrentScriptId(id);
    emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, { scriptId: id });
    finishMobileSelection();
  };
  const adoptIdentity = async (identity) => {
    const project = await openGameProject(identity);
    setStudioOptions([]);
    notify({ message: `Added ${project?.title || "game"} to Projects`, type: "success" });
  };
  const openFromStudio = async () => {
    if (!user || creatingProject) return;
    setCreatingProject(true);
    try {
      const identity = resolveGameIdentityFromStudioStatus(await getStudioStatus());
      if (identity.status === "needs_connect") {
        throw new Error("Connect Roblox Studio to detect a published game.");
      }
      if (identity.status === "needs_selection") {
        setStudioOptions(identity.options || []);
        return;
      }
      await adoptIdentity(identity);
    } catch (error) {
      notify({
        message: error.message || "Could not detect a published Studio game",
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
      notify({ message: error.message || "Could not open that game", type: "error" });
    } finally {
      setCreatingProject(false);
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
  const confirmProjectDelete = async () => {
    if (!deleteProjectId) return;
    setDeleting(true);
    try {
      const result = await deleteProject(deleteProjectId);
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
    if (!deleteProjectId) return { chats: 0, creations: 0 };
    const projectChatIds = new Set(
      allChats.filter((chat) => chat.projectId === deleteProjectId).map((chat) => chat.id)
    );
    return {
      chats: projectChatIds.size,
      creations: scripts.filter((script) => (
        script.workspaceProjectId === deleteProjectId || projectChatIds.has(script.chatId)
      )).length,
    };
  }, [allChats, deleteProjectId, scripts]);

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
        creatingProject={creatingProject}
        studioOptions={studioOptions}
        onNewChat={createChat}
        onOpenChat={openChat}
        onOpenCreation={openScript}
        onRenameChat={onRenameChat}
        onRenameProject={renameProject}
        onMoveChat={onMoveChat}
        onDeleteChat={setDeleteChatId}
        onDeleteProject={setDeleteProjectId}
        onDetectProject={openFromStudio}
        onChooseStudioOption={chooseStudioOption}
        onCollapse={onCollapse}
      />

      <Modal
        isOpen={Boolean(deleteChatId)}
        onClose={() => setDeleteChatId(null)}
        title="Delete chat?"
      >
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

      <Modal
        isOpen={Boolean(deleteProjectId)}
        onClose={() => setDeleteProjectId(null)}
        title="Delete game project?"
      >
        <p className="text-sm text-muted-foreground">
          This removes {projectCounts.chats} chats, {projectCounts.creations} creations,
          their messages, Nexus asset records, and Nexus-hosted files. It never deletes the
          Roblox experience or assets already uploaded to Roblox.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          An active agent run must be finished or cancelled first. Partial failures can be retried.
        </p>
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
            disabled={deleting}
            className="min-h-11 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
          >
            Delete Nexus data
          </button>
        </div>
      </Modal>
    </>
  );
}
