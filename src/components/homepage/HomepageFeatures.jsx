import { Blocks, Library, SearchCheck, WandSparkles } from "lucide-react";

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
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-200">Built for Studio workflows</p>
        <h2 id="features-heading" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Generate, debug, and ship Roblox code without leaving your build loop.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {homepageFeatures.map((feature) => {
          const Icon = featureIcons[feature.icon] || WandSparkles;
          return (
            <Card key={feature.title} className="border-white/10 bg-white/[0.035]">
              <CardHeader className="pb-4">
                <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <Icon size={28} strokeWidth={2.3} aria-hidden="true" />
                </span>
                <CardTitle className="text-xl font-black leading-tight text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold leading-6 text-zinc-300">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
