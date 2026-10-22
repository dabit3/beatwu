import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ParticleEngine, type EmitOptions } from "./particles";
import { Starburst } from "./Starburst";
import "./fx.css";

export interface BurstOptions {
  size?: number;
  fill?: string;
  color?: string;
  rotate?: number;
  duration?: number;
}

interface BurstSpec {
  id: number;
  x: number;
  y: number;
  word: string;
  size: number;
  fill: string;
  color: string;
  rotate: number;
  duration: number;
}

export interface Fx {
  burst(x: number, y: number, word: string, o?: BurstOptions): void;
  burstAt(el: Element | null | undefined, word: string, o?: BurstOptions): void;
  sparks(x: number, y: number, o?: EmitOptions): void;
  sparksAt(el: Element | null | undefined, o?: EmitOptions): void;
  confetti(): void;
  flash(color?: string): void;
  shake(power?: number): void;
}

const FxContext = createContext<Fx | null>(null);

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Bangers glyphs run about 0.47em wide; keep the word inside the burst's inner ring. */
const fontSize = (word: string, size: number) => size * Math.min(0.34, 0.86 / (word.length * 0.47));

export function FxProvider({ shakeRef, children }: { shakeRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ParticleEngine | null>(null);
  const nextId = useRef(0);
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const [flash, setFlash] = useState<{ id: number; color: string } | null>(null);

  useEffect(() => {
    const e = new ParticleEngine(canvasRef.current!);
    engine.current = e;
    return () => e.destroy();
  }, []);

  const fx = useMemo<Fx>(() => {
    const burst: Fx["burst"] = (x, y, word, o = {}) => {
      const id = ++nextId.current;
      const spec: BurstSpec = {
        id,
        x,
        y,
        word,
        size: o.size ?? 150,
        fill: o.fill ?? "#ffd23f",
        color: o.color ?? "#ff3d54",
        rotate: o.rotate ?? Math.random() * 26 - 13,
        duration: o.duration ?? 760,
      };
      setBursts((all) => [...all.slice(-14), spec]);
      window.setTimeout(() => setBursts((all) => all.filter((s) => s.id !== id)), spec.duration + 60);
    };
    return {
      burst,
      burstAt(el, word, o) {
        if (!el) return;
        const c = centerOf(el);
        burst(c.x, c.y, word, o);
      },
      sparks: (x, y, o) => engine.current?.emit(x, y, o),
      sparksAt(el, o) {
        if (!el) return;
        const c = centerOf(el);
        engine.current?.emit(c.x, c.y, o);
      },
      confetti: () => engine.current?.confetti(),
      flash: (color = "#ffffff") => setFlash({ id: ++nextId.current, color }),
      shake(power = 1) {
        const el = shakeRef.current;
        if (!el || prefersReducedMotion()) return;
        const frames: Keyframe[] = [];
        for (let i = 0; i < 7; i++) {
          const k = (1 - i / 7) * power;
          const r = () => Math.random() * 2 - 1;
          frames.push({ transform: `translate(${r() * 10 * k}px, ${r() * 10 * k}px) rotate(${r() * 0.8 * k}deg)` });
        }
        frames.push({ transform: "none" });
        el.animate(frames, { duration: 260 + 140 * power, easing: "ease-out" });
      },
    };
  }, [shakeRef]);

  return (
    <FxContext.Provider value={fx}>
      {children}
      <div className="fx-layer" aria-hidden="true">
        <canvas ref={canvasRef} className="fx-canvas" />
        {bursts.map((b) => (
          <div
            key={b.id}
            className="fx-burst"
            style={{ left: b.x, top: b.y, width: b.size, height: b.size, "--rot": `${b.rotate}deg`, "--dur": `${b.duration}ms` } as CSSProperties}
          >
            <Starburst fill={b.fill} seed={b.id * 7 + 3} />
            <span style={{ color: b.color, fontSize: fontSize(b.word, b.size) }}>{b.word}</span>
          </div>
        ))}
        {flash && <div key={flash.id} className="fx-flash" style={{ background: flash.color }} onAnimationEnd={() => setFlash(null)} />}
      </div>
    </FxContext.Provider>
  );
}

export function useFx(): Fx {
  const fx = useContext(FxContext);
  if (!fx) throw new Error("useFx must be used inside <FxProvider>");
  return fx;
}
