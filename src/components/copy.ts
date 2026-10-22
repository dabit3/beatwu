import type { Op } from "../game/math";
import type { Puzzle } from "../game/puzzles";

/** Sound-effect words from the 1966 TV show's fight scenes, grouped by how hard each operator hits. */
export const HIT_WORDS: Record<Op, string[]> = {
  "+": ["ZAP!", "ZOK!", "BOFF!", "ZING!"],
  "-": ["WHACK!", "THWACK!", "BIFF!", "SOCK!"],
  "*": ["KAPOW!", "BAM!", "WHAM!", "ZOWIE!", "KRUNCH!"],
  "/": ["SPLAT!", "ZLONK!", "KLONK!", "SWISH!"],
};

export const OP_STYLE: Record<Op, { fill: string; color: string }> = {
  "+": { fill: "#ffd23f", color: "#ff3d54" },
  "-": { fill: "#ff3d54", color: "#ffd23f" },
  "*": { fill: "#22d3ee", color: "#ffd23f" },
  "/": { fill: "#23d18b", color: "#ffffff" },
};

export const SCOTT_HITS = ["POW!", "BAM!", "ZAP!", "BOFF!", "WHAM!"];

export const HOLY = ["HOLY HYPOTENUSE!", "HOLY LONG DIVISION!", "HOLY PRIME FACTORS!", "HOLY ORDER OF OPERATIONS!", "HOLY ARITHMETIC!"];

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export interface Line {
  at: number;
  text: string;
}

/** What Scott actually says in the video, timed to his thinking phase. */
export function scottLines(p: Puzzle): Line[] {
  if (p.mode === 8)
    return [
      { at: 0.3, text: "You take 8 cards and you make the current year." },
      ...(p.kind === "scott" ? [{ at: 4.1, text: "In this case it's actually quite easy…" }] : []),
    ];
  return p.kind === "scott"
    ? [
        { at: 0.3, text: "And then we'll try 6,843." },
        { at: 4.1, text: "So we'll use 9 cards for that." },
      ]
    : [{ at: 0.3, text: "So we'll use 9 cards for that." }];
}
