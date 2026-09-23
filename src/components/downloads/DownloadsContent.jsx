"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";

import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./DownloadsLedger.module.css";

const STORE_URL = "https://create.roblox.com/store/asset/83865885181263/NexusRBX-Ai";

const INSTALL_STEPS = [
  {
    title: "Open the listing",
    body: "Use Open in Studio. It goes to the official NexusRBX Ai plugin on the Roblox Creator Store.",
  },
  {
    title: "Add it to your account",
    body: "Use the install, get, or add control Roblox shows, then wait until the plugin is on your account.",
  },
  {
    title: "Open it beside the place",
    body: "Restart Studio if it was already open. Choose Plugins, open NexusRBX, and reconnect. Your projects stay saved.",
  },
];

const CAPABILITIES = [
  {
    title: "Connection",
    body: "See whether this Studio window is paired before any work is sent.",
  },
  {
    title: "Changes",
    body: "Review the approved change set before it lands in the open place.",
  },
  {
    title: "Activity",
    body: "Follow what the plugin is doing without leaving the place you have open.",
  },
  {
    title: "Verification",
    body: "Check the result in Studio after Nexus Workspace finishes a change.",
  },
];

const RECOVERY = [
  ["Studio was already open", "Restart Roblox Studio after the plugin is added."],
  ["Wrong account", "Sign Studio into the same Roblox account that installed the plugin."],
  ["Plugin disabled", "Open Studio plugin management and enable NexusRBX."],
  ["Still missing", "Return to the Creator Store listing and confirm the install finished."],
];

export default function DownloadsContent() {
  useEffect(() => {
    void trackProductEvent("downloads_page_viewed", {}, { dedupeKey: "downloads" });
  }, []);

  return (
    <main className={styles.main} id="main-content">
      <header id="studio-plugin" className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Studio plugin</p>
          <h1>NexusRBX Ai</h1>
          <p className={styles.lead}>
            The Studio-side companion to Nexus Workspace. It stays beside your open place so you can see the connection, the changes, and the result.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href={STORE_URL} target="_blank" rel="noreferrer">
              Open in Studio
              <ExternalLink aria-hidden="true" size={16} />
            </a>
            <a className={styles.secondary} href="#install">Install steps</a>
          </div>
          <p className={styles.meta}>Creator Store plugin · @Skibididoodad9 · Updated Sep 7, 2026</p>
        </div>
        <div className={styles.markPlate} aria-hidden="true">
          <svg viewBox="0 0 80 80" className={styles.mark}>
            <defs>
              <linearGradient id="nexusPluginMark" x1="16" y1="66" x2="66" y2="14" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#7b5cff" />
                <stop offset="0.55" stopColor="#5b7cff" />
                <stop offset="1" stopColor="#3ec8ff" />
              </linearGradient>
            </defs>
            <path fill="url(#nexusPluginMark)" d="M20 64V16h13.4l15.2 26.2V16H60v48H46.6L31.4 37.8V64H20Z" />
          </svg>
        </div>
      </header>

      <section id="install" className={styles.install} aria-labelledby="install-title">
        <div className={styles.sectionIntro}>
          <h2 id="install-title">Install</h2>
          <p>Roblox hosts the plugin. This page does not hand out a plugin file.</p>
        </div>
        <ol>
          {INSTALL_STEPS.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.work} aria-labelledby="work-title">
        <div className={styles.sectionIntro}>
          <h2 id="work-title">Beside the open place</h2>
          <p>Once NexusRBX is open in Studio, the plugin is the surface for the work you already approved in Nexus Workspace.</p>
        </div>
        <ul>
          {CAPABILITIES.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.recover} aria-labelledby="recover-title">
        <h2 id="recover-title">If it does not appear</h2>
        <dl>
          {RECOVERY.map(([check, action]) => (
            <div key={check}>
              <dt>{check}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className={styles.disclaimer}>NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
    </main>
  );
}
