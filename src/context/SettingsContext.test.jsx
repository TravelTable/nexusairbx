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
  onAuthStateChanged: jest.fn(),
}));

const { onAuthStateChanged } = require("firebase/auth");
let authStateListener;

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

function settingsStorageKey(uid) {
  return uid ? `nexusrbx:settings:${encodeURIComponent(uid)}` : "nexusrbx:settings";
}

function renderSettings() {
  return renderHook(() => useSettings(), {
    wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
  });
}

beforeEach(() => {
  localStorage.clear();
  authStateListener = null;
  auth.currentUser = {
    uid: "user_1",
    getIdToken: jest.fn(async () => "token_1"),
  };
  jest.clearAllMocks();
  onAuthStateChanged.mockImplementation((_auth, listener) => {
    authStateListener = listener;
    return jest.fn();
  });
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
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

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ theme: "light" });

  await act(async () => {
    firstSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, theme: "light" },
      updatedAt: "2026-08-12T00:00:00.000Z",
    }));
    await firstUpdate;
  });

  expect(result.current.settings.theme).toBe("light");
  expect(result.current.settings.robloxAssetUploadsEnabled).toBe(true);
  expect(result.current.saveStatus).toBe("saving");
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
    robloxAssetUploadsEnabled: true,
  });

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

test("a failed settings reload preserves the last local values and exposes recovery state", async () => {
  localStorage.setItem(settingsStorageKey("user_1"), JSON.stringify({
    ...DEFAULT_SETTINGS,
    theme: "dark",
    codingStandards: "Keep strict types.",
  }));
  global.fetch.mockResolvedValueOnce(jsonResponse({ error: "Settings store unavailable" }, false));
  const { result } = renderSettings();

  await act(async () => {
    await result.current.reloadSettings(auth.currentUser);
  });

  expect(result.current.settings.theme).toBe("dark");
  expect(result.current.settings.codingStandards).toBe("Keep strict types.");
  expect(result.current.saveStatus).toBe("error");
  expect(result.current.saveError).toBe("Settings store unavailable");
});

test("an A to B auth switch immediately isolates B from A when B reload fails", async () => {
  const firstUser = {
    uid: "user_1",
    getIdToken: jest.fn(async () => "token_1"),
  };
  const secondUser = {
    uid: "user_2",
    getIdToken: jest.fn(async () => "token_2"),
  };
  auth.currentUser = firstUser;
  localStorage.setItem(settingsStorageKey("user_1"), JSON.stringify({
    ...DEFAULT_SETTINGS,
    theme: "dark",
    gameSpec: "Private game design for user A",
    codingStandards: "Private coding rules for user A",
  }));
  const secondReload = createDeferred();
  global.fetch.mockReturnValueOnce(secondReload.promise);
  const { result } = renderSettings();

  expect(result.current.settings.gameSpec).toBe("Private game design for user A");
  expect(result.current.settings.codingStandards).toBe("Private coding rules for user A");

  act(() => authStateListener(secondUser));

  expect(result.current.user.uid).toBe("user_2");
  expect(result.current.settings.gameSpec).toBe(DEFAULT_SETTINGS.gameSpec);
  expect(result.current.settings.codingStandards).toBe(DEFAULT_SETTINGS.codingStandards);
  expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  await act(async () => {
    secondReload.resolve(jsonResponse({ error: "Settings store unavailable" }, false));
    await secondReload.promise;
  });

  expect(result.current.user.uid).toBe("user_2");
  expect(result.current.settings.gameSpec).toBe(DEFAULT_SETTINGS.gameSpec);
  expect(result.current.settings.codingStandards).toBe(DEFAULT_SETTINGS.codingStandards);
  expect(result.current.saveStatus).toBe("error");
  expect(localStorage.getItem(settingsStorageKey("user_2"))).toBeNull();
  expect(JSON.parse(localStorage.getItem(settingsStorageKey("user_1"))).gameSpec)
    .toBe("Private game design for user A");
});

