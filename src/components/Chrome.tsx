import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../audio/sfx";
import { Starburst } from "../fx/Starburst";
import { CLIP_URL } from "./copy";

/** A quiet credit link to swyx's post with the original clip of Scott playing. */
export function ClipLink({ label = "Watch the clip", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      className={`clip-link ${className}`}
      href={CLIP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Watch the original clip of Scott on X, posted by @swyx (opens in a new tab)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
      <span className="clip-link__label">{label}</span>
      <span className="clip-link__by">@swyx</span>
    </a>
  );
}

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__rays" />
      <div className="backdrop__dots" />
    </div>
  );
}

export type SoundMode = "all" | "sfx" | "off";

const SOUND: Record<SoundMode, { next: SoundMode; label: string; toast: string }> = {
  all: { next: "sfx", label: "Music and sound on. Turn off the music", toast: "Music on" },
  sfx: { next: "off", label: "Music off, sound on. Mute all sound", toast: "Music off" },
  off: { next: "all", label: "Sound muted. Turn on sound and music", toast: "Muted" },
};

/** One button cycles: music and sound effects, sound effects only, muted. A short label names each change. */
export function SoundButton({ mode, onChange }: { mode: SoundMode; onChange: (mode: SoundMode) => void }) {
  const [toast, setToast] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(0), 1500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const cycle = () => {
    onChange(SOUND[mode].next);
    setToast((n) => n + 1);
  };

  return (
    <div className="sound">
      <span className="sound__toast" role="status">
        {toast > 0 && <span key={toast}>{SOUND[mode].toast}</span>}
      </span>
      <button className="mute" onClick={cycle} aria-label={SOUND[mode].label}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor" />
          {mode === "off" && <path d="M16 9.5l5 5M21 9.5l-5 5" />}
          {mode === "sfx" && (
            <>
              <path d="M15.5 9a4 4 0 0 1 0 6" />
              <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
            </>
          )}
          {mode === "all" && (
            <>
              <path d="M19.6 16.2V5.6l3 1.6" />
              <ellipse cx="17.4" cy="16.6" rx="2.6" ry="2.1" transform="rotate(-18 17.4 16.6)" fill="currentColor" stroke="none" />
            </>
          )}
        </svg>
      </button>
    </div>
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
