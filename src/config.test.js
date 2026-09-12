describe("backend URL configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBackendUrl = process.env.REACT_APP_BACKEND_URL;
  const originalHostname = window.location.hostname;

  afterEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalBackendUrl === undefined) {
      delete process.env.REACT_APP_BACKEND_URL;
    } else {
      process.env.REACT_APP_BACKEND_URL = originalBackendUrl;
    }
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: originalHostname },
    });
  });

  test("uses the local backend by default in development on loopback", () => {
    process.env.NODE_ENV = "development";
    delete process.env.REACT_APP_BACKEND_URL;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: "localhost" },
    });

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("http://localhost:5001");
    });
  });

  test("does not send a public-hostname development build to localhost", () => {
    process.env.NODE_ENV = "development";
    delete process.env.REACT_APP_BACKEND_URL;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: "www.nexusrbx.com" },
    });

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("https://api.nexusrbx.com");
    });
  });

  test("uses the production backend by default outside development", () => {
    process.env.NODE_ENV = "production";
    delete process.env.REACT_APP_BACKEND_URL;

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("https://api.nexusrbx.com");
    });
  });

  test("honors an explicit backend URL", () => {
    process.env.NODE_ENV = "development";
    process.env.REACT_APP_BACKEND_URL = "http://localhost:7777/";

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("http://localhost:7777");
    });
  });
});
