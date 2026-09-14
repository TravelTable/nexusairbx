import {
  isLocalDevToolsHost,
  MOCK_RUNS_ENABLED_KEY,
  readMockRunsEnabled,
  writeMockRunsEnabled,
} from "./localDevTools";

test("local dev tools only on loopback hosts", () => {
  expect(isLocalDevToolsHost({ hostname: "localhost" })).toBe(true);
  expect(isLocalDevToolsHost({ hostname: "127.0.0.1" })).toBe(true);
  expect(isLocalDevToolsHost({ hostname: "nexusrbx.com" })).toBe(false);
  expect(isLocalDevToolsHost(null)).toBe(false);
});

test("mock runs enabled flag persists through localStorage", () => {
  const storage = {
    data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
    removeItem(key) {
      delete this.data[key];
    },
  };
  expect(readMockRunsEnabled(storage)).toBe(false);
  writeMockRunsEnabled(true, storage);
  expect(storage.data[MOCK_RUNS_ENABLED_KEY]).toBe("1");
  expect(readMockRunsEnabled(storage)).toBe(true);
  writeMockRunsEnabled(false, storage);
  expect(readMockRunsEnabled(storage)).toBe(false);
});
