import React, { useMemo } from "react";

const GRID_SIZE = 6;

function hashSeed(value) {
  let hash = 0;
  for (const character of String(value || "agent")) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function createRng(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export default function AgentAvatar({ seed, size = 30, animated = false, className = "" }) {
  const cells = useMemo(() => {
    const hash = hashSeed(seed);
    const rng = createRng(hash);
    const hue = rng() * 360;
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
      color: `hsl(${(hue + (rng() - 0.5) * 70 + 360) % 360} ${78 + rng() * 18}% ${38 + rng() * 38}%)`,
      delay: `${-((index % GRID_SIZE) + Math.floor(index / GRID_SIZE)) * 90}ms`,
      duration: `${1100 + Math.round(rng() * 900)}ms`,
    }));
  }, [seed]);

  return (
    <span
      aria-label={`Avatar for ${seed}`}
      className={`relative grid shrink-0 grid-cols-6 overflow-hidden rounded-full bg-[#08080f] shadow-[0_0_14px_color-mix(in_srgb,var(--ds-accent)_28%,transparent)] ${className}`}
      role="img"
      style={{ height: size, width: size }}
    >
      {cells.map((cell, index) => (
        <span
          aria-hidden="true"
          className={animated ? "animate-pulse" : ""}
          key={`${seed}-${index}`}
          style={{
            backgroundColor: cell.color,
            animationDelay: cell.delay,
            animationDuration: cell.duration,
          }}
        />
      ))}
    </span>
  );
}
