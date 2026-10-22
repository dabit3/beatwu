import { AnimatePresence, motion } from "motion/react";
import type { Op, Step } from "../game/math";
import { formatStep, OP_NAME } from "../game/math";

const OP_LIST: { op: Op; cls: string; key: string }[] = [
  { op: "+", cls: "plus", key: "+" },
  { op: "-", cls: "minus", key: "−" },
  { op: "*", cls: "times", key: "×" },
  { op: "/", cls: "divide", key: "/" },
];

/** Drawn glyphs: comic fonts render math symbols small and uneven. */
export function OpGlyph({ op }: { op: Op }) {
  const bar = <rect x="4" y="13" width="24" height="6" rx="3" />;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {op === "+" && (
        <>
          {bar}
          <rect x="13" y="4" width="6" height="24" rx="3" />
        </>
      )}
      {op === "-" && bar}
      {op === "*" && (
        <g transform="rotate(45 16 16)">
          {bar}
          <rect x="13" y="4" width="6" height="24" rx="3" />
        </g>
      )}
      {op === "/" && (
        <>
          {bar}
          <circle cx="16" cy="6.5" r="3.4" />
          <circle cx="16" cy="25.5" r="3.4" />
        </>
      )}
    </svg>
  );
}

interface OpBarProps {
  op: Op | null;
  armed: boolean;
  disabled: boolean;
  onOp: (op: Op) => void;
}

export function OpBar({ op, armed, disabled, onOp }: OpBarProps) {
  return (
    <div className={`ops ${armed ? "is-armed" : ""}`} role="group" aria-label="Operators">
      {OP_LIST.map(({ op: o, cls, key }) => (
        <button
          key={o}
          className={`op op--${cls}`}
          aria-pressed={op === o}
          aria-label={OP_NAME[o]}
          title={`${OP_NAME[o]} (${key})`}
          disabled={disabled}
          onClick={() => onOp(o)}
        >
          <OpGlyph op={o} />
        </button>
      ))}
    </div>
  );
}

export function StepsTicker({ steps, total }: { steps: Step[]; total: number }) {
  return (
    <div className="ticker">
      <span className="ticker__count kicker">
        Moves <b>{steps.length}</b>/{total}
      </span>
      <ol className="ticker__list" aria-live="polite">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.li
              key={`${i}:${formatStep(s)}`}
              className="ticker__step"
              initial={{ opacity: 0, x: 24, scale: 0.7, rotate: -6 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotate: i % 2 ? 1.5 : -1.5 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 520, damping: 24 }}
            >
              {formatStep(s)}
            </motion.li>
          ))}
        </AnimatePresence>
        {!steps.length && <li className="ticker__empty">Your moves show up here</li>}
      </ol>
    </div>
  );
}
