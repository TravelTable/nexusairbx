import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Shield,
  AlertTriangle,
  Info,
  BookOpen,
  Mail,
  Search,
  ArrowUp,
  Calendar,
  Scale,
  Gavel,
  Lock,
  CreditCard,
  Database,
  Zap
} from "lucide-react";

// Container Component
export default function TermsPageContainer() {
  const [activeSection, setActiveSection] = useState("terms");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const lastUpdated = "January 12, 2026";

  const handleSectionChange = (section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const selectors = "h1, h2, h3, h4";
    const nodes = Array.from(document.querySelectorAll(selectors));
    const q = searchQuery.toLowerCase();
    const hit = nodes.find(n => n.innerText.toLowerCase().includes(q));
    if (hit) {
      hit.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchQuery]);

  const sections = [
    { id: "introduction", title: "1. Introduction", icon: FileText },
    { id: "accounts", title: "2. Accounts & Eligibility", icon: Shield },
    { id: "usage", title: "3. Acceptable Use", icon: AlertTriangle },
    { id: "ip", title: "4. Intellectual Property", icon: Database },
    { id: "licensing", title: "5. Script Licensing", icon: Info },
    { id: "billing", title: "6. Payments & Billing", icon: CreditCard },
    { id: "ai-disclaimer", title: "7. AI Disclaimer", icon: Zap },
    { id: "liability", title: "8. Liability & Indemnity", icon: Scale },
    { id: "legal", title: "9. Legal & Disputes", icon: Gavel },
    { id: "termination", title: "10. Termination", icon: Lock },
    { id: "contact", title: "11. Contact Us", icon: Mail }
  ];

  return (
    <TermsPage
      activeSection={activeSection}
      sections={sections}
      lastUpdated={lastUpdated}
      showBackToTop={showBackToTop}
      searchQuery={searchQuery}
      handleSectionChange={handleSectionChange}
      handleSearchChange={handleSearchChange}
      navigate={navigate}
    />
  );
}

