import * as DialogPrimitive from "@radix-ui/react-dialog";
import type React from "react";
import { X } from "lucide-react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({ children, title }: { children: React.ReactNode; title: string }) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" /><DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[76vh] w-[min(430px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-elevated p-5 shadow-panel focus:outline-none"><div className="mb-4 flex items-center justify-between"><DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title><DialogPrimitive.Close className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X size={16} /></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal>; }
