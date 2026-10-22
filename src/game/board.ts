import type { PlayingCard } from "./cards";
import { applyOp, formatNumber, OP_SYMBOL, type Op, type Step } from "./math";

export interface Tile {
  id: string;
  value: number;
  /** Set for dealt cards; result tiles have a formula instead. */
  card?: PlayingCard;
  formula?: string;
}

export interface Board {
  tiles: Tile[];
  history: { tiles: Tile[]; step: Step }[];
  selected: string | null;
  op: Op | null;
  nextId: number;
}

export type BoardEvent =
  | { kind: "select"; id: string }
  | { kind: "deselect" }
  | { kind: "op"; op: Op }
  | { kind: "need-card" }
  | { kind: "combine"; step: Step; intoId: string; flyId: string; result: Tile; remaining: number }
  | { kind: "invalid"; reason: "fraction" | "zero"; id: string }
  | { kind: "undo"; restored: string[] }
  | { kind: "reset" }
  | { kind: "none" };

export function dealTiles(cards: PlayingCard[]): Tile[] {
  return cards.map((card, i) => ({ id: `c${i}`, value: card.value, card }));
}

export function newBoard(cards: PlayingCard[]): Board {
  return { tiles: dealTiles(cards), history: [], selected: null, op: null, nextId: 0 };
}

export function steps(board: Board): Step[] {
  return board.history.map((h) => h.step);
}

/**
 * Tap a card: select it, deselect it, switch to it, or, with a card and an
 * operator already chosen, combine the two. The result takes the left-most
 * slot of the pair and stays selected so moves can be chained.
 */
export function tapTile(board: Board, id: string): [Board, BoardEvent] {
  const { selected, op, tiles } = board;
  if (!tiles.some((t) => t.id === id)) return [board, { kind: "none" }];
  if (selected === id) return [{ ...board, selected: null, op: null }, { kind: "deselect" }];
  if (!selected || !op) return [{ ...board, selected: id, op: null }, { kind: "select", id }];

  const ia = tiles.findIndex((t) => t.id === selected);
  const ib = tiles.findIndex((t) => t.id === id);
  const a = tiles[ia];
  const b = tiles[ib];
  const r = applyOp(a.value, op, b.value);
  if (!r.ok) return [{ ...board, op: null }, { kind: "invalid", reason: r.reason, id }];

  const result: Tile = {
    id: `r${board.nextId}`,
    value: r.value,
    formula: `${formatNumber(a.value)} ${OP_SYMBOL[op]} ${formatNumber(b.value)}`,
  };
  const into = Math.min(ia, ib);
  const fly = Math.max(ia, ib);
  const next = tiles.filter((_, i) => i !== ia && i !== ib);
  next.splice(into, 0, result);
  const step: Step = { a: a.value, op, b: b.value, result: r.value };
  return [
    {
      tiles: next,
      history: [...board.history, { tiles, step }],
      selected: result.id,
      op: null,
      nextId: board.nextId + 1,
    },
    { kind: "combine", step, intoId: tiles[into].id, flyId: tiles[fly].id, result, remaining: next.length },
  ];
}

export function tapOp(board: Board, op: Op): [Board, BoardEvent] {
  if (!board.selected) return [board, { kind: "need-card" }];
  if (board.op === op) return [{ ...board, op: null }, { kind: "op", op }];
  return [{ ...board, op }, { kind: "op", op }];
}

export function undo(board: Board): [Board, BoardEvent] {
  const last = board.history.at(-1);
  if (!last) return [board, { kind: "none" }];
  const current = new Set(board.tiles.map((t) => t.id));
  return [
    { ...board, tiles: last.tiles, history: board.history.slice(0, -1), selected: null, op: null },
    { kind: "undo", restored: last.tiles.filter((t) => !current.has(t.id)).map((t) => t.id) },
  ];
}

export function resetBoard(board: Board): [Board, BoardEvent] {
  const first = board.history[0];
  if (!first) return [{ ...board, selected: null, op: null }, { kind: "none" }];
  return [{ ...board, tiles: first.tiles, history: [], selected: null, op: null }, { kind: "reset" }];
}

export function clearSelection(board: Board): Board {
  return { ...board, selected: null, op: null };
}
