const path = require("node:path");

const LOCAL_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000").replace(/\/+$/, "");
const LOCAL_APP_REDIRECTS = [
  "/ai",
  "/assets",
  "/icons-market",
  "/signin",
  "/signup",
  "/settings",
  "/billing",
  "/subscribe",
  "/support",
  "/contact",
  "/onboarding",
  "/connect-roblox",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  env: {
    PRERENDER_ICON_LIMIT: process.env.PRERENDER_ICON_LIMIT || "150",
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    externalDir: true,
  },
};

if (process.env.NODE_ENV === "development") {
  nextConfig.redirects = async () =>
    LOCAL_APP_REDIRECTS.flatMap((source) => [
      { source, destination: `${LOCAL_APP_ORIGIN}${source}`, permanent: false },
      { source: `${source}/:path*`, destination: `${LOCAL_APP_ORIGIN}${source}/:path*`, permanent: false },
    ]);
}

module.exports = nextConfig;
