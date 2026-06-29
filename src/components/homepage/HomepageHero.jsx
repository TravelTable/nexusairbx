import { ArrowRight } from "lucide-react";

import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";
import { homepageHero } from "../../content/homepageLanding";
import HomepagePrompt from "./HomepagePrompt";

export default function HomepageHero({ surface, navigateToAi }) {
  return (
    <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:items-center md:py-16 lg:py-20">
      <div className="relative z-10">
        <Badge className="border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200 hover:bg-cyan-300/10">
          {homepageHero.eyebrow}
        </Badge>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,5vw,4.6rem)] font-black leading-[1.02] tracking-[-0.045em] text-white">
          {homepageHero.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-zinc-300">
          {homepageHero.description}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="bg-[#3855f6] text-base font-bold hover:bg-[#5068ff]">
            <a href={homepageHero.primaryCta.href}>
              {homepageHero.primaryCta.label}
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/[0.03] text-base font-bold text-white hover:bg-white/10 hover:text-white">
            <a href={homepageHero.secondaryCta.href}>{homepageHero.secondaryCta.label}</a>
          </Button>
        </div>
        <HomepagePrompt surface={surface} source={surface} navigateToAi={navigateToAi} />
      </div>

      <div className="relative">
        <div className="absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(0,245,212,0.24),transparent_36%),radial-gradient(circle_at_80%_60%,rgba(56,85,246,0.32),transparent_42%)] blur-2xl" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40">
          <img
            className="block h-auto w-full object-cover md:min-h-[360px]"
            src={homepageHero.image.src}
            alt={homepageHero.image.alt}
            width="1024"
            height="1024"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
