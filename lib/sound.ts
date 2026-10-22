/** Interface sounds, synthesised with Web Audio so there are no files to load. Silent where audio isn't available. */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A short burst of white noise through a band-pass: the body of a click. */
function burst(c: AudioContext, at: number, freq: number, len: number, vol: number): void {
  if (!noise) {
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noise;
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, 0, len + 0.02);
}

/** A pitched blip that slides from `from` to `to` Hz. */
function blip(c: AudioContext, at: number, from: number, to: number, len: number, vol: number, type: OscillatorType = "sine"): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + len);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

const PENTATONIC = [0, 2, 4, 7, 9];

export const sound = {
  /** A key pressed: a soft wooden tock, nudged in pitch so repeats don't sound mechanical. */
  key() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const drift = 1 + (Math.random() - 0.5) * 0.12;
    blip(c, t, 360 * drift, 190 * drift, 0.07, 0.16, "triangle");
    burst(c, t, 1800, 0.03, 0.12);
  },
  /** A dab of paint chosen: a wet bloop. Each swatch gets its own note on a pentatonic scale, so running along them sounds like a tune. */
  paint(index: number) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const step = PENTATONIC[index % 5] + 12 * Math.floor(index / 5);
    const base = 260 * 2 ** (step / 12);
    blip(c, t, base, base * 1.9, 0.14, 0.2);
    blip(c, t + 0.03, base * 2, base * 3, 0.08, 0.06);
  },
  /** A window closed: a lower, shorter tock. */
  close() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    blip(c, t, 240, 120, 0.09, 0.18, "triangle");
    burst(c, t, 900, 0.04, 0.1);
  },
  /** The shutter: two clicks, then a faint wind-on. */
  shutter() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    burst(c, t, 3200, 0.035, 0.5);
    blip(c, t, 900, 500, 0.04, 0.12, "square");
    burst(c, t + 0.07, 2000, 0.05, 0.4);
    blip(c, t + 0.07, 500, 300, 0.05, 0.1, "square");
    burst(c, t + 0.16, 700, 0.12, 0.08);
  },
  /** A stroke starts: one sound, then silence while you drag. The brush lands with a wet splat, the eraser with a soft, pure low tone (no noise). */
  strokeStart(erase: boolean) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    if (erase) {
      blip(c, t, 330, 250, 0.13, 0.05);
      return;
    }
    const f = 190 + Math.random() * 120;
    blip(c, t, f, f * 1.8, 0.07, 0.07);
    blip(c, t + 0.045, f * 1.4, f * 0.8, 0.08, 0.04);
  },
  /** The gift box hovered: a tiny rising chime. */
  chime() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => blip(c, t + i * 0.055, f, f * 1.003, 0.35, 0.05));
  },
  /** The gift box opened: a swell, then a shower of sparkles falling in pitch. */
  magic() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    blip(c, t, 330, 660, 0.45, 0.08);
    const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349, 2637];
    for (let i = 0; i < 14; i++) {
      const f = scale[Math.floor(Math.random() * scale.length)];
      blip(c, t + 0.08 + i * 0.07 + Math.random() * 0.03, f, f * 1.004, 0.4, 0.035 + Math.random() * 0.03);
    }
  },
};
