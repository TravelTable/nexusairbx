import { cn } from "lib/utils";
import { memo } from "react";

import "./shimmer.css";

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
  baseColor = "var(--ds-text-muted)",
  highlightColor = "var(--ds-surface-1)",
}) => {
  const childLength = typeof children === "string" || typeof children === "number"
    ? String(children).length
    : 0;
  const dynamicSpread = childLength * spread;
  const resolvedDuration = Number.isFinite(Number(duration))
    ? Math.max(0.2, Number(duration))
    : 2;

  return (
    <Component
      className={cn(
        "nexus-shimmer relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[background-repeat:no-repeat,padding-box]",
        className
      )}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          "--nexus-shimmer-duration": `${resolvedDuration}s`,
          "--nexus-shimmer-base": baseColor,
          "--nexus-shimmer-highlight": highlightColor,

          backgroundImage:
            "linear-gradient(90deg, #0000 calc(50% - var(--spread)), var(--nexus-shimmer-highlight), #0000 calc(50% + var(--spread))), linear-gradient(var(--nexus-shimmer-base), var(--nexus-shimmer-base))"
        }
      }>
      {children}
    </Component>
  );
};

export const Shimmer = memo(ShimmerComponent);
