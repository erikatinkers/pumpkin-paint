import { pick, range, wash } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A plain white kitten face on a pale pumpkin: a rounded body with two pointed ears, dot eyes, a tiny nose and four whiskers.
 * Traced from the reference painting (about 800 by 880 pixels, y down), whose pumpkin is centred on (430, 455).
 */
const REF_CENTRE: Pt = [430, 455];
const BASES = ["#e6d9bd", "#e9dcc2", "#dcd5bb", "#d3dac4"]; // cream, ivory, wheat, pale sage: warm enough for the white kitten to stand out
const INK = "#1b1716";

export const kitty: Recipe = {
  name: "White kitty",
  strokes(rng: Rng) {
    const { out, line, dab, fill } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: 1.15,
      sy: 1.1,
      u: 0.27 + range(rng, -0.012, 0.012),
      v: 0.5 + range(rng, -0.03, 0.01),
      scale: range(rng, 0.92, 1.08),
      tilt: range(rng, -0.03, 0.03),
      flip: rng() < 0.5 ? -1 : 1,
    });

    // The whole pumpkin: a pale wash, a little uneven.
    out.push(...wash(rng, pick(rng, BASES)));

    // The kitten: ears, head, and a body that widens to the bottom.
    fill("#fffefa", 16, [[340, 322], [386, 392], [482, 396], [545, 325], [572, 382], [580, 470], [591, 560], [606, 650], [601, 730], [570, 762], [430, 782], [280, 772], [245, 722], [245, 650], [262, 560], [285, 470], [300, 400], [322, 345]]);

    // Eyes: round dots, or now and then closed and smiling.
    if (rng() < 0.7) {
      dab(INK, 12, 370, 484);
      dab(INK, 12, 488, 486);
    } else {
      line(INK, 3.4, [[354, 490], [370, 476], [386, 490]], 0.8);
      line(INK, 3.4, [[472, 492], [488, 478], [504, 492]], 0.8);
    }
    // A tiny triangle for a nose, and whiskers two a side.
    fill(INK, 5, [[411, 514], [444, 514], [428, 542]]);
    for (const [a, b] of [[[333, 516], [371, 526]], [[334, 543], [371, 544]], [[487, 526], [523, 520]], [[487, 548], [521, 551]]] as [Pt, Pt][]) line(INK, 3, [a, b], 0.8);
    return out;
  },
};
