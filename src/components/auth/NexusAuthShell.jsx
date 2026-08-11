import { ArrowRight, Check, CheckCircle, Eye, EyeOff, Loader, AlertCircle } from "lib/icons";
import { Link } from "react-router-dom";
import { Button } from "../shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../shadcn/card";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { Separator } from "../shadcn/separator";
import { cn } from "../../lib/utils";

export function NexusAuthShell({
  title,
  description,
  children,
  headingLevel = 1,
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8 sm:py-20 lg:px-14 lg:py-24">
        <section className="grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)] lg:gap-24">
          <div className="hidden lg:grid lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">Personal build workspace</p>
              <h2 className="mt-5 max-w-xl font-[var(--ds-font-display)] text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ds-text)]">
                Your work, ready when inspiration arrives.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-[var(--ds-text-muted)]">
                Sign in once to keep projects, Studio connections, and account tools together.
              </p>
            </div>
            <div className="relative aspect-[5/4] w-full max-w-[30rem]" aria-hidden="true">
              <div className="absolute left-0 top-6 w-[84%] overflow-hidden rounded-[14px] bg-[var(--ds-surface-1)] shadow-[var(--ds-shadow-panel)]">
                <div className="flex h-11 items-center gap-2 border-b border-[var(--ds-border-subtle)] px-4">
                  <span className="h-2 w-2 rounded-full bg-[var(--ds-danger)] opacity-75" />
                  <span className="h-2 w-2 rounded-full bg-[var(--ds-warning)] opacity-75" />
                  <span className="h-2 w-2 rounded-full bg-[var(--ds-success)] opacity-75" />
                  <span className="ml-2 text-[10px] font-semibold text-[var(--ds-text-muted)]">NexusRBX workspace</span>
                </div>
                <div className="grid grid-cols-[4.5rem_1fr]">
                  <div className="space-y-2 border-r border-[var(--ds-border-subtle)] bg-[var(--ds-bg-sidebar)] p-3">
                    <span className="block h-2 rounded-full bg-[var(--ds-accent)] opacity-80" />
                    <span className="block h-2 rounded-full bg-[var(--ds-fill-active)]" />
                    <span className="block h-2 w-4/5 rounded-full bg-[var(--ds-fill-active)]" />
                  </div>
                  <div className="space-y-3 p-5">
                    <span className="block h-2 w-3/5 rounded-full bg-[var(--ds-text)] opacity-80" />
                    <span className="block h-2 w-full rounded-full bg-[var(--ds-fill-active)]" />
                    <span className="block h-2 w-5/6 rounded-full bg-[var(--ds-fill-active)]" />
                    <div className="mt-5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] p-3 font-mono text-[9px] leading-5 text-[var(--ds-text-muted)]">
                      <span className="text-[var(--ds-plan)]">local</span> workspace = <span className="text-[var(--ds-accent)]">Nexus</span><br />
                      workspace:connectStudio()
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-5 right-0 w-48 rounded-[12px] bg-[var(--ds-surface-overlay)] p-5 shadow-[var(--ds-shadow-overlay)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ds-text)]">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
                    <Check className="h-4 w-4" />
                  </span>
                  Studio connected
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ds-fill-active)]">
                  <span className="block h-full w-full rounded-full bg-[var(--ds-success)]" />
                </div>
              </div>
            </div>
          </div>
          <div className="w-full max-w-[32rem] justify-self-center">
          <Link
            to="/"
            aria-label="NexusRBX home"
            className="focus-ring mx-auto mb-8 flex min-h-11 w-fit items-center gap-2.5 rounded-full px-3 py-1.5 lg:mx-0"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--ds-surface-2)]">
              <img src="/nexus-mark.svg" alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NexusRBX</span>
          </Link>

          <Card className="overflow-hidden rounded-[14px] border-0 bg-[var(--ds-surface-1)] shadow-[var(--ds-shadow-panel)]">
            <CardHeader className="space-y-3 px-6 pb-5 pt-9 text-center sm:px-10 sm:pt-11 lg:text-left">
              {headingLevel === 1 ? (
                <h1 className="font-[var(--ds-font-display)] text-3xl font-bold leading-tight tracking-[-0.035em] text-[var(--ds-text)] sm:text-4xl">{title}</h1>
              ) : (
                <CardTitle className="font-[var(--ds-font-display)] text-3xl font-bold leading-tight tracking-[-0.035em] text-[var(--ds-text)] sm:text-4xl">{title}</CardTitle>
              )}
              {description ? (
                <CardDescription className="text-sm leading-6 text-[var(--ds-text-muted)]">{description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="px-6 pb-9 pt-5 sm:px-10 sm:pb-11">{children}</CardContent>
          </Card>
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
      className="h-12 w-full rounded-full border-[var(--ds-border)] bg-transparent text-[var(--ds-text)] shadow-none hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] active:scale-[0.985]"
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
        "flex items-start gap-3 rounded-[12px] border p-4 text-sm",
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
          className="absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
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
      <label htmlFor={id} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg peer-checked:[&>span]:border-[var(--ds-accent)] peer-checked:[&>span]:bg-[var(--ds-accent)] peer-checked:[&>span]:text-[var(--ds-accent-foreground)] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ds-focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--ds-bg-canvas)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
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
      className="h-12 w-full rounded-full bg-[var(--ds-accent)] px-6 font-semibold text-[var(--ds-accent-foreground)] shadow-none hover:bg-[var(--ds-accent-hover)] active:scale-[0.985] disabled:bg-[var(--ds-fill-active)] disabled:text-[var(--ds-text-muted)]"
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
        "focus-ring inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-[var(--ds-accent)] underline-offset-4 hover:text-[var(--ds-accent-hover)] hover:underline",
        className
      )}
    >
      {children}
    </button>
  );
}
