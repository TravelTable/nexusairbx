import React from "react";
import { X, Gift, Zap, ShieldCheck, Save } from "lib/icons";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";

export default function SignInNudgeModal({ isOpen, onClose, reason = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const aiFrom = location?.pathname === "/ai" ? location : { pathname: "/ai" };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in to save and continue your work"
      titleClassName="sr-only"
      panelClassName="max-w-md overflow-hidden"
      bodyClassName=""
      overlayClassName="z-[100] overflow-y-auto bg-black/60 p-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:p-4"
      closeOnBackdrop
      showCloseButton={false}
    >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
          
          <button
            onClick={onClose}
            aria-label="Dismiss sign-in prompt"
            className="nexus-icon-button absolute top-3 right-3 rounded-full sm:top-4 sm:right-4"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-4 pt-12 text-center sm:p-8 sm:pt-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-border)] mb-4 sm:mb-6 sm:w-20 sm:h-20 sm:rounded-2xl relative">
              <div className="absolute inset-0 bg-accent blur-2xl opacity-15 animate-pulse" />
              <Gift className="w-7 h-7 text-accent relative z-10 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-xl font-bold text-[var(--ds-text)] mb-3 sm:text-2xl">
              Sign in to save and <br />
              <span className="text-accent">
                continue your work
              </span>
            </h2>

            <p className="text-[var(--ds-text-muted)] text-[15px] leading-relaxed mb-5 sm:mb-8">
              {reason || "Create a free account to save your work and continue with Agent Build."}
            </p>

            <div className="space-y-3 mb-5 sm:space-y-4 sm:mb-8">
              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--ds-text)]">Free Agent Build access</div>
                  <div className="text-xs text-[var(--ds-text-subtle)]">Plan, build, debug, and ask with a fair-use allowance; upgrade only when you need more.</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] flex items-center justify-center flex-shrink-0">
                  <Save className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--ds-text)]">Resume this workspace</div>
                  <div className="text-xs text-[var(--ds-text-subtle)]">Your prompt and generated output stay visible after sign-in.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/signup", { state: { from: aiFrom } })}
                className="focus-ring w-full min-h-11 py-3 sm:py-4 rounded-xl border border-[var(--ds-accent-border)] bg-accent text-accent-foreground font-bold text-base sm:text-lg shadow-panel transition hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate("/signin", { state: { from: aiFrom } })}
                className="focus-ring w-full min-h-11 py-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] text-sm font-medium transition-colors"
              >
                Already have an account? Sign In
              </button>
              <button
                onClick={onClose}
                className="focus-ring w-full min-h-11 py-3 rounded-xl text-[var(--ds-text-subtle)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] text-sm font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="p-4 bg-[var(--ds-fill-subtle)] border-t border-[var(--ds-border-subtle)] text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--ds-text-subtle)] uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Secure workspace handoff
            </div>
          </div>
    </Modal>
  );
}
