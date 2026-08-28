import React, { useDeferredValue, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, CreditCard, Folder, FolderTree, Layout, Menu, MessageSquare,
  Pencil, Plus, Search, Settings, Trash2, X,
} from "lib/icons";
import SidebarContextMenu from "./SidebarContextMenu";
import { isActiveRunStatus } from "./sidebarTreeModel";
import "./ProjectTreeSidebar.css";

const normalized = (value) => String(value || "").trim().toLocaleLowerCase();
const recentFirst = (items) => [...items].sort(
  (a, b) => Number(b?.updatedAt || b?.createdAt || 0) - Number(a?.updatedAt || a?.createdAt || 0)
);

function RunDot({ active, failed }) {
  if (!active && !failed) return null;
  return <span aria-label={failed ? "Run failed" : "Run active"} className={`h-1.5 w-1.5 shrink-0 rounded-full ${failed ? "bg-[var(--ds-danger)]" : "bg-[var(--ds-accent)]"}`} />;
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="nexus-project-tree__search relative block px-3 pb-2">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-6 top-[11px] h-3.5 w-3.5 text-[var(--ds-text-muted)]" aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-sunken)] pl-9 pr-9 text-xs text-[var(--ds-text)] outline-none transition-colors placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-accent)]" />
      {value ? <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="focus-ring absolute right-5 top-1 flex h-7 w-7 items-center justify-center rounded-md text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"><X className="h-3.5 w-3.5" /></button> : null}
    </label>
  );
}

