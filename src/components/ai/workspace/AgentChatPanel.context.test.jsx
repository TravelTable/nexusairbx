import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";

import AgentChatPanel from "./AgentChatPanel";

const mockChatComposer = jest.fn();
const mockAuthedFetch = jest.fn();
jest.mock("../../../lib/billing", () => ({ authedFetch: (...args) => mockAuthedFetch(...args) }));

jest.mock("../chat/ChatComposer", () => ({
  __esModule: true,
  default: (props) => {
    mockChatComposer(props);
    return null;
  },
}));

jest.mock("./PlanWorkspace", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../chat/ChatHeader", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../chat/MessageList", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../chat/useChatScrollRestoration", () => ({
  __esModule: true,
  default: () => {},
}));

jest.mock("../../ai-elements/conversation", () => {
  const ReactModule = require("react");
  const Passthrough = ({ children }) => ReactModule.createElement("div", null, children);
  return {
    Conversation: Passthrough,
    ConversationContent: Passthrough,
    ConversationScrollButton: () => null,
  };
});

test("expensive credit estimates require confirmation before submitting and include project scope", async () => {
  const onSubmit = jest.fn();
  const confirmation = jest.spyOn(window, "confirm").mockReturnValue(false);
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({
    estimatedCreditsMicros: 500000, modelLabel: "Premium", affordable: true,
    balanceSource: "purchased", billingScope: { type: "team" },
  }) });
  render(<AgentChatPanel projectId="team-project" modelVersion="premium-model" prompt="Build a shop"
    messages={[]} includedUsage={{ catalogVersion: "v2" }} onSubmit={onSubmit} />);
  const submit = mockChatComposer.mock.calls.at(-1)[0].onSubmit;
  await act(async () => submit({ preventDefault: jest.fn() }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(confirmation).toHaveBeenCalledWith(expect.stringContaining("Team pool (purchased credits)"));
  expect(JSON.parse(mockAuthedFetch.mock.calls.at(-1)[1].body)).toEqual(expect.objectContaining({ projectId: "team-project", model: "premium-model" }));
  confirmation.mockReturnValue(true);
  await act(async () => submit({ preventDefault: jest.fn() }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  confirmation.mockRestore();
});

test("failed credit estimates stop paid submission", async () => {
  const onSubmit = jest.fn();
  mockAuthedFetch.mockResolvedValue({ ok: false, json: async () => ({ code: "MODEL_PRICE_CONFIGURATION_STALE" }) });
  render(<AgentChatPanel prompt="Build a shop" messages={[]} includedUsage={{ catalogVersion: "v2" }} onSubmit={onSubmit} />);
  await act(async () => mockChatComposer.mock.calls.at(-1)[0].onSubmit({ preventDefault: jest.fn() }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText("MODEL_PRICE_CONFIGURATION_STALE")).toBeInTheDocument();
});

test("threads authoritative workspace context into the empty chat surface", () => {
  const onStudioConnectionOpen = jest.fn();
  render(
    <AgentChatPanel
      currentChatId="chat_42"
      chatTitle="New chat"
      projectId="project_42"
      projectTitle="Skybound Adventure"
      messages={[]}
      pendingMessage={null}
      pendingMessages={[]}
      studioConnected
      studioLoading={false}
      onStudioConnectionOpen={onStudioConnectionOpen}
      studioPlacePreference={{
        targetId: "studio_target_42",
        placeId: "123456",
        placeName: "Crystal Caves",
      }}
    />,
  );

  const context = screen.getByRole("group", { name: "Current build context" });
  expect(context).toHaveTextContent("ProjectSkybound Adventure");
  expect(context).not.toHaveTextContent("Crystal Caves");
  expect(context).not.toHaveTextContent("123456");
  expect(context).toHaveTextContent("StudioConnected");
  expect(mockChatComposer).toHaveBeenCalledWith(
    expect.objectContaining({ onStudioConnectionOpen }),
  );
});
