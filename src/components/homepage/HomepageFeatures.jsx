import { Blocks, Library, SearchCheck, WandSparkles } from "lib/icons";

import { Card, CardContent, CardHeader, CardTitle } from "../shadcn/card";
import { homepageFeatures } from "../../content/homepageLanding";

const featureIcons = {
  wand: WandSparkles,
  debug: SearchCheck,
  api: Blocks,
  library: Library,
};

export default function HomepageFeatures() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="features-heading">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">Built for Studio workflows</p>
        <h2 id="features-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--ds-text)] sm:text-4xl">
          Generate, debug, and ship Roblox code without leaving your build loop.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {homepageFeatures.map((feature) => {
          const Icon = featureIcons[feature.icon] || WandSparkles;
          return (
            <Card key={feature.title} className="rounded-xl border-[var(--ds-border)] bg-[var(--ds-surface-1)] shadow-sm shadow-black/5">
              <CardHeader className="pb-4">
                <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
                  <Icon size={28} strokeWidth={2.3} aria-hidden="true" />
                </span>
                <CardTitle className="text-xl font-semibold leading-tight tracking-[-0.015em] text-[var(--ds-text)]">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[var(--ds-text-secondary)]">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
