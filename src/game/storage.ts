import type { DealKind, Mode } from "./puzzles";

const KEY = "scott-wu-vs-you:v1";

interface Saved {
  best: Record<string, number>;
  muted: boolean;
  /** Index of the next losing-screen quip. */
  quip: number;
}

function read(): Saved {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>;
    return { best: parsed.best ?? {}, muted: parsed.muted ?? false, quip: parsed.quip ?? 0 };
  } catch {
    return { best: {}, muted: false, quip: 0 };
  }
}

function write(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage can be unavailable (private mode); the game works without it.
  }
}

export const bestKey = (mode: Mode, kind: DealKind) => `${mode}-${kind}`;

export function getBest(mode: Mode, kind: DealKind): number | undefined {
  return read().best[bestKey(mode, kind)];
}

/** Records a winning time and reports whether it beat the previous best. */
export function recordWin(mode: Mode, kind: DealKind, time: number): boolean {
  const saved = read();
  const key = bestKey(mode, kind);
  const prev = saved.best[key];
  if (prev !== undefined && prev <= time) return false;
  write({ ...saved, best: { ...saved.best, [key]: time } });
  return true;
}

export const getMuted = () => read().muted;

export function setMuted(muted: boolean) {
  write({ ...read(), muted });
}

/** Hands out quips in order, picking up where the last visit left off. Returns the index to show now. */
export function nextQuip(count: number): number {
  const saved = read();
  const index = (Number.isInteger(saved.quip) ? saved.quip : 0) % count;
  write({ ...saved, quip: (index + 1) % count });
  return index;
}
