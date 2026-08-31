import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.32, 0.72, 0, 1];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(media.matches));
    update();
    media.addEventListener?.("change", update);
    media.addListener?.(update);
    return () => {
      media.removeEventListener?.("change", update);
      media.removeListener?.(update);
    };
  }, []);
  return reduced;
}

function IconFrame({ className = "", children, ...props }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </motion.svg>
  );
}

export function AnimatedUploadIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : "hover"}>
      <motion.path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
      <motion.g
        variants={{ hover: { y: -1.5 } }}
        animate={active && !reduceMotion ? { y: [-1, -3, -1] } : { y: 0 }}
        transition={active ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2, ease: EASE }}
      >
        <path d="M12 16V4" />
        <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      </motion.g>
    </IconFrame>
  );
}

export function AnimatedGenerateIcon({ className = "", active = false, success = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
          <motion.path
            key="success"
            d="m5 12.5 4.2 4.2L19 7"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
          />
        ) : (
          <motion.g
            key="send"
            whileHover={reduceMotion ? undefined : { x: 1.2, y: -1.2 }}
            animate={active && !reduceMotion ? { x: [0, 2.5, 0], y: [0, -2.5, 0], opacity: [1, 0.55, 1] } : { x: 0, y: 0, opacity: 1 }}
            transition={active ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2, ease: EASE }}
          >
            <path d="m4 4 16 8-16 8 3.5-8L4 4Z" />
            <path d="M7.5 12H20" />
          </motion.g>
        )}
      </AnimatePresence>
    </IconFrame>
  );
}

export function AnimatedSettingsIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  const shift = active && !reduceMotion ? [0, 1.5, 0] : 0;
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : "hover"}>
      <path d="M4 6h16M4 12h16M4 18h16" opacity="0.52" />
      <motion.circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" variants={{ hover: { cx: 11 } }} animate={{ x: shift }} />
      <motion.circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" variants={{ hover: { cx: 13 } }} animate={{ x: active && !reduceMotion ? [0, -1.5, 0] : 0 }} />
      <motion.circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" variants={{ hover: { cx: 14 } }} animate={{ x: shift }} />
    </IconFrame>
  );
}

export function AnimatedRefreshIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame
      className={className}
      whileHover={reduceMotion ? undefined : { rotate: -24 }}
      animate={active && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
      transition={active ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0.22, ease: EASE }}
      style={{ transformOrigin: "12px 12px" }}
    >
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 8.5A7 7 0 0 1 18.5 7L20 12M4 12l1.5 5A7 7 0 0 0 17.9 15.5" />
    </IconFrame>
  );
}

export function AnimatedCopyIcon({ className = "", success = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : { y: -0.8 }}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" opacity="0.5" />
      {success ? <motion.path d="m11 13 2 2 3.5-4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22 }} /> : null}
    </IconFrame>
  );
}

export function AnimatedDownloadIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className}>
      <path d="M5 18v2h14v-2" />
      <motion.g
        whileHover={reduceMotion ? undefined : { y: 1.5 }}
        animate={active && !reduceMotion ? { y: [0, 2, 0] } : { y: 0 }}
        transition={active ? { duration: 0.75, repeat: Infinity } : { duration: 0.2, ease: EASE }}
      >
        <path d="M12 4v11" />
        <path d="m8 11 4 4 4-4" />
      </motion.g>
    </IconFrame>
  );
}

export function AnimatedHistoryIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : { rotate: -12 }} style={{ transformOrigin: "12px 12px" }}>
      <path d="M4 5v5h5" />
      <path d="M5.5 16.5A8 8 0 1 0 6 7" />
      <motion.path
        d="M12 8v4l3 2"
        animate={active && !reduceMotion ? { rotate: [0, 18, 0] } : { rotate: 0 }}
        transition={active ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
        style={{ transformOrigin: "12px 12px" }}
      />
    </IconFrame>
  );
}

export function AnimatedUiIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : "hover"}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9h17" opacity="0.55" />
      <motion.path initial={false} d="M8 13h3v3H8zM13.5 13H17" variants={{ hover: { x: 0.8 } }} animate={active && !reduceMotion ? { opacity: [0.45, 1, 0.45] } : { opacity: 1 }} transition={active ? { duration: 1, repeat: Infinity } : { duration: 0.18 }} />
    </IconFrame>
  );
}

export function AnimatedImageIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : "hover"}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <motion.circle cx="16.5" cy="8" r="1.5" fill="currentColor" stroke="none" variants={{ hover: { scale: 1.18 } }} style={{ transformOrigin: "16.5px 8px" }} />
      <motion.path
        d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3.5"
        initial={false}
        animate={active && !reduceMotion ? { pathLength: [0.25, 1, 0.25], opacity: [0.45, 1, 0.45] } : { pathLength: 1, opacity: 1 }}
        variants={{ hover: { y: -0.6 } }}
        transition={active ? { duration: 1.1, repeat: Infinity } : { duration: 0.2, ease: EASE }}
      />
    </IconFrame>
  );
}

export function AnimatedAssetIcon({ className = "", active = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className}>
      <motion.path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        whileHover={reduceMotion ? undefined : { scale: 1.06 }}
        animate={active && !reduceMotion ? { y: [0, -1, 0] } : { y: 0 }}
        transition={active ? { duration: 0.9, repeat: Infinity } : { duration: 0.2, ease: EASE }}
        style={{ transformOrigin: "12px 12px" }}
      />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" opacity="0.58" />
    </IconFrame>
  );
}

export function AnimatedMotionIcon({ className = "", active = false, playing = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className}>
      <motion.path initial={false} d="M4 15c2.2 0 2.8-6 5-6s2.8 8 5 8 2.8-10 6-10" animate={active && !reduceMotion ? { pathLength: [0.55, 1, 0.55] } : { pathLength: 1 }} transition={active ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }} />
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <motion.g key="pause" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "7px 18px" }}>
            <path d="M5.5 17v4M8.5 17v4" />
          </motion.g>
        ) : (
          <motion.path key="play" d="m5.5 17 4 2-4 2v-4Z" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "7px 19px" }} />
        )}
      </AnimatePresence>
    </IconFrame>
  );
}

export function AnimatedExpandIcon({ className = "" }) {
  const reduceMotion = useReducedMotion();
  return (
    <IconFrame className={className} whileHover={reduceMotion ? undefined : "hover"}>
      <motion.path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" variants={{ hover: { scale: 1.08 } }} style={{ transformOrigin: "12px 12px" }} />
    </IconFrame>
  );
}
