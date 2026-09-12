/**
 * Controlled morphing state icons adapted from Yad Hakim / 21st.dev
 * "Animated State Icons" (dev.yadhakim). Demo auto-toggle removed —
 * callers drive state via props. MIT-style community component.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

const EASE = [0.32, 0.72, 0, 1];

function Frame({ size, className, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Loading spinner → checkmark once. */
export function SuccessStateIcon({ size = 16, className, done = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <motion.circle
        cx="20"
        cy="20"
        r="16"
        stroke={color}
        strokeWidth={2}
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.45 }}
        transition={{ duration: reduce ? 0 : 0.45 }}
      />
      {!done && !reduce ? (
        <motion.circle
          cx="20"
          cy="20"
          r="16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="25 75"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "20px 20px" }}
        />
      ) : null}
      <motion.path
        d="M12 20l6 6 10-12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.35, delay: done && !reduce ? 0.15 : 0 }}
      />
    </Frame>
  );
}

/** Bars3 ↔ XMark. */
export function MenuCloseStateIcon({ size = 16, className, open = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  const t = { duration: reduce ? 0 : 0.32, ease: EASE };
  return (
    <Frame size={size} className={className}>
      <motion.line
        x1="10"
        x2="30"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: 45 } : { y1: 12, y2: 12, rotate: 0 }}
        transition={t}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10"
        y1="20"
        x2="30"
        y2="20"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: reduce ? 0 : 0.18 }}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10"
        x2="30"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: -45 } : { y1: 28, y2: 28, rotate: 0 }}
        transition={t}
        style={{ transformOrigin: "20px 20px" }}
      />
    </Frame>
  );
}

/** Play ↔ Pause. */
export function PlayPauseStateIcon({ size = 16, className, playing = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <motion.g
            key="pause"
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: "20px 20px" }}
          >
            <rect x="12" y="10" width="5" height="20" rx="1.5" fill={color} />
            <rect x="23" y="10" width="5" height="20" rx="1.5" fill={color} />
          </motion.g>
        ) : (
          <motion.g
            key="play"
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: "20px 20px" }}
          >
            <polygon points="14,10 30,20 14,30" fill={color} />
          </motion.g>
        )}
      </AnimatePresence>
    </Frame>
  );
}

/** LockClosed ↔ LockOpen. */
export function LockStateIcon({ size = 16, className, unlocked = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <rect x="9" y="18" width="22" height="16" rx="3" stroke={color} strokeWidth={2} />
      <motion.path
        d="M14 18V13a6 6 0 0112 0v5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        animate={unlocked ? { d: "M14 18V13a6 6 0 0112 0v2" } : { d: "M14 18V13a6 6 0 0112 0v5" }}
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      />
      <motion.circle
        cx="20"
        cy="26"
        r="2"
        fill={color}
        animate={unlocked ? { scale: 0.6, opacity: 0.4 } : { scale: 1, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      />
    </Frame>
  );
}

/** Copy → Check. */
export function CopyStateIcon({ size = 16, className, copied = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <rect x="12" y="10" width="18" height="22" rx="2" stroke={color} strokeWidth={2} />
      <path d="M10 14h-0a2 2 0 00-2 2v18a2 2 0 002 2h14" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.path
            key="check"
            d="M16 21l4 4 6-8"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            exit={reduce ? undefined : { pathLength: 0 }}
            transition={{ duration: 0.28 }}
          />
        ) : (
          <motion.g
            key="lines"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <line x1="17" y1="18" x2="25" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="23" x2="25" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="28" x2="22" y2="28" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
          </motion.g>
        )}
      </AnimatePresence>
    </Frame>
  );
}

/** Download → Check. */
export function DownloadStateIcon({ size = 16, className, done = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <path d="M8 28v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.path
            key="check"
            d="M14 22l6 6 8-10"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            exit={reduce ? undefined : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <motion.g
            key="arrow"
            initial={reduce ? false : { y: -3, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 6, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <line x1="20" y1="6" x2="20" y2="24" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <polyline points="14,18 20,24 26,18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </motion.g>
        )}
      </AnimatePresence>
    </Frame>
  );
}

/** Paper airplane — brief fly on submit, idle otherwise. No continuous flight. */
export function SendStateIcon({ size = 16, className, sent = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <motion.g
        animate={
          sent && !reduce
            ? { x: 10, y: -10, opacity: 0, scale: 0.72 }
            : { x: 0, y: 0, opacity: 1, scale: 1 }
        }
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      >
        <path d="M34 6L16 20l-6-2L34 6z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
        <path d="M34 6L22 34l-6-14" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
        <line x1="16" y1="20" x2="22" y2="34" stroke={color} strokeWidth={2} />
      </motion.g>
    </Frame>
  );
}

/** Eye ↔ EyeSlash. */
export function EyeStateIcon({ size = 16, className, hidden = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <motion.path
        d="M4 20s6-10 16-10 16 10 16 10-6 10-16 10S4 20 4 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={hidden ? { opacity: 0.35 } : { opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      />
      <motion.circle
        cx="20"
        cy="20"
        r="5"
        stroke={color}
        strokeWidth={2}
        animate={hidden ? { scale: 0.65, opacity: 0.25 } : { scale: 1, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      />
      <motion.line
        x1="6"
        y1="34"
        x2="34"
        y2="6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={hidden ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
      />
    </Frame>
  );
}

/** SpeakerWave ↔ SpeakerXMark. */
export function VolumeStateIcon({ size = 16, className, muted = false, color = "currentColor" }) {
  const reduce = useReducedMotion();
  return (
    <Frame size={size} className={className}>
      <path
        d="M8 16h5l7-6v20l-7-6H8a1 1 0 01-1-1V17a1 1 0 011-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <motion.path
        d="M26 14a8 8 0 010 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        animate={muted ? { opacity: 0, x: -2 } : { opacity: 1, x: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      />
      <motion.path
        d="M30 10a14 14 0 010 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        animate={muted ? { opacity: 0, x: -4 } : { opacity: 0.5, x: 0 }}
        transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : 0.04 }}
      />
      <motion.g animate={muted ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
        <line x1="26" y1="16" x2="34" y2="24" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <line x1="34" y1="16" x2="26" y2="24" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      </motion.g>
    </Frame>
  );
}
