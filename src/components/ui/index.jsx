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
    "border border-transparent bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] font-semibold shadow-sm hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)] active:scale-[0.98]",
  secondary:
    "bg-[var(--ds-surface-2)] border border-[var(--ds-border)] text-[var(--ds-text)] font-semibold hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-3)] active:scale-[0.98]",
  ghost:
    "bg-[var(--ds-fill-subtle)] border border-[var(--ds-border)] text-[var(--ds-text-secondary)] font-semibold hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98]",
  danger:
    "bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] text-[var(--ds-danger)] font-semibold hover:bg-[color-mix(in_srgb,var(--ds-danger)_18%,transparent)] active:scale-[0.98]",
  subtle:
    "text-[var(--ds-text-muted)] font-semibold hover:text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)]",
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
        "inline-flex items-center justify-center transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
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
        interactive && "transition-[background-color,border-color,box-shadow,transform] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-2)]",
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
    <div className={cx("h-full flex flex-col min-h-0 bg-[var(--ds-bg-workspace)] text-[var(--ds-text)]", className)} {...rest}>
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
          <div className="mt-0.5 p-2 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-border)] text-[var(--ds-accent)] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-[var(--ds-text)] truncate">{title}</h3>
          {subtitle ? <p className="text-xs text-[var(--ds-text-muted)] mt-0.5 leading-relaxed">{subtitle}</p> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

// --- Toggle -----------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
  "aria-label": ariaLabel,
  ...rest
}) {
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
        checked ? "bg-[var(--ds-accent)]" : "bg-[var(--ds-fill-active)]",
        className
      )}
      {...rest}
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

export function Segmented({
  options = [],
  value,
  onChange,
  className = "",
  size = "md",
  fullWidth = false,
  ariaLabel = "Choose an option",
}) {
  const pad = size === "sm"
    ? "min-h-11 px-2.5 py-1 text-[10px] md:min-h-0"
    : "min-h-11 px-3 py-1.5 text-[11px] md:min-h-0";
  return (
    <div
      className={cx(
        fullWidth ? "flex w-full" : "inline-flex",
        "bg-[var(--ds-fill-subtle)] border border-[var(--ds-border)] rounded-xl p-0.5",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(opt.id)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-[background-color,color,box-shadow] duration-150 focus-ring",
              fullWidth && "flex-1",
              pad,
              active
                ? "bg-[var(--ds-surface-1)] text-[var(--ds-accent)] shadow-sm"
                : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
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

// --- PillTabs (alias of Segmented for design-system naming) ------------------

export function PillTabs(props) {
  return <Segmented {...props} />;
}

// --- Input ------------------------------------------------------------------

export function Input({
  className = "",
  size = "md",
  icon: Icon,
  ...rest
}) {
  const pad = size === "sm" ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm";
  return (
    <div className="relative group">
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ds-text-muted)] group-focus-within:text-[var(--ds-accent)] transition-colors" />
      ) : null}
      <input
        className={cx(
          "w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] text-[var(--ds-text)] outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[var(--ds-accent-border)] focus:bg-[var(--ds-surface-1)] focus-ring placeholder:text-[var(--ds-text-subtle)]",
          Icon ? "pl-9" : "",
          pad,
          className
        )}
        {...rest}
      />
    </div>
  );
}

// --- Badge ------------------------------------------------------------------

const BADGE_TONES = {
  accent: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] border-[var(--ds-accent-border)]",
  purple: "bg-[color-mix(in_srgb,var(--ds-plan)_13%,transparent)] text-[var(--ds-plan)] border-[color-mix(in_srgb,var(--ds-plan)_30%,transparent)]",
  muted: "bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)] border-[var(--ds-border)]",
  info: "bg-[color-mix(in_srgb,var(--ds-info)_13%,transparent)] text-[var(--ds-info)] border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)]",
  danger: "bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] text-[var(--ds-danger)] border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)]",
};

export function Badge({ tone = "muted", className = "", children, ...rest }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold",
        BADGE_TONES[tone] || BADGE_TONES.muted,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

// --- EmptyState -------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-4 text-center",
        className
      )}
    >
      {Icon ? <Icon className="mx-auto mb-2 h-7 w-7 text-[var(--ds-text-subtle)]" /> : null}
      {title ? <p className="text-xs font-semibold text-[var(--ds-text)]">{title}</p> : null}
      {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--ds-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

// --- ListItem ---------------------------------------------------------------

export function ListItem({
  as: Tag = "button",
  selected = false,
  title,
  subtitle,
  right,
  className = "",
  children,
  ...rest
}) {
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-left transition-colors focus-ring",
        selected
          ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-text)]"
          : "border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]",
        className
      )}
      {...rest}
    >
      {children || (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold">{title}</div>
            {subtitle ? (
              <div className="mt-0.5 truncate text-xs text-[var(--ds-text-muted)]">{subtitle}</div>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}
    </Tag>
  );
}

export { cx };
