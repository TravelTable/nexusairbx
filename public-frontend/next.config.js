/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  allowedDevOrigins: ["127.0.0.1"],
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

module.exports = nextConfig;
