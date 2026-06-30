import { ArrowLeft, ArrowRight, Check, CheckCircle, Eye, EyeOff, Loader, AlertCircle } from "lib/icons";
import { motion } from "framer-motion";
import NexusRBXFooter from "../NexusRBXFooter";
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
  eyebrow = "NexusRBX",
  icon: Icon,
  children,
  sideTitle,
  sideDescription,
  sideItems = [],
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.72fr)] lg:items-center">
          <section className="hidden min-w-0 flex-col gap-8 lg:flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => window.location.assign("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Return home
            </Button>

            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {Icon && <Icon className="h-4 w-4 text-[#00f5d4]" />}
                {eyebrow}
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">
                {sideTitle || title}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
                {sideDescription || description}
              </p>
            </div>

            {sideItems.length > 0 && (
              <div className="grid max-w-2xl gap-3">
                {sideItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-lg border border-border bg-card/45 p-4"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-[#00f5d4]">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mx-auto flex w-full max-w-md flex-col gap-5 sm:max-w-lg">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => window.location.assign("/")}
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Button>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {Icon && <Icon className="h-4 w-4 text-[#00f5d4]" />}
                {eyebrow}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Card className="overflow-hidden border-white/10 bg-card/95 shadow-[0_22px_80px_rgba(0,0,0,0.34)]">
                <CardHeader className="space-y-3 border-b border-border/80 px-5 py-6 text-center sm:px-7">
                  {Icon && (
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
                    <CardDescription className="text-sm leading-6">{description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-5 py-6 sm:px-7">{children}</CardContent>
              </Card>
            </motion.div>
          </section>
        </div>
      </main>
      <NexusRBXFooter />
    </div>
  );
}

export function AuthProviderButton({ icon: Icon, children, onClick, disabled }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full border-white/10 bg-background/60 text-foreground hover:bg-muted/70"
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
