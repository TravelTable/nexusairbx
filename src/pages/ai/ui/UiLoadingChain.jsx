import React, { useMemo } from "react";
import { Check, Loader2, Circle } from "lucide-react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "../../../components/ai-elements/chain-of-thought";
import { getUiLoadingChainSteps } from "../../../lib/runPresentation";

function stepIcon(status) {
  if (status === "complete") return Check;
  if (status === "active") return Loader2;
  return Circle;
}

export default function UiLoadingChain({ busy = "", task = null, open = true, title = "Building UI" }) {
  const steps = useMemo(() => getUiLoadingChainSteps({ busy, task }), [busy, task]);
  if (!steps.length) return null;

  return (
    <ChainOfThought open={open} className="uc-loading-chain w-full" data-testid="ui-loading-chain">
      <ChainOfThoughtHeader>{title}</ChainOfThoughtHeader>
      <ChainOfThoughtContent className="mt-3 space-y-3">
        {steps.map((step) => (
          <ChainOfThoughtStep
            key={step.id}
            icon={stepIcon(step.status)}
            label={step.label}
            status={step.status}
            motionStatus={step.status}
            stepKind="tool"
            className={step.status === "active" ? "uc-loading-chain__active" : undefined}
          />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
