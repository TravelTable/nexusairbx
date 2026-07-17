import { getFirestoreTransportOptions, isSafariWebKit } from "./firestoreTransport";

describe("firestoreTransport", () => {
  it("forces long polling for Safari WebKit", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
    expect(isSafariWebKit(userAgent)).toBe(true);
    expect(getFirestoreTransportOptions({ userAgent })).toEqual({
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
  });

  it("keeps automatic transport selection for Chromium", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36";
    expect(isSafariWebKit(userAgent)).toBe(false);
    expect(getFirestoreTransportOptions({ userAgent })).toEqual({
      experimentalAutoDetectLongPolling: true,
    });
  });
});
