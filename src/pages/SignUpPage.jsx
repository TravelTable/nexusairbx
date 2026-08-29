import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Github, Mail, User } from "lib/icons";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GithubAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import {
  applyAuthPersistence,
  consumeAuthRedirectError,
  getFriendlyAuthErrorMessage,
  readAuthPersistencePreference,
  signInWithGoogleProvider,
  signInWithOAuthProvider,
  writeAuthPersistencePreference,
} from "../lib/firebaseAuth";
import { trackProductEvent } from "../lib/productAnalytics";
import { getPendingAuthReturnPath, readPendingAuthAction } from "../lib/pendingAuthAction";
import { readPendingRobloxSignup, registerRobloxSignupRequirement } from "../lib/signupRobloxOnboarding";
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

function safeReturnPath(value, fallback = "/ai") {
  if (typeof value === "string") {
    return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
  }
  const pathname = typeof value?.pathname === "string" ? value.pathname : fallback;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return fallback;
  const search = typeof value?.search === "string" && value.search.startsWith("?") ? value.search : "";
  const hash = typeof value?.hash === "string" && value.hash.startsWith("#") ? value.hash : "";
  return `${pathname}${search}${hash}`;
}

function returnPathState(value, fallback = "/ai") {
  const path = safeReturnPath(value, fallback);
  const parsed = new URL(path, "https://nexusrbx.local");
  return {
    from: {
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    },
  };
}

