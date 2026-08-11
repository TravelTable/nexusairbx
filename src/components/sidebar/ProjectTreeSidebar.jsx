import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Folder,
  FolderOpen,
  FolderTree,
  Link2,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lib/icons";
import SidebarContextMenu from "./SidebarContextMenu";
import {
  buildSidebarTree,
  formatSidebarTimestamp,
  isActiveRunStatus,
  searchSidebar,
} from "./sidebarTreeModel";
import "./ProjectTreeSidebar.css";

const PROJECTS_ROOT_ID = "__projects__";
const GENERAL_ROOT_ID = "__general__";
const GENERAL_CHATS_PAGE_SIZE = 10;

function readStoredState(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function readExpandedIds(storagePrefix) {
  const fallback = [GENERAL_ROOT_ID, PROJECTS_ROOT_ID];
  const stored = readStoredState(`${storagePrefix}:expanded`, null);
  if (stored == null) return new Set(fallback);
  const next = new Set(Array.isArray(stored) ? stored.map(String) : fallback);
  // General was always open before it became a folder. Keep it expanded once
  // for existing sidebars, then honor the user's collapse preference after that.
  try {
    const migratedKey = `${storagePrefix}:general-folder`;
    if (!window.localStorage.getItem(migratedKey)) {
      next.add(GENERAL_ROOT_ID);
      window.localStorage.setItem(migratedKey, "1");
    }
  } catch {
    next.add(GENERAL_ROOT_ID);
  }
  return next;
}

function RunBadge({ status, generating = false }) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "failed" || normalized === "error") {
    return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" title="Run failed" />;
  }
  if (["completed", "complete", "succeeded", "done"].includes(normalized)) {
    return <Check className="h-3 w-3 shrink-0 text-emerald-400/80" aria-label="Run complete" />;
  }
  if (generating || isActiveRunStatus(normalized)) {
    const waiting = normalized.includes("waiting") || normalized.includes("approval") || normalized.includes("input");
    return (
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${waiting ? "bg-amber-300" : "bg-[#00f5d4] shadow-[0_0_7px_rgba(0,245,212,.55)]"}`}
        title={waiting ? "Waiting" : "Running"}
      />
    );
  }
  return null;
}

function InlineRename({ value, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={draft}
      maxLength={120}
      aria-label="Rename"
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") onCommit(draft);
        if (event.key === "Escape") onCancel();
      }}
      className="min-w-0 flex-1 rounded border border-[#00f5d4]/50 bg-black/50 px-1.5 py-0.5 text-xs text-white outline-none"
    />
  );
}

function EmptyChats({ onNewChat }) {
  return (
    <button
      type="button"
      onClick={onNewChat}
      className="ml-7 flex h-8 items-center gap-2 rounded-md px-2 text-[11px] text-gray-600 transition hover:bg-white/[.035] hover:text-gray-300"
    >
      <Plus className="h-3 w-3" />
      Start a chat
    </button>
  );
}

export default function ProjectTreeSidebar({
  userKey = "guest",
  projects = [],
  chats = [],
  scripts = [],
  currentChatId = null,
  currentProjectId = null,
  connectedProjectId = null,
  generatingChatIds = [],
  activeAgentStatusByChat = {},
  projectsLoading = false,
  creatingProject = false,
  studioOptions = [],
  onNewChat = () => {},
  onOpenChat = () => {},
  onOpenCreation = () => {},
  onRenameChat = () => {},
  onRenameProject = () => {},
  onMoveChat = () => {},
  onDeleteChat = () => {},
  onDeleteProject = () => {},
  onDetectProject = () => {},
  onChooseStudioOption = () => {},
  onCollapse = () => {},
}) {
  const storagePrefix = `nexusrbx:sidebar:${userKey || "guest"}`;
  const [expandedIds, setExpandedIds] = useState(() => readExpandedIds(storagePrefix));
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => new Set(
    readStoredState(`${storagePrefix}:pinned-projects`, [])
  ));
  const [pinnedChatIds, setPinnedChatIds] = useState(() => new Set(
    readStoredState(`${storagePrefix}:pinned-chats`, [])
  ));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [menu, setMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [focusedId, setFocusedId] = useState(GENERAL_ROOT_ID);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const [generalChatsLimit, setGeneralChatsLimit] = useState(GENERAL_CHATS_PAGE_SIZE);
  const searchRef = useRef(null);
  const scrollRef = useRef(null);
  const knownChatIdsRef = useRef(new Set(chats.map((chat) => String(chat?.id || "")).filter(Boolean)));
  const [insertedChatIds, setInsertedChatIds] = useState(new Set());
  const generatingSet = useMemo(() => new Set(generatingChatIds), [generatingChatIds]);

  useEffect(() => {
    setExpandedIds(readExpandedIds(storagePrefix));
    setPinnedProjectIds(new Set(readStoredState(`${storagePrefix}:pinned-projects`, [])));
    setPinnedChatIds(new Set(readStoredState(`${storagePrefix}:pinned-chats`, [])));
    setGeneralChatsLimit(GENERAL_CHATS_PAGE_SIZE);
  }, [storagePrefix]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storagePrefix}:expanded`, JSON.stringify([...expandedIds]));
    } catch {
      // The tree still works when storage is unavailable.
    }
  }, [expandedIds, storagePrefix]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storagePrefix}:pinned-projects`, JSON.stringify([...pinnedProjectIds]));
      window.localStorage.setItem(`${storagePrefix}:pinned-chats`, JSON.stringify([...pinnedChatIds]));
    } catch {
      // Pinning remains available for the current session.
    }
  }, [pinnedChatIds, pinnedProjectIds, storagePrefix]);

  useEffect(() => {
    const currentIds = chats.map((chat) => String(chat?.id || "")).filter(Boolean);
    const additions = currentIds.filter((id) => !knownChatIdsRef.current.has(id));
    knownChatIdsRef.current = new Set(currentIds);
    if (!additions.length) return undefined;

    setInsertedChatIds(new Set(additions));
    const timer = window.setTimeout(() => setInsertedChatIds(new Set()), 200);
    return () => window.clearTimeout(timer);
  }, [chats]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        onNewChat(currentProjectId || null);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [currentProjectId, onNewChat]);

  const tree = useMemo(() => buildSidebarTree({
    projects,
    chats,
    pinnedProjectIds,
    pinnedChatIds,
    connectedProjectId,
    activeAgentStatusByChat,
    generatingChatIds,
  }), [
    projects,
    chats,
    pinnedProjectIds,
    pinnedChatIds,
    connectedProjectId,
    activeAgentStatusByChat,
    generatingChatIds,
  ]);
  const searchResults = useMemo(
    () => searchSidebar({ tree, scripts, query: deferredQuery }),
    [deferredQuery, scripts, tree]
  );
  const searching = Boolean(query.trim());
  const visibleGeneralChats = useMemo(
    () => tree.generalChats.slice(0, generalChatsLimit),
    [generalChatsLimit, tree.generalChats]
  );
  const hasMoreGeneralChats = tree.generalChats.length > generalChatsLimit;

  useEffect(() => {
    const selectedProjectId = String(currentProjectId || "");
    if (selectedProjectId) {
      setExpandedIds((current) => {
        if (current.has(selectedProjectId) && current.has(PROJECTS_ROOT_ID)) return current;
        return new Set([...current, PROJECTS_ROOT_ID, selectedProjectId]);
      });
      return;
    }
    if (!currentChatId) return;
    setExpandedIds((current) => {
      if (current.has(GENERAL_ROOT_ID)) return current;
      return new Set([...current, GENERAL_ROOT_ID]);
    });
  }, [currentChatId, currentProjectId]);

  useEffect(() => {
    if (!currentChatId) return;
    const index = tree.generalChats.findIndex((chat) => chat.id === currentChatId);
    if (index < 0) return;
    const minimum = Math.ceil((index + 1) / GENERAL_CHATS_PAGE_SIZE) * GENERAL_CHATS_PAGE_SIZE;
    setGeneralChatsLimit((current) => Math.max(current, minimum));
  }, [currentChatId, tree.generalChats]);

  const toggleExpanded = useCallback((id, force) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      const expanded = force == null ? !next.has(id) : force;
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const togglePinProject = useCallback((projectId) => {
    setPinnedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const togglePinChat = useCallback((chatId) => {
    setPinnedChatIds((current) => {
      const next = new Set(current);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const openMenu = useCallback((event, nextMenu) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      ...nextMenu,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const projectMenu = useCallback((event, project) => openMenu(event, {
    label: `${project.title || "Project"} actions`,
    items: [
      {
        id: "new-chat",
        label: "New chat",
        icon: Plus,
        onSelect: () => onNewChat(project.projectId),
      },
      {
        id: "rename",
        label: "Rename",
        icon: Pencil,
        onSelect: () => setRenaming({ type: "project", id: project.projectId }),
      },
      {
        id: "pin",
        label: project.isPinned ? "Unpin project" : "Pin project",
        icon: Bookmark,
        onSelect: () => togglePinProject(project.projectId),
      },
      { id: "divider", separator: true },
      {
        id: "delete",
        label: "Delete project",
        icon: Trash2,
        danger: true,
        disabled: project.activeRunCount > 0,
        onSelect: () => onDeleteProject(project.projectId),
      },
    ],
  }), [onDeleteProject, onNewChat, openMenu, togglePinProject]);

  const chatMenu = useCallback((event, chat, projectId = null) => openMenu(event, {
    label: `${chat.title || "Chat"} actions`,
    items: [
      {
        id: "rename",
        label: "Rename",
        icon: Pencil,
        onSelect: () => setRenaming({ type: "chat", id: chat.id }),
      },
      {
        id: "pin",
        label: pinnedChatIds.has(chat.id) ? "Unpin chat" : "Pin chat",
        icon: Bookmark,
        onSelect: () => togglePinChat(chat.id),
      },
      {
        id: "move",
        label: "Move to",
        icon: Folder,
        children: [
          {
            id: "move-general",
            label: "General",
            icon: MessageSquare,
            disabled: !projectId,
            onSelect: () => onMoveChat(chat.id, null),
          },
          ...tree.projects.map((project) => ({
            id: `move-${project.projectId}`,
            label: project.title || "Untitled project",
            icon: Folder,
            disabled: project.projectId === String(projectId || ""),
            onSelect: () => onMoveChat(chat.id, project.projectId),
          })),
        ],
      },
      { id: "divider", separator: true },
      {
        id: "delete",
        label: "Delete chat",
        icon: Trash2,
        danger: true,
        disabled: generatingSet.has(chat.id) || isActiveRunStatus(activeAgentStatusByChat[chat.id]),
        onSelect: () => onDeleteChat(chat.id),
      },
    ],
  }), [
    activeAgentStatusByChat,
    generatingSet,
    onDeleteChat,
    onMoveChat,
    openMenu,
    pinnedChatIds,
    togglePinChat,
    tree.projects,
  ]);

  const updateScrollEdges = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollEdges({
      top: element.scrollTop > 2,
      bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 2,
    });
  }, []);

  useEffect(() => {
    updateScrollEdges();
  }, [expandedIds, generalChatsLimit, projects.length, chats.length, searching, updateScrollEdges]);

  const handleTreeKeyDown = useCallback((event) => {
    if (event.target?.tagName === "INPUT") return;
    const container = scrollRef.current;
    if (!container) return;
    const items = [...container.querySelectorAll('[data-sidebar-treeitem="true"]')]
      .filter((element) => !element.closest('[aria-hidden="true"]'));
    const currentIndex = Math.max(0, items.indexOf(event.currentTarget));
    let next = null;
    if (event.key === "ArrowDown") next = items[Math.min(items.length - 1, currentIndex + 1)];
    if (event.key === "ArrowUp") next = items[Math.max(0, currentIndex - 1)];
    if (event.key === "Home") next = items[0];
    if (event.key === "End") next = items[items.length - 1];
    if (event.key === "ArrowRight") {
      const id = event.currentTarget.dataset.treeId;
      if (event.currentTarget.getAttribute("aria-expanded") === "false") toggleExpanded(id, true);
      else next = items[Math.min(items.length - 1, currentIndex + 1)];
    }
    if (event.key === "ArrowLeft") {
      const id = event.currentTarget.dataset.treeId;
      if (event.currentTarget.getAttribute("aria-expanded") === "true") toggleExpanded(id, false);
      else {
        const parentId = event.currentTarget.dataset.parentId;
        next = items.find((element) => element.dataset.treeId === parentId);
      }
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.querySelector('[data-tree-activate="true"]')?.click();
      return;
    }
    if (next) {
      event.preventDefault();
      setFocusedId(next.dataset.treeId);
      next.focus();
    }
  }, [toggleExpanded]);

  const treeItemProps = (id, { parentId = "", label, level = 1 } = {}) => ({
    role: "treeitem",
    tabIndex: focusedId === id ? 0 : -1,
    "aria-label": label,
    "aria-level": level,
    "data-sidebar-treeitem": "true",
    "data-tree-id": id,
    "data-parent-id": parentId,
    onFocus: () => setFocusedId(id),
    onKeyDown: handleTreeKeyDown,
  });

  const commitRename = async (type, id, title) => {
    const nextTitle = String(title || "").trim();
    setRenaming(null);
    if (!nextTitle) return;
    if (type === "chat") await onRenameChat(id, nextTitle);
    else await onRenameProject(id, nextTitle);
  };

  const renderChat = (chat, projectId = null, parentId = GENERAL_ROOT_ID) => {
    const renamingThis = renaming?.type === "chat" && renaming.id === chat.id;
    return (
      <div
        key={chat.id}
        {...treeItemProps(`chat:${chat.id}`, {
          parentId,
          label: chat.title || "Untitled chat",
          level: projectId ? 3 : 2,
        })}
        data-selected={currentChatId === chat.id}
        className={[
          "nexus-tree-row group h-[31px] pl-7 pr-1 text-xs",
          insertedChatIds.has(String(chat.id)) ? "nexus-tree-row-in" : "",
        ].filter(Boolean).join(" ")}
        onContextMenu={(event) => chatMenu(event, chat, projectId)}
      >
        {renamingThis ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-600" />
            <InlineRename
              value={chat.title || "Untitled chat"}
              onCommit={(title) => commitRename("chat", chat.id, title)}
              onCancel={() => setRenaming(null)}
            />
            <RunBadge
              status={activeAgentStatusByChat[chat.id]}
              generating={generatingSet.has(chat.id)}
            />
          </div>
        ) : (
          <button
            type="button"
            data-tree-activate="true"
            aria-label={chat.title || "Untitled chat"}
            onClick={() => onOpenChat(chat.id)}
            className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left"
            title={chat.title || "Untitled chat"}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-600" />
            <span className="min-w-0 flex-1 truncate">{chat.title || "Untitled chat"}</span>
            <RunBadge
              status={activeAgentStatusByChat[chat.id]}
              generating={generatingSet.has(chat.id)}
            />
            {pinnedChatIds.has(chat.id) && <Bookmark className="h-3 w-3 shrink-0 text-gray-600" />}
            <span className="hidden shrink-0 text-[10px] text-gray-600 group-hover:block">
              {formatSidebarTimestamp(chat.updatedAt || chat.createdAt)}
            </span>
          </button>
        )}
        <button
          type="button"
          aria-label={`Actions for ${chat.title || "chat"}`}
          onClick={(event) => chatMenu(event, chat, projectId)}
          className="nexus-tree-overflow rounded p-1 text-gray-600 hover:bg-white/[.06] hover:text-white"
        >
          <Menu className="h-3 w-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="nexus-project-tree flex h-full min-h-0 flex-col bg-[#0d0d0f] text-gray-300">
      <div className="border-b border-white/[.06] px-3 pb-3 pt-2.5">
        <div className="mb-2.5 flex h-7 items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">NexusRBX</span>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-white/[.05] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onNewChat(currentProjectId || null)}
          className="mb-2 flex h-8 w-full items-center gap-2 rounded-md border border-white/[.07] bg-white/[.035] px-2.5 text-xs font-medium text-gray-200 transition hover:bg-white/[.065] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-[#00f5d4]" />
          <span className="flex-1 text-left">New chat</span>
          <kbd className="text-[9px] font-normal text-gray-600">⌘N</kbd>
        </button>
        <div className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search projects and chats"
            placeholder="Search projects and chats"
            className="h-8 w-full rounded-md border border-white/[.07] bg-black/25 pl-8 pr-14 text-xs text-white outline-none transition placeholder:text-gray-600 focus:border-[#00f5d4]/35 focus:bg-black/40"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-600 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600">⌘K</kbd>
          )}
        </div>
        {studioOptions.length > 0 && (
          <div className="mt-2 rounded-md border border-[#00f5d4]/15 bg-[#00f5d4]/[.04] p-1">
            {studioOptions.map((option) => (
              <button
                key={option.id || option.placeId}
                type="button"
                onClick={() => onChooseStudioOption(option)}
                className="block h-7 w-full truncate rounded px-2 text-left text-[11px] text-gray-400 hover:bg-white/[.05] hover:text-white"
              >
                {option.label || option.placeName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className="nexus-sidebar-scroll-mask"
          data-edge="top"
          data-visible={scrollEdges.top}
        />
        <div
          ref={scrollRef}
          role={searching ? undefined : "tree"}
          aria-label={searching ? undefined : "Projects and chats"}
          onScroll={updateScrollEdges}
          className="nexus-project-tree-scroll h-full overflow-y-auto px-2 py-3"
        >
          {searching ? (
            <div className="space-y-4" aria-label="Search results">
              {searchResults.projects.length > 0 && (
                <section>
                  <h2 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-gray-600">
                    Projects
                  </h2>
                  {searchResults.projects.map((project) => (
                    <button
                      key={project.projectId}
                      type="button"
                      onClick={() => {
                        toggleExpanded(PROJECTS_ROOT_ID, true);
                        toggleExpanded(project.projectId, true);
                        setQuery("");
                      }}
                      className="nexus-tree-row h-[34px] px-2 text-xs"
                    >
                      <Folder className="mr-2 h-3.5 w-3.5 text-gray-600" />
                      <span className="truncate">{project.title || "Untitled project"}</span>
                    </button>
                  ))}
                </section>
              )}
              {searchResults.chats.length > 0 && (
                <section>
                  <h2 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-gray-600">
                    Chats
                  </h2>
                  {searchResults.chats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onOpenChat(chat.id)}
                      className="nexus-tree-row h-[34px] px-2 text-xs"
                    >
                      <MessageSquare className="mr-2 h-3.5 w-3.5 shrink-0 text-gray-600" />
                      <span className="min-w-0 flex-1 truncate text-left">{chat.title || "Untitled chat"}</span>
                    </button>
                  ))}
                </section>
              )}
              {searchResults.creations.length > 0 && (
                <section>
                  <h2 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-gray-600">
                    Files &amp; creations
                  </h2>
                  {searchResults.creations.map((script) => (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => onOpenCreation(script.id)}
                      className="nexus-tree-row h-[34px] px-2 text-xs"
                    >
                      <FileCode className="mr-2 h-3.5 w-3.5 shrink-0 text-gray-600" />
                      <span className="min-w-0 flex-1 truncate text-left">{script.title || script.name || "Untitled creation"}</span>
                    </button>
                  ))}
                </section>
              )}
              {!searchResults.projects.length && !searchResults.chats.length && !searchResults.creations.length && (
                <div className="px-3 py-10 text-center text-xs text-gray-600">
                  No projects, chats, or creations found.
                </div>
              )}
            </div>
          ) : (
            <>
              <section aria-label="General chats">
                <div
                  {...treeItemProps(GENERAL_ROOT_ID, { label: "General", level: 1 })}
                  aria-expanded={expandedIds.has(GENERAL_ROOT_ID)}
                  className="nexus-tree-row h-[34px] px-2 text-xs font-medium"
                >
                  <button
                    type="button"
                    data-tree-activate="true"
                    data-tree-toggle="true"
                    aria-label="General chats"
                    onClick={() => toggleExpanded(GENERAL_ROOT_ID)}
                    className="flex min-w-0 flex-1 items-center self-stretch text-left"
                  >
                    <ChevronRight
                      className="nexus-tree-chevron mr-1.5 h-3.5 w-3.5 text-gray-600"
                      data-expanded={expandedIds.has(GENERAL_ROOT_ID)}
                    />
                    <MessageSquare className="mr-2 h-3.5 w-3.5 text-gray-500" />
                    <span className="flex-1">General</span>
                    <span className="text-[10px] font-normal text-gray-600">{tree.generalChats.length}</span>
                  </button>
                </div>
                <div
                  className="nexus-tree-children"
                  data-expanded={expandedIds.has(GENERAL_ROOT_ID)}
                  aria-hidden={!expandedIds.has(GENERAL_ROOT_ID)}
                >
                  <div className="min-h-0 overflow-hidden">
                    {visibleGeneralChats.map((chat) => renderChat(chat))}
                    {hasMoreGeneralChats && (
                      <button
                        type="button"
                        onClick={() => setGeneralChatsLimit((current) => current + GENERAL_CHATS_PAGE_SIZE)}
                        className="ml-7 flex h-8 w-[calc(100%-1.75rem)] items-center rounded-md px-2 text-[11px] text-gray-600 transition hover:bg-white/[.035] hover:text-gray-300"
                      >
                        Load more
                        <span className="ml-auto text-[10px] text-gray-700">
                          {tree.generalChats.length - generalChatsLimit} more
                        </span>
                      </button>
                    )}
                    {!tree.generalChats.length && <EmptyChats onNewChat={() => onNewChat(null)} />}
                  </div>
                </div>
              </section>

              <div className="my-3 h-px bg-white/[.055]" />

              <section aria-label="Projects">
                <div
                  {...treeItemProps(PROJECTS_ROOT_ID, { label: "Projects", level: 1 })}
                  aria-expanded={expandedIds.has(PROJECTS_ROOT_ID)}
                  className="nexus-tree-row h-[34px] px-2 text-xs font-medium"
                >
                  <button
                    type="button"
                    data-tree-activate="true"
                    data-tree-toggle="true"
                    aria-label="Projects"
                    onClick={() => toggleExpanded(PROJECTS_ROOT_ID)}
                    className="flex min-w-0 flex-1 items-center self-stretch text-left"
                  >
                    <ChevronRight
                      className="nexus-tree-chevron mr-1.5 h-3.5 w-3.5 text-gray-600"
                      data-expanded={expandedIds.has(PROJECTS_ROOT_ID)}
                    />
                    <FolderTree className="mr-2 h-3.5 w-3.5 text-gray-500" />
                    <span className="flex-1">Projects</span>
                    <span className="text-[10px] font-normal text-gray-600">{tree.projects.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDetectProject}
                    disabled={creatingProject}
                    aria-label="Detect project from Studio"
                    title="Detect from Studio"
                    className="ml-1 rounded p-1 text-gray-600 hover:bg-white/[.06] hover:text-[#00f5d4] disabled:opacity-40"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  className="nexus-tree-children"
                  data-expanded={expandedIds.has(PROJECTS_ROOT_ID)}
                  aria-hidden={!expandedIds.has(PROJECTS_ROOT_ID)}
                >
                  <div className="min-h-0 overflow-hidden">
                    {tree.projects.map((project) => {
                      const expanded = expandedIds.has(project.projectId);
                      const renamingThis = renaming?.type === "project" && renaming.id === project.projectId;
                      return (
                        <div key={project.projectId}>
                          <div
                            {...treeItemProps(project.projectId, {
                              parentId: PROJECTS_ROOT_ID,
                              label: project.title || "Untitled project",
                              level: 2,
                            })}
                            aria-expanded={expanded}
                            data-selected={!currentChatId && String(currentProjectId || "") === project.projectId}
                            className="nexus-tree-row group h-[34px] pl-3 pr-1 text-xs"
                            onContextMenu={(event) => projectMenu(event, project)}
                          >
                            {renamingThis ? (
                              <div className="flex min-w-0 flex-1 items-center self-stretch">
                                <ChevronRight
                                  className="nexus-tree-chevron mr-1 h-3.5 w-3.5 shrink-0 text-gray-600"
                                  data-expanded={expanded}
                                />
                                {expanded
                                  ? <FolderOpen className="mr-2 h-3.5 w-3.5 shrink-0 text-[#9b5de5]/80" />
                                  : <Folder className="mr-2 h-3.5 w-3.5 shrink-0 text-[#9b5de5]/70" />}
                                <InlineRename
                                  value={project.title || "Untitled project"}
                                  onCommit={(title) => commitRename("project", project.projectId, title)}
                                  onCancel={() => setRenaming(null)}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                data-tree-activate="true"
                                data-tree-toggle="true"
                                aria-label={project.title || "Untitled project"}
                                onClick={() => toggleExpanded(project.projectId)}
                                className="flex min-w-0 flex-1 items-center self-stretch text-left"
                              >
                              <ChevronRight
                                className="nexus-tree-chevron mr-1 h-3.5 w-3.5 shrink-0 text-gray-600"
                                data-expanded={expanded}
                              />
                              {expanded
                                ? <FolderOpen className="mr-2 h-3.5 w-3.5 shrink-0 text-[#9b5de5]/80" />
                                : <Folder className="mr-2 h-3.5 w-3.5 shrink-0 text-[#9b5de5]/70" />}
                              <span className="min-w-0 flex-1 truncate">{project.title || "Untitled project"}</span>
                              {project.isConnected && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]"
                                  title="Connected to Studio"
                                />
                              )}
                              {project.activeRunCount > 0 && (
                                <span className="ml-1 rounded bg-[#00f5d4]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#00f5d4]">
                                  {project.activeRunCount}
                                </span>
                              )}
                              {project.isPinned && <Bookmark className="ml-1 h-3 w-3 shrink-0 text-gray-600" />}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Actions for ${project.title || "project"}`}
                              onClick={(event) => projectMenu(event, project)}
                              className="nexus-tree-overflow rounded p-1 text-gray-600 hover:bg-white/[.06] hover:text-white"
                            >
                              <Menu className="h-3 w-3" />
                            </button>
                          </div>
                          <div
                            className="nexus-tree-children"
                            data-expanded={expanded}
                            aria-hidden={!expanded}
                          >
                            <div className="min-h-0 overflow-hidden">
                              {project.chats.map((chat) => renderChat(chat, project.projectId, project.projectId))}
                              {!project.chats.length && (
                                <EmptyChats onNewChat={() => onNewChat(project.projectId)} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!projectsLoading && !tree.projects.length && (
                      <button
                        type="button"
                        onClick={onDetectProject}
                        className="ml-3 flex h-9 items-center gap-2 rounded-md px-2 text-[11px] text-gray-600 hover:bg-white/[.04] hover:text-gray-300"
                      >
                        <Link2 className="h-3 w-3" />
                        Detect a published Studio game
                      </button>
                    )}
                    {projectsLoading && (
                      <p className="px-8 py-2 text-[11px] text-gray-600">Loading projects…</p>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
        <div
          className="nexus-sidebar-scroll-mask"
          data-edge="bottom"
          data-visible={scrollEdges.bottom}
        />
      </div>
      <SidebarContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
