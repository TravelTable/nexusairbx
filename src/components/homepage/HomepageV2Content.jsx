"use client";

import { useEffect, useRef, useState } from "react";
import { homepageFocusedTools } from "../../content/homepageV2";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import ConnectorReleaseCard from "./ConnectorReleaseCard";
import VideoShowcase from "./VideoShowcase";
import NexusFeaturesGrid from "./NexusFeaturesGrid";
import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./HomepageCinematic.module.css";

const HERO_WORDS = ["playable", "testable", "reviewable", "real"];
const HERO_LETTER_COLORS = ["#eca8d6", "#b591f3", "#81c3f9", "#a2d8a4", "#f8ba48"];

const STACK_ITEMS = [
  ["01", "Project-aware agent", "Reads the current place and keeps work grounded in the real object tree."],
  ["02", "Luau generation", "Creates focused client, server, module, and interface code with visible scope."],
  ["03", "Studio bridge", "Moves approved work into Roblox Studio and reports structured results back."],
  ["04", "Review and recovery", "Keeps change sets, source matches, snapshots, and restore paths together."],
  ["05", "Asset workspace", "Organizes generated and uploaded project media in one reusable library."],
  ["06", "Build history", "Preserves the request, decisions, failures, corrections, and final evidence."],
];

const FAQ_ITEMS = [
  [
    "Can Nexus work with an existing Roblox game?",
    "Yes. The Studio workflow reads the current project first, then scopes changes around what already exists.",
  ],
  [
    "Do I need to know Luau?",
    "No. Describe the outcome in plain language, inspect the generated work, and use explanations whenever you want to learn more.",
  ],
  [
    "Can I review changes before they reach Studio?",
    "Yes. Reviewable change sets and explicit Studio actions keep the work visible before it is applied.",
  ],
  [
    "What can I build?",
    "Gameplay systems, interfaces, round logic, inventories, focused scripts, project assets, and larger multi-step builds.",
  ],
];

async function trackHomepageProductEvent(name, properties, options) {
  try {
    await trackProductEvent(name, properties, options);
  } catch (_) {
    // Public navigation remains usable without analytics.
  }
}

function AnimatedHeroPromise() {
  const [wordIndex, setWordIndex] = useState(0);
  const [morphing, setMorphing] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const intervalId = window.setInterval(() => setMorphing(true), 3000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!morphing) return undefined;
    const timeoutId = window.setTimeout(() => {
      setWordIndex((current) => (current + 1) % HERO_WORDS.length);
      setMorphing(false);
    }, 1150);
    return () => window.clearTimeout(timeoutId);
  }, [morphing]);

  const renderLetters = (word, direction) => (
    <span className={styles.morphWord} data-direction={direction} aria-hidden="true">
      {[...word].map((letter, index) => (
        <span
          key={`${direction}-${letter}-${index}`}
          style={{
            "--letter-delay": `${index * 42}ms`,
            "--letter-color": HERO_LETTER_COLORS[index % HERO_LETTER_COLORS.length],
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );

  const currentWord = HERO_WORDS[wordIndex];
  const nextWord = HERO_WORDS[(wordIndex + 1) % HERO_WORDS.length];

  return (
    <p aria-label={`Build your Roblox game. Make it ${currentWord}.`} className={styles.heroPromise}>
      <span className={styles.heroHeadingLine}>Build your Roblox game.</span>
      <span className={styles.heroHeadingLine}>
        Make it{" "}
        <span className={styles.morphStage}>
          {renderLetters(currentWord, morphing ? "out" : "rest")}
          {morphing ? renderLetters(nextWord, "in") : null}
        </span>
      </span>
    </p>
  );
}

function Hero({ surface, navigate, inputRef }) {
  return (
    <section className={styles.hero} aria-labelledby="homepage-hero-heading" data-home-hero>
      <div className={styles.heroCopy}>
        <h1 id="homepage-hero-heading" className={styles.heroHeading}>
          AI Roblox Script Generator <span>and Studio Agent</span>
        </h1>
        <div className={styles.connectorReleaseSlot}>
          <ConnectorReleaseCard />
        </div>
        <AnimatedHeroPromise />
        <p>
          Talk to your project in plain language. Plan systems, generate Luau, review changes, and move approved work
          into Studio.
        </p>
        <HomepagePrompt
          surface={surface}
          source={surface}
          navigateToAi={navigate}
          className={styles.heroPrompt}
          promptId="homepage-hero-prompt"
          suggestedPrompt="Build a round-based horror game with simple mobile controls and rooms that shift after each round."
          suggestionVersion={0}
          submitLabel="Start building"
          helperText="Your request is saved before the workspace opens."
          inputRef={inputRef}
          showLabel
        />
        <div className={styles.heroLinks}>
          <a href="/ai">Open workspace</a>
          <a href="/pricing">View pricing</a>
        </div>
      </div>
      <div className={styles.heroMedia}>
        <img
          className={styles.heroImage}
          src="/assets/nexusrbx-roblox-gameplay-hero.png"
          alt="Roblox character running beside a simple block on a floating grass platform"
        />
      </div>
    </section>
  );
}

function FocusedTools() {
  return (
    <section id="product" className={styles.focusedTools} aria-labelledby="focused-tools-heading">
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}>FOCUSED ROBLOX TOOLS</span>
        <h2 id="focused-tools-heading">Start with the scripting task you need.</h2>
        <p>
          Choose a focused generator for one job, or use the Studio agent when the change spans a larger Roblox project.
        </p>
      </div>
      <nav className={styles.focusedToolsGrid} aria-label="Focused Roblox creation tools">
        {homepageFocusedTools.map((tool) => (
          <a href={tool.href} key={tool.href}>
            {tool.label}
            <span aria-hidden="true">/</span>
          </a>
        ))}
      </nav>
    </section>
  );
}

function StackSection() {
  return (
    <section id="context" className={styles.stackSection} aria-labelledby="stack-heading">
      <div className={styles.sectionHeading}>
        <h2 id="stack-heading">One workspace. Your whole Roblox build stack.</h2>
        <p>
          Project context, creation, Studio actions, assets, review, and recovery stay connected to the same body of
          work.
        </p>
      </div>
      <div className={styles.stackGrid}>
        {STACK_ITEMS.map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className={styles.faqSection} aria-labelledby="faq-heading">
      <div className={styles.sectionHeading}>
        <h2 id="faq-heading">Frequently asked questions</h2>
      </div>
      <div className={styles.faqList}>
        {FAQ_ITEMS.map(([question, answer], index) => (
          <details key={question} open={index === 0}>
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ surface, navigate }) {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-heading">
      <div>
        <span className={styles.eyebrow}>START WITH ONE REQUEST</span>
        <h2 id="final-cta-heading">Build more of the game you actually want to ship.</h2>
        <p>Bring a new idea or connect an existing project. Nexus keeps the work visible from request to review.</p>
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
  const heroPromptRef = useRef(null);
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () =>
        void trackHomepageProductEvent(
          "landing_page_view",
          { landing_page: "/", landing_page_category: "homepage" },
          { dedupeKey: "homepage" }
        ),
      500
    );
    return () => window.clearTimeout(timeoutId);
  }, []);
  return (
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1}>
        <Hero surface={surface} navigate={navigate} inputRef={heroPromptRef} />
        <VideoShowcase />
        <NexusFeaturesGrid />
        <FocusedTools />
        <StackSection />
        <FaqSection />
        <FinalCta surface={surface} navigate={navigate} />
      </main>
      <HomepageFooter />
    </div>
  );
}
