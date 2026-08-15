import React from "react";
import { Github } from "lib/icons";
import { useLocation } from "react-router-dom";
import { cx } from "./ui";

const DOCUMENT_ROUTES = new Set([
  "/",
  "/docs",
  "/roblox-ai-scripter",
  "/roblox-gui-maker",
  "/roblox-lua-script-generator",
  "/roblox-script-generator",
  "/roblox-studio-script-generator",
]);

/**
 * NexusRBXFooter
 * - Internal links use <button> and navigate() for SPA navigation (no reload)
 * - External links use <a> with target="_blank" and rel="noopener noreferrer"
 * - GitHub link always external
 * - Active internal link is highlighted (bold, underline, white)
 */
export default function NexusRBXFooter({
  footerLinks = [],
  handleNavClick = () => () => {},
  navigate = () => {}
}) {
  const location = useLocation();

  // Helper: is this link active? (for internal links)
  const isActive = (href) => {
    if (/^https?:\/\//.test(href)) return false;
    const current = location.pathname.replace(/\/$/, "");
    const link = href.replace(/\/$/, "");
    return current === link;
  };
  const isDocumentRoute = (href) => DOCUMENT_ROUTES.has(href);

  return (
    <footer className="border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-4 py-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <a
          href="/"
          className="focus-ring mb-4 inline-flex min-h-11 items-center rounded-lg px-1 text-xl font-bold text-[var(--ds-text)] md:mb-0"
          aria-label="Go to homepage"
        >
          NexusRBX
        </a>

        <div className="flex flex-wrap justify-center gap-6">
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.id}
                href={link.href}
                className="focus-ring inline-flex min-h-11 items-center rounded-lg px-2 text-[var(--ds-text-muted)] transition-colors duration-200 hover:text-[var(--ds-text)]"
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.text}
              </a>
            ) : isDocumentRoute(link.href) ? (
              <a
                key={link.id}
                href={link.href}
                className={cx(
                  "focus-ring inline-flex min-h-11 items-center rounded-lg px-2 text-[var(--ds-text-muted)] transition-colors duration-200 hover:text-[var(--ds-text)]",
                  isActive(link.href) && "font-bold underline underline-offset-4 text-[var(--ds-text)]"
                )}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.text}
              </a>
            ) : (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(link.href)}
                className={cx(
                  "focus-ring inline-flex min-h-11 items-center rounded-lg border-none bg-transparent px-2 font-sans text-base text-[var(--ds-text-muted)] transition-colors duration-200 hover:text-[var(--ds-text)]",
                  isActive(link.href) && "font-bold underline underline-offset-4 text-[var(--ds-text)]"
                )}
                aria-current={isActive(link.href) ? "page" : undefined}
                tabIndex={0}
              >
                {link.text}
              </button>
            )
          )}
          <a
            href="https://github.com/TravelTable/nexusairbx"
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[var(--ds-text-muted)] transition-colors duration-200 hover:text-[var(--ds-text)]"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-6 text-center text-[var(--ds-text-subtle)] text-sm flex flex-col items-center gap-2">
        <p>© 2026 NexusRBX. All rights reserved.</p>
        <p className="max-w-md text-xs opacity-70">
          NexusRBX is currently in <span className="font-bold text-[var(--ds-text-secondary)]">Beta</span>. Features and AI models are subject to frequent updates and improvements. We appreciate your feedback as we build the future of Roblox development.
        </p>
      </div>
    </footer>
  );
}
