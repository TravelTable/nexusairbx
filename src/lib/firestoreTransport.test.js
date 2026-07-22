import {
  getFirestoreTransportOptions,
  isSafariWebKit,
  shouldUsePersistentFirestoreCache,
} from "./firestoreTransport";

describe("firestoreTransport", () => {
  it("forces Safari onto long polling before streaming can stall", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
    expect(isSafariWebKit(userAgent)).toBe(true);
    expect(getFirestoreTransportOptions({ userAgent })).toEqual({
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
  });

  it("uses memory cache in Safari to avoid multi-tab IndexedDB stalls", () => {
    const navigatorObject = {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15",
    };

    expect(
      shouldUsePersistentFirestoreCache(navigatorObject, { indexedDB: {} })
    ).toBe(false);
  });

  it("keeps automatic transport selection for Chromium", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36";
    expect(isSafariWebKit(userAgent)).toBe(false);
    expect(getFirestoreTransportOptions({ userAgent })).toEqual({
      experimentalAutoDetectLongPolling: true,
    });
    expect(
      shouldUsePersistentFirestoreCache({ userAgent }, { indexedDB: {} })
    ).toBe(true);
  });

  it("does not request persistence when IndexedDB is unavailable", () => {
    expect(
      shouldUsePersistentFirestoreCache({ userAgent: "test" }, {})
    ).toBe(false);
  });
});
