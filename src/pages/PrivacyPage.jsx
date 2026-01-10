import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Shield,
  Lock,
  Eye,
  Database,
  Server,
  Globe,
  FileText,
  Mail,
  BookOpen,
  Github,
  AlertTriangle,
  UserCheck,
  Clock,
} from "lucide-react";

// Container Component
export default function NexusRBXPrivacyPageContainer() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSectionChange = (section) => {
    setActiveSection(section);
    window.scrollTo(0, 0);
  };

  // Navigation handler for internal/external links
  const handleNavClick = (href, external) => (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (external) {
      window.open(href, "_blank", "noopener noreferrer");
    } else {
      navigate(href);
    }
  };

  // Define all data used by sub-components
  const sections = [
    { id: "overview", title: "Overview", icon: Eye },
    { id: "collection", title: "Information Collection", icon: Database },
    { id: "use", title: "How We Use Data", icon: Server },
    { id: "sharing", title: "Information Sharing", icon: Globe },
    { id: "security", title: "Data Security", icon: Lock },
    { id: "rights", title: "Your Rights", icon: UserCheck },
    { id: "retention", title: "Data Retention", icon: Clock },
    { id: "changes", title: "Policy Changes", icon: FileText },
  ];

  const lastUpdated = "November 15, 2023";

  return (
    <NexusRBXPrivacyPage
      activeSection={activeSection}
      sections={sections}
      lastUpdated={lastUpdated}
      handleSectionChange={handleSectionChange}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      handleNavClick={handleNavClick}
      navigate={navigate}
    />
  );
}

// UI Component
function NexusRBXPrivacyPage({
  activeSection,
  sections,
  lastUpdated,
  handleSectionChange,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleNavClick,
  navigate,
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              NexusRBX
            </div>
            <div className="ml-2 text-sm text-gray-400">Privacy Policy</div>
          </div>

          <nav className="hidden md:flex space-x-6">
            <a
              href="/"
              onClick={handleNavClick("/", false)}
              className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a
              href="/ai"
              onClick={handleNavClick("/ai", false)}
              className="text-gray-300 hover:text-white transition-colors duration-300"
            >
              AI Console
            </a>
            <a
              href="/docs"
              onClick={handleNavClick("/docs", false)}
              className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Docs
            </a>
            <a
              href="/privacy"
              onClick={handleNavClick("/privacy", false)}
              className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
            >
              <FileText className="h-4 w-4 mr-1" />
              Privacy
            </a>
          </nav>

          <button
            className="md:hidden text-gray-300"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open navigation menu"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/90 border-b border-gray-800 px-4 py-4">
            <nav className="flex flex-col space-y-4">
              <a
                href="/"
                onClick={handleNavClick("/", false)}
                className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
              >
                <Home className="h-4 w-4 mr-1" />
                Home
              </a>
              <a
                href="/ai"
                onClick={handleNavClick("/ai", false)}
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                AI Console
              </a>
              <a
                href="/docs"
                onClick={handleNavClick("/docs", false)}
                className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Docs
              </a>
              <a
                href="/privacy"
                onClick={handleNavClick("/privacy", false)}
                className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                Privacy
              </a>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="md:w-64 shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center mb-6">
                  <Shield className="h-6 w-6 text-[#9b5de5] mr-3" />
                  <h2 className="text-xl font-bold">Privacy Policy</h2>
                </div>
                <p className="text-gray-400 text-sm mb-6">
                  Last updated: {lastUpdated}
                </p>

                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`w-full flex items-center p-3 rounded-lg transition-colors duration-300 ${
                        activeSection === section.id
                          ? "bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-white"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                      }`}
                    >
                      <section.icon className="h-5 w-5 mr-3" />
                      <span>{section.title}</span>
                    </button>
                  ))}
                </nav>

                <div className="mt-8 p-4 rounded-lg bg-gray-900/40 border border-gray-800">
                  <h3 className="font-medium mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-[#9b5de5]" />
                    Questions or Concerns?
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    If you have any questions about our privacy practices, please contact our privacy team.
                  </p>
                  <a
                    href="mailto:support@nexusrbx.com"
                    className="text-sm px-4 py-2 rounded-md bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-[#9b5de5] hover:bg-[#9b5de5]/30 transition-colors duration-300 inline-block"
                  >
                    Contact Privacy Team
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow">
              {activeSection === "overview" && <OverviewContent lastUpdated={lastUpdated} />}
              {activeSection === "collection" && <CollectionContent />}
              {activeSection === "use" && <UseContent />}
              {activeSection === "sharing" && <SharingContent />}
              {activeSection === "security" && <SecurityContent />}
              {activeSection === "rights" && <RightsContent />}
              {activeSection === "retention" && <RetentionContent />}
              {activeSection === "changes" && <ChangesContent />}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div
            className="flex items-center mb-4 md:mb-0 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">
              NexusRBX
            </div>
            <div className="text-sm text-gray-400">Privacy Policy</div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="/privacy"
              onClick={handleNavClick("/privacy", false)}
              className="text-white transition-colors duration-300"
            >
              Privacy
            </a>
            <a
              href="/docs"
              onClick={handleNavClick("/docs", false)}
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Docs
            </a>
            <a
              href="/contact"
              onClick={handleNavClick("/contact", false)}
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Contact
            </a>
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
        <div className="max-w-6xl mx-auto mt-4 text-center text-gray-500 text-sm">
          © 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Content Components for each section
