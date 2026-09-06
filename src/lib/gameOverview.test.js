import { resolveGameOverview } from "./gameOverview";

test("Studio progress preserves canonical artwork receipts", () => {
  const scope = { kind: "complete_game" };
  const result = resolveGameOverview({ taskId: "t", gameOverview: { requestedScope: scope, deliverables: [{ id: "icon", status: "draft_ready", assetIds: ["asset_1"] }] } },
    { taskId: "t", gameOverview: { requestedScope: scope, deliverables: [{ id: "icon", status: "planned" }, { id: "gameplay", status: "verified" }] } });
  expect(result.deliverables[0].status).toBe("draft_ready");
  expect(result.deliverables[1].status).toBe("verified");
});
test("a different Studio task cannot replace the selected task's overview", () => {
  const overview = { deliverables: [{ id: "a", status: "planned" }] };
  expect(resolveGameOverview({ taskId: "a", gameOverview: overview }, { taskId: "b", gameOverview: { deliverables: [] } })).toEqual(overview);
});
test("artifact metadata never asserts execution or verification", () => {
  expect(resolveGameOverview(null, null, { metadata: { gameBrief: { deliverables: [{ id: "x", status: "verified" }] } } }).deliverables[0].status).toBe("planned");
});
