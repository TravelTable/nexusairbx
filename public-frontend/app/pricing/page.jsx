import catalog from "../../../src/data/billingCatalog.v2.json";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";
import { buildPublicMetadata, canonicalUrl } from "../../../src/lib/seo";
import PricingCatalog from "../../components/PricingCatalog";
import PublicHeader from "../../components/PublicHeader";

export const metadata = buildPublicMetadata({
  title: "NexusRBX Pricing | Roblox AI Building Plans",
  description:
    "Build with NexusRBX from $2/month. Compare Starter and Pro for project-aware Roblox generation, reviewable Studio changes, usage allowances, and build history.",
  path: "/pricing",
});

const selectablePlans = catalog.plans.filter(
  (plan) => plan.selectable !== false
);

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NexusRBX",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: canonicalUrl("/pricing"),
  offers: selectablePlans.map((plan) => ({
    "@type": "Offer",
    name: `${plan.name} monthly`,
    price: plan.monthly,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: canonicalUrl("/pricing"),
  })),
};

export default function PricingPage() {
  return (
    <div className="bg-[var(--nx-canvas)] text-[var(--nx-text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingStructuredData).replace(/</g, "\\u003c"),
        }}
      />
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
