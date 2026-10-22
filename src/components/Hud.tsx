import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties, type ReactNode, type Ref } from "react";
import { sfx } from "../audio/sfx";
import { useFx } from "../fx/FxLayer";
import type { Clock } from "../game/clock";
import type { Puzzle } from "../game/puzzles";
import { ScottAvatar, YouAvatar } from "./Avatars";
import { pick, SCOTT_HITS, scottLines } from "./copy";
import type { Phase } from "./Game";

const useClock = (clock: Clock) => useSyncExternalStore(clock.subscribe, clock.getSnapshot);

export const formatTime = (t: number) => t.toFixed(2).padStart(5, "0");

export function GoalPanel({ goal }: { goal: number }) {
  return (
    <div className="goal">
      <span className="kicker">Make</span>
      <b className="goal__num num outline">{goal}</b>
    </div>
  );
}

export function Timer({ clock, scottTime }: { clock: Clock; scottTime: number }) {
  const t = useClock(clock);
  const left = scottTime - t;
  const state = t === 0 ? "idle" : left <= 3 ? "danger" : left <= 6 ? "warn" : "ok";
  return (
    <div className={`timer timer--${state}`}>
      <span className="kicker">Your time</span>
      <b className="timer__num" aria-label={`${t.toFixed(1)} seconds`}>
        {formatTime(t)}
      </b>
      <span className="timer__scott">
        <ScottAvatar size={22} /> Scott <b>{scottTime.toFixed(2)}</b>
      </span>
    </div>
  );
}

interface RaceProps {
  clock: Clock;
  puzzle: Puzzle;
  phase: Phase;
  yourSteps: number;
}

/**
 * Two lanes. Scott's runner jumps forward at the moments he finished each
 * move in the video. Yours jumps when you finish a move. The fuse under them
 * burns down to Scott's final time.
 */
export function RaceTrack({ clock, puzzle, phase, yourSteps }: RaceProps) {
  const fx = useFx();
  const t = useClock(clock);
  const total = puzzle.mode - 1;
  const scottSteps = phase === "lost" ? total : puzzle.scottPace.filter((p) => p <= t).length;
  const scottRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    if (scottSteps > shown.current && phase !== "intro") {
      sfx.scottMove();
      fx.burstAt(scottRef.current, pick(SCOTT_HITS), { size: 84, fill: "#ffffff", color: "#ff3d54", duration: 640 });
    }
    shown.current = scottSteps;
  }, [scottSteps, phase, fx]);

  const lines = useMemo(() => scottLines(puzzle), [puzzle]);
  const line = phase === "playing" ? lines.findLast((l) => t >= l.at && t < l.at + 3.3) : undefined;
  const thinking = phase === "playing" && scottSteps === 0 && !line;
  const fuse = Math.min(t / puzzle.scottTime, 1);

  return (
    <div className={`race ${fuse > 0.75 ? "race--hot" : ""}`}>
      <Lane who="scott" label="Scott" steps={scottSteps} total={total} avatar={<ScottAvatar size={40} />} runnerRef={scottRef}>
        {line && (
          <p key={line.text} className="bubble bubble--down race__bubble">
            {line.text}
          </p>
        )}
        {thinking && (
          <span className="race__think" aria-label="Scott is thinking">
            <i />
            <i />
            <i />
          </span>
        )}
      </Lane>
      <Lane who="you" label="You" steps={phase === "won" ? total : yourSteps} total={total} avatar={<YouAvatar size={40} />} />
      <div className="fuse" style={{ "--p": fuse } as CSSProperties}>
        <span className="fuse__track">
          <span className="fuse__burn" />
          {fuse > 0 && fuse < 1 && <span className="fuse__spark" />}
        </span>
        <span className="fuse__label kicker">
          Scott finishes at <b>{puzzle.scottTime.toFixed(1)}s</b>
        </span>
      </div>
    </div>
  );
}

interface LaneProps {
  who: "scott" | "you";
  label: string;
  steps: number;
  total: number;
  avatar: ReactNode;
  runnerRef?: Ref<HTMLSpanElement>;
  children?: ReactNode;
}

function Lane({ who, label, steps, total, avatar, runnerRef, children }: LaneProps) {
  return (
    <div className={`lane lane--${who}`}>
      <span className="lane__label kicker">{label}</span>
      <span className="lane__track">
        <span className="lane__fill" style={{ width: `${(steps / total) * 100}%` }} />
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`lane__pip ${i < steps ? "is-done" : ""}`} style={{ left: `${((i + 1) / total) * 100}%` }} />
        ))}
        <span className="lane__flag" aria-hidden="true" />
        <span className="lane__runner" ref={runnerRef} style={{ left: `${(steps / total) * 100}%` }}>
          {avatar}
          {children}
        </span>
      </span>
      <span className="sr-only">
        {label}: {steps} of {total} moves
      </span>
    </div>
  );
}
