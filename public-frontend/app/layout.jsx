import { Analytics } from "@vercel/analytics/react";
import "@fontsource-variable/sofia-sans-condensed/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-mono/wght.css";
import "./globals.css";
import "../../src/design/nexus-foundation.css";
import "../../src/design/nexus-primitives.css";
import "../../src/design/nexus-motion.css";
import { buildPublicMetadata, organizationStructuredData } from "../../src/lib/seo";

export const metadata = {
  ...buildPublicMetadata({
    title: "NexusRBX — Build, Playtest & Grow Roblox Games",
    description: "Turn a Roblox game idea into a reviewable plan, Studio changes, verified playtests, and a path to publishing with NexusRBX.",
    path: "/",
  }),
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "64x64" }],
    shortcut: "/favicon.png",
    apple: "/logo192.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData()).replace(/</g, "\\u003c"),
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
