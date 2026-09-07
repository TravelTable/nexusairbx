import { authedFetch } from "./billing";
import { getBuildWorkspaceSnapshot, readBuildWorkspaceFile } from "./buildWorkspaceApi";
jest.mock("./billing", () => ({ authedFetch: jest.fn() }));
const scope = { taskId: "task/1", chatId: "c", projectId: "p", runId: "r" };
beforeEach(() => jest.clearAllMocks());
test("exact path and revision are encoded in authenticated task scoped requests", async () => {
 authedFetch.mockResolvedValue({ ok: true, json: async () => ({ source: "a\n🎮", revision: "v+1" }) });
 const signal = new AbortController().signal;
 await readBuildWorkspaceFile(scope, { artifactId: "a", revision: "v+1", path: "Workspace/A B" }, { signal });
 const [url, options] = authedFetch.mock.calls[0];
 expect(url).toContain("/api/tasks/task%2F1/build-workspace/file?");
 const query = new URL(url, "https://local.test").searchParams;
 expect(query.get("path")).toBe("Workspace/A B"); expect(query.get("revision")).toBe("v+1");
 expect(options).toEqual({ method: "GET", noCache: true, signal });
});
test("mismatched revisions and authorization failures cannot masquerade as an empty file", async () => {
 authedFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ source: "private", revision: "other" }) });
 await expect(readBuildWorkspaceFile(scope, { artifactId: "a", revision: "v1", path: "A" })).rejects.toThrow(/revision/);
 authedFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: { code: "FORBIDDEN" } }) });
 await expect(getBuildWorkspaceSnapshot(scope)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
});
