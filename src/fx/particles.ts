export type Shape = "star" | "dot" | "rect" | "shard";

export const PALETTE = ["#ffd23f", "#ff3d54", "#22d3ee", "#23d18b", "#ff4fa3", "#ffffff"];

export interface EmitOptions {
  count?: number;
  colors?: string[];
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  gravity?: number;
  shapes?: Shape[];
  angle?: number;
  spread?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  shape: Shape;
  age: number;
  life: number;
  gravity: number;
  wobble: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** A tiny canvas particle system for stars, confetti, and debris. Sleeps when empty. */
export class ParticleEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private parts: Particle[] = [];
  private frame = 0;
  private last = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
  }

  emit(x: number, y: number, o: EmitOptions = {}) {
    const {
      count = 18,
      colors = PALETTE,
      speed = [3, 10],
      size = [5, 11],
      life = [38, 70],
      gravity = 0.32,
      shapes = ["star", "dot", "shard"],
      angle = -Math.PI / 2,
      spread = Math.PI * 2,
    } = o;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = rand(...speed);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.3, 0.3),
        size: rand(...size),
        color: pick(colors),
        shape: pick(shapes),
        age: 0,
        life: rand(...life),
        gravity,
        wobble: rand(0, Math.PI * 2),
      });
    }
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  confetti() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const opts: EmitOptions = { count: 70, speed: [12, 22], size: [7, 14], life: [90, 150], gravity: 0.38, shapes: ["rect", "star", "rect", "dot"], spread: 0.7 };
    this.emit(-10, h * 0.9, { ...opts, angle: -Math.PI / 3 });
    this.emit(w + 10, h * 0.9, { ...opts, angle: (-2 * Math.PI) / 3 });
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 16.67, 3);
    this.last = now;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.parts = this.parts.filter((p) => (p.age += dt) < p.life);
    for (const p of this.parts) {
      p.vy += p.gravity * dt;
      p.vx *= 0.985 ** dt;
      p.vy *= 0.985 ** dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const fade = Math.min(1, (p.life - p.age) / 18);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "#120a2b";
      ctx.lineWidth = 2;
      draw(ctx, p);
      ctx.restore();
    }
    this.frame = this.parts.length ? requestAnimationFrame(this.tick) : 0;
    if (!this.frame) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  switch (p.shape) {
    case "dot":
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      break;
    case "rect": {
      const flip = Math.abs(Math.cos(p.age * 0.2 + p.wobble));
      ctx.rect(-s / 2, (-s / 3) * flip, s, (s / 1.5) * flip);
      break;
    }
    case "shard":
      ctx.moveTo(0, -s / 1.4);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(-s / 2, s / 3);
      ctx.closePath();
      break;
    case "star":
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s / 1.6 : s / 3.6;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
  }
  ctx.fill();
  ctx.stroke();
}
