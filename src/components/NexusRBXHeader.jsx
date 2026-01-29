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
  ShieldCheck,
  Download
} from "lucide-react";
import TokensCounterContainer from "./TokensCounterContainer";
import { useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useBilling } from "../context/BillingContext";

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
  const { entitlements } = useBilling();
  const isPremium = entitlements?.includes("pro") || entitlements?.includes("team");

  const isActive = (path) => location.pathname === path;

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
      name: "Roblox Plugin",
      description: "Import UI directly into Studio",
      icon: Download,
      href: "/settings", // Direct to account for sync code
      premium: true,
      badge: "BETA"
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
      <header className={`${isAiPage ? 'w-full' : 'w-full max-w-6xl'} bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2.5 flex items-center justify-between pointer-events-auto shadow-2xl transition-all duration-500`}>
        {/* Logo */}
        <div 
          className="text-xl font-black bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer flex items-center gap-2"
          onClick={() => navigate("/")}
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
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${isToolsOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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
                  className="absolute top-full left-0 mt-2 w-72 bg-[#0D0D0D] border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden"
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
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group ${tool.comingSoon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
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

          <NavButton label="Docs" active={isActive("/docs")} onClick={() => navigate("/docs")} icon={Layout} />
        </nav>

        {/* Right Side: Tokens & Account */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden lg:block">
              <TokensCounterContainer
                tokens={{
                  sub: {
                    remaining:
                      typeof tokenInfo?.sub?.limit === "number" && typeof tokenInfo?.sub?.used === "number"
                        ? tokenInfo.sub.limit - tokenInfo.sub.used
                        : 0,
                    limit: tokenInfo?.sub?.limit ?? 0,
                  },
                  payg: {
                    remaining:
                      typeof tokenInfo?.payg?.remaining === "number"
                        ? tokenInfo.payg.remaining
                        : 0,
                  },
                }}
                isLoading={tokenLoading}
                showRefreshButton={false}
                variant="header"
              />
            </div>
          )}

          {user ? (
            <div className="relative" ref={accountRef}>
              <button 
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="h-9 w-9 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] p-0.5 transition-transform hover:scale-105 active:scale-95"
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
                    className="absolute top-full right-0 mt-2 w-56 bg-[#0D0D0D] border border-white/10 rounded-2xl p-2 shadow-2xl"
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
            <button 
              onClick={handleLogin}
              className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Login
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              <MobileNavButton label="Docs" active={isActive("/docs")} onClick={() => { navigate("/docs"); setIsMobileMenuOpen(false); }} />
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
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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
      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-lg font-bold transition-all ${active ? 'bg-white/10 text-white' : 'text-gray-400'} ${disabled ? 'opacity-50' : ''}`}
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
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${danger ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default NexusRBXHeader;
