import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectorUpdater,
  DEFAULT_UPDATE_FEED_URL,
  resolveUpdateFeedUrl,
  type ConnectorUpdaterClient,
} from "../src/updater.js";
import type { CompanionUpdateState } from "../src/contracts.js";

type Listener = (...args: unknown[]) => void;

class FakeUpdater implements ConnectorUpdaterClient {
  autoDownload = true;
  autoInstallOnAppQuit = false;
  feedUrl: string | null = null;
  checkCalls = 0;
  downloadCalls = 0;
  installCalls: Array<[boolean | undefined, boolean | undefined]> = [];
  listeners = new Map<string, Listener[]>();
  checkPromise: Promise<unknown> = Promise.resolve();
  downloadPromise: Promise<unknown> = Promise.resolve();

  setFeedURL(options: { provider: "generic"; url: string }): void { this.feedUrl = options.url; }
  checkForUpdates(): Promise<unknown> { this.checkCalls += 1; return this.checkPromise; }
  downloadUpdate(): Promise<unknown> { this.downloadCalls += 1; return this.downloadPromise; }
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void { this.installCalls.push([isSilent, isForceRunAfter]); }
  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  emit(event: string, ...args: unknown[]): void { for (const listener of this.listeners.get(event) ?? []) listener(...args); }
}

function makeUpdater(client: FakeUpdater, overrides: Partial<ConstructorParameters<typeof ConnectorUpdater>[0]> = {}) {
  const states: CompanionUpdateState[] = [];
  const notifications: string[] = [];
  const updater = new ConnectorUpdater({
    client,
    isPackaged: true,
    automaticUpdates: false,
    setState: (state) => states.push(state),
    notify: (title) => notifications.push(title),
    ...overrides,
  });
  return { updater, states, notifications };
}

test("packaged builds are locked to the official HTTPS update feed", () => {
  assert.equal(resolveUpdateFeedUrl("https://example.com/untrusted", false), DEFAULT_UPDATE_FEED_URL);
  assert.equal(resolveUpdateFeedUrl("https://updates.example.com/connector/", true), "https://updates.example.com/connector");
  assert.throws(() => resolveUpdateFeedUrl("http://updates.example.com/connector", true), /secure HTTPS/);
});

test("manual checks download an update even when automatic updates are disabled", async () => {
  const client = new FakeUpdater();
  const { updater, states, notifications } = makeUpdater(client);
  updater.start();

  assert.equal(client.autoDownload, false);
  assert.equal(client.autoInstallOnAppQuit, true);
  assert.equal(client.feedUrl, DEFAULT_UPDATE_FEED_URL);

  await updater.checkNow();
  client.emit("update-available");
  await Promise.resolve();
  assert.equal(client.checkCalls, 1);
  assert.equal(client.downloadCalls, 1);
  assert.equal(states.at(-1), "downloading");

  client.emit("update-downloaded");
  assert.equal(states.at(-1), "downloaded");
  assert.equal(notifications.at(-1), "Connector update ready");
  assert.equal(updater.install(), true);
  assert.deepEqual(client.installCalls, [[false, true]]);
});

test("automatic updates check after startup, reschedule, and deduplicate active checks", async () => {
  const client = new FakeUpdater();
  let resolveCheck: (() => void) | undefined;
  client.checkPromise = new Promise<void>((resolve) => { resolveCheck = resolve; });
  const scheduled: Array<() => void> = [];
  const schedule = ((callback: (...args: unknown[]) => void) => {
    scheduled.push(() => callback());
    return { fake: true } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  const cancel = (() => undefined) as typeof clearTimeout;
  const { updater } = makeUpdater(client, { automaticUpdates: true, schedule, cancel });

  updater.start();
  assert.equal(scheduled.length, 1);
  scheduled.shift()?.();
  await Promise.resolve();
  assert.equal(client.checkCalls, 1);

  const duplicate = updater.checkNow();
  assert.equal(client.checkCalls, 1);
  resolveCheck?.();
  await duplicate;
  assert.equal(scheduled.length, 1);
  updater.stop();
});

test("enabling automatic updates starts checking without an app restart", () => {
  const client = new FakeUpdater();
  const scheduled: Array<() => void> = [];
  const schedule = ((callback: (...args: unknown[]) => void) => {
    scheduled.push(() => callback());
    return { fake: true } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  const cancel = (() => undefined) as typeof clearTimeout;
  const { updater } = makeUpdater(client, { schedule, cancel });

  updater.start();
  assert.equal(scheduled.length, 0);
  updater.setAutomaticUpdates(true);
  assert.equal(scheduled.length, 1);
  updater.setAutomaticUpdates(false);
  updater.stop();
});

test("does not start a second check while an update download is active", async () => {
  const client = new FakeUpdater();
  let resolveDownload: (() => void) | undefined;
  client.downloadPromise = new Promise<void>((resolve) => { resolveDownload = resolve; });
  const { updater, states } = makeUpdater(client);
  updater.start();

  await updater.checkNow();
  client.emit("update-available");
  await Promise.resolve();
  await updater.checkNow();

  assert.equal(client.checkCalls, 1);
  assert.equal(states.at(-1), "downloading");
  resolveDownload?.();
});

test("preserves the restart action when a late updater error follows a verified download", () => {
  const client = new FakeUpdater();
  const reported: string[] = [];
  const { updater, states } = makeUpdater(client, { reportError: (message) => reported.push(message) });
  updater.start();

  client.emit("update-downloaded");
  client.emit("error", new Error("cleanup failed after download"));

  assert.equal(states.at(-1), "downloaded");
  assert.equal(updater.install(), true);
  assert.match(reported.at(-1) ?? "", /cleanup failed/);
});
