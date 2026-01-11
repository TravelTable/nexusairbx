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
  Lock
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
    "security": false
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
    
    // Scroll to top when changing sections
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  };
  
  // Handle TOC highlighting based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      
      const headings = mainContentRef.current.querySelectorAll('h2, h3');
      if (headings.length === 0) return;
      
      // Find the heading that's currently in view
      const scrollPosition = mainContentRef.current.scrollTop;
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.offsetTop - 100 <= scrollPosition) {
          const id = heading.id;
          if (id) {
            setActiveToc(id);
          }
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
  
  // Define all data used by sub-components
  const sidebarCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      items: [
        { id: "introduction", title: "Introduction", href: "#introduction" },
        { id: "installation", title: "Installation", href: "#installation" },
        { id: "quick-start", title: "Quick Start Guide", href: "#quick-start" },
        { id: "key-features", title: "Key Features", href: "#key-features" }
      ]
    },
    {
      id: "core-concepts",
      title: "Core Concepts",
      icon: Code,
      items: [
        { id: "ai-scripting", title: "AI Scripting", href: "#ai-scripting" },
        { id: "mod-generation", title: "Mod Generation", href: "#mod-generation" },
        { id: "simulation-environment", title: "Simulation Environment", href: "#simulation-environment" }
      ]
    },
    {
      id: "api-reference",
      title: "API Reference (Soon)",
      icon: Terminal,
      comingSoon: true,
      items: [
        { id: "script-api", title: "Script API", href: "#script-api" },
        { id: "simulation-api", title: "Simulation API", href: "#simulation-api" },
        { id: "export-api", title: "Export API", href: "#export-api" }
      ]
    },
    {
      id: "advanced-usage",
      title: "Advanced Usage",
      icon: Settings,
      items: [
        { id: "custom-templates", title: "Custom Templates", href: "#custom-templates" },
        { id: "advanced-prompting", title: "Advanced Prompting", href: "#advanced-prompting" },
        { id: "integration", title: "Integration with Roblox", href: "#integration" }
      ]
    },
    {
      id: "security",
      title: "Security",
      icon: Shield,
      items: [
        { id: "safe-execution", title: "Safe Execution", href: "#safe-execution" },
        { id: "permissions", title: "Permissions", href: "#permissions" },
        { id: "best-practices", title: "Security Best Practices", href: "#best-practices" }
      ]
    }
  ];
  
  const codeSnippets = {
    "installation": `-- Install via Roblox Plugin
local NexusRBX = require(game:GetService("ReplicatedStorage").NexusRBX)

-- Initialize the API
NexusRBX.init({
  apiKey = "YOUR_API_KEY",
  environment = "production"
})`,
    
    "quick-start": `-- Generate a simple script using AI
local scriptResult = NexusRBX.generateScript({
  prompt = "Create a teleportation pad that moves players to a random location",
  options = {
    maxTokens = 500,
    safeMode = true
  }
})

-- Execute in simulation environment
local simulationResult = NexusRBX.simulate(scriptResult.code)

-- Check for errors
if simulationResult.success then
  print("Script works as expected!")
else
  print("Simulation failed:", simulationResult.error)
end`,
    
    "ai-scripting": `-- Example of advanced AI scripting with parameters
local weaponMod = NexusRBX.generateScript({
  prompt = "Create a weapon damage modifier",
  parameters = {
    damageMultiplier = 1.5,
    fireRateBoost = true,
    recoilReduction = 0.3
  },
  style = "optimized", -- or "readable"
  format = "module" -- or "script", "localscript"
})

print(weaponMod.code)`,
    
    "simulation-api": `-- Set up a custom simulation environment
local simulationEnv = NexusRBX.createSimulation({
  mode = "sandbox",
  timeLimit = 5, -- seconds
  memoryLimit = 50, -- MB
  mockServices = {
    "Players",
    "Workspace",
    "ReplicatedStorage"
  }
})

-- Add mock players
simulationEnv:addPlayer({
  name = "TestPlayer1",
  position = Vector3.new(0, 5, 0)
})

-- Run the script in the simulation
local result = simulationEnv:execute(myScript)

-- Get simulation metrics
print("Execution time:", result.metrics.executionTime)
print("Memory usage:", result.metrics.memoryUsage)`,
    
    "custom-templates": `-- Create a custom template for AI generation
NexusRBX.createTemplate({
  name = "AdminCommands",
  description = "Template for creating admin command scripts",
  code = [[
    local AdminCommands = {}
    
    -- Command handler
    local function handleCommand(player, command, ...)
      if not AdminCommands[command] then
        return false, "Command not found"
      end
      
      return AdminCommands[command](player, ...)
    end
    
    -- Register commands below
    -- {{COMMANDS}}
    
    return AdminCommands
  ]],
  placeholders = {
    "{{COMMANDS}}"
  }
})

-- Use the template
local adminScript = NexusRBX.generateScript({
  prompt = "Create kick, ban, and unban admin commands",
  template = "AdminCommands"
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
  // Find the active category and its items
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
            <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <Github className="h-4 w-4 mr-1" />
              GitHub
            </a>
          </nav>
          
          <button 
            className="md:hidden text-gray-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-4">
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
      </header>

      <div className="flex-grow flex flex-col md:flex-row">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
        
        {/* Sidebar */}
        <aside 
          className={`w-72 bg-black/40 border-r border-gray-800 md:relative fixed inset-y-0 left-0 z-50 transform ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } transition-transform duration-300 md:h-[calc(100vh-64px)] overflow-y-auto`}
        >
          <div className="sticky top-0 bg-black/60 backdrop-blur-sm z-10 p-4 border-b border-gray-800 md:hidden">
            <div className="flex justify-between items-center">
              <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                NexusRBX Docs
              </div>
              <button 
                className="text-gray-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
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
                  <ChevronDown 
                    className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                      expandedCategories[category.id] ? 'transform rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {expandedCategories[category.id] && (
                  <div className="mt-1 ml-6 space-y-1">
                    {category.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSectionClick(category.id)}
                        className={`w-full text-left py-1 px-3 rounded-md text-sm ${
                          activeSection === category.id && activeToc === item.id
                            ? "text-[#9b5de5] bg-[#9b5de5]/10"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"
                        } transition-colors duration-300`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          
          <div className="p-4 border-t border-gray-800">
            <div className="rounded-lg bg-gray-900/40 p-4">
              <h3 className="text-sm font-medium flex items-center">
                <HelpCircle className="h-4 w-4 mr-2 text-[#9b5de5]" />
                Need Help?
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Join our Discord community for support or check out our video tutorials.
              </p>
              <div className="mt-3 flex space-x-2">
                <a 
                  href="#" 
                  className="text-xs px-3 py-1 rounded-md bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-[#9b5de5] hover:bg-[#9b5de5]/30 transition-colors duration-300"
                >
                  Discord
                </a>
                <a 
                  href="#" 
                  className="text-xs px-3 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors duration-300"
                >
                  Tutorials
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow flex">
          {/* Documentation Content */}
          <div 
            ref={mainContentRef}
            className="flex-grow overflow-y-auto h-[calc(100vh-64px)]"
          >
            <div className="max-w-3xl mx-auto px-4 py-8">
              {activeSection === "getting-started" && (
                <GettingStartedContent 
                  codeSnippets={codeSnippets} 
                  copiedSnippet={copiedSnippet} 
                  handleCopyCode={handleCopyCode} 
                />
              )}
              
              {activeSection === "core-concepts" && (
                <CoreConceptsContent 
                  codeSnippets={codeSnippets} 
                  copiedSnippet={copiedSnippet} 
                  handleCopyCode={handleCopyCode} 
                />
              )}
              
              {activeSection === "api-reference" && (
                <div className="relative">
                  <div className="absolute inset-0 z-10 bg-[#0D0D0D]/80 backdrop-blur-sm flex items-center justify-center rounded-2xl border border-white/5">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-[#9b5de5]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#9b5de5]/30">
                        <Lock className="w-8 h-8 text-[#9b5de5]" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Public API Coming Soon</h2>
                      <p className="text-gray-400 max-w-xs mx-auto">We are currently finalizing our public REST API for external developers. Documentation will be available shortly.</p>
                    </div>
                  </div>
                  <div className="opacity-20 pointer-events-none select-none">
                    <APIReferenceContent 
                      codeSnippets={codeSnippets} 
                      copiedSnippet={copiedSnippet} 
                      handleCopyCode={handleCopyCode} 
                    />
                  </div>
                </div>
              )}
              
              {activeSection === "advanced-usage" && (
                <AdvancedUsageContent 
                  codeSnippets={codeSnippets} 
                  copiedSnippet={copiedSnippet} 
                  handleCopyCode={handleCopyCode} 
                />
              )}
              
              {activeSection === "security" && (
                <SecurityContent 
                  codeSnippets={codeSnippets} 
                  copiedSnippet={copiedSnippet} 
                  handleCopyCode={handleCopyCode} 
                />
              )}
            </div>
          </div>
          
          {/* Table of Contents */}
          <aside className="hidden lg:block w-64 p-6 border-l border-gray-800 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="sticky top-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4">On This Page</h3>
              <nav className="space-y-2">
                {activeCategoryItems.map(item => (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`block text-sm py-1 border-l-2 pl-3 ${
                      activeToc === item.id
                        ? "border-[#9b5de5] text-[#9b5de5]"
                        : "border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700"
                    } transition-colors duration-300`}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
              
              <div className="mt-8 pt-6 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Resources</h4>
                <div className="space-y-2">
                  <a 
                    href="#" 
                    className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-300"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    API Reference PDF
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-300"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Example Repository
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Roblox Developer Hub
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">
              NexusRBX
            </div>
            <div className="text-sm text-gray-400">Documentation v1.2.0</div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Terms</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 text-center text-gray-500 text-sm">
          © 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Content Components for each section
function GettingStartedContent({ codeSnippets, copiedSnippet, handleCopyCode }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Getting Started with NexusRBX</h1>
        <div className="text-gray-400 text-lg">
          Welcome to NexusRBX documentation. Learn how to use our AI-powered platform to create, test, and deploy Roblox mods safely and efficiently.
        </div>
      </div>
      
      <section id="introduction" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Introduction</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX is an AI-driven platform designed specifically for Roblox developers and enthusiasts. It allows you to generate, simulate, and test Roblox scripts and mods without the need for complex development environments or risking your Roblox account.
        </p>
        <p className="text-gray-300 mb-4">
          With NexusRBX, you can:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Generate Roblox scripts using natural language prompts</li>
          <li>Test scripts in a secure, sandboxed environment</li>
          <li>Simulate how mods would behave in a real Roblox game</li>
          <li>Export working scripts for use in your Roblox projects</li>
          <li>Learn Roblox scripting through AI-generated examples</li>
        </ul>
        <p className="text-gray-300">
          Whether you're a seasoned Roblox developer looking to streamline your workflow or a beginner wanting to learn scripting, NexusRBX provides the tools you need to succeed.
        </p>
      </section>
      
      <section id="installation" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Installation</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX can be used directly through our web interface or installed as a Roblox Studio plugin for seamless integration with your development workflow.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Web Interface</h3>
        <p className="text-gray-300 mb-4">
          To use the web interface, simply:
        </p>
        <ol className="list-decimal list-inside text-gray-300 space-y-2 mb-4">
          <li>Create an account at <a href="#" className="text-[#9b5de5] hover:underline">nexusrbx.com</a></li>
          <li>Verify your email address</li>
          <li>Log in to access the AI Console</li>
        </ol>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Roblox Studio Plugin</h3>
        <p className="text-gray-300 mb-4">
          To install the Roblox Studio plugin:
        </p>
        <ol className="list-decimal list-inside text-gray-300 space-y-2 mb-4">
          <li>Open Roblox Studio</li>
          <li>Go to the Plugins tab</li>
          <li>Click on the Plugin Marketplace</li>
          <li>Search for "NexusRBX"</li>
          <li>Click Install</li>
        </ol>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">Installation Code</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets.installation, "installation")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "installation" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets.installation}</code>
          </pre>
        </div>
        
        <p className="text-gray-300">
          After installation, you'll need to authenticate with your NexusRBX account. You can find your API key in your account settings on the NexusRBX website.
        </p>
      </section>
      
      <section id="quick-start" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Quick Start Guide</h2>
        <p className="text-gray-300 mb-4">
          Let's create your first AI-generated Roblox script and test it in the simulation environment.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Step 1: Generate a Script</h3>
        <p className="text-gray-300 mb-4">
          Start by describing what you want your script to do. For example, "Create a teleportation pad that moves players to a random location."
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Step 2: Review and Modify</h3>
        <p className="text-gray-300 mb-4">
          NexusRBX will generate a script based on your description. Review the code and make any necessary adjustments.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Step 3: Test in Simulation</h3>
        <p className="text-gray-300 mb-4">
          Run the script in our simulation environment to ensure it works as expected without any errors.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Step 4: Export and Use</h3>
        <p className="text-gray-300 mb-4">
          Once you're satisfied with the script, export it for use in your Roblox game.
        </p>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">Quick Start Example</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets["quick-start"], "quick-start")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "quick-start" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets["quick-start"]}</code>
          </pre>
        </div>
      </section>
      
      <section id="key-features" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Key Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#f15bb5] flex items-center justify-center mr-3">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">AI Script Generation</h3>
            </div>
            <p className="text-gray-400">
              Generate Roblox scripts using natural language prompts. Our AI understands Roblox-specific concepts and can create complex scripts with minimal input.
            </p>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] flex items-center justify-center mr-3">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">Secure Simulation</h3>
            </div>
            <p className="text-gray-400">
              Test scripts in a sandboxed environment that mimics Roblox's behavior without risking your account or game integrity.
            </p>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f15bb5] to-[#00f5d4] flex items-center justify-center mr-3">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">Customization Options</h3>
            </div>
            <p className="text-gray-400">
              Fine-tune AI-generated scripts with parameters, templates, and style preferences to match your specific needs.
            </p>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#f15bb5] flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">Safety First</h3>
            </div>
            <p className="text-gray-400">
              All scripts are analyzed for potential security issues and harmful code patterns before execution.
            </p>
          </div>
        </div>
        
        <p className="text-gray-300">
          These features work together to provide a comprehensive platform for Roblox script development, whether you're creating simple utilities or complex game mechanics.
        </p>
      </section>
    </div>
  );
}

function CoreConceptsContent({ codeSnippets, copiedSnippet, handleCopyCode }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Core Concepts</h1>
        <div className="text-gray-400 text-lg">
          Understanding the fundamental concepts behind NexusRBX will help you make the most of the platform's capabilities.
        </div>
      </div>
      
      <section id="ai-scripting" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">AI Scripting</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX uses advanced AI models specifically trained on Roblox's Lua implementation (Luau) to generate scripts that are compatible with the Roblox platform.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">How It Works</h3>
        <p className="text-gray-300 mb-4">
          When you provide a prompt, our AI analyzes your request, identifies the required functionality, and generates appropriate Luau code. The AI understands Roblox-specific concepts such as:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Roblox services (Players, Workspace, ReplicatedStorage, etc.)</li>
          <li>Instance hierarchy and properties</li>
          <li>Roblox-specific data types (CFrame, Vector3, etc.)</li>
          <li>Event-driven programming patterns common in Roblox</li>
          <li>Client-server architecture and security considerations</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Prompt Engineering</h3>
        <p className="text-gray-300 mb-4">
          To get the best results from NexusRBX, consider these tips for writing effective prompts:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Be specific about functionality (e.g., "Create a teleportation system that moves players to random locations within a 50-stud radius")</li>
          <li>Mention any specific Roblox services or features you want to use</li>
          <li>Specify performance considerations if relevant</li>
          <li>Include any compatibility requirements (e.g., "Must work with R15 avatars")</li>
        </ul>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">AI Scripting Example</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets["ai-scripting"], "ai-scripting")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "ai-scripting" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets["ai-scripting"]}</code>
          </pre>
        </div>
      </section>
      
      <section id="mod-generation" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Mod Generation</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX specializes in generating mods that enhance or modify existing Roblox game functionality. These can range from simple quality-of-life improvements to complex game-changing mechanics.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Types of Mods</h3>
        <p className="text-gray-300 mb-4">
          NexusRBX can generate various types of mods, including:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><span className="font-medium text-white">Gameplay Mods:</span> Modify core game mechanics like movement, combat, or resource gathering</li>
          <li><span className="font-medium text-white">UI Enhancements:</span> Add or improve user interfaces for better game experience</li>
          <li><span className="font-medium text-white">Visual Effects:</span> Add particle effects, lighting changes, or other visual enhancements</li>
          <li><span className="font-medium text-white">Admin Tools:</span> Create moderation and administration utilities</li>
          <li><span className="font-medium text-white">Game Utilities:</span> Add helpful features like teleportation, inventory management, or custom commands</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Mod Structure</h3>
        <p className="text-gray-300 mb-4">
          Generated mods typically follow best practices for Roblox development, including:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Proper script placement (ServerScriptService, ReplicatedStorage, etc.)</li>
          <li>Client-server communication using RemoteEvents and RemoteFunctions</li>
          <li>Modular design for easy integration and maintenance</li>
          <li>Comprehensive error handling and edge case management</li>
          <li>Performance optimization for minimal impact on game performance</li>
        </ul>
      </section>
      
      <section id="simulation-environment" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Simulation Environment</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX provides a secure simulation environment that mimics Roblox's behavior, allowing you to test scripts without risking your actual Roblox game or account.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Simulation Features</h3>
        <p className="text-gray-300 mb-4">
          Our simulation environment includes:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Emulated Roblox services with realistic behavior</li>
          <li>Virtual players for testing multiplayer interactions</li>
          <li>Simulated physics and spatial relationships</li>
          <li>Event system that matches Roblox's behavior</li>
          <li>Performance metrics and error reporting</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Limitations</h3>
        <p className="text-gray-300 mb-4">
          While our simulation environment is comprehensive, there are some limitations to be aware of:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Some complex physics interactions may not be perfectly replicated</li>
          <li>Certain Roblox-specific optimizations might behave differently</li>
          <li>Third-party plugins and assets cannot be simulated</li>
          <li>Network conditions and latency are simulated but may not match real-world scenarios exactly</li>
        </ul>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">Simulation API Example</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets["simulation-api"], "simulation-api")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "simulation-api" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets["simulation-api"]}</code>
          </pre>
        </div>
        
        <p className="text-gray-300">
          Despite these limitations, the simulation environment provides a valuable testing ground for your scripts before deploying them to a live Roblox game.
        </p>
      </section>
    </div>
  );
}

function APIReferenceContent({ codeSnippets, copiedSnippet, handleCopyCode }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">API Reference</h1>
        <div className="text-gray-400 text-lg">
          Comprehensive documentation of NexusRBX's API endpoints and methods for integration with your projects.
        </div>
      </div>
      
      <section id="script-api" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Script API</h2>
        <p className="text-gray-300 mb-4">
          The Script API allows you to generate, modify, and manage Roblox scripts using NexusRBX's AI capabilities.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Methods</h3>
        
        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.generateScript(options)</h4>
            <p className="text-gray-400 mb-3">
              Generates a Roblox script based on the provided prompt and options.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">prompt</span> <span className="text-gray-500">(string, required)</span>: Description of the script to generate</li>
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, optional)</span>: Configuration options</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">maxTokens</span> <span className="text-gray-500">(number, optional)</span>: Maximum length of generated script</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">safeMode</span> <span className="text-gray-500">(boolean, optional)</span>: Whether to enforce safety checks</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">style</span> <span className="text-gray-500">(string, optional)</span>: Code style ("optimized" or "readable")</li>
                  <li><span className="text-[#9b5de5]">parameters</span> <span className="text-gray-500">(object, optional)</span>: Custom parameters for the script</li>
                  <li><span className="text-[#9b5de5]">template</span> <span className="text-gray-500">(string, optional)</span>: Template name to use</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string)</span>: The generated script code</li>
                  <li><span className="text-[#9b5de5]">metadata</span> <span className="text-gray-500">(object)</span>: Information about the generated script</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">tokenCount</span> <span className="text-gray-500">(number)</span>: Number of tokens in the script</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">safetyChecks</span> <span className="text-gray-500">(array)</span>: Results of safety checks</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">generationTime</span> <span className="text-gray-500">(number)</span>: Time taken to generate the script</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.modifyScript(options)</h4>
            <p className="text-gray-400 mb-3">
              Modifies an existing script based on the provided instructions.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string, required)</span>: The original script code</li>
                  <li><span className="text-[#9b5de5]">instructions</span> <span className="text-gray-500">(string, required)</span>: Description of the modifications to make</li>
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, optional)</span>: Configuration options</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string)</span>: The modified script code</li>
                  <li><span className="text-[#9b5de5]">diff</span> <span className="text-gray-500">(object)</span>: Detailed changes made to the script</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.analyzeScript(code)</h4>
            <p className="text-gray-400 mb-3">
              Analyzes a script for potential issues, optimizations, and security concerns.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string, required)</span>: The script code to analyze</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">issues</span> <span className="text-gray-500">(array)</span>: Potential problems in the script</li>
                  <li><span className="text-[#9b5de5]">optimizations</span> <span className="text-gray-500">(array)</span>: Suggested optimizations</li>
                  <li><span className="text-[#9b5de5]">securityConcerns</span> <span className="text-gray-500">(array)</span>: Security issues found</li>
                  <li><span className="text-[#9b5de5]">complexity</span> <span className="text-gray-500">(object)</span>: Metrics about script complexity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section id="simulation-api" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Simulation API</h2>
        <p className="text-gray-300 mb-4">
          The Simulation API allows you to test scripts in a sandboxed environment that mimics Roblox's behavior.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Methods</h3>
        
        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.simulate(code, options)</h4>
            <p className="text-gray-400 mb-3">
              Runs a script in the simulation environment with default settings.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string, required)</span>: The script code to simulate</li>
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, optional)</span>: Simulation options</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">timeLimit</span> <span className="text-gray-500">(number, optional)</span>: Maximum simulation time in seconds</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">memoryLimit</span> <span className="text-gray-500">(number, optional)</span>: Maximum memory usage in MB</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">success</span> <span className="text-gray-500">(boolean)</span>: Whether the simulation completed successfully</li>
                  <li><span className="text-[#9b5de5]">output</span> <span className="text-gray-500">(array)</span>: Console output from the simulation</li>
                  <li><span className="text-[#9b5de5]">error</span> <span className="text-gray-500">(string, optional)</span>: Error message if simulation failed</li>
                  <li><span className="text-[#9b5de5]">metrics</span> <span className="text-gray-500">(object)</span>: Performance metrics</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.createSimulation(options)</h4>
            <p className="text-gray-400 mb-3">
              Creates a customizable simulation environment for testing scripts.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, required)</span>: Simulation configuration</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">mode</span> <span className="text-gray-500">(string, optional)</span>: Simulation mode ("sandbox" or "realistic")</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">mockServices</span> <span className="text-gray-500">(array, optional)</span>: Roblox services to mock</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">SimulationEnvironment</span> <span className="text-gray-500">(object)</span>: A simulation environment object with methods for configuration and execution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mt-6">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">Simulation API Example</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets["simulation-api"], "simulation-api-example")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "simulation-api-example" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets["simulation-api"]}</code>
          </pre>
        </div>
      </section>
      
      <section id="export-api" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Export API</h2>
        <p className="text-gray-300 mb-4">
          The Export API allows you to export generated scripts for use in Roblox Studio or other environments.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Methods</h3>
        
        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.exportScript(code, options)</h4>
            <p className="text-gray-400 mb-3">
              Exports a script in the specified format.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string, required)</span>: The script code to export</li>
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, optional)</span>: Export options</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">format</span> <span className="text-gray-500">(string, optional)</span>: Export format ("lua", "rbxm", "rbxl")</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">scriptType</span> <span className="text-gray-500">(string, optional)</span>: Script type ("Script", "LocalScript", "ModuleScript")</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">name</span> <span className="text-gray-500">(string, optional)</span>: Name for the exported script</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">data</span> <span className="text-gray-500">(string or Blob)</span>: The exported script data</li>
                  <li><span className="text-[#9b5de5]">format</span> <span className="text-gray-500">(string)</span>: The format of the exported data</li>
                  <li><span className="text-[#9b5de5]">filename</span> <span className="text-gray-500">(string)</span>: Suggested filename for the export</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <h4 className="text-lg font-medium mb-2">NexusRBX.exportToStudio(code, options)</h4>
            <p className="text-gray-400 mb-3">
              Exports a script directly to Roblox Studio (requires plugin).
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-300">Parameters:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">code</span> <span className="text-gray-500">(string, required)</span>: The script code to export</li>
                  <li><span className="text-[#9b5de5]">options</span> <span className="text-gray-500">(object, optional)</span>: Export options</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">scriptType</span> <span className="text-gray-500">(string, optional)</span>: Script type ("Script", "LocalScript", "ModuleScript")</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">name</span> <span className="text-gray-500">(string, optional)</span>: Name for the exported script</li>
                  <li className="ml-6"><span className="text-[#9b5de5]">parent</span> <span className="text-gray-500">(string, optional)</span>: Parent container in Studio</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-300">Returns:</h5>
                <ul className="list-disc list-inside text-sm text-gray-400 ml-2">
                  <li><span className="text-[#9b5de5]">success</span> <span className="text-gray-500">(boolean)</span>: Whether the export was successful</li>
                  <li><span className="text-[#9b5de5]">message</span> <span className="text-gray-500">(string)</span>: Status message</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdvancedUsageContent({ codeSnippets, copiedSnippet, handleCopyCode }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Advanced Usage</h1>
        <div className="text-gray-400 text-lg">
          Take your NexusRBX experience to the next level with advanced features and techniques.
        </div>
      </div>
      
      <section id="custom-templates" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Custom Templates</h2>
        <p className="text-gray-300 mb-4">
          Templates allow you to define reusable script structures that the AI can fill in with specific functionality based on your prompts.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Creating Templates</h3>
        <p className="text-gray-300 mb-4">
          Templates consist of a base script with placeholders that the AI will replace with generated code. This is particularly useful for:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Maintaining consistent code structure across multiple scripts</li>
          <li>Enforcing specific patterns or architectures</li>
          <li>Integrating generated code with existing systems</li>
          <li>Creating modular components that follow your coding standards</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Template Placeholders</h3>
        <p className="text-gray-300 mb-4">
          Placeholders are special markers in your template that the AI will replace with generated code. They are defined using double curly braces, such as <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">
  {"{{PLACEHOLDER}}"}
</code>.
        </p>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-gray-300 mb-2">Custom Template Example</div>
            <button 
              onClick={() => handleCopyCode(codeSnippets["custom-templates"], "custom-templates")}
              className="p-1 rounded hover:bg-gray-800 transition-colors duration-300"
            >
              {copiedSnippet === "custom-templates" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code>{codeSnippets["custom-templates"]}</code>
          </pre>
        </div>
      </section>
      
      <section id="advanced-prompting" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Advanced Prompting</h2>
        <p className="text-gray-300 mb-4">
          Mastering the art of prompt engineering can significantly improve the quality and specificity of generated scripts.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Prompt Structure</h3>
        <p className="text-gray-300 mb-4">
          Effective prompts typically include:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><span className="font-medium text-white">Clear objective:</span> What the script should accomplish</li>
          <li><span className="font-medium text-white">Context:</span> Where and how the script will be used</li>
          <li><span className="font-medium text-white">Constraints:</span> Performance requirements, compatibility needs</li>
          <li><span className="font-medium text-white">Examples:</span> Similar functionality or code patterns to follow</li>
          <li><span className="font-medium text-white">Technical details:</span> Specific Roblox services or features to use</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Example Prompts</h3>
        
        <div className="space-y-4 mb-4">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h4 className="text-base font-medium mb-2">Basic Prompt</h4>
            <p className="text-gray-400 italic">
              "Create a script that teleports players to random locations."
            </p>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h4 className="text-base font-medium mb-2">Improved Prompt</h4>
            <p className="text-gray-400 italic">
              "Create a ServerScript that teleports players to random locations within a 100-stud radius of the map center. The teleportation should have a 3-second cooldown, show a countdown GUI to the player, and play a teleport sound effect. The script should be optimized for games with up to 50 players."
            </p>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Prompt Techniques</h3>
        <p className="text-gray-300 mb-4">
          Advanced techniques to improve your prompts:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><span className="font-medium text-white">Chain of thought:</span> Break down complex requirements into steps</li>
          <li><span className="font-medium text-white">Persona specification:</span> Ask the AI to approach the problem as an experienced Roblox developer</li>
          <li><span className="font-medium text-white">Iterative refinement:</span> Start with a basic script, then ask for specific improvements</li>
          <li><span className="font-medium text-white">Comparative requests:</span> Ask for multiple approaches to solve the same problem</li>
        </ul>
      </section>
      
      <section id="integration" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Integration with Roblox</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX can be integrated with your Roblox development workflow in several ways.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Studio Plugin</h3>
        <p className="text-gray-300 mb-4">
          The NexusRBX Studio plugin provides direct integration with Roblox Studio, allowing you to:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Generate scripts without leaving Studio</li>
          <li>Insert generated scripts directly into your game</li>
          <li>Modify existing scripts using AI assistance</li>
          <li>Test scripts in the simulation environment before adding them to your game</li>
          <li>Access your saved scripts and templates</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">API Integration</h3>
        <p className="text-gray-300 mb-4">
          For advanced users, NexusRBX provides a REST API that can be integrated with custom tools and workflows:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Generate scripts programmatically</li>
          <li>Batch process multiple script generations</li>
          <li>Integrate with CI/CD pipelines</li>
          <li>Build custom interfaces for specific team needs</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Best Practices for Integration</h3>
        <p className="text-gray-300 mb-4">
          When integrating NexusRBX into your development workflow:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Use version control to track changes to generated scripts</li>
          <li>Create templates that match your project's architecture and coding standards</li>
          <li>Establish a review process for AI-generated code before production use</li>
          <li>Use the simulation environment to catch potential issues early</li>
          <li>Document which parts of your codebase were AI-generated for future maintenance</li>
        </ul>
      </section>
    </div>
  );
}

function SecurityContent({ codeSnippets, copiedSnippet, handleCopyCode }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Security</h1>
        <div className="text-gray-400 text-lg">
          Understanding the security features and best practices for using NexusRBX safely.
        </div>
      </div>
      
      <section id="safe-execution" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Safe Execution</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX prioritizes security in all aspects of script generation and execution.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Sandboxed Environment</h3>
        <p className="text-gray-300 mb-4">
          All scripts are executed in a secure, sandboxed environment with the following protections:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Isolated execution context separate from your actual Roblox game</li>
          <li>Resource limitations to prevent runaway scripts (CPU, memory, execution time)</li>
          <li>No access to sensitive APIs or external services</li>
          <li>Simulated Roblox services that prevent harmful operations</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Code Analysis</h3>
        <p className="text-gray-300 mb-4">
          Before execution, all generated scripts undergo automated security analysis:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Static code analysis to detect potentially harmful patterns</li>
          <li>Identification of resource-intensive operations</li>
          <li>Detection of common security vulnerabilities</li>
          <li>Verification of compliance with Roblox's security guidelines</li>
        </ul>
      </section>
      
      <section id="permissions" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Permissions</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX uses a permission system to control access to different features and capabilities.
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Permission Levels</h3>
        <p className="text-gray-300 mb-4">
          The platform has several permission levels:
        </p>
        
        <div className="space-y-4 mb-4">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h4 className="text-base font-medium mb-2">Basic (Free Tier)</h4>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Generate simple scripts with length limitations</li>
              <li>Basic simulation capabilities</li>
              <li>Limited number of generations per day</li>
              <li>Access to common templates</li>
            </ul>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h4 className="text-base font-medium mb-2">Standard (Paid Tier)</h4>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Generate complex scripts without length limitations</li>
              <li>Advanced simulation capabilities</li>
              <li>Higher generation limits</li>
              <li>Custom templates</li>
              <li>Script modification and analysis</li>
            </ul>
          </div>
          
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h4 className="text-base font-medium mb-2">Professional (Team Tier)</h4>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>All Standard features</li>
              <li>Team collaboration tools</li>
              <li>API access for custom integrations</li>
              <li>Advanced security features</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-white">API Keys and Authentication</h3>
        <p className="text-gray-300 mb-4">
          When using the NexusRBX API or plugin:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>API keys should be kept secure and never shared publicly</li>
          <li>Each team member should use their own API key</li>
          <li>API keys can be revoked and regenerated if compromised</li>
          <li>API keys have specific permissions attached to them</li>
        </ul>
      </section>
      
      <section id="best-practices" className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Security Best Practices</h2>
        <p className="text-gray-300 mb-4">
          Follow these best practices to ensure secure use of NexusRBX:
        </p>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Script Review</h3>
        <p className="text-gray-300 mb-4">
          Always review AI-generated scripts before using them in production:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Understand what each part of the script does</li>
          <li>Check for unintended functionality or side effects</li>
          <li>Verify that the script follows your security guidelines</li>
          <li>Test the script thoroughly in a controlled environment</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Data Privacy</h3>
        <p className="text-gray-300 mb-4">
          Protect your data when using NexusRBX:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Avoid including sensitive information in prompts or templates</li>
          <li>Use generic examples instead of actual game data</li>
          <li>Be cautious about what game mechanics you reveal in prompts</li>
          <li>Review our privacy policy to understand how your data is used</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-white">Account Security</h3>
        <p className="text-gray-300 mb-4">
          Protect your NexusRBX account:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Use a strong, unique password</li>
          <li>Enable two-factor authentication</li>
          <li>Regularly review account activity</li>
          <li>Manage API keys carefully and rotate them periodically</li>
          <li>Log out when using shared computers</li>
        </ul>
        
        <div className="bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-lg p-5 mt-6">
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-[#9b5de5]" />
            Security Reminder
          </h4>
          <p className="text-gray-300">
            Remember that while NexusRBX provides many security features, you are ultimately responsible for the scripts you generate and use in your games. Always follow Roblox's Terms of Service and Community Guidelines when using generated scripts.
          </p>
        </div>
      </section>
    </div>
  );
}
