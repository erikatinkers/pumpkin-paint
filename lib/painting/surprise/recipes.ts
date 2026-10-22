import { TEX_H, TEX_W, fillCell, pick, pinch, range, tint, wash, wobble } from "./helpers";
import { RIBS } from "./palette";
import { cat } from "./cat";
import { jack } from "./jack";
import { kitty } from "./kitty";
import { nightcat } from "./nightcat";
import { frank } from "./frank";
import { skull } from "./skull";
import { spidey } from "./spidey";
import type { Recipe, Rng, Stroke } from "./types";

const INK = "#26201f";
const BLUSH = "#f4b3a8";

/** Light and dark of the checks: orange and white only, a touch warmer or cooler from run to run. */
const CHECK_PAIRS: [string, string][] = [
  ["#fbecc8", "#e0803a"], // cream and terracotta
  ["#fffaf0", "#ec8a3c"], // white and bright orange
  ["#f8ead0", "#d9732f"], // ivory and burnt orange
];

/** A point `dx`, `dy` pixels (y up) from a UV spot, turned by `angle`. */
const offset = (u: number, v: number, dx: number, dy: number, angle: number, scale: number): [number, number] => {
  const x = (dx * Math.cos(angle) - dy * Math.sin(angle)) * scale;
  const y = (dx * Math.sin(angle) + dy * Math.cos(angle)) * scale;
  return [u + x / TEX_W, v + y / TEX_H];
};

const shape = (u: number, v: number, pts: [number, number][], angle: number, scale: number): [number, number][] => pts.map(([dx, dy]) => offset(u, v, dx, dy, angle, scale));

/** A little bow: two loops, a knot, two tails, drawn a bit lopsided. */
function bow(u: number, v: number, angle: number, scale: number, rng: Rng): Stroke[] {
  const loop = (s: number): [number, number][] => [[s * 4, 0], [s * 26, 18], [s * 36, 2], [s * 26, -16], [s * range(rng, 2, 9), range(rng, -3, 3)]];
  const stroke = (size: number, pts: [number, number][]): Stroke => ({ color: tint(INK, rng, 0.25), size: size * range(rng, 0.85, 1.25), points: wobble(shape(u, v, pts, angle, scale), rng, 1.6) });
  return [
    stroke(5, loop(-1)),
    stroke(5, loop(1)),
    stroke(8, [[0, 0], [0.5, 0]]),
    stroke(5, [[-2, -4], [-12, -30]]),
    stroke(5, [[2, -4], [12, -30]]),
  ];
}

/** A tiny ghost face: rosy cheeks, two eyes, a small smile, never quite level. */
function ghost(u: number, v: number, angle: number, scale: number, rng: Rng): Stroke[] {
  const j = () => range(rng, -2.5, 2.5);
  const dab = (dx: number, dy: number, color: string, size: number): Stroke => ({ color: tint(color, rng, 0.15), size: size * range(rng, 0.8, 1.25), points: shape(u, v, [[dx + j(), dy + j()], [dx + 0.5 + j(), dy + j()]], angle, scale) });
  return [
    dab(-30, -8, BLUSH, 11),
    dab(30, -8, BLUSH, 11),
    dab(-14, 6, INK, 7),
    dab(14, 6, INK, 7),
    { color: INK, size: 4 * range(rng, 0.85, 1.3), points: wobble(shape(u, v, [[-7, -9], [0, -14], [7, -9]], angle, scale), rng, 1.3) },
  ];
}

/** A checkerboard round the pumpkin, one check per lobe, with bows on the dark checks and ghost faces on the light ones. */
const checkerboard: Recipe = {
  name: "Checkerboard",
  strokes(rng: Rng) {
    const [light, dark] = pick(rng, CHECK_PAIRS);
    // One column per lobe, so every check is a panel of the pumpkin and its sides sit on the grooves. Nine is odd, so the colors repeat once where the
    // checks meet again at the seam, which sits in a groove.
    const cols = RIBS;
    const rows = pick(rng, [4, 5, 6]);
    const top = 0.95;
    const bottom = 0.05;
    const cellW = 1 / cols;
    const cellH = (top - bottom) / rows;
    const bowOdds = range(rng, 0.45, 0.9);
    const ghostOdds = range(rng, 0.35, 0.8);

    const fills: Stroke[] = [];
    const marks: Stroke[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isDark = (r + c) % 2 === 1;
        const u0 = c * cellW;
        const vTop = top - r * cellH;
        fills.push(...fillCell(rng, isDark ? dark : light, u0, cellW, vTop, cellH));
        const cu = u0 + cellW / 2;
        const cv = vTop - cellH / 2;
        const angle = range(rng, -0.35, 0.35);
        const scale = range(rng, 0.85, 1.1);
        if (isDark && rng() < bowOdds) marks.push(...bow(cu, cv, angle, scale, rng));
        else if (!isDark && rng() < ghostOdds) marks.push(...ghost(cu, cv, angle, scale, rng));
      }
    }
    return [...fills, ...marks];
  },
};

/** Muted washes for the whole pumpkin: sage grey, dusty blue, grey lilac. */
const DAISY_BASES = ["#8fa59c", "#93a8b4", "#a4a3b8", "#9cae95"];
const PETAL = "#fffdf7";
const DAISY_CENTRES = ["#eab32e", "#f0a82a", "#e2a233"];

