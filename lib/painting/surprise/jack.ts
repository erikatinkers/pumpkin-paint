import { pick, range } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A simple painted jack-o'-lantern in black on the orange skin: triangle eyes and nose, a wide smile with a stepped grin, a spider web in each top corner,
 * and a few sparkles and dots. Traced from the reference painting (about 864 by 968 pixels, y down), whose pumpkin is centred on (415, 520).
 */
const REF_CENTRE: Pt = [415, 520];
const INKS = ["#1b1716", "#1b1716", "#1b1716", "#241a2c"];

const LEFT_EYE: Pt[] = [[292, 358], [190, 493], [346, 534]];
const RIGHT_EYE: Pt[] = [[570, 372], [497, 543], [646, 513]];
const NOSE: Pt[] = [[422, 520], [348, 655], [488, 657]];
const SMILE: Pt[] = [
  // Top edge, left to right: a sweeping curve with a raised block in the middle.
  [148, 576], [168, 632], [206, 676], [250, 704], [268, 712], [268, 724], [330, 724], [330, 728], [488, 728], [488, 724], [556, 724], [556, 712], [578, 700], [630, 660], [668, 622], [686, 592],
  // Bottom edge, right to left, stepped to make the teeth.
  [660, 652], [620, 722], [562, 790], [520, 820], [472, 846], [432, 846], [432, 812], [360, 812], [360, 838], [312, 820], [252, 782], [202, 722], [162, 642],
];

/** A spider web: spokes fanning out from a corner, joined by curved threads that sag toward the centre. */
function web(cx: number, cy: number, reach: number, from: number, to: number, spokes: number): Pt[][] {
  const out: Pt[][] = [];
  const angle = (i: number) => from + ((to - from) * i) / (spokes - 1);
  for (let i = 0; i < spokes; i++) out.push([[cx, cy], [cx + Math.cos(angle(i)) * reach, cy + Math.sin(angle(i)) * reach]]);
  for (const k of [0.35, 0.62, 0.88]) {
    for (let i = 0; i + 1 < spokes; i++) {
      const a0 = angle(i);
      const a1 = angle(i + 1);
      const am = (a0 + a1) / 2;
      const r = reach * k;
      out.push([[cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], [cx + Math.cos(am) * r * 0.86, cy + Math.sin(am) * r * 0.86], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]]);
    }
  }
  return out;
}

export const jack: Recipe = {
  name: "Jack-o'-lantern",
  strokes(rng: Rng) {
    const { out, line, dab, fill } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: 0.85,
      sy: 0.92,
      u: 0.27 + range(rng, -0.012, 0.012),
      v: 0.52 + range(rng, -0.03, 0.01),
      scale: range(rng, 0.94, 1.05),
      tilt: range(rng, -0.04, 0.04),
      flip: rng() < 0.5 ? -1 : 1,
    });
    const ink = pick(rng, INKS);

    // The face: three triangles and a smile.
    fill(ink, 12, LEFT_EYE);
    fill(ink, 12, RIGHT_EYE);
    fill(ink, 10, NOSE);
    fill(ink, 12, SMILE);

    // A web in each top corner (either may be left out), and sparkles and dots between.
    if (rng() < 0.85) for (const pts of web(118, 330, 170, -2.7, -0.4, 6)) line(ink, 2.6, pts, 1);
    if (rng() < 0.85) for (const pts of web(776, 352, 150, -3.6, -0.5, 5)) line(ink, 2.6, pts, 1);
    const sparkle = (x: number, y: number, h: number, diagonals: boolean) => {
      line(ink, 2.6, [[x, y - h], [x, y + h]], 0.6);
      line(ink, 2.6, [[x - h * 0.55, y], [x + h * 0.55, y]], 0.6);
      if (diagonals) {
        line(ink, 2.2, [[x - h * 0.4, y - h * 0.4], [x + h * 0.4, y + h * 0.4]], 0.5);
        line(ink, 2.2, [[x - h * 0.4, y + h * 0.4], [x + h * 0.4, y - h * 0.4]], 0.5);
      }
    };
    sparkle(380, 285, 40, true);
    sparkle(103, 690, 36, false);
    sparkle(708, 712, 36, false);
    sparkle(212, 810, 34, false);
    for (const [x, y] of [[397, 452], [502, 332], [723, 553], [60, 548], [302, 872], [317, 215]]) if (rng() < 0.85) dab(ink, range(rng, 4.5, 6.5), x, y);
    return out;
  },
};
