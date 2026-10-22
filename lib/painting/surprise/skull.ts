import { pick, range, tint, wash } from "./helpers";
import { type Pt, createKit } from "./kit";
import type { Recipe, Rng } from "./types";

/**
 * A painted sugar skull: black eyes ringed with orange petals, a heart nose, a stitched mouth, scrolling brows, and flowers either side.
 * Shapes are written in the pixel coordinates of the reference painting (about 1000 by 830, y down, centred on 500, 415); `map` turns those into UV.
 */
const REF_CENTRE: [number, number] = [500, 415];
const SX = 0.8; // texture pixels across the pumpkin per reference pixel
const SY = 0.86; // and down it
const BLACK = "#1b1716";
const ORANGES = ["#ee7f2d", "#f08a2e", "#f29a3a"];
const BASES = ["#f7f4ec", "#f7f4ec", "#f4efe3", "#eef3ee", "#f1edf4"];
const FLOWER_PETALS = ["#8c3d96", "#c13a8e", "#d84a6a", "#4a6fc4", "#e07a2a"];
const LEAVES = ["#3a8fc8", "#2fb59a", "#2f9a54", "#9a3f9a"];

export const skull: Recipe = {
  name: "Sugar skull",
  strokes(rng: Rng) {
    const tilt = range(rng, -0.06, 0.06);
    const scale = range(rng, 0.94, 1.06);
    const flip = rng() < 0.5 ? -1 : 1;
    const uc = 0.25 + range(rng, -0.015, 0.015); // u = 0.25 faces the camera when the page loads
    const vc = 0.5 + range(rng, -0.02, 0.02);

    const { out, line, dab, fill, ellipse, rays } = createKit(rng, { refCentre: REF_CENTRE, sx: SX, sy: SY, u: uc, v: vc, scale, tilt, flip });
    const maybe = (p: number) => rng() < p;
    /** A leaf: a stroke from base to tip with a paler vein down it. */
    const leaf = (color: string, x0: number, y0: number, x1: number, y1: number, size = 9) => {
      line(color, size, [[x0, y0], [(x0 + x1) / 2 + range(rng, -6, 6), (y0 + y1) / 2 + range(rng, -6, 6)], [x1, y1]], 1.5);
      line("#e8f2e8", 1.6, [[x0, y0], [x1, y1]], 1);
    };
    const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [1000 - x, y] as Pt);

    // The whole pumpkin: white paint, a little uneven.
    out.push(...wash(rng, pick(rng, BASES)));

    // Flowers and leaves either side, drawn first so the face sits over them.
    const bloom = (cx: number, cy: number, petal: string, big: number) => {
      rays(cx, cy, 9, 24, big, [petal, tint(petal, rng, 0.12)], 12);
      rays(cx, cy, 9, 30, big * 0.8, ["#3d1c4f"], 2.4);
      dab(pick(rng, ORANGES), 22, cx, cy);
      dab("#7a2c18", 8, cx, cy);
    };
    const side = (flipX: number) => {
      const x = (v: number) => (flipX < 0 ? 1000 - v : v);
      const leaves = [pick(rng, LEAVES), pick(rng, LEAVES), pick(rng, LEAVES)];
      leaf(leaves[0], x(150), 270, x(165), 195);
      leaf(leaves[1], x(215), 268, x(246), 224);
      leaf(leaves[2], x(155), 420, x(138), 478);
      leaf(pick(rng, LEAVES), x(188), 425, x(206), 495);
      bloom(x(166), 352, pick(rng, FLOWER_PETALS), 72);
      dab(pick(rng, LEAVES), 9, x(192), 236);
      dab(pick(rng, LEAVES), 10, x(237), 391);
    };
    side(1);
    side(-1);

    // Cheek ovals and the four-petal blue flowers by the nose.
    fill(pick(rng, ORANGES), 12, ellipse(285, 470, 42, 28, -0.1));
    fill(pick(rng, ORANGES), 12, ellipse(710, 474, 42, 28, 0.1));
    const blue = pick(rng, ["#3c6fc0", "#4a7fd0", "#3f63b8"]);
    for (const cx of [375, 628]) {
      rays(cx, 486, 4, 6, 30, [blue], 9, 0.35);
      dab("#2a4f98", 5, cx, 486);
    }

    // Eyes: black, ringed with orange petals.
    const eyes: [number, number, number, number][] = [[355, 328, 92, 90], [650, 322, 86, 84]];
    for (const [cx, cy, rx, ry] of eyes) {
      fill(BLACK, 18, ellipse(cx, cy, rx, ry, range(rng, -0.1, 0.1)));
      const petal = pick(rng, ORANGES);
      rays(cx, cy, 16, rx + 8, rx + 36, [petal, tint(petal, rng, 0.08)], 10);
    }

    // The heart nose, point up.
    fill(BLACK, 11, [[503, 330], [470, 420], [443, 455], [455, 485], [485, 478], [503, 455], [522, 478], [555, 485], [562, 455], [536, 420]]);

    // Brows: two scrolling lines from the bridge of the nose, with a rosette between.
    const brow: Pt[] = [[500, 285], [488, 250], [455, 215], [400, 190], [350, 165], [338, 128]];
    const twig: Pt[] = [[430, 200], [395, 158], [385, 125]];
    for (const pts of [brow, mirror(brow), twig, mirror(twig)]) line(BLACK, 4.5, pts, 1.2);
    for (const [x, y] of [[338, 128], [385, 125], [662, 128], [615, 125]]) dab(BLACK, 8, x, y);
    fill(pick(rng, ORANGES), 12, ellipse(500, 145, 46, 40));
    line("#6b2a18", 2.6, Array.from({ length: 26 }, (_, i) => { const a = i * 0.55; const r = 38 - i * 1.3; return [500 + Math.cos(a) * r, 145 + Math.sin(a) * r * 0.9] as Pt; }), 0.8);
    leaf("#f4d03f", 468, 238, 482, 276, 7);
    leaf(pick(rng, ORANGES), 528, 240, 515, 285, 7);
    leaf("#a43a9b", 503, 214, 503, 252, 6);
    dab("#b34aa1", 12, 322, 185);
    dab("#b34aa1", 11, 677, 177);

    // The mouth: thick curling corners, a line, and tall stitches.
    const mouthL: Pt[] = [[250, 508], [285, 530], [330, 575], [360, 640]];
    line(BLACK, 13, mouthL, 1.5);
    line(BLACK, 13, mirror(mouthL).map(([x, y]) => [x, y + 4] as Pt), 1.5);
    line(BLACK, 3.6, [[365, 598], [440, 601], [520, 605], [600, 597], [655, 588]], 1.2);
    for (const x of [368, 410, 450, 513, 574, 622, 654]) {
      const mid = 600 + (x - 510) * -0.04;
      line(BLACK, 3.8, [[x + range(rng, -3, 3), mid - range(rng, 34, 58)], [x + range(rng, -3, 3), mid + range(rng, 34, 46)]], 1);
    }

    // Underneath: scrolls, a big star flower and little ones, and dabs of paint.
    const scroll: Pt[] = [[310, 682], [338, 688], [372, 712], [410, 740]];
    for (const pts of [scroll, mirror(scroll)]) line(BLACK, 6.5, pts, 1.2);
    dab(BLACK, 11, 333, 697);
    dab(BLACK, 11, 667, 705);
    const star = pick(rng, ["#a8285f", "#b8326e", "#8c2a6c"]);
    rays(500, 725, 10, 9, 66, [star], 6);
    dab("#f2f0ea", 5, 500, 735);
    for (const cx of [385, 600]) {
      rays(cx, 676, 5, 6, 24, ["#c8b4d8"], 4.2);
      dab("#e4a43a", 4, cx, 676);
    }
    dab(pick(rng, ORANGES), 12, 380, 728);
    dab("#f2b92e", 11, 607, 737);

    // Spiky little flowers low on the sides.
    if (maybe(0.85)) {
      rays(205, 585, 8, 4, 38, ["#2f8f55", "#e8b030"], 3.5);
      dab("#dfe8ee", 4, 205, 585);
    }
    if (maybe(0.85)) rays(790, 603, 10, 4, 40, [pick(rng, ORANGES)], 3.5);
    if (maybe(0.7)) {
      rays(780, 175, 4, 4, 22, ["#2fb59a"], 3.5);
      dab("#6cc4a8", 5, 810, 238);
    }
    return out;
  },
};
