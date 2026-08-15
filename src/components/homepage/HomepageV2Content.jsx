"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileCode2,
  FolderTree,
  Gamepad2,
  History,
  ListChecks,
  Play,
  PlugZap,
  RefreshCw,
  Search,
  ShieldCheck,
} from "../../lib/icons";
import {
  homepageBuildStages,
  homepageExampleBuilds,
  homepageFocusedTools,
  homepageGenres,
  homepageGrowthLoop,
  homepageHeroPrompt,
  homepageProjectEvidence,
} from "../../content/homepageV2";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import NexusDisplayIcon from "../icons/NexusDisplayIcon";
import styles from "./HomepageCinematic.module.css";

const STAGE_DATA = {
  prompt: {
    eyebrow: "Request brief",
    title: "Inventory system",
    summary: "Match the current game, preserve mobile performance, and use the existing item data.",
    items: ["Player goal captured", "Visual direction retained", "Performance constraint noted"],
  },
  inspect: {
    eyebrow: "Project inspection",
    title: "6 references found",
    summary: "Nexus traced the current inventory flow before proposing a change.",
    items: ["ReplicatedStorage.ItemDefinitions", "StarterGui.Inventory", "InventoryService remotes"],
  },
  plan: {
    eyebrow: "Proposed route",
    title: "4 steps, ready to review",
    summary: "The plan connects interface structure, data binding, input, and Play mode verification.",
    items: ["Reuse ItemDefinitions", "Build responsive ScreenGui", "Verify equip and close flows"],
  },
  build: {
    eyebrow: "Construction active",
    title: "World and interface taking shape",
    summary: "Every affected object remains attached to this request and its recovery point.",
    items: ["InventoryController.luau", "InventoryView ScreenGui", "InventoryService reference"],
  },
  test: {
    eyebrow: "Play mode evidence",
    title: "7 checks passed",
    summary: "The first test exposed a stale selection; Nexus corrected it and ran the flow again.",
    items: ["Open and close on mobile", "Equip updates server state", "Respawn clears stale selection"],
  },
  review: {
    eyebrow: "Request change set",
    title: "Ready for your decision",
    summary: "Review the final scope, keep the whole change, or restore individual project objects.",
    items: ["3 files changed", "1 ScreenGui updated", "Snapshot NXS-184 retained"],
  },
};

const STEP_ICONS = {
  prompt: ChevronRight,
  inspect: Search,
  plan: ListChecks,
  build: FileCode2,
  test: Play,
  review: ShieldCheck,
};

const STAGE_DISPLAY_ICONS = {
  prompt: "ask",
  inspect: "assets",
  plan: "plan",
  build: "build",
  test: "debug",
  review: "complete",
};

const TRANSFORMATION_STAGES = [
  {
    id: "blockout",
    label: "Blockout",
    detail: "Playable geometry",
  },
  {
    id: "build",
    label: "Structured build",
    detail: "Systems and routes",
  },
  {
    id: "finished",
    label: "Finished world",
    detail: "Tested experience",
  },
];

async function trackHomepageProductEvent(name, properties, options) {
  try {
    const { trackProductEvent } = await import("../../lib/productAnalytics");
    await trackProductEvent(name, properties, options);
  } catch (_) {
    // The public journey must remain usable when analytics is unavailable.
  }
}

function ProductNavigator() {
  return (
    <aside className={styles.productNavigator} aria-label="Example Nexus project navigation">
      <div className={styles.navigatorBrand}>
        <img src="/nexus-mark.svg" alt="" width="26" height="26" />
        <span>Nexus</span>
      </div>
      <div className={styles.newBuildButton} aria-hidden="true">
        <span>+</span> New build
      </div>
      <div className={styles.navigatorGroup}>
        <small>ACTIVE PROJECT</small>
        <strong>Arcade District</strong>
        <span className={styles.navigatorPlace}><i /> Main place</span>
      </div>
      <div className={styles.navigatorGroup}>
        <small>RECENT</small>
        <span>Inventory system</span>
        <span>Round restart bug</span>
        <span>Mobile shop pass</span>
      </div>
      <div className={styles.navigatorFooter}>
        <PlugZap size={15} aria-hidden="true" />
        <span><strong>Studio paired</strong><small>Arcade District</small></span>
      </div>
    </aside>
  );
}

