import React from "react";
import "@testing-library/jest-dom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { DEFAULT_SETTINGS } from "../lib/settingsSchema";
import { auth } from "../firebase";

jest.mock("../firebase", () => ({
  auth: {
    currentUser: {
      uid: "user_1",
      getIdToken: jest.fn(async () => "token_1"),
    },
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: () => jest.fn(),
}));

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function jsonResponse(body, ok = true) {
  return {
    ok,
    json: async () => body,
  };
}

function renderSettings() {
  return renderHook(() => useSettings(), {
    wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
  });
}

beforeEach(() => {
  localStorage.clear();
  auth.currentUser = {
    uid: "user_1",
    getIdToken: jest.fn(async () => "token_1"),
  };
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

test("updateSettings applies an optimistic value and rolls back when saving fails", async () => {
  const save = createDeferred();
  global.fetch.mockReturnValueOnce(save.promise);
  const { result } = renderSettings();

  let updatePromise;
  await act(async () => {
    updatePromise = result.current.updateSettings({ robloxAssetUploadsEnabled: true });
  });

  await waitFor(() => {
    expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);
    expect(result.current.saveStatus).toBe("saving");
  });

  await act(async () => {
    save.resolve(jsonResponse({ error: "No write access" }, false));
    await updatePromise;
  });

  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(DEFAULT_SETTINGS.robloxAssetUploadsEnabled);
  expect(result.current.saveStatus).toBe("error");
  expect(result.current.saveError).toBe("No write access");
});

test("rapid setting updates merge against the latest optimistic state", async () => {
  const firstSave = createDeferred();
  const secondSave = createDeferred();
  global.fetch
    .mockReturnValueOnce(firstSave.promise)
    .mockReturnValueOnce(secondSave.promise);
  const { result } = renderSettings();

  let firstUpdate;
  let secondUpdate;
  act(() => {
    firstUpdate = result.current.updateSettings({ theme: "light" });
    secondUpdate = result.current.updateSettings({ robloxAssetUploadsEnabled: true });
  });

  expect(result.current.settings.theme).toBe("light");
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

  await act(async () => {
    firstSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, theme: "light" },
      updatedAt: "2026-08-12T00:00:00.000Z",
    }));
    await firstUpdate;
  });

  expect(result.current.settings.theme).toBe("light");
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);

  await act(async () => {
    secondSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, theme: "light", robloxAssetUploadsEnabled: true },
      updatedAt: "2026-08-12T00:00:01.000Z",
    }));
    await secondUpdate;
  });

  expect(result.current.settings.theme).toBe("light");
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);
  expect(result.current.saveStatus).toBe("saved");
});

test("a follow-up update merges from an accepted server state before effects flush", async () => {
  const secondSave = createDeferred();
  global.fetch
    .mockResolvedValueOnce(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      updatedAt: "2026-08-12T00:00:00.000Z",
    }))
    .mockReturnValueOnce(secondSave.promise);
  const { result } = renderSettings();

  let secondUpdate;
  await act(async () => {
    await result.current.updateSettings({ theme: "light" });
    secondUpdate = result.current.updateSettings({ robloxAssetUploadsEnabled: true });
  });

  expect(result.current.settings.theme).toBe("dark");
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);

  await act(async () => {
    secondSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, theme: "dark", robloxAssetUploadsEnabled: true },
    }));
    await secondUpdate;
  });
});

test("a follow-up update merges from a rollback before effects flush", async () => {
  const secondSave = createDeferred();
  global.fetch
    .mockResolvedValueOnce(jsonResponse({ error: "No write access" }, false))
    .mockReturnValueOnce(secondSave.promise);
  const { result } = renderSettings();

  let secondUpdate;
  await act(async () => {
    await result.current.updateSettings({ theme: "light" });
    secondUpdate = result.current.updateSettings({ robloxAssetUploadsEnabled: true });
  });

  expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);

  await act(async () => {
    secondSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, robloxAssetUploadsEnabled: true },
    }));
    await secondUpdate;
  });
});

test("reloadSettings normalizes stale backend settings before updating state", async () => {
  global.fetch.mockResolvedValueOnce(jsonResponse({
    modelVersion: "gpt-4.1-mini",
    creativity: 4,
    chatMode: "unknown",
    robloxAssetUploadsEnabled: true,
  }));
  const { result } = renderSettings();

  await act(async () => {
    await result.current.reloadSettings(auth.currentUser);
  });

  expect(result.current.settings.modelVersion).toBe(DEFAULT_SETTINGS.modelVersion);
  expect(result.current.settings.creativity).toBe(1);
  expect(result.current.settings.chatMode).toBe(DEFAULT_SETTINGS.chatMode);
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);
  expect(result.current.saveStatus).toBe("saved");
});

test("anonymous appearance changes persist locally without an API request", async () => {
  auth.currentUser = null;
  const { result } = renderSettings();

  await act(async () => {
    await result.current.updateSettings({ theme: "light" });
  });

  expect(result.current.settings.theme).toBe("light");
  expect(result.current.saveStatus).toBe("saved");
  expect(JSON.parse(localStorage.getItem("nexusrbx:settings")).theme).toBe("light");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("settings synchronize valid appearance changes from another browser tab", async () => {
  auth.currentUser = null;
  const { result } = renderSettings();
  const nextSettings = { ...DEFAULT_SETTINGS, theme: "dark" };

  act(() => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: "nexusrbx:settings",
      newValue: JSON.stringify(nextSettings),
    }));
  });

  await waitFor(() => expect(result.current.settings.theme).toBe("dark"));
});