// (All content components are included below, unchanged from your previous code)

function OverviewContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy Overview</h1>
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          At NexusRBX, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and AI-driven Roblox scripting platform.
        </p>
        <p className="text-gray-300 mt-3">
          Please read this Privacy Policy carefully. By accessing or using our service, you acknowledge that you have read, understood, and agree to be bound by all the terms outlined in this policy.
        </p>
      </div>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Quick Summary</h2>
        <p className="text-gray-300 mb-4">
          Here's a brief overview of our privacy practices:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Database className="h-5 w-5 text-[#9b5de5] mr-2" />
              <h3 className="font-medium">Information We Collect</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Account information (email, username)</li>
              <li>Payment details (processed securely)</li>
              <li>Usage data and analytics</li>
              <li>Script prompts and generated content</li>
              <li>Communication data</li>
            </ul>
          </div>
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Server className="h-5 w-5 text-[#00f5d4] mr-2" />
              <h3 className="font-medium">How We Use Your Data</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Provide and improve our services</li>
              <li>Process transactions</li>
              <li>Communicate with you</li>
              <li>Train and enhance our AI models</li>
              <li>Ensure platform security</li>
            </ul>
          </div>
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Globe className="h-5 w-5 text-[#f15bb5] mr-2" />
              <h3 className="font-medium">Information Sharing</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Service providers (payment, hosting)</li>
              <li>Legal requirements</li>
              <li>With your consent</li>
              <li>Anonymized data for research</li>
              <li>No selling of personal data</li>
            </ul>
          </div>
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <UserCheck className="h-5 w-5 text-[#9b5de5] mr-2" />
              <h3 className="font-medium">Your Rights</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your data (with limitations)</li>
              <li>Object to certain processing</li>
              <li>Data portability options</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Key Privacy Principles</h2>
        <p className="text-gray-300 mb-4">
          Our approach to privacy is guided by these core principles:
        </p>
        <div className="space-y-4">
          <div className="bg-gray-900/30 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Transparency</h3>
            <p className="text-gray-400 text-sm">
              We clearly explain what data we collect and how we use it. We avoid complex legal language and strive to make our privacy practices easy to understand.
            </p>
          </div>
          <div className="bg-gray-900/30 border-l-4 border-[#00f5d4] pl-4 py-2">
            <h3 className="font-medium mb-1">Data Minimization</h3>
            <p className="text-gray-400 text-sm">
              We collect only the information necessary to provide and improve our services. We don't collect data just because it might be useful someday.
            </p>
          </div>
          <div className="bg-gray-900/30 border-l-4 border-[#f15bb5] pl-4 py-2">
            <h3 className="font-medium mb-1">User Control</h3>
            <p className="text-gray-400 text-sm">
              We give you meaningful control over your data, including options to access, correct, or delete your information where feasible.
            </p>
          </div>
          <div className="bg-gray-900/30 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Security</h3>
            <p className="text-gray-400 text-sm">
              We implement strong technical and organizational measures to protect your data from unauthorized access, loss, or alteration.
            </p>
          </div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Applicability</h2>
        <p className="text-gray-300 mb-4">
          This Privacy Policy applies to:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>The NexusRBX website (nexusrbx.com)</li>
          <li>Our AI-driven Roblox scripting platform</li>
          <li>NexusRBX mobile applications (if applicable)</li>
          <li>NexusRBX Roblox Studio plugins</li>
          <li>Communications with NexusRBX (email, chat support, etc.)</li>
        </ul>
        <p className="text-gray-300">
          This Privacy Policy does not apply to third-party websites, products, or services, even if they link to our Services. We encourage you to review the privacy practices of those third parties before providing them with any personal information.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Contact Us</h2>
        <p className="text-gray-300 mb-4">
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
        </p>
        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <Mail className="h-5 w-5 text-[#9b5de5] mr-2" />
            <h3 className="font-medium">Privacy Team</h3>
          </div>
          <p className="text-gray-400 mb-1">Email: <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a></p>
          <p className="text-gray-400 mb-1">Address: 123 Tech Plaza, Suite 400, San Francisco, CA 94107</p>
          <p className="text-gray-400">Response Time: We aim to respond to all privacy-related inquiries within 5 business days.</p>
        </div>
      </section>
    </div>
  );
}

function CollectionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Information Collection</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          To provide our AI-driven Roblox scripting platform, we need to collect certain information. This section details what information we collect, how we collect it, and why it's necessary.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Information You Provide to Us</h2>
        <p className="text-gray-300 mb-4">
          We collect information you voluntarily provide when using our services:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Account Information</h3>
            <p className="text-gray-400 mb-3">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Email address</li>
              <li>Username</li>
              <li>Password (stored in encrypted form)</li>
              <li>Profile information (optional)</li>
              <li>Profile picture (optional)</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To create and manage your account, authenticate you when you sign in, and personalize your experience.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Payment Information</h3>
            <p className="text-gray-400 mb-3">
              When you subscribe to a paid plan, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Credit card information (processed securely through our payment processors)</li>
              <li>Billing address</li>
              <li>Subscription plan details</li>
              <li>Transaction history</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To process payments, manage subscriptions, and provide customer support related to billing.
            </p>
            <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> We do not store your full credit card details on our servers. Payment processing is handled by secure third-party payment processors who comply with PCI DSS standards.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Script Generation Data</h3>
            <p className="text-gray-400 mb-3">
              When you use our AI to generate scripts, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Prompts and instructions you provide</li>
              <li>Generated scripts and code</li>
              <li>Feedback on generated content (if provided)</li>
              <li>Script modification history</li>
              <li>Saved scripts and templates</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To generate the scripts you request, improve our AI models, provide script history, and enhance the quality of generated content.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Communications</h3>
            <p className="text-gray-400 mb-3">
              When you communicate with us, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Email correspondence</li>
              <li>Support tickets and inquiries</li>
              <li>Survey responses</li>
              <li>Feedback submissions</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To respond to your inquiries, provide support, and improve our services based on your feedback.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Information Collected Automatically</h2>
        <p className="text-gray-300 mb-4">
          When you use our services, certain information is collected automatically:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Usage Data</h3>
            <p className="text-gray-400 mb-3">
              We collect information about how you interact with our services:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Log data (IP address, browser type, pages visited, time spent)</li>
              <li>Device information (device type, operating system)</li>
              <li>Feature usage patterns</li>
              <li>Error logs and crash reports</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To analyze usage patterns, troubleshoot technical issues, improve our services, and ensure security.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Cookies and Similar Technologies</h3>
            <p className="text-gray-400 mb-3">
              We use cookies and similar tracking technologies:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Essential cookies (for authentication and security)</li>
              <li>Preference cookies (to remember your settings)</li>
              <li>Analytics cookies (to understand usage patterns)</li>
              <li>Marketing cookies (if you've consented)</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To provide essential functionality, remember your preferences, analyze usage, and deliver relevant content.
            </p>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                You can manage cookie preferences through our Cookie Settings or your browser settings. Note that disabling certain cookies may affect the functionality of our services.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Information from Third Parties</h2>
        <p className="text-gray-300 mb-4">
          In some cases, we may receive information about you from third parties:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Authentication Providers</h3>
            <p className="text-gray-400 mb-3">
              If you choose to sign in using a third-party authentication provider (e.g., Google, GitHub), we may receive:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Email address</li>
              <li>Name</li>
              <li>Profile picture</li>
              <li>Unique identifier from that service</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To create and authenticate your account without requiring a separate password.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Roblox Integration</h3>
            <p className="text-gray-400 mb-3">
              If you connect your Roblox account, we may receive:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Roblox username</li>
              <li>Roblox ID</li>
              <li>Limited information about your Roblox games (if you choose to share)</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Purpose: To enhance script generation with context about your Roblox games and provide seamless integration with Roblox Studio.
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Children's Privacy</h2>
        <p className="text-gray-300 mb-4">
          Our services are not intended for children under 13 years of age, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will promptly delete that information.
        </p>
        <p className="text-gray-300 mb-4">
          If you are a parent or guardian and believe that your child has provided us with personal information without your consent, please contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
        </p>
        <div className="p-4 bg-[#f15bb5]/10 border border-[#f15bb5]/30 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-[#f15bb5] mr-2" />
            <h3 className="font-medium">Important Note for Parents</h3>
          </div>
          <p className="text-gray-300 text-sm">
            While Roblox is popular among children, NexusRBX's scripting tools are designed for developers and require technical knowledge. We recommend that parents supervise their children's use of our services and review our Terms of Service and Acceptable Use Policy.
          </p>
        </div>
      </section>
    </div>
  );
}

function UseContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">How We Use Your Data</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          This section explains how we use the information we collect to provide, maintain, and improve our services. We are committed to using your data responsibly and only for purposes that benefit your experience with NexusRBX.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Primary Uses of Your Information</h2>
        <p className="text-gray-300 mb-4">
          We use your information for the following primary purposes:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Providing Our Services</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Create and manage your account</li>
              <li>Generate Roblox scripts based on your prompts</li>
              <li>Process and fulfill your requests</li>
              <li>Provide access to features based on your subscription plan</li>
              <li>Save your script history and preferences</li>
              <li>Facilitate integration with Roblox Studio</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Contract performance - processing is necessary to fulfill our contractual obligations to you.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Improving Our Services</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Enhance the functionality and user experience of our platform</li>
              <li>Fix bugs and resolve technical issues</li>
              <li>Develop new features and services</li>
              <li>Analyze usage patterns to optimize performance</li>
              <li>Conduct research and development</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Legitimate interests - processing is necessary for our legitimate interests in improving our services.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Customer Support</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Respond to your inquiries and support requests</li>
              <li>Troubleshoot problems with your account or our services</li>
              <li>Provide technical assistance</li>
              <li>Address complaints or concerns</li>
              <li>Maintain records of our communications with you</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Legitimate interests - processing is necessary to provide customer support and address your needs.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Processing Transactions</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Process payments for subscriptions</li>
              <li>Manage billing and subscription renewals</li>
              <li>Issue refunds when applicable</li>
              <li>Prevent fraudulent transactions</li>
              <li>Maintain financial records</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Contract performance - processing is necessary to fulfill our contractual obligations related to paid services.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">AI Training and Improvement</h2>
        <p className="text-gray-300 mb-4">
          As an AI-driven platform, we use certain data to train and improve our AI models:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">AI Model Training</h3>
          <p className="text-gray-400 mb-3">
            We use the following data to train and improve our AI models:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>Prompts and instructions you provide (anonymized)</li>
            <li>Generated scripts (anonymized)</li>
            <li>Feedback on script quality (if provided)</li>
            <li>Error patterns and correction data</li>
          </ul>
          <p className="text-gray-500 text-sm italic">
            Legal basis: Legitimate interests - processing is necessary for our legitimate interests in improving our AI technology.
          </p>
          <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Opt-out option:</strong> You can opt out of having your data used for AI training by adjusting your privacy settings in your account or by contacting us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>. Opting out will not affect your ability to use our services.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Communications</h2>
        <p className="text-gray-300 mb-4">
          We use your information to communicate with you in various ways:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Service Communications</h3>
            <p className="text-gray-400 mb-3">
              We send essential communications about:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Account verification and security</li>
              <li>Subscription status and billing</li>
              <li>Changes to our terms or policies</li>
              <li>Service updates and maintenance notifications</li>
              <li>Responses to your inquiries or requests</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Contract performance - these communications are necessary to provide our services.
            </p>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> You cannot opt out of service communications as they are essential to providing our services.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Marketing Communications</h3>
            <p className="text-gray-400 mb-3">
              With your consent, we may send:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Newsletters and product updates</li>
              <li>Information about new features</li>
              <li>Special offers and promotions</li>
              <li>Educational content about Roblox scripting</li>
              <li>Surveys and feedback requests</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Consent - you can opt in or out of marketing communications at any time.
            </p>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Opt-out option:</strong> You can unsubscribe from marketing communications at any time by clicking the "unsubscribe" link in our emails or by adjusting your communication preferences in your account settings.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Security and Compliance</h2>
        <p className="text-gray-300 mb-4">
          We use your information to ensure the security of our platform and comply with legal obligations:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Security Measures</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Verify your identity and prevent unauthorized access</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Monitor for suspicious activities</li>
              <li>Protect against security breaches</li>
              <li>Enforce our Terms of Service and Acceptable Use Policy</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Legitimate interests - processing is necessary to ensure the security of our platform.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Legal Compliance</h3>
            <p className="text-gray-400 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Comply with applicable laws and regulations</li>
              <li>Respond to legal requests and prevent harm</li>
              <li>Establish, exercise, or defend legal claims</li>
              <li>Conduct audits and investigations when necessary</li>
              <li>Maintain required business records</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Legal basis: Legal obligation - processing is necessary to comply with our legal obligations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SharingContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Information Sharing</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          We understand the importance of keeping your information secure and private. This section explains when and why we may share your information with third parties, and the safeguards we put in place to protect your data.
        </p>
        <p className="text-gray-300 mt-3">
          <strong>Important:</strong> We do not sell your personal information to third parties for marketing or advertising purposes.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Service Providers</h2>
        <p className="text-gray-300 mb-4">
          We share information with trusted third-party service providers who perform services on our behalf. These providers have access to your information only to perform these tasks and are obligated to protect your information.
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Payment Processors</h3>
            <p className="text-gray-400 mb-3">
              We share payment information with payment processors to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Process subscription payments</li>
              <li>Handle billing and invoicing</li>
              <li>Prevent fraudulent transactions</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Examples: Stripe, PayPal
            </p>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> Our payment processors maintain PCI DSS compliance and implement strong security measures to protect your payment information.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Cloud Infrastructure Providers</h3>
            <p className="text-gray-400 mb-3">
              We use cloud infrastructure providers to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Host our website and services</li>
              <li>Store data securely</li>
              <li>Process AI script generation</li>
              <li>Provide computing resources</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Examples: Amazon Web Services (AWS), Google Cloud Platform
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Analytics Providers</h3>
            <p className="text-gray-400 mb-3">
              We share usage data with analytics providers to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Analyze user behavior and patterns</li>
              <li>Measure the effectiveness of our services</li>
              <li>Optimize website performance</li>
              <li>Identify areas for improvement</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Examples: Google Analytics, Mixpanel
            </p>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Opt-out option:</strong> You can opt out of certain analytics tracking by adjusting your cookie preferences or using browser extensions designed to block tracking.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Customer Support Tools</h3>
            <p className="text-gray-400 mb-3">
              We share information with customer support providers to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Respond to your inquiries and support requests</li>
              <li>Track and resolve issues</li>
              <li>Improve our customer service</li>
            </ul>
            <p className="text-gray-500 text-sm italic">
              Examples: Zendesk, Intercom
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Business Transfers</h2>
        <p className="text-gray-300 mb-4">
          If NexusRBX is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our website of any change in ownership or uses of your information, as well as any choices you may have regarding your information.
        </p>
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">What This Means For You</h3>
          <p className="text-gray-400 mb-3">
            In the event of a business transfer:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>You will be notified before your information is transferred</li>
            <li>Your information will remain subject to the promises made in the then-current Privacy Policy</li>
            <li>You will be provided with options regarding your data if applicable</li>
            <li>The new owner will be required to respect the commitments we've made</li>
          </ul>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Legal Requirements</h2>
        <p className="text-gray-300 mb-4">
          We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).
        </p>
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Circumstances for Disclosure</h3>
          <p className="text-gray-400 mb-3">
            We may disclose your information when we believe in good faith that disclosure is necessary to:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>Comply with a legal obligation, court order, or legal process</li>
            <li>Protect our rights, property, or safety</li>
            <li>Protect the rights, property, or safety of our users or others</li>
            <li>Investigate fraud, security breaches, or technical issues</li>
            <li>Respond to an emergency</li>
          </ul>
          <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Our approach:</strong> We carefully review all requests to ensure they are legally valid and limit the information we share to only what is necessary to comply with the request.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">With Your Consent</h2>
        <p className="text-gray-300 mb-4">
          We may share your information with third parties when you have given us your consent to do so. For example:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>When you choose to share your scripts or templates publicly</li>
          <li>When you connect third-party applications to your NexusRBX account</li>
          <li>When you participate in community features or forums</li>
          <li>When you explicitly authorize us to share specific information</li>
        </ul>
        <p className="text-gray-300">
          You can revoke your consent at any time by adjusting your account settings or contacting us directly.
        </p>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">International Data Transfers</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX is based in the United States, and we may transfer, store, and process your information in countries other than your country of residence. These countries may have data protection laws that are different from those in your country.
        </p>
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Safeguards for International Transfers</h3>
          <p className="text-gray-400 mb-3">
            When we transfer your information internationally, we take measures to ensure that your data is protected:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>We use data transfer agreements and standard contractual clauses approved by regulatory authorities</li>
            <li>We work with service providers who maintain adequate data protection measures</li>
            <li>We implement technical and organizational measures to protect your data during transfers</li>
            <li>We comply with applicable data protection laws for international transfers</li>
          </ul>
          <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              By using our services, you consent to the transfer of your information to countries outside your country of residence, including the United States, which may have different data protection rules than those in your country.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SecurityContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Data Security</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          Protecting your information is a top priority at NexusRBX. We implement a variety of security measures to maintain the safety of your personal information and ensure that your data is handled securely.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Our Security Practices</h2>
        <p className="text-gray-300 mb-4">
          We employ industry-standard security measures to protect your data:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center mb-3">
              <Lock className="h-5 w-5 text-[#9b5de5] mr-2" />
              <h3 className="font-medium">Encryption</h3>
            </div>
            <p className="text-gray-400 text-sm">
              We use encryption technologies such as TLS/SSL to protect data in transit. Sensitive information, including passwords and payment details, is encrypted at rest using strong encryption algorithms.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center mb-3">
              <Shield className="h-5 w-5 text-[#00f5d4] mr-2" />
              <h3 className="font-medium">Access Controls</h3>
            </div>
            <p className="text-gray-400 text-sm">
              We implement strict access controls to ensure that only authorized personnel can access your data. Access is granted on a need-to-know basis and is regularly reviewed and audited.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center mb-3">
              <Server className="h-5 w-5 text-[#f15bb5] mr-2" />
              <h3 className="font-medium">Secure Infrastructure</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Our infrastructure is hosted in secure data centers that maintain physical security measures, including 24/7 monitoring, surveillance, and controlled access to server facilities.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center mb-3">
              <Eye className="h-5 w-5 text-[#9b5de5] mr-2" />
              <h3 className="font-medium">Monitoring & Testing</h3>
            </div>
            <p className="text-gray-400 text-sm">
              We continuously monitor our systems for suspicious activities and potential vulnerabilities. Regular security assessments, including penetration testing and vulnerability scanning, are conducted to identify and address security issues.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Security Certifications and Compliance</h3>
          <p className="text-gray-400 mb-3">
            We maintain compliance with industry security standards and best practices:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>Our payment processing is PCI DSS compliant</li>
            <li>We follow OWASP security guidelines for web applications</li>
            <li>Regular security audits and assessments</li>
            <li>Compliance with applicable data protection regulations</li>
          </ul>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Incident Response</h2>
        <p className="text-gray-300 mb-4">
          Despite our best efforts, no method of transmission over the Internet or electronic storage is 100% secure. In the event of a data breach or security incident:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Our Response Process</h3>
          <p className="text-gray-400 mb-3">
            If a security incident occurs, we will:
          </p>
          <ol className="list-decimal list-inside text-gray-400 space-y-1 mb-3">
            <li>Promptly investigate the incident to determine its scope and impact</li>
            <li>Take immediate steps to contain and mitigate the incident</li>
            <li>Notify affected users in accordance with applicable laws and regulations</li>
            <li>Work with security experts and law enforcement if necessary</li>
            <li>Implement measures to prevent similar incidents in the future</li>
          </ol>
          <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Notification policy:</strong> We will notify affected users promptly and without undue delay, providing information about the incident and steps they can take to protect themselves.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Your Role in Security</h2>
        <p className="text-gray-300 mb-4">
          While we implement strong security measures, the security of your account also depends on you. Here are some steps you can take to help protect your information:
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Strong Passwords</h3>
            <p className="text-gray-400 text-sm">
              Use a strong, unique password for your NexusRBX account. Consider using a password manager to generate and store complex passwords securely.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#00f5d4] pl-4 py-2">
            <h3 className="font-medium mb-1">Two-Factor Authentication</h3>
            <p className="text-gray-400 text-sm">
              Enable two-factor authentication (2FA) for your account to add an extra layer of security. This requires a second form of verification beyond your password.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#f15bb5] pl-4 py-2">
            <h3 className="font-medium mb-1">Secure Your Devices</h3>
            <p className="text-gray-400 text-sm">
              Keep your devices and software up to date with the latest security patches. Use antivirus software and be cautious about the networks you connect to.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Be Alert for Phishing</h3>
            <p className="text-gray-400 text-sm">
              Be cautious of emails, messages, or websites that claim to be from NexusRBX but ask for your password or personal information. We will never ask for your password via email.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#00f5d4] pl-4 py-2">
            <h3 className="font-medium mb-1">Log Out from Shared Devices</h3>
            <p className="text-gray-400 text-sm">
              Always log out of your account when using shared or public computers. Be cautious about saving login information on devices you don't control.
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Reporting Security Concerns</h2>
        <p className="text-gray-300 mb-4">
          If you discover a security vulnerability or have concerns about the security of your account, please contact us immediately:
        </p>
        
        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <Mail className="h-5 w-5 text-[#9b5de5] mr-2" />
            <h3 className="font-medium">Security Contact Information</h3>
          </div>
          <p className="text-gray-400 mb-1">Email: <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a></p>
          <p className="text-gray-400 mb-3">Response Time: We aim to acknowledge security reports within 24 hours.</p>
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Responsible disclosure:</strong> We appreciate the efforts of security researchers who help us identify and address vulnerabilities. We have a responsible disclosure policy that provides guidelines for reporting security issues.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function RightsContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Your Rights</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          We respect your privacy rights and are committed to providing you with control over your personal information. This section outlines the rights you have regarding your data and how you can exercise these rights.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Your Data Protection Rights</h2>
        <p className="text-gray-300 mb-4">
          Depending on your location, you may have the following rights regarding your personal information:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Access</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request copies of your personal information that we hold. This right allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Confirm whether we are processing your personal data</li>
              <li>Receive a copy of the personal data we hold about you</li>
              <li>Understand how we use and process your data</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> You can access much of your information directly through your account settings. For additional information, you can submit a request to <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Rectification</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request that we correct any information you believe is inaccurate or incomplete. This right allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Update incorrect personal information</li>
              <li>Complete information that is incomplete</li>
              <li>Ensure the accuracy of the data we process</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> You can update most of your account information directly through your account settings. For information that cannot be updated through your account, contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Erasure</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request that we erase your personal data under certain conditions. This right allows you to request deletion when:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>The personal data is no longer necessary for the purposes it was collected</li>
              <li>You withdraw consent (where processing is based on consent)</li>
              <li>You object to processing and there are no overriding legitimate grounds</li>
              <li>The personal data has been unlawfully processed</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> You can delete your account and associated data through your account settings or by contacting us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>. Please note that some information may be retained for legal or legitimate business purposes.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Restrict Processing</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request that we restrict the processing of your personal data under certain circumstances. This right applies when:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>You contest the accuracy of your personal data</li>
              <li>The processing is unlawful, but you oppose erasure</li>
              <li>We no longer need the data, but you need it for legal claims</li>
              <li>You have objected to processing and verification of legitimate grounds is pending</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> To request restriction of processing, contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a> with details of your request.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Data Portability</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request that we transfer your data to another controller or directly to you. This right allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Receive your personal data in a structured, commonly used format</li>
              <li>Transmit that data to another service provider</li>
              <li>Request direct transmission where technically feasible</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> To request data portability, contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>. We will provide your data in a standard, machine-readable format.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Right to Object</h3>
            <p className="text-gray-400 mb-3">
              You have the right to object to the processing of your personal data in certain circumstances. This right allows you to object to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Processing based on legitimate interests or public interest</li>
              <li>Direct marketing (including profiling)</li>
              <li>Processing for scientific/historical research or statistical purposes</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>How to exercise this right:</strong> You can object to marketing by using the unsubscribe link in our emails or adjusting your communication preferences. For other objections, contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Additional Rights for Specific Regions</h2>
        <p className="text-gray-300 mb-4">
          Depending on your location, you may have additional rights under local data protection laws:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">California Privacy Rights (CCPA/CPRA)</h3>
            <p className="text-gray-400 mb-3">
              If you are a California resident, you have the following additional rights:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information held by businesses</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
              <li>Right to limit use and disclosure of sensitive personal information</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> NexusRBX does not sell personal information as defined by the CCPA/CPRA. For more information or to exercise your rights, contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">European Economic Area (GDPR)</h3>
            <p className="text-gray-400 mb-3">
              If you are in the European Economic Area, you have the following additional rights:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Right to lodge a complaint with a supervisory authority</li>
              <li>Right to withdraw consent at any time (where processing is based on consent)</li>
              <li>Right not to be subject to automated decision-making, including profiling, that produces legal effects</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Data Protection Officer:</strong> For GDPR-related inquiries, you can contact our Data Protection Officer at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">How to Exercise Your Rights</h2>
        <p className="text-gray-300 mb-4">
          You can exercise your rights in the following ways:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Request Process</h3>
          <ol className="list-decimal list-inside text-gray-400 space-y-1 mb-3">
            <li>Submit your request by emailing <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a></li>
            <li>Include "Privacy Rights Request" in the subject line</li>
            <li>Specify which right(s) you wish to exercise</li>
            <li>Provide information to verify your identity (to protect your privacy)</li>
            <li>We will respond to your request within 30 days (or notify you if we need more time)</li>
          </ol>
          <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Verification:</strong> To protect your privacy, we may need to verify your identity before processing your request. We will use information you have previously provided to verify your identity, or we may ask for additional information if necessary.
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Limitations and Exceptions</h2>
        <p className="text-gray-300 mb-4">
          While we strive to honor all valid requests, there may be situations where we cannot fully fulfill a request:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">When We May Deny or Limit Requests</h3>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>When we cannot verify your identity with the information provided</li>
            <li>When fulfilling the request would violate applicable laws or regulations</li>
            <li>When the request conflicts with our legal obligations (e.g., data retention requirements)</li>
            <li>When the request would compromise the privacy or rights of others</li>
            <li>When the request is manifestly unfounded or excessive</li>
          </ul>
          <p className="text-gray-400 mt-3">
            If we cannot fulfill your request, we will explain the reasons and provide information about any further steps you can take.
          </p>
        </div>
      </section>
    </div>
  );
}

function RetentionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Data Retention</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          This section explains how long we keep your information and what factors determine our data retention periods. We retain personal information only for as long as necessary to fulfill the purposes for which it was collected, or as required by law.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Retention Periods</h2>
        <p className="text-gray-300 mb-4">
          Different types of information are retained for different periods of time:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Account Information</h3>
            <p className="text-gray-400 mb-3">
              We retain your account information for as long as your account is active, plus a reasonable period afterward to handle any follow-up questions or legal requirements.
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li><span className="font-medium text-white">Active accounts:</span> For as long as your account remains active</li>
              <li><span className="font-medium text-white">After account closure:</span> Up to 30 days for most information</li>
              <li><span className="font-medium text-white">Backup retention:</span> Up to 90 days in our backup systems</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Account recovery:</strong> During the 30-day period after account closure, you may be able to restore your account and associated data by contacting customer support.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Script Generation Data</h3>
            <p className="text-gray-400 mb-3">
              We retain your script generation history and saved scripts as follows:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li><span className="font-medium text-white">Generated scripts:</span> For as long as your account is active, unless you delete them</li>
              <li><span className="font-medium text-white">Script prompts:</span> For as long as your account is active, unless you delete them</li>
              <li><span className="font-medium text-white">Saved templates:</span> For as long as your account is active, unless you delete them</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Script management:</strong> You can delete individual scripts or your entire script history at any time through your account settings.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Payment Information</h3>
            <p className="text-gray-400 mb-3">
              We retain payment information as required for financial and tax purposes:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li><span className="font-medium text-white">Transaction records:</span> Up to 7 years for tax and accounting purposes</li>
              <li><span className="font-medium text-white">Payment methods:</span> Until you remove them or close your account</li>
              <li><span className="font-medium text-white">Billing addresses:</span> For as long as required for tax and legal compliance</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> Full payment card details are not stored on our servers. This information is handled by our payment processors in accordance with PCI DSS standards.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Usage Data</h3>
            <p className="text-gray-400 mb-3">
              We retain usage data for different periods depending on its purpose:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li><span className="font-medium text-white">Log data:</span> Up to 90 days for security and troubleshooting</li>
              <li><span className="font-medium text-white">Analytics data:</span> Up to 26 months in an anonymized or aggregated form</li>
              <li><span className="font-medium text-white">Error reports:</span> Up to 180 days for debugging and improvement</li>
            </ul>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Communications</h3>
            <p className="text-gray-400 mb-3">
              We retain communications with you as follows:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li><span className="font-medium text-white">Support tickets:</span> Up to 2 years after resolution</li>
              <li><span className="font-medium text-white">Email correspondence:</span> Up to 2 years</li>
              <li><span className="font-medium text-white">Feedback submissions:</span> Up to 3 years for product improvement</li>
            </ul>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Factors Determining Retention</h2>
        <p className="text-gray-300 mb-4">
          We consider several factors when determining how long to retain information:
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Legal Requirements</h3>
            <p className="text-gray-400 text-sm">
              We retain information as required by applicable laws, including tax laws, data protection regulations, and other legal obligations.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#00f5d4] pl-4 py-2">
            <h3 className="font-medium mb-1">Business Needs</h3>
            <p className="text-gray-400 text-sm">
              We consider how long the information is needed to provide our services, maintain accurate business records, and improve our products.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#f15bb5] pl-4 py-2">
            <h3 className="font-medium mb-1">User Expectations</h3>
            <p className="text-gray-400 text-sm">
              We consider how long users would reasonably expect us to retain their information based on the context in which it was provided.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Potential Disputes</h3>
            <p className="text-gray-400 text-sm">
              We may retain information for a reasonable period to address potential disputes, enforce our agreements, or defend legal claims.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Data Deletion</h2>
        <p className="text-gray-300 mb-4">
          When the retention period expires, we take steps to delete or anonymize your information:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Deletion Process</h3>
          <p className="text-gray-400 mb-3">
            Our deletion process includes:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>Removing personal information from our active systems</li>
            <li>Ensuring data is also removed from backup systems after their retention period</li>
            <li>Anonymizing data where complete deletion is not possible but the data is still valuable for analytics</li>
            <li>Securely disposing of physical records containing personal information</li>
          </ul>
          <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Secure deletion:</strong> We use industry-standard methods to securely delete data, ensuring it cannot be recovered or reconstructed after deletion.
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Requesting Earlier Deletion</h2>
        <p className="text-gray-300 mb-4">
          You can request deletion of your personal information before our standard retention periods expire:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">How to Request Deletion</h3>
          <p className="text-gray-400 mb-3">
            You can request deletion in the following ways:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li>Delete specific scripts or data through your account settings</li>
            <li>Close your account through the account settings page</li>
            <li>Contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a> with specific deletion requests</li>
          </ul>
          <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Limitations:</strong> In some cases, we may need to retain certain information despite your deletion request, such as information required for legal compliance, fraud prevention, or to resolve disputes. We will inform you if this is the case.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChangesContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Policy Changes</h1>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, and other factors. This section explains how we handle policy updates and how we will notify you of significant changes.
        </p>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">How We Update Our Policy</h2>
        <p className="text-gray-300 mb-4">
          Our approach to updating our Privacy Policy includes:
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Regular Reviews</h3>
            <p className="text-gray-400 text-sm">
              We regularly review our Privacy Policy to ensure it accurately reflects our data practices, complies with current laws, and addresses new technologies or features.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#00f5d4] pl-4 py-2">
            <h3 className="font-medium mb-1">Clear Communication</h3>
            <p className="text-gray-400 text-sm">
              When we make significant changes, we communicate them clearly and provide comparisons to help you understand what has changed.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#f15bb5] pl-4 py-2">
            <h3 className="font-medium mb-1">Advance Notice</h3>
            <p className="text-gray-400 text-sm">
              For material changes, we provide advance notice before the new policy takes effect, giving you time to review the changes and make decisions about your data.
            </p>
          </div>
          
          <div className="bg-gray-900/20 border-l-4 border-[#9b5de5] pl-4 py-2">
            <h3 className="font-medium mb-1">Version Tracking</h3>
            <p className="text-gray-400 text-sm">
              We maintain a record of policy versions and update dates, allowing you to track changes over time.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Types of Changes</h2>
        <p className="text-gray-300 mb-4">
          We categorize changes to our Privacy Policy as follows:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Material Changes</h3>
            <p className="text-gray-400 mb-3">
              Material changes significantly affect your rights or our obligations regarding your personal information. Examples include:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Collecting new categories of personal information</li>
              <li>Using personal information for substantially different purposes</li>
              <li>Sharing personal information with new categories of third parties</li>
              <li>Significant changes to your choices or rights regarding your data</li>
              <li>Changes to data retention periods that affect user data</li>
            </ul>
            <div className="mt-3 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Notification for material changes:</strong> We will notify you at least 30 days before material changes take effect through email notifications, prominent notices on our website, and in-app notifications.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-3">Non-Material Changes</h3>
            <p className="text-gray-400 mb-3">
              Non-material changes do not significantly affect your rights or our obligations. Examples include:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
              <li>Clarifications or improvements to language without changing meaning</li>
              <li>Correcting typographical errors</li>
              <li>Updating contact information</li>
              <li>Reorganizing content for better readability</li>
              <li>Adding examples to illustrate existing practices</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
              <p className="text-sm text-gray-300">
                <strong>Notification for non-material changes:</strong> For non-material changes, we may update the "Last Updated" date at the top of the Privacy Policy without additional notification.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">How We Notify You</h2>
        <p className="text-gray-300 mb-4">
          We use various methods to notify you about changes to our Privacy Policy:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Notification Methods</h3>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li><span className="font-medium text-white">Email notifications:</span> For material changes, we send emails to the address associated with your account</li>
            <li><span className="font-medium text-white">Website notices:</span> We display prominent banners or notifications on our website</li>
            <li><span className="font-medium text-white">In-app notifications:</span> Users of our platform will see notifications within the application</li>
            <li><span className="font-medium text-white">Blog posts:</span> For significant changes, we may publish detailed explanations on our blog</li>
            <li><span className="font-medium text-white">Last updated date:</span> We always update the "Last Updated" date at the top of the Privacy Policy</li>
          </ul>
          <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Staying informed:</strong> To ensure you receive notifications about policy changes, please keep your contact information up to date and check our website periodically.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Your Choices When We Update Our Policy</h2>
        <p className="text-gray-300 mb-4">
          When we make material changes to our Privacy Policy, you have several options:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Your Options</h3>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-3">
            <li><span className="font-medium text-white">Review the changes:</span> We encourage you to carefully review the updated policy to understand how it affects you</li>
            <li><span className="font-medium text-white">Continue using our services:</span> Continuing to use our services after the new policy takes effect constitutes acceptance of the changes</li>
            <li><span className="font-medium text-white">Adjust your settings:</span> You may be able to adjust your privacy settings in response to policy changes</li>
            <li><span className="font-medium text-white">Request data deletion:</span> If you don't agree with the changes, you can request deletion of your data</li>
            <li><span className="font-medium text-white">Close your account:</span> If you don't agree with the changes, you can close your account</li>
          </ul>
          <div className="mt-3 p-3 bg-[#f15bb5]/10 border border-[#f15bb5]/30 rounded-md">
            <p className="text-sm text-gray-300">
              <strong>Important:</strong> If you continue to use our services after the effective date of the updated Privacy Policy, you will be bound by the new terms. If you do not agree with the changes, you should discontinue using our services.
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">Policy Version History</h2>
        <p className="text-gray-300 mb-4">
          We maintain a record of significant changes to our Privacy Policy:
        </p>
        
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium mb-3">Version History</h3>
          <div className="space-y-4">
            <div className="border-b border-gray-700 pb-3">
              <p className="text-gray-300 font-medium">November 15, 2023 (Current Version)</p>
              <ul className="list-disc list-inside text-gray-400 text-sm mt-2">
                <li>Initial comprehensive Privacy Policy</li>
                <li>Detailed data collection, use, and sharing practices</li>
                <li>Added information about user rights and choices</li>
                <li>Included data retention policies</li>
              </ul>
            </div>
            
            <div className="border-b border-gray-700 pb-3">
              <p className="text-gray-300 font-medium">August 1, 2023</p>
              <ul className="list-disc list-inside text-gray-400 text-sm mt-2">
                <li>Beta launch Privacy Policy</li>
                <li>Basic information about data practices</li>
                <li>Limited to essential services during beta testing</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-sm">
              For access to previous versions of our Privacy Policy, please contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] hover:underline">support@nexusrbx.com</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
