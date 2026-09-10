let identity = null;
const listeners = new Set();
export const auth = { get currentUser() { return identity; } };
export function setDesktopIdentity(value) {
  if ((identity?.uid || null) === (value?.uid || null) && identity?.email === value?.email) return;
  identity = value?.uid ? { ...value, emailVerified: true, getIdToken() { throw new Error('Desktop credentials stay in the local worker. Use the desktop service API.'); } } : null;
  for (const listener of listeners) listener(identity);
}
export function getAuth() { return auth; }
export function onAuthStateChanged(_auth, listener) {
  listeners.add(listener); queueMicrotask(() => { if (listeners.has(listener)) listener(identity); });
  return () => listeners.delete(listener);
}
export async function signOut() {
  await window.nexusConnector.revokeSession(); setDesktopIdentity(null);
}
