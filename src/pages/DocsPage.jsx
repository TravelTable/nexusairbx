import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Home,
  Link2,
  Radio,
  Shield,
  Sparkles,
  TerminalSquare,
  Wrench,
} from "lucide-react";

const PROMPTS = [
  "Inspect my paired Studio place and explain which scripts control player speed when touching this pad.",
  "Build a Roblox shop system in Studio with item cards, prices, and server-validated purchases. Keep Manual Review on.",
  "Wire a leaderboard system with a UI, remotes, and a DataStore-backed score saver, then explain the approval steps before applying.",
];

const SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    icon: Sparkles,
    summary: "NexusRBX is a Studio-aware AI workspace. The safe first path is: sign in, install the plugin, pair Studio, keep Manual Review enabled, submit a prompt, approve the first mutation, and verify it in Studio.",
    bullets: [
      "Use `/ai` as the main workspace for chat, file review, manifest search, and Studio-aware steps.",
      "The agent can inspect your place, read scripts, generate artifacts, and apply approved changes through the Studio bridge.",
      "Manual Review is the recommended default for first-run use because mutating Studio steps remain gated until you approve them.",
    ],
  },
  {
    id: "install-plugin",
    title: "Install Or Update The Plugin",
    icon: Wrench,
    summary: "The Studio bridge depends on the local NexusRBX plugin. Install the current script as a local plugin before you try to pair.",
    bullets: [
      "In Roblox Studio, create a new `Script` in `ServerStorage`.",
      "Paste the contents of `roblox-plugin/NexusRBXStudioBridge.plugin.lua` into that script.",
      "Use `Plugins > Save as Local Plugin`, then reopen Studio and click the `NexusRBX` toolbar button.",
      "If the website queues commands like `get_project_manifest` and Studio reports `Unsupported Studio command`, remove the old plugin and reinstall the latest script.",
      "After reinstalling, pair again because pairing codes are session-specific.",
    ],
  },
  {
    id: "pair-studio",
    title: "Pair Studio",
    icon: Link2,
    summary: "Pairing links the current website session to the local Studio plugin with a short-lived one-time code.",
    bullets: [
      "Open `/ai`, click `Pair Studio` in the header, and generate a pairing code.",
      "In Roblox Studio, open the `NexusRBX` plugin and enter the code exactly as shown.",
      "Wait for the workspace header to switch from `Offline` to `Studio`.",
      "If the code expires, generate a new one and try again.",
    ],
  },
  {
    id: "live-studio-and-approval-modes",
    title: "Live Studio And Approval Modes",
    icon: Radio,
    summary: "Live Studio lets the agent use Studio tools when a paired session exists. Approval mode controls how mutating steps are gated.",
    bullets: [
      "Turn on `Live Studio` in the composer after Studio is paired.",
      "Use `Manual Review` as the default. It pauses destructive steps until you approve them.",
      "Use `Auto Queue` only after you trust the flow. It removes the manual pause for eligible steps.",
      "Use `Dev Override` only in intentionally permissive development scenarios.",
      "Auto Push is separate from Live Studio and should stay secondary until you are comfortable with the base workflow.",
    ],
  },
  {
    id: "first-prompt-examples",
    title: "First Prompt Examples",
    icon: TerminalSquare,
    summary: "Start with prompts that encourage the agent to inspect and explain before it changes anything.",
    bullets: [
      "Ask for inspection first when you do not know where the logic lives.",
      "Name the desired behavior and mention that Manual Review should remain on.",
      "When the place is already paired, explicitly say `paired Studio place` so the request is framed around the live workspace.",
    ],
    prompts: PROMPTS,
  },
  {
    id: "approve-and-apply",
    title: "Plan, Approve, And Apply",
    icon: Shield,
    summary: "Unified agent runs stream tool steps. Read-only steps can run immediately. Mutating Studio steps are gated by your approval mode.",
    bullets: [
      "Read the plan and tool-step log in the workspace before approving a Studio mutation.",
      "When a step enters `awaiting approval`, review the label, result context, and target files or paths.",
      "Approve the step to let NexusRBX queue the Studio command and wait for the plugin acknowledgment.",
      "Successful Studio mutations should move the step to `succeeded` and update the active run history.",
    ],
  },
  {
    id: "verify-and-recover",
    title: "Verify And Recover With Snapshots",
    icon: CheckCircle2,
    summary: "After the first mutation, confirm behavior in Studio and use snapshots if the change is wrong or incomplete.",
    bullets: [
      "Test the changed behavior directly in Roblox Studio after the mutation succeeds.",
      "Use the generated setup and testing notes in the workspace details panel as artifact-specific guidance.",
      "If a Studio mutation needs to be rolled back, use the run restore action or the snapshot recovery flow.",
      "When editing live Studio scripts, stale writes should fail with `source_conflict` rather than silently overwriting newer work.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: AlertCircle,
    summary: "Most first-run issues come from an outdated plugin, an expired pairing code, Live Studio being off, or approval-mode confusion.",
    bullets: [
      "If the workspace stays `Offline`, regenerate the pairing code and confirm the plugin is the latest version.",
      "If Live Studio controls are disabled, pair Studio first. The toggle is intentionally unavailable when no session is connected.",
      "If a step never mutates Studio, check whether it is waiting for approval in Manual Review mode.",
      "If a write fails after you edited the same script in Studio, refresh the file and resolve the `source_conflict` instead of retrying blindly.",
    ],
  },
];

