import { ACTIVE_AGENT_STATES } from "../../lib/agentRuntimeV2Api";

export function timeValue(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function isActiveRunStatus(status) {
  return ACTIVE_AGENT_STATES.has(String(status || "").trim().toLowerCase());
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortSidebarChats(chats = [], {
  pinnedChatIds = new Set(),
  activeAgentStatusByChat = {},
  generatingChatIds = [],
} = {}) {
  const generating = new Set(generatingChatIds);
  const active = (chat) => (
    generating.has(chat.id) || isActiveRunStatus(activeAgentStatusByChat[chat.id])
  );

  return [...chats].sort((a, b) => {
    const pinnedDifference = Number(pinnedChatIds.has(b.id)) - Number(pinnedChatIds.has(a.id));
    if (pinnedDifference) return pinnedDifference;
    const activeDifference = Number(active(b)) - Number(active(a));
    if (activeDifference) return activeDifference;
    const timeDifference = timeValue(b.updatedAt || b.createdAt) - timeValue(a.updatedAt || a.createdAt);
    if (timeDifference) return timeDifference;
    const titleDifference = compareText(a.title || "Untitled chat", b.title || "Untitled chat");
    return titleDifference || compareText(a.id, b.id);
  });
}

export function buildSidebarTree({
  projects = [],
  chats = [],
  pinnedProjectIds = new Set(),
  pinnedChatIds = new Set(),
  connectedProjectId = null,
  activeAgentStatusByChat = {},
  generatingChatIds = [],
} = {}) {
  const projectIds = new Set(projects.map((project) => String(project.projectId || "")));
  const chatsByProject = new Map(projects.map((project) => [String(project.projectId), []]));
  const generalChats = [];

  chats.forEach((chat) => {
    const projectId = String(chat.projectId || "");
    if (projectId && projectIds.has(projectId)) chatsByProject.get(projectId).push(chat);
    else generalChats.push(chat);
  });

  const generating = new Set(generatingChatIds);
  const projectNodes = projects.map((project) => {
    const projectId = String(project.projectId);
    const projectChats = sortSidebarChats(chatsByProject.get(projectId), {
      pinnedChatIds,
      activeAgentStatusByChat,
      generatingChatIds,
    });
    const activeRunCount = projectChats.reduce((count, chat) => (
      count + Number(generating.has(chat.id) || isActiveRunStatus(activeAgentStatusByChat[chat.id]))
    ), 0);
    const chatActivityAt = projectChats.reduce(
      (latest, chat) => Math.max(latest, timeValue(chat.updatedAt || chat.createdAt)),
      0
    );
    return {
      ...project,
      projectId,
      chats: projectChats,
      activeRunCount,
      isConnected: projectId === String(connectedProjectId || ""),
      isPinned: pinnedProjectIds.has(projectId),
      lastActivityAt: Math.max(
        timeValue(project.lastActivityAt || project.updatedAt || project.createdAt),
        chatActivityAt
      ),
    };
  });

  projectNodes.sort((a, b) => {
    const pinnedDifference = Number(b.isPinned) - Number(a.isPinned);
    if (pinnedDifference) return pinnedDifference;
    const connectedDifference = Number(b.isConnected) - Number(a.isConnected);
    if (connectedDifference) return connectedDifference;
    const activeDifference = Number(b.activeRunCount > 0) - Number(a.activeRunCount > 0);
    if (activeDifference) return activeDifference;
    const timeDifference = b.lastActivityAt - a.lastActivityAt;
    if (timeDifference) return timeDifference;
    const titleDifference = compareText(a.title || "Untitled project", b.title || "Untitled project");
    return titleDifference || compareText(a.projectId, b.projectId);
  });

  return {
    generalChats: sortSidebarChats(generalChats, {
      pinnedChatIds,
      activeAgentStatusByChat,
      generatingChatIds,
    }),
    projects: projectNodes,
  };
}

function matchesQuery(values, query) {
  return values.some((value) => String(value || "").toLowerCase().includes(query));
}

export function searchSidebar({ tree, scripts = [], query = "" } = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return { projects: [], chats: [], creations: [] };

  const projects = tree.projects.filter((project) => matchesQuery([
    project.title,
    project.placeId,
    project.studioTargetLabel,
  ], normalizedQuery));

  const projectTitleById = new Map(tree.projects.map((project) => [project.projectId, project.title]));
  const chats = [...tree.generalChats, ...tree.projects.flatMap((project) => project.chats)]
    .filter((chat) => matchesQuery([
      chat.title,
      chat.lastMessage,
      chat.recentSnippet,
      projectTitleById.get(String(chat.projectId || "")),
    ], normalizedQuery));

  const creations = scripts.filter((script) => matchesQuery([
    script.title,
    script.name,
    script.path,
    script.code,
  ], normalizedQuery));

  return { projects, chats, creations };
}

export function formatSidebarTimestamp(value, now = Date.now()) {
  const timestamp = timeValue(value);
  if (!timestamp) return "";
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  if (elapsed < 7 * 86_400_000) return `${Math.floor(elapsed / 86_400_000)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
