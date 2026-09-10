import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../shadcn/tooltip';

export default function WorkspaceHelp({ children, label = 'About this preview' }) {
  const [open, setOpen] = React.useState(false);
  return <TooltipProvider delayDuration={200}><Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild><button type="button" className="uc-help" aria-label={label} onClick={() => setOpen(v => !v)}><CircleHelp size={15}/></button></TooltipTrigger>
    <TooltipContent className="max-w-xs" side="bottom">{children}</TooltipContent>
  </Tooltip></TooltipProvider>;
}
