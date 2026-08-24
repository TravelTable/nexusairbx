"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Globe,
  Monitor,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
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
    detail: "One installer for Apple Silicon and Intel Macs",
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
    detail: "For Windows 10 and 11 on Intel or AMD PCs",
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

function ConnectionDiagram() {
  return (
    <div className={styles.bridgeCard} aria-label="Nexus workspace connects to Roblox Studio through the local desktop connector">
      <div className={styles.bridgeHeader}>
        <span>LOCAL BRIDGE</span>
        <span className={styles.liveStatus}><span aria-hidden="true" /> Runs on your machine</span>
      </div>
      <div className={styles.bridgeFlow}>
        <div className={styles.bridgeNode}>
          <Globe aria-hidden="true" />
          <span>Nexus</span>
          <small>Browser workspace</small>
        </div>
        <div className={styles.bridgeLine} aria-hidden="true"><span /></div>
        <div className={`${styles.bridgeNode} ${styles.bridgeNodeActive}`}>
          <ShieldCheck aria-hidden="true" />
          <span>Connector</span>
          <small>Verifiable local bridge</small>
        </div>
        <div className={styles.bridgeLine} aria-hidden="true"><span /></div>
        <div className={styles.bridgeNode}>
          <Monitor aria-hidden="true" />
          <span>Roblox Studio</span>
          <small>Studio MCP</small>
        </div>
      </div>
      <p>Pair once in your browser. The connector keeps Nexus beside Studio without sending your full place source by default.</p>
    </div>
  );
}

