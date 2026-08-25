import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import AgentChatPanel from "./AgentChatPanel";

const mockChatComposer = jest.fn();

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
