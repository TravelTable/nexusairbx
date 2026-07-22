import { authedFetch } from "./billing";
import {
  checkWorkflowPlanReadiness,
  orchestrate,
  restoreWorkflowPlanVersion,
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
});
