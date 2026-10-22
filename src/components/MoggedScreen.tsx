import { useEffect, useRef, useState, type CSSProperties } from "react";
import moggedUrl from "../../mogged.png";
import { sfx } from "../audio/sfx";
import { useFx } from "../fx/FxLayer";
import type { Puzzle } from "../game/puzzles";
import { schedule } from "../lib/schedule";
import { PixelShades } from "./Avatars";
import { EndActions, Solutions, type EndHandlers } from "./End";
import "./End.css";

interface MoggedProps extends EndHandlers {
  puzzle: Puzzle;
  movesMade: number;
}

/**
 * The losing screen. The photo slams in, the camera pushes in on the smallest
 * kid, the shades drop, and the title stamps down. The CSS animation delays in
 * End.css carry the timeline; the sound cues below are timed to match.
 * Any click or key skips straight to the end.
 */
export function MoggedScreen({ puzzle, movesMade, ...handlers }: MoggedProps) {
  const fx = useFx();
  const [skipped, setSkipped] = useState(false);
  const [reveal, setReveal] = useState(false);
  const trombone = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const shadesRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(performance.now());

  // Players are often still mashing keys when time runs out; don't let that skip the show.
  const trySkip = () => {
    if (performance.now() - shownAt.current > 1000) setSkipped(true);
  };

  useEffect(() => rootRef.current?.focus(), []);

  useEffect(() => {
    if (reveal) solutionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [reveal]);

  useEffect(() => {
    if (skipped) {
      if (!trombone.current) {
        trombone.current = true;
        sfx.sadTrombone();
      }
      return;
    }
    const onKey = () => trySkip();
    window.addEventListener("keydown", onKey);
    const cancel = schedule([
      [
        300,
        () => {
          sfx.slam();
          fx.flash();
          fx.shake(1.2);
        },
      ],
      [1050, () => sfx.dramatic()],
      [2450, () => sfx.slideWhistle()],
      [
        2960,
        () => {
          sfx.clink();
          fx.sparksAt(shadesRef.current, { count: 16, colors: ["#ffffff", "#ffd23f"], shapes: ["star"], speed: [2, 7], gravity: 0.04 });
        },
      ],
      [
        3260,
        () => {
          sfx.slam();
          fx.shake(1.8);
        },
      ],
      [
        3520,
        () => {
          trombone.current = true;
          sfx.sadTrombone();
        },
      ],
      [4900, () => setSkipped(true)],
    ]);
    return () => {
      cancel();
      window.removeEventListener("keydown", onKey);
    };
  }, [skipped, fx]);

  const total = puzzle.mode - 1;
  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`end end--mog ${skipped ? "is-skipped" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-title"
      onPointerDown={trySkip}
    >
      <div className="end__rays" aria-hidden="true" />
      <div className="end__body">
        <div className="mog__panel tl">
          <div className="mog__frame">
            <div className="mog__photo tl">
              <img className="mog__img tl" src={moggedUrl} alt="Four kids posing with their competition medals" draggable={false} />
            </div>
            <div className="mog__spot tl" aria-hidden="true" />
            <div className="mog__aura-wrap tl" aria-hidden="true">
              <div className="mog__aura" />
            </div>
            <div className="mog__shades tl" ref={shadesRef} aria-hidden="true">
              <PixelShades />
            </div>
            <p className="mog__bubble bubble bubble--left tl">that got too easy.</p>
          </div>
          <span className="mog__caption caption tl">Meanwhile, at the medal ceremony…</span>
        </div>

        <h1 id="end-title" className="mog__title comic outline" aria-label="Mogged">
          {[..."MOGGED"].map((ch, i) => (
            <span key={i} className="tl" style={{ "--i": i } as CSSProperties} aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>

        <p className="mog__stats tl">
          {puzzle.kind === "scott" ? "Scott finished in" : "Scott's clock ran out at"} <b>{puzzle.scottTime.toFixed(2)}s</b>. You made{" "}
          <b>
            {movesMade} of {total}
          </b>{" "}
          moves.
        </p>

        <div className="mog__actions tl">
          <EndActions puzzle={puzzle} {...handlers} />
          <button className="mog__reveal" onClick={() => setReveal((r) => !r)} aria-expanded={reveal}>
            {reveal ? "Hide" : "Show"} {puzzle.solutionIsScotts ? "Scott's" : "a"} solution
          </button>
          {reveal && (
            <div className="mog__solution" ref={solutionRef}>
              <Solutions puzzle={puzzle} />
            </div>
          )}
          <span className="caption mog__tagline">Same Wu-time, same Wu-channel!</span>
        </div>
      </div>
    </div>
  );
}
