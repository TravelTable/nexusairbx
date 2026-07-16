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
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(0,245,212,0.10),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(155,93,229,0.10),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-lg">
          <Link
            to="/"
            aria-label="NexusRBX home"
            className="focus-ring mx-auto mb-5 flex w-fit items-center gap-2.5 rounded-lg px-2 py-1.5"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#11151d]">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">NexusRBX</span>
          </Link>

          <Card className="overflow-hidden border-white/10 bg-[#0b0e14]/95 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <CardHeader className="space-y-2 border-b border-white/10 px-5 py-6 text-center sm:px-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-sm leading-6 text-zinc-400">{description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="px-5 py-6 sm:px-8 sm:py-7">{children}</CardContent>
          </Card>
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
      className="h-11 w-full border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.075]"
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
      <Separator className="flex-1 bg-border/80" />
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      <Separator className="flex-1 bg-border/80" />
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
        "flex items-start gap-3 rounded-lg border p-3 text-sm",
        isError && "border-destructive/40 bg-destructive/10 text-red-200",
        isSuccess && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        status === "submitting" && "border-border bg-muted/35 text-muted-foreground"
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
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="nexus-field-label">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          aria-describedby={describedBy}
          className={cn("nexus-input h-11", Icon ? "pl-10" : "", inputClassName)}
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
            "nexus-input h-11 pl-10 pr-11",
            invalid && "border-destructive focus-visible:ring-destructive/50"
          )}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <LockIcon />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background/80 text-transparent transition peer-checked:border-[#00f5d4] peer-checked:bg-[#00f5d4] peer-checked:text-black peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5 stroke-[3px]" />
      </label>
      <div className="min-w-0 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

export function AuthSubmitButton({ status, idleLabel, loadingLabel, successLabel }) {
  const isLocked = status === "submitting" || status === "success";

  return (
    <Button
      type="submit"
      disabled={isLocked}
      className="h-11 w-full bg-[#00f5d4] font-bold text-black hover:bg-[#5fffee] disabled:bg-muted disabled:text-muted-foreground"
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
        "focus-ring rounded-md px-1 font-semibold text-[#00f5d4] underline-offset-4 hover:text-foreground hover:underline",
        className
      )}
    >
      {children}
    </button>
  );
}
