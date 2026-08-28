import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "flex w-full items-start gap-2 border px-3 py-2 text-xs",
  {
    variants: {
      variant: {
        warning: "border-[color-mix(in_srgb,var(--ds-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_10%,transparent)] text-[var(--ds-warning)]",
        destructive: "border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] text-[var(--ds-danger)]",
      },
    },
    defaultVariants: { variant: "warning" },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  close?: boolean;
  onClose?: () => void;
}

export function Alert({ className, variant, close = false, onClose, children, ...props }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {children}
      {close ? (
        <button
          type="button"
          className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-md bg-transparent opacity-70 transition-opacity hover:bg-white/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function AlertIcon({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-0.5 shrink-0", className)} {...props} />;
}

export function AlertContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-bold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("leading-relaxed", className)} {...props} />;
}

export default Alert;
