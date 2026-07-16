import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Github, Mail } from "lib/icons";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, GithubAuthProvider, onAuthStateChanged } from "firebase/auth";
import {
  applyAuthPersistence,
  getFriendlyAuthErrorMessage,
  readAuthPersistencePreference,
  signInWithOAuthProvider,
  writeAuthPersistencePreference,
} from "../lib/firebaseAuth";
import { getPendingAuthReturnPath, readPendingAuthAction } from "../lib/pendingAuthAction";
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

function safeReturnPath(value, fallback = "/") {
  if (typeof value === "string") {
    return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
  }
  const pathname = typeof value?.pathname === "string" ? value.pathname : fallback;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return fallback;
  const search = typeof value?.search === "string" && value.search.startsWith("?") ? value.search : "";
  const hash = typeof value?.hash === "string" && value.hash.startsWith("#") ? value.hash : "";
  return `${pathname}${search}${hash}`;
}

function returnPathState(value, fallback = "/") {
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
export default function NexusRBXSignInPageContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeReturnPath(location.state?.from, "/");
  const pendingAction = useMemo(() => readPendingAuthAction({ includeExpired: true }), []);
  const authReturnPath = pendingAction ? getPendingAuthReturnPath("/ai") : from;
  const signUpLinkState = returnPathState(authReturnPath || "/", "/");

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formStatus, setFormStatus] = useState({
    status: "idle", // idle, submitting, success, error
    message: ""
  });
  const [rememberMe, setRememberMe] = useState(() => readAuthPersistencePreference());
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const finishSignInRedirect = async () => {
    navigate(authReturnPath || "/", { replace: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || formStatus.status === "submitting") return;
      if (pendingAction) navigate(authReturnPath || "/", { replace: true });
    });
    return () => unsubscribe();
  }, [authReturnPath, formStatus.status, navigate, pendingAction]);

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

  const handleSharedDeviceChange = () => {
    setRememberMe((prev) => {
      const nextRememberMe = !prev;
      writeAuthPersistencePreference(nextRememberMe);
      return nextRememberMe;
    });
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
      await applyAuthPersistence(auth, rememberMe);
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      await credential.user.getIdToken();
      setFormStatus({
        status: "success",
        message: "Sign in successful! Redirecting..."
      });
      setTimeout(() => {
        void finishSignInRedirect();
      }, 600);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to Google..."
    });
    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GoogleAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/",
        method: "google",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      setFormStatus({
        status: "success",
        message: "Google sign in successful! Redirecting..."
      });
      setTimeout(() => {
        void finishSignInRedirect();
      }, 600);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
      });
    }
  };

  const handleGithubSignIn = async () => {
    setFormStatus({
      status: "submitting",
      message: "Connecting to GitHub..."
    });
    try {
      writeAuthPersistencePreference(rememberMe);
      const credential = await signInWithOAuthProvider(auth, GithubAuthProvider, {
        rememberMe,
        returnPath: authReturnPath || "/",
        method: "github",
      });
      if (!credential) return;
      await credential.user.getIdToken();
      setFormStatus({
        status: "success",
        message: "GitHub sign in successful! Redirecting..."
      });
      setTimeout(() => {
        void finishSignInRedirect();
      }, 600);
    } catch (error) {
      setFormStatus({
        status: "error",
        message: getFriendlyAuthErrorMessage(error)
      });
    }
  };

  return (
    <NexusRBXSignInPage
      formData={formData}
      showPassword={showPassword}
      formStatus={formStatus}
      rememberMe={rememberMe}
      agreeToTerms={agreeToTerms}
      signUpLinkState={signUpLinkState}
      handleInputChange={handleInputChange}
      togglePasswordVisibility={togglePasswordVisibility}
      handleSharedDeviceChange={handleSharedDeviceChange}
      handleAgreeToTermsChange={handleAgreeToTermsChange}
      handleSubmit={handleSubmit}
      handleGoogleSignIn={handleGoogleSignIn}
      handleGithubSignIn={handleGithubSignIn}
      navigate={navigate}
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
  signUpLinkState,
  handleInputChange,
  togglePasswordVisibility,
  handleSharedDeviceChange,
  handleAgreeToTermsChange,
  handleSubmit,
  handleGoogleSignIn,
  handleGithubSignIn,
  navigate
}) {
  const isLocked = formStatus.status === "submitting" || formStatus.status === "success";

  return (
    <NexusAuthShell
      title="Welcome back"
      description="Sign in to your NexusRBX account."
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthProviderButton icon={GoogleIcon} onClick={handleGoogleSignIn} disabled={isLocked}>
            Google
          </AuthProviderButton>
          <AuthProviderButton icon={Github} onClick={handleGithubSignIn} disabled={isLocked}>
            GitHub
          </AuthProviderButton>
        </div>

        <AuthDivider />

        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <AuthStatusAlert status={formStatus.status} message={formStatus.message} />

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

          <AuthPasswordField
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleInputChange}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isLocked}
            required
            shown={showPassword}
            onToggle={togglePasswordVisibility}
            action={
              <a
                href="/forgot-password"
                className="focus-ring ml-auto rounded-md px-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </a>
            }
          />

          <div className="grid gap-3">
            <AuthCheckbox
              id="signin-shared-device"
              checked={!rememberMe}
              onChange={handleSharedDeviceChange}
              disabled={isLocked}
            >
              Sign out when I close this browser (shared device).
            </AuthCheckbox>
            <AuthCheckbox
              id="signin-terms"
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
          </div>

          <AuthSubmitButton
            status={formStatus.status}
            idleLabel="Sign in"
            loadingLabel="Signing in..."
            successLabel="Welcome back"
          />
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New to NexusRBX?{" "}
          <AuthInlineLinkButton
            onClick={() => navigate("/signup", signUpLinkState ? { state: signUpLinkState } : undefined)}
          >
            Create an account
          </AuthInlineLinkButton>
        </p>
      </div>
    </NexusAuthShell>
  );
}
