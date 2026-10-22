import type { DealKind, Mode } from "./puzzles";

const KEY = "scott-wu-vs-you:v1";

interface Saved {
  best: Record<string, number>;
  muted: boolean;
}

function read(): Saved {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>;
    return { best: parsed.best ?? {}, muted: parsed.muted ?? false };
  } catch {
    return { best: {}, muted: false };
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
