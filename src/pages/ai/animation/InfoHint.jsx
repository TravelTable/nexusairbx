import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lib/icons";

export default function InfoHint({ label, side = "top" }) {
  return (
    <Tooltip.Provider delayDuration={260} skipDelayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className="animate-info-hint" aria-label={label}>
            <HelpCircle aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="animate-info-tooltip" side={side} sideOffset={7}>
            {label}
            <Tooltip.Arrow className="animate-info-tooltip__arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
