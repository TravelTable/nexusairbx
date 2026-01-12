import React from 'react';
import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink, 
  Copy, 
  Check, 
  Github,
  BookOpen,
  Code,
  Terminal,
  Shield,
  Zap,
  Settings,
  HelpCircle,
  FileText,
  Home,
  X,
  Lock,
  AlertCircle,
  Cpu,
  Layers,
  Wand2
} from "lucide-react";

// Container Component
export default function NexusRBXDocsPageContainer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("getting-started");
  const [expandedCategories, setExpandedCategories] = useState({
    "getting-started": true,
    "core-concepts": false,
    "api-reference": false,
    "advanced-usage": false,
    "troubleshooting": false
  });
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeToc, setActiveToc] = useState("introduction");
  
  const mainContentRef = useRef(null);
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };
  
  const handleSectionClick = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  };
  
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const headings = mainContentRef.current.querySelectorAll('h2, h3');
      if (headings.length === 0) return;
      const scrollPosition = mainContentRef.current.scrollTop;
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.offsetTop - 100 <= scrollPosition) {
          const id = heading.id;
          if (id) setActiveToc(id);
          break;
        }
      }
    };
    const contentElement = mainContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [activeSection]);
  
  const sidebarCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      items: [
        { id: "introduction", title: "Introduction", href: "#introduction" },
        { id: "account-setup", title: "Account Setup", href: "#account-setup" },
        { id: "plugin-install", title: "Plugin Install", href: "#plugin-install" },
        { id: "ai-console", title: "AI Console", href: "#ai-console" },
        { id: "quick-start", title: "Quick Start", href: "#quick-start" }
      ]
    },
    {
      id: "key-features",
      title: "Key Features",
      icon: Zap,
      items: [
        { id: "ai-generation", title: "AI Generation", href: "#ai-generation" },
        { id: "simulation", title: "Simulation", href: "#simulation" },
        { id: "customization", title: "Customization", href: "#customization" }
      ]
    },
    {
      id: "core-concepts",
      title: "Core Concepts",
      icon: Cpu,
      items: [
        { id: "how-it-works", title: "How It Works", href: "#how-it-works" },
        { id: "prompting", title: "Prompting Tips", href: "#prompting" },
        { id: "debugging", title: "Debugging", href: "#debugging" },
        { id: "limits", title: "AI Limits", href: "#limits" }
      ]
    },
    {
      id: "advanced-usage",
      title: "Advanced Usage",
      icon: Settings,
      items: [
        { id: "templates", title: "Custom Templates", href: "#templates" },
        { id: "advanced-prompting", title: "Advanced Prompts", href: "#advanced-prompting" },
        { id: "workflows", title: "Workflows", href: "#workflows" },
        { id: "security", title: "Security", href: "#security" }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: AlertCircle,
      items: [
        { id: "common-issues", title: "Common Issues", href: "#common-issues" },
        { id: "faq", title: "FAQ", href: "#faq" }
      ]
    }
  ];
  
  const codeSnippets = {
    "ai-pipeline": `// Generate a full UI and Lua logic in one go
const result = await NexusRBX.aiPipeline({
  prompt: "A futuristic sci-fi inventory system with 20 slots",
  canvasSize: { x: 800, y: 600 },
  themeHint: { primary: "#00f5d4", radius: 8 },
  maxSystemsTokens: 2500
});

console.log(result.lua); // The generated Luau code`,
    
    "ai-finalize-lua": `// Convert a visual board state into functional Lua
const luaCode = await NexusRBX.aiFinalizeLua({
  boardState: currentBoard,
  prompt: "Add a sorting feature to this inventory",
  gameSpec: "R15, standard character movement"
});`,
    
    "roblox-export": `-- Example of how to use generated code in Roblox Studio
local UI = require(script.Parent.GeneratedUI)
UI.init({
  theme = "Dark",
  animations = true
})`
  };
  
  return (
    <NexusRBXDocsPage
      searchQuery={searchQuery}
      activeSection={activeSection}
      expandedCategories={expandedCategories}
      copiedSnippet={copiedSnippet}
      isMobileMenuOpen={isMobileMenuOpen}
      activeToc={activeToc}
      sidebarCategories={sidebarCategories}
      codeSnippets={codeSnippets}
      handleSearch={handleSearch}
      toggleCategory={toggleCategory}
      handleCopyCode={handleCopyCode}
      handleSectionClick={handleSectionClick}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      mainContentRef={mainContentRef}
    />
  );
}

