import { describe, expect, it } from "vitest";
import { newBoard, resetBoard, steps, tapOp, tapTile, undo, type Board } from "./board";
import { card } from "./cards";
import { createClock } from "./clock";
import { applyOp, formatStep, isValidSolution } from "./math";
import { randomPuzzle, SCOTT_RUNS, scottPuzzle, type Mode } from "./puzzles";
import { solve } from "./solver";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("applyOp", () => {
  it("does whole-number arithmetic and rejects fractions and division by zero", () => {
    expect(applyOp(13, "-", 12)).toEqual({ ok: true, value: 1 });
    expect(applyOp(7, "-", 13)).toEqual({ ok: true, value: -6 });
    expect(applyOp(405, "*", 5)).toEqual({ ok: true, value: 2025 });
    expect(applyOp(12, "/", 4)).toEqual({ ok: true, value: 3 });
    expect(applyOp(7, "/", 2)).toEqual({ ok: false, reason: "fraction" });
    expect(applyOp(7, "/", 0)).toEqual({ ok: false, reason: "zero" });
  });

  it("formats steps with real math symbols", () => {
    expect(formatStep({ a: 2288, op: "-", b: 7, result: 2281 })).toBe("2288 − 7 = 2281");
    expect(formatStep({ a: 9, op: "*", b: 9, result: 81 })).toBe("9 × 9 = 81");
  });
});

describe("Scott's runs from the videos", () => {
  it.each([8, 9] as Mode[])("%i-card run uses every card, hits the goal, and ends at Scott's time", (mode) => {
    const run = SCOTT_RUNS[mode];
    expect(run.cards).toHaveLength(mode);
    expect(run.steps).toHaveLength(mode - 1);
    expect(isValidSolution(run.cards.map((c) => c.value), run.goal, run.steps)).toBe(true);
    const times = run.steps.map((s) => s.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.at(-1)).toBe(run.time);
  });

  it("matches the goals and times shown on screen", () => {
    expect(scottPuzzle(8)).toMatchObject({ goal: 2025, scottTime: 13.2, kind: "scott", solutionIsScotts: true });
    expect(scottPuzzle(9)).toMatchObject({ goal: 6843, scottTime: 20.8, kind: "scott", solutionIsScotts: true });
  });
});

describe("solve", () => {
  it.each([8, 9] as Mode[])("finds a valid answer for Scott's %i-card deal", (mode) => {
    const run = SCOTT_RUNS[mode];
    const values = run.cards.map((c) => c.value);
    const solution = solve(values, run.goal);
    expect(solution).not.toBeNull();
    expect(isValidSolution(values, run.goal, solution!)).toBe(true);
  });

  it("reports impossible goals", () => {
    expect(solve([1, 1], 5)).toBeNull();
    expect(solve([13, 13, 13, 13, 13], 1)).not.toBeNull();
  });

  it("only uses whole numbers, so puzzles that need fractions have no answer", () => {
    expect(solve([3, 3, 8, 8], 24)).toBeNull();
    expect(solve([1, 5, 5, 5], 24)).toBeNull();
  });

  it("finds answers whose tree is balanced rather than a single chain", () => {
    const values = [2, 3, 5, 7, 11, 13];
    const target = (2 * 3 + 5) * (7 + 11 + 13);
    const solution = solve(values, target);
    expect(solution).not.toBeNull();
    expect(isValidSolution(values, target, solution!)).toBe(true);
  });
});