export default function ProjectTreeSidebar({
  projects = [], chats = [], currentChatId = null, currentProjectId = null,
  generatingChatIds = [], activeAgentStatusByChat = {}, projectsLoading = false,
  projectsError = null, creatingProject = false, showProjectList = false,
  showAllChats = false,
  onNewChat = () => {}, onOpenChat = () => {}, onOpenProject = () => {},
  onCreateProject = () => {}, onRenameChat = () => {}, onRenameProject = () => {},
  onDeleteChat = () => {}, onDeleteProject = () => {}, onRetryProjects = () => {},
  onCollapse = () => {},
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [menu, setMenu] = useState(null);
  const [rename, setRename] = useState(null);
  const activeProject = projects.find((project) => String(project.projectId) === String(currentProjectId)) || null;
  const projectListVisible = !showAllChats && (showProjectList || !activeProject);
  const searchTerm = normalized(deferredQuery);
  const generating = useMemo(() => new Set(generatingChatIds.map(String)), [generatingChatIds]);
  const visibleProjects = useMemo(() => recentFirst(projects).filter((project) => !searchTerm || normalized(project.title).includes(searchTerm)), [projects, searchTerm]);
  const visibleChats = useMemo(() => {
    if (!activeProject && !showAllChats) return [];
    return recentFirst(chats).filter((chat) => {
      const belongsToActiveProject = showAllChats
        || String(chat.projectId || "") === String(activeProject?.projectId || "");
      const projectTitle = projects.find((project) => String(project.projectId) === String(chat.projectId))?.title;
      return belongsToActiveProject
        && (!searchTerm || normalized(`${chat.title || ""} ${chat.lastMessagePreview || ""} ${projectTitle || ""}`).includes(searchTerm));
    });
  }, [activeProject, chats, projects, searchTerm, showAllChats]);

  const submitProject = async (event) => {
    event.preventDefault();
    const title = newProjectTitle.trim();
    if (!title || creatingProject) return;
    const created = await onCreateProject(title);
    if (created) {
      setNewProjectTitle("");
      setShowCreate(false);
    }
  };

  const openActions = (event, type, item) => {
    const title = item.title || (type === "project" ? "Untitled project" : "New chat");
    setMenu({
      x: event.clientX, y: event.clientY, label: `${title} actions`,
      items: [
        { id: "rename", label: "Rename", icon: Pencil, onSelect: () => {
          setRename({ type, item, title, value: title, error: "", busy: false });
        } },
        { id: "divider", separator: true },
        { id: "delete", label: `Delete ${type}`, icon: Trash2, danger: true,
          disabled: type === "chat" && isActiveRunStatus(activeAgentStatusByChat[item.id]),
          onSelect: () => (type === "project" ? onDeleteProject(item.projectId) : onDeleteChat(item.id)) },
      ],
    });
  };

  const submitRename = async (event) => {
    event.preventDefault();
    if (!rename || rename.busy) return;
    const next = rename.value.trim();
    if (!next) {
      setRename((current) => ({ ...current, error: "Enter a name." }));
      return;
    }
    if (next === rename.title) {
      setRename(null);
      return;
    }
    setRename((current) => ({ ...current, busy: true, error: "" }));
    const result = rename.type === "project"
      ? await onRenameProject(rename.item.projectId, next)
      : await onRenameChat(rename.item.id, next);
    if (result?.ok === false) {
      setRename((current) => ({ ...current, busy: false, error: result.error || "Rename could not be completed." }));
      return;
    }
    setRename(null);
  };

  return (
    <div className="nexus-project-tree flex h-full min-h-0 flex-col" data-testid="project-first-sidebar">
      <header className="flex min-h-12 items-center gap-2 px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]" aria-hidden="true">
          <FolderTree className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--ds-text)]" title={projectListVisible || showAllChats ? undefined : activeProject?.title || "Untitled project"}>{showAllChats ? "Chats" : projectListVisible ? "Projects" : activeProject?.title || "Untitled project"}</p>
        </div>
        <button type="button" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar" className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"><Layout className="h-4 w-4" /></button>
      </header>

      {rename ? <form onSubmit={submitRename} className="mx-3 mb-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-sunken)] p-2">
        <label className="sr-only" htmlFor="sidebar-rename-input">Rename</label>
        <input id="sidebar-rename-input" aria-label="Rename" autoFocus value={rename.value} onChange={(event) => setRename((current) => ({ ...current, value: event.target.value, error: "" }))} onKeyDown={(event) => { if (event.key === "Enter") void submitRename(event); }} maxLength={120} className="h-9 w-full rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-xs text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent)]" />
        {rename.error ? <p role="alert" className="mt-2 text-xs text-[var(--ds-danger)]">{rename.error}</p> : null}
        <div className="mt-2 flex justify-end gap-1.5"><button type="button" onClick={() => setRename(null)} className="min-h-9 rounded-md px-3 text-xs text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)]">Cancel</button><button type="submit" disabled={rename.busy || !rename.value.trim()} className="min-h-9 rounded-md bg-[var(--ds-accent)] px-3 text-xs font-semibold text-white disabled:opacity-40">{rename.busy ? "Saving…" : "Save"}</button></div>
      </form> : null}

      {projectListVisible ? <>
        <div className="px-3 pb-2">
          {!showCreate ? <button type="button" onClick={() => setShowCreate(true)} className="nexus-project-tree__primary-action focus-ring flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ds-accent)] px-3 text-xs font-semibold text-white transition-[filter] hover:brightness-110"><Plus className="h-3.5 w-3.5" />New project</button> :
            <form onSubmit={submitProject} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-sunken)] p-2">
              <label className="sr-only" htmlFor="new-project-title">Project name</label>
              <input id="new-project-title" autoFocus value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder="Project name" maxLength={120} className="h-9 w-full rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-xs text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent)]" />
              <div className="mt-2 flex justify-end gap-1.5"><button type="button" onClick={() => setShowCreate(false)} className="min-h-9 rounded-md px-3 text-xs text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)]">Cancel</button><button type="submit" disabled={!newProjectTitle.trim() || creatingProject} className="min-h-9 rounded-md bg-[var(--ds-accent)] px-3 text-xs font-semibold text-white disabled:opacity-40">{creatingProject ? "Creating…" : "Create"}</button></div>
            </form>}
        </div>
        <SearchField value={query} onChange={setQuery} placeholder="Search projects" />
        <div className="nexus-project-tree-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Projects">
          {projectsLoading ? <p className="px-3 py-4 text-xs text-[var(--ds-text-muted)]">Loading projects…</p> : null}
          {projectsError ? <div role="alert" className="px-3 py-4 text-xs text-[var(--ds-danger)]"><p>{String(projectsError)}</p><button type="button" onClick={onRetryProjects} className="mt-2 min-h-10 rounded-lg px-3 text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)]">Retry</button></div> : null}
          {!projectsLoading && !projectsError && !visibleProjects.length ? <p className="px-3 py-8 text-center text-xs text-[var(--ds-text-muted)]">{searchTerm ? "No projects match your search." : "Create a project to start organizing your chats."}</p> : null}
          {visibleProjects.map((project) => <div key={project.projectId} className="nexus-project-tree__row group flex items-center rounded-md transition-colors hover:bg-[var(--ds-fill-hover)] focus-within:bg-[var(--ds-fill-hover)]">
            <button type="button" onClick={() => onOpenProject(project.projectId)} className="focus-ring flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left" title={project.title || "Untitled project"}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--ds-fill-subtle)] text-[var(--ds-accent)]"><Folder className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--ds-text-secondary)]">{project.title || "Untitled project"}</span><ChevronRight className="h-3 w-3 shrink-0 text-[var(--ds-text-muted)] opacity-70" />
            </button>
            <button type="button" aria-label={`Actions for ${project.title || "project"}`} onClick={(event) => openActions(event, "project", project)} className="nexus-project-tree__row-action focus-ring mr-0.5 flex h-9 w-9 items-center justify-center rounded-md text-[var(--ds-text-muted)] opacity-0 transition-opacity hover:bg-[var(--ds-fill-subtle)] group-hover:opacity-100 focus:opacity-100"><Menu className="h-3.5 w-3.5" /></button>
          </div>)}
        </div>
      </> : showAllChats ? <>
        <div className="px-3 pb-2">
          <button type="button" onClick={() => activeProject && onNewChat(activeProject.projectId)} disabled={!activeProject} className="nexus-project-tree__primary-action nexus-project-tree__new-chat focus-ring flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ds-accent)] px-3 text-xs font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" />New chat</button>
        </div>
        <SearchField value={query} onChange={setQuery} placeholder="Search all chats" />
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="All chats">
          {!visibleChats.length ? <div className="px-4 py-10 text-center"><MessageSquare className="mx-auto mb-3 h-5 w-5 text-[var(--ds-text-muted)]" /><p className="text-xs text-[var(--ds-text-muted)]">{searchTerm ? "No chats match your search." : "No chats yet. Start a fresh one."}</p></div> : null}
          {visibleChats.map((chat) => {
            const status = String(activeAgentStatusByChat[chat.id] || "").toLowerCase();
            const chatProject = projects.find((project) => String(project.projectId) === String(chat.projectId));
            return <div key={chat.id} className={`nexus-project-tree__chat-row group flex items-center ${String(currentChatId) === String(chat.id) ? "bg-[var(--ds-fill-selected)]" : "hover:bg-[var(--ds-fill-hover)]"}`}>
              <button type="button" onClick={() => onOpenChat(chat.id)} className="nexus-project-tree__chat-button flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2.5 text-left" aria-current={String(currentChatId) === String(chat.id) ? "page" : undefined}><MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-[var(--ds-text-secondary)]">{chat.title || "New chat"}</span><span className="block truncate text-[10px] text-[var(--ds-text-muted)]">{chatProject?.title || "Unassigned project"}</span></span><RunDot active={generating.has(String(chat.id)) || isActiveRunStatus(status)} failed={["failed", "error"].includes(status)} /></button>
              <button type="button" aria-label={`Actions for ${chat.title || "chat"}`} onClick={(event) => openActions(event, "chat", chat)} className="nexus-project-tree__chat-action mr-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[var(--ds-text-muted)] opacity-0 hover:bg-[var(--ds-fill-subtle)] group-hover:opacity-100 focus:opacity-100"><Menu className="h-3.5 w-3.5" /></button>
            </div>;
          })}
        </div>
      </> : <>
        <div className="px-3 pb-3">
          <button type="button" onClick={() => onOpenProject(null)} className="mb-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"><ChevronLeft className="h-3.5 w-3.5" />Back to Projects</button>
          <button type="button" onClick={() => onNewChat(activeProject.projectId)} className="nexus-project-tree__primary-action nexus-project-tree__new-chat focus-ring flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ds-accent)] px-3 text-xs font-semibold text-white transition-[filter] hover:brightness-110"><Plus className="h-3.5 w-3.5" />New chat</button>
        </div>
        <SearchField value={query} onChange={setQuery} placeholder={`Search ${activeProject.title || "project"}`} />
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label={`${activeProject.title || "Project"} chats`}>
          {!visibleChats.length ? <div className="px-4 py-10 text-center"><MessageSquare className="mx-auto mb-3 h-5 w-5 text-[var(--ds-text-muted)]" /><p className="text-xs text-[var(--ds-text-muted)]">{searchTerm ? "No chats match your search." : "No chats yet. Start a fresh one."}</p></div> : null}
          {visibleChats.map((chat) => {
            const status = String(activeAgentStatusByChat[chat.id] || "").toLowerCase();
            return <div key={chat.id} className={`nexus-project-tree__chat-row group flex items-center ${String(currentChatId) === String(chat.id) ? "bg-[var(--ds-fill-selected)]" : "hover:bg-[var(--ds-fill-hover)]"}`}>
              <button type="button" onClick={() => onOpenChat(chat.id)} className="nexus-project-tree__chat-button flex min-h-9 min-w-0 flex-1 items-center gap-2 px-2.5 text-left" aria-current={String(currentChatId) === String(chat.id) ? "page" : undefined}><MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)]" /><span className="min-w-0 flex-1 truncate text-xs text-[var(--ds-text-secondary)]">{chat.title || "New chat"}</span><RunDot active={generating.has(String(chat.id)) || isActiveRunStatus(status)} failed={["failed", "error"].includes(status)} /></button>
              <button type="button" aria-label={`Actions for ${chat.title || "chat"}`} onClick={(event) => openActions(event, "chat", chat)} className="nexus-project-tree__chat-action mr-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[var(--ds-text-muted)] opacity-0 hover:bg-[var(--ds-fill-subtle)] group-hover:opacity-100 focus:opacity-100"><Menu className="h-3.5 w-3.5" /></button>
            </div>;
          })}
        </div>
      </>}

      <nav className="nexus-project-tree__footer" aria-label="Workspace destinations">
        <a href="/settings" className="nexus-project-tree__destination focus-ring"><Settings className="h-3.5 w-3.5" /><span>Settings</span></a>
        <a href="/billing" className="nexus-project-tree__destination focus-ring"><CreditCard className="h-3.5 w-3.5" /><span>Plan &amp; usage</span></a>
      </nav>
      <SidebarContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
