import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-violet-600 text-white shadow-violet hover:bg-violet-500",
      secondary: "border border-line bg-panel text-foreground hover:bg-muted",
      ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
      destructive: "border border-red-500/50 bg-red-500/5 text-red-400 hover:bg-red-500/10",
      link: "text-violet-400 underline-offset-4 hover:underline",
    },
    size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "h-8 w-8" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />);
Button.displayName = "Button";
