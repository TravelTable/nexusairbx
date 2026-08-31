describe("backend URL configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBackendUrl = process.env.REACT_APP_BACKEND_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalBackendUrl === undefined) {
      delete process.env.REACT_APP_BACKEND_URL;
    } else {
      process.env.REACT_APP_BACKEND_URL = originalBackendUrl;
    }
  });

  test("uses the local backend by default in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.REACT_APP_BACKEND_URL;

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("http://localhost:5001");
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
    process.env.REACT_APP_BACKEND_URL = "http://localhost:7777";

    jest.isolateModules(() => {
      expect(require("./config").BACKEND_URL).toBe("http://localhost:7777");
    });
  });
});
