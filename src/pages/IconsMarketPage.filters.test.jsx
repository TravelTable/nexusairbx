import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUser = { uid: "user-default", getIdToken: jest.fn(async () => "test-token") };

function createDeferred() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

jest.mock("../firebase", () => ({ auth: { name: "test-auth" } }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));
jest.mock("../context/BillingContext", () => ({ useBilling: () => ({ isPremium: false }) }));
jest.mock("../lib/uiBuilderApi", () => ({ exportIcon: jest.fn() }));
jest.mock("../components/icons/IconMarketCard", () => function IconMarketCardStub({ icon, observeRef }) {
  return <a ref={observeRef} href={`/icons-market/${icon.id}`}>{icon.name}</a>;
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

  test("uses the Creator Store name and leaves document scrolling to the page", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.getByRole("heading", { level: 1, name: "Creator Store" })).toBeTruthy();
    expect(container.firstChild.className).toContain("creator-store-page");
    expect(container.firstChild.className).not.toContain("overflow-hidden");
    expect(container.innerHTML).not.toContain("100vh-64px");
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

  test("clears private collections immediately when the authenticated UID changes", async () => {
    const userA = { uid: "user-a", getIdToken: jest.fn(async () => "token-a") };
    const userB = { uid: "user-b", getIdToken: jest.fn(async () => "token-b") };
    const userBCollections = createDeferred();
    let emitAuth;
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      emitAuth = callback;
      callback(userA);
      return jest.fn();
    });
    global.fetch = jest.fn(async (url, init = {}) => {
      if (String(url).includes("/api/icons/market")) {
        return {
          ok: true,
          json: async () => ({ icons: [], hasMore: false, lastDocId: null }),
        };
      }
      if (init.headers?.Authorization === "Bearer token-a") {
        return {
          ok: true,
          json: async () => ({ collections: [{ id: "collection-a", name: "User A collection" }] }),
        };
      }
      return userBCollections.promise;
    });

    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]);
    expect((await screen.findAllByText("User A collection")).length).toBeGreaterThan(0);

    act(() => emitAuth(userB));
    await waitFor(() => expect(screen.queryByText("User A collection")).toBeNull());

    await act(async () => {
      userBCollections.resolve({
        ok: true,
        json: async () => ({ collections: [{ id: "collection-b", name: "User B collection" }] }),
      });
      await Promise.resolve();
    });
    expect((await screen.findAllByText("User B collection")).length).toBeGreaterThan(0);
  });

  test("keeps user B collections when user A's deferred request resolves last", async () => {
    const userA = { uid: "user-a", getIdToken: jest.fn(async () => "token-a") };
    const userB = { uid: "user-b", getIdToken: jest.fn(async () => "token-b") };
    const userACollections = createDeferred();
    const userBCollections = createDeferred();
    let emitAuth;
    let collectionRequests = 0;
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      emitAuth = callback;
      callback(userA);
      return jest.fn();
    });
    global.fetch = jest.fn(async (url, init = {}) => {
      if (String(url).includes("/api/icons/market")) {
        return {
          ok: true,
          json: async () => ({ icons: [], hasMore: false, lastDocId: null }),
        };
      }
      collectionRequests += 1;
      return init.headers?.Authorization === "Bearer token-a"
        ? userACollections.promise
        : userBCollections.promise;
    });

    renderPage();
    await waitFor(() => expect(collectionRequests).toBe(1));
    act(() => emitAuth(userB));
    await waitFor(() => expect(collectionRequests).toBe(2));

    await act(async () => {
      userBCollections.resolve({
        ok: true,
        json: async () => ({ collections: [{ id: "collection-b", name: "User B collection" }] }),
      });
      await Promise.resolve();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]);
    expect((await screen.findAllByText("User B collection")).length).toBeGreaterThan(0);

    await act(async () => {
      userACollections.resolve({
        ok: true,
        json: async () => ({ collections: [{ id: "collection-a", name: "User A collection" }] }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText("User A collection")).toBeNull();
      expect(screen.getAllByText("User B collection").length).toBeGreaterThan(0);
    });
  });

  test("reconciles and surfaces a same-collection delete failure after an older delete succeeds", async () => {
    const firstDelete = createDeferred();
    const secondDelete = createDeferred();
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    let collectionReads = 0;
    let deleteAttempts = 0;

    global.fetch = jest.fn(async (url, init = {}) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/api/icons/market")) {
        return {
          ok: true,
          json: async () => ({ icons: [], hasMore: false, lastDocId: null }),
        };
      }
      if (requestUrl.includes("/api/collections/collection-race") && init.method === "DELETE") {
        deleteAttempts += 1;
        return deleteAttempts === 1 ? firstDelete.promise : secondDelete.promise;
      }
      if (requestUrl.includes("/api/collections")) {
        collectionReads += 1;
        return {
          ok: true,
          json: async () => ({
            collections: collectionReads === 1
              ? [{ id: "collection-race", name: "Race collection", iconIds: ["icon-1"] }]
              : [],
          }),
        };
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    try {
      renderPage();
      fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]);
      expect((await screen.findAllByText("Race collection")).length).toBeGreaterThan(0);

      const deleteButton = screen.getAllByRole("button", { name: "Delete Race collection" })[0];
      fireEvent.click(deleteButton);
      await waitFor(() => expect(deleteAttempts).toBe(1));
      fireEvent.click(deleteButton);
      await waitFor(() => expect(deleteAttempts).toBe(2));

      await act(async () => {
        firstDelete.resolve({ ok: true, status: 204, json: async () => ({}) });
        secondDelete.resolve({
          ok: false,
          status: 503,
          json: async () => ({ error: "Delete retry failed" }),
        });
        await Promise.resolve();
      });

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Delete retry failed");
      expect(screen.queryByText("Race collection")).toBeNull();
      expect(collectionReads).toBeGreaterThan(1);
    } finally {
      confirm.mockRestore();
      consoleError.mockRestore();
    }
  });

  test("shows a catalogue error and retries without presenting it as an empty result", async () => {
    let marketAttempts = 0;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes("/api/icons/market")) {
        marketAttempts += 1;
        if (marketAttempts === 1) {
          return { ok: false, status: 503 };
        }
        return {
          ok: true,
          json: async () => ({
            icons: [{
              id: "recovered-icon",
              name: "Recovered Icon",
              imageUrl: "https://example.com/recovered.png",
            }],
            hasMore: false,
            lastDocId: null,
          }),
        };
      }
      return { ok: true, json: async () => ({ collections: [] }) };
    });

    try {
      renderPage();

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("The icon catalogue could not be loaded.");
      expect(screen.queryByText("No icons found")).toBeNull();

      const retry = screen.getByRole("button", { name: "Retry icon catalogue" });
      fireEvent.click(retry);

      expect(await screen.findByRole("link", { name: "Recovered Icon" })).toBeTruthy();
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      expect(marketAttempts).toBe(2);
    } finally {
      consoleError.mockRestore();
    }
  });

  test("does not repeat the first catalogue page when the response advances its cursor", async () => {
    let marketAttempts = 0;
    let collectionAttempts = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes("/api/icons/market")) {
        marketAttempts += 1;
        return {
          ok: true,
          json: async () => ({
            icons: [{
              id: "cursor-icon",
              name: "Cursor Icon",
              imageUrl: "https://example.com/cursor.png",
            }],
            hasMore: true,
            lastDocId: "cursor-page-1",
          }),
        };
      }
      collectionAttempts += 1;
      return { ok: true, json: async () => ({ collections: [] }) };
    });

    renderPage();

    expect(await screen.findByRole("link", { name: "Cursor Icon" })).toBeTruthy();
    await waitFor(() => {
      expect(marketAttempts).toBe(1);
      expect(collectionAttempts).toBe(1);
    });
  });

  test("deduplicates a repeated load-more page and stops when its cursor does not advance", async () => {
    let observerCallback = null;
    global.IntersectionObserver = class IntersectionObserverStub {
      constructor(callback) {
        observerCallback = callback;
      }

      observe() {}
      disconnect() {}
    };

    const marketUrls = [];
    global.fetch = jest.fn(async (url) => {
      if (!String(url).includes("/api/icons/market")) {
        return { ok: true, json: async () => ({ collections: [] }) };
      }
      marketUrls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          icons: [{
            id: "repeated-icon",
            name: "Repeated Icon",
            imageUrl: "https://example.com/repeated.png",
          }],
          hasMore: true,
          lastDocId: "stalled-cursor",
        }),
      };
    });

    renderPage();
    expect(await screen.findByRole("link", { name: "Repeated Icon" })).toBeTruthy();
    await waitFor(() => expect(typeof observerCallback).toBe("function"));

    await act(async () => {
      observerCallback([{ isIntersecting: true }]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(marketUrls).toHaveLength(2));
    expect(marketUrls[1]).toContain("lastDocId=stalled-cursor");
    expect(screen.getAllByRole("link", { name: "Repeated Icon" })).toHaveLength(1);

    await act(async () => {
      observerCallback([{ isIntersecting: true }]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(marketUrls).toHaveLength(2);
  });

  test("ignores an older catalogue response after the search changes", async () => {
    const initialMarket = createDeferred();
    let marketAttempts = 0;
    global.fetch = jest.fn(async (url) => {
      if (!String(url).includes("/api/icons/market")) {
        return { ok: true, json: async () => ({ collections: [] }) };
      }
      marketAttempts += 1;
      if (marketAttempts === 1) return initialMarket.promise;
      return {
        ok: true,
        json: async () => ({
          icons: [{
            id: "new-search-icon",
            name: "New Search Icon",
            imageUrl: "https://example.com/new.png",
          }],
          hasMore: false,
          lastDocId: null,
        }),
      };
    });

    renderPage();
    await waitFor(() => expect(marketAttempts).toBe(1));
    fireEvent.change(screen.getByLabelText("Search icons"), {
      target: { value: "new" },
    });
    expect(await screen.findByRole("link", { name: "New Search Icon" })).toBeTruthy();

    initialMarket.resolve({
      ok: true,
      json: async () => ({
        icons: [{
          id: "stale-icon",
          name: "Stale Icon",
          imageUrl: "https://example.com/stale.png",
        }],
        hasMore: false,
        lastDocId: null,
      }),
    });
    await initialMarket.promise;

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Stale Icon" })).toBeNull();
      expect(screen.getByRole("link", { name: "New Search Icon" })).toBeTruthy();
    });
  });
});
