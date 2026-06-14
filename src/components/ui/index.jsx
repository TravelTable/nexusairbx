import React from "react";

/**
 * Shared design-system primitives for the NexusRBX redesign.
 *
 * Lightweight, dependency-free, and purely presentational so they can be dropped
 * into existing surfaces without changing data flow. They standardize spacing,
 * depth, focus states, and motion across the app.
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

// --- Button -----------------------------------------------------------------

const BTN_SIZES = {
  sm: "px-2.5 py-1.5 text-[11px] gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-5 py-3 text-[15px] gap-2 rounded-xl",
};

const BTN_VARIANTS = {
  primary:
    "bg-nexus-cyan text-black font-bold hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] active:scale-[0.98]",
  secondary:
    "bg-nexus-purple/15 border border-nexus-purple/30 text-[#c9b3f7] font-bold hover:bg-nexus-purple/25 hover:text-white active:scale-[0.98]",
  ghost:
    "bg-white/5 border border-white/10 text-gray-300 font-bold hover:bg-white/10 hover:text-white active:scale-[0.98]",
  danger:
    "bg-red-500/15 border border-red-500/30 text-red-300 font-bold hover:bg-red-500/25 hover:text-white active:scale-[0.98]",
  subtle:
    "text-gray-400 font-semibold hover:text-white hover:bg-white/5",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className = "",
  children,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        BTN_SIZES[size] || BTN_SIZES.md,
        BTN_VARIANTS[variant] || BTN_VARIANTS.primary,
        className
      )}
      {...rest}
    >
      {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
      {children}
      {IconRight ? <IconRight className="w-4 h-4 shrink-0" /> : null}
    </button>
  );
}

// --- Card / Panel -----------------------------------------------------------

export function Card({ as: Tag = "div", className = "", interactive = false, children, ...rest }) {
  return (
    <Tag
      className={cx(
        "card-surface shadow-panel",
        interactive && "transition-all hover:border-white/20 hover:bg-[#15151b]/80",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Panel({ className = "", children, ...rest }) {
  return (
    <div className={cx("h-full flex flex-col min-h-0 bg-ink-900", className)} {...rest}>
      {children}
    </div>
  );
}

// --- SectionHeader ----------------------------------------------------------

export function SectionHeader({ icon: Icon, title, subtitle, right, className = "" }) {
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon ? (
          <div className="mt-0.5 p-2 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/20 text-nexus-cyan shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-white truncate">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

// --- Toggle -----------------------------------------------------------------

export function Toggle({ checked, onChange, disabled = false, label, "aria-label": ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={ariaLabel || label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "relative w-12 h-6 rounded-full transition-colors focus-ring shrink-0 disabled:opacity-50",
        checked ? "bg-nexus-cyan" : "bg-white/15"
      )}
    >
      <span
        className={cx(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow",
          checked ? "left-7" : "left-1"
        )}
      />
    </button>
  );
}

// --- Segmented control ------------------------------------------------------

export function Segmented({ options = [], value, onChange, className = "", size = "md", fullWidth = false }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";
  return (
    <div
      className={cx(
        fullWidth ? "flex w-full" : "inline-flex",
        "bg-black/40 border border-white/10 rounded-xl p-0.5",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.id)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold uppercase tracking-widest transition-all focus-ring",
              fullWidth && "flex-1",
              pad,
              active ? "bg-nexus-cyan/15 text-nexus-cyan" : "text-gray-500 hover:text-gray-200"
            )}
          >
            {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export { cx };
