import { authedFetch } from "./billing";
import {
  checkWorkflowPlanReadiness,
  orchestrate,
  restoreWorkflowPlanVersion,
  approveWorkflowPlan,
  getWorkflowPlan,
  updateWorkflowPlan,
  regenerateWorkflowPlanSection,
  getWorkflowPlanVersions,
  askWorkflowPlan,
  executeWorkflowPlan,
} from "./workflowApi";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

const okResponse = (payload) => ({
  ok: true,
  json: jest.fn().mockResolvedValue(payload),
  text: jest.fn().mockResolvedValue(""),
});

describe("workflowApi planning contracts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends the selected template during orchestration", async () => {
    authedFetch.mockResolvedValue(okResponse({ status: "needs_clarification", questions: [] }));

    await orchestrate({
      prompt: "Fix the inventory bug",
      mode: "plan",
      projectId: "project-1",
      templateId: "fix_bug",
    });

    const [, request] = authedFetch.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      prompt: "Fix the inventory bug",
      templateId: "fix_bug",
      projectId: "project-1",
    }));
  });

  it("sends both current and source version/hash fences when restoring history", async () => {
    authedFetch.mockResolvedValue(okResponse({
      planId: "plan-1",
      version: 4,
      hash: "hash-4",
      plan: {},
    }));

    await restoreWorkflowPlanVersion("plan-1", {
      version: 3,
      hash: "hash-3",
      sourceVersion: 1,
      sourceHash: "hash-1",
    });

    expect(authedFetch).toHaveBeenCalledWith("/api/ai/plans/plan-1/restore", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        version: 3,
        hash: "hash-3",
        sourceVersion: 1,
        sourceHash: "hash-1",
      }),
    }));
  });

  it("normalizes structured runtime failures into a readable workflow error", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        ok: false,
        error: {
          code: "PLAN_NOT_READY",
          message: "Connect the selected Studio project before execution.",
          retryable: true,
        },
      }),
      text: jest.fn().mockResolvedValue(""),
    });

    await expect(checkWorkflowPlanReadiness("plan-1", {
      version: 2,
      hash: "hash-2",
    })).rejects.toMatchObject({
      name: "WorkflowApiError",
      message: "Connect the selected Studio project before execution.",
      code: "PLAN_NOT_READY",
      status: 409,
    });
  });

  it("falls back to singular plan approval endpoint when plural is unavailable", async () => {
    authedFetch
      .mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          approvedPlan: { planId: "plan-1", version: 2, hash: "hash-2" },
        }),
      });

    await approveWorkflowPlan("plan-1", { version: 2, hash: "hash-2" });

    expect(authedFetch).toHaveBeenNthCalledWith(1, "/api/ai/plans/plan-1/approve", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ version: 2, hash: "hash-2" }),
    }));
    expect(authedFetch).toHaveBeenNthCalledWith(2, "/api/ai/plan/plan-1/approve", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ version: 2, hash: "hash-2" }),
    }));
  });

  const fallbackTests = [
    ["getWorkflowPlan", () => getWorkflowPlan("plan-1"), "/api/ai/plans/plan-1", "/api/ai/plan/plan-1", {}],
    ["updateWorkflowPlan", () => updateWorkflowPlan("plan-1", { version: 1, hash: "hash-1", operations: [{ type: "noop" }] }), "/api/ai/plans/plan-1", "/api/ai/plan/plan-1", { method: "PATCH", body: JSON.stringify({ version: 1, hash: "hash-1", operations: [{ type: "noop" }] }) }],
    ["restoreWorkflowPlanVersion", () => restoreWorkflowPlanVersion("plan-1", { version: 1, hash: "hash-1", sourceVersion: 1, sourceHash: "hash-1" }), "/api/ai/plans/plan-1/restore", "/api/ai/plan/plan-1/restore", { method: "POST", body: JSON.stringify({ version: 1, hash: "hash-1", sourceVersion: 1, sourceHash: "hash-1" }) }],
    ["askWorkflowPlan", () => askWorkflowPlan("plan-1", { version: 1, hash: "hash-1", question: "What changed?" }), "/api/ai/plans/plan-1/ask", "/api/ai/plan/plan-1/ask", { method: "POST", body: JSON.stringify({ version: 1, hash: "hash-1", question: "What changed?", projectId: null }) }],
    ["checkWorkflowPlanReadiness", () => checkWorkflowPlanReadiness("plan-1", { version: 1, hash: "hash-1" }), "/api/ai/plans/plan-1/readiness", "/api/ai/plan/plan-1/readiness", { method: "POST", body: JSON.stringify({ version: 1, hash: "hash-1", projectId: null, studioConnected: false, studioTarget: null, targeting: { projectId: null, studioConnected: false, studioTarget: null } }) }],
    ["getWorkflowPlanVersions", () => getWorkflowPlanVersions("plan-1"), "/api/ai/plans/plan-1/versions", "/api/ai/plan/plan-1/versions", {}],
    ["executeWorkflowPlan", () => executeWorkflowPlan("plan-1", { version: 1, hash: "hash-1" }), "/api/ai/plans/plan-1/execute", "/api/ai/plan/plan-1/execute", { method: "POST", body: JSON.stringify({ version: 1, hash: "hash-1" }) }],
    ["regenerateWorkflowPlanSection", () => regenerateWorkflowPlanSection("plan-1", "scope", { version: 1, hash: "hash-1", instruction: "tighten" }), "/api/ai/plans/plan-1/sections/scope/regenerate", "/api/ai/plan/plan-1/sections/scope/regenerate", { method: "POST", body: JSON.stringify({ version: 1, hash: "hash-1", instruction: "tighten" }) }],
  ];

  it.each(fallbackTests)(`falls back to singular endpoint when plural is unavailable: %s`, async (_, command, primaryPath, legacyPath, expectedBody) => {
    authedFetch
      .mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn().mockResolvedValue({ error: "not found" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    await command();

    expect(authedFetch).toHaveBeenNthCalledWith(1, primaryPath, expect.objectContaining({
      method: expectedBody.method || "GET",
      ...(expectedBody.body ? { body: expectedBody.body } : {}),
    }));
    expect(authedFetch).toHaveBeenNthCalledWith(2, legacyPath, expect.objectContaining({
      method: expectedBody.method || "GET",
      ...(expectedBody.body ? { body: expectedBody.body } : {}),
    }));
  });
});
