import { act, renderHook, waitFor } from "@testing-library/react";
import { useAiScripts } from "./useAiScripts";
import { auth } from "../firebase";
import { getDocs, onSnapshot } from "firebase/firestore";

jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn((...segments) => ({ segments })),
  deleteDoc: jest.fn(),
  doc: jest.fn((...segments) => ({ segments })),
  getDocs: jest.fn(() => Promise.resolve({ forEach: jest.fn() })),
  limit: jest.fn((count) => ({ count })),
  onSnapshot: jest.fn(),
  orderBy: jest.fn((field, direction) => ({ field, direction })),
  query: jest.fn((...parts) => ({ parts })),
  serverTimestamp: jest.fn(() => "timestamp"),
  updateDoc: jest.fn(),
}));

describe("useAiScripts listener lifecycle", () => {
  const user = { uid: "user_1" };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = user;
    getDocs.mockResolvedValue({ forEach: jest.fn() });
  });

  test("waits for auth readiness, unsubscribes on logout, and clears stale state", async () => {
    const unsubscribe = jest.fn();
    let emitScript;
    onSnapshot.mockImplementation((_ref, onNext) => {
      emitScript = onNext;
      return unsubscribe;
    });

    const notify = jest.fn();
    const { result, rerender, unmount } = renderHook(
      ({ currentUser, authReady }) => useAiScripts(currentUser, notify, { authReady }),
      { initialProps: { currentUser: user, authReady: false } }
    );

    act(() => {
      result.current.setCurrentScriptId("script_1");
    });
    expect(onSnapshot).not.toHaveBeenCalled();

    rerender({ currentUser: user, authReady: true });
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));

    act(() => {
      emitScript({
        id: "script_1",
        exists: () => true,
        data: () => ({ title: "Loaded" }),
      });
    });
    expect(result.current.currentScript).toEqual({
      id: "script_1",
      title: "Loaded",
    });

    auth.currentUser = null;
    rerender({ currentUser: null, authReady: true });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.currentScript).toBeNull());

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
