import HomepageFeatures from "./HomepageFeatures";
import HomepageFooter from "./HomepageFooter";
import HomepageHero from "./HomepageHero";
import HomepageTestimonial from "./HomepageTestimonial";
import HomepageWorkflow from "./HomepageWorkflow";

export default function HomepageLanding({
  surface = "homepage",
  navigateToAi,
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#07090f] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(0,245,212,0.12),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(56,85,246,0.16),transparent_34%),linear-gradient(180deg,#07090f_0%,#0c0f17_44%,#07090f_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <main aria-label="Homepage">
        <HomepageHero surface={surface} navigateToAi={navigateToAi} />
        <HomepageFeatures />
        <HomepageWorkflow />
        <HomepageTestimonial />
      </main>
      <HomepageFooter />
    </div>
  );
}
