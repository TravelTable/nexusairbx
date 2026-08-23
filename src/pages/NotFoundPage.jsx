// src/pages/NotFoundPage.jsx
import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { editorialDisplayClass, editorialGutterClass } from "../components/site/editorialUi";

export default function NexusRBXNotFoundPage() {
  const links = [
    { to: "/", label: "Home", document: true },
    { to: "/ai", label: "AI Workspace" },
    { to: "/tools/icon-generator", label: "Icon Generator" },
    { to: "/docs", label: "Docs", document: true },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className={`min-h-screen bg-[var(--ds-bg-canvas)] py-20 text-[var(--ds-text)] lg:py-28 ${editorialGutterClass}`}>
      <Helmet>
        <title>Page Not Found | NexusRBX</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nx-purple-muted)]">ROUTE RECORD / 404</p>
        <h1 className={`${editorialDisplayClass} mb-6 max-w-3xl text-5xl text-[var(--nx-purple)]`}>This NexusRBX page is not available.</h1>
        <p className="mb-12 max-w-2xl text-base leading-8 text-[var(--ds-text-secondary)] md:text-lg">
          The link may be outdated, private, or mistyped. Choose a tool below instead of starting over at a blank homepage.
        </p>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {links.map(({ to, label, document }, index) => {
            const className = `group inline-flex min-h-16 items-center justify-between border-t border-[var(--ds-border-subtle)] px-1 py-4 font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-canvas)] ${
              index === 0
                ? "text-[var(--ds-accent)] hover:text-[var(--ds-accent-hover)]"
                : "text-[var(--ds-text)] hover:text-[var(--ds-accent)]"
            }`;
            const content = (
              <>
                <span>{label}</span>
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
