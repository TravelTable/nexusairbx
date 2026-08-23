"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  homepageExampleBuilds,
  homepageFocusedTools,
  homepageGenres,
  homepageGrowthLoop,
  homepageHeroPrompt,
} from "../../content/homepageV2";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import styles from "./HomepageCinematic.module.css";

const RUN_RECORD = [
  { time: "00:00", state: "REQUEST ACCEPTED", detail: "Arcade District / Main place" },
  { time: "00:03", state: "PROJECT READ", detail: "18 objects / 4 existing systems" },
  { time: "00:11", state: "CHANGE APPLIED", detail: "4 project objects" },
  { time: "00:20", state: "TEST FAILED", detail: "Stale player selection", tone: "warning" },
  { time: "00:31", state: "CORRECTION APPLIED", detail: "Respawn state reset" },
  { time: "00:39", state: "7 CHECKS PASSED", detail: "Mobile and server paths verified", tone: "success" },
];

const OBJECT_RECORD = [
  { path: "ReplicatedStorage / ItemDefinitions", state: "READ" },
  { path: "StarterGui / InventoryView", state: "CHANGE" },
  { path: "StarterPlayerScripts / InventoryController", state: "CHANGE" },
  { path: "ServerScriptService / InventoryService", state: "VERIFY" },
];

async function trackHomepageProductEvent(name, properties, options) {
  try {
    const { trackProductEvent } = await import("../../lib/productAnalytics");
    await trackProductEvent(name, properties, options);
  } catch (_) {
    // Public navigation and prompt handoff remain usable without analytics.
  }
}

function ProjectCutaway() {
  return (
    <figure className={styles.projectCutaway} aria-labelledby="project-cutaway-caption">
      <div className={styles.projectImageField}>
        <img
          src="/assets/nexus-world-under-construction-2d.webp"
          width="1920"
          height="1072"
          alt="Roblox-like broken arcade project with rooms, paths, and active construction marks"
          loading="eager"
          decoding="async"
        />
        <span className={styles.objectLabel} data-position="entry">Workspace / Entry</span>
        <span className={styles.objectLabel} data-position="round">RoundService / Active</span>
        <span className={styles.objectLabel} data-position="enemy">EnemyDirector / Read</span>
        <span className={styles.changeMark} data-position="north" aria-hidden="true">+03</span>
        <span className={styles.changeMark} data-position="south" aria-hidden="true">~01</span>
      </div>
      <figcaption id="project-cutaway-caption">
        <span>ARCADE DISTRICT / MAIN PLACE</span>
        <strong>Current snapshot NXS-184</strong>
        <span className="nx-state-mark" data-state="success">STUDIO READY</span>
      </figcaption>
    </figure>
  );
}

function RequestOpening({ surface, navigate, promptSuggestion, heroPromptRef }) {
  return (
    <section id="product" className={styles.hero} aria-labelledby="homepage-hero-heading" data-home-hero>
      <div className={styles.requestOpening}>
        <p className={styles.routeLabel}>REQUEST / 184</p>
        <h1 id="homepage-hero-heading">Create a round-based horror game in a broken arcade.</h1>
        <p className={styles.requestContinuation}>Keep mobile controls simple. Make the rooms shift after each round.</p>
        <dl className={styles.projectRead}>
          <div>
            <dt>PROJECT READ</dt>
            <dd>18 objects / 4 existing systems / 1 blocked remote</dd>
          </div>
          <div>
            <dt>TARGET</dt>
            <dd>Arcade District / Main place</dd>
          </div>
        </dl>
        <HomepagePrompt
          surface={surface}
          source={surface}
          navigateToAi={navigate}
          className={styles.heroPrompt}
          promptId="homepage-hero-prompt"
          suggestedPrompt={promptSuggestion.value}
          suggestionVersion={promptSuggestion.version}
          submitLabel="Run build"
          helperText="The request is saved before the workspace opens. Review remains part of the build."
          inputRef={heroPromptRef}
          showLabel
        />
      </div>
      <ProjectCutaway />
    </section>
  );
}