// Container Component
export default function NexusRBXSignUpPageContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeReturnPath(location.state?.from, "/ai");
  const pendingAction = useMemo(() => readPendingAuthAction({ includeExpired: true }), []);
  const authReturnPath = pendingAction ? getPendingAuthReturnPath("/ai") : from;
  const signInLinkState = returnPathState(authReturnPath || "/ai", "/ai");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const activeSignupRef = useRef(false);
  const postSignupDestinationRef = useRef(authReturnPath || "/ai");
  const [formStatus, setFormStatus] = useState({
    status: "idle", // idle, submitting, success, error
    message: ""
  });
  const [rememberMe, setRememberMe] = useState(() => readAuthPersistencePreference());
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0-4 where 4 is strongest
    feedback: ""
  });

  const redirectAfterSignup = useCallback(async (
    user = auth.currentUser,
    destination = postSignupDestinationRef.current || authReturnPath || "/ai"
  ) => {
    if (!user?.emailVerified) {
      navigate("/verify-email", {
        replace: true,
        state: { returnPath: destination },
      });
      return;
    }
    navigate(destination, { replace: true });
  }, [authReturnPath, navigate]);

  useEffect(() => {
    const redirectError =
      (typeof location.state?.authError === "string" && location.state.authError)
      || consumeAuthRedirectError();
    if (!redirectError) return;
    setFormStatus({
      status: "error",
      message: redirectError,
    });
  }, [location.state]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || formStatus.status === "submitting") return;
      if (activeSignupRef.current) return;
      const pendingSignup = readPendingRobloxSignup(currentUser.uid);
      if (pendingSignup) {
        activeSignupRef.current = true;
        setFormStatus({ status: "submitting", message: "Resuming Roblox account setup..." });
        void registerRobloxSignupRequirement(currentUser, pendingSignup.returnPath)
          .then((destination) => {
            postSignupDestinationRef.current = destination;
            return redirectAfterSignup(currentUser, destination);
          })
          .catch((error) => {
            activeSignupRef.current = false;
            setFormStatus({
              status: "error",
              message: getFriendlyAuthErrorMessage(error),
            });
          });
        return;
      }
      if (!currentUser.emailVerified) {
        navigate("/verify-email", {
          replace: true,
          state: { returnPath: authReturnPath || "/ai" },
        });
        return;
      }
      navigate(authReturnPath || "/ai", { replace: true });
    });
    return () => unsubscribe();
  }, [authReturnPath, formStatus.status, navigate, pendingAction, redirectAfterSignup]);

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
      const firstMissingField = [
        [formData.name, nameInputRef],
        [formData.email, emailInputRef],
        [formData.password, passwordInputRef],
        [formData.confirmPassword, confirmPasswordInputRef],
      ].find(([value]) => !value);
      firstMissingField?.[1].current?.focus();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormStatus({
        status: "error",
        message: "Passwords do not match."
      });
      confirmPasswordInputRef.current?.focus();
      return;
    }

    setFormStatus({
      status: "submitting",
      message: "Creating your account..."
    });
    activeSignupRef.current = true;
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
      const destination = await registerRobloxSignupRequirement(credential.user, authReturnPath || "/ai");
      postSignupDestinationRef.current = destination;
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
        void redirectAfterSignup(credential.user, destination);
      }, 800);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
      });
    }
  };

  const handleGoogleSignUp = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to Google..."
    });
    activeSignupRef.current = true;
    void trackProductEvent("signup_started", {
      landing_page: from,
      method: "google",
      entry_offer: "free_workspace",
    }, { dedupeKey: `signup_started:google:${from}` });

    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithGoogleProvider(auth, {
        rememberMe,
        returnPath: authReturnPath || "/ai",
        intent: "signup",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser === true;
      const destination = isNewUser
        ? await registerRobloxSignupRequirement(credential.user, authReturnPath || "/ai")
        : authReturnPath || "/ai";
      postSignupDestinationRef.current = destination;
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? isNewUser ? "Account created. Continue by connecting Roblox." : "Account found. Opening your workspace..."
          : "Check your inbox to verify your email before continuing."
      });
      if (isNewUser) {
        void trackProductEvent("signup_completed", {
          landing_page: from,
          method: "google",
          entry_offer: "free_workspace",
        }, { dedupeKey: `signup_completed:${credential.user.uid}` });
      }
      setTimeout(() => {
        void redirectAfterSignup(credential.user, destination);
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
    activeSignupRef.current = true;
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
        intent: "signup",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser === true;
      const destination = isNewUser
        ? await registerRobloxSignupRequirement(credential.user, authReturnPath || "/ai")
        : authReturnPath || "/ai";
      postSignupDestinationRef.current = destination;
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
      setFormStatus({
        status: "success",
        message: credential.user.emailVerified
          ? isNewUser ? "Account created. Continue by connecting Roblox." : "Account found. Opening your workspace..."
          : "Check your inbox to verify your email before continuing."
      });
      if (isNewUser) {
        void trackProductEvent("signup_completed", {
          landing_page: from,
          method: "github",
          entry_offer: "free_workspace",
        }, { dedupeKey: `signup_completed:${credential.user.uid}` });
      }
      setTimeout(() => {
        void redirectAfterSignup(credential.user, destination);
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
      nameInputRef={nameInputRef}
      emailInputRef={emailInputRef}
      passwordInputRef={passwordInputRef}
      confirmPasswordInputRef={confirmPasswordInputRef}
      rememberMe={rememberMe}
      passwordStrength={passwordStrength}
      signInLinkState={signInLinkState}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
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
  nameInputRef,
  emailInputRef,
  passwordInputRef,
  confirmPasswordInputRef,
  rememberMe,
  passwordStrength,
  signInLinkState,
  handleInputChange,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
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
      title="Create your account"
      description="Start a private workspace for your Roblox projects and Studio work."
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

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={formStatus.status === "submitting"}
          className="grid gap-5"
        >
          <AuthStatusAlert status={formStatus.status} message={formStatus.message} />

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthTextField
              inputRef={nameInputRef}
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
              inputRef={emailInputRef}
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
              inputRef={passwordInputRef}
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
              inputRef={confirmPasswordInputRef}
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
              <p id="confirm-password-error" className="mt-2 text-xs font-medium text-[var(--ds-danger)]">
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

          <AuthSubmitButton
            status={formStatus.status}
            idleLabel="Create account"
            loadingLabel="Creating account..."
            successLabel="Account created"
          />
        </form>

        <p className="text-center text-xs leading-5 text-[var(--ds-text-muted)]">
          By creating an account with Google, GitHub, or email, you agree to the{" "}
          <a href="/legal/terms" className="focus-ring inline-flex min-h-11 items-center rounded px-1 font-medium text-[var(--ds-text)] underline-offset-4 hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/legal/privacy" className="focus-ring inline-flex min-h-11 items-center rounded px-1 font-medium text-[var(--ds-text)] underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        <p className="text-center text-sm text-[var(--ds-text-muted)]">
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
      bar: "bg-[var(--ds-danger)]",
      text: "text-[var(--ds-danger)]",
    };
  }
  if (score === 2) {
    return {
      bar: "bg-[var(--ds-warning)]",
      text: "text-[var(--ds-warning)]",
    };
  }
  if (score === 3) {
    return {
      bar: "bg-[var(--ds-success)]",
      text: "text-[var(--ds-success)]",
    };
  }
  return {
    bar: "bg-[var(--ds-success)]",
    text: "text-[var(--ds-success)]",
  };
}
