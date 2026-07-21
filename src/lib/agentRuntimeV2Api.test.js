import {
  AgentRuntimeUnavailableError,
  cancelAgentRunV2,
  createAgentV2,
  extractAgentEvents,
  extractAgentList,
  mergeAgentEvents,
  normalizeAgentProjection,
  resolveChatAgentProjectionV2,
  selectAgentRuntimeRoute,
} from "./agentRuntimeV2Api";
import { authedFetch } from "./billing";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

describe("agentRuntimeV2Api projections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes nested and snake-case agent projections", () => {
    expect(normalizeAgentProjection({
      data: {
        agent: {
          agent_id: "agent-1",
          chat_id: "chat-1",
          state: "RUNNING",
        },
      },
    })).toMatchObject({
      agentId: "agent-1",
      chatId: "chat-1",
      status: "running",
    });
  });

  test("extracts active agents and event envelopes", () => {
    expect(extractAgentList({ data: { items: [{ id: "agent-1", chatId: "chat-1" }] } }))
      .toHaveLength(1);
    expect(extractAgentEvents({ data: { events: [{ sequence: 4 }] } }))
      .toEqual([{ sequence: 4 }]);
  });

  test("attaches top-level runs from the active-agents envelope", () => {
    expect(extractAgentList({
      agents: [{ agentId: "agent-1", chatId: "chat-1" }],
      runs: [{ runId: "run-1", agentId: "agent-1", status: "running" }],
      lastSequence: 9,
    })).toEqual([
      expect.objectContaining({
        agentId: "agent-1",
        runs: [expect.objectContaining({ runId: "run-1", status: "running" })],
      }),
    ]);
  });

  test("merges event projections without losing prior fields", () => {
    expect(mergeAgentEvents(
      [{ agentId: "agent-1", id: "agent-1", chatId: "chat-1", status: "queued" }],
      [{ projection: { agentId: "agent-1", status: "running", runs: [{ id: "run-1" }] } }]
    )).toEqual([
      expect.objectContaining({
        agentId: "agent-1",
        chatId: "chat-1",
        status: "running",
        runs: [{ id: "run-1" }],
      }),
    ]);
  });

  test("merges the backend event envelope payload and preserves its sequence metadata", () => {
    expect(mergeAgentEvents([], [{
      type: "agent.updated",
      sequence: 17,
      payload: {
        agentId: "agent-2",
        chatId: "chat-2",
        status: "awaiting_studio_target",
        runs: [{ id: "run-2", status: "waiting_studio" }],
      },
    }])).toEqual([
      expect.objectContaining({
        agentId: "agent-2",
        chatId: "chat-2",
        status: "awaiting_studio_target",
        runs: [{ id: "run-2", status: "waiting_studio" }],
      }),
    ]);
  });

  test("sends a durable idempotency key when cancelling a run", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify({ runId: "run-1", status: "cancelled" })),
    });

    await cancelAgentRunV2("run-1");

    expect(authedFetch).toHaveBeenCalledWith(
      "/api/v2/runs/run-1/cancel",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "cancel-run-1",
        }),
        body: JSON.stringify({ reason: "user_cancelled" }),
      })
    );
    expect("cancel-run-1").toHaveLength(12);
  });

  test("uses the canonical v2 create-agent endpoint", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(JSON.stringify({ agent: { agentId: "agent-1" } })),
    });

    await createAgentV2({ chatId: "chat-1", projectId: "project-1", idempotencyKey: "agent-chat-1" });

    expect(authedFetch).toHaveBeenCalledWith(
      "/api/v2/agents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chatId: "chat-1", projectId: "project-1" }),
      })
    );
  });

  test("preserves a typed 404 instead of treating it as a missing v2 runtime", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        error: "The requested resource is not available.",
        code: "OWNERSHIP_MISMATCH",
      })),
    });

    await expect(createAgentV2({ chatId: "chat-1", projectId: "stale-project" }))
      .rejects.toMatchObject({
        status: 404,
        payload: expect.objectContaining({ code: "OWNERSHIP_MISMATCH" }),
      });
  });

  test("still identifies an unstructured 404 as a missing v2 runtime", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue("Not found"),
    });

    await expect(createAgentV2({ chatId: "chat-1" }))
      .rejects.toBeInstanceOf(AgentRuntimeUnavailableError);
  });

  test("uses a stored projection before invoking the natural-identity resolver", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn(() => null) },
      text: jest.fn().mockResolvedValue(JSON.stringify({
        agent: { agentId: "agent-1", chatId: "chat-1", projectId: "project-1" },
      })),
    });

    await expect(resolveChatAgentProjectionV2({
      chatId: "chat-1",
      projectId: "project-1",
      storedAgentId: "agent-1",
    })).resolves.toEqual(expect.objectContaining({
      resolution: "stored",
      agent: expect.objectContaining({ agentId: "agent-1" }),
    }));

    expect(authedFetch).toHaveBeenCalledTimes(1);
    expect(authedFetch).toHaveBeenCalledWith(
      "/api/v2/agents/agent-1",
      expect.objectContaining({ method: "GET" })
    );
  });

  test("repairs stale stored metadata through the server resolver", async () => {
    authedFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: jest.fn(() => null) },
        text: jest.fn().mockResolvedValue(JSON.stringify({
          code: "AGENT_NOT_FOUND",
          message: "Agent not found",
        })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn(() => null) },
        text: jest.fn().mockResolvedValue(JSON.stringify({
          agent: { agentId: "agent-2", chatId: "chat-1", projectId: "project-1" },
          resolution: "created",
        })),
      });

    await expect(resolveChatAgentProjectionV2({
      chatId: "chat-1",
      projectId: "project-1",
      storedAgentId: "stale-agent",
    })).resolves.toEqual(expect.objectContaining({ resolution: "created" }));

    expect(authedFetch).toHaveBeenNthCalledWith(
      2,
      "/api/v2/chats/chat-1/agent-projection",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ projectId: "project-1" }),
      })
    );
  });

  test("does not hide an ambiguous resolver outage behind legacy creation", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: jest.fn(() => "request-503") },
      text: jest.fn().mockResolvedValue(JSON.stringify({
        code: "SERVICE_UNAVAILABLE",
        message: "Runtime unavailable",
      })),
    });

    await expect(resolveChatAgentProjectionV2({
      chatId: "chat-1",
      projectId: "project-1",
      allowLegacyCreate: true,
    })).rejects.toMatchObject({
      status: 503,
      requestId: "request-503",
    });
    expect(authedFetch).toHaveBeenCalledTimes(1);
  });

  test("selects execution from server capabilities without inventing a project", () => {
    const canonical = {
      executionOwner: "canonical_task_runtime",
      canonicalAgentRuns: { enabled: true, requiresProject: true },
    };
    expect(selectAgentRuntimeRoute(canonical, { projectId: "project-1" })).toBe("canonical");
    expect(selectAgentRuntimeRoute(canonical, { projectId: null })).toBe("legacy");
    expect(selectAgentRuntimeRoute({
      executionOwner: "legacy_agent_adapter",
      canonicalAgentRuns: { enabled: false, requiresProject: true },
    }, { projectId: "project-1" })).toBe("legacy");
  });
});
