import {
  buildSidebarTree,
  formatSidebarTimestamp,
  isActiveRunStatus,
  searchSidebar,
} from "./sidebarTreeModel";
import {
  ACTIVE_AGENT_STATES,
  TERMINAL_AGENT_STATES,
} from "../../lib/agentRuntimeV2Api";

const EXPECTED_ACTIVE_AGENT_STATES = [
  "active",
  "in_progress",
  "running",
  "queued",
  "planning",
  "waiting_user",
  "waiting_studio",
  "awaiting_studio_target",
  "awaiting_approval",
  "waiting_external",
  "reconnecting",
  "verifying",
];

const EXPECTED_TERMINAL_AGENT_STATES = [
  "completed",
  "failed",
  "cancelled",
];

describe("sidebarTreeModel", () => {
  test("uses the exhaustive canonical V2 active and terminal status definitions", () => {
    expect([...ACTIVE_AGENT_STATES]).toEqual(EXPECTED_ACTIVE_AGENT_STATES);
    expect([...TERMINAL_AGENT_STATES]).toEqual(EXPECTED_TERMINAL_AGENT_STATES);

    for (const status of EXPECTED_ACTIVE_AGENT_STATES) {
      expect(isActiveRunStatus(status)).toBe(true);
    }
    for (const status of EXPECTED_TERMINAL_AGENT_STATES) {
      expect(isActiveRunStatus(status)).toBe(false);
    }
    expect(isActiveRunStatus(" WAITING_STUDIO ")).toBe(true);
    expect(isActiveRunStatus("waiting")).toBe(false);
    expect(isActiveRunStatus("unknown")).toBe(false);
  });

  test.each([
    "waiting_user",
    "waiting_studio",
    "awaiting_studio_target",
  ])("counts %s as active in project ordering", (status) => {
    const tree = buildSidebarTree({
      projects: [
        { projectId: "idle", title: "Idle", updatedAt: 900 },
        { projectId: "waiting", title: "Waiting", updatedAt: 100 },
      ],
      chats: [{ id: "waiting-chat", projectId: "waiting", updatedAt: 100 }],
      activeAgentStatusByChat: { "waiting-chat": status },
    });

    expect(tree.projects.map((project) => project.projectId)).toEqual(["waiting", "idle"]);
    expect(tree.projects[0].activeRunCount).toBe(1);
  });

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
      activeAgentStatusByChat: { active: "waiting_user" },
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