// UI Component
function NexusRBXDocsPage({
  searchQuery,
  activeSection,
  expandedCategories,
  copiedSnippet,
  isMobileMenuOpen,
  activeToc,
  sidebarCategories,
  codeSnippets,
  handleSearch,
  toggleCategory,
  handleCopyCode,
  handleSectionClick,
  setIsMobileMenuOpen,
  mainContentRef
}) {
  const activeCategory = sidebarCategories.find(cat => cat.id === activeSection);
  const activeCategoryItems = activeCategory ? activeCategory.items : [];
  
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              NexusRBX
            </div>
            <div className="ml-2 text-sm text-gray-400">Docs</div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search documentation..."
                className="w-full px-4 py-2 rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:outline-none focus:ring-1 focus:ring-[#9b5de5]/50 transition-all duration-300 pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a href="/ai" className="text-gray-300 hover:text-white transition-colors duration-300">AI Console</a>
          </nav>
          
          <button 
            className="md:hidden text-gray-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className={`w-72 bg-black/40 border-r border-gray-800 md:relative fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} transition-transform duration-300 md:h-[calc(100vh-64px)] overflow-y-auto`}>
          <nav className="p-4">
            {sidebarCategories.map(category => (
              <div key={category.id} className="mb-4">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-800/50 transition-colors duration-300"
                >
                  <div className="flex items-center">
                    <category.icon className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">{category.title}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${expandedCategories[category.id] ? 'transform rotate-180' : ''}`} />
                </button>
                
                {expandedCategories[category.id] && (
                  <div className="mt-1 ml-6 space-y-1">
                    {category.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSectionClick(category.id)}
                        className={`w-full text-left py-1 px-3 rounded-md text-sm ${activeSection === category.id && activeToc === item.id ? "text-[#9b5de5] bg-[#9b5de5]/10" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"} transition-colors duration-300`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-grow flex">
          <div ref={mainContentRef} className="flex-grow overflow-y-auto h-[calc(100vh-64px)]">
            <div className="max-w-3xl mx-auto px-4 py-8">
              {activeSection === "getting-started" && <GettingStartedContent />}
              {activeSection === "key-features" && <KeyFeaturesContent />}
              {activeSection === "core-concepts" && <CoreConceptsContent />}
              {activeSection === "advanced-usage" && <AdvancedUsageContent />}
              {activeSection === "troubleshooting" && <TroubleshootingContent />}
            </div>
          </div>
          
          {/* Table of Contents */}
          <aside className="hidden lg:block w-64 p-6 border-l border-gray-800 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="sticky top-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4">On This Page</h3>
              <nav className="space-y-2">
                {activeCategoryItems.map(item => (
                  <a key={item.id} href={item.href} className={`block text-sm py-1 border-l-2 pl-3 ${activeToc === item.id ? "border-[#9b5de5] text-[#9b5de5]" : "border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700"} transition-colors duration-300`}>
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">NexusRBX</div>
            <div className="text-sm text-gray-400">v1.5.0</div>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="mailto:support@nexusrbx.com" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GettingStartedContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Getting Started</h1>
      
      <section id="introduction" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Introduction</h2>
        <p className="text-gray-300 mb-4">NexusRBX is an AI-driven platform designed to supercharge Roblox development. It allows Roblox developers and enthusiasts to generate, test, and refine Roblox scripts using natural language and advanced AI, all without needing a complex setup.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white mb-2 flex items-center"><Wand2 className="h-4 w-4 mr-2 text-[#00f5d4]" /> AI Generation</h4>
            <p className="text-xs text-gray-400">Turn plain English prompts into functional Lua scripts tailored for Roblox.</p>
          </div>
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white mb-2 flex items-center"><Shield className="h-4 w-4 mr-2 text-[#00f5d4]" /> Safe Sandbox</h4>
            <p className="text-xs text-gray-400">Simulate and test generated code in a safe environment that mimics Roblox's engine.</p>
          </div>
        </div>
      </section>

      <section id="account-setup" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Account Setup</h2>
        <p className="text-gray-300 mb-4">To begin using NexusRBX, you'll need to create a free account on our website. Your account lets you access the AI console, track your script history, and manage tokens.</p>
        <ul className="list-disc list-inside text-gray-400 space-y-2">
          <li><strong>Register:</strong> Visit nexusrbx.com and click Sign Up.</li>
          <li><strong>Verify:</strong> Confirm your email address to enable all features.</li>
          <li><strong>API Key:</strong> Find your secret API key in account settings for plugin use.</li>
        </ul>
      </section>

      <section id="plugin-install" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Installing the Studio Plugin</h2>
        <p className="text-gray-300 mb-4">The official Roblox Studio Plugin allows you to generate and insert scripts directly into your game.</p>
        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800">
          <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
            <li>Open Roblox Studio and go to the <strong>Plugins</strong> tab.</li>
            <li>Search for <strong>"NexusRBX"</strong> in the Plugin Marketplace.</li>
            <li>Install the plugin and open the NexusRBX panel.</li>
            <li>Enter your <strong>API Key</strong> to authenticate.</li>
          </ol>
        </div>
      </section>

      <section id="ai-console" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Navigating the AI Console</h2>
        <p className="text-gray-300 mb-4">The AI Console is where you generate and test scripts. Key areas include:</p>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="w-24 shrink-0 font-bold text-white text-sm">Prompt Input</div>
            <div className="text-sm text-gray-400">Describe what you want in plain language.</div>
          </div>
          <div className="flex items-start">
            <div className="w-24 shrink-0 font-bold text-white text-sm">Output Panel</div>
            <div className="text-sm text-gray-400">View and edit the generated Lua code.</div>
          </div>
          <div className="flex items-start">
            <div className="w-24 shrink-0 font-bold text-white text-sm">Simulation</div>
            <div className="text-sm text-gray-400">Run the script in our sandbox to check for errors.</div>
          </div>
        </div>
      </section>

      <section id="quick-start" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Quick Start Guide</h2>
        <p className="text-gray-300 mb-4">Let's create a simple teleportation pad:</p>
        <div className="bg-black/60 p-4 rounded-lg border border-gray-800">
          <p className="text-sm text-[#00f5d4] mb-2 font-mono">Prompt: "Create a part that teleports a player to a random location within 50 studs when touched."</p>
          <ol className="list-decimal list-inside text-xs text-gray-500 space-y-1">
            <li>Type the prompt and click <strong>Generate</strong>.</li>
            <li>Review the code in the output panel.</li>
            <li>Click <strong>Simulate</strong> to verify logic.</li>
            <li>Click <strong>Send to Studio</strong> to insert it into your game.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function KeyFeaturesContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Key Features</h1>
      <div className="grid grid-cols-1 gap-6">
        <section id="ai-generation" className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5] flex items-center"><Code className="h-5 w-5 mr-2" /> AI Script Generation</h2>
          <p className="text-gray-400 text-sm">Use natural language prompts to generate code. The AI knows about common Roblox objects, properties, and patterns. It produces commented code and brief explanations to help you learn.</p>
        </section>

        <section id="simulation" className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5] flex items-center"><Terminal className="h-5 w-5 mr-2" /> Secure Simulation</h2>
          <p className="text-gray-400 text-sm">Our sandboxed environment mimics Roblox's server behavior. It intercepts dangerous actions and prevents harm, allowing you to debug and fine-tune before deploying to Studio.</p>
        </section>

        <section id="customization" className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5] flex items-center"><Settings className="h-5 w-5 mr-2" /> Customization Options</h2>
          <p className="text-gray-400 text-sm">Choose between Script, LocalScript, or ModuleScript. Use custom templates or styles to match your existing codebase. Set parameters like max tokens and safe mode.</p>
        </section>
      </div>
    </div>
  );
}

function CoreConceptsContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Core Concepts</h1>
      
      <section id="how-it-works" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">How NexusRBX Works</h2>
        <p className="text-gray-300">NexusRBX uses a powerful AI engine fine-tuned for Roblox's ecosystem. It interprets your natural language, predicts the necessary Luau code, and delivers a formatted, commented result in seconds.</p>
      </section>

      <section id="prompting" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Writing Effective Prompts</h2>
        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800 space-y-4">
          <p className="text-sm text-gray-300"><strong>Be Specific:</strong> Instead of "make a leaderboard", say "Create a leaderstats leaderboard that tracks Coins using an IntValue."</p>
          <p className="text-sm text-gray-300"><strong>Mention Context:</strong> Specify if it's for a LocalScript (client) or a server Script.</p>
          <p className="text-sm text-gray-300"><strong>Iterate:</strong> If the first result isn't perfect, refine your prompt. "Great, but now make it only work at night."</p>
        </div>
      </section>

      <section id="debugging" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Testing and Debugging</h2>
        <p className="text-gray-300 mb-4">Use the simulation console to catch errors. If the simulation shows an error, read the stack trace. You can even ask the AI: "The simulation shows an error about X. How can we fix that?"</p>
      </section>

      <section id="limits" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Strengths and Limits</h2>
        <p className="text-gray-300">The AI is great at common math, boilerplate, and standard systems. However, it doesn't visually design GUIs in Studio and might not know about features released yesterday. Use it as an assistant, not a total replacement.</p>
      </section>
    </div>
  );
}

function AdvancedUsageContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Advanced Usage</h1>
      
      <section id="templates" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Custom Templates</h2>
        <p className="text-gray-300 mb-4">Pro and Team users can define custom code scaffolds. This ensures the AI generates code that fits your specific framework or style guide.</p>
      </section>

      <section id="advanced-prompting" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Advanced Prompting</h2>
        <p className="text-gray-300 mb-4">Try "role-playing" with the AI: "Act as a Roblox optimization expert and rewrite this loop." Or provide examples of your existing code to match the style.</p>
      </section>

      <section id="workflows" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Integration Workflows</h2>
        <p className="text-gray-300 mb-4">Combine manual architecture with AI implementation. Manually set up your RemoteEvents, then use NexusRBX to write the complex logic handlers for them.</p>
      </section>

      <section id="security" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Security Best Practices</h2>
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
            <li>Always review AI code for open RemoteEvents or vulnerabilities.</li>
            <li>Never put real API keys or secrets directly into prompts.</li>
            <li>Use the AI to help patch exploits by describing the scenario.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function TroubleshootingContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Troubleshooting & FAQ</h1>
      
      <section id="common-issues" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Common Issues</h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white">Incomplete Answers</h4>
            <p className="text-sm text-gray-400">If the code cuts off, click Regenerate or increase your Max Tokens setting.</p>
          </div>
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white">Simulation Errors</h4>
            <p className="text-sm text-gray-400">Ensure your code doesn't rely on objects that aren't in the sandbox. Test in Studio for final verification.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 mt-12">
        <h2 className="text-2xl font-bold mb-4 text-[#9b5de5]">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-white">Is NexusRBX free?</h4>
            <p className="text-sm text-gray-400">Yes, we offer a free tier with a monthly token allowance. Paid plans offer more tokens and advanced models like GPT-5.2.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">What are tokens?</h4>
            <p className="text-sm text-gray-400">Tokens measure AI usage. Both your prompt and the AI's response count towards your monthly limit.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Do tokens roll over?</h4>
            <p className="text-sm text-gray-400">Subscription tokens reset monthly. However, Pay-As-You-Go (PAYG) packs never expire.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Is this officially supported by Roblox?</h4>
            <p className="text-sm text-gray-400">No, we are an independent tool. Using NexusRBX is allowed as long as you follow Roblox's community rules.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