function RequestRail({ activeIndex, onSelect }) {
  return (
    <ol className={styles.requestRail} aria-label="Conversation-to-construction sequence">
      {homepageBuildStages.map((step, index) => {
        const Icon = STEP_ICONS[step.id];
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <li key={step.id} data-complete={complete ? "true" : undefined}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(index)}
              className={active ? styles.requestStepActive : ""}
            >
              <span className={styles.requestStepIcon}>
                {complete ? <CheckCircle2 size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
              </span>
              <span>{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ProductStage({ step }) {
  const content = STAGE_DATA[step.id];
  return (
    <section className={styles.productStage} aria-labelledby="demo-stage-title">
      <header className={styles.stageHeader}>
        <div>
          <span className={styles.stageDot} aria-hidden="true" />
          <strong id="demo-stage-title">Stage</strong>
          <span>Arcade District</span>
        </div>
        <span className={styles.stageArtifact}>World · UI · Changes</span>
      </header>
      <div className={styles.stageViewport} data-stage-state={step.id}>
        <img
          src="/assets/nexus-world-under-construction-2d.webp"
          width="1920"
          height="1072"
          alt="Flat editorial map showing a Roblox-like world progressing from blockout to a finished environment"
          loading="eager"
          decoding="async"
        />
        <span className={styles.stageScanLine} aria-hidden="true" />
        <div key={step.id} className={styles.stageStatus} aria-live="polite" aria-atomic="true">
          <small>{content.eyebrow}</small>
          <h3>{content.title}</h3>
          <p>{content.summary}</p>
          <ul>
            {content.items.map((item) => (
              <li key={item}><CheckCircle2 size={14} aria-hidden="true" /> {item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.stageSelection} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className={styles.stageFooter}>
        <span>Illustrative project · real interface controls</span>
        <strong>{step.status}</strong>
      </div>
    </section>
  );
}

function ProductHero({ surface, navigate, promptSuggestion, heroPromptRef }) {
  const [activeStepIndex, setActiveStepIndex] = useState(3);
  const activeStep = homepageBuildStages[activeStepIndex];

  const selectStep = (index) => {
    setActiveStepIndex(index);
    void trackHomepageProductEvent("homepage_demo_step_selected", {
      surface,
      step: homepageBuildStages[index].id,
    });
  };

  return (
    <section id="product" className={styles.hero} aria-labelledby="homepage-hero-heading" data-home-hero>
      <div className={styles.heroIntro}>
        <p className={styles.eyebrow}><span aria-hidden="true" /> Conversational Roblox production studio</p>
        <h1 id="homepage-hero-heading">Talk to your Roblox project. <span>Watch it take shape.</span></h1>
        <p className={styles.heroDescription}>
          Describe any game, system, interface, or fix. Nexus understands the project, plans the work,
          changes Roblox Studio, and keeps the result ready to inspect.
        </p>
      </div>

      <div className={styles.productDemo} role="group" aria-label="Interactive NexusRBX product demonstration">
        <ProductNavigator />
        <section className={styles.productConversation} aria-labelledby="demo-conversation-title">
          <header className={styles.conversationHeader}>
            <div>
              <strong id="demo-conversation-title">Inventory system</strong>
              <span>Arcade District · Main place</span>
            </div>
            <span className={styles.contextStatus}><i /> Project context ready</span>
          </header>
          <div className={styles.conversationBody}>
            <div className={styles.nexusResponse}>
              <span className={styles.responseMark} aria-hidden="true">N</span>
              <div>
                <strong>Nexus</strong>
                <p>
                  I found the current item definitions, inventory ScreenGui, and equip remote.
                  I’ll preserve those contracts and build the responsive view as one reviewable change set.
                </p>
              </div>
            </div>
            <RequestRail activeIndex={activeStepIndex} onSelect={selectStep} />
            <div className={styles.currentStep} aria-live="polite">
              <span>{String(activeStepIndex + 1).padStart(2, "0")}</span>
              <div>
                <small>{activeStep.label}</small>
                <strong>{activeStep.title}</strong>
                <p>{activeStep.description}</p>
              </div>
            </div>
          </div>
          <HomepagePrompt
            surface={surface}
            source={surface}
            navigateToAi={navigate}
            className={styles.heroPrompt}
            promptId="homepage-hero-prompt"
            suggestedPrompt={promptSuggestion.value}
            suggestionVersion={promptSuggestion.version}
            submitLabel="Start building"
            helperText="Your prompt is saved locally before the workspace opens. Review is always part of the loop."
            inputRef={heroPromptRef}
          />
        </section>
        <ProductStage step={activeStep} />
      </div>

      <div className={styles.heroProof} role="list" aria-label="NexusRBX product principles">
        <span role="listitem"><FolderTree size={16} aria-hidden="true" /> Project-aware inspection</span>
        <span role="listitem"><ShieldCheck size={16} aria-hidden="true" /> Reviewable Studio changes</span>
        <span role="listitem"><Gamepad2 size={16} aria-hidden="true" /> Play mode evidence</span>
        <span role="listitem"><History size={16} aria-hidden="true" /> Snapshots and recovery</span>
      </div>
    </section>
  );
}

function ProjectContextFigure() {
  return (
    <figure className={styles.contextFigure}>
      <figcaption>
        <span>Request scope</span>
        <strong>Inventory system · 4 affected objects</strong>
      </figcaption>
      <div className={styles.editorialPlate}>
        <img
          src="/assets/nexus-project-xray-2d.webp"
          width="1440"
          height="960"
          alt="Flat technical cutaway connecting a Roblox-like world, object hierarchy, and the subsystem Nexus is analysing"
          loading="lazy"
          decoding="async"
        />
        <span>World context</span>
        <span>Analysed route</span>
        <span>Related systems</span>
      </div>
      <div className={styles.contextFigureBody}>
        <div className={styles.fileTree} aria-label="Example affected Roblox project hierarchy">
          <span><ChevronRight size={13} aria-hidden="true" /> ReplicatedStorage</span>
          <strong><ChevronRight size={13} aria-hidden="true" /> ItemDefinitions</strong>
          <span><ChevronRight size={13} aria-hidden="true" /> StarterGui</span>
          <strong><ChevronRight size={13} aria-hidden="true" /> InventoryView</strong>
          <span><ChevronRight size={13} aria-hidden="true" /> StarterPlayerScripts</span>
          <strong><ChevronRight size={13} aria-hidden="true" /> InventoryController</strong>
          <span><ChevronRight size={13} aria-hidden="true" /> ServerScriptService</span>
          <strong><ChevronRight size={13} aria-hidden="true" /> InventoryService</strong>
        </div>
        <div className={styles.changeSet}>
          <header>
            <span><FileCode2 size={16} aria-hidden="true" /> InventoryController.luau</span>
            <strong>+42 −8</strong>
          </header>
          <pre aria-label="Illustrative Luau change"><code>{`local items = ItemDefinitions.getVisible(player)

view:render(items)
view:onEquip(function(itemId)
  equipRemote:FireServer(itemId)
end)`}</code></pre>
          <div className={styles.changeSetFooter}>
            <span><ShieldCheck size={15} aria-hidden="true" /> Expected source matched</span>
            <span>Snapshot NXS-184</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function PlaytestFigure() {
  return (
    <figure className={styles.playtestFigure}>
      <figcaption>
        <span>Play mode · run 2</span>
        <strong>Inventory interaction</strong>
      </figcaption>
      <div className={styles.debugPlate}>
        <img
          src="/assets/nexus-debug-trace-2d.webp"
          width="1440"
          height="960"
          alt="Flat game scene with one purple diagnostic route tracing an interaction to an interrupted connection"
          loading="lazy"
          decoding="async"
        />
      </div>
      <ol aria-label="Example playtest evidence">
        <li>
          <span className={styles.testIconNeutral}><Play size={16} aria-hidden="true" /></span>
          <div><strong>Test flow started</strong><small>Mobile viewport · fresh player spawn</small></div>
          <time>00:00</time>
        </li>
        <li>
          <span className={styles.testIconIssue}><AlertTriangle size={16} aria-hidden="true" /></span>
          <div><strong>Stale selection found</strong><small>Respawn retained the previous equipped slot</small></div>
          <time>00:08</time>
        </li>
        <li>
          <span className={styles.testIconNeutral}><RefreshCw size={16} aria-hidden="true" /></span>
          <div><strong>Targeted correction applied</strong><small>Selection now resets with character state</small></div>
          <time>00:21</time>
        </li>
        <li>
          <span className={styles.testIconPassed}><CheckCircle2 size={16} aria-hidden="true" /></span>
          <div><strong>7 checks passed</strong><small>Open, equip, close, respawn, and touch input verified</small></div>
          <time>00:36</time>
        </li>
      </ol>
    </figure>
  );
}

function TransformationFigure() {
  const [activeStage, setActiveStage] = useState(1);
  const selectedStage = TRANSFORMATION_STAGES[activeStage];

  return (
    <figure
      className={styles.transformationFigure}
      data-transformation-stage={selectedStage.id}
      aria-labelledby="transformation-title"
    >
      <div className={styles.transformationImage}>
        <img
          src="/assets/nexus-world-transformation-2d.webp"
          width="1440"
          height="900"
          alt="The same Roblox-like level shown as a grey blockout, an intermediate build, and a finished world"
          loading="lazy"
          decoding="async"
        />
        <span
          className={styles.transformationSelection}
          style={{ "--transformation-index": activeStage }}
          aria-hidden="true"
        />
      </div>
      <figcaption id="transformation-title">
        {TRANSFORMATION_STAGES.map((stage, index) => (
          <button
            type="button"
            key={stage.id}
            aria-pressed={activeStage === index}
            onClick={() => setActiveStage(index)}
          >
            <span>{stage.label}</span>
            <small>{stage.detail}</small>
          </button>
        ))}
      </figcaption>
      <p className={styles.srOnly} aria-live="polite">
        {selectedStage.label} selected: {selectedStage.detail}.
      </p>
    </figure>
  );
}

function InterfaceAssemblyFigure() {
  return (
    <figure className={styles.assemblyFigure}>
      <img
        src="/assets/nexus-interface-assembly-2d.webp"
        width="1440"
        height="1080"
        alt="Flat construction diagram showing inventory, HUD, navigation, and touch controls aligning into one Roblox game interface"
        loading="lazy"
        decoding="async"
      />
      <figcaption>
        <div>
          <small>Interface assembly</small>
          <strong>One system, composed around the game.</strong>
        </div>
        <ul aria-label="Interface areas shown">
          <li>Inventory</li>
          <li>HUD</li>
          <li>Touch actions</li>
        </ul>
      </figcaption>
    </figure>
  );
}

function StudioBridge() {
  return (
    <figure className={styles.studioBridge}>
      <img
        className={styles.studioBridgePlate}
        src="/assets/nexus-studio-bridge-2d.webp"
        width="1440"
        height="810"
        alt="Flat schematic of a reviewed Nexus change set transferring to a selected Roblox Studio project"
        loading="lazy"
        decoding="async"
      />
      <figcaption className={styles.studioBridgeLabels}>
        <section>
          <small>NEXUS CONVERSATION</small>
          <strong>Inventory system</strong>
          <span>Plan, change set, evidence</span>
        </section>
        <div className={styles.bridgeRoute} aria-hidden="true">
          <i /><i /><i />
          <ArrowRight size={18} />
        </div>
        <section>
          <small>ROBLOX STUDIO</small>
          <strong>Arcade District</strong>
          <span>Main place · paired</span>
        </section>
      </figcaption>
    </figure>
  );
}

export default function HomepageV2Content({ surface = "homepage", navigate }) {
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const [promptSuggestion, setPromptSuggestion] = useState({ value: homepageHeroPrompt, version: 0 });
  const heroPromptRef = useRef(null);
  const selectedGenre = useMemo(
    () => homepageGenres.find((genre) => genre.id === selectedGenreId) || null,
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
    setPromptSuggestion((current) => ({ value: genre.prompt, version: current.version + 1 }));
    void trackHomepageProductEvent("homepage_genre_selected", { surface, genre: genre.id });
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
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1}>
        <ProductHero
          surface={surface}
          navigate={navigate}
          promptSuggestion={promptSuggestion}
          heroPromptRef={heroPromptRef}
        />

        <section id="workflow" className={styles.workflow} aria-labelledby="workflow-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> A build you can follow</p>
            <h2 id="workflow-heading">Nexus does not jump from prompt to paste.</h2>
            <p>
              The request stays legible from first inspection through final review. Raw tool noise stays out of the way;
              decisions, affected objects, and evidence remain visible.
            </p>
          </div>
          <ol className={styles.workflowLedger} aria-label="Nexus build workflow">
            {homepageBuildStages.map((stage, index) => {
              return (
                <li key={stage.id}>
                  <span className={styles.ledgerIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.ledgerIcon}>
                    <NexusDisplayIcon
                      name={STAGE_DISPLAY_ICONS[stage.id]}
                      className={styles.ledgerIconAsset}
                      size={52}
                    />
                  </span>
                  <div><small>{stage.label}</small><strong>{stage.title}</strong></div>
                  <p>{stage.description}</p>
                  <span className={styles.ledgerStatus}>{stage.status}</span>
                </li>
              );
            })}
          </ol>
          <TransformationFigure />
          <InterfaceAssemblyFigure />
        </section>

        <section id="context" className={styles.contextSection} aria-labelledby="context-heading">
          <div className={styles.contextCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Understand every change</p>
            <h2 id="context-heading">The project is bigger than the open script.</h2>
            <p>
              Nexus keeps the Roblox object graph, shared dependencies, and creator intent beside the conversation.
              A multi-file build remains one thing you can inspect, approve, or restore.
            </p>
            <dl>
              {homepageProjectEvidence.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd><strong>{item.title}</strong><span>{item.description}</span></dd>
                </div>
              ))}
            </dl>
          </div>
          <ProjectContextFigure />
        </section>

        <section id="debug" className={styles.debugSection} aria-labelledby="debug-heading">
          <div className={styles.debugCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Debug with context</p>
            <h2 id="debug-heading">A plausible script is not proof that the game works.</h2>
            <p>
              Nexus connects a failure to the related project state, applies a focused correction, and keeps the
              Play mode result with the request.
            </p>
            <ul>
              <li><Bug size={17} aria-hidden="true" /> Failure and affected object stay connected</li>
              <li><RefreshCw size={17} aria-hidden="true" /> Fixes preserve the original request scope</li>
              <li><CheckCircle2 size={17} aria-hidden="true" /> Passing evidence remains reviewable</li>
            </ul>
          </div>
          <PlaytestFigure />
        </section>

        <section id="studio" className={styles.studioSection} aria-labelledby="studio-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Continue inside Studio</p>
            <h2 id="studio-heading">Conversation stays attached to the place you mean to change.</h2>
            <p>
              Pair the selected Roblox Studio place when the work needs live project context. Review the route,
              apply deliberately, test in Play mode, and keep building from the same conversation.
            </p>
          </div>
          <StudioBridge />
          <p className={styles.studioFinePrint}>
            Roblox credentials remain server-side. NexusRBX is an independent developer tool and is not affiliated
            with or endorsed by Roblox Corporation.
          </p>
        </section>

        <section id="genres" className={styles.genres} aria-labelledby="genres-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Any Roblox game</p>
            <h2 id="genres-heading">Bring the genre. Keep the creative decisions.</h2>
            <p>Select a starting direction to load a concrete brief into the real composer above.</p>
          </div>
          <div className={styles.genreSelector} role="group" aria-label="Choose a Roblox game genre">
            {homepageGenres.map((genre) => (
              <button
                type="button"
                key={genre.id}
                aria-pressed={selectedGenreId === genre.id}
                aria-controls="homepage-hero-prompt"
                aria-label={`Load ${genre.label} brief: ${genre.description}`}
                data-home-genre={genre.id}
                onClick={() => chooseGenre(genre)}
              >
                <span className={styles.genreImage}>
                  <img
                    src={genre.image}
                    width="704"
                    height="440"
                    alt={genre.imageAlt}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 50vw, 25vw"
                  />
                </span>
                <span className={styles.genreCopy}>
                  <span>{genre.label}</span>
                  <small>{genre.description}</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className={styles.genreOutcome} aria-live="polite" aria-atomic="true">
            <div>
              <small>{selectedGenre ? `${selectedGenre.label} brief loaded` : "Choose a direction"}</small>
              <strong>{selectedGenre ? selectedGenre.outcome : "Eight starting points. No fixed template ceiling."}</strong>
              <p>{selectedGenre ? selectedGenre.prompt : "The same inspect, plan, build, test, and review loop adapts to the project."}</p>
            </div>
            <button type="button" onClick={continueWithGenre} disabled={!selectedGenre}>
              Continue in the composer <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section id="grow" className={styles.growth} aria-labelledby="growth-heading">
          <div className={styles.growthIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}><span aria-hidden="true" /> Creator upside</p>
              <h2 id="growth-heading">Make something players return to. Robux can follow—never promised.</h2>
              <p>
                Nexus helps shorten the distance between an idea and a game you can test, improve, publish, and operate.
                Player demand, retention, discovery, pricing, and update quality still determine results.
              </p>
            </div>
            <div className={styles.robuxTruth}>
              <Coins size={24} aria-hidden="true" />
              <span><strong>Robux is an outcome, not a generate button.</strong> Build the fun, read real signals, then add fair value where it belongs.</span>
            </div>
          </div>
          <ol className={styles.growthLoop}>
            {homepageGrowthLoop.map((step, index) => (
              <li key={step.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{step.title}</strong><p>{step.description}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="examples" className={styles.examples} aria-labelledby="examples-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Built as project briefs</p>
            <h2 id="examples-heading">Breadth without invented customer proof.</h2>
            <p>These curated examples show the systems a Nexus project can coordinate. They are not testimonials or earnings claims.</p>
          </div>
          <div className={styles.exampleLedger}>
            {homepageExampleBuilds.map((example, index) => (
              <article key={example.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><small>{example.genre}</small><h3>{example.title}</h3><p>{example.description}</p></div>
                <ul aria-label={`${example.title} example systems`}>
                  {example.systems.map((system) => <li key={system}>{system}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.focusedTools} aria-labelledby="focused-tools-heading">
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true" /> Start with one task</p>
            <h2 id="focused-tools-heading">Focused Roblox tools, when the whole project is not required.</h2>
          </div>
          <nav aria-label="Focused Roblox creation tools">
            {homepageFocusedTools.map((tool) => (
              <a href={tool.href} key={tool.href}>{tool.label} <ArrowRight size={14} aria-hidden="true" /></a>
            ))}
          </nav>
        </section>
      </main>
      <HomepageFooter />
    </div>
  );
}
