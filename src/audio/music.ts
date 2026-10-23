import { sfx } from "./sfx";

/**
 * Background music: an original 60s surf-spy groove, synthesized on the fly
 * like the sound effects. A look-ahead scheduler queues notes on the audio
 * clock, so the beat holds steady while the main thread is busy.
 */

/** [16th-note step in the bar, MIDI note, length in steps] */
export type Note = [step: number, midi: number, len: number];

const BPM = 132;
const STEP = 60 / BPM / 4;
const BAR = 16;
/**
 * How loud the music sits under the sound effects; the master volume and mute apply on top.
 * At 0.1 the band measures about -34 LUFS, roughly 9 dB under a card hit.
 */
const LEVEL = 0.1;
/** The scheduler wakes every TICK_MS and queues notes up to LOOKAHEAD seconds ahead. */
const TICK_MS = 30;
const LOOKAHEAD = 0.12;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Chord {
  root: number;
  /** Semitones from the root to the third: 3 for minor, 4 for the dominant seventh. */
  third: number;
  organ: number[];
  horns: number[];
}

const Em: Chord = { root: 40, third: 3, organ: [55, 59, 64], horns: [64, 67, 71, 76] };
const Am: Chord = { root: 45, third: 3, organ: [57, 60, 64], horns: [64, 69, 72, 76] };
const B7: Chord = { root: 35, third: 4, organ: [57, 63, 66], horns: [66, 69, 71, 75] };

/** A 12-bar minor blues in E. */
export const FORM = [Em, Em, Em, Em, Am, Am, Em, Em, B7, Am, Em, B7];
const BARS = FORM.length;

/** Bars that end with the whole band hitting the next chord an eighth note early. */
const PUSHES = new Set([3, 7, 11]);

const chordAt = (bar: number, step: number) => (PUSHES.has(bar) && step >= 14 ? FORM[(bar + 1) % BARS] : FORM[bar]);

/** The bass riff and its walk-down answer: [step, semitones above the root, length]. 3 stands for the chord's third. */
const RIFFS: Note[][] = [
  [[0, 0, 3], [3, 12, 3], [6, 10, 2], [8, 7, 3], [11, 3, 3], [14, 5, 2]],
  [[0, 0, 3], [3, 12, 3], [6, 10, 2], [8, 7, 2], [10, 5, 2], [12, 3, 2], [14, 2, 2]],
];

/** The bass line. Before a new chord, the last note pushes its root early or slides in from a half step away. */
export const BASS: Note[][] = FORM.map((chord, bar) => {
  const next = FORM[(bar + 1) % BARS];
  const notes = RIFFS[bar % 2].map(([step, interval, len]): Note => [step, chord.root + (interval === 3 ? chord.third : interval), len]);
  const last = notes[notes.length - 1];
  const prev = notes[notes.length - 2][1];
  if (PUSHES.has(bar)) last[1] = next.root;
  else if (next !== chord)
    last[1] = [next.root - 1, next.root + 1].filter((n) => n !== prev).sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))[0];
  return notes;
});

/** The surf-guitar tune, bar by bar. The last bar leaves the turnaround to the horns. */
export const LEAD: Note[][] = [
  [[0, 76, 2], [3, 79, 1], [4, 76, 2], [6, 74, 2], [8, 71, 6], [14, 74, 2]],
  [[0, 76, 6], [10, 67, 2], [12, 69, 2], [14, 71, 2]],
  [[0, 76, 2], [3, 79, 1], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 74, 2], [14, 71, 2]],
  [[0, 76, 10]],
  [[0, 72, 2], [3, 76, 1], [4, 72, 2], [6, 71, 2], [8, 69, 6], [14, 72, 2]],
  [[0, 69, 6], [10, 72, 2], [12, 74, 2], [14, 75, 2]],
  [[0, 76, 2], [3, 79, 1], [4, 76, 2], [6, 74, 2], [8, 71, 2], [10, 69, 2], [12, 67, 2], [14, 69, 2]],
  [[0, 71, 10]],
  [[0, 78, 2], [3, 81, 1], [4, 78, 2], [6, 75, 2], [8, 71, 6], [14, 75, 2]],
  [[0, 76, 2], [3, 72, 1], [4, 69, 2], [6, 72, 2], [8, 76, 6], [14, 74, 2]],
  [[0, 76, 2], [2, 74, 2], [4, 71, 2], [6, 67, 2], [8, 64, 8]],
  [],
];

