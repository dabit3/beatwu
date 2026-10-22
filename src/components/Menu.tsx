import { useEffect, type CSSProperties } from "react";
import { sfx } from "../audio/sfx";
import { Starburst } from "../fx/Starburst";
import { isRed, type PlayingCard } from "../game/cards";
import { SCOTT_RUNS, type DealKind, type Mode } from "../game/puzzles";
import { getBest } from "../game/storage";
import { ScottAvatar } from "./Avatars";
import "./Menu.css";

interface MenuProps {
  kind: DealKind;
  onKind: (kind: DealKind) => void;
  onPlay: (mode: Mode) => void;
}

export function Menu({ kind, onKind, onPlay }: MenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "8" || e.key === "9") onPlay(Number(e.key) as Mode);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPlay]);

  const choose = (k: DealKind) => {
    if (k !== kind) sfx.tap();
    onKind(k);
  };

  return (
    <div className="menu">
      <h1 className="logo" aria-label="Scott Wu versus You">
        <span className="logo__line logo__scott comic outline" aria-hidden="true">
          SCOTT WU
        </span>
        <span className="logo__row" aria-hidden="true">
          <span className="logo__vs">
            <Starburst fill="#ff3d54" points={12} seed={9} />
            <span className="comic outline">VS.</span>
          </span>
          <span className="logo__line logo__you comic outline">YOU</span>
        </span>
        <span className="logo__ribbon comic" aria-hidden="true">
          The Card Challenge
        </span>
      </h1>

      <div className="pitch">
        <ScottAvatar size={64} />
        <p className="bubble bubble--left">“You take 8 cards and you make the current year.”</p>
      </div>

      <div className="deal" role="radiogroup" aria-label="Which cards">
        <button role="radio" aria-checked={kind === "scott"} onClick={() => choose("scott")}>
          <span className="comic">Scott's deal</span>
          <small>His exact cards from the video</small>
        </button>
        <button role="radio" aria-checked={kind === "random"} onClick={() => choose("random")}>
          <span className="comic">New deal</span>
          <small>Fresh cards, always solvable</small>
        </button>
      </div>

      <div className="modes">
        {([8, 9] as Mode[]).map((mode) => (
          <ModeCard key={mode} mode={mode} kind={kind} onPlay={() => onPlay(mode)} />
        ))}
      </div>

      <ol className="how">
        <li>
          <b>1</b> Tap a card
        </li>
        <li>
          <b>2</b> Tap + − × ÷
        </li>
        <li>
          <b>3</b> Tap another card
        </li>
        <li className="how__goal">
          <b>!</b> Use every card and hit the goal before Scott's time runs out
        </li>
      </ol>
    </div>
  );
}

function ModeCard({ mode, kind, onPlay }: { mode: Mode; kind: DealKind; onPlay: () => void }) {
  const run = SCOTT_RUNS[mode];
  const best = getBest(mode, kind);
  const goal = kind === "scott" || mode === 8 ? String(run.goal) : "????";
  return (
    <button className={`mode mode--${mode}`} onClick={onPlay}>
      <span className="mode__fan" aria-hidden="true">
        {run.cards.map((c, i) => (
          <MiniCard key={i} card={kind === "scott" ? c : undefined} i={i} n={mode} />
        ))}
      </span>
      <span className="mode__count">
        <b className="comic outline">{mode}</b>
        <span className="comic">cards</span>
      </span>
      <span className="mode__goal">
        <span className="kicker">Make</span>
        <b className="num">{goal}</b>
      </span>
      <span className="mode__meta">
        <ScottAvatar size={24} />
        <span>
          Scott<span className="mode__label-long">'s time</span>
        </span>
        <b>{run.time.toFixed(1)}s</b>
      </span>
      <span className="mode__foot">
        <span className="mode__play comic">
          Play <kbd>{mode}</kbd>
        </span>
        <span className="mode__best">
          Your best <b>{best ? `${best.toFixed(2)}s` : "—"}</b>
        </span>
      </span>
    </button>
  );
}

function MiniCard({ card, i, n }: { card?: PlayingCard; i: number; n: number }) {
  const style = { "--i": i, "--mid": (n - 1) / 2 } as CSSProperties;
  if (!card) return <span className="mini mini--back" style={style} />;
  return (
    <span className={`mini ${isRed(card.suit) ? "is-red" : ""}`} style={style}>
      {card.rank}
      <i>{card.suit}</i>
    </span>
  );
}
