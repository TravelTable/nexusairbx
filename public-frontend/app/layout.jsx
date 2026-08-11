import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { buildPublicMetadata, organizationStructuredData } from "../../src/lib/seo";
import { APPEARANCE_BOOTSTRAP_SCRIPT } from "../../src/lib/appearanceTheme";

export const metadata = buildPublicMetadata({
  title: "NexusRBX - AI Roblox Script Generator",
  description: "Generate focused Luau scripts, Roblox UI, and Studio-ready workflows with NexusRBX.",
  path: "/",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#050507" />
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
