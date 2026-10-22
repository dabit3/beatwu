import { useMemo } from "react";

interface StarburstProps {
  fill: string;
  points?: number;
  inner?: number;
  jitter?: number;
  seed?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}

/** A jagged comic "impact" starburst. The same seed always draws the same shape. */
export function Starburst({ fill, points = 14, inner = 0.7, jitter = 0.14, seed = 1, stroke = "#120a2b", strokeWidth = 5, className }: StarburstProps) {
  const d = useMemo(() => starPath(points, inner, jitter, seed), [points, inner, jitter, seed]);
  return (
    <svg className={className} viewBox="-112 -112 224 224" aria-hidden="true">
      <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="miter" strokeMiterlimit={10} />
    </svg>
  );
}

function starPath(points: number, inner: number, jitter: number, seed: number): string {
  const rng = mulberry32(seed);
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + (rng() - 0.5) * 0.14;
    const radius = (i % 2 === 0 ? 100 : 100 * inner) * (1 - jitter / 2 + rng() * jitter);
    coords.push(`${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`);
  }
  return `M${coords.join("L")}Z`;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
