import React from 'react';
import { useState } from "react";
import { 
  Home, 
  Mail, 
  MessageSquare, 
  Send, 
  Github, 
  Twitter, 
  BookOpen, 
  FileText, 
  Shield, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Loader, 
  MapPin, 
  Phone, 
  Clock, 
  Users
} from "lucide-react";

// Container Component
export default function NexusRBXContactPageContainer() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general",
    message: ""
  });
  const [formStatus, setFormStatus] = useState({
    status: "idle", // idle, submitting, success, error
    message: ""
  });
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        status: "error",
        message: "Please fill out all required fields."
      });
      return;
    }
    
    // Simulate form submission
    setFormStatus({
      status: "submitting",
      message: "Sending your message..."
    });
    
    // Simulate API call with timeout
    setTimeout(() => {
      setFormStatus({
        status: "success",
        message: "Your message has been sent successfully! We'll get back to you soon."
      });
      
      // Reset form after successful submission
      setFormData({
        name: "",
        email: "",
        subject: "general",
        message: ""
      });
    }, 1500);
  };
  
  // Define all data used by sub-components
  const contactOptions = [
    {
      id: "general",
      title: "General Inquiries",
      email: "info@nexusrbx.com",
      icon: MessageSquare,
      description: "For general questions about NexusRBX and our services."
    },
    {
      id: "support",
      title: "Technical Support",
      email: "support@nexusrbx.com",
      icon: HelpCircle,
      description: "For help with technical issues or questions about using our platform."
    },
    {
      id: "billing",
      title: "Billing & Accounts",
      email: "billing@nexusrbx.com",
      icon: FileText,
      description: "For questions about subscriptions, payments, or account management."
    },
    {
      id: "security",
      title: "Security & Privacy",
      email: "security@nexusrbx.com",
      icon: Shield,
      description: "For reporting security vulnerabilities or privacy concerns."
    },
    {
      id: "business",
      title: "Business Development",
      email: "partnerships@nexusrbx.com",
      icon: Users,
      description: "For partnership opportunities and business inquiries."
    }
  ];
  
  const companyInfo = {
    address: "123 Tech Plaza, Suite 400, San Francisco, CA 94107",
    phone: "+1 (555) 123-4567",
    hours: "Monday - Friday: 9AM - 6PM PST",
    socialLinks: [
      { name: "Twitter", url: "https://twitter.com/nexusrbx", icon: Twitter },
      { name: "GitHub", url: "https://github.com/nexusrbx", icon: Github }
    ]
  };
  
  return (
    <NexusRBXContactPage
      formData={formData}
      formStatus={formStatus}
      contactOptions={contactOptions}
      companyInfo={companyInfo}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
    />
  );
}

// UI Component
function NexusRBXContactPage({
  formData,
  formStatus,
  contactOptions,
  companyInfo,
  handleInputChange,
  handleSubmit
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
            <div className="ml-2 text-sm text-gray-400">Contact</div>
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
            <a href="/terms" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Terms
            </a>
          </nav>
          
          <button className="md:hidden text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Have questions about NexusRBX? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 h-full">
                <h2 className="text-xl font-bold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-[#9b5de5] mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium mb-1">Address</h3>
                      <p className="text-gray-400 text-sm">{companyInfo.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-[#00f5d4] mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium mb-1">Email</h3>
                      <p className="text-gray-400 text-sm">info@nexusrbx.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-[#f15bb5] mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium mb-1">Phone</h3>
                      <p className="text-gray-400 text-sm">{companyInfo.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-[#9b5de5] mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium mb-1">Business Hours</h3>
                      <p className="text-gray-400 text-sm">{companyInfo.hours}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <h3 className="font-medium mb-4">Connect With Us</h3>
                  <div className="flex space-x-4">
                    {companyInfo.socialLinks.map(link => (
                      <a 
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors duration-300"
                        aria-label={link.name}
                      >
                        <link.icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Send Us a Message</h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Name <span className="text-[#f15bb5]">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email <span className="text-[#f15bb5]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                    >
                      {contactOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message <span className="text-[#f15bb5]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="6"
                      className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                      placeholder="How can we help you?"
                      required
                    ></textarea>
                  </div>
                  
                  {formStatus.status !== "idle" && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      formStatus.status === "error" 
                        ? "bg-red-900/20 border border-red-800" 
                        : formStatus.status === "success"
                          ? "bg-green-900/20 border border-green-800"
                          : "bg-gray-800/50 border border-gray-700"
                    }`}>
                      <div className="flex items-center">
                        {formStatus.status === "error" && (
                          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        )}
                        {formStatus.status === "success" && (
                          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                        )}
                        {formStatus.status === "submitting" && (
                          <Loader className="h-5 w-5 text-gray-400 mr-2 animate-spin" />
                        )}
                        <p className={`text-sm ${
                          formStatus.status === "error" 
                            ? "text-red-400" 
                            : formStatus.status === "success"
                              ? "text-green-400"
                              : "text-gray-400"
                        }`}>
                          {formStatus.message}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={formStatus.status === "submitting"}
                    className={`px-6 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center ${
                      formStatus.status === "submitting" ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {formStatus.status === "submitting" ? (
                      <>
                        <Loader className="animate-spin h-5 w-5 mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          {/* Contact Options */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Specialized Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contactOptions.map(option => (
                <div 
                  key={option.id}
                  className="bg-gray-900/20 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center mr-3">
                      <option.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold">{option.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{option.description}</p>
                  <a 
                    href={`mailto:${option.email}`}
                    className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300 flex items-center text-sm font-medium"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {option.email}
                  </a>
                </div>
              ))}
            </div>
          </div>
          
          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-3">What is NexusRBX?</h3>
                <p className="text-gray-400 text-sm">
                  NexusRBX is an AI-driven platform for generating, simulating, and testing Roblox scripts and mods without the need for complex development environments or risking your Roblox account.
                </p>
              </div>
              
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-3">Do I need coding experience to use NexusRBX?</h3>
                <p className="text-gray-400 text-sm">
                  No, you don't need prior coding experience. Our AI can generate scripts based on natural language prompts. However, basic understanding of Roblox concepts will help you get better results.
                </p>
              </div>
              
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-3">Is there a free trial available?</h3>
                <p className="text-gray-400 text-sm">
                  Yes, we offer a free tier with limited features so you can try NexusRBX before subscribing to a paid plan. Check our pricing page for more details on what's included in each plan.
                </p>
              </div>
              
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-3">How secure is NexusRBX?</h3>
                <p className="text-gray-400 text-sm">
                  Security is our priority. All scripts are executed in a secure, sandboxed environment. We implement strong encryption, access controls, and regular security assessments to protect your data.
                </p>
              </div>
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
            <div className="text-sm text-gray-400">Contact Us</div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">Terms</a>
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy</a>
            <a href="/contact" className="text-white transition-colors duration-300">Contact</a>
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