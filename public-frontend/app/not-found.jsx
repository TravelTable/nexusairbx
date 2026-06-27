import PublicHeader from "../components/PublicHeader";
import { buildPublicMetadata } from "../../src/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Page Not Found | NexusRBX",
  description: "This NexusRBX public page is not available.",
  path: "/404",
  noindex: true,
});

export default function NotFound() {
  return (
    <div className="page-shell">
      <PublicHeader />
      <main className="section-inner hero">
        <span className="eyebrow">404</span>
        <h1>This NexusRBX page is not available.</h1>
        <p className="hero-copy">Use a public tool below or open the AI workspace if you were trying to continue a private project.</p>
        <p>
          <a className="button button-primary" href="/">Home</a>{" "}
          <a className="button button-secondary" href="/docs">Docs</a>{" "}
          <a className="button button-secondary" href="/ai">AI workspace</a>
        </p>
      </main>
    </div>
  );
}
