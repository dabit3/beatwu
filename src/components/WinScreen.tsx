import { useEffect, useMemo, useRef } from "react";
import { music } from "../audio/music";
import { sfx } from "../audio/sfx";
import { useFx } from "../fx/FxLayer";
import type { Step } from "../game/math";
import type { Puzzle } from "../game/puzzles";
import { schedule } from "../lib/schedule";
import { ScottAvatar, YouAvatar } from "./Avatars";
import { ClipLink } from "./Chrome";
import { HOLY, PARTY, pick } from "./copy";
import { EndActions, Solutions, type EndHandlers } from "./End";
import { formatTime } from "./Hud";
import "./End.css";

interface WinProps extends EndHandlers {
  puzzle: Puzzle;
  time: number;
  newBest: boolean;
  prevBest?: number;
  steps: Step[];
}

export function WinScreen({ puzzle, time, newBest, prevBest, steps, ...handlers }: WinProps) {
  const fx = useFx();
  const holy = useMemo(() => pick(HOLY), []);

  useEffect(
    () =>
      schedule([
        [60, () => fx.confetti()],
        [700, () => fx.confetti()],
        ...PARTY.map((word, i): [number, () => void] => [
          320 + i * 260,
          () => {
            const side = i % 2 ? 0.85 : 0.15;
            fx.burst(innerWidth * (side + (Math.random() - 0.5) * 0.1), innerHeight * (0.2 + Math.random() * 0.55), word, {
              size: 125 + Math.random() * 45,
              fill: pick(["#ffd23f", "#22d3ee", "#ff4fa3", "#23d18b"]),
              aura: true,
            });
            sfx.hit(i % 2 ? "+" : "*", 0.7);
          },
        ]),
        // The band comes back once the party bursts are done.
        [320 + PARTY.length * 260 + 400, () => music.setScene("results")],
      ]),
    [fx],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => rootRef.current?.focus(), []);

  const delta = puzzle.scottTime - time;
  return (
    <div ref={rootRef} tabIndex={-1} className="end end--win" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="end__rays" aria-hidden="true" />
      <div className="end__body">
        <span className="caption end__holy">{holy}</span>
        <h1 id="end-title" className="win__title comic outline">
          You beat
          <br />
          Scott Wu!
        </h1>
        <div className="win__score">
          <div className="win__side win__side--you">
            <YouAvatar size={60} />
            <span className="kicker">You</span>
            <b className="num">{formatTime(time)}s</b>
          </div>
          <span className="win__vs comic outline">VS</span>
          <div className="win__side win__side--scott">
            <ScottAvatar size={60} />
            <span className="kicker">Scott</span>
            <b className="num">{formatTime(puzzle.scottTime)}s</b>
          </div>
        </div>
        <p className="win__delta">
          <b>
            <span className="nocase">{delta.toFixed(2)}s</span> faster
          </b>
          {newBest ? <span className="win__best comic">New best!</span> : prevBest !== undefined && <span>Your best: {prevBest.toFixed(2)}s</span>}
        </p>
        <EndActions puzzle={puzzle} {...handlers} />
        <div className="scott-says">
          <ScottAvatar size={46} />
          <div className="bubble bubble--left">
            <p>Cheers.</p>
            <ClipLink label="Watch his run" />
          </div>
        </div>
        <Solutions puzzle={puzzle} yours={steps} />
      </div>
    </div>
  );
}
