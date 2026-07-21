/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProjectBindings } from "./useProjectBindings";

jest.mock("../lib/projectBindingsApi", () => ({
  listProjectBindings: jest.fn(),
  deleteProjectBinding: jest.fn(),
  findOrCreateProjectBinding: jest.fn(),
}));

const {
  listProjectBindings,
  findOrCreateProjectBinding,
} = require("../lib/projectBindingsApi");

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

  test("rejects an unpublished Studio identity", async () => {
    const { result } = renderHook(() =>
      useProjectBindings({ uid: "user_1" }, { authReady: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.openGameProject({
      title: "Local place",
      placeId: "0",
      universeId: null,
    })).rejects.toThrow("published Studio place and universe");
    expect(findOrCreateProjectBinding).not.toHaveBeenCalled();
  });
});
