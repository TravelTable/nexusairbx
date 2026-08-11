"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  Monitor,
  RefreshCw,
  ShieldCheck,
} from "../../lib/icons";
import {
  detectCompanionPlatform,
  fetchCompanionManifest,
  formatCompanionFileSize,
} from "../../lib/companionDownloads";
import { trackProductEvent } from "../../lib/productAnalytics";
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPrimaryButtonClass,
} from "../site/editorialUi";

const PLATFORM_COPY = {
  mac: {
    name: "macOS (Universal)",
    detail: "One installer for Apple Silicon and Intel Macs",
    machines: ["Apple Silicon (M1 or newer)", "Intel Mac"],
    signing: "Developer ID signed and Apple notarized",
    steps: ["Open the DMG", "Drag NexusRBX Connector to Applications", "Open it and pair in your browser"],
  },
  windows: {
    name: "Windows (64-bit)",
    detail: "For Windows 10 and 11 on Intel or AMD PCs",
    machines: ["Intel or AMD x64 PC"],
    signing: "Unsigned installer — Windows may show “Unknown publisher”",
    steps: ["Run the downloaded installer", "If SmartScreen appears, select More info", "Choose Run anyway, then open and pair in your browser"],
  },
};

function DownloadCard({ platform, release, recommended, loading, onDownload }) {
  const copy = PLATFORM_COPY[platform];
  const enabled = Boolean(release);
  const isUnsigned = release?.verification === "unsigned";
  const VerificationIcon = isUnsigned ? AlertTriangle : ShieldCheck;
  return (
    <article className={`flex h-full flex-col rounded-[14px] p-6 sm:p-7 ${recommended ? "bg-[var(--ds-accent-soft)]" : "bg-[var(--ds-surface-1)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--ds-surface-2)] text-[var(--ds-text-secondary)]">
          <Monitor size={20} aria-hidden="true" />
        </span>
        {recommended ? <span className="rounded-full border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ds-accent)]">Recommended</span> : null}
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-[-0.015em] text-[var(--ds-text)]">{copy.name}</h2>
      <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{copy.detail}</p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label={`Supported ${copy.name} machines`}>
        {copy.machines.map((machine) => (
          <span key={machine} className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--ds-text-secondary)]">
            {machine}
          </span>
        ))}
      </div>

      <dl className="mt-5 grid gap-2 border-y border-[var(--ds-border-subtle)] py-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[var(--ds-text-muted)]">Version</dt><dd className="font-medium text-[var(--ds-text)]">{release ? `v${release.version}` : "—"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--ds-text-muted)]">File size</dt><dd className="font-medium text-[var(--ds-text)]">{release ? formatCompanionFileSize(release.size) : "—"}</dd></div>
      </dl>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--ds-text-secondary)]">
        <VerificationIcon size={15} className={enabled ? `mt-0.5 shrink-0 ${isUnsigned ? "text-[var(--ds-warning)]" : "text-[var(--ds-success)]"}` : "mt-0.5 shrink-0 text-[var(--ds-text-muted)]"} aria-hidden="true" />
        {enabled ? copy.signing : "Release verification required"}
      </p>

      {enabled ? (
        <a
          href={release.url}
          onClick={() => onDownload(platform)}
          className={`${editorialPrimaryButtonClass} mt-6 gap-2`}
        >
          <Download size={17} aria-hidden="true" />
          Download {copy.name}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 text-sm font-semibold text-[var(--ds-text-muted)] opacity-70"
        >
          {loading ? <RefreshCw size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
          {loading ? "Checking release…" : `${copy.name} unavailable`}
        </button>
      )}

      <details className="mt-4 text-xs text-[var(--ds-text-muted)]">
        <summary className="min-h-11 cursor-pointer rounded-lg py-3 font-medium text-[var(--ds-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]">SHA-256 checksum</summary>
        <code className="mt-2 block break-all rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-3)] p-3 font-mono text-[11px] leading-5 text-[var(--ds-text-secondary)]">{release?.sha256 || "Available after release verification"}</code>
      </details>
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

  const orderedPlatforms = useMemo(() => {
    if (detectedPlatform === "windows") return ["windows", "mac"];
    return ["mac", "windows"];
  }, [detectedPlatform]);

  function handleDownload(platform) {
    void trackProductEvent("connector_download_selected", {
      platform,
      recommended: platform === detectedPlatform,
      version: manifest?.version,
    }, { dedupe: false });
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <section className={`${editorialGutterClass} mx-auto w-full max-w-7xl py-16 sm:py-20 lg:py-28`}>
        <div className="mx-auto max-w-2xl text-center">
          <img src="/logo.png" alt="NexusRBX" width="56" height="56" className="mx-auto h-14 w-14 object-contain" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">NexusRBX Connector</p>
          <h1 className={`${editorialDisplayClass} mt-4 text-5xl sm:text-6xl lg:text-7xl`}>Connect NexusRBX to Roblox Studio</h1>
          <p className="mt-6 text-base leading-8 text-[var(--ds-text-secondary)]">
            Install the secure desktop companion, pair once in your browser, then use Studio MCP from NexusRBX.
          </p>
          <div className="mt-5 flex min-h-8 items-center justify-center">
            {manifest ? (
              <p className="rounded-full border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--ds-accent)]">
                Current version: v{manifest.version}
              </p>
            ) : (
              <p className="text-xs font-medium text-[var(--ds-text-muted)]" aria-live="polite">
                {status === "loading" ? "Checking current version…" : "Current version unavailable"}
              </p>
            )}
          </div>
        </div>

        {status === "unavailable" ? (
          <div role="alert" className="mx-auto mt-8 max-w-2xl rounded-xl border border-[var(--ds-warning)] bg-[var(--ds-fill-subtle)] p-4 text-center">
            <p className="font-semibold text-[var(--ds-warning)]">Downloads temporarily unavailable</p>
            <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">We only enable installers after both releases pass checksum and startup checks, plus Apple signing and notarization for macOS.</p>
          </div>
        ) : null}

        <div className="mt-14 text-center">
          <h2 className="text-lg font-semibold text-[var(--ds-text)]">Choose the installer for your machine</h2>
          <p className="mt-1 text-sm text-[var(--ds-text-muted)]">Only the current release is shown. Older connector versions are not offered.</p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {orderedPlatforms.map((platform) => (
            <DownloadCard
              key={platform}
              platform={platform}
              release={manifest ? { ...manifest.platforms[platform], version: manifest.version } : null}
              recommended={platform === detectedPlatform}
              loading={status === "loading"}
              onDownload={handleDownload}
            />
          ))}
        </div>

        <div className="mt-16 grid gap-8 border-t border-[var(--ds-border-subtle)] pt-12 lg:grid-cols-3">
          <section className="p-2">
            <CheckCircle size={19} className="text-[var(--ds-success)]" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-[var(--ds-text)]">Install and pair</h2>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-[var(--ds-text-secondary)]">
              {(PLATFORM_COPY[detectedPlatform || "mac"]?.steps || []).map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
            </ol>
          </section>
          <section className="p-2">
            <RefreshCw size={19} className="text-[var(--ds-accent)]" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-[var(--ds-text)]">Automatic updates</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">Automatic updates are on by default. The connector checks the verified release feed, downloads updates in the background, and installs them when you restart or quit the app.</p>
          </section>
          <section className="p-2">
            <ExternalLink size={19} className="text-[var(--ds-accent)]" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-[var(--ds-text)]">Need help?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">Open Roblox Studio, load your experience, and enable Studio MCP before retrying.</p>
            <a href="/docs/troubleshooting" className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-[var(--ds-accent)] hover:text-[var(--ds-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]">Troubleshooting guide</a>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--ds-text-muted)]">NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
      </section>
    </main>
  );
}
