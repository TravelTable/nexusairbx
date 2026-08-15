import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lib/icons";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Modal({
  onClose,
  title,
  children,
  isOpen = true,
  ariaLabel,
  titleId,
  titleClassName = "mb-6 flex items-center gap-3 font-display text-2xl font-bold text-foreground",
  panelClassName = "max-w-lg p-6 sm:p-8",
  bodyClassName = "text-muted-foreground",
  overlayClassName = "z-50 bg-black/60 px-4",
  closeButtonClassName = "right-4 top-4",
  closeOnBackdrop = false,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocusRef,
  motionProps = {},
}) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const generatedTitleId = useId();
  const reduceMotion = useReducedMotion();
  onCloseRef.current = onClose;
  const resolvedTitleId = titleId || generatedTitleId;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const panel = modalRef.current;
    document.body.style.overflow = "hidden";
    const focusPanel = () => {
      const focusable = panel?.querySelectorAll(FOCUSABLE_SELECTOR);
      (initialFocusRef?.current || focusable?.[0] || panel)?.focus?.();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const frame = window.requestAnimationFrame(focusPanel);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus?.();
    };
  }, [closeOnEscape, initialFocusRef, isOpen]);

  const defaultMotionProps = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 8 },
    transition: reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.2, 0, 0, 1] },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 flex items-center justify-center ${overlayClassName}`}
          onMouseDown={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onCloseRef.current?.();
          }}
        >
          <motion.div
            {...defaultMotionProps}
            {...motionProps}
            ref={modalRef}
            className={`nexus-page-card relative w-full shadow-none ${panelClassName}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? resolvedTitleId : undefined}
            aria-label={!title ? ariaLabel : undefined}
            tabIndex={-1}
          >
            {showCloseButton ? (
              <button
                type="button"
                className={`nexus-icon-button absolute z-50 border-transparent ${closeButtonClassName}`}
                onClick={() => onCloseRef.current?.()}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
            {title ? (
              <h2 id={resolvedTitleId} className={titleClassName}>
                {title}
              </h2>
            ) : null}
            <div className={bodyClassName}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
