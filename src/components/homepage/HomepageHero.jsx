import { ArrowRight } from "lib/icons";

import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";
import { homepageHero } from "../../content/homepageLanding";
import HomepagePrompt from "./HomepagePrompt";

export default function HomepageHero({ surface, navigateToAi }) {
  return (
    <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:items-center md:py-16 lg:py-20">
      <div className="relative z-10">
        <Badge className="border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)]">
          {homepageHero.eyebrow}
        </Badge>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ds-text)]">
          {homepageHero.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ds-text-secondary)]">
          {homepageHero.description}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="bg-[var(--ds-accent)] text-base font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]">
            <a href={homepageHero.primaryCta.href}>
              {homepageHero.primaryCta.label}
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-base font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]">
            <a href={homepageHero.secondaryCta.href}>{homepageHero.secondaryCta.label}</a>
          </Button>
        </div>
        <HomepagePrompt surface={surface} source={surface} navigateToAi={navigateToAi} />
      </div>

      <div className="relative">
        <picture className="block">
          <source media="(max-width: 767px)" srcSet="/assets/nexus-product-mock-960.webp" type="image/webp" />
          <img
            className="block h-auto w-full object-contain"
            src="/assets/nexus-product-mock-1344.webp"
            alt=""
            aria-hidden="true"
            width="1344"
            height="752"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
      </div>
    </section>
  );
}
