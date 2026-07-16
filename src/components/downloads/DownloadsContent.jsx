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
    <article className={`flex h-full flex-col rounded-xl border p-5 ${recommended ? "border-violet-400/40 bg-violet-500/[0.07]" : "border-white/10 bg-white/[0.025]"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-black/20 text-zinc-200">
          <Monitor size={20} aria-hidden="true" />
        </span>
        {recommended ? <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">Recommended</span> : null}
      </div>

      <h2 className="mt-4 text-xl font-bold text-white">{copy.name}</h2>
      <p className="mt-1 text-sm text-zinc-400">{copy.detail}</p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label={`Supported ${copy.name} machines`}>
        {copy.machines.map((machine) => (
          <span key={machine} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
            {machine}
          </span>
        ))}
      </div>

      <dl className="mt-5 grid gap-2 border-y border-white/10 py-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Version</dt><dd className="font-medium text-zinc-200">{release ? `v${release.version}` : "—"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">File size</dt><dd className="font-medium text-zinc-200">{release ? formatCompanionFileSize(release.size) : "—"}</dd></div>
      </dl>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-400">
        <VerificationIcon size={15} className={enabled ? `mt-0.5 shrink-0 ${isUnsigned ? "text-amber-400" : "text-emerald-400"}` : "mt-0.5 shrink-0 text-zinc-600"} aria-hidden="true" />
        {enabled ? copy.signing : "Release verification required"}
      </p>

      {enabled ? (
        <a
          href={release.url}
          onClick={() => onDownload(platform)}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e16]"
        >
          <Download size={17} aria-hidden="true" />
          Download {copy.name}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-5 inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-600"
        >
          {loading ? <RefreshCw size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
          {loading ? "Checking release…" : `${copy.name} unavailable`}
        </button>
      )}

      <details className="mt-4 text-xs text-zinc-500">
        <summary className="cursor-pointer rounded py-1 font-medium text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">SHA-256 checksum</summary>
        <code className="mt-2 block break-all rounded-md border border-white/10 bg-black/20 p-3 font-mono text-[11px] leading-5 text-zinc-400">{release?.sha256 || "Available after release verification"}</code>
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
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090f] text-white">
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <img src="/logo.png" alt="NexusRBX" width="56" height="56" className="mx-auto h-14 w-14 object-contain" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-violet-300">NexusRBX Connector</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Connect NexusRBX to Roblox Studio</h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">
            Install the secure desktop companion, pair once in your browser, then use Studio MCP from NexusRBX.
          </p>
          <div className="mt-5 flex min-h-8 items-center justify-center">
            {manifest ? (
              <p className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                Current version: v{manifest.version}
              </p>
            ) : (
              <p className="text-xs font-medium text-zinc-500" aria-live="polite">
                {status === "loading" ? "Checking current version…" : "Current version unavailable"}
              </p>
            )}
          </div>
        </div>

        {status === "unavailable" ? (
          <div role="alert" className="mx-auto mt-8 max-w-2xl rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-center">
            <p className="font-semibold text-amber-200">Downloads temporarily unavailable</p>
            <p className="mt-1 text-sm text-zinc-400">We only enable installers after both releases pass checksum and startup checks, plus Apple signing and notarization for macOS.</p>
          </div>
        ) : null}

        <div className="mt-8 text-center">
          <h2 className="text-lg font-semibold text-white">Choose the installer for your machine</h2>
          <p className="mt-1 text-sm text-zinc-500">Only the current release is shown. Older connector versions are not offered.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
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

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <CheckCircle size={19} className="text-emerald-400" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-white">Install and pair</h2>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
              {(PLATFORM_COPY[detectedPlatform || "mac"]?.steps || []).map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
            </ol>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <RefreshCw size={19} className="text-violet-300" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-white">Automatic updates</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Automatic updates are on by default. The connector checks the verified release feed, downloads updates in the background, and installs them when you restart or quit the app.</p>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <ExternalLink size={19} className="text-violet-300" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-white">Need help?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Open Roblox Studio, load your experience, and enable Studio MCP before retrying.</p>
            <a href="/docs/troubleshooting" className="mt-3 inline-flex rounded text-sm font-semibold text-violet-300 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">Troubleshooting guide</a>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">NexusRBX is not affiliated with or endorsed by Roblox Corporation.</p>
      </section>
    </main>
  );
}
