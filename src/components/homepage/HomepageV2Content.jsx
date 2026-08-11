"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  Blocks,
  Bot,
  Code,
  Download,
  FolderOpen,
  Gamepad2,
  Library,
  Lock,
  SearchCheck,
  ShieldCheck,
  WandSparkles,
} from "../../lib/icons";
import { trackProductEvent } from "../../lib/productAnalytics";
import { homepageFeatures, homepageWorkflow } from "../../content/homepageLanding";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import RobloxTrustStrip from "./RobloxTrustStrip";
import styles from "./HomepageCinematic.module.css";

const STORY_CARDS = [
  {
    eyebrow: "From prompt to plan",
    title: "Describe the result. NexusRBX maps the build.",
    description: homepageFeatures[0].description,
    visual: "prompt",
  },
  {
    eyebrow: "Reviewable by default",
    title: "See the files, code, and Studio destination before you ship.",
    description: homepageFeatures[1].description,
    visual: "review",
  },
  {
    eyebrow: "Studio-aware handoff",
    title: "Move from a clear plan to coordinated Roblox changes.",
    description:
      "The Studio agent keeps scripts, services, and generated assets organized while you stay in control of every write.",
    visual: "studio",
  },
];

const CAPABILITIES = [
  {
    href: "/roblox-script-generator",
    title: "AI-Powered Code Generation",
    description: homepageFeatures[0].description,
    icon: WandSparkles,
  },
  {
    href: "/roblox-ai-scripter",
    title: "Debugging and optimization",
    description: homepageFeatures[1].description,
    icon: SearchCheck,
  },
  {
    href: "/roblox-studio-script-generator",
    title: "Roblox API context",
    description: homepageFeatures[2].description,
    icon: Blocks,
  },
  {
    href: "/roblox-lua-script-generator",
    title: "Reusable project memory",
    description: homepageFeatures[3].description,
    icon: Library,
  },
  {
    href: "/roblox-gui-maker",
    title: "Multi-file Studio agent",
    description:
      "Plan coordinated changes across scripts, services, UI, and Studio locations without losing the thread.",
    icon: Bot,
  },
  {
    href: "/downloads",
    title: "Desktop connector",
    description:
      "Use the secure local companion for Studio MCP, automatic reconnects, and clear connection health.",
    icon: Gamepad2,
  },
];

