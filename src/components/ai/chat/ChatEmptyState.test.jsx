import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import ChatEmptyState from "./ChatEmptyState";

test("presents a calm, text-led Roblox construction start", () => {
  const onQuickStart = jest.fn();
  const { container } = render(<ChatEmptyState onQuickStart={onQuickStart} />);
  const cards = screen.getAllByRole("button");
  const mark = container.querySelector(".chat-empty-state__mark");

  expect(screen.getByRole("heading", { name: "Build anything in Roblox." })).toBeVisible();
  expect(mark).toBeInTheDocument();
  expect(mark).toHaveAttribute("data-nexus-display-icon", "build");
  expect(container.querySelectorAll("[data-nexus-display-icon]")).toHaveLength(4);
  expect(Array.from(container.querySelectorAll(".chat-empty-state__starter-icon"), (icon) => icon.dataset.nexusDisplayIcon)).toEqual([
    "build",
    "edit",
    "debug",
  ]);
  expect(screen.queryByRole("group", { name: "Current build context" })).not.toBeInTheDocument();
  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveClass("chat-empty-state__starter");
  expect(container.querySelector(".grid.sm\\:grid-cols-3")).not.toBeInTheDocument();
  expect(screen.getByText("Design a complete simulator loop")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: /Design a complete simulator loop/i }));
  expect(onQuickStart).toHaveBeenCalledWith(expect.stringContaining("Roblox simulator"));
});

test("shows only authoritative project, place, and Studio context", () => {
  const { rerender } = render(
    <ChatEmptyState
      onQuickStart={jest.fn()}
      projectId="project_42"
      projectTitle="Skybound Adventure"
      studioPlacePreference={{
        targetId: "studio_target_42",
        placeId: "123456",
        placeName: "Crystal Caves",
      }}
      studioConnected
      studioLoading={false}
    />,
  );

  const context = screen.getByRole("group", { name: "Current build context" });
  expect(context).toHaveTextContent("ProjectSkybound Adventure");
  expect(context).toHaveTextContent("PlaceCrystal CavesPlace 123456");
  expect(context).toHaveTextContent("StudioConnected");

  rerender(
    <ChatEmptyState
      onQuickStart={jest.fn()}
      projectTitle="Workspace"
      studioPlacePreference={{ label: "Unverified place" }}
      studioConnected={false}
      studioLoading
    />,
  );
  expect(screen.queryByRole("group", { name: "Current build context" })).not.toBeInTheDocument();
  expect(screen.queryByText("Unverified place")).not.toBeInTheDocument();
  expect(screen.queryByText("Disconnected")).not.toBeInTheDocument();
});

test("reports a verified disconnected Studio snapshot without inventing a target", () => {
  render(
    <ChatEmptyState
      onQuickStart={jest.fn()}
      studioConnected={false}
      studioLoading={false}
    />,
  );

  const context = screen.getByRole("group", { name: "Current build context" });
  expect(context).toHaveTextContent("StudioDisconnected");
  expect(context).not.toHaveTextContent("Project");
  expect(context).not.toHaveTextContent("Place");
});

test("offers build templates only when the action is available", () => {
  const onOpenTemplates = jest.fn();
  const { rerender } = render(<ChatEmptyState onQuickStart={jest.fn()} />);

  expect(screen.queryByRole("button", { name: /Browse build templates/i })).not.toBeInTheDocument();

  rerender(<ChatEmptyState onQuickStart={jest.fn()} onOpenTemplates={onOpenTemplates} />);
  fireEvent.click(screen.getByRole("button", { name: /Browse templates/i }));
  expect(onOpenTemplates).toHaveBeenCalledTimes(1);
});
