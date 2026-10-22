import { PAINTS, RIBS } from "./palette";
import type { Rng, Stroke } from "./types";

export const TEX_W = 2048; // the paint texture's size, so shapes can be drawn in pixels: the surface is about 1:1 with them at the equator
export const TEX_H = 1024;

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
export const range = (rng: Rng, lo: number, hi: number): number => lo + rng() * (hi - lo);

/** `n` different paints, in a random order. */
export function pickPaints(rng: Rng, n: number): string[] {
  const pool = PAINTS.map((p) => p.hex);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** The u of the middle of lobe `i` (the grooves between lobes sit at whole multiples of 1 / RIBS). */
export const lobeCentre = (i: number): number => (i + 0.5) / RIBS;

/** A dab: a stroke of two points almost on top of each other. */
export const dot = (color: string, size: number, u: number, v: number): Stroke => ({ color, size, points: [[u, v], [u + 0.0005, v]] });

/** The same distance in pixels covers more of u toward the poles, where the surface pinches in. */
export const pinch = (v: number): number => 1 / Math.max(0.4, Math.sin((1 - v) * Math.PI));

/** A hex color made a touch lighter or darker, so no two strokes are quite the same wash. */
export function tint(hex: string, rng: Rng, amount: number): string {
  const k = 1 + (rng() * 2 - 1) * amount;
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * k)));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Breaks each segment of a path into thirds and pushes every point off the line by up to `px` pixels: a hand, not a ruler. */
export function wobble(points: [number, number][], rng: Rng, px: number): [number, number][] {
  const out: [number, number][] = [];
  const nudge = ([u, v]: [number, number]): [number, number] => [u + ((rng() * 2 - 1) * px) / TEX_W, v + ((rng() * 2 - 1) * px) / TEX_H];
  points.forEach((p, i) => {
    if (i > 0) {
      const [u0, v0] = points[i - 1];
      for (const t of [1 / 3, 2 / 3]) out.push(nudge([u0 + (p[0] - u0) * t, v0 + (p[1] - v0) * t]));
    }
    out.push(nudge(p));
  });
  return out;
}

/**
 * Paints one rectangle of the pumpkin (`width` of u, `height` of v, top edge at `vTop`) with horizontal brush strokes. It never lands exactly in its box:
 * the whole patch drifts a little, and the strokes that fill it wander, vary in width and tone, and stop at different distances from the edges,
 * so edges are uneven and the wash is blotchy.
 */
export function fillCell(rng: Rng, color: string, u0: number, width: number, vTop: number, height: number): Stroke[] {
  const radius = 24; // px: the brush used to fill
  const reach = radius * 0.55; // how far in from the edge the strokes stop: the brush bulges past that, so neighbours overlap and no bare skin shows at corners
  const step = 30; // px between the strokes
  const drift: [number, number] = [range(rng, -7, 7), range(rng, -6, 6)];
  const n = Math.max(1, Math.floor((height * TEX_H - 2 * reach) / step) + 1);
  const out: Stroke[] = [];
  for (let k = 0; k < n; k++) {
    const v = vTop - (reach + (k * (height * TEX_H - 2 * reach)) / Math.max(1, n - 1) + drift[1] + range(rng, -4, 4)) / TEX_H;
    const left = u0 + (reach + drift[0] + range(rng, -8, 5)) / TEX_W;
    const right = u0 + width - (reach - drift[0] + range(rng, -8, 5)) / TEX_W;
    out.push({ color: tint(color, rng, 0.05), size: radius * range(rng, 0.85, 1.2), points: wobble(k % 2 ? [[right, v], [left, v]] : [[left, v], [right, v]], rng, 3.5) });
  }
  return out;
}

/** Two passes of broad strokes over the whole pumpkin: first even, then patchier ones across it, so the wash is uneven like a dry brush. */
export function wash(rng: Rng, base: string): Stroke[] {
  const out: Stroke[] = [];
  for (let y = 0; y <= TEX_H; y += 62) {
    const v = 1 - y / TEX_H;
    out.push({ color: tint(base, rng, 0.03), size: range(rng, 62, 74), points: wobble([[0, v], [1, v]], rng, 5) });
  }
  for (let y = 20; y <= TEX_H; y += 90) {
    const v = 1 - y / TEX_H;
    const from = rng();
    out.push({ color: tint(base, rng, 0.07), size: range(rng, 34, 50), points: wobble([[from, v], [from + range(rng, 0.2, 0.6), v + range(rng, -0.02, 0.02)]], rng, 6) });
  }
  return out;
}
