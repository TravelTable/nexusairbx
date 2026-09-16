"use client";

import * as React from "react";
import { motion } from "motion/react";

export const ImageGeneration = ({ children, state }) => {
  const [progress, setProgress] = React.useState(state === "completed" ? 100 : 0);
  const [loadingState, setLoadingState] = React.useState(state || "starting");
  const duration = 8000;

  React.useEffect(() => {
    if (state) {
      setLoadingState(state);
      if (state === "completed") setProgress(100);
      else if (state === "starting") setProgress(0);
    }
  }, [state]);

  React.useEffect(() => {
    if ((state || loadingState) === "completed") return undefined;
    if ((state || loadingState) === "starting" && !state) {
      const startingTimeout = setTimeout(() => setLoadingState("generating"), 3000);
      return () => clearTimeout(startingTimeout);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progressPercentage = Math.min(
        (state || loadingState) === "completed" ? 100 : 92,
        (elapsedTime / duration) * 100,
      );
      setProgress(progressPercentage);
      if (progressPercentage >= 100) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [duration, loadingState, state]);

  const phase = state || loadingState;

  return (
    <div className="flex flex-col gap-2">
      <motion.span
        className="bg-[linear-gradient(110deg,var(--color-muted-foreground),35%,var(--color-foreground),50%,var(--color-muted-foreground),75%,var(--color-muted-foreground))] bg-[length:200%_100%] bg-clip-text text-transparent text-base font-medium"
        initial={{ backgroundPosition: "200% 0" }}
        animate={{
          backgroundPosition: phase === "completed" ? "0% 0" : "-200% 0",
        }}
        transition={{
          repeat: phase === "completed" ? 0 : Infinity,
          duration: 3,
          ease: "linear",
        }}
      >
        {phase === "starting" && "Getting started."}
        {phase === "generating" && "Creating image. May take a moment."}
        {phase === "completed" && "Image created."}
      </motion.span>
      <div className="relative rounded-xl border bg-card max-w-md overflow-hidden">
        {children}
        <motion.div
          className="absolute w-full h-[125%] -top-[25%] pointer-events-none backdrop-blur-3xl"
          initial={false}
          animate={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            opacity: phase === "completed" ? 0 : 1,
          }}
          style={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            maskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
            WebkitMaskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
          }}
        />
      </div>
    </div>
  );
};

ImageGeneration.displayName = "ImageGeneration";

export default ImageGeneration;