describe("randomPuzzle", () => {
  it.each([8, 9] as Mode[])("deals %i real cards with a verified answer, quickly", (mode) => {
    const rng = seeded(mode * 7919);
    const started = performance.now();
    const rounds = 25;
    for (let i = 0; i < rounds; i++) {
      const p = randomPuzzle(mode, rng);
      expect(p.kind).toBe("random");
      expect(p.cards).toHaveLength(mode);
      expect(new Set(p.cards.map((c) => c.rank + c.suit)).size).toBe(mode);
      if (mode === 8) expect(p.goal).toBe(2025);
      else expect(p.goal).toBeGreaterThanOrEqual(1000);
      expect(p.goal).toBeLessThanOrEqual(9999);
      expect(p.scottTime).toBe(SCOTT_RUNS[mode].time);
      expect(isValidSolution(p.cards.map((c) => c.value), p.goal, p.solution)).toBe(true);
    }
    const avg = (performance.now() - started) / rounds;
    console.log(`${mode}-card deal: ${avg.toFixed(1)}ms average`);
    expect(avg).toBeLessThan(400);
  });
});

describe("board", () => {
  const cards = [card("K", "♦"), card("Q", "♥"), card("5", "♣"), card("2", "♠")];
  const play = (b: Board, ...moves: (string | "+" | "-" | "*" | "/")[]) =>
    moves.reduce((acc, m) => (["+", "-", "*", "/"].includes(m) ? tapOp(acc, m as "+")[0] : tapTile(acc, m)[0]), b);

  it("selects, switches, and deselects cards", () => {
    let b = newBoard(cards);
    b = tapTile(b, "c0")[0];
    expect(b.selected).toBe("c0");
    b = tapTile(b, "c2")[0];
    expect(b.selected).toBe("c2");
    b = tapTile(b, "c2")[0];
    expect(b.selected).toBeNull();
  });

  it("needs a card before an operator", () => {
    expect(tapOp(newBoard(cards), "+")[1]).toEqual({ kind: "need-card" });
  });

  it("combines into the left-most slot and keeps the result selected for chaining", () => {
    const [b, ev] = tapTile(play(newBoard(cards), "c1", "-"), "c0");
    expect(ev).toMatchObject({ kind: "combine", intoId: "c0", flyId: "c1", remaining: 3 });
    expect(b.tiles.map((t) => t.value)).toEqual([-1, 5, 2]);
    expect(b.tiles[0].formula).toBe("12 − 13");
    expect(b.selected).toBe(b.tiles[0].id);
    expect(b.op).toBeNull();
  });

  it("rejects uneven division without using up a move", () => {
    const before = play(newBoard(cards), "c0", "/");
    const [b, ev] = tapTile(before, "c2");
    expect(ev).toEqual({ kind: "invalid", reason: "fraction", id: "c2" });
    expect(b.tiles).toBe(before.tiles);
    expect(b.selected).toBe("c0");
  });

  it("plays a full game, then undoes and resets", () => {
    const b = play(newBoard(cards), "c0", "-", "c1", "+", "c2", "*", "c3");
    expect(b.tiles.map((t) => t.value)).toEqual([12]);
    expect(steps(b).map(formatStep)).toEqual(["13 − 12 = 1", "1 + 5 = 6", "6 × 2 = 12"]);

    const [undone, ev] = undo(b);
    expect(undone.tiles.map((t) => t.value)).toEqual([6, 2]);
    expect(ev).toMatchObject({ kind: "undo" });

    const [fresh] = resetBoard(undone);
    expect(fresh.tiles.map((t) => t.id)).toEqual(["c0", "c1", "c2", "c3"]);
    expect(fresh.history).toEqual([]);
  });
});

describe("clock", () => {
  it("measures elapsed seconds and freezes when stopped", () => {
    let t = 1000;
    const clock = createClock(() => t);
    globalThis.requestAnimationFrame ??= () => 0;
    globalThis.cancelAnimationFrame ??= () => {};
    expect(clock.elapsed()).toBe(0);
    clock.start();
    t += 2500;
    expect(clock.elapsed()).toBeCloseTo(2.5);
    expect(clock.stop()).toBeCloseTo(2.5);
    t += 5000;
    expect(clock.elapsed()).toBeCloseTo(2.5);
    expect(clock.isRunning()).toBe(false);
  });
});