/** Horn stabs by bar: [step, length]. They play the chord sounding, or being pushed, at that step. */
const HORNS: Partial<Record<number, [step: number, len: number][]>> = {
  3: [[14, 4]],
  7: [[14, 4]],
  11: [[8, 1], [11, 1], [14, 4]],
};

export interface Parts {
  melody: boolean;
  /** Sixteenth-note hi-hats, for extra drive during a race. */
  busy: boolean;
}

/** The instruments. Each call to `play` sounds one 16th-note step of the song. */
export class Band {
  private ctx: BaseAudioContext;
  private out: AudioNode;
  private noise: AudioBuffer;
  private reverb: ConvolverNode;
  private slap: DelayNode;

  constructor(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer) {
    this.ctx = ctx;
    this.out = out;
    this.noise = noise;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx, 1.8);
    this.reverb.connect(gain(ctx, 0.3)).connect(out);
    // Slapback echo: the surf-guitar sound.
    this.slap = ctx.createDelay(0.5);
    this.slap.delayTime.value = 0.14;
    this.slap.connect(gain(ctx, 0.28)).connect(this.slap);
    this.slap.connect(gain(ctx, 0.3)).connect(out);
  }

  /** Plays the notes that start on this step, at audio time `t`. `step` counts 16ths from the top of the song. */
  play(step: number, t: number, parts: Parts) {
    const bar = Math.floor(step / BAR) % BARS;
    const s = step % BAR;
    const push = PUSHES.has(bar);

    if (s === 0 && bar === 0) this.crash(t);
    if (s === 0 || s === 8 || s === 11 || (push && s === 14)) this.kick(t);
    if (s === 4 || s === 12) this.snare(t, 1);
    else if (push && s === 13) this.snare(t, 0.45);
    if (s % 2 === 0) this.hat(t, s % 4 ? 1 : 0.6, push && s === 14);
    else if (parts.busy) this.hat(t, 0.4);

    for (const [at, midi, len] of BASS[bar]) if (at === s) this.bass(midi, t, len * STEP);
    if (s % 4 === 2) this.organ(chordAt(bar, s).organ, t);
    for (const [at, len] of HORNS[bar] ?? []) if (at === s) this.horns(chordAt(bar, s).horns, t, len * STEP);
    if (parts.melody) for (const [at, midi, len] of LEAD[bar]) if (at === s) this.lead(midi, t, len * STEP);
  }

  private kick(t: number) {
    const o = this.osc("sine", 150, t, t + 0.4);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    o.connect(this.decay(t, 0.9, 0.32));
  }

  private snare(t: number, v: number) {
    const body = this.osc("triangle", 210, t, t + 0.15);
    body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    body.connect(this.decay(t, 0.22 * v, 0.09));
    const rattle = this.decay(t, 0.36 * v, 0.17);
    this.hiss(t, 0.25, "bandpass", 2400).connect(rattle);
    rattle.connect(gain(this.ctx, 0.5)).connect(this.reverb);
  }

  private hat(t: number, v: number, open = false) {
    this.hiss(t, open ? 0.4 : 0.08, "highpass", 7500).connect(this.decay(t, 0.1 * v, open ? 0.3 : 0.045));
  }

  private crash(t: number) {
    const g = this.decay(t, 0.1, 1.6);
    this.hiss(t, 1.8, "highpass", 4200).connect(g);
    g.connect(gain(this.ctx, 0.4)).connect(this.reverb);
  }

  private bass(midi: number, t: number, dur: number) {
    const end = t + dur * 0.9;
    const g = this.hold(t, end, 0.24, 0.14);
    const lp = this.ctx.createBiquadFilter();
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(1500, t);
    lp.frequency.setTargetAtTime(380, t, 0.05);
    lp.connect(g);
    this.osc("sawtooth", hz(midi), t, end + 0.1).connect(lp);
    // A sine underneath for weight.
    this.osc("sine", hz(midi), t, end + 0.1).connect(g);
  }

  private organ(notes: number[], t: number) {
    const end = t + STEP * 0.85;
    const g = this.hold(t, end, 0.11, 0.09, 0.003);
    g.connect(gain(this.ctx, 0.4)).connect(this.reverb);
    const lp = this.ctx.createBiquadFilter();
    lp.frequency.value = 2200;
    lp.connect(g);
    for (const midi of notes) this.osc("square", hz(midi), t, end + 0.08).connect(lp);
  }

  private horns(notes: number[], t: number, dur: number) {
    const end = t + dur * 0.92;
    const g = this.hold(t, end, 0.17, 0.1, 0.012, 0.05);
    g.connect(gain(this.ctx, 0.45)).connect(this.reverb);
    const lp = this.ctx.createBiquadFilter();
    lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(450, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
    lp.frequency.setTargetAtTime(1300, t + 0.04, 0.12);
    lp.connect(g);
    notes.forEach((midi, i) => {
      const o = this.osc("sawtooth", hz(midi), t, end + 0.1);
      o.detune.value = i % 2 ? 7 : -7;
      o.connect(lp);
    });
  }

  private lead(midi: number, t: number, dur: number) {
    const end = t + dur * 0.92;
    const g = this.hold(t, end, 0.16, 0.095, 0.004, 0.05);
    g.connect(this.slap);
    g.connect(gain(this.ctx, 0.35)).connect(this.reverb);
    const lp = this.ctx.createBiquadFilter();
    lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.setTargetAtTime(1600, t, 0.1);
    lp.connect(g);
    const tones = [this.osc("square", hz(midi), t, end + 0.1), this.osc("sawtooth", hz(midi), t, end + 0.1)];
    tones[1].detune.value = 8;
    // Long notes get a delayed vibrato.
    const vibrato = dur > 0.4 ? this.vibrato(t + 0.15, end) : null;
    for (const o of tones) {
      o.connect(lp);
      vibrato?.connect(o.detune);
    }
  }

  private vibrato(t: number, end: number) {
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(18, t + 0.25);
    return this.osc("sine", 5.6, t, end + 0.1).connect(depth);
  }

  private osc(type: OscillatorType, freq: number, t: number, stop: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.start(t);
    o.stop(stop);
    return o;
  }

  /** Filtered noise for `dur` seconds from `t`. Returns the filter to connect onward. */
  private hiss(t: number, dur: number, type: BiquadFilterType, freq: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.7;
    return src.connect(f);
  }

  /** A percussive envelope: straight up to `peak`, then fading out over about `seconds`. */
  private decay(t: number, peak: number, seconds: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.002, seconds / 4);
    g.connect(this.out);
    return g;
  }

  /** A held envelope: up to `peak`, easing toward `sustain`, and released at `end`. */
  private hold(t: number, end: number, peak: number, sustain: number, attack = 0.005, release = 0.03) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(sustain, t + attack, 0.08);
    g.gain.setTargetAtTime(0, end, release / 3);
    g.connect(this.out);
    return g;
  }
}

