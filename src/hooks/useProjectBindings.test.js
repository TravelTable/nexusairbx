/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProjectBindings } from "./useProjectBindings";

jest.mock("../lib/projectBindingsApi", () => ({
  listProjectBindings: jest.fn(),
  deleteProjectBinding: jest.fn(),
  findOrCreateProjectBinding: jest.fn(),
  renameProjectBinding: jest.fn(),
}));

const {
  deleteProjectBinding,
  listProjectBindings,
  findOrCreateProjectBinding,
  renameProjectBinding,
} = require("../lib/projectBindingsApi");

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("useProjectBindings openGameProject", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    listProjectBindings.mockResolvedValue({ projects: [] });
  });

  test("selects an existing local project by placeId then syncs via find-or-create", async () => {
    listProjectBindings.mockResolvedValue({
      projects: [{
        projectId: "proj_existing",
        title: "Neon Obby",
        placeId: "4242",
        defaultPlaceId: "4242",
        universeId: "2424",
      }],
    });
    findOrCreateProjectBinding.mockResolvedValue({
      created: false,
      project: {
        projectId: "proj_existing",
        title: "Neon Obby",
        placeId: "4242",
        universeId: "2424",
        studioTargetLabel: "Neon Obby",
      },
    });

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toHaveLength(1);

    let opened;
    await act(async () => {
      opened = await result.current.openGameProject({
        title: "Neon Obby",
        placeId: "4242",
        universeId: "2424",
        studioTargetId: "studio_target_1",
        studioTargetLabel: "Neon Obby",
      });
    });

    expect(findOrCreateProjectBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Neon Obby",
        placeId: "4242",
        defaultPlaceId: "4242",
        universeId: "2424",
        studioTargetId: "studio_target_1",
      })
    );
    expect(opened.projectId).toBe("proj_existing");
    expect(result.current.selectedProjectId).toBe("proj_existing");
  });

  test("creates a new game project when placeId is unseen", async () => {
    findOrCreateProjectBinding.mockResolvedValue({
      created: true,
      project: {
        projectId: "proj_new",
        title: "Arena",
        placeId: "777",
        universeId: "888",
        studioTargetLabel: "Arena",
      },
    });

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let opened;
    await act(async () => {
      opened = await result.current.openGameProject({
        title: "Arena",
        placeId: "777",
        universeId: "888",
        studioTargetId: "t_arena",
      });
    });

    expect(opened.projectId).toBe("proj_new");
    expect(result.current.selectedProjectId).toBe("proj_new");
    expect(result.current.projects[0].title).toBe("Arena");
  });

  test("creates a draft game project from an opaque live Studio target", async () => {
    findOrCreateProjectBinding.mockResolvedValue({
      created: true,
      project: {
        projectId: "proj_local",
        title: "Local Arena",
        placeId: null,
        universeId: null,
        studioTargetId: "studio_target_local",
        status: "draft",
      },
    });

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let opened;
    await act(async () => {
      opened = await result.current.openGameProject({
        title: "Local Arena",
        placeId: null,
        universeId: null,
        studioTargetId: "studio_target_local",
        studioTargetLabel: "Local Arena",
      });
    });

    expect(findOrCreateProjectBinding).toHaveBeenCalledWith({
      title: "Local Arena",
      studioTargetId: "studio_target_local",
      studioTargetLabel: "Local Arena",
    });
    expect(opened).toEqual(expect.objectContaining({
      projectId: "proj_local",
      status: "draft",
    }));
    expect(result.current.selectedProjectId).toBe("proj_local");
    expect(result.current.projects[0]).toEqual(expect.objectContaining({
      studioTargetId: "studio_target_local",
      placeId: null,
      universeId: null,
    }));
  });

  test("does not adopt a local-target draft after the authenticated user changes", async () => {
    const deferredOpen = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValueOnce({
        projects: [{ projectId: "project-b", title: "User B project" }],
      });
    findOrCreateProjectBinding.mockReturnValue(deferredOpen.promise);

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_a" } } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pendingOpen;
    act(() => {
      pendingOpen = result.current.openGameProject({
        title: "User A local project",
        studioTargetId: "studio_target_user_a",
      });
    });

    rerender({ user: { uid: "user_b" } });
    await waitFor(() => expect(result.current.projects[0]?.projectId).toBe("project-b"));

    let staleResult;
    await act(async () => {
      deferredOpen.resolve({
        created: true,
        project: {
          projectId: "project-a-local",
          title: "User A local project",
          studioTargetId: "studio_target_user_a",
          status: "draft",
        },
      });
      staleResult = await pendingOpen;
    });

    expect(staleResult).toBeNull();
    expect(result.current.projects).toEqual([
      expect.objectContaining({ projectId: "project-b", title: "User B project" }),
    ]);
  });

  test("rejects an identity without a live target or published place", async () => {
    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.openGameProject({
      title: "Local place",
      placeId: "0",
      universeId: null,
    })).rejects.toThrow("live Studio target or published place");
    expect(findOrCreateProjectBinding).not.toHaveBeenCalled();
  });

  test("renames a project and updates the local tree immediately", async () => {
    listProjectBindings.mockResolvedValue({
      projects: [{ projectId: "proj_existing", title: "Old title", placeId: "4242" }],
    });
    renameProjectBinding.mockResolvedValue({
      project: { projectId: "proj_existing", title: "Sword Simulator", placeId: "4242" },
    });

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.renameProject("proj_existing", "Sword Simulator");
    });

    expect(renameProjectBinding).toHaveBeenCalledWith("proj_existing", "Sword Simulator");
    expect(result.current.projects[0].title).toBe("Sword Simulator");
  });

  test("does not let an open completion from user A replace user B's visible project", async () => {
    const deferredOpen = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({
        projects: [{
          projectId: "shared-project",
          title: "User A game",
          placeId: "4242",
          universeId: "2424",
        }],
      })
      .mockResolvedValueOnce({
        projects: [{
          projectId: "shared-project",
          title: "User B game",
          placeId: "8484",
          universeId: "4848",
        }],
      });
    findOrCreateProjectBinding.mockReturnValue(deferredOpen.promise);

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_a" } } }
    );
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("User A game"));

    let pendingOpen;
    act(() => {
      pendingOpen = result.current.openGameProject({
        title: "User A game",
        placeId: "4242",
        universeId: "2424",
      });
    });

    rerender({ user: { uid: "user_b" } });
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("User B game"));
    act(() => result.current.setSelectedProjectId("shared-project"));

    let staleResult;
    await act(async () => {
      deferredOpen.resolve({
        created: false,
        project: {
          projectId: "shared-project",
          title: "Stale user A game",
          placeId: "4242",
          universeId: "2424",
        },
      });
      staleResult = await pendingOpen;
    });

    expect(staleResult).toBeNull();
    expect(result.current.projects).toEqual([
      expect.objectContaining({ projectId: "shared-project", title: "User B game" }),
    ]);
    expect(result.current.selectedProjectId).toBe("shared-project");
  });

  test("does not let a rename completion survive an A to B to A auth epoch change", async () => {
    const deferredRename = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({
        projects: [{ projectId: "shared-project", title: "First A session" }],
      })
      .mockResolvedValueOnce({
        projects: [{ projectId: "shared-project", title: "User B game" }],
      })
      .mockResolvedValueOnce({
        projects: [{ projectId: "shared-project", title: "Fresh A session" }],
      });
    renameProjectBinding.mockReturnValue(deferredRename.promise);

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_a" } } }
    );
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("First A session"));

    let pendingRename;
    act(() => {
      pendingRename = result.current.renameProject("shared-project", "Stale rename");
    });

    rerender({ user: { uid: "user_b" } });
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("User B game"));
    rerender({ user: { uid: "user_a" } });
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("Fresh A session"));

    let staleResult;
    await act(async () => {
      deferredRename.resolve({
        project: { projectId: "shared-project", title: "Stale rename" },
      });
      staleResult = await pendingRename;
    });

    expect(staleResult).toBeNull();
    expect(result.current.projects[0]?.title).toBe("Fresh A session");
  });

  test("does not let a delete completion from user A remove user B's visible project", async () => {
    const deferredDelete = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({
        projects: [{ projectId: "shared-project", title: "User A game" }],
      })
      .mockResolvedValueOnce({
        projects: [{ projectId: "shared-project", title: "User B game" }],
      });
    deleteProjectBinding.mockReturnValue(deferredDelete.promise);

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_a" } } }
    );
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("User A game"));

    let pendingDelete;
    act(() => {
      pendingDelete = result.current.deleteProject("shared-project");
    });

    rerender({ user: { uid: "user_b" } });
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("User B game"));
    act(() => result.current.setSelectedProjectId("shared-project"));

    let staleResult;
    await act(async () => {
      deferredDelete.resolve({ ok: true, counts: { chats: 1 } });
      staleResult = await pendingDelete;
    });

    expect(staleResult).toBeNull();
    expect(result.current.projects[0]?.title).toBe("User B game");
    expect(result.current.selectedProjectId).toBe("shared-project");
  });

  test("keeps the latest same-project mutation when completions arrive out of order", async () => {
    const firstRename = createDeferred();
    const secondRename = createDeferred();
    listProjectBindings.mockResolvedValue({
      projects: [{ projectId: "project-a", title: "Original" }],
    });
    renameProjectBinding
      .mockReturnValueOnce(firstRename.promise)
      .mockReturnValueOnce(secondRename.promise);

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_a" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("Original"));

    let pendingFirst;
    let pendingSecond;
    act(() => {
      pendingFirst = result.current.renameProject("project-a", "First rename");
      pendingSecond = result.current.renameProject("project-a", "Second rename");
    });

    await act(async () => {
      secondRename.resolve({
        project: { projectId: "project-a", title: "Second rename" },
      });
      await pendingSecond;
    });
    expect(result.current.projects[0]?.title).toBe("Second rename");

    let staleResult;
    await act(async () => {
      firstRename.resolve({
        project: { projectId: "project-a", title: "First rename" },
      });
      staleResult = await pendingFirst;
    });
    expect(staleResult).toBeNull();
    expect(result.current.projects[0]?.title).toBe("Second rename");
  });

  test("does not let an older same-user refresh drop a newly opened local project", async () => {
    const staleList = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({ projects: [] })
      .mockReturnValueOnce(staleList.promise);
    findOrCreateProjectBinding.mockResolvedValue({
      created: true,
      project: {
        projectId: "project-local",
        title: "Local Arena",
        studioTargetId: "studio_target_local",
        status: "draft",
      },
    });

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_a" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pendingRefresh;
    act(() => {
      pendingRefresh = result.current.refresh();
    });
    await waitFor(() => expect(listProjectBindings).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.openGameProject({
        title: "Local Arena",
        studioTargetId: "studio_target_local",
      });
    });
    expect(result.current.projects.map((project) => project.projectId)).toEqual(["project-local"]);

    await act(async () => {
      staleList.resolve({ projects: [] });
      await pendingRefresh;
    });
    expect(result.current.projects.map((project) => project.projectId)).toEqual(["project-local"]);
    expect(result.current.selectedProjectId).toBe("project-local");
    expect(result.current.loading).toBe(false);
  });

  test("does not let an older same-user refresh revert a completed rename", async () => {
    const staleList = createDeferred();
    const rename = createDeferred();
    listProjectBindings
      .mockResolvedValueOnce({
        projects: [{ projectId: "project-a", title: "Original" }],
      })
      .mockReturnValueOnce(staleList.promise);
    renameProjectBinding.mockReturnValue(rename.promise);

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_a" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.projects[0]?.title).toBe("Original"));

    let pendingRename;
    let pendingRefresh;
    act(() => {
      pendingRename = result.current.renameProject("project-a", "Renamed");
      pendingRefresh = result.current.refresh();
    });
    await waitFor(() => expect(listProjectBindings).toHaveBeenCalledTimes(2));

    await act(async () => {
      rename.resolve({ project: { projectId: "project-a", title: "Renamed" } });
      await pendingRename;
    });
    expect(result.current.projects[0]?.title).toBe("Renamed");

    await act(async () => {
      staleList.resolve({ projects: [{ projectId: "project-a", title: "Original" }] });
      await pendingRefresh;
    });
    expect(result.current.projects[0]?.title).toBe("Renamed");
    expect(result.current.loading).toBe(false);
  });

  test("does not let an older same-user refresh resurrect a completed deletion", async () => {
    const staleList = createDeferred();
    const deletion = createDeferred();
    const project = { projectId: "project-a", title: "Original" };
    listProjectBindings
      .mockResolvedValueOnce({ projects: [project] })
      .mockReturnValueOnce(staleList.promise);
    deleteProjectBinding.mockReturnValue(deletion.promise);

    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_a" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    let pendingDelete;
    let pendingRefresh;
    act(() => {
      pendingDelete = result.current.deleteProject("project-a");
      pendingRefresh = result.current.refresh();
    });
    await waitFor(() => expect(listProjectBindings).toHaveBeenCalledTimes(2));

    await act(async () => {
      deletion.resolve({ ok: true, counts: { chats: 0 } });
      await pendingDelete;
    });
    expect(result.current.projects).toEqual([]);

    await act(async () => {
      staleList.resolve({ projects: [project] });
      await pendingRefresh;
    });
    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  test("ignores a stale project list after the authenticated user changes", async () => {
    const firstList = createDeferred();
    const secondList = createDeferred();
    listProjectBindings
      .mockReturnValueOnce(firstList.promise)
      .mockReturnValueOnce(secondList.promise);

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_1" } } }
    );
    await waitFor(() => expect(listProjectBindings).toHaveBeenCalledTimes(1));

    rerender({ user: { uid: "user_2" } });
    await waitFor(() => expect(listProjectBindings).toHaveBeenCalledTimes(2));
    expect(result.current.projects).toEqual([]);
    expect(result.current.selectedProjectId).toBeNull();

    await act(async () => {
      secondList.resolve({
        projects: [{ projectId: "project-b", title: "Second user's game" }],
      });
      await secondList.promise;
    });
    expect(result.current.projects.map((project) => project.projectId)).toEqual(["project-b"]);

    await act(async () => {
      firstList.resolve({
        projects: [{ projectId: "project-a", title: "First user's game" }],
      });
      await firstList.promise;
    });
    expect(result.current.projects.map((project) => project.projectId)).toEqual(["project-b"]);
  });

  test("clears a selected project when the authenticated project list becomes empty", async () => {
    listProjectBindings
      .mockResolvedValueOnce({
        projects: [{ projectId: "project-a", title: "First game" }],
      })
      .mockResolvedValueOnce({ projects: [] });

    const { result, rerender } = renderHook(
      ({ user }) => useProjectBindings(user, { authReady: true }),
      { initialProps: { user: { uid: "user_1" } } }
    );
    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    act(() => result.current.setSelectedProjectId("project-a"));
    expect(result.current.selectedProjectId).toBe("project-a");

    rerender({ user: { uid: "user_2" } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects).toEqual([]);
    expect(result.current.selectedProjectId).toBeNull();
  });
});