// UI Component
function TermsPage({
  activeSection,
  sections,
  lastUpdated,
  showBackToTop,
  searchQuery,
  handleSectionChange,
  handleSearchChange,
  navigate
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              NexusRBX
            </div>
            <div className="ml-2 text-sm text-gray-400">Legal</div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a href="/ai" className="text-gray-300 hover:text-white transition-colors duration-300">AI Console</a>
            <a href="/docs" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              Docs
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text">
              Legal Documents
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              These documents govern your use of NexusRBX services. Please read them carefully.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search legal documents..."
                className="w-full pl-10 pr-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="md:w-64 shrink-0">
              <div className="sticky top-24">
                <h2 className="text-xl font-bold mb-4">Legal Hub</h2>
                <nav className="space-y-1">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`w-full flex items-center p-3 rounded-lg transition-colors duration-300 text-sm ${
                        activeSection === section.id
                          ? "bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-white"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                      }`}
                    >
                      <section.icon className="h-4 w-4 mr-3" />
                      <span>{section.title}</span>
                    </button>
                  ))}
                </nav>

                <div className="mt-8 p-4 rounded-lg bg-gray-900/40 border border-gray-800">
                  <h3 className="font-medium mb-2 flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-[#9b5de5]" />
                    Legal Support
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Questions about our terms? Contact our legal team.
                  </p>
                  <a
                    href="mailto:support@nexusrbx.com"
                    className="text-xs px-4 py-2 rounded-md bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-[#9b5de5] hover:bg-[#9b5de5]/30 transition-colors duration-300 inline-block w-full text-center"
                  >
                    support@nexusrbx.com
                  </a>
                </div>

                <div className="mt-8 p-4 rounded-lg bg-gray-900/40 border border-gray-800">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-4 w-4 mr-2 text-[#00f5d4]" />
                    <h3 className="font-medium text-sm">Last Updated</h3>
                  </div>
                  <p className="text-xs text-gray-400">
                    {lastUpdated}
                  </p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow">
              {activeSection === "introduction" && <IntroductionContent />}
              {activeSection === "accounts" && <AccountsContent />}
              {activeSection === "usage" && <UsageContent />}
              {activeSection === "ip" && <IPContent />}
              {activeSection === "licensing" && <LicensingContent />}
              {activeSection === "billing" && <BillingContent />}
              {activeSection === "ai-disclaimer" && <AIDisclaimerContent />}
              {activeSection === "liability" && <LiabilityContent />}
              {activeSection === "legal" && <LegalContent />}
              {activeSection === "termination" && <TerminationContent />}
              {activeSection === "contact" && <ContactContent />}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">
              NexusRBX
            </div>
            <div className="text-sm text-gray-400">Legal Documents</div>
          </div>
          <div className="text-gray-500 text-sm">
            © 2026 NexusRBX. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#9b5de5] text-white shadow-lg hover:bg-[#8a4bd0] transition-all duration-300 z-50"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function IntroductionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Introduction and Acceptance of Terms</h1>
      <p className="text-gray-300 mb-4">
        Welcome to NexusRBX! These Terms and Conditions (the “Terms”) govern your access to and use of the NexusRBX website, applications, and services (collectively, the “Service”) operated by NexusRBX (“we”, “us”, or “our”). Please read these Terms carefully before using the Service. By accessing or using NexusRBX, you agree to be bound by all terms and conditions described here, as well as our Privacy Policy (which is incorporated by reference). If you do not agree with these Terms or the Privacy Policy, you must not use the Service.
      </p>
      <p className="text-gray-300 mb-4">
        Throughout these Terms, “you” refers to the individual or legal entity accessing the Service. If you are using NexusRBX on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms. You may use the Service only in compliance with these Terms and all applicable laws and regulations.
      </p>
      <p className="text-gray-400 italic mb-6">Last updated: January 12, 2026.</p>
      <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg text-sm text-gray-400">
        NexusRBX is an independent platform and is not affiliated with, endorsed by, or associated with Roblox Corporation or any other third-party platform. “Roblox” is a registered trademark of Roblox Corporation. NexusRBX is not an official Roblox product. All references to Roblox or other trademarks are for identification purposes only.
      </div>
    </div>
  );
}

function AccountsContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">1. Accounts and Eligibility</h1>
      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Account Registration</h3>
          <p className="text-gray-400">To use certain features of the Service, you need to create a NexusRBX account. You must provide accurate, current, and complete information during registration (including a valid email). You agree to keep your account information updated. You must be at least 13 years old to create an account. If you are under the age of majority in your jurisdiction (e.g. under 18 in most regions), you may only use the Service under the supervision of a parent or guardian who agrees to these Terms on your behalf.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Account Security</h3>
          <p className="text-gray-400">You are responsible for maintaining the confidentiality of your account login credentials. Do not share your password or API keys with anyone. You agree to notify us immediately at support@nexusrbx.com if you suspect any unauthorized access to or use of your account. We are not liable for any loss or damage arising from your failure to protect your credentials.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Account Termination</h3>
          <p className="text-gray-400">We may suspend or terminate your account immediately and without notice if: (a) you violate these Terms; (b) we detect behavior that is fraudulent, abusive, or illegal; or (c) your account has been inactive for an extended period. You have the right to terminate your own account at any time through your account settings.</p>
        </section>
      </div>
    </div>
  );
}

function UsageContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">2. Service Usage and Acceptable Use</h1>
      <p className="text-gray-300 mb-6">NexusRBX provides an AI-assisted platform for generating and testing Roblox scripts. You agree to use the Service only for lawful purposes and in compliance with these Terms, Roblox’s own community rules, and all applicable laws.</p>
      
      <h3 className="text-xl font-bold text-red-400 mb-4">Prohibited Content & Activities</h3>
      <ul className="list-disc list-inside text-gray-400 space-y-3 mb-8">
        <li><strong>Exploits & Malware:</strong> Developing or distributing exploits, cheats, or malware for Roblox. You may not generate scripts intended to bypass Roblox security features or facilitate hacking.</li>
        <li><strong>Abuse & Harassment:</strong> Engaging in harassment, hate speech, or abusive behavior. Content that is defamatory, threatening, or discriminatory is strictly forbidden.</li>
        <li><strong>Privacy Violations:</strong> Generating scripts to harvest personal data without consent or track users in a way that breaches privacy rights.</li>
        <li><strong>System Misuse:</strong> Attempting to reverse engineer, scrape, or overload our servers. Automation is allowed only via official endpoints.</li>
      </ul>

      <div className="p-4 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-lg">
        <h4 className="font-bold text-white mb-2">Roblox Platform Compliance</h4>
        <p className="text-sm text-gray-300">NexusRBX is designed to assist with Roblox scripting, but you are responsible for ensuring that anything you create using our Service complies with Roblox’s Terms of Use and Community Standards. Do not use our Service to create content that would get you banned on Roblox.</p>
      </div>
    </div>
  );
}

function IPContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">3. Intellectual Property and Content Ownership</h1>
      <div className="space-y-8">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-3">Our Intellectual Property</h3>
          <p className="text-gray-400">All content and materials available on the Service, including software, text, graphics, logos, and our AI models, are the property of NexusRBX or its licensors. NexusRBX™ and our logos are trademarks of our company. We grant you a limited, revocable, non-transferable license to use the Service for its intended purpose.</p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-3">Your Content</h3>
          <p className="text-gray-400">You retain ownership of and responsibility for your User Content (prompts and generated scripts). By using our Service, you grant NexusRBX a non-exclusive, worldwide, royalty-free license to host, store, and process your User Content solely for the purposes of operating and improving the Service.</p>
        </section>

        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-2">Feedback</h3>
          <p className="text-sm text-gray-400">If you provide us with suggestions or feedback, you acknowledge that we may use and implement that Feedback without obligation to you. You grant us a perpetual, irrevocable, worldwide license to use the Feedback for any purpose.</p>
        </section>
      </div>
    </div>
  );
}

function LicensingContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">4. Licensing of Generated Content (Scripts)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h3 className="text-lg font-bold text-[#00f5d4] mb-3">Permitted Uses</h3>
          <p className="text-sm text-gray-400">You may use, modify, and deploy the AI-generated scripts in your own Roblox games and experiences. You may also share the output with others as long as you do not violate these Terms.</p>
        </div>
        <div className="p-5 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h3 className="text-lg font-bold text-red-400 mb-3">Restrictions</h3>
          <p className="text-sm text-gray-400">You may not sell or redistribute NexusRBX-generated content as a standalone product or service without our permission. You cannot claim our AI code is your proprietary offering.</p>
        </div>
      </div>
      <p className="mt-6 text-gray-400 text-sm italic">For further clarity, please refer to our separate Licensing Policy accessible via the Legal section of our site.</p>
    </div>
  );
}

function BillingContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">5. Subscription Plans, Payments, and Billing</h1>
      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Tokens and Usage</h3>
          <p className="text-gray-400">NexusRBX uses a token system to meter AI usage. Each Subscription plan provides a monthly allowance of tokens that resets each billing period. PAYG packs provide additional tokens that do not expire. Unused subscription tokens do not roll over.</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white mb-1">Billing Cycle</h4>
            <p className="text-xs text-gray-500">Monthly or annual recurring billing. Automatic renewal unless cancelled.</p>
          </div>
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
            <h4 className="font-bold text-white mb-1">No Refunds</h4>
            <p className="text-xs text-gray-500">All charges are non-refundable. Cancellation stops future billing but doesn't refund current period.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Modifications</h3>
          <p className="text-gray-400">We may change features or pricing at any time. Subscription price changes will be notified in advance and apply to the next renewal cycle.</p>
        </section>
      </div>
    </div>
  );
}

function AIDisclaimerContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">7. AI Output and Disclaimer of Warranties</h1>
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl mb-8">
        <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-2" /> CRITICAL DISCLAIMER
        </h3>
        <p className="text-gray-300 font-medium">AI-generated outputs may be incorrect, incomplete, or non-functional. You are solely responsible for reviewing, testing, and validating any script before use in a live environment.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-white mb-2">No Guarantee</h3>
          <p className="text-gray-400">The Service and all outputs are provided on an “AS IS” and “AS AVAILABLE” basis. NexusRBX disclaims all warranties, including merchantability, fitness for a particular purpose, and accuracy.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-white mb-2">Assumption of Risk</h3>
          <p className="text-gray-400">You assume all risk for any damage to your computer system, Roblox account, or game resulting from the use of the Service. We strongly recommend testing scripts in our sandbox first.</p>
        </section>
      </div>
    </div>
  );
}

function LiabilityContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">8. Limitation of Liability and Indemnification</h1>
      <div className="space-y-8">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-3">Limitation of Liability</h3>
          <p className="text-gray-400">To the maximum extent permitted by law, NexusRBX shall not be liable for any indirect, incidental, or consequential damages. Our total aggregate liability shall not exceed the greater of: (a) the amount you paid in the last 6 months; or (b) $100 USD.</p>
        </section>

        <section className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-3">Indemnification</h3>
          <p className="text-sm text-gray-400">You agree to indemnify and hold harmless NexusRBX from any third-party claims arising out of: (a) your use of the Service; (b) your violation of these Terms; or (c) your infringement of any intellectual property rights.</p>
        </section>
      </div>
    </div>
  );
}

function LegalContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">9. Governing Law and Dispute Resolution</h1>
      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Governing Law</h3>
          <p className="text-gray-400">These Terms are governed by the laws of New South Wales, Australia. You agree to the exclusive jurisdiction of the courts located in New South Wales.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Arbitration</h3>
          <p className="text-gray-400">At our discretion, we may require you to submit any dispute to binding arbitration in Sydney, Australia. You agree that any claim must be brought individually, and not as part of a class action.</p>
        </section>
        <section className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <h4 className="font-bold text-white mb-1">Third-Party Links</h4>
          <p className="text-xs text-gray-500">Our Service may link to third-party services (Google, Roblox, etc.). We are not responsible for their content or privacy practices.</p>
        </section>
      </div>
    </div>
  );
}

function TerminationContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">10. Termination and Changes</h1>
      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Termination</h3>
          <p className="text-gray-400">You may stop using the Service at any time. We reserve the right to suspend or terminate your access for any reason, including violation of these Terms. Upon termination, your rights to use the Service cease immediately.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-[#9b5de5] mb-2">Changes to Terms</h3>
          <p className="text-gray-400">NexusRBX may modify these Terms from time to time. Continued use of the Service after updated Terms are posted constitutes acceptance of those changes. Material changes will be notified via email or in-app notice.</p>
        </section>
        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-2">Miscellaneous</h3>
          <p className="text-sm text-gray-400">These Terms constitute the entire agreement. Our failure to enforce any right is not a waiver. You may not assign these Terms without our consent.</p>
        </section>
      </div>
    </div>
  );
}

function ContactContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">11. Contact Us</h1>
      <p className="text-gray-300 mb-8">If you have any questions about these Terms, please reach out to our legal team:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
          <Mail className="h-10 w-10 text-[#9b5de5] mb-4" />
          <h3 className="text-xl font-bold mb-2">Email Support</h3>
          <p className="text-sm text-gray-400 mb-4">For legal inquiries and support.</p>
          <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] font-bold hover:underline">support@nexusrbx.com</a>
        </div>

        <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
          <Scale className="h-10 w-10 text-[#00f5d4] mb-4" />
          <h3 className="text-xl font-bold mb-2">Mailing Address</h3>
          <p className="text-sm text-gray-400 mb-4">NexusRBX Legal<br />PO Box 123, Sydney<br />NSW 2000, Australia</p>
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm italic">Thank you for using NexusRBX and for abiding by these Terms to keep our community safe and fair. Happy scripting!</p>
      </div>
    </div>
  );
}