function gain(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/** Decaying stereo noise: a cheap, roomy reverb. */
function impulse(ctx: BaseAudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  }
  return buf;
}

export type Scene = "menu" | "intro" | "play" | "tension" | "end" | "results";

interface Mix {
  level: number;
  /** Low-pass cutoff in Hz. Low values muffle the band, like music from the next room. */
  cutoff: number;
  melody: boolean;
  busy: boolean;
  /** Start over from bar 1 on entering the scene. */
  restart?: boolean;
}

const MIXES: Record<Exclude<Scene, "end">, Mix> = {
  menu: { level: 1, cutoff: 20000, melody: true, busy: false },
  // Muffled under the VS splash and the countdown, so "GO!" can kick the band in.
  intro: { level: 0.55, cutoff: 600, melody: false, busy: false },
  play: { level: 0.85, cutoff: 20000, melody: false, busy: true, restart: true },
  // The final seconds: the band drops back and Scott's clock ticks over it.
  tension: { level: 0.6, cutoff: 1000, melody: false, busy: true },
  results: { level: 0.8, cutoff: 20000, melody: true, busy: false, restart: true },
};

/** Loops the song and follows the game from scene to scene. "end" stops it for the win and lose stingers. */
class Music {
  private enabled = false;
  private unlocked = false;
  private scene: Scene = "menu";
  private live: { ctx: AudioContext; bus: GainNode; tone: BiquadFilterNode; band: Band } | null = null;
  private timer = 0;
  private step = 0;
  private next = 0;

