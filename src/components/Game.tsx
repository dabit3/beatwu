import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sfx } from "../audio/sfx";
import { centerOf, useFx } from "../fx/FxLayer";
import { Starburst } from "../fx/Starburst";
import { clearSelection, newBoard, resetBoard, steps, tapOp, tapTile, undo, type Board, type BoardEvent } from "../game/board";
import { createClock } from "../game/clock";
import type { Op } from "../game/math";
import type { Puzzle } from "../game/puzzles";
import { getBest, recordWin } from "../game/storage";
import { schedule } from "../lib/schedule";
import { CardTable, type ExitPlan } from "./CardTable";
import { OpBar, StepsTicker } from "./Controls";
import { HIT_WORDS, MISTAKES, OP_STYLE, pick, WIN_HIT } from "./copy";
import type { EndHandlers } from "./End";
import { GoalPanel, RaceTrack, Timer } from "./Hud";
import { Intro } from "./Intro";
import { MoggedScreen } from "./MoggedScreen";
import { WinScreen } from "./WinScreen";
import "./Game.css";

export type Phase = "intro" | "playing" | "won" | "lost";

interface GameProps extends EndHandlers {
  puzzle: Puzzle;
  fullIntro: boolean;
}

const KEY_OPS: Record<string, Op> = { "+": "+", "=": "+", "-": "-", _: "-", "*": "*", x: "*", X: "*", "/": "/" };

const WIGGLE: Keyframe[] = [0, -10, 9, -7, 5, -2, 0].map((x) => ({ translate: `${x}px 0` }));

