import { buildPublicMetadata } from "../../../src/lib/seo";
import PricingCatalog from "../../components/PricingCatalog";
import PublicHeader from "../../components/PublicHeader";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";

export const metadata = buildPublicMetadata({
  title: "NexusRBX Pricing | Build Your Roblox Game",
  description: "Compare NexusRBX plans for planning, building, and reviewing Roblox game ideas, with exact monthly, yearly, and Team billing details.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--nx-canvas)] text-[var(--nx-text)]">
      <a
        className="sr-only z-[60] min-h-11 items-center bg-[var(--nx-text)] px-4 py-2 text-sm font-semibold text-[var(--nx-canvas)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex"
        href="#main-content"
      >
        Skip to pricing
      </a>
      <PublicHeader />
      <PricingCatalog />
      <HomepageFooter />
    </div>
  );
}
