import PublicHeader from "../../components/PublicHeader";
import DocsExplorer from "../../components/DocsExplorer";
import StructuredData from "../../components/StructuredData";
import { buildPublicMetadata, docsStructuredData } from "../../../src/lib/seo";

export const metadata = buildPublicMetadata({
  title: "NexusRBX Docs - Studio Bridge and AI Workspace Guide",
  description: "Learn how to use NexusRBX with Roblox Studio, Manual Review, Quick Script, Agent Build, and safe plugin handoffs.",
  path: "/docs",
});

const sections = [
  {
    id: "overview",
    title: "Overview",
    summary: "NexusRBX is a Studio-aware AI workspace for Roblox creators. The public docs explain how Quick Script, Agent Build, and the Studio bridge fit together before you sign in.",
    bullets: [
      "Use Quick Script when you want immediate focused Luau code from one prompt.",
      "Use Agent Build when the request needs planning, multiple files, Studio context, or follow-up questions.",
      "The authenticated AI workspace remains at /ai and keeps the existing Firebase authentication flow.",
    ],
  },
  {
    id: "studio-bridge",
    title: "Studio Bridge",
    summary: "The Studio bridge connects a signed-in browser workspace to the local Roblox Studio plugin with a short-lived pairing code.",
    bullets: [
      "Install or update the NexusRBX Studio plugin before pairing.",
      "Generate a pairing code from /ai and enter it in the plugin panel.",
      "Keep Manual Review enabled until you have verified the first mutation in Studio.",
    ],
  },
  {
    id: "generation-modes",
    title: "Generation Modes",
    summary: "Mode selection controls how much planning happens before code is produced.",
    bullets: [
      "Quick Script produces immediate focused code, Studio placement, setup notes, test notes, warnings, and copy actions.",
      "Agent Build can ask clarifying questions, create a plan, inspect Studio context, and coordinate multi-file workflows.",
      "A Quick Script result can be opened as Agent Build context without requiring the user to repeat the prompt.",
    ],
    prompts: [
      "Create a round timer script with intermission, active round, and victory rewards.",
      "Build a server-validated shop system with item cards and purchase remotes.",
      "Inspect my paired Studio place and identify which scripts control player speed.",
    ],
  },
  {
    id: "safe-workflow",
    title: "Safe Workflow",
    summary: "NexusRBX keeps destructive Studio actions explicit so creators can verify behavior before committing changes.",
    bullets: [
      "Read-only inspection can run before a Studio mutation.",
      "Writes should include expected source hashes when editing known Studio scripts.",
      "Snapshots and structured errors make recovery clearer when a change is stale or unsupported.",
    ],
  },
  {
    id: "public-generators",
    title: "Public Generator Guides",
    summary: "Server-rendered public guides provide intent-specific entry points before the authenticated workspace opens.",
    bullets: [
      "Use /roblox-script-generator for focused Quick Script prompts.",
      "Use /roblox-ai-scripter when debugging or conversational editing matters.",
      "Use /roblox-gui-maker for GUI behavior, HUD updates, and menu scripting.",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="page-shell">
      <PublicHeader />
      <main className="section-inner">
        <section className="docs-hero">
          <span className="eyebrow">Documentation</span>
          <h1>Use NexusRBX with Roblox Studio without guessing the workflow.</h1>
          <p className="docs-copy">
            Start with the public guide, then open the authenticated workspace when you are ready to generate, pair Studio, or continue a project.
          </p>
          <p className="docs-copy" style={{ fontSize: 16 }}>
            Primary action: <a className="button button-primary" href="/ai" style={{ marginLeft: 8 }}>Open AI workspace</a>
          </p>
          <p className="docs-copy" style={{ fontSize: 16 }}>
            Public guides: <a href="/roblox-script-generator" style={{ color: "#00f5d4", fontWeight: 800 }}>Script Generator</a>,{" "}
            <a href="/roblox-ai-scripter" style={{ color: "#00f5d4", fontWeight: 800 }}>AI Scripter</a>,{" "}
            <a href="/roblox-studio-script-generator" style={{ color: "#00f5d4", fontWeight: 800 }}>Studio Script Generator</a>,{" "}
            <a href="/roblox-gui-maker" style={{ color: "#00f5d4", fontWeight: 800 }}>GUI Maker</a>.
          </p>
        </section>
        <DocsExplorer sections={sections} />
      </main>
      <StructuredData data={docsStructuredData({ path: "/docs", title: "NexusRBX Studio Bridge and AI Workspace Guide" })} />
    </div>
  );
}
