"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  FileCode2,
  FolderTree,
  Gamepad2,
  History,
  ListChecks,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "../../lib/icons";
import {
  homepageBuildStages,
  homepageControlPoints,
  homepageExampleBuilds,
  homepageFocusedTools,
  homepageGenres,
  homepageGrowthLoop,
  homepagePreviewPlanIds,
  homepagePreviewPlanFeatures,
} from "../../content/homepageV2";
import publicPlanCatalog from "../../data/publicPlanCatalog.json";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import RobloxTrustStrip from "./RobloxTrustStrip";
import styles from "./HomepageCinematic.module.css";

const WORLD_CLASSES = {
  obby: "worldObby",
  tycoon: "worldTycoon",
  horror: "worldHorror",
  social: "worldSocial",
  racing: "worldRacing",
  rpg: "worldRpg",
};

const STAGE_ICONS = {
  prompt: Sparkles,
  plan: ListChecks,
  build: Bot,
  playtest: Play,
};

const CONTROL_ICONS = {
  context: FolderTree,
  review: FileCode2,
  proof: Gamepad2,
  undo: History,
};

const GROWTH_ICONS = {
  fun: Sparkles,
  retain: RefreshCw,
  monetize: Coins,
  learn: History,
};

const previewPlans = homepagePreviewPlanIds
  .map((id) => publicPlanCatalog.find((plan) => plan.id === id))
  .filter(Boolean);

async function trackHomepageProductEvent(name, properties, options) {
  try {
    const { trackProductEvent } = await import("../../lib/productAnalytics");
    await trackProductEvent(name, properties, options);
  } catch (_) {
    // Homepage navigation and interactions must work without analytics.
  }
}

function formatPlanPrice(plan) {
  if (plan.monthly === 0) return "$0";
  const price = Number(plan.monthly).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number(plan.monthly) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return plan.perSeat ? `${price} / creator / month` : `${price} / month`;
}

function NexusRibbon({ className = "" }) {
  return (
    <svg
      className={`${styles.ribbon} ${className}`}
      viewBox="0 0 900 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        pathLength="1"
        d="M18 169 C142 39 250 37 337 121 C420 201 486 202 548 112 C615 16 722 24 882 132"
      />
    </svg>
  );
}

function MiniWorld({ genreId, compact = false }) {
  const worldClass = styles[WORLD_CLASSES[genreId]] || styles.worldObby;
  return (
    <div
      className={`${styles.miniWorld} ${worldClass} ${compact ? styles.miniWorldCompact : ""}`}
      data-mini-world={genreId}
      aria-hidden="true"
    >
      <span className={styles.worldSun} />
      <span className={styles.worldBack} />
      <span className={styles.worldGround} />
      <span className={`${styles.worldPiece} ${styles.worldPieceOne}`} />
      <span className={`${styles.worldPiece} ${styles.worldPieceTwo}`} />
      <span className={`${styles.worldPiece} ${styles.worldPieceThree}`} />
      <span className={styles.worldPlayer} />
      <span className={styles.worldDetail} />
    </div>
  );
}

function WorkshopIllustration({ genre }) {
  return (
    <div
      className={styles.workshopArt}
      role="img"
      aria-label={`A cartoon creator workshop turning an idea into a ${genre.label} game`}
    >
      <NexusRibbon className={styles.heroRibbon} />
      <div className={styles.ideaNote} aria-hidden="true">
        <span>IDEA</span>
        <strong>{genre.label}</strong>
        <i />
        <i />
        <i />
      </div>
      <div className={styles.workshopMachine} aria-hidden="true">
        <div className={styles.machineTop}>
          <span />
          <span />
          <span />
          <b>NEXUS WORKSHOP</b>
        </div>
        <div className={styles.machineBody}>
          <div className={styles.machinePlan}>
            <small>Build plan</small>
            <span><CheckCircle2 size={15} /> Player loop</span>
            <span><CheckCircle2 size={15} /> Core systems</span>
            <span><CheckCircle2 size={15} /> Studio test</span>
          </div>
          <MiniWorld key={genre.id} genreId={genre.id} />
        </div>
        <div className={styles.machineBelt}>
          <span /><span /><span /><span /><span />
        </div>
      </div>
      <div className={styles.shippedStamp} aria-hidden="true">
        <CheckCircle2 size={19} /> PLAYTEST READY
      </div>
    </div>
  );
}