/** One daisy: ragged white petals round a yellow centre. `size` scales the whole flower. */
function daisy(u: number, v: number, size: number, rng: Rng): Stroke[] {
  const out: Stroke[] = [];
  const petals = 12 + Math.floor(rng() * 3);
  const turn = rng() * Math.PI * 2;
  const at = (r: number, a: number): [number, number] => [u + (Math.cos(a) * r * size * pinch(v)) / TEX_W, v + (Math.sin(a) * r * size) / TEX_H];
  for (let i = 0; i < petals; i++) {
    const a = turn + (i / petals) * Math.PI * 2 + range(rng, -0.12, 0.12);
    const len = range(rng, 74, 98);
    out.push({
      color: tint(PETAL, rng, 0.03),
      size: range(rng, 11, 14.5) * size,
      points: wobble([at(range(rng, 14, 26), a), at(len, a + range(rng, -0.05, 0.05))], rng, 1.2),
    });
  }
  const centre = pick(rng, DAISY_CENTRES);
  out.push({ color: tint(centre, rng, 0.06), size: 22 * size, points: wobble([at(0, 0), at(6, 1)], rng, 2) });
  out.push({ color: tint("#d4872a", rng, 0.08), size: 8 * size, points: wobble([at(9, 2), at(14, 3.5)], rng, 1.5) }); // a shadowed edge
  return out;
}

/** A few faint green sprigs beside a flower: a stem and two or three small leaves. */
function sprig(u: number, v: number, angle: number, rng: Rng): Stroke[] {
  const color = tint("#a8b783", rng, 0.08);
  const at = (r: number, a: number): [number, number] => [u + (Math.cos(a) * r * pinch(v)) / TEX_W, v + (Math.sin(a) * r) / TEX_H];
  const out: Stroke[] = [{ color, size: 4, points: wobble([at(0, angle), at(80, angle)], rng, 2) }];
  for (const [r, side] of [[28, 1], [48, -1], [68, 1]] as const) {
    out.push({ color, size: 5.5, points: wobble([at(r, angle), at(r + 24, angle + side * 0.8)], rng, 1) });
  }
  return out;
}

/** A muted washed pumpkin with white daisies scattered over it. */
const daisies: Recipe = {
  name: "Daisies",
  strokes(rng: Rng) {
    const base = pick(rng, DAISY_BASES);

    const out: Stroke[] = wash(rng, base);

    // Flowers on a loose grid, each pushed around so they scatter instead of lining up.
    const flowers: [number, number, number][] = [];
    const cols = 5;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.2) continue;
        const u = (c + 0.5 + range(rng, -0.3, 0.3) + (r % 2 ? 0.5 : 0)) / cols;
        const v = 0.2 + ((r + 0.5) / rows) * 0.62 + range(rng, -0.05, 0.05);
        flowers.push([u, v, range(rng, 0.75, 1.15)]);
      }
    }
    for (const [u, v] of flowers) if (rng() < 0.6) out.push(...sprig(u + range(rng, 0.05, 0.09), v + range(rng, -0.04, 0.04), range(rng, 0, Math.PI * 2), rng));
    for (const [u, v, size] of flowers) out.push(...daisy(u, v, size, rng));
    return out;
  },
};

/** Gingham: [cream, olive stripe] columns crossed by [cream, orange] rows; where a stripe crosses a stripe the colors mix and go darker. */
const GINGHAM_SETS = [
  { cream: "#fbf0d4", olive: "#a9a650", orange: "#e8894a", cross: "#b8622e" },
  { cream: "#fcf2d8", olive: "#9ea04a", orange: "#ee9250", cross: "#bd6a32" },
  { cream: "#f9edcd", olive: "#b4a850", orange: "#e27f3e", cross: "#b25a2a" },
];

/** Plaid, one column per lobe: wide bands of olive and orange laid over cream, like a gingham cloth. */
const gingham: Recipe = {
  name: "Gingham",
  strokes(rng: Rng) {
    const c = pick(rng, GINGHAM_SETS);
    const rows = pick(rng, [5, 6, 7]);
    const top = 0.95;
    const bottom = 0.05;
    const cellW = 1 / RIBS;
    // Rows are a little uneven, like bands taped on by eye.
    const weights = Array.from({ length: rows }, () => range(rng, 0.8, 1.25));
    const total = weights.reduce((a, b) => a + b, 0);
    const out: Stroke[] = [];
    let vTop = top;
    const firstStripe = rng() < 0.5 ? 0 : 1; // whether the first row from the top is a stripe or cream
    const colStripe = rng() < 0.5 ? 0 : 1;
    for (let r = 0; r < rows; r++) {
      const h = ((top - bottom) * weights[r]) / total;
      const rowStripe = (r + firstStripe) % 2 === 0;
      for (let col = 0; col < RIBS; col++) {
        const colIsStripe = (col + colStripe) % 2 === 0;
        const color = rowStripe ? (colIsStripe ? c.cross : c.orange) : colIsStripe ? c.olive : c.cream;
        out.push(...fillCell(rng, color, col * cellW, cellW, vTop, h));
      }
      vTop -= h;
    }
    return out;
  },
};

export const RECIPES: Recipe[] = [checkerboard, daisies, gingham, skull, cat, kitty, nightcat, jack, spidey, frank];
