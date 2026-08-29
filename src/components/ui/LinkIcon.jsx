// Link path adapted from Heroicons Animated by Aniket Pawar.
// MIT license: https://github.com/Aniket-508/heroicons-animated
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/utils";

const pathVariants = {
  initial: { pathLength: 1, pathOffset: 0, rotate: 0 },
  animate: {
    pathLength: [1, 0.97, 1, 0.97, 1],
    pathOffset: [0, 0.05, 0, 0.05, 0],
    rotate: [0, -5, 0],
    transition: {
      rotate: { duration: 0.5 },
      duration: 1,
      times: [0, 0.2, 0.4, 0.6, 1],
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

export default function LinkIcon({ className, size = 28, ...props }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className={cn("inline-flex shrink-0", className)} {...props}>
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          animate={reduceMotion ? "initial" : "animate"}
          d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
          initial="initial"
          variants={pathVariants}
        />
      </svg>
    </span>
  );
}
