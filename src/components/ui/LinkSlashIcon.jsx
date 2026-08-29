// Link slash path adapted from Heroicons Animated by Aniket Pawar.
// MIT license: https://github.com/Aniket-508/heroicons-animated
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/utils";

const variants = {
  normal: { x: 0 },
  animate: {
    x: [0, "-7%", "7%", "-7%", "7%", 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.35,
    },
  },
};

export default function LinkSlashIcon({ className, size = 28, ...props }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className={cn("inline-flex shrink-0", className)} {...props}>
      <motion.svg
        animate={reduceMotion ? "normal" : "animate"}
        fill="none"
        height={size}
        initial="normal"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        variants={variants}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.26-.479.541-.661.84m1.903 6.405a4.495 4.495 0 0 1-1.242-.88 4.483 4.483 0 0 1-1.062-1.683m6.587 2.345 5.907 5.907m-5.907-5.907L8.898 8.898M2.991 2.99 8.898 8.9" />
      </motion.svg>
    </span>
  );
}