function ObjectReadRecord() {
  return (
    <section className={styles.readRecord} aria-labelledby="read-record-heading">
      <div className={styles.recordCopy}>
        <p className={styles.routeLabel}>READ</p>
        <h2 id="read-record-heading">The project exists before the request.</h2>
        <p>Nexus traces the current object graph, client/server boundary, UI state, and selected Studio place before it proposes a route.</p>
      </div>
      <figure className={styles.xrayField}>
        <img
          src="/assets/nexus-project-xray-2d.webp"
          width="1440"
          height="960"
          alt="Technical cutaway connecting a Roblox-like world to its affected project hierarchy"
          loading="lazy"
          decoding="async"
        />
        <figcaption>REQUEST SCOPE / INVENTORY AND ROUND STATE</figcaption>
      </figure>
      <ol className={styles.objectRecord} aria-label="Affected Roblox project objects">
        {OBJECT_RECORD.map((object) => (
          <li key={object.path}>
            <span>{object.path}</span>
            <strong>{object.state}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChangeRecord() {
  return (
    <section className={styles.changeRecord} aria-labelledby="change-record-heading">
      <div className={styles.codeRecord}>
        <header>
          <span>InventoryController.luau</span>
          <strong>+42 / −8</strong>
        </header>
        <pre aria-label="Illustrative Luau change"><code>{`local items = ItemDefinitions.getVisible(player)

view:render(items)
view:onEquip(function(itemId)
  equipRemote:FireServer(itemId)
end)`}</code></pre>
        <footer>
          <span className="nx-state-mark" data-state="success">EXPECTED SOURCE MATCHED</span>
          <span>SNAPSHOT / NXS-184</span>
        </footer>
      </div>
      <div className={styles.recordCopy}>
        <p className={styles.routeLabel}>CHANGE</p>
        <h2 id="change-record-heading">One request remains one reviewable change set.</h2>
        <p>Scripts, interface objects, and project state stay attached to the same request and recovery point.</p>
        <dl className={styles.changeSummary}>
          <div><dt>FILES</dt><dd>3 changed</dd></div>
          <div><dt>OBJECTS</dt><dd>1 ScreenGui updated</dd></div>
          <div><dt>RECOVERY</dt><dd>Selective restore available</dd></div>
        </dl>
      </div>
      <figure className={styles.assemblyField}>
        <img
          src="/assets/nexus-interface-assembly-2d.webp"
          width="1440"
          height="1080"
          alt="Inventory, HUD, navigation, and touch controls aligned into one Roblox interface"
          loading="lazy"
          decoding="async"
        />
        <figcaption>INTERFACE ASSEMBLY / MOBILE INPUT RETAINED</figcaption>
      </figure>
    </section>
  );
}

function TestRecord() {
  return (
    <section className={styles.testRecord} aria-labelledby="test-record-heading">
      <div className={styles.recordCopy}>
        <p className={styles.routeLabel}>TEST</p>
        <h2 id="test-record-heading">The first failure stays in the record.</h2>
        <p>The stale selection was found in Play mode, corrected without widening the request, and verified again.</p>
      </div>
      <ol className={styles.runLedger} aria-label="Playtest run record">
        {RUN_RECORD.map((entry) => (
          <li key={`${entry.time}-${entry.state}`}>
            <time>{entry.time}</time>
            <strong data-tone={entry.tone}>{entry.state}</strong>
            <span>{entry.detail}</span>
          </li>
        ))}
      </ol>
      <figure className={styles.debugField}>
        <img
          src="/assets/nexus-debug-trace-2d.webp"
          width="1440"
          height="960"
          alt="Roblox playtest scene with a diagnostic route connecting an interaction to a failed selection"
          loading="lazy"
          decoding="async"
        />
        <figcaption>PLAY MODE / RUN 2 / MOBILE VIEWPORT</figcaption>
      </figure>
    </section>
  );
}

function ReviewRecord() {
  return (
    <section className={styles.reviewRecord} aria-labelledby="review-record-heading">
      <div className={styles.reviewState}>
        <p>REVIEW / BUILD 184</p>
        <strong>READY FOR YOUR DECISION</strong>
        <span className="nx-state-mark" data-state="success">7 CHECKS PASSED</span>
      </div>
      <div className={styles.recordCopy}>
        <p className={styles.routeLabel}>REVIEW</p>
        <h2 id="review-record-heading">Keep the change, inspect one object, or restore the snapshot.</h2>
        <p>The final scope, Studio target, source match, test evidence, and recovery point remain visible together.</p>
      </div>
      <dl className={styles.reviewLedger}>
        <div><dt>STUDIO TARGET</dt><dd>Arcade District / Main place</dd></div>
        <div><dt>CHANGE SET</dt><dd>3 files / 1 ScreenGui</dd></div>
        <div><dt>SOURCE SAFETY</dt><dd>Expected hashes matched</dd></div>
        <div><dt>RECOVERY</dt><dd>Restore snapshot NXS-184</dd></div>
      </dl>
    </section>
  );
}

function BuildNarrative() {
  return (
    <section id="workflow" className={styles.workflow} aria-labelledby="workflow-heading">
      <header className={styles.narrativeHeading}>
        <p className={styles.routeLabel}>BUILD RECORD / 184</p>
        <h2 id="workflow-heading">One request. One legible record of work.</h2>
        <p>Project context, affected objects, code, failure, correction, and review change composition as the work changes.</p>
      </header>
      <ObjectReadRecord />
      <ChangeRecord />
      <TestRecord />
      <ReviewRecord />
    </section>
  );
}

function GenreAtlas({ selectedGenre, onSelect, onContinue }) {
  return (
    <section id="genres" className={styles.genreAtlas} aria-labelledby="genres-heading">
      <div className={styles.atlasHeading}>
        <p className={styles.routeLabel}>BUILD ATLAS</p>
        <h2 id="genres-heading">Change the world, not the workflow.</h2>
        <p>Choose a genre to place a concrete project brief into the composer. Nexus still reads, changes, tests, and records the real project.</p>
      </div>
      <figure className={styles.atlasWorld}>
        <img
          key={selectedGenre.id}
          src={selectedGenre.image}
          width="704"
          height="440"
          alt={selectedGenre.imageAlt}
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          <span>{selectedGenre.label.toUpperCase()} / SELECTED WORLD</span>
          <strong>{selectedGenre.outcome}</strong>
        </figcaption>
      </figure>
      <div className={styles.genreIndex} role="group" aria-label="Choose a Roblox game genre">
        {homepageGenres.map((genre, index) => (
          <button
            type="button"
            key={genre.id}
            aria-pressed={selectedGenre.id === genre.id}
            aria-controls="homepage-hero-prompt"
            data-home-genre={genre.id}
            onClick={() => onSelect(genre)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{genre.label}</strong>
            <small>{genre.description}</small>
          </button>
        ))}
      </div>
      <div className={styles.loadedBrief} aria-live="polite" aria-atomic="true">
        <div>
          <span>{selectedGenre.label.toUpperCase()} BRIEF LOADED</span>
          <p>{selectedGenre.prompt}</p>
        </div>
        <button type="button" className="nx-text-action" onClick={onContinue}>Continue in the composer /</button>
      </div>
    </section>
  );
}

function CreatorRecord() {
  return (
    <section id="grow" className={styles.creatorRecord} aria-labelledby="growth-heading">
      <div className={styles.creatorHeading}>
        <p className={styles.routeLabel}>AFTER THE BUILD</p>
        <h2 id="growth-heading">Make something players return to. Robux can follow—never promised.</h2>
        <p>Robux is an outcome, not a generate button. Retention, discovery, fair value, and update quality still determine results.</p>
      </div>
      <ol className={styles.growthLedger}>
        {homepageGrowthLoop.map((step, index) => (
          <li key={step.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.title}</strong>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ExampleRecord() {
  return (
    <section id="examples" className={styles.examples} aria-labelledby="examples-heading">
      <header>
        <p className={styles.routeLabel}>CURATED PROJECT RECORDS</p>
        <h2 id="examples-heading">Breadth without invented customer proof.</h2>
        <p>These are project briefs, not testimonials or earnings claims.</p>
      </header>
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
  );
}

function EndingRequest({ surface, navigate }) {
  return (
    <section className={styles.endingRequest} aria-labelledby="ending-request-heading">
      <div>
        <p className={styles.routeLabel}>NEXT REQUEST</p>
        <h2 id="ending-request-heading">What should change next?</h2>
        <nav aria-label="Continue exploring NexusRBX">
          <a href="/pricing">Access and usage</a>
          <a href="/docs">Read the project guide</a>
          <a href="/roblox-script-generator">Open a focused tool</a>
        </nav>
      </div>
      <HomepagePrompt
        surface={`${surface}_ending`}
        source={surface}
        navigateToAi={navigate}
        promptId="homepage-ending-prompt"
        submitLabel="Open workspace"
        helperText="Your request is saved locally before the workspace opens."
        showLabel
      />
    </section>
  );
}

export default function HomepageV2Content({ surface = "homepage", navigate }) {
  const initialGenre = homepageGenres.find((genre) => genre.id === "horror") || homepageGenres[0];
  const [selectedGenreId, setSelectedGenreId] = useState(initialGenre.id);
  const [promptSuggestion, setPromptSuggestion] = useState({ value: homepageHeroPrompt, version: 0 });
  const heroPromptRef = useRef(null);
  const selectedGenre = useMemo(
    () => homepageGenres.find((genre) => genre.id === selectedGenreId) || initialGenre,
    [initialGenre, selectedGenreId],
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
        <RequestOpening
          surface={surface}
          navigate={navigate}
          promptSuggestion={promptSuggestion}
          heroPromptRef={heroPromptRef}
        />
        <BuildNarrative />
        <GenreAtlas selectedGenre={selectedGenre} onSelect={chooseGenre} onContinue={continueWithGenre} />
        <CreatorRecord />
        <ExampleRecord />
        <section className={styles.focusedTools} aria-labelledby="focused-tools-heading">
          <div>
            <p className={styles.routeLabel}>FOCUSED TASKS</p>
            <h2 id="focused-tools-heading">Use one tool when the whole project is not required.</h2>
          </div>
          <nav aria-label="Focused Roblox creation tools">
            {homepageFocusedTools.map((tool) => <a href={tool.href} key={tool.href}>{tool.label} /</a>)}
          </nav>
        </section>
        <EndingRequest surface={surface} navigate={navigate} />
      </main>
      <HomepageFooter />
    </div>
  );
}
