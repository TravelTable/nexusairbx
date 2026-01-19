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
  UserCheck,
  Clock,
  Cookie,
  Users,
  Scale
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

  const handleNavClick = (href, external) => (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (external) {
      window.open(href, "_blank", "noopener noreferrer");
    } else {
      navigate(href);
    }
  };

  const sections = [
    { id: "introduction", title: "Introduction", icon: Eye },
    { id: "collection", title: "Information We Collect", icon: Database },
    { id: "use", title: "How We Use Your Information", icon: Server },
    { id: "sharing", title: "How We Share Information", icon: Globe },
    { id: "cookies", title: "Cookies & Tracking", icon: Cookie },
    { id: "security", title: "Data Storage & Security", icon: Lock },
    { id: "retention", title: "Data Retention", icon: Clock },
    { id: "rights", title: "Your Privacy Rights", icon: UserCheck },
    { id: "exercise", title: "How to Exercise Rights", icon: Scale },
    { id: "children", title: "Children's Privacy", icon: Users },
    { id: "changes", title: "Policy Changes", icon: FileText },
    { id: "contact", title: "Contact Us", icon: Mail },
  ];

  const lastUpdated = "January 12, 2026";

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
          </nav>

          <button
            className="md:hidden text-gray-300"
            onClick={() => setMobileMenuOpen((v) => !v)}
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

                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`w-full flex items-center p-2.5 rounded-lg transition-colors duration-300 text-sm ${
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
                    Privacy Support
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Questions about your data? Contact our privacy team.
                  </p>
                  <a
                    href="mailto:support@nexusrbx.com"
                    className="text-xs px-4 py-2 rounded-md bg-[#9b5de5]/20 border border-[#9b5de5]/30 text-[#9b5de5] hover:bg-[#9b5de5]/30 transition-colors duration-300 inline-block w-full text-center"
                  >
                    support@nexusrbx.com
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow">
              {activeSection === "introduction" && <IntroductionContent />}
              {activeSection === "collection" && <CollectionContent />}
              {activeSection === "use" && <UseContent />}
              {activeSection === "sharing" && <SharingContent />}
              {activeSection === "cookies" && <CookiesContent />}
              {activeSection === "security" && <SecurityContent />}
              {activeSection === "retention" && <RetentionContent />}
              {activeSection === "rights" && <RightsContent />}
              {activeSection === "exercise" && <ExerciseContent />}
              {activeSection === "children" && <ChildrenContent />}
              {activeSection === "changes" && <ChangesContent />}
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
            <div className="text-sm text-gray-400">Privacy Policy</div>
          </div>
          <div className="text-gray-500 text-sm">
            © 2026 NexusRBX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function IntroductionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Introduction</h1>
      <p className="text-gray-300">
        At NexusRBX, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use and share it, and your rights regarding your information when you use our website and AI-driven Roblox scripting platform (“Service”). By using the Service, you agree to the collection and use of information as outlined in this policy. If you do not agree, please discontinue use of the Service.
      </p>
      <p className="text-gray-400 mt-4 italic">Last updated: January 12, 2026.</p>
    </div>
  );
}

function CollectionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Information We Collect</h1>
      <p className="text-gray-300 mb-6">We collect personal and usage information necessary to provide and improve our Service. This includes:</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5]">Account Information</h2>
          <p className="text-gray-400">When you create an account, we collect information like your username, email address, and a hashed password. If you sign in via a third-party OAuth provider (e.g. Google or GitHub), we receive basic profile details such as your email from that provider.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5]">Content and Usage Data</h2>
          <p className="text-gray-400">The prompts and scripts you generate (your “User Content”), and how you interact with the Service (e.g. features used, pages visited, click streams). We also collect log data including IP address, browser type, device information, and timestamps of requests.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5]">Payment Information</h2>
          <p className="text-gray-400">If you purchase a subscription or tokens, payments are processed by third-party payment processors (e.g. Stripe). We do not store your full credit card details on our servers. We may retain basic transaction identifiers and subscription status, while the payment provider handles sensitive financial details in compliance with PCI-DSS standards.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5]">Cookies & Tracking</h2>
          <p className="text-gray-400">We use cookies and similar technologies to operate and secure our Service, remember your preferences, and gather analytics on usage. See Cookies below for more details.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[#9b5de5]">Communications</h2>
          <p className="text-gray-400">If you contact support or communicate with us (such as via email or chat), we may collect your name, email, and the content of your communications to respond to you and improve our Service.</p>
        </section>
      </div>

      <div className="mt-8 p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
        <p className="text-sm text-gray-400">We do not knowingly collect personal information from children under 13. Our Service is not intended for users under 13, and if we learn we’ve collected information from a child under 13, we will delete it. (See “Children’s Privacy” below.)</p>
      </div>
    </div>
  );
}

function UseContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">How We Use Your Information</h1>
      <p className="text-gray-300 mb-6">We use the collected information for the following purposes:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Provide and Improve</h3>
          <p className="text-sm text-gray-400">To operate the NexusRBX platform and its features, including generating scripts via AI, maintaining your account, and optimizing performance. Usage data helps us debug issues, train and enhance our AI models (using anonymized prompt/code data), and develop new features.</p>
        </div>
        
        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Personalization</h3>
          <p className="text-sm text-gray-400">To remember your settings and preferences (such as saved scripts or interface customizations) and provide a tailored user experience.</p>
        </div>

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Communication</h3>
          <p className="text-sm text-gray-400">To send service-related communications such as confirmations, technical and security notices, updates, and if you opt-in, occasional promotional emails. We may also respond to your inquiries or support requests.</p>
        </div>

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Analytics and Research</h3>
          <p className="text-sm text-gray-400">To understand aggregate usage trends and user engagement with our Service. This helps us improve usability and guide product development.</p>
        </div>

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Security and Fraud</h3>
          <p className="text-sm text-gray-400">To monitor, investigate, and prevent fraud, abuse, security incidents, and other malicious activities. For example, we may use automated tools to detect scripts that violate our policies or Roblox’s rules.</p>
        </div>

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-[#9b5de5]">Legal Compliance</h3>
          <p className="text-sm text-gray-400">To comply with applicable laws and regulations, such as fulfilling lawful requests from authorities or enforcing our Terms and policies.</p>
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-sm italic">We will not use your personal information for purposes incompatible with those above without your consent. We do not use personal data for automated decision-making that produces legal or similarly significant effects without human review.</p>
    </div>
  );
}

function SharingContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">How We Share Information</h1>
      <p className="text-gray-300 mb-6">We value your privacy – we do not sell your personal information. We only share information in the following circumstances:</p>
      
      <div className="space-y-6">
        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-2 text-[#9b5de5]">Service Providers</h3>
          <p className="text-sm text-gray-400">We share data with trusted third-party service providers as necessary to operate our business. For example, we use cloud hosting providers to store data, email/SMS services to send verification codes or notifications, payment processors (like Stripe) to handle billing, and analytics providers to help us understand usage. These providers only receive the information needed to perform their specific services on our behalf and are contractually obligated to protect it.</p>
        </section>

        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-2 text-[#9b5de5]">Business Transfers</h3>
          <p className="text-sm text-gray-400">If NexusRBX is involved in a merger, acquisition, bankruptcy or asset sale, your information may be transferred to a successor or affiliate as part of that transaction. In such cases, we will ensure the new owner honors the commitments we’ve made in this Privacy Policy.</p>
        </section>

        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-2 text-[#9b5de5]">Legal Requirements</h3>
          <p className="text-sm text-gray-400">We may disclose your information if required to do so by law or in response to valid legal requests (e.g. subpoenas, court orders), or when we believe in good faith that disclosure is necessary to protect our rights, investigate fraud, or ensure the safety of our users or others.</p>
        </section>

        <section className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-2 text-[#9b5de5]">With Your Consent</h3>
          <p className="text-sm text-gray-400">We will share your personal information with third parties in any other situation where you provide explicit consent. For instance, if you integrate a third-party tool with NexusRBX or request us to share data with another platform, we will do so only with your authorization.</p>
        </section>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-bold text-white">Anonymous or Aggregate Data</h3>
        <p className="text-gray-400">We may share aggregated information or de-identified data that cannot reasonably be used to identify you. For example, publishing trends or statistics about script usage in a way that does not reveal personal details.</p>
        
        <h3 className="text-xl font-bold text-white">Third-Party Links</h3>
        <p className="text-gray-400">The Service may include links to third-party websites or services (for example, a link to an external documentation site or community forum). If you click those links, you will be directed to sites we do not control. This Privacy Policy does not apply to third-party sites or services. We recommend reviewing the privacy policies of any third-party website or service you visit. We are not responsible for the content or privacy practices of other companies.</p>
      </div>
    </div>
  );
}

function CookiesContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Cookies and Tracking Technologies</h1>
      <p className="text-gray-300 mb-6">Cookies are small text files placed on your device to store information. NexusRBX uses cookies and similar technologies for several reasons:</p>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <h4 className="font-bold text-[#9b5de5]">Essential Cookies</h4>
          <p className="text-sm text-gray-400">These are necessary for the Service to function. For example, they keep you logged in and protect against fraudulent use of your account. You cannot opt-out of essential cookies as the Service cannot run properly without them.</p>
        </div>
        <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <h4 className="font-bold text-[#9b5de5]">Preference Cookies</h4>
          <p className="text-sm text-gray-400">These remember your settings and preferences, such as theme choices or language, so we can personalize your experience.</p>
        </div>
        <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <h4 className="font-bold text-[#9b5de5]">Analytics Cookies</h4>
          <p className="text-sm text-gray-400">These help us understand how users navigate and use our site, allowing us to improve functionality and user experience. We use tools like Google Analytics (which may set its own cookies) to collect non-identifying usage data in aggregate form.</p>
        </div>
        <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <h4 className="font-bold text-[#9b5de5]">Marketing Cookies</h4>
          <p className="text-sm text-gray-400">(If applicable) We currently do not run third-party ads, but if we ever do, marketing or advertising cookies would be used to track effectiveness of campaigns and limit repetitive ads. Such cookies would only be used with your consent.</p>
        </div>
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4 text-white">Your Choices</h3>
      <p className="text-gray-400">When you first visit NexusRBX, you may be presented with a cookie notice or settings. You have the option to accept or refuse non-essential cookies. You can also manage cookies through your browser settings – for example, you can set your browser to refuse all cookies or to alert you when a cookie is being set. Please note that if you disable certain cookies, some features of our Service (like staying logged in or saving preferences) may not function properly.</p>
    </div>
  );
}

function SecurityContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Data Storage and Security</h1>
      <p className="text-gray-300 mb-6">We take security measures to safeguard your personal information. Data is transmitted over encrypted connections (HTTPS) and stored on secure servers. We implement organizational and technical safeguards such as access controls, encryption of sensitive data at rest, firewalls, and regular security reviews. We also limit employee and contractor access to personal information on a need-to-know basis, and all personnel are bound by confidentiality obligations.</p>
      
      <div className="p-6 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-xl">
        <p className="text-gray-300">Despite our efforts, no method of transmission or storage is 100% secure. Therefore, we cannot guarantee absolute security of your information. You share data with us at your own risk. In the event of a data breach that affects your personal information, we will notify you and the relevant authorities as required by law. We also encourage you to help keep your data safe by using a strong, unique password for NexusRBX and not sharing your account credentials with others.</p>
      </div>
    </div>
  );
}

function RetentionContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Data Retention</h1>
      <p className="text-gray-300 mb-6">We retain personal information only for as long as necessary to fulfill the purposes outlined in this policy or as required by law. The retention period can vary depending on the type of data:</p>
      
      <div className="space-y-4">
        <div className="flex items-start p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <div className="w-32 shrink-0 font-bold text-[#9b5de5]">Account Data</div>
          <div className="text-sm text-gray-400">Information associated with your account (profile info, settings, generated content) is kept for as long as your account is active. If you delete your account or request deletion, we will remove or anonymize your personal data within a reasonable time frame, except where retention is required for legal obligations or legitimate business purposes.</div>
        </div>
        <div className="flex items-start p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <div className="w-32 shrink-0 font-bold text-[#9b5de5]">Usage Logs</div>
          <div className="text-sm text-gray-400">Basic log data (IP addresses, device info, usage logs) is typically retained for a shorter period (e.g. 90 days to 1 year) for security, analysis, and improving the Service. Aggregate data derived from logs (that no longer identifies you) may be kept longer.</div>
        </div>
        <div className="flex items-start p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <div className="w-32 shrink-0 font-bold text-[#9b5de5]">Communications</div>
          <div className="text-sm text-gray-400">Support emails or chat logs may be retained for a period of time to assist you with any further issues and for training/customer service improvements.</div>
        </div>
        <div className="flex items-start p-4 bg-gray-900/40 border border-gray-800 rounded-lg">
          <div className="w-32 shrink-0 font-bold text-[#9b5de5]">Payment Records</div>
          <div className="text-sm text-gray-400">Transaction records are kept as long as needed for accounting and compliance (e.g. tax, financial reporting), typically at least 7 years or as mandated by law. Crucially, remember that full payment details (credit card numbers) are not stored by us directly.</div>
        </div>
      </div>

      <p className="mt-8 text-gray-400">When we no longer need personal information, we will securely delete it or anonymize it so it can no longer be associated with you. If immediate deletion is not possible (for example, because the data is stored in backups), we will securely store it and isolate it from further use until deletion is feasible.</p>
    </div>
  );
}

function RightsContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Your Privacy Rights</h1>
      <p className="text-gray-300 mb-6">Depending on your jurisdiction, you have certain rights regarding your personal information. We are committed to honoring applicable data rights and have processes in place to enable you to exercise them. These rights may include:</p>
      
      <ul className="list-disc list-inside text-gray-400 space-y-4 mb-8">
        <li><strong>Access and Portability:</strong> You can request a copy of the personal data we hold about you, and information about how it’s used. We will provide this in a readily usable format.</li>
        <li><strong>Correction:</strong> If any personal information is inaccurate or incomplete, you have the right to request that we correct or update it. You can also correct most basic profile info through your account settings.</li>
        <li><strong>Deletion:</strong> You may request that we delete your personal data. We will honor deletion requests to the extent we are not required to retain data for legal reasons.</li>
        <li><strong>Objection to Processing:</strong> You can object to certain processing of your data, such as for direct marketing purposes or if you contest our legitimate interest basis.</li>
        <li><strong>Restriction of Processing:</strong> You have the right to ask us to restrict processing your data in certain circumstances.</li>
        <li><strong>Withdraw Consent:</strong> If we rely on your consent to process information, you can withdraw that consent at any time.</li>
      </ul>

      <div className="space-y-8">
        <section className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h3 className="text-xl font-bold mb-4 text-white">California Residents (CCPA/CPRA)</h3>
          <p className="text-sm text-gray-400 mb-4">If you are a resident of California, you have specific rights under the California Consumer Privacy Act (CCPA) as amended by the CPRA:</p>
          <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
            <li>The right to know the categories and specific pieces of personal information we have collected.</li>
            <li>The right to delete personal information we have collected from you.</li>
            <li>The right to opt-out of the “sale” of personal information. (Note: NexusRBX does not sell personal data).</li>
            <li>The right to non-discrimination for exercising your privacy rights.</li>
            <li>The right to limit use and disclosure of sensitive personal information.</li>
          </ul>
        </section>

        <section className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
          <h3 className="text-xl font-bold mb-4 text-white">EU/EEA Residents (GDPR)</h3>
          <p className="text-sm text-gray-400 mb-4">If you are in the European Economic Area (or the UK or other jurisdictions with similar laws), you have the following additional rights under the General Data Protection Regulation (GDPR):</p>
          <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
            <li>The right to lodge a complaint with a supervisory data protection authority.</li>
            <li>The right to data portability in a structured, machine-readable format.</li>
            <li>The right not to be subject to automated decision-making (including profiling).</li>
          </ul>
        </section>
      </div>

      <p className="mt-8 text-gray-400 text-sm italic">To exercise any of these rights, please see the next section on How to Exercise Your Rights. Note that these rights are subject to certain exemptions and limitations by law.</p>
    </div>
  );
}

function ExerciseContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">How to Exercise Your Rights</h1>
      <p className="text-gray-300 mb-6">If you wish to access, correct, or delete your personal information, or exercise any other privacy rights available to you, please contact us at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5]">support@nexusrbx.com</a>. For requests that specifically relate to GDPR or CCPA, you may mention that in your request (e.g. subject line "GDPR Data Request" or "CCPA Request").</p>
      
      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-bold text-white mb-2">Verification</h3>
          <p className="text-gray-400">To protect your privacy, we will take steps to verify your identity before fulfilling your request. For example, we may ask you to send the request from the email address associated with your NexusRBX account or provide other identifying information.</p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2">Process and Timing</h3>
          <p className="text-gray-400">Once a verifiable request is received, we will confirm receipt within 10 days (for CCPA) and aim to respond fully within 30 days. If we need more time (up to a total of 90 days), we will inform you of the reason and extension in writing. Access and portability requests will be fulfilled electronically in a portable format (e.g. a CSV or PDF file).</p>
        </section>

        <section className="p-4 bg-[#9b5de5]/10 border border-[#9b5de5]/30 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">Data Protection Officer (DPO)</h3>
          <p className="text-sm text-gray-300">For GDPR or EU-specific concerns, you may contact our Data Protection Officer at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5]">support@nexusrbx.com</a> (please include “Attn: Data Protection Officer” in the subject).</p>
        </section>
      </div>
    </div>
  );
}

function ChildrenContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Children’s Privacy</h1>
      <p className="text-gray-300 mb-6">NexusRBX is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are under 13, please do not use the Service or provide any information about yourself to us. In the event we learn that we have inadvertently collected personal data from a child under 13, we will take prompt action to delete such data from our records.</p>
      
      <div className="p-6 bg-gray-900/40 border border-gray-800 rounded-xl">
        <p className="text-gray-400">If you are a parent or guardian and you believe that your child under 13 has provided us with personal information without your consent, please contact us immediately at <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5]">support@nexusrbx.com</a>. We will then work with you to investigate and, if verified, delete the child’s information.</p>
      </div>
    </div>
  );
}

function ChangesContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Changes to This Privacy Policy</h1>
      <p className="text-gray-300 mb-6">We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. When we make material changes, we will post the updated Policy on our website and update the “Last updated” date at the top. We may also provide additional notice to you (such as by email or in-app notification) if the changes are significant.</p>
      <p className="text-gray-400 italic">Please review this Privacy Policy periodically to stay informed about how we are protecting your information. Your continued use of the Service after any modifications to this Policy constitutes acceptance of those changes.</p>
    </div>
  );
}

function ContactContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <p className="text-gray-300 mb-8">If you have any questions, concerns, or comments about this Privacy Policy or our data practices, please contact us:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
          <Mail className="h-10 w-10 text-[#9b5de5] mb-4" />
          <h3 className="text-xl font-bold mb-2">Email Support</h3>
          <p className="text-sm text-gray-400 mb-4">For the fastest response, please email our privacy team.</p>
          <a href="mailto:support@nexusrbx.com" className="text-[#9b5de5] font-bold hover:underline">support@nexusrbx.com</a>
        </div>

        <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
          <Globe className="h-10 w-10 text-[#00f5d4] mb-4" />
          <h3 className="text-xl font-bold mb-2">Mailing Address</h3>
          <p className="text-sm text-gray-400 mb-4">NexusRBX Privacy Team<br />PO Box 123, Sydney<br />NSW 2000, Australia</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Official Correspondence Only</p>
        </div>
      </div>
    </div>
  );
}
