import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";

import { Mail } from "lib/icons";
import { auth } from "../firebase";
import {
  AuthStatusAlert,
  AuthSubmitButton,
  AuthTextField,
  NexusAuthShell,
} from "../components/auth/NexusAuthShell";
import NoIndexMeta from "../components/seo/NoIndexMeta";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "If an account exists for that email, we’ll send password reset instructions shortly.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [formStatus, setFormStatus] = useState({ status: "idle", message: "" });
  const isLocked = formStatus.status === "submitting";
  const invalid = formStatus.status === "error" && formStatus.code === "invalid_email";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setFormStatus({ status: "error", code: "invalid_email", message: "Enter a valid email address." });
      return;
    }

    setFormStatus({ status: "submitting", message: "Sending reset instructions…" });
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setFormStatus({ status: "success", message: PASSWORD_RESET_SUCCESS_MESSAGE });
    } catch (error) {
      if (error?.code === "auth/user-not-found") {
        setFormStatus({ status: "success", message: PASSWORD_RESET_SUCCESS_MESSAGE });
        return;
      }
      setFormStatus({
        status: "error",
        message: "We couldn’t send the email right now. Wait a moment and try again.",
      });
    }
  };

  return (
    <>
      <NoIndexMeta title="Reset Password | NexusRBX" />
      <NexusAuthShell
        title="Reset your password"
        headingLevel={1}
        description="Enter your account email. We’ll send a secure reset link if it matches an account."
      >
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate aria-busy={formStatus.status === "submitting"}>
          <AuthTextField
            id="password-reset-email"
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (formStatus.status !== "idle") setFormStatus({ status: "idle", message: "" });
            }}
            autoComplete="email"
            placeholder="you@example.com"
            icon={Mail}
            disabled={isLocked}
            required
            invalid={invalid}
            describedBy="password-reset-status"
          />

          <div id="password-reset-status">
            <AuthStatusAlert status={formStatus.status} message={formStatus.message} />
          </div>

          <AuthSubmitButton
            status={formStatus.status}
            idleLabel="Send reset email"
            loadingLabel="Sending reset email…"
            successLabel="Email requested"
          />

          <p className="text-center text-sm text-[var(--ds-text-muted)]">
            Remembered your password?{" "}
            <Link to="/signin" className="focus-ring inline-flex min-h-11 items-center rounded px-1 font-semibold text-[var(--ds-text)] hover:text-[var(--ds-text-secondary)] hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </NexusAuthShell>
    </>
  );
}
