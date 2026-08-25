import React from "react";
import { X, Sparkles, Zap, ShieldCheck, Save } from "lib/icons";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";

export function shouldHideLocalSignInNudge({
  environment = process.env.NODE_ENV,
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
} = {}) {
  return (
    environment === "development" &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname || "").toLowerCase())
  );
}

export default function SignInNudgeModal({ isOpen, onClose, reason = "", blocking = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  if (shouldHideLocalSignInNudge()) return null;

  const aiFrom = location?.pathname === "/ai" ? location : { pathname: "/ai" };
  const title = blocking ? "Sign in to use NexusRBX AI" : "Sign in to save and continue your work";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleClassName="sr-only"
      panelClassName="max-w-sm overflow-hidden"
      bodyClassName=""
      overlayClassName="z-[100] overflow-y-auto bg-black/60 p-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:p-4"
      closeOnBackdrop={!blocking}
      closeOnEscape={!blocking}
      showCloseButton={false}
    >
      {!blocking ? (
        <button
          onClick={onClose}
          aria-label="Dismiss sign-in prompt"
          className="nexus-icon-button absolute right-3 top-3 h-11 w-11 rounded-full sm:right-4 sm:top-4"
        >
          <X className="w-5 h-5" />
        </button>
      ) : null}

      <div className="p-4 pt-10 text-center sm:p-6 sm:pt-7">
        <div className="relative mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--nx-purple-edge)] bg-[var(--nx-purple-soft)] text-[var(--nx-purple-strong)] shadow-[var(--nx-purple-glow)]">
          <Sparkles className="h-7 w-7" />
          <span className="absolute -right-1 -top-1" aria-hidden="true">
            <i className="nx-build-signal" data-active="true" />
          </span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-[var(--ds-text)] sm:text-2xl">
          {blocking ? (
            "Sign in to use NexusRBX AI"
          ) : (
            <>
              Sign in to save and <br /> continue your work
            </>
          )}
        </h2>

        <p className="mb-4 text-[15px] leading-relaxed text-[var(--ds-text-muted)]">
          {reason ||
            (blocking
              ? "Sign in or create a free account to use Nexus and your saved AI workspace."
              : "Create a free account to save your work and continue with Agent.")}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex min-h-16 items-center gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2 text-left">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)] text-[var(--nx-purple-strong)]">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-xs font-bold leading-tight text-[var(--ds-text)]">Free Agent access</div>
          </div>

          <div className="flex min-h-16 items-center gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2 text-left">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)] text-[var(--nx-purple-strong)]">
              <Save className="h-4 w-4" />
            </div>
            <div className="text-xs font-bold leading-tight text-[var(--ds-text)]">Resume this workspace</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/signin", { state: { from: aiFrom } })}
            className="focus-ring min-h-11 w-full rounded-xl border border-[var(--ds-accent-border)] bg-accent py-2.5 text-base font-bold text-accent-foreground transition-colors hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup", { state: { from: aiFrom } })}
            className="focus-ring w-full min-h-11 py-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] text-sm font-medium transition-colors"
          >
            Create a free account
          </button>
          {!blocking ? (
            <button
              onClick={onClose}
              className="focus-ring w-full min-h-11 py-3 rounded-xl text-[var(--ds-text-subtle)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] text-sm font-medium transition-colors"
            >
              Maybe Later
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--ds-text-subtle)]">
          <ShieldCheck className="w-3 h-3" />
          Your prompt resumes after sign-in
        </div>
      </div>
    </Modal>
  );
}
