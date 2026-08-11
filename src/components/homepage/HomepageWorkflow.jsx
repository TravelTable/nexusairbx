import { ArrowRight } from "lib/icons";

import { Card, CardContent } from "../shadcn/card";
import { Separator } from "../shadcn/separator";
import { homepageWorkflow } from "../../content/homepageLanding";

export default function HomepageWorkflow() {
  return (
    <section id="workflow" className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6" aria-labelledby="workflow-heading">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">Studio handoff</p>
      <h2 id="workflow-heading" className="mx-auto mt-3 max-w-3xl text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em] text-[var(--ds-text)]">
        How NexusRBX Transforms Your Development
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {homepageWorkflow.map((step, index) => (
          <Card key={step.title} className="relative rounded-xl border-[var(--ds-border)] bg-[var(--ds-surface-1)] text-left shadow-sm shadow-black/5">
            <CardContent className="p-5">
              {step.image ? (
                <img
                  src={step.image.src}
                  alt={step.image.alt}
                  className="h-36 w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-3)] object-contain"
                />
              ) : (
                <div
                  className="grid min-h-36 place-items-center rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]"
                  role="img"
                  aria-label={`${step.title} workflow preview placeholder`}
                >
                  Workflow preview
                </div>
              )}
              <Separator className="my-5 bg-[var(--ds-border-subtle)]" />
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">Step {index + 1}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--ds-text)]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">{step.description}</p>
              {index < homepageWorkflow.length - 1 ? (
                <ArrowRight className="absolute right-[-28px] top-20 hidden text-[var(--ds-accent)] md:block" size={32} aria-hidden="true" />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
