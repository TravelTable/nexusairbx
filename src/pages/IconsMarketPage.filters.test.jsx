import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUser = { getIdToken: jest.fn(async () => "test-token") };

jest.mock("../firebase", () => ({ auth: { name: "test-auth" } }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));
jest.mock("../context/BillingContext", () => ({ useBilling: () => ({ isPremium: false }) }));
jest.mock("../lib/uiBuilderApi", () => ({ exportIcon: jest.fn() }));
jest.mock("../components/icons/IconMarketCard", () => function IconMarketCardStub({ icon }) {
  return <a href={`/icons-market/${icon.id}`}>{icon.name}</a>;
});
jest.mock("../components/NexusRBXFooter", () => function FooterStub() { return null; });
jest.mock("../components/ProNudgeModal", () => function ProNudgeStub() { return null; });
jest.mock("../components/Modal", () => function ModalStub() { return null; });

import IconsMarketPage from "./IconsMarketPage";
import { onAuthStateChanged as mockOnAuthStateChanged } from "firebase/auth";

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <IconsMarketPage />
    </MemoryRouter>,
  );
}

describe("IconsMarketPage responsive filters", () => {
  beforeEach(() => {
    mockUser.getIdToken.mockClear();
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });
    global.fetch = jest.fn(async (url) => ({
      ok: true,
      json: async () => String(url).includes("/api/collections")
        ? { collections: [] }
        : { icons: [{ id: "icon-1", name: "Test Icon" }], hasMore: false, lastDocId: null },
    }));
    global.IntersectionObserver = class IntersectionObserverStub {
      observe() {}
      disconnect() {}
    };
  });

  test("exposes mobile filters and announces the selected choices", async () => {
    renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const mobileFilterSummary = screen.getByText("Filter icons").closest("summary");
    expect(mobileFilterSummary).toBeTruthy();
    expect(mobileFilterSummary.className).toContain("min-h-11");

    screen.getAllByRole("button", { name: "All Icons" }).forEach((button) => {
      expect(button.getAttribute("aria-pressed")).toBe("true");
    });
    screen.getAllByRole("button", { name: "Free Only" }).forEach((button) => {
      expect(button.getAttribute("aria-pressed")).toBe("false");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Free Only" })[0]);

    await waitFor(() => {
      screen.getAllByRole("button", { name: "Free Only" }).forEach((button) => {
        expect(button.getAttribute("aria-pressed")).toBe("true");
      });
    });
  });

  test("makes Collections reachable from the mobile layout", async () => {
    renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]);

    screen.getAllByRole("button", { name: "Collections" }).forEach((button) => {
      expect(button.getAttribute("aria-pressed")).toBe("true");
    });
    expect(screen.getAllByRole("button", { name: "Create Collection" }).length).toBeGreaterThan(0);
  });
});
