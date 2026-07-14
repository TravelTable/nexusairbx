import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type React from "react";
import { cn } from "../../lib/utils";
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) { return <DropdownPrimitive.Portal><DropdownPrimitive.Content sideOffset={6} align="end" className={cn("z-50 min-w-44 rounded-md border border-line bg-elevated p-1 shadow-panel", className)} {...props} /></DropdownPrimitive.Portal>; }
export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) { return <DropdownPrimitive.Item className={cn("flex cursor-default items-center gap-2 rounded px-2.5 py-2 text-sm outline-none focus:bg-muted", className)} {...props} />; }
export const DropdownMenuSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