function DownloadControl({ platform, release, status, onDownload, className }) {
  const copy = PLATFORM_COPY[platform];
  if (release) {
    return (
      <a
        className={className}
        href={release.url}
        aria-label={`Download ${copy.name}`}
        onClick={() => onDownload(platform)}
      >
        <Download aria-hidden="true" />
        <span>Download for {copy.shortName}</span>
        <ArrowRight aria-hidden="true" />
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      disabled
      aria-label={status === "loading" ? `Checking ${copy.name} release` : `${copy.name} unavailable`}
    >
      {status === "loading" ? <RefreshCw className={styles.spinner} aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
      <span>{status === "loading" ? "Checking current release…" : "Downloads unavailable"}</span>
    </button>
  );
}

function WindowsDisclosure() {
  return (
    <details className={styles.platformNotice}>
      <summary>
        <TriangleAlert aria-hidden="true" />
        <span>
          <strong>Windows may show “Unknown publisher”</strong>
          <small>This release is currently unsigned. See the safe SmartScreen steps.</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className={styles.noticeBody}>
        <p>Download only from this page and compare the SHA-256 checksum below. If SmartScreen appears:</p>
        <ol>
          <li>Select <strong>More info</strong>.</li>
          <li>Confirm the app is <strong>NexusRBX Connector</strong>.</li>
          <li>Select <strong>Run anyway</strong>.</li>
        </ol>
        <a href="/docs/troubleshooting">Read the complete troubleshooting guide <ArrowRight aria-hidden="true" /></a>
      </div>
    </details>
  );
}

function InstallerDetails({
  platform,
  release,
  status,
  detectedPlatform,
  onDownload,
  onPlatformChange,
  checksumCopied,
  onCopyChecksum,
}) {
  const copy = PLATFORM_COPY[platform];
  const alternatePlatform = platform === "windows" ? "mac" : "windows";
  const alternateCopy = PLATFORM_COPY[alternatePlatform];
  const isDetected = platform === detectedPlatform;

  return (
    <article className={styles.installerCard}>
      <div className={styles.installerOverview}>
        <div className={styles.platformEyebrow}>
          <span>{copy.code}</span>
          <small>{isDetected ? "Detected for this machine" : detectedPlatform ? "Alternate platform" : "Selected platform"}</small>
        </div>
        <h3>{copy.name}</h3>
        <p>{copy.detail}</p>
        <div className={styles.verificationStatus} data-tone={platform === "windows" ? "warning" : "success"}>
          {platform === "windows" ? <TriangleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{copy.signing}</span>
        </div>
      </div>

      <dl className={styles.facts}>
        <div><dt>Version</dt><dd>{release ? `v${release.version}` : "—"}</dd></div>
        <div><dt>File size</dt><dd>{release ? formatCompanionFileSize(release.size) : "—"}</dd></div>
        <div><dt>Compatibility</dt><dd>{copy.compatibility}</dd></div>
        <div>
          <dt>Machines</dt>
          <dd>{copy.machines.map((machine, index) => (
            <span key={machine}>{index ? " · " : ""}<span>{machine}</span></span>
          ))}</dd>
        </div>
      </dl>

      <div className={styles.installerActions}>
        {release ? (
          <a
            className={styles.secondaryDownload}
            href={release.url}
            aria-label={`Download ${copy.name} from installer details`}
            onClick={() => onDownload(platform)}
          >
            <Download aria-hidden="true" /> Download installer
          </a>
        ) : (
          <button type="button" className={styles.secondaryDownload} disabled>
            {status === "loading" ? "Checking release…" : "Installer unavailable"}
          </button>
        )}
        <button
          type="button"
          className={styles.alternatePlatform}
          onClick={() => onPlatformChange(alternatePlatform)}
        >
          View {alternateCopy.name} download <ArrowRight aria-hidden="true" />
        </button>
      </div>

      <details className={styles.checksum}>
        <summary>
          <ShieldCheck aria-hidden="true" />
          <span>SHA-256 checksum</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div>
          <code>{release?.sha256 || "Available after release verification"}</code>
          <button type="button" disabled={!release?.sha256} onClick={onCopyChecksum}>
            {checksumCopied ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {checksumCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </details>
      <p className={styles.releasePolicy}>Only the current verified release is offered from this page.</p>
    </article>
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
  const selectedRelease = manifest
    ? { ...manifest.platforms[selectedPlatform], version: manifest.version }
    : null;

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
    <main className={styles.main} id="main-content">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.phase}>DESKTOP CONNECTOR</p>
          <h1>Connect Nexus to <span>Roblox Studio.</span></h1>
          <p className={styles.lead}>Install the desktop connector, pair it once, and work with your Studio project from Nexus through a verifiable local bridge.</p>

          <div className={styles.heroActions}>
            <DownloadControl
              platform={selectedPlatform}
              release={selectedRelease}
              status={status}
              onDownload={handleDownload}
              className={styles.primaryDownload}
            />
            <button
              type="button"
              className={styles.platformSwitch}
              onClick={() => handlePlatformChange(selectedPlatform === "windows" ? "mac" : "windows")}
            >
              {selectedPlatform === "windows" ? "Need macOS?" : "Need Windows?"}
            </button>
          </div>

          <ul className={styles.trustStrip} aria-label="Release details">
            <li><span>Version</span><strong>{manifest ? `v${manifest.version}` : "—"}</strong></li>
            <li><span>Size</span><strong>{selectedRelease ? formatCompanionFileSize(selectedRelease.size) : "—"}</strong></li>
            <li><span>System</span><strong>{selectedCopy.shortName}</strong></li>
            <li data-tone={selectedRelease ? "success" : status === "loading" ? "pending" : "warning"}>
              {selectedRelease
                ? <ShieldCheck aria-hidden="true" />
                : status === "loading"
                  ? <RefreshCw className={styles.spinner} aria-hidden="true" />
                  : <TriangleAlert aria-hidden="true" />}
              <strong>{selectedRelease ? "SHA-256 published" : status === "loading" ? "Checksum pending" : "Checksum unavailable"}</strong>
            </li>
          </ul>

          {selectedPlatform === "windows" ? <WindowsDisclosure /> : (
            <div className={styles.signedNotice}>
              <CheckCircle2 aria-hidden="true" />
              <span><strong>Signed and notarized</strong> Developer ID verified by Apple.</span>
            </div>
          )}
        </div>

        <ConnectionDiagram />
      </section>

      {status === "unavailable" ? (
        <div role="alert" className={styles.alert}>
          <TriangleAlert aria-hidden="true" />
          <span><strong>Downloads temporarily unavailable</strong> We could not verify the current release feed, so installers remain disabled. Please try again shortly.</span>
        </div>
      ) : null}

      <section className={styles.installerSection} aria-labelledby="installer-title">
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.phase}>CURRENT RELEASE</p>
            <h2 id="installer-title">Installer details</h2>
          </div>
          <p>{detectedPlatform
            ? `${PLATFORM_COPY[detectedPlatform].name} was detected. You can switch platforms without leaving this page.`
            : "Choose the installer that matches the machine running Roblox Studio."}</p>
        </header>

        <InstallerDetails
          platform={selectedPlatform}
          release={selectedRelease}
          status={status}
          detectedPlatform={detectedPlatform}
          onDownload={handleDownload}
          onPlatformChange={handlePlatformChange}
          checksumCopied={checksumCopied}
          onCopyChecksum={handleCopyChecksum}
        />
      </section>

      <section className={styles.operations} aria-labelledby="connector-operations-title">
        <header>
          <p className={styles.phase}>AFTER DOWNLOAD</p>
          <h2 id="connector-operations-title">Three steps to Studio</h2>
          <p>The instructions update with your selected platform.</p>
        </header>
        <ol>
          {selectedCopy.steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{step.title}</strong><p>{step.detail}</p></div>
            </li>
          ))}
        </ol>
        <div className={styles.updatesCard}>
          <RefreshCw aria-hidden="true" />
          <div>
            <h3>Verified updates, automatically</h3>
            <p>The connector checks the verified release feed, downloads updates in the background, and installs them when you restart or quit the app.</p>
            <a href="/docs/troubleshooting">Troubleshooting guide <ArrowRight aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <p className={styles.disclaimer}>NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
    </main>
  );
}
