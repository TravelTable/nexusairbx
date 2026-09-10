import { readFile, readdir } from "node:fs/promises";
import { defineConfig, type Plugin, transformWithEsbuild } from "vite";
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
      this.emitFile({ type: 'asset', fileName: 'favicon.png', source: await readFile(resolve(import.meta.dirname, '../public/favicon.png')) });
      const providers = resolve(import.meta.dirname, '../public/assets/providers');
      for (const name of await readdir(providers)) if (name.endsWith('.svg')) this.emitFile({ type: 'asset', fileName: `assets/providers/${name}`, source: await readFile(resolve(providers, name)) });
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, "src/renderer"),
  base: "./",
  plugins: [
    { name: "shared-jsx", enforce: "pre", async transform(code, id) {
      if (!/\/src\/.*\.[jt]sx?$/.test(id.replaceAll('\\', '/'))) return;
      code = code.replace(/(["'])\/(assets\/[^"']*|favicon\.png|logo\.png)\1/g, '$1./$2$1');
      if (id.endsWith('.js') && /<[A-Za-z]/.test(code)) return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
      return code;
    } },
    officialLogo(), react(),
    { name: "desktop-cloud-boundary", generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/node_modules[\\/]@?firebase[\\/]|[\\/]src[\\/]firebase\.[jt]s$/.test(id)) throw new Error(`Desktop must not bundle Firebase: ${id}\nImported by: ${this.getModuleInfo(id)?.importers.join('\n')}`);
      }
    } },
  ],
  define: { "process.env": JSON.stringify({ NODE_ENV: "production", PUBLIC_URL: ".", REACT_APP_DESKTOP: "true" }) },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /(?:.*\/)?billing(?:\.js)?$/, replacement: resolve(import.meta.dirname, "src/renderer/platform/billing.js") },
      { find: /(?:.*\/)?productAnalytics(?:\.js)?$/, replacement: resolve(import.meta.dirname, "src/renderer/platform/analytics.js") },
      { find: /(?:.*\/)?SettingsContext(?:\.jsx)?$/, replacement: resolve(import.meta.dirname, "src/renderer/platform/SettingsContext.jsx") },
      { find: /(?:.*\/)?BillingContext(?:\.jsx)?$/, replacement: resolve(import.meta.dirname, "src/renderer/platform/BillingContext.jsx") },
      { find: 'firebase/auth', replacement: resolve(import.meta.dirname, '../src/desktop/identity.js') },
      { find: /(?:.*\/)?firebase(?:\.js)?$/, replacement: resolve(import.meta.dirname, 'src/renderer/platform/firebase.js') },
      { find: /^lib\//, replacement: resolve(import.meta.dirname, "../src/lib") + "/" },
      { find: /^components\//, replacement: resolve(import.meta.dirname, "../src/components") + "/" },
      { find: /^@\//, replacement: resolve(import.meta.dirname, "../src") + "/" },
    ],
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist/renderer"),
    emptyOutDir: true,
  },
});
