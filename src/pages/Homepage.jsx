import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Github, Zap, Settings, Shield, ChevronRight, Loader, Star, DollarSign } from "lucide-react";
import TokensCounterContainer from "../components/TokensCounterContainer";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import SubscribeTabContainer from "../components/SubscribeTabContainer";

// Container Component
export default function NexusRBXHomepageContainer() {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypewriterIndex, setCurrentTypewriterIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const navigate = useNavigate();

  // Listen for Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch token info when user logs in
  useEffect(() => {
    if (!user) {
      setTokenInfo(null);
      return;
    }
    setTokenLoading(true);
    getEntitlements()
      .then((data) => {
        setTokenInfo(data);
      })
      .catch(() => {
        setTokenInfo(null);
      })
      .finally(() => setTokenLoading(false));
  }, [user]);

  const handleLogin = () => {
    navigate("/signin");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate("/signin");
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!inputValue.trim()) return;

    // Pass prompt to /ai page, but do not trigger generation
    navigate("/ai", {
      state: {
        initialPrompt: inputValue.trim(),
        aiResult: null
      }
    });
    setInputValue("");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const exampleOutputs = [
    {
      id: 1,
      prompt: "Create a teleportation script",
      output:
        "local function teleport(player, position)\n  player.Character:SetPrimaryPartCFrame(CFrame.new(position))\nend",
      language: "lua",
    },
    {
      id: 2,
      prompt: "Generate a flying mod",
      output:
        'local flyScript = Instance.new("Script")\nflyScript.Parent = game.Players.LocalPlayer.Character\n\nlocal flying = false\nlocal speed = 50',
      language: "lua",
    },
    {
      id: 3,
      prompt: "Create a weapon modifier",
      output:
        "local weaponStats = require(game.ReplicatedStorage.WeaponModule)\n\nweaponStats.Damage = weaponStats.Damage * 1.5\nweaponStats.FireRate = weaponStats.FireRate * 1.2",
      language: "lua",
    },
  ];

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setCurrentTypewriterIndex((prev) => {
          if (prev < exampleOutputs.length - 1) {
            return prev + 1;
          } else {
            return 0;
          }
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isTyping, exampleOutputs.length]);

  const navLinks = [
    { id: 1, text: "Docs", href: "/docs" },
    { id: 3, text: "Ai Console", href: "/ai" },
    { id: 2, text: "Discord", href: "https://discord.gg/", external: true },
  ];

  const featureCards = [
    {
      id: 1,
      title: "Script AI",
      description: "Generate powerful Roblox scripts with a simple prompt",
      icon: Zap,
      gradient: "from-purple-600 to-pink-500",
      button: { text: "Try Script AI", href: "/ai" },
    },
    {
      id: 2,
      title: "Premium",
      description: "Unlock advanced AI, unlimited scripts, and more.",
      icon: null, // We'll use the custom component instead of an icon
      gradient: "from-cyan-500 to-blue-600",
      button: { text: "Subscribe", href: "/subscribe" }, // Button will be replaced by the component
      isSubscribeTab: true,
    },
    {
      id: 3,
      title: "Secure Testing",
      description: "Validate your mods without risking your account",
      icon: Shield,
      gradient: "from-pink-500 to-purple-600",
      button: { text: "Learn More", href: "/docs" },
    },
  ];

  const footerLinks = [
    { id: 1, text: "Terms of Service", href: "/terms" },
    { id: 2, text: "Privacy Policy", href: "/privacy" },
    { id: 3, text: "Contact", href: "/contact" },
  ];

  const handleNavClick = (href, external) => (e) => {
    e.preventDefault();
    if (external) {
      window.open(href, "_blank", "noopener noreferrer");
    } else {
      navigate(href);
    }
  };

  return (
    <NexusRBXHomepage
      inputValue={inputValue}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      navLinks={navLinks}
      featureCards={featureCards}
      exampleOutputs={exampleOutputs}
      footerLinks={footerLinks}
      isTyping={isTyping}
      currentTypewriterIndex={currentTypewriterIndex}
      handleNavClick={handleNavClick}
      navigate={navigate}
      loading={loading}
      error={error}
      user={user}
      handleLogin={handleLogin}
      handleLogout={handleLogout}
      tokenInfo={tokenInfo}
      tokenLoading={tokenLoading}
    />
  );
}

