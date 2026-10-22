import { pick, range } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A black cat with an arched back, tail hooked over, standing on the orange skin. Traced from the reference painting
 * (about 756 by 848 pixels, y down), whose pumpkin is centred on (358, 482).
 */
const REF_CENTRE: Pt = [358, 482];
const SX = 1.0; // texture pixels across the pumpkin per reference pixel
const SY = 1.0; // and down it
const FURS = ["#1b1716", "#1b1716", "#241c22", "#1e1a1a"];
const EYES = ["#f2c230", "#f0b429", "#e6d04a", "#9ccf4a"];

export const cat: Recipe = {
  name: "Black cat",
  strokes(rng: Rng) {
    const { out, line, dab, fill, ellipse } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: SX,
      sy: SY,
      u: 0.232 + range(rng, -0.012, 0.012), // a touch round to the left, so the head (right of the picture's middle) stays on the front
      v: 0.5 + range(rng, -0.02, 0.03),
      scale: range(rng, 0.9, 1.02),
      tilt: range(rng, -0.05, 0.05),
      flip: rng() < 0.5 ? -1 : 1,
    });
    const fur = pick(rng, FURS);

    // Tail: a thick curve rising from the rump and hooking over, thinner toward the tip.
    line(fur, 17, [[208, 492], [178, 436], [166, 372], [184, 315], [215, 281]], 1.5);
    line(fur, 13, [[215, 281], [248, 270], [272, 288], [264, 322]], 1.2);
    dab(fur, 9, 262, 326);

    // Body: the arched back and belly in one filled shape, then the legs.
    fill(fur, 14, [[205, 472], [214, 424], [252, 388], [308, 369], [370, 368], [420, 386], [455, 422], [470, 470], [457, 530], [430, 562], [395, 572], [350, 562], [300, 542], [255, 524], [222, 512]]);

    // Legs: two behind, two in front, each ending in a flat foot.
    line(fur, 22, [[242, 520], [224, 610], [228, 690], [254, 744]], 1.5);
    fill(fur, 9, ellipse(282, 748, 30, 11));
    line(fur, 18, [[292, 540], [286, 620], [282, 700], [296, 742]], 1.5);
    line(fur, 20, [[430, 560], [408, 640], [402, 700], [406, 748]], 1.5);
    fill(fur, 9, ellipse(408, 755, 28, 11));
    line(fur, 17, [[462, 550], [452, 640], [446, 700], [450, 748]], 1.5);
    fill(fur, 9, ellipse(450, 752, 26, 11));

    // Head with pointed ears, turned toward us.
    fill(fur, 11, [[465, 502], [478, 446], [497, 470], [516, 490], [546, 490], [562, 456], [578, 452], [576, 500], [581, 542], [566, 586], [536, 606], [500, 606], [468, 586], [455, 546]]);

    // Eyes: amber almonds with a black slit, a pink nose, and whiskers.
    const eye = pick(rng, EYES);
    for (const x of [484, 543]) {
      fill(eye, 4.5, ellipse(x, 549, 14, 10, x < 500 ? 0.25 : -0.25));
      line("#1b1716", 2.4, [[x, 540], [x, 558]], 0.5);
    }
    dab("#e88a8a", 4, 512, 574);
    for (const [a, b] of [[[568, 562], [606, 558]], [[570, 570], [604, 580]], [[566, 577], [590, 598]]] as [Pt, Pt][]) line(fur, 1.7, [a, b], 0.8);
    return out;
  },
};
