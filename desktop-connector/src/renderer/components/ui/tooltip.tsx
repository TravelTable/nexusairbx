import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type React from "react";
export const TooltipProvider = TooltipPrimitive.Provider;
export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) { return <TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={6} className="z-50 rounded border border-line bg-elevated px-2 py-1 text-xs shadow-panel">{label}<TooltipPrimitive.Arrow className="fill-elevated" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root>; }
