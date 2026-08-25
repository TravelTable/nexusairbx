import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectSelectionModal from "./ProjectSelectionModal";

const experiences = [
  {
    universeId: "101",
    rootPlaceId: "201",
    name: "Blade Arena",
    thumbnailUrl: "https://tr.rbxcdn.com/blade.webp",
    creator: { type: "Group", id: "301", name: "TravelTable" },
  },
  {
    universeId: "102",
    rootPlaceId: "202",
    name: "City Simulator",
    thumbnailUrl: null,
    creator: { type: "User", id: "302", name: "BuilderJack" },
  },
];

test("selects a real Roblox experience using its visual card", () => {
  const onSelect = jest.fn();
  render(
    <ProjectSelectionModal
      open
      connected
      gameAccessGranted
      experiences={experiences}
      onSelect={onSelect}
      onClose={jest.fn()}
    />
  );

  expect(screen.getByRole("heading", { name: "Choose a game to work on" })).toBeTruthy();
  expect(screen.getByText("TravelTable")).toBeTruthy();
  expect(screen.getByRole("presentation").getAttribute("src")).toBe(
    "https://tr.rbxcdn.com/blade.webp"
  );

  fireEvent.click(screen.getByRole("button", { name: "Work on City Simulator by BuilderJack" }));
  expect(onSelect).toHaveBeenCalledWith(experiences[1]);
});

test("provides a close button when no game has been selected", () => {
  const onClose = jest.fn();
  render(
    <ProjectSelectionModal
      open
      canClose
      connected
      gameAccessGranted
      error="API route not found"
      onClose={onClose}
      onRetry={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("shows connection, loading, and searchable many-game states", () => {
  const onConnect = jest.fn();
  const { rerender } = render(
    <ProjectSelectionModal open connected={false} onConnect={onConnect} experiences={[]} />
  );
  fireEvent.click(screen.getByRole("button", { name: "Connect Roblox" }));
  expect(onConnect).toHaveBeenCalledTimes(1);

  rerender(<ProjectSelectionModal open connected gameAccessGranted loading experiences={[]} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your Roblox games");

  const manyExperiences = Array.from({ length: 9 }, (_, index) => ({
    universeId: String(500 + index),
    rootPlaceId: String(700 + index),
    name: index === 8 ? "Only Match" : `Game ${index + 1}`,
    creator: { type: "User", id: "302", name: "BuilderJack" },
  }));
  rerender(<ProjectSelectionModal open connected gameAccessGranted experiences={manyExperiences} onSelect={jest.fn()} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search games" }), {
    target: { value: "Only Match" },
  });
  expect(screen.getByRole("button", { name: "Work on Only Match by BuilderJack" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Work on Game 1 by BuilderJack" })).toBeNull();
});

test("distinguishes game permission, empty grants, partial results, and private games", () => {
  const onConnect = jest.fn();
  const onChangeAccess = jest.fn();
  const { rerender } = render(
    <ProjectSelectionModal open connected onConnect={onConnect} experiences={[]} />
  );

  expect(screen.getByRole("heading", { name: "Grant game access" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Grant game access" }));
  expect(onConnect).toHaveBeenCalledTimes(1);

  rerender(
    <ProjectSelectionModal
      open
      connected
      gameAccessGranted
      authorization={{ authorizedUniverseCount: 0 }}
      experiences={[]}
      onChangeAccess={onChangeAccess}
    />
  );
  expect(screen.getByRole("heading", { name: "No games shared with Nexus" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Choose Roblox games" }));
  expect(onChangeAccess).toHaveBeenCalledTimes(1);

  rerender(
    <ProjectSelectionModal
      open
      connected
      gameAccessGranted
      authorization={{ authorizedUniverseCount: 1 }}
      partial
      warnings={[{ message: "Some private Roblox games could not be loaded." }]}
      experiences={[{ ...experiences[0], visibility: "private" }]}
      onSelect={jest.fn()}
      onChangeAccess={onChangeAccess}
    />
  );
  expect(screen.getByRole("status")).toHaveTextContent("Some private Roblox games could not be loaded");
  expect(screen.getByText("Private")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Change Roblox access" })).toBeTruthy();
});
