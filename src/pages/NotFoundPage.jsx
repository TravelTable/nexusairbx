// src/pages/NotFoundPage.jsx
import React from "react";
import { AlertCircle, BookOpen, Home, Mail, Sparkles, Wand2 } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NexusRBXNotFoundPage() {
  const links = [
    { to: "/", label: "Home", icon: Home },
    { to: "/ai", label: "AI Workspace", icon: Sparkles },
    { to: "/tools/icon-generator", label: "Icon Generator", icon: Wand2 },
    { to: "/docs", label: "Docs", icon: BookOpen },
    { to: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white px-6 py-16">
      <Helmet>
        <title>Page Not Found | NexusRBX</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10">
          <AlertCircle className="h-7 w-7 text-red-300" aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-[#00f5d4]">404</p>
        <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">This NexusRBX page is not available.</h1>
        <p className="mb-8 max-w-2xl text-base leading-7 text-gray-300 md:text-lg">
          The link may be outdated, private, or mistyped. Choose a tool below instead of starting over at a blank homepage.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map(({ to, label, icon: Icon }, index) => (
            <Link
              key={to}
              to={to}
              className={`group inline-flex min-h-14 items-center justify-between rounded-lg border px-4 py-3 font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#00f5d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D] ${
                index === 0
                  ? "border-[#00f5d4]/50 bg-[#00f5d4] text-[#071010] hover:bg-[#5fffe5]"
                  : "border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]"
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </span>
              <span className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden="true">&gt;</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