function matchesSection(section, query) {
  if (!query) return true;
  const haystack = [section.title, section.summary, ...(section.bullets || []), ...(section.prompts || [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function PromptCard({ prompt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{prompt}</pre>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copied" : "Copy Prompt"}
      </button>
    </div>
  );
}

export default function NexusRBXDocsPageContainer() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("overview");

  const filteredSections = useMemo(
    () => SECTIONS.filter((section) => matchesSection(section, query.trim().toLowerCase())),
    [query]
  );

  useEffect(() => {
    const syncFromHash = () => {
      const next = window.location.hash.replace(/^#/, "");
      if (next) setActiveId(next);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <div className="text-2xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-[#00f5d4] via-[#00bbf9] to-[#9b5de5] bg-clip-text text-transparent">
                NexusRBX
              </span>
              <span className="ml-2 text-gray-400">Docs</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">AI workspace and Studio bridge walkthrough</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </a>
            <a
              href="/ai"
              className="inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00f5d4] transition hover:border-[#00f5d4]/35 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Workspace
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
              <BookOpen className="h-3.5 w-3.5" />
              Guide
            </div>

            <label className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="pair studio"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
              />
            </label>

            <nav className="space-y-1">
              {filteredSections.map((section) => {
                const selected = activeId === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setActiveId(section.id)}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                      selected
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    <span>{section.title}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(0,245,212,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(155,93,229,0.16),transparent_35%),rgba(255,255,255,0.03)] p-6 md:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/15 bg-[#00f5d4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#00f5d4]">
              <Sparkles className="h-3.5 w-3.5" />
              First-Run Path
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
              Onboard to the AI workspace and Studio bridge without guessing.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-300">
              This guide mirrors the Workspace Walkthrough in `/ai`: install the plugin, pair Studio, keep Manual Review on, submit a first prompt, approve the first mutation, and verify the result in Studio.
            </p>
          </section>

          {filteredSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[#00f5d4]">
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">{section.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">{section.summary}</p>
                </div>
              </div>

              <div className="space-y-3">
                {(section.bullets || []).map((bullet) => (
                  <div key={bullet} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00f5d4]" />
                    <p className="text-sm leading-relaxed text-gray-300">{bullet}</p>
                  </div>
                ))}
              </div>

              {section.prompts?.length ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {section.prompts.map((prompt) => (
                    <PromptCard key={prompt} prompt={prompt} />
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
