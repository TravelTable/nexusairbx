import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

let mockConnection;

jest.mock("../../context/RobloxConnectionContext", () => ({
  useRobloxConnection: () => mockConnection,
}));

import RobloxConnectionGate from "./RobloxConnectionGate";

function Destination() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

function renderGate(initialEntry = "/ai?chat=1") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/ai" element={<RobloxConnectionGate><div>Creation area</div></RobloxConnectionGate>} />
        <Route path="/connect-roblox" element={<Destination />} />
      </Routes>
    </MemoryRouter>
  );
}

test("redirects a confirmed required connection to resumable onboarding", async () => {
  mockConnection = {
    authReady: true,
    user: { uid: "new-user" },
    phase: "disconnected",
    status: { onboarding: { gateActive: true } },
  };
  renderGate();
  expect(await screen.findByText("/connect-roblox?return=%2Fai%3Fchat%3D1")).toBeTruthy();
});

test("waits for an initial status instead of flashing the gated route", () => {
  mockConnection = {
    authReady: true,
    user: { uid: "new-user" },
    phase: "checking",
    status: null,
  };
  renderGate();
  expect(screen.getByText("Checking your Roblox connection…")).toBeTruthy();
  expect(screen.queryByText("Creation area")).toBeNull();
});

test("does not redirect when status is unavailable rather than confirmed disconnected", () => {
  mockConnection = {
    authReady: true,
    user: { uid: "new-user" },
    phase: "unavailable",
    status: null,
  };
  renderGate();
  expect(screen.getByText("Creation area")).toBeTruthy();
});
