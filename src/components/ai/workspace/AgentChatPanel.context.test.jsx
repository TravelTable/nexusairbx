import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

test("expensive estimates wait for inline confirmation and submit the reviewed request once", async () => {
  const onSubmit = jest.fn();
  const nativeConfirm = jest.spyOn(window, "confirm");
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({
    estimatedCreditsMicros: 500000, modelLabel: "Premium", affordable: true,
    balanceSource: "purchased", billingScope: { type: "team" },
  }) });
  render(<AgentChatPanel projectId="team-project" modelVersion="premium-model" prompt="Build a shop"
    messages={[]} includedUsage={{ catalogVersion: "v2" }} onSubmit={onSubmit} />);
  let pending;
  act(() => { pending = mockChatComposer.mock.calls.at(-1)[0].onSubmit(null, 'Build a shop', { draftRevision: 'reviewed' }); });
  expect(await screen.findByRole('dialog')).toHaveTextContent('Premium · estimated 0.50 Nexus Credits');
  expect(screen.getByRole('dialog')).toHaveTextContent('Team pool (purchased credits)');
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await act(async () => pending);
  expect(onSubmit).not.toHaveBeenCalled();
  act(() => { pending = mockChatComposer.mock.calls.at(-1)[0].onSubmit(null, 'Build a shop', { draftRevision: 'reviewed' }); });
  await waitFor(() => expect(mockChatComposer.mock.calls.at(-1)[0].disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await act(async () => pending);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith(null, 'Build a shop', { draftRevision: 'reviewed' });
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(JSON.parse(mockAuthedFetch.mock.calls.at(-1)[1].body)).toEqual(expect.objectContaining({ projectId: 'team-project', model: 'premium-model' }));
  nativeConfirm.mockRestore();
});

test('changing project invalidates an outstanding credit confirmation', async () => {
  const onSubmit = jest.fn();
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({ estimatedCreditsMicros: 500000, modelLabel: 'Premium', affordable: true, balanceSource: 'included' }) });
  const props = { projectId: 'one', messages: [], prompt: 'Shop', includedUsage: { catalogVersion: 'v2' }, onSubmit };
  const { rerender } = render(<AgentChatPanel {...props} />);
  let pending;
  act(() => { pending = mockChatComposer.mock.calls.at(-1)[0].onSubmit(null); });
  await screen.findByRole('dialog');
  rerender(<AgentChatPanel {...props} projectId="two" />);
  await act(async () => pending);
  expect(onSubmit).not.toHaveBeenCalled();
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
