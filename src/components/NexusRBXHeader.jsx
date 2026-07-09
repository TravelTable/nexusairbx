import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BetaBadge from "./BetaBadge";
import { 
  ChevronDown, 
  Sparkles, 
  Volume2, 
  Activity, 
  User, 
  LogOut, 
  Menu,
  X,
  Zap,
  Layout,
  Code,
  ShieldCheck
} from "lib/icons";
import TokensCounterContainer from "./TokensCounterContainer";
import { useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useBilling } from "../context/BillingContext";
import { Button, cx } from "./ui";

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
 * NexusRBXHeader - Upgraded Floating Glass UI
 */
function NexusRBXHeader({
  navigate,
  user,
  handleLogin,
  tokenInfo,
  tokenLoading,
  variant = "default"
}) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const toolsRef = useRef(null);
  const accountRef = useRef(null);
  const {
    subRemaining,
    paygRemaining,
    subLimit,
    loading: billingLoading,
    flags: billingFlags,
    unlimitedTokens,
    devOverride,
    plan,
    dailyUsage,
    fairUse,
    isFreeUsagePlan,
    isStarterOrAbove,
    isPremium,
  } = useBilling();

  const resolvedSubRemaining =
    typeof subRemaining === "number"
      ? subRemaining
      : typeof tokenInfo?.sub?.limit === "number" && typeof tokenInfo?.sub?.used === "number"
        ? tokenInfo.sub.limit - tokenInfo.sub.used
        : typeof tokenInfo?.subRemaining === "number"
          ? tokenInfo.subRemaining
          : typeof tokenInfo?.limit === "number" && typeof tokenInfo?.used === "number"
            ? Math.max(0, tokenInfo.limit - tokenInfo.used)
            : 0;

  const resolvedSubLimit =
    typeof subLimit === "number"
      ? subLimit
      : typeof tokenInfo?.sub?.limit === "number"
        ? tokenInfo.sub.limit
        : typeof tokenInfo?.subLimit === "number"
          ? tokenInfo.subLimit
          : typeof tokenInfo?.limit === "number"
            ? tokenInfo.limit
            : 0;

  const resolvedPaygRemaining =
    typeof paygRemaining === "number"
      ? paygRemaining
      : typeof tokenInfo?.payg?.remaining === "number"
        ? tokenInfo.payg.remaining
        : typeof tokenInfo?.paygRemaining === "number"
          ? tokenInfo.paygRemaining
          : 0;

  const resolvedFlags = billingFlags || tokenInfo?.flags || {
    unlimitedTokens: Boolean(unlimitedTokens || tokenInfo?.unlimitedTokens),
    devOverride: Boolean(devOverride || tokenInfo?.devOverride),
    isAdmin: Boolean(tokenInfo?.isAdmin),
  };

  const resolvedTokenLoading = billingLoading || tokenLoading;

  const isActive = (path) => location.pathname === path;
  const openRoute = (href) => {
    if (DOCUMENT_ROUTES.has(href) && typeof window !== "undefined") {
      window.location.assign(href);
      return;
    }
    navigate(href);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signin");
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) setIsToolsOpen(false);
      if (accountRef.current && !accountRef.current.contains(event.target)) setIsAccountOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tools = [
    {
      name: "Icon Generator",
      description: "AI-powered Roblox game assets",
      icon: Sparkles,
      href: "/tools/icon-generator",
      premium: true,
      badge: "PRO"
    },
    {
      name: "Icons Market",
      description: "Browse professional game icons",
      icon: Layout,
      href: "/icons-market",
      premium: false
    },
    {
      name: "SFX Generator",
      description: "Custom audio for your game",
      icon: Volume2,
      href: "#",
      comingSoon: true
    },
    {
      name: "Code Doctor",
      description: "Optimize your Luau scripts",
      icon: Activity,
      href: "#",
      comingSoon: true
    }
  ];

  const isAiPage = variant === "ai";

  return (
    <div className={`fixed top-4 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none ${isAiPage ? 'max-w-none' : ''}`}>
      <header className={`${isAiPage ? 'w-full' : 'w-full max-w-6xl'} bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2.5 flex items-center justify-between pointer-events-auto shadow-panel transition-all duration-500`}>
        {/* Logo */}
        <div 
          className="text-xl font-black bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer flex items-center gap-2"
          onClick={() => openRoute("/")}
        >
          <Zap className="h-5 w-5 text-[#00f5d4] fill-[#00f5d4]" />
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">NexusRBX</span>
            <BetaBadge className="mt-0.5" />
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavButton label="Ai Console" active={isActive("/ai")} onClick={() => navigate("/ai")} icon={Code} />
          
          {/* Tools Dropdown */}
          <div className="relative" ref={toolsRef}>
            <button 
              onMouseEnter={() => setIsToolsOpen(true)}
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={cx(
                "focus-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                isToolsOpen ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
              aria-expanded={isToolsOpen}
            >
              Tools
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isToolsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  onMouseLeave={() => setIsToolsOpen(false)}
                  className="nexus-menu-surface absolute top-full left-0 mt-2 w-72 overflow-hidden p-2"
                >
                  <div className="grid gap-1">
                    {tools.map((tool) => (
                      <button
                        key={tool.name}
                        disabled={tool.comingSoon}
                        onClick={() => {
                          if (!tool.comingSoon) {
                            navigate(tool.href);
                            setIsToolsOpen(false);
                          }
                        }}
                        className={cx(
                          "focus-ring group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all",
                          tool.comingSoon ? "cursor-not-allowed opacity-50" : "hover:bg-white/5"
                        )}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${tool.comingSoon ? 'from-gray-800 to-gray-900' : 'from-[#9b5de5]/20 to-[#00f5d4]/20 group-hover:from-[#9b5de5]/30 group-hover:to-[#00f5d4]/30'}`}>
                          <tool.icon className={`h-4 w-4 ${tool.comingSoon ? 'text-gray-500' : 'text-[#00f5d4]'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{tool.name}</span>
                            {tool.badge && (!isPremium || tool.badge !== "PRO") && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#9b5de5] text-white">{tool.badge}</span>
                            )}
                            {tool.comingSoon && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 uppercase">Soon</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{tool.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <NavButton label="Docs" active={isActive("/docs")} onClick={() => openRoute("/docs")} icon={Layout} />
        </nav>

        {/* Right Side: Tokens & Account */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden lg:block">
              {isStarterOrAbove ? (
                <TokensCounterContainer
                  tokens={{
                    sub: {
                      remaining: resolvedSubRemaining,
                      limit: resolvedSubLimit,
                    },
                    payg: {
                      remaining: resolvedPaygRemaining,
                    },
                  }}
                  flags={resolvedFlags}
                  isLoading={resolvedTokenLoading}
                  showRefreshButton={false}
                  variant="header"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/subscribe?highlight=starter")}
                  className="rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00f5d4] hover:bg-[#00f5d4]/20"
                >
                  Starter $2/mo
                </button>
              )}
            </div>
          )}

          {user ? (
            <div className="relative" ref={accountRef}>
              <button 
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="focus-ring h-9 w-9 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] p-0.5 transition-shadow hover:shadow-[0_0_18px_rgba(0,245,212,0.22)]"
                aria-label="Open account menu"
                aria-expanded={isAccountOpen}
              >
                <div className="h-full w-full rounded-full bg-[#0D0D0D] flex items-center justify-center text-sm font-bold text-white">
                  {user.email?.[0].toUpperCase()}
                </div>
              </button>

              <AnimatePresence>
                {isAccountOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="nexus-menu-surface absolute top-full right-0 mt-2 w-56 p-2"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <AccountMenuItem icon={User} label="Account" onClick={() => { navigate("/settings"); setIsAccountOpen(false); }} />
                    <AccountMenuItem icon={ShieldCheck} label="Billing" onClick={() => { navigate("/billing"); setIsAccountOpen(false); }} />
                    <div className="h-px bg-white/5 my-1" />
                    <AccountMenuItem icon={LogOut} label="Logout" onClick={handleLogout} danger />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button
              onClick={handleLogin}
              size="md"
            >
              Login
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="nexus-icon-button md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-2xl md:hidden pt-24 px-6"
          >
            <nav className="flex flex-col gap-2">
              <MobileNavButton label="Ai Console" active={isActive("/ai")} onClick={() => { navigate("/ai"); setIsMobileMenuOpen(false); }} />
              <div className="h-px bg-white/5 my-2" />
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 mb-2">Tools</p>
              {tools.map(tool => (
                <MobileNavButton 
                  key={tool.name}
                  label={tool.name} 
                  active={isActive(tool.href)} 
                  onClick={() => { if(!tool.comingSoon) { navigate(tool.href); setIsMobileMenuOpen(false); } }}
                  disabled={tool.comingSoon}
                  badge={tool.badge || (tool.comingSoon ? "Soon" : null)}
                />
              ))}
              <div className="h-px bg-white/5 my-2" />
              <MobileNavButton label="Docs" active={isActive("/docs")} onClick={() => { openRoute("/docs"); setIsMobileMenuOpen(false); }} />
              <MobileNavButton label="Account" active={isActive("/settings")} onClick={() => { navigate("/settings"); setIsMobileMenuOpen(false); }} />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ label, active, onClick, icon: Icon }) {
  return (
    <button 
      onClick={onClick}
      className={cx(
        "focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
        active ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function MobileNavButton({ label, active, onClick, disabled, badge }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "focus-ring flex w-full items-center justify-between rounded-2xl px-4 py-4 text-base font-bold transition-all",
        active ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-gray-400"
      )}
    >
      {label}
      {badge && (
        <span className={`text-[10px] font-black px-2 py-1 rounded ${badge === 'Soon' ? 'bg-gray-800 text-gray-500' : 'bg-[#9b5de5] text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function AccountMenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button 
      onClick={onClick}
      className={cx(
        "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
        danger ? "text-red-400 hover:bg-red-400/10 hover:text-red-200" : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default NexusRBXHeader;
