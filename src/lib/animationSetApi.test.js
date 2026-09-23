import { authedFetch } from "./billing";
import { importAnimationResource, saveAnimationSet, searchAnimationResources, sendAnimationSetToStudio } from "./animationSetApi";

jest.mock("./billing", () => ({ authedFetch: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  authedFetch.mockResolvedValue({ ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ set: { id: "set/a", version: 3 }, resources: [], deployment: { status: "queued" } }) });
});

test("persists a full document with optimistic version and an encoded ID", async () => {
  const set = { id: "set/a", name: "Sword", version: 2, resources: [] };
  expect(await saveAnimationSet(set)).toEqual({ id: "set/a", version: 3 });
  expect(authedFetch).toHaveBeenCalledWith("/api/animations/sets/set%2Fa", expect.objectContaining({ method: "PUT", body: JSON.stringify({ set, expectedVersion: 2 }) }));
});

test("resource search passes semantic suitability filters and Studio keeps preview mode explicit", async () => {
  await searchAnimationResources({ q: "sword & shield", rigType: "R15", semanticRole: "attack", projectId: "project_1" });
  const url = new URL(authedFetch.mock.calls[0][0], "https://nexus.example");
  expect(url.searchParams.get("q")).toBe("sword & shield");
  expect(url.searchParams.get("semanticRole")).toBe("attack");
  await sendAnimationSetToStudio("set/a", { mode: "preview", rigPath: "Workspace.Hero" });
  expect(authedFetch).toHaveBeenLastCalledWith("/api/animations/sets/set%2Fa/send-to-studio", expect.objectContaining({ body: JSON.stringify({ mode: "preview", rigPath: "Workspace.Hero" }) }));
});

test("file import sends multipart bytes and leaves boundary selection to the browser", async () => {
  const file = new File(["<roblox/>"], "swing.rbxmx");
  await importAnimationResource(file, { projectId: "project_one", semanticRole: "attack", rigType: "R15" });
  const [path, options] = authedFetch.mock.calls[0];
  expect(path).toBe("/api/animations/resources/import");
  expect(options.method).toBe("POST");
  expect(options.body.get("file")).toBe(file);
  expect(options.body.get("projectId")).toBe("project_one");
  expect(options.headers).toBeUndefined();
});