// UI Component
function NexusRBXHomepage({
  inputValue,
  handleInputChange,
  handleSubmit,
  navLinks,
  featureCards,
  exampleOutputs,
  footerLinks,
  isTyping,
  currentTypewriterIndex,
  handleNavClick,
  navigate,
  loading,
  error,
  user,
  handleLogin,
  handleLogout,
  tokenInfo,
  tokenLoading
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
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
          <nav className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link, idx) => (
              <React.Fragment key={link.id}>
                <a
                  href={link.href}
                  onClick={handleNavClick(link.href, link.external)}
                  className="text-gray-300 hover:text-white transition-colors duration-300"
                  rel={link.external ? "noopener noreferrer" : undefined}
                  target={link.external ? "_blank" : undefined}
                >
                  {link.text}
                </a>
                {link.text === "Discord" && (
                  <span className="inline-block w-6" aria-hidden="true"></span>
                )}
              </React.Fragment>
            ))}
{user && (
  <div className="flex items-center space-x-3 mr-2">
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
                  <a
                    href={link.href}
                    tabIndex={0}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(link.href, link.external)(e);
                    }}
                    className="text-gray-300 hover:text-white transition-colors duration-300"
                    rel={link.external ? "noopener noreferrer" : undefined}
                    target={link.external ? "_blank" : undefined}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        setMobileMenuOpen(false);
                        handleNavClick(link.href, link.external)(e);
                      }
                    }}
                  >
                    {link.text}
                  </a>
                  {link.text === "Discord" && (
                    <span className="inline-block w-6" aria-hidden="true"></span>
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

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="min-h-[70vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text">
              Welcome to NexusRBX
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              AI-powered Roblox scripting & simulation — no downloads, just innovation.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col md:flex-row gap-3 max-w-2xl mx-auto"
            >
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type a Roblox mod idea…"
                className="flex-grow px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 transition-all duration-300"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                aria-label="Type your Roblox mod idea"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
                disabled={!inputValue.trim() || loading}
                aria-label="Generate with AI"
              >
                {loading ? (
                  <>
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate with AI
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>
            {error && (
              <div className="text-red-400 mt-2" role="alert">{error}</div>
            )}
            <div className="text-sm text-gray-500 mt-2">
              <span>Type your Roblox mod idea and press <b>Enter</b> or click "Generate with AI"</span>
            </div>
          </div>
        </section>



        {/* Feature Cards */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureCards.map((card) => (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800 p-6 hover:border-gray-700 transition-all duration-500 group flex flex-col"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                ></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-[#9b5de5]/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>

                <div className="relative flex-1">
                  {card.isSubscribeTab ? (
                    <SubscribeTabContainer
                      onSubscribe={() => navigate("/subscribe")}
                      isSubscribed={false}
                      className="!bg-transparent !border-none !shadow-none p-0"
                    />
                  ) : (
                    <>
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4`}
                      >
                        {card.icon && <card.icon className="h-6 w-6 text-white" />}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                      <p className="text-gray-400">{card.description}</p>
                      <button
                        className="mt-6 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
                        onClick={() => navigate(card.button.href)}
                        type="button"
                      >
                        {card.button.text}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Example Output Feed */}
        <section className="py-16 px-4 bg-black/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              See What NexusRBX Can Generate
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {exampleOutputs.map((example, index) => (
                <div
                  key={example.id}
                  className={`rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800 overflow-hidden transition-all duration-500 transform ${
                    index <= currentTypewriterIndex
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                >
                  <div className="p-4 border-b border-gray-800 bg-black/40">
                    <p className="text-gray-300 font-medium">
                      "{example.prompt}"
                    </p>
                  </div>
                  <div className="p-4">
                    <pre className="text-sm text-gray-400 font-mono whitespace-pre-wrap overflow-x-auto">
                      <code className={`language-${example.language}`}>
                        {index <= currentTypewriterIndex ? example.output : ""}
                      </code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
            {footerLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={handleNavClick(link.href, link.external)}
                className="text-gray-400 hover:text-white transition-colors duration-300"
                rel={link.external ? "noopener noreferrer" : undefined}
                target={link.external ? "_blank" : undefined}
              >
                {link.text}
              </a>
            ))}
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

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}