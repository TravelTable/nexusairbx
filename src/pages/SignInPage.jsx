import { useState, useEffect } from "react";
import {
  Home,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Github,
  AlertCircle,
  Loader,
  ArrowRight,
  CheckCircle,
  Check
} from "lucide-react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// Container Component
export default function NexusRBXSignInPageContainer() {
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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
        window.location.href = "/";
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
        window.location.href = "/";
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
        window.location.href = "/";
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
  handleLogout
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
            NexusRBX
          </div>
          <nav className="hidden md:flex space-x-6 items-center">
            <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a href="/docs" className="text-gray-300 hover:text-white transition-colors duration-300">Docs</a>
            <a href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300">Contact</a>
            {!user ? (
              <a
                href="/signin"
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Sign In
              </a>
            ) : (
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white transition-colors duration-300 font-sans text-base"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
            )}
          </nav>
          <button className="md:hidden text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Sign In Card */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-800">
              <h1 className="text-2xl font-bold text-center">Sign In to NexusRBX</h1>
              <p className="text-gray-400 text-center mt-2">
                Access your AI-powered Roblox scripting platform
              </p>
            </div>

            {/* Social Sign In Options */}
            <div className="p-6 border-b border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors duration-300"
                >
                  <span className="mr-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                  </span>
                  <span>Google</span>
                </button>

                <button
                  onClick={handleGithubSignIn}
                  disabled={formStatus.status === "submitting"}
                  className="flex items-center justify-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors duration-300"
                >
                  <Github className="h-5 w-5 mr-2" />
                  <span>GitHub</span>
                </button>
              </div>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="px-3 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-800"></div>
              </div>
            </div>

            {/* Email/Password Form */}
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
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="block text-sm font-medium">
                      Password
                    </label>
                    <a href="/forgot-password" className="text-sm text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300">
                      Forgot password?
                    </a>
                  </div>
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
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center mb-4">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      className="sr-only"
                      disabled={formStatus.status === "submitting" || formStatus.status === "success"}
                    />
                    <div
                      className={`w-5 h-5 rounded border ${
                        rememberMe
                          ? "bg-[#9b5de5] border-[#9b5de5]"
                          : "bg-gray-800 border-gray-700"
                      } flex items-center justify-center transition-colors duration-300 cursor-pointer`}
                      onClick={handleRememberMeChange}
                      tabIndex={0}
                      role="checkbox"
                      aria-checked={rememberMe}
                      onKeyDown={e => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleRememberMeChange();
                        }
                      }}
                    >
                      {rememberMe && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                    <label htmlFor="remember-me" className="ml-2 text-sm text-gray-400 cursor-pointer select-none"
                      onClick={e => { e.preventDefault(); handleRememberMeChange(); }}
                    >
                      Remember me for 30 days
                    </label>
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
                      Signing in...
                    </>
                  ) : formStatus.status === "success" ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Success!
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Don't have an account?{" "}
                  <a href="/signup" className="text-[#9b5de5] hover:text-[#00f5d4] transition-colors duration-300">
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Terms Notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            By signing in, you agree to our{" "}
            <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Privacy Policy
            </a>
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