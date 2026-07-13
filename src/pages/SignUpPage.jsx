import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Github, Gift, Mail, Shield, Sparkles, User, Zap } from "lib/icons";
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
import { formatMonthlyPrice, SUBSCRIPTION_PLANS } from "../lib/planCatalog";
import { PLAN } from "../lib/prices";
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

const SIGNUP_PLAN_ICONS = {
  [PLAN.STARTER]: Gift,
  [PLAN.PRO]: Zap,
  [PLAN.PRO_PLUS]: Sparkles,
  [PLAN.TEAM]: Shield,
};

// Container Component
export default function NexusRBXSignUpPageContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const pendingAction = useMemo(() => readPendingAuthAction({ includeExpired: true }), []);
  const authReturnPath = pendingAction ? getPendingAuthReturnPath("/subscribe?highlight=starter") : from;
  const signInLinkState = authReturnPath.includes("/subscribe")
    ? { from: { pathname: authReturnPath } }
    : undefined;
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
  const [selectedPlan, setSelectedPlan] = useState(PLAN.STARTER);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0-4 where 4 is strongest
    feedback: ""
  });

  const redirectAfterSignup = async (user = auth.currentUser) => {
    if (!user?.emailVerified) {
      navigate("/verify-email", {
        replace: true,
        state: { returnPath: authReturnPath || "/subscribe?highlight=starter" },
      });
      return;
    }
    navigate(authReturnPath || "/subscribe?highlight=starter", { replace: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || formStatus.status === "submitting") return;
      if (!currentUser.emailVerified) {
        navigate("/verify-email", {
          replace: true,
          state: { returnPath: authReturnPath || "/subscribe?highlight=starter" },
        });
        return;
      }
      if (pendingAction) navigate(authReturnPath || "/subscribe?highlight=starter", { replace: true });
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
    void trackProductEvent("signup_started", {
      landing_page: from,
      method: "password",
      subscription_plan: selectedPlan,
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
        subscription_plan: selectedPlan,
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
      subscription_plan: selectedPlan,
    }, { dedupeKey: `signup_started:google:${from}` });

    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GoogleAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/subscribe?highlight=starter",
        method: "google",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? "Google sign up successful! Redirecting to Starter checkout..."
          : "Account created. Check your inbox to verify your email before continuing."
      });
      void trackProductEvent("signup_completed", {
        landing_page: from,
        method: "google",
        subscription_plan: selectedPlan,
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
      subscription_plan: selectedPlan,
    }, { dedupeKey: `signup_started:github:${from}` });

    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GithubAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/subscribe?highlight=starter",
        method: "github",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? "GitHub sign up successful! Redirecting to Starter checkout..."
          : "Account created. Check your inbox to verify your email before continuing."
      });
      void trackProductEvent("signup_completed", {
        landing_page: from,
        method: "github",
        subscription_plan: selectedPlan,
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
      selectedPlan={selectedPlan}
      passwordStrength={passwordStrength}
      signInLinkState={signInLinkState}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
      handleAgreeToTermsChange={handleAgreeToTermsChange}
      handleSharedDeviceChange={handleSharedDeviceChange}
      handlePlanSelect={handlePlanSelect}
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
  selectedPlan,
  passwordStrength,
  signInLinkState,
  handleInputChange,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  handleAgreeToTermsChange,
  handleSharedDeviceChange,
  handlePlanSelect,
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
      description="Start generating Roblox scripts, UI, and Studio-ready assets with the plan that fits your workflow."
      icon={Sparkles}
      sideTitle="Set up your AI Roblox workspace."
      sideDescription="Create an account once, then continue into the AI workspace with your selected plan and pending Studio or homepage action preserved."
      sideItems={[
        {
          title: "Provider or password signup",
          description: "Use Google, GitHub, or email while keeping the same NexusRBX auth return flow.",
        },
        {
          title: "Choose a starting plan",
          description: "Pick Starter, Pro, Pro+, or Team during signup with the same prices shown on the pricing page.",
        },
        {
          title: "Continue after auth",
          description: "The current return-state handoff still sends authenticated users back into the right workspace path.",
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

          <fieldset className="grid gap-3">
            <legend className="nexus-field-label">Choose your plan</legend>
            <div className="grid grid-cols-2 gap-3">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <PlanOption
                  key={plan.id}
                  title={plan.name}
                  price={formatMonthlyPrice(plan)}
                  description={plan.audience}
                  icon={SIGNUP_PLAN_ICONS[plan.id]}
                  selected={selectedPlan === plan.id}
                  popular={plan.recommended}
                  onClick={() => handlePlanSelect(plan.id)}
                />
              ))}
            </div>
          </fieldset>

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

function PlanOption({ title, price, description, icon: Icon, popular, selected, onClick }) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring relative min-h-[140px] rounded-lg border p-3 text-left transition",
        selected
          ? "border-[#00f5d4]/45 bg-[#00f5d4]/10 text-foreground"
          : "border-border bg-background/55 text-muted-foreground hover:border-border/80 hover:bg-muted/35"
      )}
      onClick={onClick}
      aria-pressed={selected}
    >
      {popular && (
        <span className="absolute right-2 top-2 rounded-md border border-[#9b5de5]/30 bg-[#9b5de5]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e7d7ff]">
          Recommended
        </span>
      )}
      <span
        className={cn(
          "mb-3 flex h-8 w-8 items-center justify-center rounded-md border",
          selected ? "border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4]" : "border-border bg-muted/35"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </span>
      <span className="mt-1 block text-xl font-black text-foreground">{price}</span>
      <span className="mt-2 block text-xs leading-5">{description}</span>
    </button>
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
