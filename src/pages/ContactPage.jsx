import React from 'react';
import { useState } from "react";
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Github, 
  Twitter, 
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
} from "lib/icons";
import { Button } from "../components/ui";

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
      email: "support@nexusrbx.com",
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
    address: "Sydney, New South Wales, Australia",
    phone: "Contact via Email",
    hours: "Monday - Friday: 9AM - 5PM AEST",
    socialLinks: [
      { name: "Twitter", url: "https://twitter.com/nexusrbx", icon: Twitter },
      { name: "GitHub", url: "https://github.com/TravelTable/nexusairbx", icon: Github }
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
              <div className="nexus-page-card p-6 h-full">
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
                      <p className="text-gray-400 text-sm">support@nexusrbx.com</p>
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
                
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h3 className="font-medium mb-4">Connect With Us</h3>
                  <div className="flex space-x-4">
                    {companyInfo.socialLinks.map(link => (
                      <a 
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nexus-icon-button"
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
              <div className="nexus-page-card p-6">
                <h2 className="text-xl font-bold mb-6">Send Us a Message</h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="name" className="nexus-field-label mb-2">
                        Name <span className="text-[#f15bb5]">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="nexus-input px-4 py-3"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="nexus-field-label mb-2">
                        Email <span className="text-[#f15bb5]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="nexus-input px-4 py-3"
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="subject" className="nexus-field-label mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="nexus-input px-4 py-3"
                    >
                      {contactOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="message" className="nexus-field-label mb-2">
                      Message <span className="text-[#f15bb5]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="6"
                      className="nexus-textarea px-4 py-3"
                      placeholder="How can we help you?"
                      required
                    ></textarea>
                  </div>

                  {formStatus.status !== "idle" && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      formStatus.status === "error"
                        ? "bg-red-500/10 border border-red-500/25"
                        : formStatus.status === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/25"
                          : "bg-white/[0.04] border border-white/10"
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
                  
                  <Button
                    type="submit"
                    disabled={formStatus.status === "submitting"}
                    icon={formStatus.status === "submitting" ? Loader : Send}
                    className={formStatus.status === "submitting" ? "[&>svg]:animate-spin" : ""}
                  >
                    {formStatus.status === "submitting" ? "Sending..." : "Send Message"}
                  </Button>
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
                  className="nexus-page-card p-6 transition-all duration-200 hover:border-white/20"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center mr-3">
                      <option.icon className="h-5 w-5 text-nexus-cyan" />
                    </div>
                    <h3 className="font-bold">{option.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{option.description}</p>
                  <a 
                    href={`mailto:${option.email}`}
                    className="focus-ring rounded-lg text-nexus-cyan hover:text-white transition-colors duration-200 inline-flex items-center text-sm font-semibold"
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
              <div className="nexus-page-card p-6">
                <h3 className="font-bold mb-3">What is NexusRBX?</h3>
                <p className="text-gray-400 text-sm">
                  NexusRBX is an AI-driven platform for generating, simulating, and testing Roblox scripts and mods without the need for complex development environments or risking your Roblox account.
                </p>
              </div>
              
              <div className="nexus-page-card p-6">
                <h3 className="font-bold mb-3">Do I need coding experience to use NexusRBX?</h3>
                <p className="text-gray-400 text-sm">
                  No, you don't need prior coding experience. Our AI can generate scripts based on natural language prompts. However, basic understanding of Roblox concepts will help you get better results.
                </p>
              </div>
              
              <div className="nexus-page-card p-6">
                <h3 className="font-bold mb-3">Is there a free trial available?</h3>
                <p className="text-gray-400 text-sm">
                  Yes, NexusRBX AI access starts with Starter at $2/month. You can create an account anytime, but an active Starter subscription or higher is required to use the AI workspace. See our pricing page for plan details.
                </p>
              </div>
              
              <div className="nexus-page-card p-6">
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
      <footer className="border-t border-white/10 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">
              NexusRBX
            </div>
            <div className="text-sm text-gray-400">Contact Us</div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/terms" className="focus-ring rounded-lg px-2 py-1 text-gray-400 hover:text-white transition-colors duration-200">Terms</a>
            <a href="/privacy" className="focus-ring rounded-lg px-2 py-1 text-gray-400 hover:text-white transition-colors duration-200">Privacy</a>
            <a href="/contact" className="focus-ring rounded-lg px-2 py-1 text-white transition-colors duration-200">Contact</a>
            <a 
              href="https://github.com/TravelTable/nexusairbx" 
              className="focus-ring rounded-lg px-2 py-1 text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 text-center text-gray-500 text-sm">
          © 2026 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
