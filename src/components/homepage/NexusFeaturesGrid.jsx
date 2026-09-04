import React from "react";
import styles from "./HomepageCinematic.module.css";

const FEATURES = [
  {
    icon: "⚡",
    title: "Project-Aware AI Scripter",
    description:
      "Reads your current place object tree, shared Remotes, and ModuleScripts so generated Luau is grounded in your actual game structure.",
  },
  {
    icon: "🔌",
    title: "Roblox Studio Bridge Sync",
    description:
      "Pairs directly with Roblox Studio via a local bridge plugin. Review proposed changes before sending them straight to your place.",
  },
  {
    icon: "📜",
    title: "Idiomatic Luau Generation",
    description:
      "Produces clean ServerScript, LocalScript, and ModuleScript code formatted according to modern Roblox engine best practices.",
  },
  {
    icon: "🛡️",
    title: "Snapshot Safety & Rollbacks",
    description:
      "Creates an automatic state snapshot before every change set. Revert any modification instantly with 1-click recovery.",
  },
  {
    icon: "📱",
    title: "Mobile & Touch Optimized",
    description:
      "Built-in support for touch joysticks, mobile HUD scaling, and cross-platform input handlers so your game works on every device.",
  },
  {
    icon: "📦",
    title: "Asset & Media Workspace",
    description:
      "Organizes generated decals, 2D icons, UI buttons, and project media in one centralized library for easy reuse.",
  },
];

export default function NexusFeaturesGrid() {
  return (
    <section id="workflow" className={styles.featuresSection} aria-labelledby="features-heading">
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}>CORE CAPABILITIES</span>
        <h2 id="features-heading">Built for serious Roblox developers</h2>
        <p>
          From single script fixes to multi-file game systems, Nexus connects AI generation with live Roblox Studio workflows.
        </p>
      </div>

      <div className={styles.featuresGrid}>
        {FEATURES.map((feat) => (
          <article key={feat.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{feat.icon}</div>
            <h3>{feat.title}</h3>
            <p>{feat.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
