import React from "react";

const PEGTOP_PATH =
  "M63,37c-6.7-4-4-27-13-27s-6.3,23-13,27-27,4-27,13,20.3,9,27,13,4,27,13,27,6.3-23,13-27,27-4,27-13-20.3-9-27-13Z";

export default function PegtopShape({ id, gradientPrefix }) {
  const shine = `${gradientPrefix}-shine`;
  const mask = `${gradientPrefix}-mask`;
  const g1 = `${gradientPrefix}-g1`;
  const g2 = `${gradientPrefix}-g2`;
  const g3 = `${gradientPrefix}-g3`;
  const g4 = `${gradientPrefix}-g4`;
  const g5 = `${gradientPrefix}-g5`;

  return (
    <svg id={id} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id={shine}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <mask id={mask}>
          <path d={PEGTOP_PATH} fill="white" />
        </mask>
        <radialGradient
          id={g1}
          cx="50"
          cy="66"
          fx="50"
          fy="66"
          r="30"
          gradientTransform="translate(0 35) scale(1 0.5)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="black" stopOpacity="0.3" />
          <stop offset="50%" stopColor="black" stopOpacity="0.1" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g2} cx="55" cy="20" fx="55" fy="20" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="50%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g3} cx="85" cy="50" fx="85" fy="50" href={`#${g2}`} />
        <radialGradient
          id={g4}
          cx="50"
          cy="58"
          fx="50"
          fy="58"
          r="60"
          gradientTransform="translate(0 47) scale(1 0.2)"
          href={`#${g3}`}
        />
        <linearGradient id={g5} x1="50" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="black" stopOpacity="0.2" />
          <stop offset="40%" stopColor="black" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        <path d={PEGTOP_PATH} fill="currentColor" />
        <path d={PEGTOP_PATH} fill={`url(#${g1})`} />
        <path
          d={PEGTOP_PATH}
          fill="none"
          stroke="white"
          opacity="0.3"
          strokeWidth="3"
          filter={`url(#${shine})`}
          mask={`url(#${mask})`}
        />
        <path d={PEGTOP_PATH} fill={`url(#${g2})`} />
        <path d={PEGTOP_PATH} fill={`url(#${g3})`} />
        <path d={PEGTOP_PATH} fill={`url(#${g4})`} />
        <path d={PEGTOP_PATH} fill={`url(#${g5})`} />
      </g>
    </svg>
  );
}
