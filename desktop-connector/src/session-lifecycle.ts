const TERMINAL_SESSION_CODES = new Set([
  "CONNECTOR_AUTH_FAILED",
  "CONNECTOR_NOT_PAIRED",
  "CONNECTOR_TOKEN_INVALID",
]);

export function isTerminalSessionError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  return TERMINAL_SESSION_CODES.has(code);
}

type ResetLocalSessionOptions = {
  revokeRemote?: () => Promise<void>;
  stopLocal: () => Promise<void>;
  clearLocal: () => Promise<void>;
};

/**
 * Remote revocation is best effort: the server may already have removed the
 * session. Local shutdown and credential removal must still always happen.
 */
export async function resetLocalSession({
  revokeRemote,
  stopLocal,
  clearLocal,
}: ResetLocalSessionOptions): Promise<unknown | null> {
  let remoteError: unknown | null = null;
  try {
    await revokeRemote?.();
  } catch (error) {
    remoteError = error;
  }

  try {
    await stopLocal();
  } finally {
    await clearLocal();
  }
  return remoteError;
}
