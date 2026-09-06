import { ensureDraftProject, resetDraftProject } from "./draftProject";
import { createProjectBinding } from "./projectBindingsApi";
jest.mock("./projectBindingsApi", () => ({ createProjectBinding: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); resetDraftProject("owner"); resetDraftProject("other"); });
test("concurrent first sends share a project creation request", async () => {
  createProjectBinding.mockResolvedValue({ project: { projectId: "project-1" } });
  const [one, two] = await Promise.all([ensureDraftProject("owner", "My obby"), ensureDraftProject("owner", "My obby")]);
  expect(one).toEqual(two);
  expect(createProjectBinding).toHaveBeenCalledTimes(1);
  expect(createProjectBinding).toHaveBeenCalledWith({ title: "My obby", idempotencyKey: expect.any(String) });
});
test("a failed first send keeps its creation key for retries and reloads", async () => {
  createProjectBinding.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ project: { projectId: "project-1" } });
  await expect(ensureDraftProject("owner", "My obby")).rejects.toThrow("offline");
  const key = createProjectBinding.mock.calls[0][0].idempotencyKey;
  expect(sessionStorage.getItem("nexusrbx:draft-project:owner")).toBe(key);
  await ensureDraftProject("owner", "My revised obby");
  expect(createProjectBinding.mock.calls[1][0].idempotencyKey).toBe(key);
  await ensureDraftProject("other", "My obby");
  expect(createProjectBinding.mock.calls[2][0].idempotencyKey).not.toBe(key);
});
