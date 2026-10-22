import type { CSSProperties } from "react";
import scottUrl from "../assets/scott.jpg";

const sizeStyle = (size: number) => ({ "--size": `${size}px` }) as CSSProperties;

export function ScottAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`avatar avatar--scott ${className}`} style={sizeStyle(size)}>
      <img src={scottUrl} alt="Scott Wu" draggable={false} />
    </span>
  );
}

export function YouAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`avatar avatar--you ${className}`} style={sizeStyle(size)}>
      <MaskIcon />
    </span>
  );
}

/** A domino mask, the sidekick's look. */
export function MaskIcon() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="You">
      <rect width="64" height="64" fill="#22d3ee" />
      <circle cx="32" cy="32" r="22" fill="#ffd9b8" />
      <path d="M17 18c5-7 25-8 30 0" stroke="#120a2b" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path
        d="M6 31c2-8 12-10 20-6 3 1.6 9 1.6 12 0 8-4 18-2 20 6-2 8-11 11-18 7l-6-3-6 3c-7 4-16 1-22-7z"
        fill="#120a2b"
      />
      <ellipse cx="22" cy="31" rx="5.5" ry="3.6" fill="#fff" />
      <ellipse cx="42" cy="31" rx="5.5" ry="3.6" fill="#fff" />
      <path d="M25 45c4 3 10 3 14 0" stroke="#120a2b" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const SHADES = [
  "########################",
  ".######################.",
  ".##ww######..##ww######.",
  "..##ww####....##ww####..",
  "...######......######...",
];

/** Pixel "deal with it" sunglasses. */
export function PixelShades({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 5" shapeRendering="crispEdges" aria-hidden="true">
      {SHADES.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c === "w" ? "#fff" : "#000"} />,
        ),
      )}
    </svg>
  );
}
