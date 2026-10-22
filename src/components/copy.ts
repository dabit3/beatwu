import type { Op } from "../game/math";
import type { Puzzle } from "../game/puzzles";

/*
 * What pops out of the starbursts: aura points, internet slang, and math puns.
 * "\n" marks where a burst breaks the line.
 */

export const HIT_WORDS: Record<Op, string[]> = {
  "+": ["+100\nAURA", "SUM-THING\nELSE", "AURA\nSTACKED", "PLUS\nULTRA"],
  "-": ["DIFFERENCE\nMAKER", "MINUS\nTHE OPPS", "TAKE\nTHAT", "+250\nAURA"],
  "*": ["AURA\n×10", "+1000\nAURA", "VERY\nPRODUCTIVE", "LOCKED\nIN", "GIGA\nBRAIN"],
  "/": ["DIVIDE &\nCONQUER", "NO\nREMAINDERS", "SPLIT\nDECISION", "+400\nAURA"],
};

export const WIN_HIT = "+∞\nAURA";

export const PARTY = ["SCOTT\nWHO?", "AURA\nFARMER", "BUILT\nDIFFERENT", "YOU'RE\nHIM", "+∞\nAURA", "GIGA\nBRAIN"];

export const MISTAKES = {
  fraction: "NO FRACTIONS\n−500 AURA",
  zero: "÷0?!\n−∞ AURA",
  miss: "AURA\nDEBT",
};

export const OP_STYLE: Record<Op, { fill: string; color: string }> = {
  "+": { fill: "#ffd23f", color: "#ff3d54" },
  "-": { fill: "#ff3d54", color: "#ffd23f" },
  "*": { fill: "#22d3ee", color: "#ffd23f" },
  "/": { fill: "#23d18b", color: "#ffffff" },
};

export const SCOTT_HITS = ["HIM.", "TOO\nEASY", "+AURA", "COOKING", "LOCKED\nIN", "SPEED\nRUN"];

/** What the small kid in the photo says when you lose. Each loss shows the next one; the first is Scott's real line. */
export const MOG_QUIPS = [
  "that got too easy.",
  "skill issue.",
  "pemdas? i barely know her.",
  "the math is mathing. you're not.",
  "aura check: failed.",
  "i did it in my head.",
  "carry the one, champ.",
  "imagine losing to me.",
  "brb, collecting another medal.",
  "that's −1000 aura.",
];

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
