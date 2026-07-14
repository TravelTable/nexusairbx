import * as React from "react";
import { cn } from "../../lib/utils";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn("h-9 w-full rounded-md border border-line bg-black/20 px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400", className)} {...props} />);
Input.displayName = "Input";
