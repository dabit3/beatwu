import { useEffect } from "react";
import { formatStep, type Step } from "../game/math";
import type { Puzzle } from "../game/puzzles";

export interface EndHandlers {
  onRematch: () => void;
  onSwitchMode: () => void;
  onNewDeal: () => void;
  onMenu: () => void;
}

export function EndActions({ puzzle, onRematch, onSwitchMode, onNewDeal, onMenu }: EndHandlers & { puzzle: Puzzle }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      if (e.key === "Enter") onRematch();
      else if (e.key === "Escape") onMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRematch, onMenu]);

  return (
    <div className="end__actions">
      <button className="btn btn--red" onClick={onRematch}>
        {puzzle.kind === "random" ? "Deal again" : "Rematch"} <kbd>Enter</kbd>
      </button>
      {puzzle.kind === "scott" && (
        <button className="btn btn--cyan" onClick={onNewDeal}>
          New deal
        </button>
      )}
      <button className="btn btn--paper" onClick={onSwitchMode}>
        Try {puzzle.mode === 8 ? 9 : 8} cards
      </button>
      <button className="btn btn--dark" onClick={onMenu}>
        Menu
      </button>
    </div>
  );
}

export function Solutions({ puzzle, yours }: { puzzle: Puzzle; yours?: Step[] }) {
  return (
    <div className="solutions">
      {yours && <SolutionList title="Your moves" steps={yours} />}
      <SolutionList
        title={puzzle.solutionIsScotts ? "Scott's moves" : "One way to do it"}
        steps={puzzle.solution}
        times={puzzle.solutionIsScotts ? puzzle.scottPace : undefined}
        accent
      />
    </div>
  );
}

function SolutionList({ title, steps, times, accent }: { title: string; steps: Step[]; times?: number[]; accent?: boolean }) {
  return (
    <section className={`solution ${accent ? "solution--accent" : ""}`}>
      <h3 className="kicker">{title}</h3>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            {times && <span className="solution__t">{times[i].toFixed(1)}s</span>}
            {formatStep(s)}
          </li>
        ))}
      </ol>
    </section>
  );
}
