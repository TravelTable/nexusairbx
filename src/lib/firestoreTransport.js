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
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    };
  }
  return { experimentalAutoDetectLongPolling: true };
}
