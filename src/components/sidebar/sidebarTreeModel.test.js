import {
  buildSidebarTree,
  formatSidebarTimestamp,
  searchSidebar,
} from "./sidebarTreeModel";

describe("sidebarTreeModel", () => {
  test("keeps unassigned chats in General and nests assigned chats under projects", () => {
    const tree = buildSidebarTree({
      projects: [
        { projectId: "project-a", title: "Sword Simulator" },
        { projectId: "project-b", title: "Obby" },
      ],
      chats: [
        { id: "general", title: "Brainstorm", updatedAt: 4 },
        { id: "assigned", projectId: "project-a", title: "Combat loop", updatedAt: 3 },
        { id: "orphan", projectId: "deleted-project", title: "Recovered", updatedAt: 2 },
      ],
    });

    expect(tree.generalChats.map((chat) => chat.id)).toEqual(["general", "orphan"]);
    expect(tree.projects.find((project) => project.projectId === "project-a").chats)
      .toEqual([expect.objectContaining({ id: "assigned" })]);
    expect(tree.projects.find((project) => project.projectId === "project-b").chats)
      .toEqual([]);
  });

  test("sorts projects by pin, Studio connection, active run, then recent activity", () => {
    const tree = buildSidebarTree({
      projects: [
        { projectId: "recent", title: "Recent", updatedAt: 900 },
        { projectId: "active", title: "Active", updatedAt: 300 },
        { projectId: "connected", title: "Connected", updatedAt: 200 },
        { projectId: "pinned", title: "Pinned", updatedAt: 100 },
      ],
      chats: [
        { id: "active-chat", projectId: "active", updatedAt: 400 },
      ],
      pinnedProjectIds: new Set(["pinned"]),
      connectedProjectId: "connected",
      activeAgentStatusByChat: { "active-chat": "running" },
    });

    expect(tree.projects.map((project) => project.projectId)).toEqual([
      "pinned",
      "connected",
      "active",
      "recent",
    ]);
  });

  test("sorts chats by pin, active run, then update time", () => {
    const tree = buildSidebarTree({
      chats: [
        { id: "recent", updatedAt: 900 },
        { id: "active", updatedAt: 100 },
        { id: "pinned", updatedAt: 50 },
      ],
      pinnedChatIds: new Set(["pinned"]),
      activeAgentStatusByChat: { active: "waiting" },
    });

    expect(tree.generalChats.map((chat) => chat.id)).toEqual([
      "pinned",
      "active",
      "recent",
    ]);
  });

  test("searches projects, chats, project context, and creations", () => {
    const tree = buildSidebarTree({
      projects: [{ projectId: "sword", title: "Sword Simulator", placeId: "123" }],
      chats: [
        { id: "combat", projectId: "sword", title: "Combat loop" },
        { id: "general", title: "UI polish", recentSnippet: "cyan controls" },
      ],
    });

    expect(searchSidebar({ tree, query: "sword" }).projects.map((item) => item.projectId))
      .toEqual(["sword"]);
    expect(searchSidebar({ tree, query: "sword" }).chats.map((item) => item.id))
      .toEqual(["combat"]);
    expect(searchSidebar({
      tree,
      query: "inventory",
      scripts: [{ id: "script-1", path: "ReplicatedStorage/Inventory.lua" }],
    }).creations.map((item) => item.id)).toEqual(["script-1"]);
  });

  test("formats compact relative timestamps", () => {
    const now = Date.UTC(2026, 6, 26, 12, 0, 0);
    expect(formatSidebarTimestamp(now - 20_000, now)).toBe("now");
    expect(formatSidebarTimestamp(now - 5 * 60_000, now)).toBe("5m");
    expect(formatSidebarTimestamp(now - 3 * 3_600_000, now)).toBe("3h");
    expect(formatSidebarTimestamp(now - 2 * 86_400_000, now)).toBe("2d");
  });
});
