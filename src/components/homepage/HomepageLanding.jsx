import HomepageFeatures from "./HomepageFeatures";
import HomepageFooter from "./HomepageFooter";
import HomepageHero from "./HomepageHero";
import HomepageIntentEvidence from "./HomepageIntentEvidence";
import HomepageWorkflow from "./HomepageWorkflow";

export default function HomepageLanding({
  surface = "homepage",
  navigateToAi,
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--ds-bg-canvas)] pt-16 text-[var(--ds-text)]">
      <main aria-label="Homepage">
        <HomepageHero surface={surface} navigateToAi={navigateToAi} />
        <HomepageFeatures />
        <HomepageWorkflow />
        <HomepageIntentEvidence />
      </main>
      <HomepageFooter />
    </div>
  );
}
