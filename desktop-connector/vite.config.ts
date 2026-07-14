import { readFile } from "node:fs/promises";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

function officialLogo(): Plugin {
  const logoPath = resolve(import.meta.dirname, "../public/logo.png");

  return {
    name: "nexusrbx-official-logo",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname !== "/logo.png") {
          next();
          return;
        }

        try {
          response.statusCode = 200;
          response.setHeader("Content-Type", "image/png");
          response.setHeader("Cache-Control", "no-store");
          response.end(await readFile(logoPath));
        } catch (error) {
          next(error as Error);
        }
      });
    },
    async generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "logo.png",
        source: await readFile(logoPath),
      });
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, "src/renderer"),
  base: "./",
  plugins: [officialLogo(), react()],
  build: {
    outDir: resolve(import.meta.dirname, "dist/renderer"),
    emptyOutDir: true,
  },
});
