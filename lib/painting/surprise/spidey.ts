import { range, wash } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A red pumpkin painted as a spider-hero mask: a black web radiating from a hub between the eyes, and two big white eyes with thick black rims.
 * Traced from the reference painting (about 926 by 1232 pixels, y down), whose face is centred on (460, 620).
 */
const REF_CENTRE: Pt = [460, 620];
const HUB: Pt = [445, 590];
const REDS = ["#d8321c", "#cf2c1a", "#dc3a20"];
const BLACK = "#16110f";
const WHITE = "#fbf9f4";
const REACH: Pt = [500, 500]; // how far the web runs from the hub, across and up/down

const LEFT_EYE_RIM: Pt[] = [[95, 320], [60, 450], [60, 620], [120, 720], [230, 745], [340, 680], [395, 600], [330, 520], [220, 430], [150, 370]];
const LEFT_EYE: Pt[] = [[95, 410], [85, 560], [120, 670], [210, 695], [300, 650], [335, 603], [270, 540], [190, 470], [130, 430]];
const RIGHT_EYE_RIM: Pt[] = [[770, 310], [820, 420], [830, 560], [800, 660], [720, 735], [610, 720], [540, 660], [490, 600], [560, 540], [660, 450], [730, 370]];
const RIGHT_EYE: Pt[] = [[765, 405], [800, 500], [800, 620], [770, 670], [690, 695], [600, 650], [550, 605], [600, 570], [680, 500], [740, 440]];

/** Spokes every 30 degrees from the hub, joined by threads that sag toward the middle. */
function web(): { spokes: Pt[][]; threads: Pt[][] } {
  const angles = Array.from({ length: 12 }, (_, i) => -Math.PI / 2 + (i * Math.PI) / 6);
  const at = (a: number, k: number): Pt => {
    const reach = 1 / Math.hypot(Math.cos(a) / REACH[0], Math.sin(a) / REACH[1]);
    return [HUB[0] + Math.cos(a) * reach * k, HUB[1] + Math.sin(a) * reach * k];
  };
  const spokes = angles.map((a): Pt[] => [at(a, 0.1), at(a, 1)]);
  const threads: Pt[][] = [];
  for (const k of [0.1, 0.27, 0.46, 0.68, 0.9]) {
    angles.forEach((a0) => {
      const a1 = a0 + Math.PI / 6;
      threads.push([at(a0, k), at((a0 + a1) / 2, k * 0.9), at(a1, k)]);
    });
  }
  return { spokes, threads };
}

export const spidey: Recipe = {
  name: "Web mask",
  strokes(rng: Rng) {
    const { out, line, fill } = createKit(rng, {
      refCentre: REF_CENTRE,
      sx: 0.9,
      sy: 0.7,
      u: 0.27 + range(rng, -0.012, 0.012),
      v: 0.5 + range(rng, -0.02, 0.02),
      scale: range(rng, 0.96, 1.04),
      tilt: range(rng, -0.03, 0.03),
      flip: rng() < 0.5 ? -1 : 1,
    });
    out.push(...wash(rng, REDS[Math.floor(rng() * REDS.length)]));

    const { spokes, threads } = web();
    for (const pts of spokes) line(BLACK, 3.2, pts, 1);
    for (const pts of threads) line(BLACK, 3.2, pts, 1);

    // The eyes last, so their rims cover where the web runs under them.
    fill(BLACK, 12, LEFT_EYE_RIM);
    fill(BLACK, 12, RIGHT_EYE_RIM);
    fill(WHITE, 12, LEFT_EYE);
    fill(WHITE, 12, RIGHT_EYE);
    return out;
  },
};
