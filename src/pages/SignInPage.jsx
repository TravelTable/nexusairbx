import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Github,
  AlertCircle,
  Loader,
  ArrowRight,
  CheckCircle,
  Check,
  ShieldCheck,
  Layout,
  Code,
  Cpu,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getEntitlements } from "../lib/billing";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";

// Floating Tool Card Component (Matching Homepage)
const FloatingToolCard = ({ tool }) => (
  <motion.div
    initial={{ opacity: 0, x: tool.position.includes('-left') ? -40 : 40 }}
    animate={{ 
      opacity: 1, 
      x: 0,
      y: [0, -15, 0],
    }}
    transition={{ 
      opacity: { duration: 0.6, delay: tool.delay },
      x: { duration: 0.6, delay: tool.delay },
      y: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: tool.delay
      }
    }}
    className={`absolute ${tool.position} hidden xl:flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] backdrop-blur-xl border border-white/10 w-64 z-0 hover:border-[#00f5d4]/40 transition-colors group shadow-2xl pointer-events-none`}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gradient-to-br from-[#9b5de5]/10 to-[#00f5d4]/10 group-hover:from-[#9b5de5]/20 group-hover:to-[#00f5d4]/20 transition-colors">
        <tool.icon className="h-5 w-5 text-[#00f5d4]" />
      </div>
      <h3 className="font-bold text-sm text-white tracking-tight">{tool.title}</h3>
    </div>
    <p className="text-[11px] text-gray-400 leading-relaxed">
      {tool.description}
    </p>
  </motion.div>
);

// Container Component
export default function NexusRBXSignInPageContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formStatus, setFormStatus] = useState({
    status: "idle", // idle, submitting, success, error
    message: ""
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
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

  // Set persistence based on rememberMe
  useEffect(() => {
    if (rememberMe) {
      import("firebase/auth").then(({ browserLocalPersistence, setPersistence }) => {
        setPersistence(auth, browserLocalPersistence);
      });
    } else {
      import("firebase/auth").then(({ browserSessionPersistence, setPersistence }) => {
        setPersistence(auth, browserSessionPersistence);
      });
    }
  }, [rememberMe]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleRememberMeChange = () => {
    setRememberMe(prev => !prev);
  };

  const handleAgreeToTermsChange = () => {
    setAgreeToTerms(prev => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.email || !formData.password) {
      setFormStatus({
        status: "error",
        message: "Please fill out all required fields."
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
      message: "Signing in..."
    });

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setFormStatus({
        status: "success",
        message: "Sign in successful! Redirecting..."
      });
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to Google..."
    });

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setFormStatus({
        status: "success",
        message: "Google sign in successful! Redirecting..."
      });
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  const handleGithubSignIn = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to GitHub..."
    });

    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      setFormStatus({
        status: "success",
        message: "GitHub sign in successful! Redirecting..."
      });
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: error.message
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    window.location.reload();
  };

  return (
    <NexusRBXSignInPage
      formData={formData}
      showPassword={showPassword}
      formStatus={formStatus}
      rememberMe={rememberMe}
      agreeToTerms={agreeToTerms}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      handleRememberMeChange={handleRememberMeChange}
      handleAgreeToTermsChange={handleAgreeToTermsChange}
      handleSubmit={handleSubmit}
      handleGoogleSignIn={handleGoogleSignIn}
      handleGithubSignIn={handleGithubSignIn}
      user={user}
      handleLogout={handleLogout}
      navigate={navigate}
      tokenInfo={tokenInfo}
      tokenLoading={tokenLoading}
    />
  );
}

