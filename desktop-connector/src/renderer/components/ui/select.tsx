import * as SelectPrimitive from "@radix-ui/react-select";
import type React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export function SelectTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) { return <SelectPrimitive.Trigger className={cn("flex h-9 min-w-36 items-center justify-between gap-2 rounded-md border border-line bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", className)} {...props}>{children}<SelectPrimitive.Icon><ChevronDown size={14} /></SelectPrimitive.Icon></SelectPrimitive.Trigger>; }
export function SelectContent({ children }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) { return <SelectPrimitive.Portal><SelectPrimitive.Content position="popper" sideOffset={5} className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-elevated p-1 shadow-panel"><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>; }
export function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) { return <SelectPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded px-7 py-2 text-sm outline-none focus:bg-muted", className)} {...props}><span className="absolute left-2"><SelectPrimitive.ItemIndicator><Check size={14} /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>; }
