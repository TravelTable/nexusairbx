const PAIR_CODE = /^[A-Z0-9]{6}$/;

/** Canonical pairing-code contract shared by manual entry and deep links. */
export function normalizePairingCode(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("Pairing code must be text.");
  const code = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!PAIR_CODE.test(code)) throw new TypeError("Pairing code must contain six letters or numbers.");
  return code;
}

/** Accept only the exact deep-link shape issued by the NexusRBX pairing page. */
export function parsePairingDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "nexusrbx:" || url.hostname !== "connector" || url.pathname !== "/pair") return null;
    return normalizePairingCode(url.searchParams.get("code") || "");
  } catch {
    return null;
  }
}
