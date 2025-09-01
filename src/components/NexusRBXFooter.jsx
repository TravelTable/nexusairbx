import React from "react";
import { Github } from "lucide-react";
import { useLocation } from "react-router-dom";

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

  return (
    <footer className="border-t border-gray-800 py-8 px-4 bg-gradient-to-t from-black/60 to-transparent">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div
          className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mb-4 md:mb-0 cursor-pointer"
          onClick={() => navigate("/")}
          tabIndex={0}
          aria-label="Go to homepage"
          onKeyDown={e => { if (e.key === "Enter") navigate("/"); }}
        >
          NexusRBX
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.id}
                href={link.href}
                className="text-gray-400 hover:text-white transition-colors duration-300"
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.text}
              </a>
            ) : (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(link.href)}
                className={`text-gray-400 hover:text-white transition-colors duration-300 bg-transparent border-none outline-none cursor-pointer font-sans text-base ${
                  isActive(link.href) ? "font-bold underline underline-offset-4 text-white" : ""
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
                tabIndex={0}
                style={{
                  background: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {link.text}
              </button>
            )
          )}
          <a
            href="https://github.com/"
            className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-6 text-center text-gray-500 text-sm">
        © 2023 NexusRBX. All rights reserved.
      </div>
    </footer>
  );
}