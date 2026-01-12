import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
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
  Zap,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";

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
  const navigate = useNavigate();
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
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch token info when user logs in
  useEffect(() => {
    if (!user) {
      setTokenInfo(null);
      return;
    }
    setTokenLoading(true);
    getEntitlements()
      .then((data) => {
        setTokenInfo(data);
      })
      .catch(() => {
        setTokenInfo(null);
      })
      .finally(() => setTokenLoading(false));
  }, [user]);

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
      user={user}
      tokenInfo={tokenInfo}
      tokenLoading={tokenLoading}
      navigate={navigate}
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
  handleGithubSignUp,
  user,
  tokenInfo,
  tokenLoading,
  navigate
}) {
  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Side Decorations */}
      <div className="fixed inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-[#9b5de5]/20 to-transparent z-20" />
      <div className="fixed inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-[#00f5d4]/20 to-transparent z-20" />
      
      <div className="fixed inset-y-0 left-4 w-px bg-white/5 z-0 hidden lg:block" />
      <div className="fixed inset-y-0 right-4 w-px bg-white/5 z-0 hidden lg:block" />

      {/* Background Blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#9b5de5]/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#00f5d4]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <NexusRBXHeader
        navigate={navigate}
        user={user}
        handleLogin={() => navigate("/signin")}
        tokenInfo={tokenInfo}
        tokenLoading={tokenLoading}
      />

      <main className="flex-grow flex items-center justify-center p-4 py-12 relative z-10 mt-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* Sign Up Card */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Card Header */}
            <div className="p-8 border-b border-white/5 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#9b5de5]/20 to-[#00f5d4]/20 mb-4">
                <Sparkles className="h-8 w-8 text-[#00f5d4]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">Create Account</h1>
              <p className="text-gray-500 text-sm mt-2">
                Join the AI-powered Roblox scripting revolution
              </p>
            </div>
            
            {/* Social Sign Up Options */}
            <div className="p-8 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGoogleSignUp}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 group"
                >
                  <GoogleIcon className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-bold">Google</span>
                </button>
                
                <button
                  onClick={handleGithubSignUp}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 group"
                >
                  <Github className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-bold">GitHub</span>
                </button>
              </div>
              
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="px-4 text-gray-600 text-[10px] font-black uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>
            </div>
            
            {/* Registration Form */}
            <div className="p-8 pt-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Status Message */}
                <AnimatePresence mode="wait">
                  {formStatus.status !== "idle" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        formStatus.status === "error" 
                          ? "bg-red-500/10 border border-red-500/20" 
                          : formStatus.status === "success"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-white/5 border border-white/10"
                      }`}
                    >
                      {formStatus.status === "error" && <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
                      {formStatus.status === "success" && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                      {formStatus.status === "submitting" && <Loader className="h-5 w-5 text-[#9b5de5] animate-spin shrink-0" />}
                      <p className={`text-xs font-medium ${
                        formStatus.status === "error" ? "text-red-400" : formStatus.status === "success" ? "text-green-400" : "text-gray-400"
                      }`}>
                        {formStatus.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        autoComplete="name"
                        className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/20 focus:border-[#9b5de5] transition-all duration-300 text-sm"
                        placeholder="John Doe"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        autoComplete="email"
                        className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/20 focus:border-[#9b5de5] transition-all duration-300 text-sm"
                        placeholder="your.email@example.com"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        className="w-full pl-12 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/20 focus:border-[#9b5de5] transition-all duration-300 text-sm"
                        placeholder="••••••••"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                        required
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="mt-2 px-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex space-x-1">
                            {[...Array(4)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`h-1 w-6 rounded-full transition-all duration-500 ${
                                  i < passwordStrength.score 
                                    ? passwordStrength.score <= 1
                                      ? "bg-red-500"
                                      : passwordStrength.score === 2
                                        ? "bg-yellow-500"
                                        : passwordStrength.score === 3
                                          ? "bg-green-500"
                                          : "bg-[#00f5d4]"
                                    : "bg-white/5"
                                }`}
                              ></div>
                            ))}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
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
                      </div>
                    )}
                  </div>
                  
                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        className={`w-full pl-12 pr-12 py-3.5 bg-black/40 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                          formData.confirmPassword && formData.password !== formData.confirmPassword
                            ? "border-red-600 focus:ring-red-600/20 focus:border-red-600"
                            : "border-white/10 focus:ring-[#9b5de5]/20 focus:border-[#9b5de5]"
                        }`}
                        placeholder="••••••••"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                        required
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="mt-1 text-[10px] font-bold text-red-400 ml-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
                
                {/* Plan Selection */}
                <div className="pt-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">
                    Choose Your Plan
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PlanCard 
                      title="Free" 
                      price="$0" 
                      desc="5 generations/day" 
                      icon={Info} 
                      selected={selectedPlan === "free"} 
                      onClick={() => handlePlanSelect("free")} 
                    />
                    <PlanCard 
                      title="Pro" 
                      price="$14.99" 
                      desc="Unlimited generations" 
                      icon={Zap} 
                      popular 
                      selected={selectedPlan === "pro"} 
                      onClick={() => handlePlanSelect("pro")} 
                    />
                    <PlanCard 
                      title="Team" 
                      price="$39.99" 
                      desc="5 team members" 
                      icon={Shield} 
                      selected={selectedPlan === "team"} 
                      onClick={() => handlePlanSelect("team")} 
                    />
                  </div>
                </div>
                
                {/* Terms Agreement Checkbox */}
                <div className="flex items-start gap-3 cursor-pointer group pt-2" onClick={handleAgreeToTermsChange}>
                  <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 mt-0.5 ${agreeToTerms ? 'bg-[#9b5de5] border-[#9b5de5] shadow-lg shadow-[#9b5de5]/20' : 'bg-black/40 border-white/10 group-hover:border-white/20'}`}>
                    {agreeToTerms && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                  </div>
                  <span className="text-xs text-gray-500 font-medium select-none leading-relaxed">
                    I agree to the <a href="/terms" className="text-white hover:underline">Terms</a> and <a href="/privacy" className="text-white hover:underline">Privacy Policy</a>
                  </span>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                  className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all duration-300 ${
                    formStatus.status === "submitting" || formStatus.status === "success"
                      ? "bg-white/5 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:scale-[1.02] active:scale-[0.98] shadow-[#9b5de5]/20"
                  }`}
                >
                  {formStatus.status === "submitting" ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      Creating account...
                    </>
                  ) : formStatus.status === "success" ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Account created!
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
              
              {/* Sign In Link */}
              <div className="mt-8 text-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Already have an account?{" "}
                  <button 
                    onClick={() => navigate("/signin")}
                    className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors ml-1"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <NexusRBXFooter />
    </div>
  );
}

function PlanCard({ title, price, desc, icon: Icon, popular, selected, onClick }) {
  return (
    <div 
      className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-300 group ${
        selected
          ? "bg-[#9b5de5]/10 border-[#9b5de5] shadow-lg shadow-[#9b5de5]/10"
          : "bg-black/40 border-white/10 hover:border-white/20"
      }`}
      onClick={onClick}
    >
      {popular && (
        <div className="absolute -right-1 -top-1 bg-gradient-to-r from-[#9b5de5] to-[#f15bb5] text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
          Popular
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className={`p-1.5 rounded-lg ${selected ? 'bg-[#9b5de5]/20 text-[#9b5de5]' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {selected && <Check className="h-3.5 w-3.5 text-[#9b5de5] stroke-[3px]" />}
      </div>
      <h3 className={`text-xs font-black uppercase tracking-widest mb-1 ${selected ? 'text-white' : 'text-gray-400'}`}>{title}</h3>
      <p className="text-lg font-black text-white mb-1">{price}</p>
      <p className="text-[10px] text-gray-500 font-medium leading-tight">{desc}</p>
    </div>
  );
}
