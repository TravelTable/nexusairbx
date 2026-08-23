"use client";

import { useEffect, useMemo, useState } from "react";
import {
  detectCompanionPlatform,
  fetchCompanionManifest,
  formatCompanionFileSize,
} from "../../lib/companionDownloads";
import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./DownloadsLedger.module.css";

const PLATFORM_COPY = {
  mac: {
    code: "MAC / UNIVERSAL",
    name: "macOS (Universal)",
    detail: "One installer for Apple Silicon and Intel Macs",
    machines: ["Apple Silicon (M1 or newer)", "Intel Mac"],
    signing: "Developer ID signed and Apple notarized",
    steps: ["Open the DMG", "Drag NexusRBX Connector to Applications", "Open it and pair in your browser"],
  },
  windows: {
    code: "WIN / X64",
    name: "Windows (64-bit)",
    detail: "For Windows 10 and 11 on Intel or AMD PCs",
    machines: ["Intel or AMD x64 PC"],
    signing: "Unsigned installer — Windows may show “Unknown publisher”",
    steps: ["Run the downloaded installer", "If SmartScreen appears, select More info", "Choose Run anyway, then open and pair in your browser"],
  },
};

function ReleaseRecord({ platform, release, recommended, loading, onDownload }) {
  const copy = PLATFORM_COPY[platform];
  const enabled = Boolean(release);
  return (
    <article className={styles.release}>
      <header>
        <span>{copy.code}</span>
        {recommended ? <small>Recommended</small> : <small>Alternate machine</small>}
        <h2>{copy.name}</h2>
        <p>{copy.detail}</p>
      </header>

      <dl className={styles.facts}>
        <div><dt>Version</dt><dd>{release ? `v${release.version}` : "—"}</dd></div>
        <div><dt>File size</dt><dd>{release ? formatCompanionFileSize(release.size) : "—"}</dd></div>
        <div>
          <dt>Machines</dt>
          <dd>{copy.machines.map((machine, index) => (
            <span key={machine}>{index ? " · " : ""}<span>{machine}</span></span>
          ))}</dd>
        </div>
        <div data-tone={release?.verification === "unsigned" ? "warning" : "success"}>
          <dt>Verification</dt><dd>{enabled ? copy.signing : "Release verification required"}</dd>
        </div>
      </dl>

      <div className={styles.releaseAction}>
        {enabled ? (
          <a href={release.url} aria-label={`Download ${copy.name}`} onClick={() => onDownload(platform)}>Download {copy.name} <span aria-hidden="true">→</span></a>
        ) : (
          <button type="button" disabled>
            {loading ? "Checking release…" : `${copy.name} unavailable`}
          </button>
        )}
        <details>
          <summary>SHA-256 checksum</summary>
          <code>{release?.sha256 || "Available after release verification"}</code>
        </details>
      </div>
    </article>
  );
}

export default function DownloadsContent() {
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [status, setStatus] = useState("loading");
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    const platform = detectCompanionPlatform({
      userAgent: window.navigator.userAgent,
      platform: window.navigator.userAgentData?.platform || window.navigator.platform,
    });
    setDetectedPlatform(platform);
    void trackProductEvent("downloads_page_viewed", {}, { dedupeKey: "downloads" });
    void trackProductEvent("connector_platform_detected", { platform: platform || "unknown" }, { dedupeKey: `connector-platform:${platform || "unknown"}` });

    const controller = new AbortController();
    fetchCompanionManifest({ signal: controller.signal })
      .then((nextManifest) => {
        setManifest(nextManifest);
        setStatus("ready");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setStatus("unavailable");
      });
    return () => controller.abort();
  }, []);

  const orderedPlatforms = useMemo(() => (
    detectedPlatform === "windows" ? ["windows", "mac"] : ["mac", "windows"]
  ), [detectedPlatform]);

  function handleDownload(platform) {
    void trackProductEvent("connector_download_selected", {
      platform,
      recommended: platform === detectedPlatform,
      version: manifest?.version,
    }, { dedupe: false });
  }

  const selectedCopy = PLATFORM_COPY[detectedPlatform || "mac"];

  return (
    <main className={styles.main} id="main-content">
      <section className={styles.intro}>
        <div>
          <p className={styles.phase}>RELEASE LEDGER / CONNECTOR</p>
          <h1>Put Nexus beside Roblox Studio.</h1>
        </div>
        <div className={styles.introCopy}>
          <p>Install the desktop connector, pair once in the browser, then work through Studio MCP with a verifiable local bridge.</p>
          <dl>
            <div>
              <dt>Release feed</dt>
              <dd>{manifest ? `Current version: v${manifest.version}` : status === "loading" ? "Checking current version…" : "Unavailable"}</dd>
            </div>
            <div><dt>Detected machine</dt><dd>{detectedPlatform ? selectedCopy.name : "Not identified"}</dd></div>
            <div><dt>Release policy</dt><dd>Only the current release is shown. Older connector versions are not offered.</dd></div>
          </dl>
        </div>
      </section>

      {status === "unavailable" ? (
        <div role="alert" className={styles.alert}>
          <strong>Downloads temporarily unavailable</strong>
          <span>Installers remain closed until checksum and startup checks pass, plus signing and notarization for macOS.</span>
        </div>
      ) : null}

      <section className={styles.releases} aria-label="Connector installers">
        {orderedPlatforms.map((platform) => (
          <ReleaseRecord
            key={platform}
            platform={platform}
            release={manifest ? { ...manifest.platforms[platform], version: manifest.version } : null}
            recommended={platform === detectedPlatform}
            loading={status === "loading"}
            onDownload={handleDownload}
          />
        ))}
      </section>

      <section className={styles.operations} aria-labelledby="connector-operations-title">
        <header>
          <p className={styles.phase}>AFTER DOWNLOAD</p>
          <h2 id="connector-operations-title">Install, pair, maintain</h2>
        </header>
        <ol>
          {selectedCopy.steps.map((step, index) => (
            <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>
          ))}
        </ol>
        <div>
          <h3>Automatic updates</h3>
          <p>Automatic updates are on by default. The connector checks the verified release feed, downloads updates in the background, and installs them when you restart or quit the app.</p>
          <a href="/docs/troubleshooting">Open the troubleshooting record →</a>
        </div>
      </section>

      <p className={styles.disclaimer}>NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
    </main>
  );
}
