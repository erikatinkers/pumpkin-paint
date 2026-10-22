import { pick, range, tint, wash, wobble } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng, Stroke } from "./types";

/**
 * A lime-green monster with a black jagged fringe, big round eyes with a glint, a stitched smile, and a pair of scars.
 * Traced from the reference painting (about 904 by 940 pixels, y down), whose pumpkin body is centred on (455, 532).
 */
const REF_CENTRE: Pt = [455, 532];
const LIMES = ["#a8d92f", "#9fd02a", "#b4e03a"];
const BLACK = "#17120f";
const WHITE = "#f7f4ea";

const FRINGE_TOP = 0.72; // the v where the solid black cap meets the teeth
const TEETH = 15;

/** The cap round the stem and the zigzag fringe hanging from it, all the way round, in UV. */
function hair(rng: Rng): Stroke[] {
  const out: Stroke[] = [];
  for (let v = 1; v >= FRINGE_TOP + 0.005; v -= 0.04) {
    out.push({ color: tint(BLACK, rng, 0.05), size: range(rng, 62, 74), points: wobble([[0, v], [1, v]], rng, 4) });
  }
  for (let i = 0; i < TEETH; i++) {
    const u = (i + 0.5) / TEETH + range(rng, -0.004, 0.004);
    const depth = range(rng, 0.12, 0.17);
    const half = (0.5 / TEETH) * 0.98;
    for (let v = FRINGE_TOP + 0.01, k = 0; v > FRINGE_TOP - depth; v -= 0.018, k++) {
      const t = (FRINGE_TOP + 0.01 - v) / (depth + 0.01);
      const hw = Math.max(0, half * (1 - t) - 0.005);
      const row: [number, number][] = hw > 0.002 ? [[u - hw, v], [u + hw, v]] : [[u, v], [u + 0.0005, v]];
      out.push({ color: tint(BLACK, rng, 0.05), size: 12 * range(rng, 0.9, 1.1), points: wobble(k % 2 ? row.reverse() : row, rng, 1.5) });
    }
  }
  return out;
}

export const frank: Recipe = {
  name: "Monster",
  strokes(rng: Rng) {
    const { out, line, dab, fill, ellipse } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: 0.95,
      sy: 1.1,
      u: 0.27 + range(rng, -0.012, 0.012),
      v: 0.54 + range(rng, -0.02, 0.02),
      scale: range(rng, 0.96, 1.04),
      tilt: range(rng, -0.03, 0.03),
      flip: rng() < 0.5 ? -1 : 1,
    });
    out.push(...wash(rng, pick(rng, LIMES)));
    out.push(...hair(rng));

    // Eyes, each with a glint toward the upper left.
    fill(BLACK, 12, ellipse(353, 552, 58, 63));
    fill(BLACK, 12, ellipse(570, 553, 58, 63));
    dab(WHITE, 9, 334, 524);
    dab(WHITE, 9, 548, 534);

    // A stitched smile: the curve, then a bar and a cross over its right end.
    line(BLACK, 7, [[375, 678], [405, 704], [450, 716], [500, 710], [540, 686], [562, 662]], 1.5);
    line(BLACK, 5, [[520, 664], [545, 708]], 1);
    line(BLACK, 5, [[538, 662], [524, 712]], 1);

    // Scars: a spine with short ticks across it.
    const stitch = (a: Pt, b: Pt, n: number, len: number) => {
      line(BLACK, 5, [a, b], 1.2);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2 + range(rng, -0.35, 0.35);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        const l = len * range(rng, 0.85, 1.15);
        line(BLACK, 5, [[x - Math.cos(ang) * l, y - Math.sin(ang) * l], [x + Math.cos(ang) * l, y + Math.sin(ang) * l]], 1);
      }
    };
    stitch([140, 545], [235, 398], 5, 24);
    stitch([716, 572], [764, 695], 4, 26);
    return out;
  },
};