// UI Component
function NexusRBXSignInPage({
  formData,
  showPassword,
  formStatus,
  rememberMe,
  agreeToTerms,
  handleInputChange,
  togglePasswordVisibility,
  handleRememberMeChange,
  handleAgreeToTermsChange,
  handleSubmit,
  handleGoogleSignIn,
  handleGithubSignIn,
  user,
  handleLogout,
  navigate,
  tokenInfo,
  tokenLoading
}) {
  const containerRef = useRef(null);

  const advertisedTools = [
    {
      id: 1,
      title: "Pro-Grade UI Engine",
      description: "Generates production-ready hierarchies using UIAspectRatioConstraints and CanvasGroups.",
      icon: Layout,
      position: "top-[15%] left-[5%]",
      delay: 0.2,
    },
    {
      id: 2,
      title: "Deep Luau Integration",
      description: "Implements Strict Type Checking and the modern Task library. Built-in support for Signal patterns.",
      icon: Code,
      position: "top-[25%] right-[5%]",
      delay: 0.4,
    },
    {
      id: 3,
      title: "Nexus-5 Neural Core",
      description: "Powered by GPT-5.2, fine-tuned for Parallel Luau and Actor patterns. Mastery of complex CFrame math.",
      icon: Cpu,
      position: "bottom-[25%] left-[8%]",
      delay: 0.6,
    },
    {
      id: 4,
      title: "Studio-Ready Workflow",
      description: "Instant JSON manifest extraction for Rojo or direct Luau injection. Handles AssetId mapping.",
      icon: Download,
      position: "bottom-[15%] right-[8%]",
      delay: 0.8,
    },
  ];

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

      <main className="flex-grow flex items-center justify-center p-4 relative z-10 overflow-visible">
        {/* Floating Advertisement Boxes */}
        {advertisedTools.map((tool) => (
          <FloatingToolCard key={tool.id} tool={tool} />
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Sign In Card */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Card Header */}
            <div className="p-8 border-b border-white/5 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#9b5de5]/20 to-[#00f5d4]/20 mb-4">
                <ShieldCheck className="h-8 w-8 text-[#00f5d4]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">Welcome Back</h1>
              <p className="text-gray-500 text-sm mt-2">
                Access your AI-powered Roblox workspace
              </p>
            </div>

            {/* Social Sign In Options */}
            <div className="p-8 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 group"
                >
                  <span className="mr-2 flex items-center transition-transform group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                  </span>
                  <span className="text-sm font-bold">Google</span>
                </button>

                <button
                  onClick={handleGithubSignIn}
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

            {/* Email/Password Form */}
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
                      disabled={formStatus.status === "submitting"}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label htmlFor="password" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Password
                    </label>
                    <a href="/forgot-password" className="text-[10px] font-black text-[#9b5de5] hover:text-[#00f5d4] uppercase tracking-widest transition-colors">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                      className="w-full pl-12 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/20 focus:border-[#9b5de5] transition-all duration-300 text-sm"
                      placeholder="••••••••"
                      disabled={formStatus.status === "submitting"}
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
                </div>

                {/* Remember & Terms */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 cursor-pointer group" onClick={handleRememberMeChange}>
                    <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-[#9b5de5] border-[#9b5de5] shadow-lg shadow-[#9b5de5]/20' : 'bg-black/40 border-white/10 group-hover:border-white/20'}`}>
                      {rememberMe && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                    </div>
                    <span className="text-xs text-gray-500 font-medium select-none">Remember me for 30 days</span>
                  </div>

                  <div className="flex items-start gap-3 cursor-pointer group" onClick={handleAgreeToTermsChange}>
                    <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 mt-0.5 ${agreeToTerms ? 'bg-[#9b5de5] border-[#9b5de5] shadow-lg shadow-[#9b5de5]/20' : 'bg-black/40 border-white/10 group-hover:border-white/20'}`}>
                      {agreeToTerms && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                    </div>
                    <span className="text-xs text-gray-500 font-medium select-none leading-relaxed">
                      I agree to the <a href="/terms" className="text-white hover:underline">Terms</a> and <a href="/privacy" className="text-white hover:underline">Privacy Policy</a>
                    </span>
                  </div>
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
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                      Signing in...
                    </>
                  ) : formStatus.status === "success" ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Welcome!
                    </>
                  ) : (
                    <>
                      Sign In to Workspace
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  New to NexusRBX?{" "}
                  <button 
                    onClick={() => navigate("/signup")}
                    className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors ml-1"
                  >
                    Create Account
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