  /** True when the player wants music and sound isn't muted. */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.sync();
  }

  /** Browsers only allow audio after a user gesture, so call this from one. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    // Background tabs throttle timers, which would garble the beat, so the music pauses there.
    document.addEventListener("visibilitychange", () => this.sync());
    this.sync();
  }

  setScene(scene: Scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    if (scene !== "end" && MIXES[scene].restart && this.timer && this.live) {
      this.step = 0;
      this.next = this.live.ctx.currentTime + 0.02;
    }
    this.sync();
  }

  /** Starts, stops, or remixes the band to match the current state. */
  private sync() {
    const { scene } = this;
    if (!this.enabled || !this.unlocked || document.hidden || scene === "end") return this.halt();
    const live = this.connect();
    if (!live) return;
    const mix = MIXES[scene];
    const starting = !this.timer;
    if (starting) {
      this.step = 0;
      this.next = live.ctx.currentTime + 0.05;
      this.timer = window.setInterval(() => this.pump(), TICK_MS);
    }
    const tau = starting ? 0.3 : mix.restart ? 0.02 : 0.12;
    live.bus.gain.setTargetAtTime(LEVEL * mix.level, live.ctx.currentTime, tau);
    live.tone.frequency.setTargetAtTime(mix.cutoff, live.ctx.currentTime, tau);
    this.pump();
  }

  private pump() {
    const { live, scene } = this;
    if (!live || !this.timer || scene === "end") return;
    const mix = MIXES[scene];
    const { ctx, band } = live;
    // After a stall, skip ahead rather than play a pile of late notes at once.
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.02;
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      // Every third time around the form, the tune sits out and the groove carries on alone.
      const melody = mix.melody && Math.floor(this.step / (BAR * BARS)) % 3 !== 2;
      band.play(this.step, this.next, { melody, busy: mix.busy });
      this.next += STEP;
      this.step++;
    }
  }

  private halt() {
    if (!this.timer || !this.live) return;
    window.clearInterval(this.timer);
    this.timer = 0;
    this.live.bus.gain.setTargetAtTime(0, this.live.ctx.currentTime, 0.08);
  }

  private connect() {
    // Asking for the graph also wakes a context the browser has suspended.
    const shared = sfx.graph();
    if (!shared) return null;
    if (!this.live) {
      const { ctx, out, noise } = shared;
      const tone = ctx.createBiquadFilter();
      tone.frequency.value = 20000;
      const bus = ctx.createGain();
      bus.gain.value = 0;
      tone.connect(bus).connect(out);
      this.live = { ctx, bus, tone, band: new Band(ctx, tone, noise) };
    }
    return this.live;
  }
}

export const music = new Music();

// Vite swaps this module in place during development; silence the old player.
import.meta.hot?.dispose(() => music.setEnabled(false));