function StoryVisual({ type }) {
  if (type === "review") {
    return (
      <div className={`${styles.storyVisual} ${styles.reviewVisual}`} aria-hidden="true">
        <div className={styles.productMock}>
          <div className={styles.productTopbar}>
            <span /><span /><span />
            <small>Round system</small>
          </div>
          <div className={styles.productBody}>
            <div className={styles.productTree}>
              <strong>Explorer</strong>
              <span>Workspace</span>
              <span className={styles.productTreeActive}>ServerScriptService</span>
              <span>RoundTimer.server.lua</span>
              <span>ReplicatedStorage</span>
              <span>StarterGui</span>
            </div>
            <div className={styles.productEditor}>
              <div className={styles.productTabs}>
                <span>RoundTimer.server.lua</span><em>Review ready</em>
              </div>
              <div className={styles.productCode}>
                <i>01</i><span><b>local</b> Players = game:GetService(<q>"Players"</q>)</span>
                <i>02</i><span><b>local</b> ROUND_SECONDS = <u>60</u></span>
                <i>03</i><span><b>local function</b> countdown(phase, duration)</span>
                <i>04</i><span>&nbsp;&nbsp;<b>for</b> remaining = duration, <u>0</u>, -1 <b>do</b></span>
                <i>05</i><span>&nbsp;&nbsp;&nbsp;&nbsp;timerEvent:FireAllClients(phase, remaining)</span>
                <i>06</i><span>&nbsp;&nbsp;&nbsp;&nbsp;task.wait(<u>1</u>)</span>
                <i>07</i><span>&nbsp;&nbsp;<b>end</b></span>
                <i>08</i><span><b>end</b></span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.reviewBadge}>
          <ShieldCheck size={17} />
          RoundTimer.server.lua reviewed
        </div>
      </div>
    );
  }

  if (type === "studio") {
    return (
      <div className={`${styles.storyVisual} ${styles.studioVisual}`} aria-hidden="true">
        <div className={styles.studioWindow}>
          <div className={styles.studioTopbar}>
            <span />
            <span />
            <span />
            <small>Studio plan</small>
          </div>
          <div className={styles.studioColumns}>
            <div className={styles.studioRail}>
              <span className={styles.studioRailActive}>Plan</span>
              <span>Files</span>
              <span>Test</span>
            </div>
            <div className={styles.studioSteps}>
              <div><b>01</b><span>Inspect project manifest</span><em>Done</em></div>
              <div><b>02</b><span>Create the round service</span><em>Ready</em></div>
              <div><b>03</b><span>Wire client timer UI</span><em>Ready</em></div>
              <div><b>04</b><span>Run Studio verification</span><em>Next</em></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.storyVisual} ${styles.promptVisual}`} aria-hidden="true">
      <div className={styles.previewPrompt}>
        <span className={styles.previewLogo}><img src="/logo.png" alt="" /></span>
        <span>Build a round system with intermission, rewards, and a responsive HUD.</span>
        <span className={styles.previewSend}><ArrowRight size={19} /></span>
      </div>
      <div className={styles.previewToolbar}>
        <span><Bot size={16} /> Agent Build</span>
        <span><FolderOpen size={16} /> 4 files</span>
        <span><Code size={16} /> Typed Luau</span>
      </div>
    </div>
  );
}

export default function HomepageV2Content({
  surface = "homepage",
  navigate,
  user,
  authReady,
}) {
  useEffect(() => {
    void trackProductEvent(
      "landing_page_view",
      { landing_page: "/", landing_page_category: "homepage" },
      { dedupeKey: "homepage" },
    );
  }, []);

  return (
    <div className={`nexus-cinematic-home ${styles.page}`}>
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="homepage-hero-heading">
        <picture className={styles.heroMedia}>
          <source
            media="(max-width: 767px)"
            srcSet="/assets/nexus-cinematic-hero-v2-960.webp"
            type="image/webp"
          />
          <img
            data-home-hero-image
            src="/assets/nexus-cinematic-hero-v2-1600.webp"
            alt=""
            aria-hidden="true"
            width="1600"
            height="901"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>NexusRBX for Roblox Studio</p>
          <h1 id="homepage-hero-heading">AI Roblox Script Generator for Studio</h1>
          <p className={styles.heroDescription}>
            Generate a focused Luau script from one prompt, or use the Studio agent to plan
            coordinated changes across multiple files and Roblox services.
          </p>

          <HomepagePrompt
            surface={surface}
            source={surface}
            navigateToAi={navigate}
            className={styles.heroPrompt}
          />

          <div className={styles.heroActions} aria-label="Get started">
            <a className={styles.primaryPill} href="/ai">
              Open AI workspace <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className={`${styles.secondaryPill} min-h-11`} href="/downloads">
              <Download size={16} aria-hidden="true" /> Get the desktop connector
            </a>
          </div>
        </div>
        </section>

        <section id="features" className={styles.story} aria-labelledby="feature-story-heading">
        <div className={styles.storyIntro}>
          <p>One build loop</p>
          <h2 id="feature-story-heading">From an idea to something you can inspect in Studio.</h2>
        </div>
        <div className={styles.storyList}>
          {STORY_CARDS.map((story) => (
            <article className={styles.storyCard} key={story.title} data-home-story-card>
              <div className={styles.storyCopy}>
                <p>{story.eyebrow}</p>
                <h3>{story.title}</h3>
                <span>{story.description}</span>
              </div>
              <StoryVisual type={story.visual} />
            </article>
          ))}
        </div>
        </section>

        <section id="workflow" className={styles.orchestration} aria-labelledby="workflow-heading">
        <div className={styles.orchestrationHeading}>
          <p>Model orchestration</p>
          <h2 id="workflow-heading">One request. The right workflow for every part of the build.</h2>
          <span>
            Nexus Auto coordinates planning, code, review, and Studio handoff so you can focus
            on the game rather than the plumbing.
          </span>
        </div>
        <div className={styles.orchestrationMap}>
          <div className={styles.orchestrationCore}>
            <img src="/logo.png" alt="" width="48" height="48" />
            <strong>Nexus Auto</strong>
            <small>Routes the work</small>
          </div>
          <div className={styles.workflowSteps}>
            {homepageWorkflow.map((step, index) => (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
        </section>

        <section className={styles.security} aria-labelledby="security-heading">
        <picture className={styles.securityMedia}>
          <source
            media="(max-width: 767px)"
            srcSet="/assets/nexus-cinematic-vault-v2-960.webp"
            type="image/webp"
          />
          <img
            data-home-vault-image
            src="/assets/nexus-cinematic-vault-v2-1600.webp"
            alt=""
            aria-hidden="true"
            width="1600"
            height="901"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className={styles.securityShade} aria-hidden="true" />
        <div className={styles.securityCopy}>
          <span><Lock size={18} aria-hidden="true" /> Secure by design</span>
          <h2 id="security-heading">Your game stays yours.</h2>
          <p>
            NexusRBX uses scoped authorization, reviewable Studio writes, and a local companion
            that keeps sensitive actions in your control.
          </p>
        </div>
        </section>

        <section id="capabilities" className={styles.capabilities} aria-labelledby="capabilities-heading">
        <div className={styles.capabilitiesHeading}>
          <p>Capabilities</p>
          <h2 id="capabilities-heading">Everything around the Roblox task in front of you.</h2>
        </div>
        <div className={styles.capabilityGrid}>
          {CAPABILITIES.map(({ href, title, description, icon: Icon }) => (
            <a href={href} key={title} data-home-capability>
              <Icon size={25} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
              <span>Explore <ArrowRight size={15} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
        </section>

        <section className={styles.shortcut} aria-labelledby="shortcut-heading">
        <div className={styles.shortcutGlyph} aria-hidden="true">
          <span>Prompt</span><ArrowRight size={18} /><span>Studio</span>
        </div>
        <h2 id="shortcut-heading">One prompt. Total build context.</h2>
        <p>Start with a quick script or open Agent Build for a coordinated Roblox project.</p>
        <div className={styles.shortcutActions}>
          <a className={styles.primaryPill} href="/ai">Start building <ArrowRight size={17} /></a>
          <a className={styles.secondaryDarkPill} href="/downloads">Download connector</a>
        </div>
        <p className={styles.installerTrust}>
          macOS is signed and notarized; Windows is currently unsigned
        </p>
        <div className={styles.trustStrip}>
          <RobloxTrustStrip user={user} authReady={authReady} />
        </div>
        </section>

        <section id="final-cta" className={styles.finalCta} aria-labelledby="final-cta-heading">
        <picture className={styles.finalCtaMedia}>
          <source
            media="(max-width: 767px)"
            srcSet="/assets/nexus-cinematic-final-v2-960.webp"
            type="image/webp"
          />
          <img
            data-home-final-image
            src="/assets/nexus-cinematic-final-v2-1600.webp"
            alt=""
            aria-hidden="true"
            width="1600"
            height="901"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className={styles.finalCtaShade} aria-hidden="true" />
        <div className={styles.finalCtaContent}>
          <img src="/logo.png" alt="" width="38" height="38" />
          <p>NexusRBX for Roblox Studio</p>
          <h2 id="final-cta-heading">Turn the next Roblox idea into a build you can trust.</h2>
          <a className={styles.primaryPill} href="/ai">
            Start building <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
}
