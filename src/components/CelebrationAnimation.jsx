import React, { useEffect, useRef } from "react";

// Simple confetti burst using absolute-positioned divs
function ConfettiBurst() {
  const colors = ["#9b5de5", "#00f5d4", "#fbbf24", "#fff", "#00bbf9"];
  const confetti = Array.from({ length: 32 }).map((_, i) => ({
    left: Math.random() * 100,
    angle: Math.random() * 360,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
      {confetti.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${c.left}%`,
            top: "50%",
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: "50%",
            opacity: 0.85,
            transform: `translateY(-50%) rotate(${c.angle}deg)`,
            animation: `confetti-burst 1.2s cubic-bezier(.62,.01,.36,1) ${c.delay}s both`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-burst {
          0% { transform: translateY(-50%) scale(1) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { 
            transform: translateY(-300px) scale(1.2) rotate(720deg); 
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Animated checkmark
function AnimatedCheckmark() {
  return (
    <svg
      className="absolute left-1/2 top-1/2 z-[10000]"
      style={{ transform: "translate(-50%, -50%)" }}
      width={80}
      height={80}
      viewBox="0 0 80 80"
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="#00f5d4"
        strokeWidth="6"
        opacity="0.25"
      />
      <polyline
        points="24,44 36,56 56,28"
        fill="none"
        stroke="#9b5de5"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 60,
          strokeDashoffset: 60,
          animation: "checkmark-draw 0.7s 0.2s cubic-bezier(.62,.01,.36,1) forwards"
        }}
      />
      <style>{`
        @keyframes checkmark-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

/**
 * CelebrationAnimation
 * Shows confetti and a checkmark for 2 seconds.
 */
export default function CelebrationAnimation() {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
    >
      <ConfettiBurst />
      <AnimatedCheckmark />
    </div>
  );
}