import { useState } from "react";
import { 
  Home, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Github, 
  AlertCircle, 
  Loader, 
  ArrowRight, 
  CheckCircle, 
  Check,
  Info,
  Shield,
  Zap
} from "lucide-react";
import { auth } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup 
} from "firebase/auth";

// Inline SVG for Google Icon
function GoogleIcon({ className = "", ...props }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <g>
        <path
          d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.5a4.7 4.7 0 01-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.43z"
          fill="#4285F4"
        />
        <path
          d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.3-2.56c-.92.62-2.1.99-3.33.99-2.56 0-4.73-1.73-5.5-4.06H1.09v2.6A9.99 9.99 0 0010 20z"
          fill="#34A853"
        />
        <path
          d="M4.5 11.93A5.99 5.99 0 014.13 10c0-.67.12-1.33.37-1.93V5.47H1.09A9.99 9.99 0 000 10c0 1.64.39 3.19 1.09 4.53l3.41-2.6z"
          fill="#FBBC05"
        />
        <path
          d="M10 4.01c1.47 0 2.78.51 3.81 1.51l2.85-2.85C14.97 1.09 12.7 0 10 0A9.99 9.99 0 001.09 5.47l3.41 2.6C5.27 5.74 7.44 4.01 10 4.01z"
          fill="#EA4335"
        />
      </g>
    </svg>
  );
}

