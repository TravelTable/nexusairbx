import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { buildPublicMetadata, organizationStructuredData } from "../../src/lib/seo";
import { APPEARANCE_BOOTSTRAP_SCRIPT } from "../../src/lib/appearanceTheme";

export const metadata = {
  ...buildPublicMetadata({
    title: "NexusRBX — Build, Playtest & Grow Roblox Games",
    description: "Turn a Roblox game idea into a reviewable plan, Studio changes, verified playtests, and a path to publishing with NexusRBX.",
    path: "/",
  }),
  icons: {
    icon: "/nexus-mark.svg",
    shortcut: "/nexus-mark.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0b0b0c" />
        <Script id="nexusrbx-appearance" strategy="beforeInteractive">
          {APPEARANCE_BOOTSTRAP_SCRIPT}
        </Script>
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
