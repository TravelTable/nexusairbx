export interface StoredConnectorSession {
  token: string;
  sessionId: string;
  userId: string;
  pollIntervalMs: number;
  expiresInMs: number;
}

export interface EncryptedStorage {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  read(): Promise<Buffer | null>;
  write(value: Buffer): Promise<void>;
  remove(): Promise<void>;
}

/** Pairing codes are intentionally absent from this persisted shape. */
export class EncryptedTokenStore {
  constructor(private readonly storage: EncryptedStorage) {}

  async load(): Promise<StoredConnectorSession | null> {
    if (!this.storage.isEncryptionAvailable()) return null;
    const encrypted = await this.storage.read();
    if (!encrypted) return null;
    try {
      return validate(JSON.parse(this.storage.decryptString(encrypted)));
    } catch {
      await this.clear();
      return null;
    }
  }

  async save(session: StoredConnectorSession): Promise<void> {
    if (!this.storage.isEncryptionAvailable()) throw new Error("OS encrypted storage is unavailable.");
    await this.storage.write(this.storage.encryptString(JSON.stringify(validate(session))));
  }

  clear(): Promise<void> { return this.storage.remove(); }
}

function validate(value: unknown): StoredConnectorSession {
  if (!value || typeof value !== "object") throw new Error("Saved connector session is malformed.");
  const session = value as Record<string, unknown>;
  if (typeof session.token !== "string" || !/^nsmcp_[A-Za-z0-9_-]+_[A-Za-z0-9._~-]+$/.test(session.token)) throw new Error("Saved token is malformed.");
  if (typeof session.sessionId !== "string" || typeof session.userId !== "string") throw new Error("Saved session is malformed.");
  if (!Number.isInteger(session.pollIntervalMs) || !Number.isInteger(session.expiresInMs)) throw new Error("Saved session is malformed.");
  return { token: session.token, sessionId: session.sessionId, userId: session.userId, pollIntervalMs: Number(session.pollIntervalMs), expiresInMs: Number(session.expiresInMs) };
}
