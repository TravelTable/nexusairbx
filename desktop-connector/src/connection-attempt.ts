export interface ConnectionAttemptContext {
  id: number;
  signal: AbortSignal;
}

export interface ConnectionAttempt extends ConnectionAttemptContext {
  completion: Promise<void>;
}

interface ActiveAttempt {
  attempt: ConnectionAttempt;
  controller: AbortController;
}

/** Owns exactly one connector runtime and waits for it to finish before replacement. */
export class ConnectionAttemptCoordinator {
  #active: ActiveAttempt | null = null;
  #nextId = 0;

  get active(): ConnectionAttempt | null { return this.#active?.attempt ?? null; }

  isCurrent(id: number): boolean { return this.#active?.attempt.id === id; }

  start(run: (context: ConnectionAttemptContext) => Promise<void>): ConnectionAttempt {
    if (this.#active) throw new Error("A connector connection attempt is already active.");
    const controller = new AbortController();
    const id = ++this.#nextId;
    let resolveCompletion!: () => void;
    let rejectCompletion!: (error: unknown) => void;
    const completion = new Promise<void>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    const attempt = { id, signal: controller.signal, completion };
    const active = { attempt, controller };
    // Register ownership before the runner can synchronously emit lifecycle
    // events, then start it immediately so an immediate stop cannot miss abort.
    this.#active = active;
    try {
      void run({ id, signal: controller.signal }).then(resolveCompletion, rejectCompletion);
    } catch (error) {
      rejectCompletion(error);
    }
    void completion.then(
      () => { if (this.#active === active) this.#active = null; },
      () => { if (this.#active === active) this.#active = null; },
    );
    return attempt;
  }

  async stop(reason = new DOMException("Connector stopped", "AbortError")): Promise<void> {
    const active = this.#active;
    if (!active) return;
    active.controller.abort(reason);
    try { await active.attempt.completion; } catch { /* shutdown was requested */ }
    if (this.#active === active) this.#active = null;
  }
}
