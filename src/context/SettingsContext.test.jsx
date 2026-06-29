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
