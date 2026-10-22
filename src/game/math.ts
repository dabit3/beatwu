export type Op = "+" | "-" | "*" | "/";

export const OPS: readonly Op[] = ["+", "-", "*", "/"];

export const OP_SYMBOL: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export const OP_NAME: Record<Op, string> = { "+": "plus", "-": "minus", "*": "times", "/": "divided by" };

export interface Step {
  a: number;
  op: Op;
  b: number;
  result: number;
}

export type OpResult = { ok: true; value: number } | { ok: false; reason: "fraction" | "zero" };

export function applyOp(a: number, op: Op, b: number): OpResult {
  switch (op) {
    case "+":
      return { ok: true, value: a + b };
    case "-":
      return { ok: true, value: a - b };
    case "*":
      return { ok: true, value: a * b || 0 };
    case "/":
      if (b === 0) return { ok: false, reason: "zero" };
      if (a % b !== 0) return { ok: false, reason: "fraction" };
      return { ok: true, value: a / b || 0 };
  }
}

export function formatNumber(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

export function formatStep(s: Step): string {
  return `${formatNumber(s.a)} ${OP_SYMBOL[s.op]} ${formatNumber(s.b)} = ${formatNumber(s.result)}`;
}

export function isValidSolution(values: number[], target: number, steps: Step[]): boolean {
  const pool = [...values];
  for (const s of steps) {
    for (const operand of [s.a, s.b]) {
      const i = pool.indexOf(operand);
      if (i < 0) return false;
      pool.splice(i, 1);
    }
    const r = applyOp(s.a, s.op, s.b);
    if (!r.ok || r.value !== s.result) return false;
    pool.push(r.value);
  }
  return pool.length === 1 && pool[0] === target;
}
