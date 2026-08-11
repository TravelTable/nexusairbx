// src/pages/NotFoundPage.jsx
import React from "react";
import { AlertCircle, BookOpen, Home, Mail, Sparkles, Wand2 } from "lib/icons";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

export default function NexusRBXNotFoundPage() {
  const links = [
    { to: "/", label: "Home", icon: Home, document: true },
    { to: "/ai", label: "AI Workspace", icon: Sparkles },
    { to: "/tools/icon-generator", label: "Icon Generator", icon: Wand2 },
    { to: "/docs", label: "Docs", icon: BookOpen, document: true },
    { to: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[var(--ds-bg-canvas)] px-6 py-16 text-[var(--ds-text)]">
      <Helmet>
        <title>Page Not Found | NexusRBX</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[14px] border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_9%,transparent)]">
          <AlertCircle className="h-7 w-7 text-[var(--ds-danger)]" aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-semibold tracking-[0.08em] text-[var(--ds-accent)]">404</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.035em] md:text-6xl">This NexusRBX page is not available.</h1>
        <p className="mb-8 max-w-2xl text-base leading-7 text-[var(--ds-text-secondary)] md:text-lg">
          The link may be outdated, private, or mistyped. Choose a tool below instead of starting over at a blank homepage.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map(({ to, label, icon: Icon, document }, index) => {
            const className = `group inline-flex min-h-14 items-center justify-between rounded-[10px] border px-4 py-3 font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-canvas)] ${
              index === 0
                ? "border-[var(--ds-accent)] bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:scale-[0.99]"
                : "border-[var(--ds-border)] bg-[var(--ds-surface-1)] text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] active:scale-[0.99]"
            }`;
            const content = (
              <>
                <span className="inline-flex items-center gap-3">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </span>
                <span className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden="true">&gt;</span>
              </>
            );
            return document ? (
              <a key={to} href={to} className={className}>
                {content}
              </a>
            ) : (
              <Link
              key={to}
              to={to}
              className={className}
            >
              {content}
            </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
