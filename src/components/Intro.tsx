import { useEffect, useState } from "react";
import { sfx } from "../audio/sfx";
import { Starburst } from "../fx/Starburst";
import type { Puzzle } from "../game/puzzles";
import { schedule } from "../lib/schedule";
import { ScottAvatar, YouAvatar } from "./Avatars";

type Stage = "vs" | 3 | 2 | 1 | "go";

interface IntroProps {
  puzzle: Puzzle;
  full: boolean;
  /** Countdown starts: deal the cards face down. */
  onDeal: () => void;
  /** "GO!": flip the cards and start the clock. */
  onGo: () => void;
  /** The overlay has faded out. */
  onDone: () => void;
}

const VS_TIME = 2100;
const BEAT = 680;

export function Intro({ puzzle, full, onDeal, onGo, onDone }: IntroProps) {
  const [stage, setStage] = useState<Stage>(full ? "vs" : 3);

  useEffect(() => {
    const start = full ? VS_TIME : 120;
    const count = (n: 3 | 2 | 1) => () => {
      setStage(n);
      sfx.count();
    };
    return schedule([
      ...(full
        ? ([
            [80, () => sfx.whoosh(0.5)],
            [520, () => sfx.slam()],
          ] as [number, () => void][])
        : []),
      [start - 120, onDeal],
      [start, count(3)],
      [start + BEAT, count(2)],
      [start + BEAT * 2, count(1)],
      [
        start + BEAT * 3,
        () => {
          setStage("go");
          sfx.go();
          onGo();
        },
      ],
      [start + BEAT * 3 + 650, onDone],
    ]);
    // The intro runs once per round; Game remounts this for every new round.
  }, []);

  if (stage === "vs") {
    return (
      <div className="intro intro--vs">
        <div className="vs__side vs__side--scott">
          <ScottAvatar size={168} />
          <h2 className="comic outline">Scott Wu</h2>
          <p className="kicker">Cognition CEO</p>
          <p className="vs__time num">{puzzle.scottTime.toFixed(2)}s</p>
        </div>
        <div className="vs__side vs__side--you">
          <YouAvatar size={168} />
          <h2 className="comic outline">You</h2>
          <p className="kicker">The challenger</p>
          <p className="vs__time num">??.??s</p>
        </div>
        <div className="vs__badge">
          <Starburst fill="#ffd23f" points={13} seed={4} />
          <span className="comic outline">VS</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`intro intro--count ${stage === "go" ? "is-go" : ""}`}>
      <div className="count__top">
        <span className="caption">Meanwhile, at the pub…</span>
        <div className="count__goal">
          <span className="kicker">Make</span>
          <b className="num outline">{puzzle.goal}</b>
          <span className="kicker">with all {puzzle.mode} cards</span>
        </div>
      </div>
      <div key={stage} className={`count__num ${stage === "go" ? "count__num--go" : ""}`}>
        <Starburst fill={stage === "go" ? "#23d18b" : stage === 1 ? "#ff3d54" : "#ffd23f"} points={stage === "go" ? 16 : 12} seed={Number(stage) || 77} />
        <span className="comic outline">{stage === "go" ? "GO!" : stage}</span>
      </div>
    </div>
  );
}