test("signing out restores only device-safe anonymous settings", () => {
  localStorage.setItem(settingsStorageKey("user_1"), JSON.stringify({
    ...DEFAULT_SETTINGS,
    gameSpec: "User-only project context",
    theme: "dark",
  }));
  localStorage.setItem(settingsStorageKey(null), JSON.stringify({
    ...DEFAULT_SETTINGS,
    gameSpec: "Anonymous local draft",
    theme: "light",
  }));
  const { result } = renderSettings();

  expect(result.current.settings.gameSpec).toBe("User-only project context");

  act(() => authStateListener(null));

  expect(result.current.user).toBeNull();
  expect(result.current.settings.gameSpec).toBe(DEFAULT_SETTINGS.gameSpec);
  expect(result.current.settings.theme).toBe("light");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("scrubs legacy unscoped project context before it can become signed-out state", () => {
  localStorage.setItem(settingsStorageKey(null), JSON.stringify({
    ...DEFAULT_SETTINGS,
    theme: "light",
    gameSpec: "Private legacy game design",
    codingStandards: "Private legacy coding rules",
    lastAuthorizedStudioSessionId: "studio-private",
  }));
  const { result } = renderSettings();

  const anonymousCache = JSON.parse(localStorage.getItem(settingsStorageKey(null)));
  expect(anonymousCache.theme).toBe("light");
  expect(anonymousCache.gameSpec).toBe(DEFAULT_SETTINGS.gameSpec);
  expect(anonymousCache.codingStandards).toBe(DEFAULT_SETTINGS.codingStandards);
  expect(anonymousCache.lastAuthorizedStudioSessionId)
    .toBe(DEFAULT_SETTINGS.lastAuthorizedStudioSessionId);

  act(() => authStateListener(null));

  expect(result.current.user).toBeNull();
  expect(result.current.settings.theme).toBe("light");
  expect(result.current.settings.gameSpec).toBe(DEFAULT_SETTINGS.gameSpec);
  expect(result.current.settings.codingStandards).toBe(DEFAULT_SETTINGS.codingStandards);
});

test("a cross-tab storage event cannot commit or invalidate an in-flight local save", async () => {
  const save = createDeferred();
  localStorage.setItem(settingsStorageKey("user_1"), JSON.stringify({
    ...DEFAULT_SETTINGS,
    gameSpec: "Committed spec",
  }));
  global.fetch.mockReturnValueOnce(save.promise);
  const { result } = renderSettings();

  let updatePromise;
  act(() => {
    updatePromise = result.current.updateSettings({ gameSpec: "Local pending spec" });
  });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  expect(JSON.parse(localStorage.getItem(settingsStorageKey("user_1"))).gameSpec)
    .toBe("Committed spec");

  act(() => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: settingsStorageKey("user_1"),
      newValue: JSON.stringify({
        ...DEFAULT_SETTINGS,
        gameSpec: "Remote optimistic spec",
      }),
    }));
  });

  expect(result.current.settings.gameSpec).toBe("Local pending spec");
  expect(result.current.saveStatus).toBe("saving");

  await act(async () => {
    save.resolve(jsonResponse({ error: "Settings store unavailable" }, false));
    await updatePromise;
  });

  expect(result.current.settings.gameSpec).toBe("Committed spec");
  expect(result.current.saveStatus).toBe("error");
  expect(JSON.parse(localStorage.getItem(settingsStorageKey("user_1"))).gameSpec)
    .toBe("Committed spec");
});

test("a save invalidates an older deferred reload before it can overwrite committed state", async () => {
  const reload = createDeferred();
  const save = createDeferred();
  global.fetch
    .mockReturnValueOnce(reload.promise)
    .mockReturnValueOnce(save.promise);
  const { result } = renderSettings();

  let reloadPromise;
  act(() => {
    reloadPromise = result.current.reloadSettings(auth.currentUser);
  });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  let savePromise;
  act(() => {
    savePromise = result.current.updateSettings({ gameSpec: "Newest saved spec" });
  });
  expect(result.current.settings.gameSpec).toBe("Newest saved spec");
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

  await act(async () => {
    save.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, gameSpec: "Newest saved spec" },
      updatedAt: "2026-08-25T02:00:01.000Z",
    }));
    await savePromise;
  });
  expect(result.current.saveStatus).toBe("saved");

  let reloadResult;
  await act(async () => {
    reload.resolve(jsonResponse({
      ...DEFAULT_SETTINGS,
      gameSpec: "Older reloaded spec",
      updatedAt: "2026-08-25T02:00:00.000Z",
    }));
    reloadResult = await reloadPromise;
  });

  expect(reloadResult).toEqual({ ok: false, stale: true });
  expect(result.current.settings.gameSpec).toBe("Newest saved spec");
  expect(JSON.parse(localStorage.getItem(settingsStorageKey("user_1"))).gameSpec)
    .toBe("Newest saved spec");
});