export function Game({ puzzle, fullIntro, ...handlers }: GameProps) {
  const fx = useFx();
  const clock = useMemo(() => createClock(), []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [intro, setIntro] = useState(true);
  const [dealt, setDealt] = useState(false);
  const [faceUp, setFaceUp] = useState(false);
  const [board, setBoardState] = useState(() => newBoard(puzzle.cards));
  const [miss, setMiss] = useState(false);
  const [tension, setTension] = useState(false);
  const [result, setResult] = useState<{ time: number; newBest: boolean; prevBest?: number } | null>(null);
  const [showEnd, setShowEnd] = useState(false);

  const phaseRef = useRef<Phase>("intro");
  const boardRef = useRef(board);
  const tileEls = useRef(new Map<string, HTMLElement>());
  const exitPlan = useRef<ExitPlan>({});
  const timers = useRef<Array<() => void>>([]);

  const later = (steps: Array<[number, () => void]>) => timers.current.push(schedule(steps));
  const setBoard = (b: Board) => {
    boardRef.current = b;
    setBoardState(b);
  };
  const toPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(
    () => () => {
      clock.stop();
      timers.current.forEach((cancel) => cancel());
    },
    [clock],
  );

  const win = (at: { x: number; y: number } | null) => {
    const time = clock.stop();
    toPhase("won");
    setTension(false);
    const prevBest = getBest(puzzle.mode, puzzle.kind);
    setResult({ time, newBest: recordWin(puzzle.mode, puzzle.kind, time), prevBest });
    sfx.hit("*", 1.8);
    later([
      [
        90,
        () => {
          if (at) {
            fx.burst(at.x, at.y, WIN_HIT, { size: 330, duration: 1250, aura: true });
            fx.sparks(at.x, at.y, { count: 70, speed: [6, 19], life: [50, 95] });
          }
          fx.flash();
          fx.shake(2.2);
          sfx.win();
        },
      ],
      [1250, () => setShowEnd(true)],
    ]);
  };

  const lose = () => {
    if (phaseRef.current !== "playing") return;
    clock.stop();
    toPhase("lost");
    setTension(false);
    sfx.scottWins();
    fx.flash("#ff3d54");
    fx.shake(1.5);
    later([[1700, () => setShowEnd(true)]]);
  };

  const apply = ([next, ev]: [Board, BoardEvent]) => {
    if (phaseRef.current !== "playing") return;
    if (ev.kind === "combine") {
      const from = tileEls.current.get(ev.flyId)?.getBoundingClientRect();
      const to = tileEls.current.get(ev.intoId)?.getBoundingClientRect();
      exitPlan.current = {
        [ev.flyId]: { kind: "fly", dx: from && to ? to.left - from.left : 0, dy: from && to ? to.top - from.top : 0 },
        [ev.intoId]: { kind: "hit" },
      };
    } else if (ev.kind === "undo" || ev.kind === "reset") {
      exitPlan.current = {};
    }
    setBoard(next);

    switch (ev.kind) {
      case "select":
        return sfx.tap();
      case "deselect":
        return sfx.deselect();
      case "op":
        return sfx.op();
      case "need-card": {
        sfx.error();
        tileEls.current.forEach((el) => el.animate(WIGGLE, { duration: 340 }));
        return;
      }
      case "invalid": {
        const el = tileEls.current.get(ev.id);
        sfx.error();
        el?.animate(WIGGLE, { duration: 380 });
        fx.burstAt(el, MISTAKES[ev.reason], { size: 210, fill: "#ff3d54", color: "#ffffff" });
        return;
      }
      case "combine": {
        const el = tileEls.current.get(ev.intoId);
        const at = el ? centerOf(el) : null;
        const finished = ev.remaining === 1;
        if (finished && ev.result.value === puzzle.goal) return win(at);
        const { fill, color } = finished ? { fill: "#ff3d54", color: "#ffffff" } : OP_STYLE[ev.step.op];
        const big = ev.step.op === "*";
        sfx.hit(ev.step.op, big ? 1.25 : 1);
        if (at)
          later([
            [
              90,
              () => {
                const word = finished ? MISTAKES.miss : pick(HIT_WORDS[ev.step.op]);
                fx.burst(at.x, at.y - 8, word, { fill, color, size: big ? 178 : 158, aura: big && !finished });
                fx.sparks(at.x, at.y, { count: big ? 26 : 16, colors: [fill, "#ffffff", "#ffd23f"] });
                fx.shake(big ? 0.8 : 0.45);
              },
            ],
          ]);
        if (finished) {
          setMiss(true);
          later([[380, () => sfx.error()]]);
        }
        return;
      }
      case "undo":
      case "reset":
        setMiss(false);
        return sfx.whoosh(ev.kind === "reset" ? 0.35 : 0.2);
    }
  };

  // Handlers below are stable; they always call the latest `apply`.
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });

  const onTap = useCallback((id: string) => applyRef.current(tapTile(boardRef.current, id)), []);
  const onOp = useCallback((op: Op) => applyRef.current(tapOp(boardRef.current, op)), []);
  const onUndo = useCallback(() => applyRef.current(undo(boardRef.current)), []);
  const onReset = useCallback(() => applyRef.current(resetBoard(boardRef.current)), []);

  const onDeal = useCallback(() => {
    setDealt(true);
    later(puzzle.cards.map((_, i): [number, () => void] => [80 + i * 60, () => sfx.deal(i)]));
  }, []);

  const onGo = useCallback(() => {
    setFaceUp(true);
    sfx.flip();
    // Start the clock once the cards have finished turning over.
    later([
      [
        260,
        () => {
          clock.start();
          toPhase("playing");
        },
      ],
    ]);
  }, []);

  const onIntroDone = useCallback(() => setIntro(false), []);

  // Scott's clock: tick through the last three seconds, then he finishes.
  useEffect(() => {
    if (phase !== "playing") return;
    let nextTick = puzzle.scottTime - 3;
    return clock.subscribe(() => {
      const t = clock.getSnapshot();
      if (t >= puzzle.scottTime) return lose();
      if (t >= nextTick) {
        const left = puzzle.scottTime - t;
        setTension(true);
        sfx.tick(left <= 1.2);
        nextTick = t + (left <= 1.2 ? 0.25 : 0.5);
      }
    });
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tile = /^[1-9]$/.test(e.key) ? boardRef.current.tiles[Number(e.key) - 1] : undefined;
      if (tile) onTap(tile.id);
      else if (KEY_OPS[e.key]) onOp(KEY_OPS[e.key]);
      else if (e.key === "Backspace" || e.key === "u" || e.key === "z") onUndo();
      else if (e.key === "r" || e.key === "R") onReset();
      else if (e.key === "Escape") setBoard(clearSelection(boardRef.current));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTap, onOp, onUndo, onReset]);

  const movesMade = board.history.length;
  const playing = phase === "playing";

  return (
    <div className={`game game--${phase} ${tension ? "game--tension" : ""}`}>
      <header className="game__bar">
        <button className="btn btn--dark btn--small" onClick={handlers.onMenu}>
          ◂ Menu
        </button>
        <span className="game__title comic">
          Scott Wu <i>vs.</i> You
        </span>
        <span className="game__tag kicker">
          {puzzle.kind === "scott" ? "Scott's deal" : "New deal"} · {puzzle.mode} cards
        </span>
      </header>

      <section className="hud">
        <GoalPanel goal={puzzle.goal} />
        <RaceTrack clock={clock} puzzle={puzzle} phase={phase} yourSteps={movesMade} />
        <Timer clock={clock} scottTime={puzzle.scottTime} />
      </section>

      <section className="table" aria-label="Cards">
        <CardTable
          tiles={dealt ? board.tiles : []}
          selected={board.selected}
          op={board.op}
          faceUp={faceUp}
          missGoal={miss ? puzzle.goal : null}
          disabled={!playing}
          onTap={onTap}
          tileEls={tileEls}
          exitPlan={exitPlan}
        />
        {miss && (
          <p className="table__hint">
            Not quite. <b>Undo</b> or <b>reset</b> and go again!
          </p>
        )}
      </section>

      <section className="controls">
        <OpBar op={board.op} armed={!!board.selected} disabled={!playing} onOp={onOp} />
        <div className="controls__aux">
          <button className={`btn btn--dark btn--small aux ${miss ? "is-nudge" : ""}`} onClick={onUndo} disabled={!playing || !movesMade} aria-label="Undo">
            <UndoIcon />
            <span className="aux__label">Undo</span>
            <kbd>⌫</kbd>
          </button>
          <button className={`btn btn--dark btn--small aux ${miss ? "is-nudge" : ""}`} onClick={onReset} disabled={!playing || !movesMade} aria-label="Reset">
            <ResetIcon />
            <span className="aux__label">Reset</span>
            <kbd>R</kbd>
          </button>
        </div>
      </section>

      <StepsTicker steps={steps(board)} total={puzzle.mode - 1} />

      {intro && <Intro puzzle={puzzle} full={fullIntro} onDeal={onDeal} onGo={onGo} onDone={onIntroDone} />}
      {phase === "lost" && !showEnd && <TimeUp text={puzzle.kind === "scott" ? "Scott finished!" : "Too slow!"} />}
      {phase === "won" && showEnd && result && <WinScreen puzzle={puzzle} {...result} steps={steps(board)} {...handlers} />}
      {phase === "lost" && showEnd && <MoggedScreen puzzle={puzzle} movesMade={movesMade} {...handlers} />}
    </div>
  );
}

/** Shown instead of the Undo/Reset labels when the controls squeeze into one row on small screens. */
function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5 4 10l5 5" />
      <path d="M4 10h10.5a5 5 0 0 1 0 10H11" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4 4v4h4" />
    </svg>
  );
}

function TimeUp({ text }: { text: string }) {
  return (
    <div className="timeup" role="alert">
      <div className="timeup__band">
        <span className="comic">{text}</span>
      </div>
      <div className="timeup__burst">
        <Starburst fill="#ffd23f" points={14} seed={13} />
        <span className="comic outline">TIME!</span>
      </div>
    </div>
  );
}
