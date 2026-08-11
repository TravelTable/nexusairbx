import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import ChatEmptyState from "./ChatEmptyState";

test("presents a compact creator-workshop path and starter builds", () => {
  const onQuickStart = jest.fn();
  const { container } = render(<ChatEmptyState onQuickStart={onQuickStart} />);
  const cards = screen.getAllByRole("button");
  const mark = container.querySelector('img[src="/nexus-mark.svg"]');

  expect(screen.getByRole("heading", { name: "What are we building?" })).toBeVisible();
  expect(mark).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Current build context" })).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Project build path" })).toHaveTextContent(
    "IdeaPlanBuildPlaytest",
  );
  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveClass("min-h-36", "rounded-[16px]");
  expect(container.querySelector(".overflow-x-auto")).not.toBeInTheDocument();
  expect(screen.getByText(/Build a floating-island adventure/i)).toHaveClass("line-clamp-2");

  fireEvent.click(screen.getByRole("button", { name: /Floating-island quest/i }));
  expect(onQuickStart).toHaveBeenCalledWith(expect.stringContaining("floating-island adventure"));
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
  fireEvent.click(screen.getByRole("button", { name: /Browse build templates/i }));
  expect(onOpenTemplates).toHaveBeenCalledTimes(1);
});
