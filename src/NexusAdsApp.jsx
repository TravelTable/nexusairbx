import React from "react";
import "./NexusAdsApp.css";

const flowSteps = [
  {
    title: "Paste a URL",
    description: "Auto-detect the key pages and capture the strongest sections.",
  },
  {
    title: "Pick highlights",
    description: "Keep or exclude frames like pricing, testimonials, or blog.",
  },
  {
    title: "Confirm the brief",
    description: "Audience, offer, constraints, and tone shape the outputs.",
  },
  {
    title: "Generate 20 assets",
    description: "Text ads, banners, and optional short video in platform sizes.",
  },
  {
    title: "Edit and export",
    description: "Polish the winners, then download a ready-to-run pack.",
  },
];

const mvpFeatures = [
  {
    title: "URL capture and selection",
    label: "Capture",
    bullets: [
      "Detect Home, Features, Pricing, Testimonials, Contact",
      "Best hero screenshot + 5 to 12 section frames (desktop + mobile)",
      "Popup and cookie close heuristics",
      "Page selector to exclude sections",
    ],
  },
  {
    title: "Brand kit extraction",
    label: "Brand",
    bullets: [
      "Auto-detect logo, primary and secondary colors",
      "Font guess with local fallback suggestions",
      "Upload override for logos, colors, fonts",
      "Do and do-not examples to keep the vibe",
    ],
  },
  {
    title: "Marketing brief builder",
    label: "Brief",
    bullets: [
      "Audience, offer, key benefit, location, CTA",
      "Constraints like do not say best or do not mention price",
      "Auto-extracted value props with user edits",
      "Angles: problem-solution, feature-led, proof, urgency, founder",
    ],
  },
  {
    title: "Real ad formats",
    label: "Formats",
    bullets: [
      "Multiple headline and description sets",
      "Static banners in 1:1, 4:5, 9:16, 1200x628",
      "Optional 6 to 15 second video template with captions",
      "Platform-native variations per channel",
    ],
  },
  {
    title: "Editor that ships",
    label: "Edit",
    bullets: [
      "Inline copy edits with regenerate per line",
      "Swap background frames or CTA in one click",
      "Safe area controls for vertical placements",
      "Make it more platform-native toggles",
    ],
  },
  {
    title: "Export pack",
    label: "Export",
    bullets: [
      "One-click ZIP with creatives and copy",
      "Placement recommendations and naming",
      "Campaign pack summary with top 3 concepts",
      "Lightweight targeting ideas",
    ],
  },
];

const guardrails = [
  {
    title: "Claims checker",
    description:
      "Flags unverifiable superlatives, medical or financial promises, and before-after language.",
  },
  {
    title: "Sensitive category detection",
    description:
      "Health, finance, dating, and gambling routes to stricter templates or blocks.",
  },
  {
    title: "Trademark warnings",
    description:
      "Highlights brand usage risk when the intent is not clearly owned.",
  },
];

const qualityBoost = [
  {
    title: "Pick my top 5",
    description: "Ranked by clarity, specificity, CTA strength, and hook speed.",
  },
  {
    title: "Generate 30, then rank",
    description: "Diversity scoring prevents near-duplicate outputs.",
  },
];

const consistency = [
  "Projects with version history",
  "Saved brand kits per client",
  "Re-run generation when the site changes",
];

const roadmap = [
  "Direct publishing to Meta, Google Ads, TikTok, and YouTube",
  "Performance feedback loop and auto-iteration",
  "Multi-page scripted recordings (click paths)",
  "Collaboration with approvals and roles",
];

const toneOptions = [
  "Serious",
  "Playful",
  "Premium",
  "Minimalist",
  "SaaS",
  "Ecom",
  "Local",
];

const formatChips = ["1:1", "4:5", "9:16", "1200x628", "6-15s video"];

