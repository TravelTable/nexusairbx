import { Worker } from "node:worker_threads";
import { join } from "node:path";
import type { JsonObject } from "nexusrbx-local-connector";
export class WorkspaceHost {
  private worker: Worker | null = null;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private sequence = 0;
  private boot: Promise<void> | null = null;
  accountId: string | null = null;
  constructor(private directory: string, private apiUrl: string, private getSession: () => Promise<JsonObject>, private changed: () => void) {}
  async start(accountId: string) {
    if (this.worker && this.accountId === accountId) return this.boot;
    await this.close(); this.accountId = accountId;
    const worker = new Worker(join(import.meta.dirname, "workspace-worker.js"), { workerData: { accountId, directory: this.directory, apiUrl: this.apiUrl } });
    this.worker = worker;
    this.boot = new Promise((resolve, reject) => {
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("The local runtime exited before becoming ready.")));
      worker.on("message", message => {
        if (message.event === "ready") resolve();
        if (message.event === "changed") this.changed();
        if (message.event === "session-needed") void this.getSession().then(value => worker.postMessage({ type: "session", value }), error => worker.postMessage({ type: "session-error", error: error.message }));
        const pending = this.pending.get(message.id);
        if (pending) { this.pending.delete(message.id); if (message.error) pending.reject(new Error(message.error)); else pending.resolve(message.value); }
      });
    });
    worker.on("error", error => { for (const pending of this.pending.values()) pending.reject(error); this.pending.clear(); });
    worker.on("exit", () => {
      if (this.worker === worker) { this.worker = null; this.accountId = null; }
      for (const pending of this.pending.values()) pending.reject(new Error("Local runtime stopped. Reopen the workspace to recover your history."));
      this.pending.clear(); this.changed();
    });
    return this.boot;
  }
  async call(method: string, ...args: unknown[]): Promise<any> {
    if (!this.worker) throw new Error("Open the workspace and sign in first.");
    await this.boot;
    return new Promise((resolve, reject) => { const id = ++this.sequence; this.pending.set(id, { resolve, reject }); this.worker!.postMessage({ id, method, args }); });
  }
  async close() {
    if (!this.worker) return;
    const worker = this.worker;
    await this.call("close").catch(() => undefined); await worker.terminate();
    if (this.worker === worker) this.worker = null;
    this.accountId = null;
  }
}
