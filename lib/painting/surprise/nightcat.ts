import { pick, range, wash } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A matte black pumpkin with two slit-pupil cat eyes, a silver crescent moon between them and chalky whiskers.
 * Traced from the reference painting (about 534 by 588 pixels, y down), whose pumpkin is centred on (270, 365).
 */
const REF_CENTRE: Pt = [270, 365];
const BASES = ["#1d1a1b", "#201d1e", "#252124", "#1a1819"];
const EYES = ["#d2ae6c", "#d89a3e", "#bfc98a", "#a9c4d6"]; // gold, amber, pale green, ice
const RIM = "#f1e8d4";
const SILVER = "#e6e4de";

const LEFT_EYE: Pt[] = [[100, 320], [140, 321], [172, 340], [196, 372], [207, 411], [163, 401], [127, 378], [105, 348]];
const RIGHT_EYE: Pt[] = [[418, 322], [378, 329], [340, 351], [310, 382], [292, 411], [338, 399], [383, 373], [410, 346]];

export const nightcat: Recipe = {
  name: "Night cat",
  strokes(rng: Rng) {
    const { out, line, fill } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: 1.25,
      sy: 1.3,
      u: 0.27 + range(rng, -0.012, 0.012),
      v: 0.56 + range(rng, -0.03, 0.01), // the camera looks down on the pumpkin, so the middle of the front sits a little above the equator
      scale: range(rng, 0.92, 1.05),
      tilt: range(rng, -0.04, 0.04),
      flip: rng() < 0.5 ? -1 : 1,
    });

    // The whole pumpkin: matte black, a little uneven.
    out.push(...wash(rng, pick(rng, BASES)));

    // Eyes: a pale rim, a coloured iris, and a thin black slit.
    const iris = pick(rng, EYES);
    for (const [eye, slit] of [[LEFT_EYE, [[152, 340], [148, 388]]], [RIGHT_EYE, [[355, 342], [350, 389]]]] as [Pt[], Pt[]][]) {
      line(RIM, 4, [...eye, eye[0]], 1);
      fill(iris, 5, eye);
      line("#1b1716", 4.5, slit, 0.8);
    }

    // A crescent moon above the nose bridge, drawn as two arcs that nearly meet at the points.
    if (rng() < 0.9) {
      const arc = (r: number, from: number, to: number, cx: number, cy: number): Pt[] =>
        Array.from({ length: 14 }, (_, i) => {
          const a = from + ((to - from) * i) / 13;
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
        });
      line(SILVER, 8, arc(30, 1.9, 5.3, 258, 278), 0.8);
      line(SILVER, 6, arc(23, 2.1, 5.1, 262, 278), 0.8);
      line(SILVER, 4, arc(16, 2.3, 4.9, 266, 278), 0.8);
    }

    // Whiskers: three or four a side, long, fine and faint like chalk.
    const left: [Pt, Pt][] = [[[80, 405], [186, 462]], [[72, 440], [178, 472]], [[95, 490], [180, 490]], [[88, 470], [182, 478]]];
    const right: [Pt, Pt][] = [[[452, 416], [322, 462]], [[440, 452], [326, 478]], [[412, 500], [324, 492]], [[446, 478], [326, 484]]];
    const n = rng() < 0.5 ? 3 : 4;
    for (const side of [left, right]) for (const [a, b] of side.slice(0, n)) line(SILVER, 2.1, [a, b], 1.2);
    return out;
  },
};
