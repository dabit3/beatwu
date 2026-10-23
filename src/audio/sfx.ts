import type { Op } from "../game/math";

interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  to?: number;
  dur: number;
  vol?: number;
  at?: number;
  attack?: number;
  filter?: number;
  vibrato?: number;
}

interface NoiseOptions {
  dur: number;
  freq: number;
  to?: number;
  vol?: number;
  at?: number;
  type?: BiquadFilterType;
  q?: number;
}

const MASTER = 0.55;

/** Every sound is synthesized with Web Audio, so the game ships no audio files. */
class Sfx {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.out) this.out.gain.setTargetAtTime(muted ? 0 : MASTER, this.ctx.currentTime, 0.02);
  }

  /** Browsers only allow audio after a user gesture, so call this from one. */
  unlock() {
    this.ensure();
  }

  /** The shared context, master output, and noise, for the background music. Null without Web Audio. */
  graph(): { ctx: AudioContext; out: GainNode; noise: AudioBuffer } | null {
    const ctx = this.ensure();
    return ctx && this.out && this.noise ? { ctx, out: this.out, noise: this.noise } : null;
  }

  tap() {
    this.tone({ type: "triangle", freq: 900, to: 1400, dur: 0.06, vol: 0.14 });
  }

  deselect() {
    this.tone({ type: "triangle", freq: 760, to: 420, dur: 0.07, vol: 0.1 });
  }

  op() {
    this.tone({ type: "square", freq: 420, to: 660, dur: 0.07, vol: 0.07, filter: 2400 });
  }

  hit(op: Op, power = 1) {
    this.tone({ freq: 190, to: 42, dur: 0.22 * power, vol: 0.5 });
    switch (op) {
      case "+":
        this.tone({ type: "sawtooth", freq: 1500, to: 240, dur: 0.16, vol: 0.1, filter: 3800 });
        this.hiss({ dur: 0.12, freq: 4200, to: 1300, vol: 0.18, type: "bandpass", q: 0.8 });
        break;
      case "-":
        this.hiss({ dur: 0.15, freq: 1900, to: 380, vol: 0.34 });
        this.tone({ type: "square", freq: 320, to: 120, dur: 0.08, vol: 0.07, filter: 1500 });
        break;
      case "*":
        this.hiss({ dur: 0.28 * power, freq: 2800, to: 170, vol: 0.42, q: 2 });
        this.tone({ type: "sawtooth", freq: 120, to: 38, dur: 0.26 * power, vol: 0.16, filter: 900 });
        break;
      case "/":
        this.hiss({ dur: 0.18, freq: 6500, to: 900, vol: 0.26, type: "bandpass", q: 3 });
        this.tone({ type: "triangle", freq: 1900, to: 520, dur: 0.12, vol: 0.1 });
        break;
    }
  }

  whoosh(dur = 0.4) {
    this.hiss({ dur, freq: 280, to: 3400, vol: 0.2, type: "bandpass", q: 1.4 });
  }

  flip() {
    for (let i = 0; i < 3; i++) this.hiss({ dur: 0.06, freq: 2400, to: 5200, vol: 0.12, type: "bandpass", q: 2, at: i * 0.035 });
  }

  deal(i: number) {
    this.hiss({ dur: 0.05, freq: 1700 + i * 120, to: 3600, vol: 0.09, type: "bandpass", q: 2 });
  }

  count() {
    this.tone({ type: "square", freq: 523, dur: 0.16, vol: 0.1, filter: 2000 });
    this.tone({ freq: 150, to: 58, dur: 0.22, vol: 0.4 });
  }

  go() {
    for (const f of [523.25, 659.25, 783.99]) this.tone({ type: "square", freq: f, dur: 0.4, vol: 0.07, filter: 2800 });
    this.hiss({ dur: 0.5, freq: 7000, vol: 0.14, type: "highpass" });
    this.tone({ freq: 170, to: 48, dur: 0.32, vol: 0.5 });
  }

  tick(urgent: boolean) {
    this.tone({ freq: urgent ? 1560 : 1180, dur: 0.045, vol: 0.18 });
    this.tone({ type: "triangle", freq: urgent ? 780 : 590, dur: 0.05, vol: 0.08 });
  }

  scottMove() {
    this.tone({ freq: 540, to: 900, dur: 0.07, vol: 0.11 });
  }

  error() {
    this.tone({ type: "square", freq: 150, dur: 0.22, vol: 0.1, filter: 1200 });
    this.tone({ type: "square", freq: 161, dur: 0.22, vol: 0.1, filter: 1200 });
  }

  bell(at = 0) {
    for (const [f, v] of [
      [830, 0.2],
      [1250, 0.1],
      [2170, 0.07],
      [3050, 0.04],
    ])
      this.tone({ freq: f, dur: 1.3, vol: v, at });
  }

  slam(at = 0) {
    this.tone({ freq: 115, to: 30, dur: 0.5, vol: 0.62, at });
    this.hiss({ dur: 0.35, freq: 950, to: 110, vol: 0.4, at });
  }

  scottWins() {
    this.bell(0);
    this.bell(0.24);
    this.slam(0);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone({ type: "square", freq: f, dur: 0.14, vol: 0.08, at: i * 0.09, filter: 3200 }),
    );
    for (const f of [523.25, 659.25, 783.99, 1046.5])
      this.tone({ type: "sawtooth", freq: f, dur: 1.0, vol: 0.045, at: 0.36, filter: 2800, vibrato: 4 });
    this.hiss({ dur: 1.2, freq: 6500, vol: 0.15, type: "highpass", at: 0.36 });
    this.tone({ freq: 130, to: 48, dur: 0.4, vol: 0.5, at: 0.36 });
  }

  /** "Dun dun DUNNN." */
  dramatic(at = 0) {
    const chords: [number[], number, number][] = [
      [[146.83, 220], 0, 0.22],
      [[155.56, 233.08], 0.28, 0.22],
      [[138.59, 207.65], 0.56, 1.3],
    ];
    for (const [freqs, start, dur] of chords) for (const f of freqs) this.brass(f, at + start, dur, 0.13, start > 0.5 ? 5 : 0);
    this.tone({ freq: 92, to: 46, dur: 0.5, vol: 0.5, at: at + 0.56 });
  }

  /** "Wah wah wah wahhh." */
  sadTrombone(at = 0) {
    this.brass(196, at, 0.42, 0.22, 0, 0.985);
    this.brass(185, at + 0.46, 0.42, 0.22, 0, 0.985);
    this.brass(174.61, at + 0.92, 0.42, 0.22, 0, 0.985);
    this.brass(164.81, at + 1.38, 1.5, 0.24, 6, 0.96);
  }

  slideWhistle(at = 0) {
    this.tone({ freq: 1750, to: 420, dur: 0.5, vol: 0.16, at, attack: 0.02 });
  }

  clink(at = 0) {
    this.tone({ type: "triangle", freq: 2400, dur: 0.2, vol: 0.14, at });
    this.tone({ freq: 3650, dur: 0.14, vol: 0.08, at });
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      const out = ctx.createGain();
      out.gain.value = this.muted ? 0 : MASTER;
      out.connect(comp).connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
      this.out = out;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private ready(): { ctx: AudioContext; out: GainNode } | null {
    if (this.muted) return null;
    const ctx = this.ensure();
    return ctx && this.out ? { ctx, out: this.out } : null;
  }

  private tone(o: ToneOptions) {
    const r = this.ready();
    if (!r) return;
    const { ctx, out } = r;
    const t = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.frequency.value = o.filter;
      node = node.connect(f);
    }
    if (o.vibrato) this.vibrato(osc, t, o.dur, o.vibrato);
    node.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private hiss(o: NoiseOptions) {
    const r = this.ready();
    if (!r || !this.noise) return;
    const { ctx, out } = r;
    const t = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "lowpass";
    f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.freq, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }

  /** A sawtooth through a sweeping low-pass filter: close enough to a muted trombone. */
  private brass(freq: number, at: number, dur: number, vol: number, vibrato = 0, bend = 1) {
    const r = this.ready();
    if (!r) return;
    const { ctx, out } = r;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    if (bend !== 1) osc.frequency.linearRampToValueAtTime(freq * bend, t + dur);
    const f = ctx.createBiquadFilter();
    f.Q.value = 5;
    f.frequency.setValueAtTime(280, t);
    f.frequency.exponentialRampToValueAtTime(1500, t + Math.min(0.12, dur * 0.3));
    f.frequency.exponentialRampToValueAtTime(480, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vibrato) this.vibrato(osc, t + 0.15, dur, vibrato);
    osc.connect(f).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private vibrato(osc: OscillatorNode, t: number, dur: number, depth: number) {
    if (!this.ctx) return;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = this.ctx.createGain();
    lg.gain.value = depth;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }
}

export const sfx = new Sfx();
