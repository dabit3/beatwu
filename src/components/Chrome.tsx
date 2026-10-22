import { useCallback, useRef, useState } from "react";
import { sfx } from "../audio/sfx";
import { Starburst } from "../fx/Starburst";

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__rays" />
      <div className="backdrop__dots" />
    </div>
  );
}

export function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button className="mute" onClick={onToggle} aria-label={muted ? "Unmute sound" : "Mute sound"} aria-pressed={muted}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        ) : (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        )}
      </svg>
    </button>
  );
}

const SWAP_AT = 400;
const DURATION = 820;

/**
 * Scene changes spin a starburst toward the camera, swap the scene while it
 * covers the screen, then spin it away.
 */
export function useSpinTransition() {
  const [run, setRun] = useState(0);
  const busy = useRef(false);

  const go = useCallback((swap: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setRun((n) => n + 1);
    sfx.whoosh(0.7);
    window.setTimeout(swap, SWAP_AT);
    window.setTimeout(() => {
      busy.current = false;
      setRun(0);
    }, DURATION);
  }, []);

  const overlay = run ? (
    <div key={run} className="spin" aria-hidden="true">
      <div className="spin__emblem">
        <Starburst fill="#ffd23f" points={16} seed={66} strokeWidth={4} />
        <span>!</span>
      </div>
    </div>
  ) : null;

  return { go, overlay };
}
