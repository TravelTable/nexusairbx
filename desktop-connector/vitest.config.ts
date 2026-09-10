import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from './vite.config';

export default mergeConfig(sharedConfig, defineConfig({
  root: import.meta.dirname,
  test: {
    environment: "jsdom",
    include: ["src/renderer/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/renderer/test-setup.ts"],
  },
}));
