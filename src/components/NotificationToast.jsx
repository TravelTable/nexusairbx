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
  const leaveTimeoutRef = useRef();
  const onCloseRef = useRef(onClose);

  // Keep the latest onClose without restarting the dismiss timer on every
  // parent re-render (API/polling updates commonly recreate inline callbacks).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let start = Date.now();
    setLeaving(false);
    setProgress(100);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(percent);
      if (elapsed >= duration) {
        setLeaving(true);
        clearInterval(intervalRef.current);
        leaveTimeoutRef.current = setTimeout(() => {
          onCloseRef.current?.();
        }, 200);
      }
    }, 30);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(leaveTimeoutRef.current);
    };
  }, [duration]);

  const handleClose = () => {
    setLeaving(true);
    clearInterval(intervalRef.current);
    clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      onCloseRef.current?.();
    }, 200);
  };

  let color = "#9b5de5";
  if (type === "success") color = "#00f5d4";
  if (type === "error") color = "#ff3860";
  const isError = type === "error";

  return (
    <div
      className={`nexus-toast relative min-w-[260px] max-w-xs px-5 py-4 rounded-lg shadow-xl border-l-4 bg-gray-900 text-white mb-4 transition-[opacity,transform] duration-[var(--motion-standard)] ease-[var(--ease-product)]
        ${type === "success" ? "border-[#00f5d4]" : type === "error" ? "border-[#ff3860]" : "border-[#9b5de5]"}
        ${leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}
      `}
      style={{
        boxShadow: "0 6px 24px 0 rgba(0,0,0,0.25)",
        marginLeft: "8px",
      }}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {!leaving && (
        <button
          className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-md text-lg font-bold text-gray-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#00f5d4]"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
      <div className="pr-6 text-base">{message}</div>
      {children && <div className="mt-2">{children}</div>}
      {(cta || secondary) && (
        <div className="mt-3 flex gap-2">
          {cta && (
            <button
              className={`min-h-11 px-3 py-1.5 rounded font-semibold text-sm shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5d4] ${
                cta.primary !== false
                  ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-xl"
                  : "bg-gray-800 text-gray-200 hover:bg-gray-700"
              }`}
              onClick={() => {
                if (cta.onClick) cta.onClick();
                handleClose();
              }}
            >
              {cta.label}
            </button>
          )}
          {secondary && (
            <button
              className="min-h-11 rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5d4]"
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
