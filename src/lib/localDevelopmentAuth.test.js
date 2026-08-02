import {
  ensureLocalDevelopmentAuth,
  LOCAL_DEVELOPMENT_UID,
  shouldUseLocalDevelopmentAuth,
  startLocalDevelopmentAuthRecovery,
} from "./localDevelopmentAuth";

jest.mock("firebase/auth", () => ({
  signInWithCustomToken: jest.fn(),
}));

async function flushPromises() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

test("local auth is enabled only when both browser and API are local development", () => {
  expect(shouldUseLocalDevelopmentAuth({
    environment: "development",
    locationObject: { hostname: "localhost" },
    backendUrl: "http://localhost:3001",
  })).toBe(true);
  expect(shouldUseLocalDevelopmentAuth({
    environment: "production",
    locationObject: { hostname: "localhost" },
    backendUrl: "http://localhost:3001",
  })).toBe(false);
  expect(shouldUseLocalDevelopmentAuth({
    environment: "development",
    locationObject: { hostname: "localhost" },
    backendUrl: "https://api.nexusrbx.com",
  })).toBe(false);
});

test("ensureLocalDevelopmentAuth exchanges the local token for a Firebase user", async () => {
  const user = { uid: "nexusrbx-local-dev" };
  const auth = { currentUser: null };
  const fetchImpl = jest.fn(async () => ({
    ok: true,
    json: async () => ({ token: "custom-token", uid: user.uid }),
  }));
  const signIn = jest.fn(async () => ({ user }));

  await expect(ensureLocalDevelopmentAuth(auth, {
    fetchImpl,
    signIn,
    backendUrl: "http://localhost:3001",
    environment: "development",
    locationObject: { hostname: "localhost" },
  })).resolves.toBe(user);

  expect(fetchImpl).toHaveBeenCalledWith(
    "http://localhost:3001/api/auth/local-dev-session",
    expect.objectContaining({ method: "POST", cache: "no-store" })
  );
  expect(signIn).toHaveBeenCalledWith(auth, "custom-token");
});

test("ensureLocalDevelopmentAuth does not request another token for the local developer", async () => {
  const user = { uid: LOCAL_DEVELOPMENT_UID };
  const fetchImpl = jest.fn();

  await expect(ensureLocalDevelopmentAuth({ currentUser: user }, {
    fetchImpl,
    backendUrl: "http://localhost:3001",
    environment: "development",
    locationObject: { hostname: "localhost" },
  })).resolves.toBe(user);

  expect(fetchImpl).not.toHaveBeenCalled();
});

test("local auth recovery retries when a restarted backend becomes available", async () => {
  jest.useFakeTimers();
  const listeners = {};
  const windowObject = {
    location: { hostname: "localhost" },
    setInterval,
    clearInterval,
    addEventListener: jest.fn((name, callback) => { listeners[name] = callback; }),
    removeEventListener: jest.fn(),
  };
  const auth = { currentUser: null };
  const user = { uid: LOCAL_DEVELOPMENT_UID };
  const fetchImpl = jest.fn()
    .mockRejectedValueOnce(new Error("backend restarting"))
    .mockResolvedValue({
      ok: true,
      json: async () => ({ token: "custom-token", uid: user.uid }),
    });
  const signIn = jest.fn(async () => {
    auth.currentUser = user;
    return { user };
  });
  const onError = jest.fn();

  const stop = startLocalDevelopmentAuthRecovery(auth, {
    backendUrl: "http://localhost:3001",
    environment: "development",
    fetchImpl,
    signIn,
    windowObject,
    intervalMs: 1000,
    onError,
  });
  await flushPromises();
  expect(onError).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(1000);
  await flushPromises();
  expect(signIn).toHaveBeenCalledWith(auth, "custom-token");

  stop();
  expect(windowObject.removeEventListener).toHaveBeenCalledWith("focus", listeners.focus);
  jest.useRealTimers();
});
