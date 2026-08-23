import { ArrowRight, Check, CheckCircle, Eye, EyeOff, Loader, AlertCircle } from "lib/icons";
import { Link } from "react-router-dom";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { Separator } from "../shadcn/separator";
import { cn } from "../../lib/utils";
import "./AuthLedger.css";

export function NexusAuthShell({
  title,
  description,
  children,
  headingLevel = 1,
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div
      data-nexus-surface="auth"
      className="min-h-dvh overflow-x-hidden bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]"
    >
      <main id="main-content" className="nexus-auth-layout">
        <aside className="nexus-auth-record" aria-label="NexusRBX access record">
          <Link
            to="/"
            aria-label="NexusRBX home"
            className="nexus-auth-brand focus-ring"
          >
            <span className="grid leading-tight">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NEXUS/RBX</span>
              <span className="mt-0.5 text-[11px] font-medium text-[var(--ds-text-muted)]">Roblox production studio</span>
            </span>
          </Link>

          <div className="nexus-auth-record__copy">
            <p>ACCESS RECORD / CREATOR</p>
            <h2>A known creator. A readable project.</h2>
            <p>Authentication protects project context, build history, Studio permissions, and the evidence returned for review.</p>
          </div>

          <ol className="nexus-auth-record__index">
            <li><span>01</span>Project context</li>
            <li><span>02</span>Change record</li>
            <li><span>03</span>Test evidence</li>
          </ol>
        </aside>

        <section className="nexus-auth-form">

          <header className="nexus-auth-form__header">
            <p>ACCOUNT / CONTINUE</p>
            <Heading>
              {title}
            </Heading>
            {description ? (
              <div className="nexus-auth-form__description">
                {description}
              </div>
            ) : null}
          </header>

          <div className="nexus-auth-form__body">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

export function AuthProviderButton({ icon: Icon, children, onClick, disabled }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full rounded-[10px] border-[var(--ds-border)] bg-[var(--ds-surface-1)] text-[var(--ds-text)] shadow-none transition-colors duration-150 hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-2)] active:scale-[0.985] motion-reduce:transition-none"
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Button>
  );
}

export function GoogleIcon({ className = "", ...props }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.19-1.79 4.13-1.15 1.15-2.93 2.4-6.05 2.4-4.83 0-8.6-3.89-8.6-8.72s3.77-8.72 8.6-8.72c2.6 0 4.51 1.03 5.91 2.35l2.31-2.31C18.75 1.44 16.13 0 12.48 0 5.87 0 .31 5.39.31 12s5.56 12 12.17 12c3.57 0 6.27-1.17 8.37-3.36 2.16-2.16 2.84-5.21 2.84-7.67 0-.76-.05-1.47-.17-2.05h-11.04z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AuthDivider({ children = "Or continue with" }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1 bg-[var(--ds-border-subtle)]" />
      <span className="text-xs font-medium text-[var(--ds-text-muted)]">{children}</span>
      <Separator className="flex-1 bg-[var(--ds-border-subtle)]" />
    </div>
  );
}

export function AuthStatusAlert({ status, message }) {
  if (status === "idle" || !message) return null;

  const isError = status === "error";
  const isSuccess = status === "success";
  const Icon = isError ? AlertCircle : isSuccess ? CheckCircle : Loader;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-[10px] border px-4 py-3 text-sm",
        isError && "border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_9%,transparent)] text-[var(--ds-danger)]",
        isSuccess && "border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_9%,transparent)] text-[var(--ds-success)]",
        status === "submitting" && "border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]"
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", status === "submitting" && "animate-spin")} />
      <p className="leading-6">{message}</p>
    </div>
  );
}

export function AuthTextField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  icon: Icon,
  disabled,
  required,
  className,
  inputClassName,
  describedBy,
  invalid,
  inputRef,
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="nexus-field-label">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-text-muted)]" />
        )}
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn("nexus-input h-12 rounded-[10px] bg-[var(--ds-surface-2)]", Icon ? "pl-10" : "", inputClassName)}
        />
      </div>
    </div>
  );
}

export function AuthPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "Password",
  disabled,
  required,
  shown,
  onToggle,
  describedBy,
  invalid,
  action,
  inputRef,
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <Label htmlFor={id} className="nexus-field-label">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "nexus-input h-12 rounded-[10px] bg-[var(--ds-surface-2)] pl-10 pr-11",
            invalid && "border-destructive focus-visible:ring-destructive/50"
          )}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)]">
          <LockIcon />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
      className="absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-md text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          onClick={onToggle}
          disabled={disabled}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AuthCheckbox({ id, checked, onChange, disabled, children }) {
  return (
    <div className="flex min-h-11 items-start gap-1 text-sm leading-6 text-[var(--ds-text-muted)]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        className="peer sr-only"
      />
      <label htmlFor={id} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg peer-checked:[&>span]:border-[var(--ds-text)] peer-checked:[&>span]:bg-[var(--ds-text)] peer-checked:[&>span]:text-[var(--ds-bg-canvas)] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ds-focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--ds-bg-canvas)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-surface-2)] text-transparent transition-colors">
          <Check className="h-3.5 w-3.5 stroke-[3px]" />
        </span>
      </label>
      <div id={`${id}-label`} className="min-w-0 py-2">{children}</div>
    </div>
  );
}

export function AuthSubmitButton({ status, idleLabel, loadingLabel, successLabel }) {
  const isLocked = status === "submitting" || status === "success";

  return (
    <Button
      type="submit"
      disabled={isLocked}
      className="h-12 w-full rounded-[10px] bg-[var(--ds-text)] px-6 font-semibold text-[var(--ds-bg-canvas)] shadow-none transition-colors duration-150 hover:bg-[var(--ds-text-secondary)] active:scale-[0.985] disabled:bg-[var(--ds-fill-active)] disabled:text-[var(--ds-text-muted)] motion-reduce:transition-none"
    >
      {status === "submitting" ? (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : status === "success" ? (
        <>
          <CheckCircle className="h-4 w-4" />
          {successLabel}
        </>
      ) : (
        <>
          {idleLabel}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function AuthInlineLinkButton({ children, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-[var(--ds-text)] underline-offset-4 hover:text-[var(--ds-text-secondary)] hover:underline",
        className
      )}
    >
      {children}
    </button>
  );
}