function NexusAdsApp() {
  return (
    <div className="nexusads-app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-name">NexusAds</span>
        </div>
        <nav className="nav-links">
          <a href="#flow">Flow</a>
          <a href="#features">MVP</a>
          <a href="#guardrails">Guardrails</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
        <button className="ghost-button" type="button" aria-label="Start with a URL">
          Start with a URL
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Paste a URL. Ship ads today.</p>
            <h1>
              Turn any website into ready-to-run ad assets without generic,
              lowest-common-denominator creative.
            </h1>
            <p className="subhead">
              NexusAds captures the best sections, builds a real brief, and
              outputs ads that look like your brand and follow platform rules.
            </p>
            <div className="cta-row">
              <div className="url-input">
                <span>https://</span>
                <input
                  type="text"
                  placeholder="yourcompany.com"
                  aria-label="Website URL"
                  autoComplete="url"
                />
              </div>
              <button className="primary-button" type="button" aria-label="Generate my ads">
                Generate my ads
              </button>
            </div>
            <div className="tone-row">
              <span className="tone-label">Tone controls</span>
              <div className="tone-chips">
                {toneOptions.map((tone) => (
                  <span className="chip" key={tone}>
                    {tone}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-card panel-primary">
              <p className="panel-title">Ad pack preview</p>
              <div className="panel-line"></div>
              <div className="panel-metric">
                <span>Assets</span>
                <strong>22 ready-to-run</strong>
              </div>
              <div className="panel-metric">
                <span>Concepts</span>
                <strong>5 distinct angles</strong>
              </div>
              <div className="panel-metric">
                <span>Brand match</span>
                <strong>Logo, colors, fonts applied</strong>
              </div>
            </div>
            <div className="panel-card panel-secondary">
              <p className="panel-title">Detected highlights</p>
              <ul>
                <li>Hero value prop</li>
                <li>Key feature grid</li>
                <li>Top testimonial</li>
                <li>Pricing clarity</li>
              </ul>
            </div>
            <div className="panel-card panel-tertiary">
              <p className="panel-title">Formats</p>
              <div className="chip-row">
                {formatChips.map((chip) => (
                  <span className="chip chip-dark" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flow" id="flow">
          <div className="section-head">
            <h2>Make the flow feel human, not magic.</h2>
            <p>
              URL to highlight selection to brief confirmation to real outputs
              you would actually run.
            </p>
          </div>
          <div className="flow-grid">
            {flowSteps.map((step, index) => (
              <div className="flow-card" key={step.title}>
                <span className="flow-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-head">
            <h2>Must-have MVP features</h2>
            <p>
              Everything needed to move from URL to ready-to-run ads in the same
              session.
            </p>
          </div>
          <div className="feature-grid">
            {mvpFeatures.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-label">{feature.label}</div>
                <h3>{feature.title}</h3>
                <ul>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="guardrails" id="guardrails">
          <div className="section-head">
            <h2>Quality and safety guardrails</h2>
            <p>
              Protect the brand, reduce review risk, and avoid claims that will
              get ads rejected.
            </p>
          </div>
          <div className="guardrail-grid">
            {guardrails.map((item) => (
              <div className="guardrail-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
          <div className="quality-row">
            {qualityBoost.map((item) => (
              <div className="quality-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="consistency">
          <div className="section-head">
            <h2>Consistency over time</h2>
            <p>
              Keep campaigns aligned and make regeneration painless when the
              site changes.
            </p>
          </div>
          <div className="consistency-list">
            {consistency.map((item) => (
              <div className="consistency-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="roadmap" id="roadmap">
          <div className="section-head">
            <h2>Roadmap, not day one</h2>
            <p>
              The power features that matter later, after the core flow is
              stable.
            </p>
          </div>
          <div className="roadmap-grid">
            {roadmap.map((item) => (
              <div className="roadmap-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="ux-decision">
          <div className="ux-card">
            <h2>The single most important UX decision</h2>
            <p>
              Make the path feel concrete: URL, pick highlights, confirm the
              offer and audience, generate 20 assets you would actually run,
              edit, then export.
            </p>
            <button className="primary-button" type="button" aria-label="Start the flow">
              Start the flow
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>NexusAds</strong>
          <span>Paste a URL, run ads today.</span>
        </div>
        <div className="footer-links">
          <span>Privacy-first capture</span>
          <span>Brand-safe outputs</span>
          <span>Export-ready packs</span>
        </div>
      </footer>
    </div>
  );
}

export default NexusAdsApp;
