import React from "react";
import { Layout } from "lib/icons";

export default function CommunityCreationsSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[var(--ds-accent-pressed)] to-accent text-transparent bg-clip-text">
            Community Creations
          </h2>
          <p className="text-[var(--ds-text-muted)] text-lg max-w-2xl mx-auto">
            A curated gallery of the most impressive UIs and scripts built by the NexusRBX community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 opacity-40 grayscale pointer-events-none select-none">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video rounded-xl bg-[var(--ds-surface-1)] border border-[var(--ds-border-subtle)] flex items-center justify-center">
              <Layout className="w-8 h-8 text-[var(--ds-text-disabled)]" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pt-20">
          <div className="px-8 py-4 rounded-2xl bg-[color-mix(in_srgb,var(--ds-surface-overlay)_78%,transparent)] backdrop-blur-xl border border-[var(--ds-border-subtle)] shadow-2xl transform rotate-[-2deg]">
            <span className="text-2xl md:text-3xl font-black tracking-tighter text-accent uppercase">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