function BuildDemo() {
  return (
    <div className={styles.buildDemo} role="group" aria-label="Illustrative NexusRBX workflow example">
      <div className={styles.demoTopbar}>
        <span className={styles.demoLights}><i /><i /><i /></span>
        <strong>Arcade Escape</strong>
        <span className={styles.demoDisclosure}>Illustrative workflow</span>
        <span className={styles.connectedPill}><i /> Studio target paired</span>
      </div>
      <div className={styles.demoBody}>
        <div className={styles.demoExplorer}>
          <small>PROJECT</small>
          <strong>Arcade Escape</strong>
          <span>Workspace</span>
          <span>ServerScriptService</span>
          <span className={styles.demoActiveFile}>RoundService.lua</span>
          <span>StarterGui</span>
        </div>
        <div className={styles.demoCanvas}>
          <div className={styles.demoPlanHeader}>
            <span>Step 2 of 6</span>
            <strong>Review the proposed build</strong>
          </div>
          <div className={styles.demoApproval}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span><strong>Plan approved</strong><small>Round loop, enemy state, and reward destinations confirmed</small></span>
          </div>
          <div className={styles.demoChange}>
            <FileCode2 size={18} aria-hidden="true" />
            <span><strong>3 files changed</strong><small>Reviewable diff applied after approval</small></span>
            <b>+84 −12</b>
          </div>
          <div className={styles.demoPlaytest}>
            <div className={styles.demoGameFrame} aria-hidden="true">
              <span className={styles.demoGameSign}>ROUND 01</span>
              <span className={styles.demoGameDoor} />
              <span className={styles.demoGamePlayer} />
            </div>
            <div className={styles.demoResultStack} role="group" aria-label="Playtest evidence">
              <div className={`${styles.demoResult} ${styles.demoResultIssue}`}>
                <AlertTriangle size={20} aria-hidden="true" />
                <span><strong>Issue found</strong><small>Door stayed locked after round restart</small></span>
              </div>
              <div className={`${styles.demoResult} ${styles.demoResultFix}`}>
                <RefreshCw size={20} aria-hidden="true" />
                <span><strong>Fix applied</strong><small>Reset door state before player spawn</small></span>
              </div>
              <div className={`${styles.demoResult} ${styles.demoResultPassed}`}>
              <CheckCircle2 size={21} aria-hidden="true" />
              <span><strong>Playtest passed</strong><small>Spawn → round → reward verified</small></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageV2Content({
  surface = "homepage",
  navigate,
}) {
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const [promptSuggestion, setPromptSuggestion] = useState({ value: "", version: 0 });
  const heroPromptRef = useRef(null);
  const selectedGenre = useMemo(
    () => homepageGenres.find((genre) => genre.id === selectedGenreId) || homepageGenres[0],
    [selectedGenreId],
  );

  useEffect(() => {
    const trackView = () => {
      void trackHomepageProductEvent(
        "landing_page_view",
        { landing_page: "/", landing_page_category: "homepage" },
        { dedupeKey: "homepage" },
      );
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(trackView, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(trackView, 500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const chooseGenre = (genre) => {
    setSelectedGenreId(genre.id);
    setPromptSuggestion((current) => ({
      value: genre.prompt,
      version: current.version + 1,
    }));
    void trackHomepageProductEvent("homepage_genre_selected", {
      surface,
      genre: genre.id,
    });
  };

  const continueWithGenre = () => {
    const input = heroPromptRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const reducedMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    input.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  };

  return (
    <div className={`nexus-workshop-home ${styles.page}`}>
      <main id="main-content" tabIndex={-1}>
        <section id="product" className={styles.hero} aria-labelledby="homepage-hero-heading" data-home-hero>
          <div className={styles.heroTexture} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span /> From idea to a playable Roblox game</p>
              <h1 id="homepage-hero-heading">
                Make the Roblox game <span>in your head.</span>
              </h1>
              <p className={styles.heroDescription}>
                Plan the whole project, build it in Studio, playtest every change, and add
                Roblox-native monetization when the experience is ready.
              </p>

              <HomepagePrompt
                surface={surface}
                source={surface}
                navigateToAi={navigate}
                className={styles.heroPrompt}
                promptId="homepage-hero-prompt"
                suggestedPrompt={promptSuggestion.value}
                suggestionVersion={promptSuggestion.version}
                submitLabel="Start building"
                helperText="No magic black box: you will see the plan before the build begins."
                showLabel
                inputRef={heroPromptRef}
              />

              <div className={styles.heroProof} role="list" aria-label="Product principles">
                <span role="listitem"><ShieldCheck size={16} aria-hidden="true" /> Review every change</span>
                <span role="listitem"><Gamepad2 size={16} aria-hidden="true" /> Verify it in Studio</span>
                <span role="listitem"><History size={16} aria-hidden="true" /> Keep snapshots and undo</span>
              </div>
            </div>

            <WorkshopIllustration genre={selectedGenre} />
          </div>
        </section>

        <section id="genres" className={styles.genres} aria-labelledby="genres-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span /> Any genre, one build loop</p>
            <h2 id="genres-heading">Start with the game—not the boilerplate.</h2>
            <p>Choose a direction to load a concrete starting prompt into the workshop.</p>
          </div>

          <div className={styles.genreGrid} role="group" aria-label="Choose a Roblox game genre">
            {homepageGenres.map((genre) => {
              const selected = selectedGenreId === genre.id;
              return (
                <button
                  type="button"
                  key={genre.id}
                  className={`${styles.genreCard} ${selected ? styles.genreCardSelected : ""}`}
                  aria-pressed={selected}
                  aria-controls="homepage-hero-prompt"
                  data-home-genre={genre.id}
                  onClick={() => chooseGenre(genre)}
                >
                  <MiniWorld genreId={genre.id} compact />
                  <span className={styles.genreCardCopy}>
                    <strong>{genre.label}</strong>
                    <small>{genre.description}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className={styles.genreOutcome} aria-live="polite" aria-atomic="true">
            <span>{selectedGenreId ? `${selectedGenre.label} starting point` : "Choose a genre"}</span>
            <strong>{selectedGenreId ? selectedGenre.outcome : "Six different worlds, one reviewable build loop."}</strong>
            <small>{promptSuggestion.value ? "Prompt loaded into the builder above." : "Select a genre to load its prompt."}</small>
            <button type="button" onClick={continueWithGenre} disabled={!promptSuggestion.value}>
              Continue with this idea <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section id="workflow" className={styles.workflow} aria-labelledby="workflow-heading">
          <NexusRibbon className={styles.workflowRibbon} />
          <div className={`${styles.sectionHeading} ${styles.sectionHeadingOnDark}`}>
            <p className={styles.eyebrow}><span /> Build with evidence</p>
            <h2 id="workflow-heading">Prompt → plan → build → playtest.</h2>
            <p>A continuous project workflow, not a chat window that drops a code block and disappears.</p>
          </div>

          <ol className={styles.stageGrid} aria-label="NexusRBX build stages">
            {homepageBuildStages.map((stage, index) => {
              const Icon = STAGE_ICONS[stage.id];
              return (
                <li key={stage.id}>
                  <span className={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={22} aria-hidden="true" />
                  <small>{stage.label}</small>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </li>
              );
            })}
          </ol>

          <BuildDemo />
        </section>

        <section id="control" className={styles.control} aria-labelledby="control-heading">
          <div className={styles.controlIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}><span /> Creator control</p>
              <h2 id="control-heading">Fast does not have to mean careless.</h2>
              <p>
                Roblox already has AI assistance. NexusRBX earns its place by making the whole
                project visible, reviewable, and testable.
              </p>
            </div>
            <div className={styles.controlPromise}>
              <ShieldCheck size={28} aria-hidden="true" />
              <strong>Your game stays yours.</strong>
              <span>Know what is planned, what changed, and what passed before you ship. Roblox credentials stay server-side.</span>
              <a href="/legal/privacy">How project data is handled <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>

          <div className={styles.controlGrid}>
            {homepageControlPoints.map((point, index) => {
              const Icon = CONTROL_ICONS[point.id];
              return (
                <article key={point.id} className={styles.controlCard}>
                  <span className={styles.controlIcon}><Icon size={23} aria-hidden="true" /></span>
                  <small>0{index + 1}</small>
                  <h3>{point.title}</h3>
                  <p>{point.description}</p>
                </article>
              );
            })}
          </div>

          <div className={styles.trustStrip}>
            <RobloxTrustStrip />
          </div>
        </section>

        <section id="grow" className={styles.growth} aria-labelledby="growth-heading">
          <NexusRibbon className={styles.growthRibbon} />
          <div className={styles.growthIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}><span /> Your game. Your upside.</p>
              <h2 id="growth-heading">Build the fun first. Grow from real signals.</h2>
            </div>
            <div className={styles.robuxTruth}>
              <Coins size={26} aria-hidden="true" />
              <span><strong>Robux is an outcome, not a button.</strong> NexusRBX helps build and verify the game; Roblox Creator Analytics supplies the growth signals.</span>
            </div>
          </div>

          <ol className={styles.growthGrid}>
            {homepageGrowthLoop.map((step, index) => {
              const Icon = GROWTH_ICONS[step.id];
              return (
                <li key={step.id}>
                  <span className={styles.growthIcon}><Icon size={22} aria-hidden="true" /></span>
                  <small>{index + 1}</small>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              );
            })}
          </ol>

          <p className={styles.growthFinePrint}>
            Player demand, retention, discovery, pricing, and update quality all affect results.
            NexusRBX does not promise earnings.
          </p>
        </section>

        <section id="examples" className={styles.examples} aria-labelledby="examples-heading">
          <div className={styles.examplesIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}><span /> Workshop examples</p>
              <h2 id="examples-heading">Proof should be earned—not invented.</h2>
              <p>
                These are curated build briefs that show the breadth of a NexusRBX project.
                They are examples, not customer testimonials or claims about player results.
              </p>
            </div>
            <div className={styles.exampleNote}>
              <CheckCircle2 size={24} aria-hidden="true" />
              <span><strong>Clear by design</strong> Real creator stories will only appear here with a named project, context, and verifiable result.</span>
            </div>
          </div>

          <div className={styles.exampleGrid}>
            {homepageExampleBuilds.map((example) => (
              <article className={styles.exampleCard} key={example.id}>
                <MiniWorld genreId={example.genreId} compact />
                <div className={styles.exampleCardCopy}>
                  <small>Curated example build</small>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                  <ul aria-label={`${example.title} example systems`}>
                    {example.systems.map((system) => <li key={system}>{system}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className={styles.pricingPreview} aria-labelledby="pricing-preview-heading">
          <div className={styles.pricingIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}><span /> Start small, keep building</p>
              <h2 id="pricing-preview-heading">Plans described like a creator would use them.</h2>
              <p>Pick the amount of build capacity, history, creator tools, and team billing you need. Prices below are in USD.</p>
            </div>
            <a href="/pricing">Compare every plan <ArrowRight size={17} aria-hidden="true" /></a>
          </div>

          <div className={styles.planGrid}>
            {previewPlans.map((plan) => (
              <article className={`${styles.planCard} ${plan.featured ? styles.planCardFeatured : ""}`} key={plan.id}>
                <div className={styles.planCardHeading}>
                  <span>{plan.featured ? "Creator pick" : plan.id === "TEAM" ? "For studios" : "Start here"}</span>
                  <h3>{plan.name}</h3>
                  <p>{plan.audience}</p>
                </div>
                <strong className={styles.planPrice}>{formatPlanPrice(plan)}</strong>
                <ul>
                  {homepagePreviewPlanFeatures[plan.id].map((feature) => <li key={feature}><CheckCircle2 size={16} aria-hidden="true" /> {feature}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <p className={styles.planFinePrint}>Usage limits and checkout details are shown before purchase. No plan promises player growth or Robux earnings.</p>
        </section>

        <section className={styles.focusedTools} aria-labelledby="focused-tools-heading">
          <div>
            <p className={styles.eyebrow}><span /> Need something focused?</p>
            <h2 id="focused-tools-heading">Use the whole workshop—or start with one task.</h2>
          </div>
          <nav aria-label="Focused Roblox creation tools">
            {homepageFocusedTools.map((tool) => (
              <a href={tool.href} key={tool.href}>
                {tool.label} <ArrowRight size={15} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </section>

        <section id="final-cta" className={styles.finalCta} aria-labelledby="final-cta-heading">
          <div className={styles.finalSpark} aria-hidden="true"><Sparkles size={38} /></div>
          <p className={styles.eyebrow}><span /> Build it. Ship it. Grow it.</p>
          <h2 id="final-cta-heading">What game are we building?</h2>
          <p>Bring the idea. Keep the creative decisions. Let NexusRBX coordinate the work.</p>
          <HomepagePrompt
            surface={surface}
            source={`${surface}_final`}
            navigateToAi={navigate}
            className={styles.finalPrompt}
            promptId="homepage-final-prompt"
            suggestedPrompt={promptSuggestion.value}
            suggestionVersion={promptSuggestion.version}
            submitLabel="Start building"
            helperText="Your prompt stays local until you open the workspace."
          />
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
}
