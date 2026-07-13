import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Github, Mail, Sparkles, User } from "lib/icons";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import {
  applyAuthPersistence,
  getFriendlyAuthErrorMessage,
  readAuthPersistencePreference,
  signInWithOAuthProvider,
  writeAuthPersistencePreference,
} from "../lib/firebaseAuth";
import { trackProductEvent } from "../lib/productAnalytics";
import { getPendingAuthReturnPath, readPendingAuthAction } from "../lib/pendingAuthAction";
import { cn } from "../lib/utils";
import {
  AuthCheckbox,
  AuthDivider,
  AuthInlineLinkButton,
  AuthPasswordField,
  AuthProviderButton,
  AuthStatusAlert,
  AuthSubmitButton,
  AuthTextField,
  GoogleIcon,
  NexusAuthShell,
} from "../components/auth/NexusAuthShell";

// Container Component
export default function NexusRBXSignUpPageContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/ai";
  const pendingAction = useMemo(() => readPendingAuthAction({ includeExpired: true }), []);
  const authReturnPath = pendingAction ? getPendingAuthReturnPath("/ai") : from;
  const signInLinkState = { from: { pathname: authReturnPath || "/ai" } };
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
  const [rememberMe, setRememberMe] = useState(() => readAuthPersistencePreference());
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0-4 where 4 is strongest
    feedback: ""
  });

  const redirectAfterSignup = async (user = auth.currentUser) => {
    if (!user?.emailVerified) {
      navigate("/verify-email", {
        replace: true,
        state: { returnPath: authReturnPath || "/ai" },
      });
      return;
    }
    navigate(authReturnPath || "/ai", { replace: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || formStatus.status === "submitting") return;
      if (!currentUser.emailVerified) {
        navigate("/verify-email", {
          replace: true,
          state: { returnPath: authReturnPath || "/ai" },
        });
        return;
      }
      if (pendingAction) navigate(authReturnPath || "/ai", { replace: true });
    });
    return () => unsubscribe();
  }, [authReturnPath, formStatus.status, navigate, pendingAction]);

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

  const handleSharedDeviceChange = () => {
    setRememberMe((prev) => {
      const nextRememberMe = !prev;
      writeAuthPersistencePreference(nextRememberMe);
      return nextRememberMe;
    });
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
    void trackProductEvent("signup_started", {
      landing_page: from,
      method: "password",
      entry_offer: "free_workspace",
    }, { dedupeKey: `signup_started:password:${from}` });

    try {
      await applyAuthPersistence(auth, rememberMe);
      writeAuthPersistencePreference(rememberMe);
      const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await credential.user.getIdToken();
      await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: "Account created. Check your inbox to verify your email before continuing."
      });
      void trackProductEvent("signup_completed", {
        landing_page: from,
        method: "password",
        entry_offer: "free_workspace",
      }, { dedupeKey: `signup_completed:${credential.user.uid}` });
      setTimeout(() => {
        void redirectAfterSignup(credential.user);
      }, 800);
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
    void trackProductEvent("signup_started", {
      landing_page: from,
      method: "google",
      entry_offer: "free_workspace",
    }, { dedupeKey: `signup_started:google:${from}` });

    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GoogleAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/ai",
        method: "google",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? "Google sign up successful! Opening your workspace..."
          : "Account created. Check your inbox to verify your email before continuing."
      });
      void trackProductEvent("signup_completed", {
        landing_page: from,
        method: "google",
        entry_offer: "free_workspace",
      }, { dedupeKey: `signup_completed:${credential.user.uid}` });
      setTimeout(() => {
        void redirectAfterSignup(credential.user);
      }, 800);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
      });
    }
  };

  const handleGithubSignUp = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to GitHub..."
    });
    void trackProductEvent("signup_started", {
      landing_page: from,
      method: "github",
      entry_offer: "free_workspace",
    }, { dedupeKey: `signup_started:github:${from}` });

    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GithubAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/ai",
        method: "github",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? "GitHub sign up successful! Opening your workspace..."
          : "Account created. Check your inbox to verify your email before continuing."
      });
      void trackProductEvent("signup_completed", {
        landing_page: from,
        method: "github",
        entry_offer: "free_workspace",
      }, { dedupeKey: `signup_completed:${credential.user.uid}` });
      setTimeout(() => {
        void redirectAfterSignup(credential.user);
      }, 800);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
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
      rememberMe={rememberMe}
      passwordStrength={passwordStrength}
      signInLinkState={signInLinkState}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
      handleAgreeToTermsChange={handleAgreeToTermsChange}
      handleSharedDeviceChange={handleSharedDeviceChange}
      handleSubmit={handleSubmit}
      handleGoogleSignUp={handleGoogleSignUp}
      handleGithubSignUp={handleGithubSignUp}
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
  rememberMe,
  passwordStrength,
  signInLinkState,
  handleInputChange,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  handleAgreeToTermsChange,
  handleSharedDeviceChange,
  handleSubmit,
  handleGoogleSignUp,
  handleGithubSignUp,
  navigate
}) {
  const isLocked = formStatus.status === "submitting" || formStatus.status === "success";
  const passwordsMismatch = Boolean(formData.confirmPassword && formData.password !== formData.confirmPassword);
  const passwordTone = getPasswordStrengthTone(passwordStrength.score);

  return (
    <NexusAuthShell
      title="Create your NexusRBX account"
      description="Create a free account to use Agent Build and keep your Roblox projects moving."
      icon={Sparkles}
      sideTitle="Set up your AI Roblox workspace."
      sideDescription="Create an account once, then continue straight into the AI workspace with your homepage prompt and progress preserved."
      sideItems={[
        {
          title: "Provider or password signup",
          description: "Use Google, GitHub, or email while keeping the same NexusRBX auth return flow.",
        },
        {
          title: "Start free with Agent Build",
          description: "Plan, debug, ask questions, and generate projects before deciding whether you need more capacity.",
        },
        {
          title: "Continue after auth",
          description: "Your pending prompt returns with you so signup does not break the creative flow.",
        },
      ]}
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthProviderButton icon={GoogleIcon} onClick={handleGoogleSignUp} disabled={isLocked}>
            Google
          </AuthProviderButton>
          <AuthProviderButton icon={Github} onClick={handleGithubSignUp} disabled={isLocked}>
            GitHub
          </AuthProviderButton>
        </div>

        <AuthDivider />

        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <AuthStatusAlert status={formStatus.status} message={formStatus.message} />

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthTextField
              id="name"
              name="name"
              label="Name"
              value={formData.name}
              onChange={handleInputChange}
              autoComplete="name"
              placeholder="Your name"
              icon={User}
              disabled={isLocked}
              required
            />
            <AuthTextField
              id="email"
              name="email"
              label="Email address"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              autoComplete="email"
              placeholder="creator@example.com"
              icon={Mail}
              disabled={isLocked}
              required
            />
          </div>

          <div className="grid gap-3">
            <AuthPasswordField
              id="password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="new-password"
              placeholder="Create a password"
              disabled={isLocked}
              required
              shown={showPassword}
              onToggle={togglePasswordVisibility}
              describedBy={formData.password ? "password-strength" : undefined}
            />
            {formData.password && (
              <div id="password-strength" className="grid gap-2 px-1">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-1.5 flex-1 rounded-full bg-muted transition-colors",
                        index < passwordStrength.score && passwordTone.bar
                      )}
                    />
                  ))}
                </div>
                <p className={cn("text-xs font-medium", passwordTone.text)}>
                  {passwordStrength.feedback}
                </p>
              </div>
            )}
          </div>

          <div>
            <AuthPasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              autoComplete="new-password"
              placeholder="Confirm your password"
              disabled={isLocked}
              required
              shown={showConfirmPassword}
              onToggle={toggleConfirmPasswordVisibility}
              invalid={passwordsMismatch}
              describedBy={passwordsMismatch ? "confirm-password-error" : undefined}
            />
            {passwordsMismatch && (
              <p id="confirm-password-error" className="mt-2 text-xs font-medium text-red-300">
                Passwords do not match.
              </p>
            )}
          </div>

          <AuthCheckbox
            id="signup-shared-device"
            checked={!rememberMe}
            onChange={handleSharedDeviceChange}
            disabled={isLocked}
          >
            Sign out when I close this browser (shared device).
          </AuthCheckbox>

          <AuthCheckbox
            id="signup-terms"
            checked={agreeToTerms}
            onChange={handleAgreeToTermsChange}
            disabled={isLocked}
          >
            <span>
              I agree to the{" "}
              <a href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </AuthCheckbox>

          <AuthSubmitButton
            status={formStatus.status}
            idleLabel="Create account"
            loadingLabel="Creating account..."
            successLabel="Account created"
          />
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <AuthInlineLinkButton
            onClick={() => navigate("/signin", signInLinkState ? { state: signInLinkState } : undefined)}
          >
            Sign in
          </AuthInlineLinkButton>
        </p>
      </div>
    </NexusAuthShell>
  );
}

function getPasswordStrengthTone(score) {
  if (score <= 1) {
    return {
      bar: "bg-red-500",
      text: "text-red-300",
    };
  }
  if (score === 2) {
    return {
      bar: "bg-yellow-500",
      text: "text-yellow-300",
    };
  }
  if (score === 3) {
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-300",
    };
  }
  return {
    bar: "bg-[#00f5d4]",
    text: "text-[#00f5d4]",
  };
}
