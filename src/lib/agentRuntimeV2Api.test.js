import {
  cancelAgentRunV2,
  extractAgentEvents,
  extractAgentList,
  mergeAgentEvents,
  normalizeAgentProjection,
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
      "/api/v2/agents/runs/run-1/cancel",
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
});
