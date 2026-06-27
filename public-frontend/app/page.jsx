import PublicHeader from "../components/PublicHeader";
import HomePrompt from "../components/HomePrompt";
import StructuredData from "../components/StructuredData";
import {
  buildPublicMetadata,
  canonicalUrl,
  softwareApplicationStructuredData,
} from "../../src/lib/seo";

export const metadata = buildPublicMetadata({
  title: "NexusRBX - AI Roblox Script Generator",
  description: "Generate focused Luau scripts, Roblox UI, and Studio-ready workflows for Roblox Studio with NexusRBX.",
  path: "/",
});

const features = [
  {
    title: "Quick Script first",
    body: "High-intent script prompts open a focused Luau generation path before expanding into larger agent workflows.",
  },
  {
    title: "Studio-aware systems",
    body: "When a build needs multiple files or plugin coordination, Agent Build can plan, inspect, and hand work to Studio.",
  },
  {
    title: "Roblox-native output",
    body: "Results explain script type, Studio placement, setup steps, test steps, warnings, and follow-up editing paths.",
  },
];

const searchGuides = [
  {
    href: "/roblox-script-generator",
    label: "Roblox Script Generator",
    body: "Focused Quick Script output for timers, triggers, shops, and gameplay logic.",
  },
  {
    href: "/roblox-ai-scripter",
    label: "Roblox AI Scripter",
    body: "Conversational debugging, rewrites, and iterative scripting help.",
  },
  {
    href: "/roblox-gui-maker",
    label: "Roblox GUI Maker",
    body: "GUI behavior, HUD updates, menu flow, and responsive UI scripting.",
  },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="section-inner">
            <span className="eyebrow">AI Roblox builder</span>
            <h1>
              Generate <span className="gradient-text">Luau scripts</span> and Roblox UI without a blank editor.
            </h1>
            <p className="hero-copy">
              NexusRBX turns a single Roblox idea into focused code, setup guidance, and testing steps. Start with Quick Script for immediate output, then expand into Agent Build when the project needs Studio workflows.
            </p>
            <HomePrompt />
            <p className="hero-copy" style={{ fontSize: 14, marginTop: 12 }}>
              Primary path: describe the script. NexusRBX will preserve the prompt and open the AI workspace with a generation intent.
            </p>
            <div className="supporting-grid" aria-label="NexusRBX product signals">
              <div className="metric-card">
                <div className="metric-value">1 prompt</div>
                <div className="metric-label">to useful Quick Script output</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">2 modes</div>
                <div className="metric-label">Quick Script and Agent Build</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">Studio</div>
                <div className="metric-label">placement and setup guidance included</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="section-inner">
            <h2>Built for Roblox creators moving from idea to working code.</h2>
            <div className="feature-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
            <p className="hero-copy" style={{ fontSize: 16 }}>
              Read the <a href="/docs" style={{ color: "#00f5d4", fontWeight: 800 }}>Studio bridge documentation</a> or open the authenticated workspace at <a href="/ai" style={{ color: "#00f5d4", fontWeight: 800 }}>{canonicalUrl("/ai")}</a>.
            </p>
          </div>
        </section>

        <section className="section-band">
          <div className="section-inner">
            <h2>Choose the public guide that matches your intent.</h2>
            <div className="feature-grid">
              {searchGuides.map((guide) => (
                <article className="feature-card" key={guide.href}>
                  <h3><a href={guide.href}>{guide.label}</a></h3>
                  <p>{guide.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <StructuredData data={softwareApplicationStructuredData()} />
    </div>
  );
}