// Container Component
export default function NexusRBXSignUpPageContainer() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formStatus, setFormStatus] = useState({
    status: "idle", // idle, submitting, success, error
    message: ""
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0-4 where 4 is strongest
    feedback: ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength when password changes
    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    let feedback = "";

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score === 0) {
      feedback = "Very weak password";
    } else if (score === 1) {
      feedback = "Weak password";
    } else if (score === 2) {
      feedback = "Fair password";
    } else if (score === 3) {
      feedback = "Good password";
    } else {
      feedback = "Strong password";
    }

    setPasswordStrength({ score, feedback });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const handleAgreeToTermsChange = () => {
    setAgreeToTerms(prev => !prev);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setFormStatus({
        status: "error",
        message: "Please fill out all required fields."
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormStatus({
        status: "error",
        message: "Passwords do not match."
      });
      return;
    }

    if (!agreeToTerms) {
      setFormStatus({
        status: "error",
        message: "You must agree to the Terms of Service and Privacy Policy."
      });
      return;
    }

    setFormStatus({
      status: "submitting",
      message: "Creating your account..."
    });

    try {
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      setFormStatus({
        status: "success",
        message: "Account created successfully! Redirecting to homepage..."
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  const handleGoogleSignUp = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to Google..."
    });

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setFormStatus({
        status: "success",
        message: "Google sign up successful! Redirecting..."
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  const handleGithubSignUp = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to GitHub..."
    });

    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      setFormStatus({
        status: "success",
        message: "GitHub sign up successful! Redirecting..."
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  return (
    <NexusRBXSignUpPage
      formData={formData}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
      formStatus={formStatus}
      agreeToTerms={agreeToTerms}
      selectedPlan={selectedPlan}
      passwordStrength={passwordStrength}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
      handleAgreeToTermsChange={handleAgreeToTermsChange}
      handlePlanSelect={handlePlanSelect}
      handleSubmit={handleSubmit}
      handleGoogleSignUp={handleGoogleSignUp}
      handleGithubSignUp={handleGithubSignUp}
    />
  );
}

// UI Component
function NexusRBXSignUpPage({
  formData,
  showPassword,
  showConfirmPassword,
  formStatus,
  agreeToTerms,
  selectedPlan,
  passwordStrength,
  handleInputChange,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  handleAgreeToTermsChange,
  handlePlanSelect,
  handleSubmit,
  handleGoogleSignUp,
  handleGithubSignUp
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
            NexusRBX
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a href="/docs" className="text-gray-300 hover:text-white transition-colors duration-300">Docs</a>
            <a href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300">Contact</a>
          </nav>
          
          <button className="md:hidden text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Sign Up Card */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-800">
              <h1 className="text-2xl font-bold text-center">Create Your NexusRBX Account</h1>
              <p className="text-gray-400 text-center mt-2">
                Join the AI-powered Roblox scripting revolution
              </p>
            </div>
            
            {/* Social Sign Up Options */}
            <div className="p-6 border-b border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGoogleSignUp}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors duration-300"
                >
                  <GoogleIcon className="h-5 w-5 mr-2" />
                  <span>Sign up with Google</span>
                </button>
                
                <button
                  onClick={handleGithubSignUp}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors duration-300"
                >
                  <Github className="h-5 w-5 mr-2" />
                  <span>Sign up with GitHub</span>
                </button>
              </div>
              
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="px-3 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-800"></div>
              </div>
            </div>
            
            {/* Registration Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                {/* Status Message */}
                {formStatus.status !== "idle" && (
                  <div className={`mb-6 p-3 rounded-lg flex items-center ${
                    formStatus.status === "error" 
                      ? "bg-red-900/20 border border-red-800" 
                      : formStatus.status === "success"
                        ? "bg-green-900/20 border border-green-800"
                        : "bg-gray-800/50 border border-gray-700"
                  }`}>
                    {formStatus.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    )}
                    {formStatus.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                    )}
                    {formStatus.status === "submitting" && (
                      <Loader className="h-5 w-5 text-gray-400 mr-2 animate-spin flex-shrink-0" />
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
                )}
                
                {/* Name Field */}
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                      placeholder="John Doe"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      required
                    />
                  </div>
                </div>
                
                {/* Email Field */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                      placeholder="your.email@example.com"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      required
                    />
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/60 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5] transition-all duration-300"
                      placeholder="••••••••"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-300"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex space-x-1">
                          {[...Array(4)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-1 w-6 rounded-full ${
                                i < passwordStrength.score 
                                  ? passwordStrength.score <= 1
                                    ? "bg-red-500"
                                    : passwordStrength.score === 2
                                      ? "bg-yellow-500"
                                      : passwordStrength.score === 3
                                        ? "bg-green-500"
                                        : "bg-[#00f5d4]"
                                  : "bg-gray-700"
                              }`}
                            ></div>
                          ))}
                        </div>
                        <span className={`text-xs ${
                          passwordStrength.score <= 1
                            ? "text-red-400"
                            : passwordStrength.score === 2
                              ? "text-yellow-400"
                              : passwordStrength.score === 3
                                ? "text-green-400"
                                : "text-[#00f5d4]"
                        }`}>
                          {passwordStrength.feedback}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Use 8+ characters with a mix of letters, numbers & symbols
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Confirm Password Field */}
                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-12 py-3 bg-gray-800/60 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? "border-red-600 focus:ring-red-600/50 focus:border-red-600"
                          : "border-gray-700 focus:ring-[#9b5de5]/50 focus:border-[#9b5de5]"
                      }`}
                      placeholder="••••••••"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-300"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>
                
                {/* Plan Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">
                    Choose Your Plan
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                        selectedPlan === "free"
                          ? "bg-[#9b5de5]/10 border-[#9b5de5]"
                          : "bg-gray-800/60 border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => handlePlanSelect("free")}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedPlan === "free"}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handlePlanSelect("free"); }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Free</h3>
                        {selectedPlan === "free" && (
                          <Check className="h-4 w-4 text-[#9b5de5]" />
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">$0</p>
                      <p className="text-xs text-gray-400 mb-2">5 generations/day</p>
                      <div className="flex items-center text-xs text-gray-400">
                        <Info className="h-3 w-3 mr-1" />
                        Basic features
                      </div>
                    </div>
                    
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                        selectedPlan === "pro"
                          ? "bg-[#9b5de5]/10 border-[#9b5de5]"
                          : "bg-gray-800/60 border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => handlePlanSelect("pro")}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedPlan === "pro"}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handlePlanSelect("pro"); }}
                    >
                      <div className="absolute -right-8 -top-8 bg-[#9b5de5] rotate-45 text-xs text-white py-10 px-8">
                        Popular
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Pro</h3>
                        {selectedPlan === "pro" && (
                          <Check className="h-4 w-4 text-[#9b5de5]" />
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">$14.99</p>
                      <p className="text-xs text-gray-400 mb-2">Unlimited generations</p>
                      <div className="flex items-center text-xs text-gray-400">
                        <Zap className="h-3 w-3 mr-1" />
                        Advanced features
                      </div>
                    </div>
                    
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                        selectedPlan === "team"
                          ? "bg-[#9b5de5]/10 border-[#9b5de5]"
                          : "bg-gray-800/60 border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => handlePlanSelect("team")}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedPlan === "team"}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handlePlanSelect("team"); }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Team</h3>
                        {selectedPlan === "team" && (
                          <Check className="h-4 w-4 text-[#9b5de5]" />
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">$39.99</p>
                      <p className="text-xs text-gray-400 mb-2">5 team members</p>
                      <div className="flex items-center text-xs text-gray-400">
                        <Shield className="h-3 w-3 mr-1" />
                        Team collaboration
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Terms Agreement Checkbox */}
                <div className="flex items-start mb-6">
                  <div
                    className="flex items-center h-5 mt-1 cursor-pointer select-none"
                    onClick={handleAgreeToTermsChange}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={agreeToTerms}
                    onKeyDown={e => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleAgreeToTermsChange();
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={handleAgreeToTermsChange}
                      className="sr-only"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      tabIndex={-1}
                    />
                    <div 
                      className={`w-5 h-5 rounded border ${
                        agreeToTerms 
                          ? "bg-[#9b5de5] border-[#9b5de5]" 
                          : "bg-gray-800 border-gray-700"
                      } flex items-center justify-center transition-colors duration-300`}
                    >
                      {agreeToTerms && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <label
                    htmlFor="terms"
                    className="ml-3 text-sm text-gray-400 cursor-pointer select-none"
                    onClick={e => { e.preventDefault(); handleAgreeToTermsChange(); }}
                  >
                    I agree to the{" "}
                    <a href="/terms" className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
                    formStatus.status === "submitting" || formStatus.status === "success"
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px]"
                  } transition-all duration-300`}
                >
                  {formStatus.status === "submitting" ? (
                    <>
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                      Creating account...
                    </>
                  ) : formStatus.status === "success" ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Account created!
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
              
              {/* Sign In Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <a href="/signin" className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 px-4 bg-black/40 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto">
          &copy; 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}