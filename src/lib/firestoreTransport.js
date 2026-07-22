export function isSafariWebKit(userAgent = "") {
  const value = String(userAgent || "");
  return /AppleWebKit/i.test(value) && /Safari/i.test(value) &&
    !/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS)/i.test(value);
}

export function getFirestoreTransportOptions(
  navigatorObject = typeof navigator !== "undefined" ? navigator : undefined
) {
  if (isSafariWebKit(navigatorObject?.userAgent)) {
    return {
      // Safari can reject or silently stall Firestore's streaming channel
      // before automatic detection has a response to inspect. Force the
      // compatibility transport so listeners can start deterministically.
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    };
  }
  return { experimentalAutoDetectLongPolling: true };
}

export function shouldUsePersistentFirestoreCache(
  navigatorObject = typeof navigator !== "undefined" ? navigator : undefined,
  windowObject = typeof window !== "undefined" ? window : undefined
) {
  return Boolean(
    windowObject &&
      typeof windowObject.indexedDB !== "undefined" &&
      !isSafariWebKit(navigatorObject?.userAgent)
  );
}
