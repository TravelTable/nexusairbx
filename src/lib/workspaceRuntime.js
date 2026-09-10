// Shared UI transport. Desktop never receives an authentication token or a URL
// fetch primitive; the local worker validates every service operation.
export function desktopWorkspace() {
  return typeof window !== "undefined" ? window.nexusWorkspace || null : null;
}

export async function desktopRequest(path, init = {}) {
  const api = desktopWorkspace();
  if (!api) throw new Error("The desktop runtime is unavailable.");
  if (init.signal?.aborted) throw init.signal.reason;
  const key = new Headers(init.headers).get('Idempotency-Key');
  const result = await api.request({ path: String(path), method: init.method || "GET", ...(init.body === undefined ? {} : { body: init.body }), ...(key ? { idempotencyKey: key } : {}) });
  if (init.signal?.aborted) throw init.signal.reason;
  return new Response(result.body, { status: result.status, headers: result.headers });
}

export async function openAccountLink(url) {
  if (desktopWorkspace()) return desktopWorkspace().openExternal(url);
  window.location.assign(url);
}
