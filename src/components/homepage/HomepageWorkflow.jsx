import { ArrowRight } from "lib/icons";

import { Card, CardContent } from "../shadcn/card";
import { Separator } from "../shadcn/separator";
import { homepageWorkflow } from "../../content/homepageLanding";

export default function HomepageWorkflow() {
  return (
    <section id="workflow" className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6" aria-labelledby="workflow-heading">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-200">Studio handoff</p>
      <h2 id="workflow-heading" className="mx-auto mt-3 max-w-3xl text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white">
        How NexusRBX Transforms Your Development
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {homepageWorkflow.map((step, index) => (
          <Card key={step.title} className="relative border-white/10 bg-white/[0.035] text-left">
            <CardContent className="p-5">
              {step.image ? (
                <img
                  src={step.image.src}
                  alt={step.image.alt}
                  className="h-36 w-full rounded-xl border border-white/10 bg-black object-contain"
                />
              ) : (
                <div
                  className="grid min-h-36 place-items-center rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,245,212,0.1),rgba(56,85,246,0.12)_55%,rgba(255,255,255,0.035))] text-xs font-black uppercase tracking-[0.16em] text-zinc-500"
                  role="img"
                  aria-label={`${step.title} workflow preview placeholder`}
                >
                  Workflow preview
                </div>
              )}
              <Separator className="my-5 bg-white/10" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-200">Step {index + 1}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{step.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{step.description}</p>
              {index < homepageWorkflow.length - 1 ? (
                <ArrowRight className="absolute right-[-28px] top-20 hidden text-cyan-200 md:block" size={32} aria-hidden="true" />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
