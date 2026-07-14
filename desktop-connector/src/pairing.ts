const PAIR_CODE = /^[A-Z0-9-]{4,32}$/;

/** Accept only the exact deep-link shape issued by the NexusRBX pairing page. */
export function parsePairingDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "nexusrbx:" || url.hostname !== "connector" || url.pathname !== "/pair") return null;
    const code = (url.searchParams.get("code") || "").trim().toUpperCase();
    return PAIR_CODE.test(code) ? code : null;
  } catch {
    return null;
  }
}
