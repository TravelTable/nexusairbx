"use client";

import { useEffect, useState } from "react";
import {
  Apple,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Copy,
  Download,
  Globe,
  Link2,
  Monitor,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shadcn/tooltip";
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
    shortName: "macOS",
    icon: Apple,
    compatibility: "Apple Silicon and Intel Macs",
    machines: ["Apple Silicon (M1 or newer)", "Intel Mac"],
    signing: "Developer ID signed and Apple notarized",
    steps: [
      { title: "Open", detail: "Open the downloaded DMG." },
      { title: "Install", detail: "Drag NexusRBX Connector into Applications." },
      { title: "Pair", detail: "Open the connector and pair it once in your browser." },
    ],
  },
  windows: {
    code: "WIN / X64",
    name: "Windows (64-bit)",
    shortName: "Windows",
    icon: Monitor,
    compatibility: "Windows 10 and 11 · Intel or AMD x64",
    machines: ["Intel or AMD x64 PC"],
    signing: "Unsigned installer — Windows may show “Unknown publisher”",
    steps: [
      { title: "Install", detail: "Run the downloaded installer." },
      { title: "Approve", detail: "If SmartScreen appears, select More info, then Run anyway." },
      { title: "Pair", detail: "Open the connector and pair it once in your browser." },
    ],
  },
};

