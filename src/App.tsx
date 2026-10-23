import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { music } from "./audio/music";
import { sfx } from "./audio/sfx";
import { Backdrop, SoundButton, useSpinTransition, type SoundMode } from "./components/Chrome";
import { Game } from "./components/Game";
import { Menu } from "./components/Menu";
import { FxProvider } from "./fx/FxLayer";
import { makePuzzle, type DealKind, type Mode, type Puzzle } from "./game/puzzles";
import { getMusic, getMuted, setMusic as saveMusic, setMuted as saveMuted } from "./game/storage";

type View = { name: "menu" } | { name: "game"; puzzle: Puzzle; round: number; fullIntro: boolean };

export default function App() {
  const stageRef = useRef<HTMLElement>(null);
  const round = useRef(0);
  const [view, setView] = useState<View>({ name: "menu" });
  const [kind, setKind] = useState<DealKind>("scott");
  const [muted, setMuted] = useState(getMuted);
  const [musicOn, setMusicOn] = useState(getMusic);
  const transition = useSpinTransition();

  useEffect(() => {
    sfx.setMuted(muted);
    saveMuted(muted);
  }, [muted]);

  useEffect(() => saveMusic(musicOn), [musicOn]);
  useEffect(() => music.setEnabled(musicOn && !muted), [musicOn, muted]);

  useEffect(() => {
    // Mobile browsers only allow audio to start from a finished tap (pointerup/touchend), not a touch-down.
    const events = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
    const unlock = () => {
      sfx.unlock();
      music.unlock();
    };
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  const play = useCallback(
    (mode: Mode, dealKind: DealKind, fullIntro: boolean) => {
      setKind(dealKind);
      transition.go(() => setView({ name: "game", puzzle: makePuzzle(mode, dealKind), round: ++round.current, fullIntro }));
    },
    [transition.go],
  );

  const toMenu = useCallback(() => transition.go(() => setView({ name: "menu" })), [transition.go]);
  const onPlayFromMenu = useCallback((mode: Mode) => play(mode, kind, true), [play, kind]);

  const sound: SoundMode = muted ? "off" : musicOn ? "all" : "sfx";
  const setSound = (mode: SoundMode) => {
    setMuted(mode === "off");
    setMusicOn(mode === "all");
  };

  return (
    <MotionConfig reducedMotion="user">
      <FxProvider shakeRef={stageRef}>
        <main className="stage" ref={stageRef}>
          <Backdrop />
          {view.name === "menu" ? (
            <Menu kind={kind} onKind={setKind} onPlay={onPlayFromMenu} />
          ) : (
            <Game
              key={view.round}
              puzzle={view.puzzle}
              fullIntro={view.fullIntro}
              onRematch={() => play(view.puzzle.mode, view.puzzle.kind, false)}
              onSwitchMode={() => play(view.puzzle.mode === 8 ? 9 : 8, view.puzzle.kind, true)}
              onNewDeal={() => play(view.puzzle.mode, "random", false)}
              onMenu={toMenu}
            />
          )}
        </main>
        <SoundButton mode={sound} onChange={setSound} />
        {transition.overlay}
      </FxProvider>
    </MotionConfig>
  );
}
