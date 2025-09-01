import React, { useState, useEffect } from "react";
import TokensCounterContainer from "./TokensCounterContainer";
import { useLocation } from "react-router-dom";

/**
 * NexusRBXHeader
 * - Uses <a> for external links (with target="_blank" etc)
 * - Uses <button> for internal navigation, calling navigate() for SPA routing
 * - Highlights active link for internal routes
 */
function NexusRBXHeader({
  navLinks,
  handleNavClick,
  navigate,
  user,
  handleLogin,
  tokenInfo,
  tokenLoading
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const firstFocusable = document.querySelector(".mobile-menu a, .mobile-menu button");
    if (firstFocusable) firstFocusable.focus();
  }, [mobileMenuOpen]);

  // Helper: is this link active? (for internal links)
  const isActive = (href) => {
    // Only for internal links (not starting with http)
    if (/^https?:\/\//.test(href)) return false;
    // Remove trailing slash for comparison
    const current = location.pathname.replace(/\/$/, "");
    const link = href.replace(/\/$/, "");
    return current === link;
  };

  return (
    <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div
          className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer"
          onClick={() => navigate("/")}
          tabIndex={0}
          aria-label="Go to homepage"
          onKeyDown={e => { if (e.key === "Enter") navigate("/"); }}
        >
          NexusRBX
        </div>
        <nav className="hidden md:flex items-center">
          <div className="flex items-center gap-8">
            {navLinks.map((link, idx) => (
              <React.Fragment key={link.id}>
                {link.external ? (
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-300"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.text}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(link.href)}
                    className={`text-gray-300 hover:text-white transition-colors duration-300 bg-transparent border-none outline-none cursor-pointer font-sans text-base ${
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
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-8">
            {user && (
              <>
                <TokensCounterContainer
                  tokens={{
                    sub: {
                      remaining:
                        typeof tokenInfo?.sub?.limit === "number" && typeof tokenInfo?.sub?.used === "number"
                          ? tokenInfo.sub.limit - tokenInfo.sub.used
                          : 0,
                      limit: tokenInfo?.sub?.limit ?? 0,
                    },
                  }}
                  isLoading={tokenLoading}
                  showRefreshButton={false}
                  className="!bg-transparent !border-none !shadow-none p-0"
                />
                <TokensCounterContainer
                  tokens={{
                    payg: {
                      remaining:
                        typeof tokenInfo?.payg?.remaining === "number"
                          ? tokenInfo.payg.remaining
                          : 0,
                    },
                  }}
                  isLoading={tokenLoading}
                  showRefreshButton={false}
                  className="!bg-transparent !border-none !shadow-none p-0"
                />
              </>
            )}
            {!user ? (
              <button
                onClick={handleLogin}
                className="text-gray-300 hover:text-white transition-colors duration-300 font-sans text-base"
                type="button"
                aria-label="Login"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer"
                }}
              >
                Login
              </button>
            ) : null}
          </div>
        </nav>
        <button
          className="md:hidden text-gray-300"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/90 border-b border-gray-800 px-4 py-4 mobile-menu" id="mobile-menu">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link, idx) => (
              <React.Fragment key={link.id}>
                {link.external ? (
                  <a
                    href={link.href}
                    tabIndex={0}
                    className="text-gray-300 hover:text-white transition-colors duration-300"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.text}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(link.href);
                    }}
                    className={`text-gray-300 hover:text-white transition-colors duration-300 bg-transparent border-none outline-none cursor-pointer font-sans text-base text-left ${
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
                )}
              </React.Fragment>
            ))}
            {user && (
              <div className="flex flex-col gap-1 px-3 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-200">
                <TokensCounterContainer
                  tokens={{
                    sub: {
                      remaining:
                        typeof tokenInfo?.sub?.limit === "number" && typeof tokenInfo?.sub?.used === "number"
                          ? tokenInfo.sub.limit - tokenInfo.sub.used
                          : 0,
                      limit: tokenInfo?.sub?.limit ?? 0,
                    },
                  }}
                  isLoading={tokenLoading}
                  showRefreshButton={false}
                  className="!bg-transparent !border-none !shadow-none p-0"
                />
                <TokensCounterContainer
                  tokens={{
                    payg: {
                      remaining:
                        typeof tokenInfo?.payg?.remaining === "number"
                          ? tokenInfo.payg.remaining
                          : 0,
                    },
                  }}
                  isLoading={tokenLoading}
                  showRefreshButton={false}
                  className="!bg-transparent !border-none !shadow-none p-0"
                />
              </div>
            )}
            {!user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogin();
                }}
                className="text-gray-300 hover:text-white transition-colors duration-300 font-sans text-base"
                type="button"
                aria-label="Login"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer"
                }}
              >
                Login
              </button>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}

export default NexusRBXHeader;