function DevTip({ label, children, side = "top" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={styles.devTip} aria-label={label}>
          <CircleHelp aria-hidden="true" />
          <span className={styles.srOnly}>{children}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} className={styles.devTipContent}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function PlatformTabs({ selectedPlatform, detectedPlatform, onChange }) {
  const moveFocus = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
    const current = tabs.indexOf(document.activeElement);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    event.preventDefault();
    tabs[next]?.focus();
  };

  return (
    <div className={styles.platformTabs} role="tablist" aria-label="Connector platform" onKeyDown={moveFocus}>
      {Object.entries(PLATFORM_COPY).map(([id, copy]) => {
        const Icon = copy.icon;
        const active = selectedPlatform === id;
        return (
          <button
            key={id}
            id={`platform-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="connector-download-panel"
            aria-label={`View ${copy.name} download`}
            tabIndex={active ? 0 : -1}
            className={styles.platformTab}
            data-active={active ? "true" : "false"}
            onClick={() => onChange(id)}
          >
            <span className={styles.platformIcon}><Icon aria-hidden="true" /></span>
            <span>
              <strong>{copy.shortName}</strong>
              <small>{copy.code}</small>
            </span>
            {detectedPlatform === id ? <span className={styles.detectedDot} title="Detected" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function DownloadControl({ platform, release, status, onDownload }) {
  const copy = PLATFORM_COPY[platform];
  if (release) {
    return (
      <a
        className={styles.primaryDownload}
        href={release.url}
        aria-label={`Download ${copy.name}`}
        onClick={() => onDownload(platform)}
      >
        <Download aria-hidden="true" />
        <span>Download</span>
        <ArrowRight aria-hidden="true" />
      </a>
    );
  }

  return (
    <button
      className={styles.primaryDownload}
      type="button"
      disabled
      aria-label={status === "loading" ? `Checking ${copy.name} release` : `${copy.name} unavailable`}
    >
      {status === "loading" ? <RefreshCw className={styles.spinner} aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
      <span>{status === "loading" ? "Checking release" : "Unavailable"}</span>
    </button>
  );
}

function ConnectionDiagram() {
  return (
    <aside className={styles.bridgeCard} aria-label="Local bridge connection">
      <header className={styles.bridgeHeader}>
        <span>LOCAL BRIDGE</span>
        <span className={styles.liveStatus}><span aria-hidden="true" /> On-device</span>
        <DevTip label="How the local bridge works" side="left">
          Pair once in your browser. The connector keeps Nexus beside Studio without sending your full place source by default.
        </DevTip>
      </header>
      <div className={styles.bridgeFlow}>
        <div className={styles.bridgeNode}><Globe aria-hidden="true" /><strong>Nexus</strong></div>
        <ArrowRight className={styles.bridgeArrow} aria-hidden="true" />
        <div className={`${styles.bridgeNode} ${styles.bridgeNodeActive}`}><ShieldCheck aria-hidden="true" /><strong>Connector</strong></div>
        <ArrowRight className={styles.bridgeArrow} aria-hidden="true" />
        <div className={styles.bridgeNode}><Monitor aria-hidden="true" /><strong>Studio</strong></div>
      </div>
    </aside>
  );
}

function InstallerPanel({ platform, release, status, detectedPlatform, onDownload, checksumCopied, onCopyChecksum }) {
  const copy = PLATFORM_COPY[platform];
  const Icon = copy.icon;
  const verified = Boolean(release);

  return (
    <article
      id="connector-download-panel"
      className={styles.installerPanel}
      role="tabpanel"
      aria-labelledby={`platform-tab-${platform}`}
    >
      <header className={styles.installerHeader}>
        <span className={styles.installerIcon}><Icon aria-hidden="true" /></span>
        <div>
          <span className={styles.platformCode}>{copy.code}</span>
          <h2>{copy.name}</h2>
        </div>
        {platform === detectedPlatform ? <span className={styles.detectedBadge}>Detected for this machine</span> : null}
      </header>

      <div className={styles.releaseFacts} aria-label="Release summary">
        <div><span>Version</span><strong>{release ? `v${release.version}` : "—"}</strong></div>
        <div><span>Size</span><strong>{release ? formatCompanionFileSize(release.size) : "—"}</strong></div>
        <div data-tone={verified ? "success" : "warning"}>
          {verified ? <ShieldCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
          <strong>{verified ? "Verified" : status === "loading" ? "Checking" : "Offline"}</strong>
        </div>
      </div>

      <div className={styles.downloadRow}>
        <DownloadControl platform={platform} release={release} status={status} onDownload={onDownload} />
        <div className={styles.tipRail} aria-label="Installer details">
          <DevTip label={`Compatibility details for ${copy.name}`}>
            <span>{copy.compatibility}</span>
            {copy.machines.map((machine) => <span key={machine}>{machine}</span>)}
          </DevTip>
          <DevTip label={`Signing details for ${copy.name}`}><span>{copy.signing}</span></DevTip>
          <DevTip label="Release policy"><span>Only the current verified release is offered from this page.</span></DevTip>
        </div>
      </div>

      {platform === "windows" ? (
        <div className={styles.compactNotice} data-tone="warning">
          <TriangleAlert aria-hidden="true" />
          <strong>Unknown publisher</strong>
          <DevTip label="Windows SmartScreen steps">
            <span>Download only from this page. If SmartScreen appears, select More info, confirm NexusRBX Connector, then choose Run anyway.</span>
          </DevTip>
        </div>
      ) : (
        <div className={styles.compactNotice} data-tone="success">
          <CheckCircle2 aria-hidden="true" />
          <strong>Signed &amp; notarized</strong>
          <DevTip label="Apple verification details"><span>Verified by Apple before distribution.</span></DevTip>
        </div>
      )}

      <div className={styles.checksumRow}>
        <ShieldCheck aria-hidden="true" />
        <code>{release?.sha256 ? `${release.sha256.slice(0, 10)}…${release.sha256.slice(-8)}` : "Checksum unavailable"}</code>
        <DevTip label="About the SHA-256 checksum">
          <span>Use the SHA-256 checksum to verify the downloaded installer matches the published release.</span>
        </DevTip>
        <button type="button" disabled={!release?.sha256} onClick={onCopyChecksum} aria-label="Copy SHA-256 checksum">
          {checksumCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{checksumCopied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </article>
  );
}

function SetupSteps({ steps }) {
  const icons = [Download, Monitor, Link2];
  return (
    <section className={styles.setupSection} aria-labelledby="setup-title">
      <header>
        <span>SETUP</span>
        <h2 id="setup-title">Three clicks to Studio.</h2>
        <DevTip label="About automatic updates">
          <span>The connector checks the verified release feed, downloads updates in the background, and installs them when you restart or quit the app.</span>
        </DevTip>
      </header>
      <ol>
        {steps.map((step, index) => {
          const Icon = icons[index];
          return (
            <li key={step.title}>
              <span className={styles.stepIcon}><Icon aria-hidden="true" /></span>
              <strong>{step.title}</strong>
              <DevTip label={`${step.title} instructions`}><span>{step.detail}</span></DevTip>
            </li>
          );
        })}
      </ol>
      <a href="/docs/troubleshooting">Troubleshooting <ArrowRight aria-hidden="true" /></a>
    </section>
  );
}

export default function DownloadsContent() {
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("windows");
  const [status, setStatus] = useState("loading");
  const [manifest, setManifest] = useState(null);
  const [checksumCopied, setChecksumCopied] = useState(false);

  useEffect(() => {
    const platform = detectCompanionPlatform({
      userAgent: window.navigator.userAgent,
      platform: window.navigator.userAgentData?.platform || window.navigator.platform,
    });
    setDetectedPlatform(platform);
    if (platform) setSelectedPlatform(platform);
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

  const selectedCopy = PLATFORM_COPY[selectedPlatform];
  const selectedRelease = manifest ? { ...manifest.platforms[selectedPlatform], version: manifest.version } : null;

  function handleDownload(platform) {
    void trackProductEvent("connector_download_selected", {
      platform,
      recommended: platform === detectedPlatform,
      version: manifest?.version,
    }, { dedupe: false });
  }

  function handlePlatformChange(platform) {
    setSelectedPlatform(platform);
    setChecksumCopied(false);
  }

  async function handleCopyChecksum() {
    if (!selectedRelease?.sha256 || !window.navigator.clipboard?.writeText) return;
    try {
      await window.navigator.clipboard.writeText(selectedRelease.sha256);
      setChecksumCopied(true);
    } catch (_) {
      setChecksumCopied(false);
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <main className={styles.main} id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.phase}>DESKTOP CONNECTOR</p>
            <h1>Nexus <span>↔</span> Roblox Studio.</h1>
            <p className={styles.lead}>One local bridge. Pair once.</p>

            <PlatformTabs selectedPlatform={selectedPlatform} detectedPlatform={detectedPlatform} onChange={handlePlatformChange} />
            <InstallerPanel
              platform={selectedPlatform}
              release={selectedRelease}
              status={status}
              detectedPlatform={detectedPlatform}
              onDownload={handleDownload}
              checksumCopied={checksumCopied}
              onCopyChecksum={handleCopyChecksum}
            />
          </div>
          <ConnectionDiagram />
        </section>

        {status === "unavailable" ? (
          <div role="alert" className={styles.alert}>
            <TriangleAlert aria-hidden="true" />
            <strong>Downloads temporarily unavailable</strong>
            <DevTip label="Why downloads are unavailable" side="left">
              <span>We could not verify the current release feed, so installers remain disabled. Please try again shortly.</span>
            </DevTip>
          </div>
        ) : null}

        <SetupSteps steps={selectedCopy.steps} />
        <p className={styles.disclaimer}>NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
      </main>
    </TooltipProvider>
  );
}
