import { useState } from "react";
import { 
  Home, 
  ChevronRight, 
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
  
  const handleSectionChange = (section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle scroll to show/hide back to top button
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    });
  }
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Define all data used by sub-components
  const sections = [
    { id: "terms", title: "Terms of Service", icon: FileText },
    { id: "privacy", title: "Privacy Policy", icon: Shield },
    { id: "acceptable-use", title: "Acceptable Use", icon: AlertTriangle },
    { id: "licensing", title: "Licensing", icon: Info }
  ];
  
  const lastUpdated = "November 15, 2023";
  
  return (
    <TermsPage
      activeSection={activeSection}
      sections={sections}
      lastUpdated={lastUpdated}
      showBackToTop={showBackToTop}
      searchQuery={searchQuery}
      handleSectionChange={handleSectionChange}
      handleSearchChange={handleSearchChange}
      scrollToTop={scrollToTop}
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
  scrollToTop
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
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
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

// Content Components for each section
function TermsOfServiceContent({ lastUpdated }) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
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
      
      <section className="mb-8" id="service-usage">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">2. Service Usage</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX provides an AI-driven platform for generating, simulating, and testing Roblox scripts and mods. You agree to use the Service only for lawful purposes and in accordance with these Terms.
        </p>
        <p className="text-gray-300 mb-4">
          You agree not to use the Service:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>In any way that violates any applicable national or international law or regulation.</li>
          <li>To generate scripts that violate Roblox's Terms of Service or Community Guidelines.</li>
          <li>To attempt to bypass or circumvent Roblox's security measures or exploit vulnerabilities.</li>
          <li>To generate scripts that could harm users, collect unauthorized data, or disrupt Roblox services.</li>
          <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
          <li>To impersonate or attempt to impersonate NexusRBX, a NexusRBX employee, another user, or any other person or entity.</li>
        </ul>
        <p className="text-gray-300">
          We reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
      </section>
      
      <section className="mb-8" id="intellectual-property">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">3. Intellectual Property</h2>
        <p className="text-gray-300 mb-4">
          The Service and its original content, features, and functionality are and will remain the exclusive property of NexusRBX and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of NexusRBX.
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
      
      <section className="mb-8" id="subscription">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">4. Subscription and Payments</h2>
        <p className="text-gray-300 mb-4">
          Some parts of the Service are offered on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set on a monthly or annual basis, depending on the type of subscription plan you select.
        </p>
        <p className="text-gray-300 mb-4">
          At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or NexusRBX cancels it. You may cancel your Subscription renewal either through your online account management page or by contacting NexusRBX customer support team.
        </p>
        <p className="text-gray-300 mb-4">
          A valid payment method, including credit card, is required to process the payment for your Subscription. You shall provide NexusRBX with accurate and complete billing information including full name, address, state, zip code, telephone number, and valid payment method information. By submitting such payment information, you automatically authorize NexusRBX to charge all Subscription fees incurred through your account to any such payment instruments.
        </p>
        <p className="text-gray-300">
          Should automatic billing fail to occur for any reason, NexusRBX will issue an electronic invoice indicating that you must proceed manually, within a certain deadline date, with the full payment corresponding to the billing period as indicated on the invoice.
        </p>
      </section>
      
      <section className="mb-8" id="free-trial">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">5. Free Trial</h2>
        <p className="text-gray-300 mb-4">
          NexusRBX may, at its sole discretion, offer a Subscription with a free trial for a limited period of time ("Free Trial").
        </p>
        <p className="text-gray-300 mb-4">
          You may be required to enter your billing information in order to sign up for the Free Trial. If you do enter your billing information when signing up for the Free Trial, you will not be charged by NexusRBX until the Free Trial has expired. On the last day of the Free Trial period, unless you cancelled your Subscription, you will be automatically charged the applicable Subscription fees for the type of Subscription you have selected.
        </p>
        <p className="text-gray-300">
          At any time and without notice, NexusRBX reserves the right to (i) modify the terms and conditions of the Free Trial offer, or (ii) cancel such Free Trial offer.
        </p>
      </section>
      
      <section className="mb-8" id="liability">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">6. Limitation of Liability</h2>
        <p className="text-gray-300 mb-4">
          In no event shall NexusRBX, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
        </p>
      </section>
      
      <section className="mb-8" id="disclaimer">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">7. Disclaimer</h2>
        <p className="text-gray-300 mb-4">
          Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
        </p>
        <p className="text-gray-300 mb-4">
          NexusRBX, its subsidiaries, affiliates, and its licensors do not warrant that a) the Service will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your requirements.
        </p>
        <p className="text-gray-300">
          NexusRBX does not guarantee that scripts generated by our AI will work perfectly in all Roblox environments or that they will be free from bugs or errors. Users are responsible for testing and verifying the functionality and safety of any generated scripts before using them in a production environment.
        </p>
      </section>
      
      <section className="mb-8" id="governing-law">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">8. Governing Law</h2>
        <p className="text-gray-300 mb-4">
          These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
        </p>
        <p className="text-gray-300">
          Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.
        </p>
      </section>
      
      <section className="mb-8" id="changes">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">9. Changes</h2>
        <p className="text-gray-300 mb-4">
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
        </p>
        <p className="text-gray-300">
          By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
        </p>
      </section>
      
      <section id="contact-us">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">10. Contact Us</h2>
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
          <a href="#" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Shield className="h-5 w-5 text-[#00f5d4] mr-3" />
            <span>Privacy Policy</span>
          </a>
          <a href="#" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <AlertTriangle className="h-5 w-5 text-[#f15bb5] mr-3" />
            <span>Acceptable Use Policy</span>
          </a>
          <a href="#" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Info className="h-5 w-5 text-[#9b5de5] mr-3" />
            <span>Licensing Policy</span>
          </a>
          <a href="#" className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#9b5de5]/30 hover:bg-gray-800 transition-all duration-300 flex items-center">
            <Mail className="h-5 w-5 text-[#00f5d4] mr-3" />
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function PrivacyPolicyContent({ lastUpdated }) {
  // Privacy Policy content would go here
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          This Privacy Policy describes how NexusRBX ("we", "us", or "our") collects, uses, and discloses your personal information when you use our website and services (the "Service").
        </p>
        <p className="text-gray-300 italic mt-3">
          We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
        </p>
      </div>
      
      {/* Privacy Policy sections would continue here */}
      <p className="text-gray-300">Full privacy policy content would be included here...</p>
    </div>
  );
}

function AcceptableUseContent({ lastUpdated }) {
  // Acceptable Use Policy content would go here
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Acceptable Use Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          This Acceptable Use Policy ("Policy") outlines the acceptable use of NexusRBX's services. This Policy is designed to protect our users, our platform, and the Roblox community from harmful, illegal, or unethical practices.
        </p>
        <p className="text-gray-300 italic mt-3">
          By using NexusRBX, you agree to comply with this Policy. Violation of this Policy may result in suspension or termination of your access to our services.
        </p>
      </div>
      
      {/* Acceptable Use Policy sections would continue here */}
      <p className="text-gray-300">Full acceptable use policy content would be included here...</p>
    </div>
  );
}

function LicensingContent({ lastUpdated }) {
  // Licensing Policy content would go here
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Licensing Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {lastUpdated}</p>
      
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5 mb-8">
        <p className="text-gray-300 italic">
          This Licensing Policy outlines the terms under which you may use scripts and other content generated through NexusRBX's services. It clarifies ownership rights, permitted uses, and restrictions for content created using our platform.
        </p>
      </div>
      
      {/* Licensing Policy sections would continue here */}
      <p className="text-gray-300">Full licensing policy content would be included here...</p>
    </div>
  );
}