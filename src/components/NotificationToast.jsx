import React, { useEffect, useRef, useState } from "react";

/**
 * NotificationToast
 * 
 * Props:
 * - message: string (main message)
 * - type: "info" | "success" | "error"
 * - duration: ms before auto-close (default 4000)
 * - onClose: function to call when closed
 * - cta: { label: string, onClick: function, primary?: boolean }
 * - secondary: { label: string, onClick: function }
 * - children: ReactNode (optional, for extra content)
 */
export default function NotificationToast({
  message,
  type = "info",
  duration = 4000,
  onClose,
  cta,
  secondary,
  children,
}) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef();

  useEffect(() => {
    let start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(percent);
      if (elapsed >= duration) {
        setLeaving(true);
        clearInterval(intervalRef.current);
        setTimeout(() => {
          if (onClose) onClose();
        }, 350);
      }
    }, 30);
    return () => clearInterval(intervalRef.current);
  }, [duration, onClose]);

  const handleClose = () => {
    setLeaving(true);
    clearInterval(intervalRef.current);
    setTimeout(() => {
      if (onClose) onClose();
    }, 350);
  };

  let color = "#9b5de5";
  if (type === "success") color = "#00f5d4";
  if (type === "error") color = "#ff3860";

  return (
    <div
      className={`relative min-w-[260px] max-w-xs px-5 py-4 rounded-lg shadow-xl border-l-4 bg-gray-900 text-white mb-4 transition-all duration-350 ease-in-out
        ${type === "success" ? "border-[#00f5d4]" : type === "error" ? "border-[#ff3860]" : "border-[#9b5de5]"}
        ${leaving ? "-translate-x-8 opacity-0" : "translate-x-0 opacity-100"}
        animate-fade-in
      `}
      style={{
        boxShadow: "0 6px 24px 0 rgba(0,0,0,0.25)",
        marginLeft: "8px",
      }}
      role="alert"
      aria-live="assertive"
    >
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg font-bold focus:outline-none"
        onClick={handleClose}
        aria-label="Close notification"
        tabIndex={0}
      >
        ×
      </button>
      <div className="pr-6 text-base">{message}</div>
      {children && (
        <div className="mt-2">{children}</div>
      )}
      {(cta || secondary) && (
        <div className="mt-3 flex gap-2">
          {cta && (
            <button
              className={`px-3 py-1.5 rounded font-semibold text-sm shadow ${
                cta.primary !== false
                  ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-xl"
                  : "bg-gray-800 text-gray-200 hover:bg-gray-700"
              }`}
              onClick={() => {
                if (cta.onClick) cta.onClick();
                handleClose();
              }}
              autoFocus={cta.primary !== false}
            >
              {cta.label}
            </button>
          )}
          {secondary && (
            <button
              className="px-3 py-1.5 rounded bg-gray-800 text-gray-200 text-sm font-medium hover:bg-gray-700"
              onClick={() => {
                if (secondary.onClick) secondary.onClick();
                handleClose();
              }}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
      <div
        className="absolute left-0 bottom-0 h-1 rounded-b-lg"
        style={{
          width: `${progress}%`,
          background: color,
          transition: "width 0.2s linear",
        }}
      />
    </div>
  );
}