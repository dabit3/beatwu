import type { Op, Step } from "./math";

/**
 * Finds one way to combine every value with + − × ÷ to reach `target`.
 *
 * Every expression tree splits at its root into two sides, and with at most
 * nine cards the smaller side holds four values or fewer. The solver lists
 * everything those small sides can make, then works out the value the bigger
 * side would need and recurses. This makes the search complete for up to nine
 * values. Intermediate values stay whole and non-negative.
 */
export function solve(values: number[], target: number, budget = 300_000): Step[] | null {
  const solver = new Solver(budget);
  try {
    return solver.can(
      [...values].sort((a, b) => a - b),
      target,
    );
  } catch (err) {
    if (err === OUT_OF_BUDGET) return null;
    throw err;
  }
}

type Origin = { a: number; op: Op; b: number; ka: string; kb: string } | null;

const OUT_OF_BUDGET = Symbol("out-of-budget");

const SMALL = 4;

class Solver {
  private readonly reachMemo = new Map<string, Map<number, Origin>>();
  private readonly failMemo = new Set<string>();
  private nodes = 0;

  constructor(private readonly budget: number) {}

  can(vals: number[], target: number): Step[] | null {
    if (target < 0 || !Number.isSafeInteger(target)) return null;
    const key = vals.join(",");
    if (vals.length <= SMALL) return this.reach(vals).has(target) ? this.build(key, target) : null;

    const memoKey = `${key}|${target}`;
    if (this.failMemo.has(memoKey)) return null;
    if (target > upperBound(vals)) {
      this.failMemo.add(memoKey);
      return null;
    }

    for (const [small, rest] of splits(vals, Math.min(SMALL, Math.floor(vals.length / 2)))) {
      const smallKey = small.join(",");
      for (const x of this.reach(small).keys()) {
        this.tick();
        const found = this.combineWith(x, rest, target);
        if (found) return [...this.build(smallKey, x), ...found];
      }
    }
    this.failMemo.add(memoKey);
    return null;
  }

  /** Tries every way `x` can be the final operand that turns `rest` into `t`. */
  private combineWith(x: number, rest: number[], t: number): Step[] | null {
    const attempt = (need: number, final: Step): Step[] | null => {
      const steps = this.can(rest, need);
      return steps ? [...steps, final] : null;
    };
    return (
      (x !== 0 && t % x === 0 ? attempt(t / x, { a: t / x, op: "*", b: x, result: t }) : null) ??
      (t - x >= 0 ? attempt(t - x, { a: t - x, op: "+", b: x, result: t }) : null) ??
      attempt(t + x, { a: t + x, op: "-", b: x, result: t }) ??
      (x > 1 ? attempt(t * x, { a: t * x, op: "/", b: x, result: t }) : null) ??
      (x - t > 0 ? attempt(x - t, { a: x, op: "-", b: x - t, result: t }) : null) ??
      (t > 0 && x % t === 0 && x / t > 1 ? attempt(x / t, { a: x, op: "/", b: x / t, result: t }) : null)
    );
  }

  private reach(vals: number[]): Map<number, Origin> {
    const key = vals.join(",");
    const cached = this.reachMemo.get(key);
    if (cached) return cached;

    const out = new Map<number, Origin>();
    if (vals.length === 1) out.set(vals[0], null);
    const add = (value: number, origin: Origin) => {
      if (!out.has(value)) out.set(value, origin);
    };
    for (const [left, right] of vals.length > 1 ? splits(vals, Math.floor(vals.length / 2)) : []) {
      const ka = left.join(",");
      const kb = right.join(",");
      const rb = this.reach(right);
      for (const x of this.reach(left).keys()) {
        for (const y of rb.keys()) {
          this.tick();
          add(x + y, { a: x, op: "+", b: y, ka, kb });
          add(x * y, { a: x, op: "*", b: y, ka, kb });
          if (x >= y) add(x - y, { a: x, op: "-", b: y, ka, kb });
          else add(y - x, { a: y, op: "-", b: x, ka: kb, kb: ka });
          if (y !== 0 && x % y === 0) add(x / y, { a: x, op: "/", b: y, ka, kb });
          if (x !== 0 && y % x === 0) add(y / x, { a: y, op: "/", b: x, ka: kb, kb: ka });
        }
      }
    }
    this.reachMemo.set(key, out);
    return out;
  }

  private build(key: string, value: number): Step[] {
    const origin = this.reachMemo.get(key)?.get(value);
    if (origin === undefined) throw new Error(`No recorded way to make ${value} from ${key}`);
    if (origin === null) return [];
    return [
      ...this.build(origin.ka, origin.a),
      ...this.build(origin.kb, origin.b),
      { a: origin.a, op: origin.op, b: origin.b, result: value },
    ];
  }

  private tick() {
    if (++this.nodes > this.budget) throw OUT_OF_BUDGET;
  }
}

/** Largest value reachable from positive whole numbers: each combine is at most (a+1)(b+1)-1. */
function upperBound(vals: number[]): number {
  return vals.reduce((acc, v) => acc * (v + 1), 1) - 1;
}

/** Splits sorted `vals` into (small, rest) with 1..maxSize values in `small`, skipping duplicate splits. */
function* splits(vals: number[], maxSize: number): Generator<[number[], number[]]> {
  const n = vals.length;
  for (let size = 1; size <= maxSize; size++) {
    const seen = new Set<string>();
    for (const idx of combos(n, size)) {
      const small = idx.map((i) => vals[i]);
      const key = small.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      yield [small, vals.filter((_, i) => !idx.includes(i))];
    }
  }
}

function* combos(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i <= n - (k - acc.length); i++) yield* combos(n, k, i + 1, [...acc, i]);
}
