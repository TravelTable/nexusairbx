import { HugeiconsIcon } from "@hugeicons/react";

export function createIcon(iconData, defaultSize = 16) {
  function Icon({ size, strokeWidth = 1.5, className, ...props }) {
    return (
      <HugeiconsIcon
        icon={iconData}
        size={size ?? defaultSize}
        strokeWidth={strokeWidth}
        color="currentColor"
        className={className}
        {...props}
      />
    );
  }
  return Icon;
}
