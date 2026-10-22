import { TEX_H, TEX_W, pinch, range, tint, wobble } from "./helpers";
import type { Rng, Stroke } from "./types";

export type Pt = [number, number];

export interface KitOptions {
  /** The point in the reference picture's own pixels (y down) that lands on (`u`, `v`) of the pumpkin. */
  refCentre: Pt;
  /** Texture pixels per reference pixel, across and down. */
  sx: number;
  sy: number;
  u: number;
  v: number;
  scale: number;
  tilt: number;
  /** -1 mirrors the picture left to right. */
  flip: 1 | -1;
}

/**
 * Tools for painting a picture traced from a reference: shapes are written in the reference's own pixels and `map` turns them into UV on the pumpkin,
 * allowing for the surface pinching in toward the poles. Everything it draws is wobbled and tinted a little, so it reads as brushwork.
 */
export function createKit(rng: Rng, o: KitOptions) {
  const out: Stroke[] = [];
  const map = (x: number, y: number): Pt => {
    const dx = (x - o.refCentre[0]) * o.scale * o.flip;
    const dy = (y - o.refCentre[1]) * o.scale;
    const rx = dx * Math.cos(o.tilt) - dy * Math.sin(o.tilt);
    const ry = dx * Math.sin(o.tilt) + dy * Math.cos(o.tilt);
    const v = o.v - (ry * o.sy) / TEX_H;
    return [o.u + (rx * o.sx * pinch(v)) / TEX_W, v];
  };
  const line = (color: string, size: number, pts: Pt[], amount = 1.2) =>
    out.push({ color: tint(color, rng, 0.05), size: size * range(rng, 0.9, 1.15), points: wobble(pts.map(([x, y]) => map(x, y)), rng, amount) });
  const dab = (color: string, size: number, x: number, y: number) => line(color, size, [[x, y], [x + 0.4, y]], 0.8);

  /** A shape filled with horizontal strokes, row by row, stopping a little inside its outline so the brush's own bulge draws the edge. */
  const fill = (color: string, radius: number, poly: Pt[]) => {
    const ys = poly.map((p) => p[1]);
    const inY = (radius * 0.7) / o.sy;
    const inX = (radius * 0.7) / o.sx;
    const stepY = (radius * 1.15) / o.sy;
    let k = 0;
    for (let y = Math.min(...ys) + inY; y <= Math.max(...ys) - inY + 0.1; y += stepY) {
      const xs: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % poly.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = xs[i] + inX;
        const b = xs[i + 1] - inX;
        const row: Pt[] = b > a ? [[a, y], [b, y]] : [[(a + b) / 2, y], [(a + b) / 2 + 0.4, y]];
        line(color, radius, k++ % 2 ? row.reverse() : row, 1.5);
      }
    }
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, tiltE = 0): Pt[] =>
    Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const w = 1 + range(rng, -0.025, 0.025);
      const x = Math.cos(a) * rx * w;
      const y = Math.sin(a) * ry * w;
      return [cx + x * Math.cos(tiltE) - y * Math.sin(tiltE), cy + x * Math.sin(tiltE) + y * Math.cos(tiltE)] as Pt;
    });
  /** Strokes spreading from a centre: petals, spikes, rays. */
  const rays = (cx: number, cy: number, n: number, r0: number, r1: number, colors: string[], size: number, turn = rng() * 6) => {
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2 + range(rng, -0.06, 0.06);
      const reach = r1 * range(rng, 0.88, 1.08);
      line(colors[i % colors.length], size, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * reach, cy + Math.sin(a) * reach]], 1);
    }
  };
  return { out, map, line, dab, fill, ellipse, rays };
}
