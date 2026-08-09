import React from "react";
import { Link } from "react-router-dom";

import { Grid, Sparkles } from "lib/icons";
import NoIndexMeta from "../seo/NoIndexMeta";

export default function CapabilityUnavailablePage({
  title,
  description,
  eyebrow = "Asset tools",
  pageTitle = `${title} | NexusRBX`,
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090f] px-4 py-16 text-white sm:px-6">
      <NoIndexMeta title={pageTitle} />
      <section className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-12 text-center shadow-2xl shadow-black/30 sm:px-10">
        <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-[#9b5de5]/30 bg-[#9b5de5]/10 text-[#c9b3f7]">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00f5d4]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">{description}</p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            to="/ai"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#00f5d4] px-6 py-3 text-sm font-black text-black hover:bg-[#5fffee]"
          >
            Open AI workspace
          </Link>
          <Link
            to="/icons-market"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
          >
            <Grid className="h-4 w-4" aria-hidden="true" /> Browse icon market
          </Link>
        </div>
      </section>
    </main>
  );
}
