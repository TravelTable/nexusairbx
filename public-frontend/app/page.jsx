import PublicHeader from "../components/PublicHeader";
import HomePrompt from "../components/HomePrompt";
import StructuredData from "../components/StructuredData";
import {
  buildPublicMetadata,
  softwareApplicationStructuredData,
} from "../../src/lib/seo";

export const metadata = buildPublicMetadata({
  title: "NexusRBX - AI Roblox Script Generator",
  description: "Generate focused Luau scripts, Roblox UI, and Studio-ready workflows for Roblox Studio with NexusRBX.",
  path: "/",
});

const socialProof = ["J", "M", "R", "A"];

const features = [
  {
    title: "AI UI Builder",
    body: "Generate polished Roblox interfaces with hierarchy, placement notes, and Studio-ready setup steps.",
  },
  {
    title: "Premium workflow",
    body: "Move from Quick Script into larger Agent Build plans when the project needs multiple scripts or Studio coordination.",
  },
  {
    title: "Smart scripting",
    body: "Write complex Luau game logic with script type, placement, setup, test steps, warnings, and follow-up edits.",
  },
];

const toolCards = [
  {
    title: "Pro-Grade UI Engine",
    body: "Create production-ready ScreenGui hierarchies, HUD flows, menu systems, and responsive LocalScript behavior.",
  },
  {
    title: "Deep Luau Integration",
    body: "Generate ServerScriptService, StarterPlayerScripts, ModuleScript, and CollectionService patterns with typed Luau guidance.",
  },
  {
    title: "Nexus Neural Core",
    body: "Route focused requests to Quick Script and expand into agent mode only when a build needs planning depth.",
  },
  {
    title: "Studio-Ready Workflow",
    body: "Keep every answer grounded in Roblox Studio placement, install notes, testing steps, and practical follow-through.",
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
    <div className="page-shell home-page-shell">
      <PublicHeader />
      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="section-inner home-hero-inner">
            <aside className="home-floating-tool home-floating-tool-left" aria-hidden="true">
              <span className="home-tool-icon">UI</span>
              <strong>Interface Builder</strong>
              <p>HUDs, shops, menus, and responsive GUI scripts.</p>
            </aside>

            <aside className="home-floating-tool home-floating-tool-right" aria-hidden="true">
              <span className="home-tool-icon">Lua</span>
              <strong>Luau Scripting</strong>
              <p>Server, client, and module patterns for Roblox Studio.</p>
            </aside>

            <div className="home-hero-copyblock">
              <span className="eyebrow">AI Roblox builder</span>
              <h1 id="home-title">
                The Ultimate AI UI Builder <span className="gradient-text">& Script Generator</span>
              </h1>
              <p className="home-hero-copy">
                Design stunning interfaces and complex game logic without starting from a blank editor. NexusRBX turns a single Roblox idea into focused code, setup guidance, and testing steps.
              </p>
              <div className="home-social-proof" aria-label="Creator trust signal">
                <div className="home-avatar-stack" aria-hidden="true">
                  {socialProof.map((letter) => (
                    <span key={letter}>{letter}</span>
                  ))}
                </div>
                <span>Trusted by builders moving faster in Roblox Studio.</span>
              </div>
            </div>

            <div className="home-preview-wrap">
              <img
                src="/ai-preview.png"
                alt="NexusRBX AI workspace preview with generated Roblox scripts and UI output"
                width="1600"
                height="900"
                loading="eager"
              />
            </div>

            <HomePrompt />
            <p className="prompt-mode-note home-prompt-note">
              Describe the script or UI. NexusRBX preserves the prompt and opens the AI workspace with a generation intent.
            </p>

            <div className="home-cta-row" aria-label="Primary public actions">
              <a className="button button-primary" href="/ai">Open AI workspace</a>
              <a className="button button-secondary" href="/docs">Read Studio docs</a>
            </div>
          </div>
        </section>

        <section className="section-band home-tools-band">
          <div className="section-inner">
            <h2>
              Powerful AI Tools for Roblox Creators
            </h2>
            <p className="section-copy">
              Build at the speed of thought with AI assistance tuned for Roblox Studio, Luau, interface behavior, and creator workflows.
            </p>
            <div className="feature-grid home-feature-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-band home-creator-band">
          <div className="section-inner">
            <h2>Everything stays Roblox-native from the first prompt.</h2>
            <div className="tool-grid">
              {toolCards.map((card) => (
                <article className="tool-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-band home-guide-band">
          <div className="section-inner">
            <h2>Choose the public guide that matches your intent.</h2>
            <div className="feature-grid">
              {searchGuides.map((guide) => (
                <article className="feature-card" key={guide.href}>
                  <h3><a className="feature-card-link" href={guide.href}>{guide.label}</a></h3>
                  <p>{guide.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <a className="brand-mark" href="/" aria-label="NexusRBX home">
            <span className="brand-bolt" aria-hidden="true">N</span>
            <span>NexusRBX</span>
          </a>
          <nav aria-label="Footer navigation">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/contact">Contact</a>
            <a href="/docs">Docs</a>
          </nav>
        </div>
      </footer>
      <StructuredData data={softwareApplicationStructuredData()} />
    </div>
  );
}
