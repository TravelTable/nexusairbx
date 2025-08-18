import { useEffect, useMemo, useState } from "react";
import {
  Home,
  FileText,
  Shield,
  AlertTriangle,
  Info,
  Github,
  BookOpen,
  Mail,
  Search,
  ArrowUp,
  ExternalLink,
  Calendar
} from "lucide-react";

// Container Component
export default function TermsPageContainer() {
  const [activeSection, setActiveSection] = useState("terms");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic last updated date (update this when you materially change terms)
  const lastUpdated = useMemo(() => {
    const d = new Date();
    const opts = { year: "numeric", month: "long", day: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // One scroll listener, cleaned up
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Simple “jump to first heading match” when query changes
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
    { id: "terms", title: "Terms of Service", icon: FileText },
    { id: "privacy", title: "Privacy Policy", icon: Shield },
    { id: "acceptable-use", title: "Acceptable Use", icon: AlertTriangle },
    { id: "licensing", title: "Licensing", icon: Info }
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
  handleSearchChange
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
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
            <a href="/docs" className="text-gray-300 hover:text-white transition-colors duration-300">
              <span className="flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                Docs
              </span>
            </a>
            <a href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300">Contact</a>
          </nav>
          <button className="md:hidden text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
                <h2 className="text-xl font-bold mb-4">Legal Documents</h2>
                <nav className="space-y-2">
                  {sections.map(section => (
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
                    <Mail className="h-4 w-4 mr-2 text-[#9b5de5]" />
                    Questions?
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    If you have any questions about our terms or policies, please contact our legal team.
                  </p>
                  <a
                    href="mailto:legal@nexusrbx.com"
                    className="text-sm px-4 py-2 rounded-md bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-[#9b5de5] hover:bg-[#9b5de5]/30 transition-colors duration-300 inline-block"
                  >
                    Contact Legal
                  </a>
                </div>

                <div className="mt-8 p-4 rounded-lg bg-gray-900/40 border border-gray-800">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-4 w-4 mr-2 text-[#00f5d4]" />
                    <h3 className="font-medium">Last Updated</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {lastUpdated}
                  </p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow">
              {activeSection === "terms" && <TermsOfServiceContent lastUpdated={lastUpdated} />}
              {activeSection === "privacy" && <PrivacyPolicyContent lastUpdated={lastUpdated} />}
              {activeSection === "acceptable-use" && <AcceptableUseContent lastUpdated={lastUpdated} />}
              {activeSection === "licensing" && <LicensingContent lastUpdated={lastUpdated} />}
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
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/legal/terms" className="text-gray-400 hover:text-white transition-colors duration-300">Terms</a>
            <a href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy</a>
            <a href="/contact" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</a>
            <a
              href="https://github.com/yourorg/yourrepo"
              target="_blank" rel="noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} NexusRBX. All rights reserved.
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#9b5de5] text-white shadow-lg hover:bg-[#8a4bd0] transition-all duration-300 animate-fade-in z-50"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Terms of Service Content
function TermsOfServiceContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 id="terms-of-service" className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>

      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the NexusRBX website and services (the "Service") operated by NexusRBX ("us", "we", or "our").
        </p>
        <p className="text-gray-300 italic mt-3">
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
        </p>
        <p className="text-gray-300 italic mt-3">
          By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
        </p>
      </div>

      <section className="mb-8" id="accounts">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">1. Accounts</h2>
        <p className="text-gray-300 mb-4">
          When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
        </p>
        <p className="text-gray-300 mb-4">
          You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
        </p>
        <p className="text-gray-300">
          You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
        </p>
      </section>

      {/* 2. Service Usage (updated) */}
      <section className="mb-8" id="service-usage">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">2. Service Usage</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX provides an AI‑assisted platform for generating and testing Roblox scripts. You agree to use the Service only for lawful purposes and in accordance with these Terms, Roblox’s rules, and applicable law.
        </p>
        <h3 className="text-white font-semibold mb-2">Prohibited Uses</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Creating or distributing exploits, cheats, malware, credential theft, or scripts that bypass Roblox security.</li>
          <li>Infringing content or violating privacy or data‑protection laws.</li>
          <li>Abuse of rate limits, automated scraping, or attempts to reverse engineer the Service.</li>
        </ul>
        <p className="text-gray-300">We may suspend or terminate access for violations.</p>
      </section>

      <section className="mb-8" id="intellectual-property">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">3. Intellectual Property</h2>
        <p className="text-gray-300 mb-4">
          The Service and its original content, features, and functionality are and will remain the exclusive property of NexusRBX and its licensors. The Service is protected by copyright, trademark, and other laws of both Australia and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of NexusRBX.
        </p>
        <h3 className="text-xl font-semibold mb-3 text-white">User-Generated Content</h3>
        <p className="text-gray-300 mb-4">
          You retain ownership of any scripts, mods, or other content you create using our Service ("User Content"). By using our Service to generate scripts, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content in any existing or future media formats for the purpose of providing and improving our Service.
        </p>
        <p className="text-gray-300 mb-4">
          You represent and warrant that:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>You own or control all rights to the User Content you submit through the Service, or you have the legal right to grant the license described above.</li>
          <li>Your User Content does not violate the privacy rights, publicity rights, copyrights, contract rights, or any other rights of any person or entity.</li>
        </ul>
      </section>

      {/* 4. Subscriptions, Tokens, and Payments (updated) */}
      <section className="mb-8" id="subscription">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">4. Subscriptions, Tokens, and Payments</h2>
        <p className="text-gray-300 mb-4">
          Certain features require a paid Subscription with a monthly token allowance, and/or Pay‑As‑You‑Go token packs (“PAYG”). Tokens are units used to meter AI usage (input + output). We may impose a minimum debit per request (e.g., 1,000 tokens) to prevent abuse.
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><span className="font-semibold">Subscriptions:</span> billed monthly or annually; token allowance resets monthly and does not roll over.</li>
          <li><span className="font-semibold">PAYG packs:</span> non‑refundable, do not expire, and are consumed after subscription allowance is exhausted or if you have no subscription.</li>
          <li><span className="font-semibold">Metering:</span> we deduct the exact tokens used per request, rounded up to the minimum debit.</li>
          <li><span className="font-semibold">Overages:</span> if your balance is insufficient, requests may be rejected until you top up.</li>
          <li><span className="font-semibold">Taxes/Fees:</span> prices may be exclusive of taxes and processing fees.</li>
        </ul>
        <p className="text-gray-300">You authorize us and our payment processors to charge your selected payment method for fees due.</p>
      </section>

      {/* 5. Cancellations, Refunds, and Changes */}
      <section className="mb-8" id="billing-policy">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">5. Cancellations, Refunds, and Changes</h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Cancel anytime; access continues until the end of the current billing period.</li>
          <li>We do not provide prorated refunds for partial periods.</li>
          <li>We may adjust pricing or allowances prospectively; material changes will be communicated in advance.</li>
        </ul>
      </section>

      {/* 6. Model Output & Disclaimers */}
      <section className="mb-8" id="model-output">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">6. AI Output and Disclaimers</h2>
        <p className="text-gray-300 mb-4">
          AI outputs may be incorrect, incomplete, or require modification to work in your environment. You are responsible for reviewing, testing, and securing code before use. We provide no warranties that outputs will meet your needs or be error‑free.
        </p>
      </section>

      {/* 7. Governing Law */}
      <section className="mb-8" id="governing-law">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">7. Governing Law</h2>
        <p className="text-gray-300">
          These Terms are governed by the laws of New South Wales, Australia, without regard to conflicts of law. The courts located in New South Wales shall have exclusive jurisdiction.
        </p>
      </section>

      {/* 8. Eligibility */}
      <section className="mb-8" id="age">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">8. Eligibility</h2>
        <p className="text-gray-300">
          You must be at least 13 years old to use the Service. If you are under the age of majority in your jurisdiction, you represent you have parental or guardian consent.
        </p>
      </section>

      {/* 9. Contact */}
      <section id="contact-us">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">9. Contact Us</h2>
        <p className="text-gray-300">
          If you have any questions about these Terms, please contact us at <a href="mailto:legal@nexusrbx.com" className="text-[#9b5de5] hover:underline">legal@nexusrbx.com</a>.
        </p>
      </section>

      <div className="mt-12 p-6 bg-gray-900/30 border border-gray-800 rounded-lg">
        <div className="flex items-center mb-4">
          <ExternalLink className="h-5 w-5 text-[#9b5de5] mr-2" />
          <h3 className="text-xl font-bold">Related Documents</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/legal/privacy" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Shield className="h-5 w-5 text-[#00f5d4] mr-3" />
            <span>Privacy Policy</span>
          </a>
          <a href="/legal/acceptable-use" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <AlertTriangle className="h-5 w-5 text-[#f15bb5] mr-3" />
            <span>Acceptable Use Policy</span>
          </a>
          <a href="/legal/licensing" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Info className="h-5 w-5 text-[#9b5de5] mr-3" />
            <span>Licensing Policy</span>
          </a>
          <a href="/contact" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Mail className="h-5 w-5 text-[#00f5d4] mr-3" />
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Privacy Policy Content (stub, update as needed)
function PrivacyPolicyContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 id="privacy-policy" className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          This Privacy Policy describes how NexusRBX ("we", "us", or "our") collects, uses, and discloses your personal information when you use our website and services (the "Service").
        </p>
        <p className="text-gray-300 italic mt-3">
          We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
        </p>
      </div>
      <h2 id="privacy-what-we-collect" className="text-2xl font-bold mb-3">What We Collect</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>Account information (email, username, password hash)</li>
        <li>Usage data (logs, API requests, tokens metered)</li>
        <li>Payment metadata (handled by Stripe or similar processor)</li>
      </ul>
      <h2 id="privacy-how-we-use" className="text-2xl font-bold mb-3">How We Use Data</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>To operate and improve the Service</li>
        <li>Fraud prevention and abuse detection</li>
        <li>Legal compliance and billing</li>
      </ul>
      <h2 id="privacy-rights" className="text-2xl font-bold mb-3">Your Rights</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>Request access or deletion of your data by contacting <a href="mailto:privacy@nexusrbx.com" className="text-[#9b5de5]">privacy@nexusrbx.com</a></li>
        <li>We retain data as required by law and for legitimate business purposes</li>
      </ul>
      <h2 id="privacy-subprocessors" className="text-2xl font-bold mb-3">Sub-processors & Storage</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>Payments processed by Stripe (or similar)</li>
        <li>Data hosted in Australia or trusted cloud regions</li>
      </ul>
      <h2 id="privacy-contact" className="text-2xl font-bold mb-3">Contact</h2>
      <p className="text-gray-300">
        For privacy questions, email <a href="mailto:privacy@nexusrbx.com" className="text-[#9b5de5]">privacy@nexusrbx.com</a>.
      </p>
    </div>
  );
}

// Acceptable Use Policy Content (Roblox-specific, concrete)
function AcceptableUseContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 id="acceptable-use-policy" className="text-3xl font-bold mb-2">Acceptable Use Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300">
          This Policy protects our users and the Roblox community. Violations may result in suspension or termination.
        </p>
      </div>
      <h2 id="aup-prohibited" className="text-2xl font-bold mb-3">Prohibited Content & Conduct</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
        <li>Exploits, cheats, obfuscated malware, or attempts to bypass Roblox protections.</li>
        <li>Credentials harvesting, tracking users without consent, or invasive telemetry.</li>
        <li>Harassment, hate, sexual content involving minors, or otherwise unlawful content.</li>
        <li>High‑risk activities that threaten service stability (flooding, scraping, API abuse).</li>
        <li>Reverse‑engineering or benchmarking the Service without permission.</li>
      </ul>
      <h2 id="aup-rate-limits" className="text-2xl font-bold mb-3">Rate Limits & Automation</h2>
      <p className="text-gray-300 mb-2">
        We enforce per‑account and per‑key rate limits. Automated access requires API credentials and adherence to limits. Attempts to evade limits are prohibited.
      </p>
      <h2 id="aup-reporting" className="text-2xl font-bold mb-3">Reporting</h2>
      <p className="text-gray-300">
        Report abuse to <a href="mailto:abuse@nexusrbx.com" className="text-[#9b5de5]">abuse@nexusrbx.com</a>.
      </p>
    </div>
  );
}

// Licensing Policy Content (stub, update as needed)
function LicensingContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 id="licensing-policy" className="text-3xl font-bold mb-2">Licensing Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          This Licensing Policy outlines the terms under which you may use scripts and other content generated through NexusRBX's services. It clarifies ownership rights, permitted uses, and restrictions for content created using our platform.
        </p>
      </div>
      <h2 id="licensing-ownership" className="text-2xl font-bold mb-3">Ownership</h2>
      <p className="text-gray-300 mb-4">
        You retain rights to your original User Content. NexusRBX retains rights to its platform, models, and generated outputs as described in the Terms of Service.
      </p>
      <h2 id="licensing-permitted" className="text-2xl font-bold mb-3">Permitted Uses</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>Use generated scripts for your own Roblox games and experiences, subject to Roblox’s own terms.</li>
        <li>Share or modify outputs, provided you do not misrepresent authorship or violate Roblox or NexusRBX policies.</li>
      </ul>
      <h2 id="licensing-restrictions" className="text-2xl font-bold mb-3">Restrictions</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
        <li>No resale or sublicensing of generated content as a service or product, unless explicitly permitted.</li>
        <li>No use of outputs for prohibited or unlawful purposes.</li>
      </ul>
      <h2 id="licensing-contact" className="text-2xl font-bold mb-3">Contact</h2>
      <p className="text-gray-300">
        For licensing questions, email <a href="mailto:legal@nexusrbx.com" className="text-[#9b5de5]">legal@nexusrbx.com</a>.
      </p>
    </div>
  );
}