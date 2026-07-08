import { act, renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceArtifactPersistence } from "./useWorkspaceArtifactPersistence";

function buildSnapshot(overrides = {}) {
  return {
    artifactId: "artifact_1",
    revision: "rev_1",
    title: "Artifact",
    files: [
      {
        id: "file_1",
        name: "Main.server.lua",
        path: "ServerScriptService/Main.server.lua",
        placement: "ServerScriptService",
        kind: "server",
        content: "print('hello')",
        contentHash: "hash_1",
      },
    ],
    ...overrides,
  };
}

describe("useWorkspaceArtifactPersistence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("identical artifact revisions re-emitted multiple times save once", async () => {
    const saveArtifact = jest.fn().mockResolvedValue({});
    const initialSnapshot = buildSnapshot();
    const { rerender } = renderHook(
      ({ snapshot }) => useWorkspaceArtifactPersistence(snapshot, {
        enabled: true,
        debounceMs: 400,
        saveArtifact,
      }),
      {
        initialProps: {
          snapshot: initialSnapshot,
        },
      }
    );

    rerender({
      snapshot: buildSnapshot({
        files: [{ ...initialSnapshot.files[0] }],
      }),
    });
    rerender({
      snapshot: buildSnapshot({
        files: [{ ...initialSnapshot.files[0] }],
      }),
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(saveArtifact).toHaveBeenCalledTimes(1));

    rerender({
      snapshot: buildSnapshot({
        files: [{ ...initialSnapshot.files[0] }],
      }),
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(saveArtifact).toHaveBeenCalledTimes(1);
  });

  test("new revision or changed file hash schedules a new save", async () => {
    const saveArtifact = jest.fn().mockResolvedValue({});
    const { rerender } = renderHook(
      ({ snapshot }) => useWorkspaceArtifactPersistence(snapshot, {
        enabled: true,
        debounceMs: 400,
        saveArtifact,
      }),
      {
        initialProps: {
          snapshot: buildSnapshot(),
        },
      }
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(saveArtifact).toHaveBeenCalledTimes(1));

    rerender({
      snapshot: buildSnapshot({
        revision: "rev_2",
        files: [
          {
            ...buildSnapshot().files[0],
            content: "print('updated')",
            contentHash: "hash_2",
          },
        ],
      }),
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(saveArtifact).toHaveBeenCalledTimes(2));
  });
});
