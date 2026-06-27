import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { buildPublicMetadata, organizationStructuredData } from "../../src/lib/seo";

export const metadata = buildPublicMetadata({
  title: "NexusRBX - AI Roblox Script Generator",
  description: "Generate focused Luau scripts, Roblox UI, and Studio-ready workflows with NexusRBX.",
  path: "/",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData()) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
