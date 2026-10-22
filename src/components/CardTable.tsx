import { AnimatePresence, motion, type Variants } from "motion/react";
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref, type RefObject } from "react";
import type { Tile } from "../game/board";
import { cardName, isRed } from "../game/cards";
import { formatNumber, type Op } from "../game/math";
import { OpGlyph } from "./Controls";

/** How each card leaves the table: flying into its partner, or bursting where it was hit. */
export type ExitPlan = Record<string, { kind: "fly"; dx: number; dy: number } | { kind: "hit" }>;

type Enter = "deal" | "result" | "restore";

interface CardTableProps {
  tiles: Tile[];
  selected: string | null;
  op: Op | null;
  faceUp: boolean;
  missGoal: number | null;
  disabled: boolean;
  onTap: (id: string) => void;
  tileEls: RefObject<Map<string, HTMLElement>>;
  exitPlan: RefObject<ExitPlan>;
}

export function CardTable({ tiles, selected, op, faceUp, missGoal, disabled, onTap, tileEls, exitPlan }: CardTableProps) {
  // Updated only after commit, so both StrictMode renders agree on how each card enters.
  const seen = useRef(new Set<string>());
  const dealt = useRef(false);
  useLayoutEffect(() => {
    tiles.forEach((t) => seen.current.add(t.id));
    if (tiles.length) dealt.current = true;
  }, [tiles]);

  return (
    <div className={`cards ${selected && op ? "is-aiming" : ""}`} data-count={tiles.length}>
      <AnimatePresence mode="popLayout" custom={exitPlan.current}>
        {tiles.map((tile, i) => (
          <CardButton
            key={tile.id}
            tile={tile}
            index={i}
            enter={!dealt.current ? "deal" : tile.formula && !seen.current.has(tile.id) ? "result" : "restore"}
            selected={selected === tile.id}
            target={!!selected && !!op && selected !== tile.id}
            op={op}
            faceUp={faceUp}
            missGoal={tiles.length === 1 ? missGoal : null}
            disabled={disabled}
            onTap={onTap}
            tileEls={tileEls}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface CardButtonProps {
  tile: Tile;
  index: number;
  enter: Enter;
  selected: boolean;
  target: boolean;
  op: Op | null;
  faceUp: boolean;
  missGoal: number | null;
  disabled: boolean;
  onTap: (id: string) => void;
  tileEls: RefObject<Map<string, HTMLElement>>;
  /** Injected by AnimatePresence so it can pin exiting cards in place. */
  ref?: Ref<HTMLButtonElement>;
}

const spring = { type: "spring", stiffness: 560, damping: 30 } as const;

const CardButton = memo(function CardButton(props: CardButtonProps) {
  const { tile, index, selected, target, op, faceUp, missGoal, disabled, onTap, tileEls, ref } = props;
  // How this card arrived never changes, and its entrance timing applies only to its first animation.
  const [enter] = useState(props.enter);
  const [slot] = useState(index);
  const [entered, setEntered] = useState(enter === "restore");

  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      if (el) tileEls.current.set(tile.id, el);
      else tileEls.current.delete(tile.id);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref, tile.id, tileEls],
  );

  const variants = useMemo<Variants>(() => {
    const tilt = (slot % 2 ? 1 : -1) * (12 + ((slot * 7) % 13));
    return {
      deal: { y: -260, x: (slot - 4) * -18, rotate: tilt, opacity: 0, scale: 0.85 },
      result: { scale: 0.2, rotate: -16, opacity: 0 },
      restore: { scale: 0.55, opacity: 0 },
      idle: { y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 },
      selected: { y: -16, x: 0, rotate: -3, scale: 1.06, opacity: 1 },
      exit: (plan?: ExitPlan) => {
        const p = plan?.[tile.id];
        if (p?.kind === "fly")
          return { x: p.dx, y: p.dy, rotate: 18, scale: 0.9, opacity: [1, 1, 0], zIndex: 5, transition: { duration: 0.17, ease: "easeIn" } };
        if (p?.kind === "hit") return { scale: 1.3, opacity: 0, transition: { duration: 0.12, delay: 0.08 } };
        return { scale: 0.5, opacity: 0, transition: { duration: 0.16 } };
      },
    };
  }, [slot, tile.id]);

  const transition = entered
    ? spring
    : enter === "deal"
      ? { ...spring, stiffness: 300, damping: 22, delay: 0.05 + slot * 0.06 }
      : { ...spring, damping: 16, delay: 0.1 };

  const label = tile.card ? `${cardName(tile.card)}, ${tile.value}` : `${tile.value}, made from ${tile.formula}`;

  return (
    <motion.button
      ref={setRef}
      layout
      variants={variants}
      initial={enter}
      animate={selected ? "selected" : "idle"}
      exit="exit"
      transition={{ ...transition, layout: spring }}
      onAnimationComplete={() => setEntered(true)}
      className={`card ${tile.card ? "card--dealt" : "card--result"} ${selected ? "is-selected" : ""} ${target ? "is-target" : ""} ${missGoal !== null ? "is-miss" : ""}`}
      style={{ "--digits": formatNumber(tile.value).length } as CSSProperties}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onTap(tile.id)}
    >
      <span className={`card__flip ${faceUp ? "" : "is-down"}`}>
        <Face tile={tile} />
        <span className="card__back" aria-hidden="true">
          <span className="comic">?</span>
        </span>
      </span>
      {faceUp && index < 9 && <span className="card__key">{index + 1}</span>}
      {target && op && (
        <span className="card__aim">
          <OpGlyph op={op} />
        </span>
      )}
      {missGoal !== null && <span className="card__stamp comic">Not {missGoal}!</span>}
    </motion.button>
  );
});

function Face({ tile }: { tile: Tile }) {
  if (tile.card) {
    const { rank, suit } = tile.card;
    return (
      <span className={`face face--dealt ${isRed(suit) ? "is-red" : ""}`}>
        <span className="face__corner">
          <b>{rank}</b>
          <i>{suit}</i>
        </span>
        <span className="face__value num">{tile.value}</span>
        <span className="face__suit">{suit}</span>
        <span className="face__corner face__corner--end">
          <b>{rank}</b>
          <i>{suit}</i>
        </span>
      </span>
    );
  }
  return (
    <span className="face face--result">
      <span className="face__formula">{tile.formula}</span>
      <span className="face__value num outline">{formatNumber(tile.value)}</span>
    </span>
  );
}
