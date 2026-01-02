// IMPORTS BLOCK (with Helmet import added)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Github, Zap, Settings, Shield, ChevronRight, Loader, Star, DollarSign } from "lucide-react";
import TokensCounterContainer from "../components/TokensCounterContainer";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import SubscribeTabContainer from "../components/SubscribeTabContainer";
import { Helmet } from "react-helmet";

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
    { id: 4, text: "Settings", href: "/settings" },
    { id: 2, text: "Discord", href: "https://discord.gg/", external: true },
  ];

  const featureCards = [
    {
      id: 1,
      title: "Script AI",
      description: "Generate powerful Roblox scripts with a simple prompt using our AI-powered script generator. Save time and boost your Roblox game development workflow.",
      icon: Zap,
      gradient: "from-purple-600 to-pink-500",
      button: { text: "Try Script AI", href: "/ai" },
    },
    {
      id: 2,
      title: "Premium",
      description: "Unlock advanced AI, unlimited scripts, and more. Access exclusive Roblox scripting features and priority support with NexusRBX Premium.",
      icon: null, // We'll use the custom component instead of an icon
      gradient: "from-cyan-500 to-blue-600",
      button: { text: "Subscribe", href: "/subscribe" }, // Button will be replaced by the component
      isSubscribeTab: true,
    },
    {
      id: 3,
      title: "Secure Testing",
      description: "Validate your Roblox mods and scripts in a secure environment without risking your account. Test and debug with confidence.",
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
  return (
    // OPENING OF TOP-LEVEL CONTAINER WITH <Helmet> INSERTED
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      <Helmet>
        <title>NexusRBX — AI Roblox Script Generator & Mod Builder</title>
        <meta name="description" content="NexusRBX is the leading AI Roblox script generator and mod builder. Instantly create Roblox scripts, mods, and developer tools with artificial intelligence. Try Script AI, unlock Premium features, and test securely." />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.origin : "https://nexusrbx.com"} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="NexusRBX" />
        <meta property="og:title" content="NexusRBX — AI Roblox Script Generator & Mod Builder" />
        <meta property="og:description" content="NexusRBX is the best AI-powered Roblox script generator and mod builder. Generate Roblox scripts, mods, and tools with AI. Fast, safe, and built for creators." />
        <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : "https://nexusrbx.com"} />
        <meta property="og:image" content="/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NexusRBX — AI Roblox Script Generator & Mod Builder" />
        <meta name="twitter:description" content="NexusRBX is the #1 AI Roblox script generator and mod builder. Instantly create Roblox scripts, mods, and developer tools with artificial intelligence." />
        <meta name="twitter:image" content="/social-card.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="keywords" content="AI Roblox script generator, Roblox mod builder, Roblox scripting, Roblox AI, generate Roblox scripts, Roblox developer tools, Roblox Premium, secure Roblox testing, Roblox scripting docs, Roblox AI features" />
        <meta name="author" content="NexusRBX" />
        <meta name="theme-color" content="#0D0D0D" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context":"https://schema.org",
            "@type":"Organization",
            "name":"NexusRBX",
            "url":"https://nexusrbx.com",
            "logo":"/logo.png",
            "sameAs":[ "https://discord.gg/", "https://github.com/TravelTable/nexusairbx" ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context":"https://schema.org",
            "@type":"SoftwareApplication",
            "name":"NexusRBX",
            "applicationCategory":"DeveloperApplication",
            "operatingSystem":"Web",
            "description":"NexusRBX is an AI-powered Roblox scripting and mod builder platform. Instantly generate Roblox scripts, mods, and developer tools with artificial intelligence.",
            "image":"/social-card.png",
            "offers":{ "@type":"Offer", "price":"14.99", "priceCurrency":"USD" }
          })}
        </script>
      </Helmet>

      {/* Header */}
      <NexusRBXHeader
        navLinks={navLinks}
        handleNavClick={handleNavClick}
        navigate={navigate}
        user={user}
        handleLogin={handleLogin}
        tokenInfo={tokenInfo}
        tokenLoading={tokenLoading}
      />

      <main className="flex-grow">
        {/* HERO SECTION BLOCK WITH H1 + PARAGRAPH CHANGES AND HERO IMAGE PLACEHOLDER */}
        <section className="min-h-[70vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text">
              AI Roblox Script Generator & Mod Builder — NexusRBX
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Build Roblox mods and scripts in minutes with our <a href="/ai" className="underline decoration-[#9b5de5]/60 hover:decoration-[#9b5de5]">AI script generator</a>. Explore our <a href="/docs" className="underline decoration-[#00f5d4]/60 hover:decoration-[#00f5d4]">Roblox scripting documentation</a> and unlock <a href="/subscribe" className="underline decoration-[#f15bb5]/60 hover:decoration-[#f15bb5]">Premium AI features</a> for advanced Roblox development. NexusRBX helps you generate, test, and deploy Roblox scripts faster and more securely.
            </p>
            <img
              src="/hero-placeholder.webp"
              alt="AI Roblox script generator and mod builder interface"
              width="1600"
              height="900"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              className="mx-auto rounded-2xl border border-gray-800 shadow-lg w-full max-w-5xl mt-6"
            />
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
                autoComplete="off"
                name="roblox-mod-idea"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
                disabled={!inputValue.trim() || loading}
                aria-label="Generate Roblox script with AI"
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

        {/* FEATURES SECTION OPENING WITH H2 AND SAMPLE CARD WITH IMAGE PLACEHOLDER */}
        <section className="py-16 px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
            AI Roblox Scripting Features
          </h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureCards.map((card) => (
              <article
                key={card.id}
                className="relative overflow-hidden rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800 p-6 hover:border-gray-700 transition-all duration-500 group flex flex-col"
                itemScope
                itemType="https://schema.org/Service"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                ></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-[#9b5de5]/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>

                <div className="relative flex-1">
                  {card.isSubscribeTab ? (
                    <>
                      <SubscribeTabContainer
                        onSubscribe={() => navigate("/subscribe")}
                        isSubscribed={false}
                        className="!bg-transparent !border-none !shadow-none p-0"
                      />
                      <img
                        src="/feature-premium.webp"
                        alt="Premium AI features for Roblox development"
                        width="800"
                        height="600"
                        loading="lazy"
                        decoding="async"
                        className="rounded-lg border border-gray-800 mb-4 w-full"
                      />
                    </>
                  ) : (
                    <>
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4`}
                      >
                        {card.icon && <card.icon className="h-6 w-6 text-white" />}
                      </div>
                      {/* Optional image placeholder for Script AI and Secure Testing */}
                      {card.id === 1 && (
                        <img
                          src="/feature-script-ai.webp"
                          alt="Roblox script generator preview"
                          width="800"
                          height="600"
                          loading="lazy"
                          decoding="async"
                          className="rounded-lg border border-gray-800 mb-4 w-full"
                        />
                      )}
                      {card.id === 3 && (
                        <img
                          src="/feature-secure.webp"
                          alt="Secure testing environment for Roblox mods"
                          width="800"
                          height="600"
                          loading="lazy"
                          decoding="async"
                          className="rounded-lg border border-gray-800 mb-4 w-full"
                        />
                      )}
                      <h3 className="text-xl font-bold mb-2" itemProp="name">{card.title}</h3>
                      <p className="text-gray-400" itemProp="description">{card.description}</p>
                      <button
                        className="mt-6 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
                        onClick={() => navigate(card.button.href)}
                        type="button"
                        aria-label={`Learn more about ${card.title} for Roblox scripting`}
                      >
                        {card.button.text}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </article>
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
                <section
                  key={example.id}
                  className={`rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800 overflow-hidden transition-all duration-500 transform ${
                    index <= currentTypewriterIndex
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  aria-label={`Example Roblox script output: ${example.prompt}`}
                >
                  <header className="p-4 border-b border-gray-800 bg-black/40">
                    <p className="text-gray-300 font-medium">
                      "{example.prompt}"
                    </p>
                  </header>
                  <div className="p-4">
                    <pre className="text-sm text-gray-400 font-mono whitespace-pre-wrap overflow-x-auto">
                      <code className={`language-${example.language}`}>
                        {index <= currentTypewriterIndex ? example.output : ""}
                      </code>
                    </pre>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <NexusRBXFooter
        footerLinks={footerLinks}
        handleNavClick={handleNavClick}
        navigate={navigate}
      />

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
