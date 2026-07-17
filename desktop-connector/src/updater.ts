import type { CompanionUpdateState } from "./contracts.js";

export const DEFAULT_UPDATE_FEED_URL = "https://downloads.nexusrbx.com/connector";
export const INITIAL_UPDATE_CHECK_DELAY_MS = 15_000;
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;
export const UPDATE_RETRY_DELAY_MS = 15 * 60 * 1_000;

type UpdateEvent = "update-available" | "update-downloaded" | "update-not-available" | "download-progress" | "error";

export interface ConnectorUpdaterClient {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  setFeedURL(options: { provider: "generic"; url: string }): void;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: UpdateEvent, listener: (...args: unknown[]) => void): unknown;
}

export interface ConnectorUpdaterOptions {
  client: ConnectorUpdaterClient;
  isPackaged: boolean;
  automaticUpdates: boolean;
  requestedFeedUrl?: string;
  setState(state: CompanionUpdateState): void;
  notify(title: string, body: string): void;
  reportError?(message: string): void;
  initialDelayMs?: number;
  intervalMs?: number;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}

export function resolveUpdateFeedUrl(requested: string | undefined, allowCustomFeed: boolean): string {
  const raw = allowCustomFeed && requested ? requested : DEFAULT_UPDATE_FEED_URL;
  let url: URL;
  try { url = new URL(raw); } catch { throw new TypeError("The connector update feed URL is invalid."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new TypeError("The connector update feed must be a secure HTTPS URL.");
  }
  if (!allowCustomFeed && (url.origin !== "https://downloads.nexusrbx.com" || url.pathname.replace(/\/$/, "") !== "/connector")) {
    throw new TypeError("Packaged connector updates must use the official NexusRBX release feed.");
  }
  return url.toString().replace(/\/$/, "");
}

export class ConnectorUpdater {
  readonly #client: ConnectorUpdaterClient;
  readonly #isPackaged: boolean;
  readonly #setState: (state: CompanionUpdateState) => void;
  readonly #notify: (title: string, body: string) => void;
  readonly #reportError: (message: string) => void;
  readonly #initialDelayMs: number;
  readonly #intervalMs: number;
  readonly #schedule: typeof setTimeout;
  readonly #cancel: typeof clearTimeout;
  readonly #feedUrl: string;
  #automaticUpdates: boolean;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #check: Promise<void> | null = null;
  #downloadRequested = false;
  #downloadStarted = false;
  #readyToInstall = false;
  #configured = false;

  constructor(options: ConnectorUpdaterOptions) {
    this.#client = options.client;
    this.#isPackaged = options.isPackaged;
    this.#automaticUpdates = options.automaticUpdates;
    this.#setState = options.setState;
    this.#notify = options.notify;
    this.#reportError = options.reportError ?? (() => undefined);
    this.#initialDelayMs = options.initialDelayMs ?? INITIAL_UPDATE_CHECK_DELAY_MS;
    this.#intervalMs = options.intervalMs ?? UPDATE_CHECK_INTERVAL_MS;
    this.#schedule = options.schedule ?? setTimeout;
    this.#cancel = options.cancel ?? clearTimeout;
    this.#feedUrl = resolveUpdateFeedUrl(options.requestedFeedUrl, !options.isPackaged);
  }

  start(): void {
    if (this.#configured || !this.#isPackaged) return;
    this.#configured = true;
    // Downloads are started by this coordinator so manual checks work even
    // when automatic background updates are disabled.
    this.#client.autoDownload = false;
    this.#client.autoInstallOnAppQuit = true;
    this.#client.setFeedURL({ provider: "generic", url: this.#feedUrl });
    this.#client.on("update-available", () => this.onUpdateAvailable());
    this.#client.on("download-progress", () => this.#setState("downloading"));
    this.#client.on("update-downloaded", () => this.onUpdateDownloaded());
    this.#client.on("update-not-available", () => this.onUpdateNotAvailable());
    this.#client.on("error", (error) => this.onUpdateError(error));
    if (this.#automaticUpdates) this.scheduleNext(this.#initialDelayMs);
  }

  setAutomaticUpdates(enabled: boolean): void {
    this.#automaticUpdates = enabled;
    if (!this.#isPackaged) return;
    if (!enabled) { this.clearTimer(); return; }
    if (!this.#timer && !this.#check && !this.#readyToInstall) this.scheduleNext(0);
  }

  async checkNow(): Promise<void> { await this.check(true); }

  install(): boolean {
    if (!this.#readyToInstall) return false;
    this.#client.quitAndInstall(false, true);
    return true;
  }

  stop(): void { this.clearTimer(); }

  private async check(manual: boolean): Promise<void> {
    if (!this.#isPackaged || this.#readyToInstall || this.#downloadStarted) return;
    if (manual) this.#downloadRequested = true;
    else if (this.#automaticUpdates) this.#downloadRequested = true;
    if (this.#check) return this.#check;
    this.clearTimer();
    this.#setState("checking");
    this.#check = this.#client.checkForUpdates().then(() => undefined).catch((error) => {
      this.onUpdateError(error);
    }).finally(() => {
      this.#check = null;
      if (this.#automaticUpdates && !this.#readyToInstall) this.scheduleNext(this.#intervalMs);
    });
    return this.#check;
  }

  private onUpdateAvailable(): void {
    this.#setState(this.#downloadRequested ? "downloading" : "available");
    this.#notify("Connector update available", this.#downloadRequested ? "The update is downloading in the background." : "Open Settings to download the latest update.");
    if (!this.#downloadRequested || this.#downloadStarted) return;
    this.#downloadStarted = true;
    void this.#client.downloadUpdate().catch((error) => this.onUpdateError(error));
  }

  private onUpdateDownloaded(): void {
    this.#downloadStarted = false;
    this.#downloadRequested = false;
    this.#readyToInstall = true;
    this.clearTimer();
    this.#setState("downloaded");
    this.#notify("Connector update ready", "Restart NexusRBX Connector to finish updating.");
  }

  private onUpdateNotAvailable(): void {
    this.#downloadRequested = false;
    this.#downloadStarted = false;
    this.#setState("idle");
  }

  private onUpdateError(error?: unknown): void {
    this.#reportError(describeUpdateError(error));
    this.#downloadStarted = false;
    // electron-updater can emit a delayed cleanup error after it has already
    // verified the archive. Preserve the restart path instead of hiding it.
    if (this.#readyToInstall) {
      this.#setState("downloaded");
      return;
    }
    this.#setState("error");
    if (this.#automaticUpdates) this.scheduleNext(UPDATE_RETRY_DELAY_MS);
  }

  private scheduleNext(delayMs: number): void {
    this.clearTimer();
    this.#timer = this.#schedule(() => {
      this.#timer = null;
      void this.check(false);
    }, delayMs);
  }

  private clearTimer(): void {
    if (!this.#timer) return;
    this.#cancel(this.#timer);
    this.#timer = null;
  }
}

function describeUpdateError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "The update service returned an unknown error.";
}
