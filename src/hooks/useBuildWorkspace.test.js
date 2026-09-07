import { act, renderHook, waitFor } from "@testing-library/react";
import useBuildWorkspace from "./useBuildWorkspace";
import { getBuildWorkspaceSnapshot, readBuildWorkspaceFile } from "../lib/buildWorkspaceApi";
jest.mock("../lib/buildWorkspaceApi", () => ({ getBuildWorkspaceSnapshot: jest.fn(), readBuildWorkspaceFile: jest.fn() }));
const scope = { taskId: "t1", chatId: "c1", projectId: "p1", runId: "r1" };
const item = { id: "f1", kind: "file", artifactId: "a1", revision: "v1", path: "Workspace/A" };
const snapshot = (changes = {}) => ({ scope, sequence: 1, type: "snapshot", items: [item], phase: "building", ...changes });
beforeEach(() => { jest.clearAllMocks(); });
test("canonical snapshot binds exact artifact reads without exposing source", async () => {
 getBuildWorkspaceSnapshot.mockResolvedValue(snapshot({ items: [{ ...item, source: "private" }] }));
 readBuildWorkspaceFile.mockResolvedValue({ source: "original\n🎮", revision: "v1" });
 const { result } = renderHook(() => useBuildWorkspace({ ...scope, enabled: true }));
 await waitFor(() => expect(result.current.items).toHaveLength(1));
 expect(result.current.items[0].source).toBeUndefined();
 await expect(result.current.readFile(item, {})).resolves.toEqual({ source: "original\n🎮", revision: "v1" });
 expect(readBuildWorkspaceFile).toHaveBeenCalledWith(scope, item, {});
});
test("ignores and aborts previous chat response after scope switches", async () => {
 let resolve;
 getBuildWorkspaceSnapshot.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue(snapshot({ scope: { ...scope, taskId: "t2", chatId: "c2" }, items: [] }));
 const { result, rerender } = renderHook(props => useBuildWorkspace(props), { initialProps: { ...scope } });
 rerender({ ...scope, taskId: "t2", chatId: "c2" });
 await waitFor(() => expect(result.current.state?.scope.chatId).toBe("c2"));
 await act(async () => resolve(snapshot()));
 expect(result.current.items).toEqual([]);
 expect(getBuildWorkspaceSnapshot.mock.calls[0][1].signal.aborted).toBe(true);
});
test("rejects a mismatched canonical snapshot", async () => {
 getBuildWorkspaceSnapshot.mockResolvedValue(snapshot({ scope: { ...scope, projectId: "other" } }));
 const { result } = renderHook(() => useBuildWorkspace(scope));
 await waitFor(() => expect(result.current.error).toMatch(/different build/));
 expect(result.current.items).toEqual([]);
});
test("reconnect failures preserve saved files; snapshots recover sequence gaps", async () => {
 getBuildWorkspaceSnapshot.mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(snapshot({ sequence: 9, items: [{ ...item, revision: "v2" }] }));
 const { result } = renderHook(() => useBuildWorkspace(scope));
 await waitFor(() => expect(result.current.items).toHaveLength(1));
 act(() => result.current.reconnect());
 await waitFor(() => expect(result.current.error).toBe("Offline"));
 expect(result.current.items[0].revision).toBe("v1");
 act(() => result.current.reconnect());
 await waitFor(() => expect(result.current.state.sequence).toBe(9));
 expect(result.current.items[0].revision).toBe("v2");
});
test("unallocated task waits for a real run mapping", async () => {
 getBuildWorkspaceSnapshot.mockResolvedValue({ waitingForRun: true, phase: "accepted", items: [] });
 const { result } = renderHook(() => useBuildWorkspace(scope));
 await act(async () => {});
 expect(result.current.state).toBeNull();
 expect(result.current.error).toBe("");
});
test("closed workspace does not poll", async () => {
 renderHook(() => useBuildWorkspace({ ...scope, enabled: false }));
 await act(async () => {});
 expect(getBuildWorkspaceSnapshot).not.toHaveBeenCalled();
});