test("rapid same-key saves reach the backend serially and only the final commit marks saved", async () => {
  const firstSave = createDeferred();
  const secondSave = createDeferred();
  global.fetch
    .mockReturnValueOnce(firstSave.promise)
    .mockReturnValueOnce(secondSave.promise);
  const { result } = renderSettings();

  let firstUpdate;
  let secondUpdate;
  act(() => {
    firstUpdate = result.current.updateSettings({ codingStandards: "First standard" });
    secondUpdate = result.current.updateSettings({ codingStandards: "Second standard" });
  });

  expect(result.current.settings.codingStandards).toBe("Second standard");
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
    codingStandards: "First standard",
  });

  await act(async () => {
    firstSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, codingStandards: "First standard" },
      updatedAt: "2026-08-25T03:00:00.000Z",
    }));
    await firstUpdate;
  });

  expect(result.current.settings.codingStandards).toBe("Second standard");
  expect(result.current.saveStatus).toBe("saving");
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
    codingStandards: "Second standard",
  });

  await act(async () => {
    secondSave.resolve(jsonResponse({
      settings: { ...DEFAULT_SETTINGS, codingStandards: "Second standard" },
      updatedAt: "2026-08-25T03:00:01.000Z",
    }));
    await secondUpdate;
  });

  expect(result.current.settings.codingStandards).toBe("Second standard");
  expect(result.current.saveStatus).toBe("saved");
  expect(result.current.lastSavedAt).toBe("2026-08-25T03:00:01.000Z");
  expect(JSON.parse(localStorage.getItem(settingsStorageKey("user_1"))).codingStandards)
    .toBe("Second standard");
  expect(localStorage.getItem(settingsStorageKey(null))).toBeNull();
});

test("an older settings reload cannot overwrite the latest authenticated user", async () => {
  const firstReload = createDeferred();
  const secondReload = createDeferred();
  const firstUser = {
    uid: "user_1",
    getIdToken: jest.fn(async () => "token_1"),
  };
  const secondUser = {
    uid: "user_2",
    getIdToken: jest.fn(async () => "token_2"),
  };
  global.fetch
    .mockReturnValueOnce(firstReload.promise)
    .mockReturnValueOnce(secondReload.promise);
  const { result } = renderSettings();

  act(() => authStateListener(firstUser));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  act(() => authStateListener(secondUser));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

  await act(async () => {
    secondReload.resolve(jsonResponse({ ...DEFAULT_SETTINGS, theme: "dark" }));
    await secondReload.promise;
  });
  expect(result.current.user.uid).toBe("user_2");
  expect(result.current.settings.theme).toBe("dark");

  await act(async () => {
    firstReload.resolve(jsonResponse({ ...DEFAULT_SETTINGS, theme: "light" }));
    await firstReload.promise;
  });
  expect(result.current.user.uid).toBe("user_2");
  expect(result.current.settings.theme).toBe("dark");
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

test("anonymous settings report a local persistence failure instead of claiming they were saved", async () => {
  auth.currentUser = null;
  const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  const { result } = renderSettings();

  let updateResult;
  await act(async () => {
    updateResult = await result.current.updateSettings({ theme: "light" });
  });

  expect(updateResult).toEqual({
    ok: false,
    error: "Settings could not be saved on this device.",
  });
  expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  expect(result.current.saveStatus).toBe("error");
  expect(global.fetch).not.toHaveBeenCalled();
  setItem.mockRestore();
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
