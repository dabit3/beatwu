import { card, fullDeck, shuffle, type PlayingCard } from "./cards";
import type { Step } from "./math";
import { solve } from "./solver";

export type Mode = 8 | 9;
export type DealKind = "scott" | "random";

export interface TimedStep extends Step {
  /** Seconds after the cards were revealed. */
  t: number;
}

export interface Puzzle {
  id: string;
  mode: Mode;
  kind: DealKind;
  goal: number;
  cards: PlayingCard[];
  scottTime: number;
  /** When Scott finished each move in his real run. Paces his lane. */
  scottPace: number[];
  /** Scott's own moves for his deal, or one known answer for a new deal. */
  solution: Step[];
  solutionIsScotts: boolean;
}

interface ScottRun {
  goal: number;
  cards: PlayingCard[];
  time: number;
  steps: TimedStep[];
}

/** Transcribed from the two videos. Times come from the on-screen race clock. */
export const SCOTT_RUNS: Record<Mode, ScottRun> = {
  8: {
    goal: 2025,
    time: 13.2,
    cards: [card("7", "♦"), card("5", "♣"), card("Q", "♥"), card("5", "♥"), card("10", "♦"), card("K", "♦"), card("J", "♥"), card("9", "♣")],
    steps: [
      { a: 13, op: "-", b: 12, result: 1, t: 7.5 },
      { a: 11, op: "-", b: 10, result: 1, t: 8.5 },
      { a: 1, op: "+", b: 1, result: 2, t: 9.5 },
      { a: 2, op: "+", b: 7, result: 9, t: 10.0 },
      { a: 9, op: "*", b: 9, result: 81, t: 11.5 },
      { a: 81, op: "*", b: 5, result: 405, t: 12.5 },
      { a: 405, op: "*", b: 5, result: 2025, t: 13.2 },
    ],
  },
  9: {
    goal: 6843,
    time: 20.8,
    cards: [card("10", "♠"), card("8", "♠"), card("J", "♥"), card("3", "♦"), card("4", "♣"), card("6", "♦"), card("10", "♣"), card("7", "♣"), card("Q", "♣")],
    steps: [
      { a: 6, op: "+", b: 4, result: 10, t: 8.1 },
      { a: 12, op: "-", b: 10, result: 2, t: 9.6 },
      { a: 2, op: "*", b: 10, result: 20, t: 12.6 },
      { a: 20, op: "*", b: 10, result: 200, t: 13.1 },
      { a: 200, op: "+", b: 8, result: 208, t: 14.1 },
      { a: 208, op: "*", b: 11, result: 2288, t: 16.1 },
      { a: 2288, op: "-", b: 7, result: 2281, t: 19.1 },
      { a: 2281, op: "*", b: 3, result: 6843, t: 20.8 },
    ],
  },
};

export function scottPuzzle(mode: Mode): Puzzle {
  const run = SCOTT_RUNS[mode];
  return {
    id: `scott-${mode}`,
    mode,
    kind: "scott",
    goal: run.goal,
    cards: run.cards,
    scottTime: run.time,
    scottPace: run.steps.map((s) => s.t),
    solution: run.steps.map(({ a, op, b, result }) => ({ a, op, b, result })),
    solutionIsScotts: true,
  };
}

/**
 * Deals fresh cards that are known to have an answer. Eight cards keep Scott's
 * rule of making the current year from his video (2025). Nine cards get any
 * four-digit goal, like the number the crowd picked for him.
 */
export function randomPuzzle(mode: Mode, rng: () => number = Math.random): Puzzle {
  const run = SCOTT_RUNS[mode];
  for (let attempt = 0; attempt < 40; attempt++) {
    const cards = shuffle(fullDeck(), rng).slice(0, mode);
    const goal = mode === 8 ? 2025 : 1000 + Math.floor(rng() * 9000);
    const solution = solve(
      cards.map((c) => c.value),
      goal,
    );
    if (!solution) continue;
    return {
      id: `random-${mode}-${goal}-${cards.map((c) => c.rank + c.suit).join("")}`,
      mode,
      kind: "random",
      goal,
      cards,
      scottTime: run.time,
      scottPace: run.steps.map((s) => s.t),
      solution,
      solutionIsScotts: false,
    };
  }
  return scottPuzzle(mode);
}

export function makePuzzle(mode: Mode, kind: DealKind): Puzzle {
  return kind === "scott" ? scottPuzzle(mode) : randomPuzzle(mode);
}
