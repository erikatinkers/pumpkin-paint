import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { withInkHull } from "@/lib/pumpkinGeometry";
import { HOLE_X, PAPER_D, PAPER_W } from "./pageTexture";
import { type Shade, paintShade } from "./shade";

export function colored(geo: THREE.BufferGeometry, hex: string, matrix: THREE.Matrix4): THREE.BufferGeometry {
  // Merging needs every piece indexed or none: some (the rounded box) come unindexed, so make them all so.
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(name)) g.deleteAttribute(name);
  return g;
}

const compose = (x: number, y: number, z: number, yaw = 0, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s, s));

const METAL = "#b9bec8";

/** A pencil lying on the page: a body, a wooden cone with a graphite point, a metal band and a pink eraser. Its tip points along +x before `yaw`. */
function pencil(parts: THREE.BufferGeometry[], floorY: number, x: number, z: number, yaw: number, body: string, len = 1.5) {
  const base = compose(x, floorY + 0.07, z, yaw);
  const along = (dx: number, rotZ = 0) => base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(dx, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ), new THREE.Vector3(1, 1, 1)));
  const b = new THREE.CapsuleGeometry(0.065, len, 4, 8);
  parts.push(colored(b, body, along(0, Math.PI / 2)));
  // The sharpened wood narrows to exactly the width of the lead, and the lead's base sits on that end, so the point is one unbroken taper.
  const wood = new THREE.CylinderGeometry(0.026, 0.065, 0.22, 8);
  parts.push(colored(wood, "#e6c590", along(len / 2 + 0.17, -Math.PI / 2)));
  const lead = new THREE.ConeGeometry(0.026, 0.09, 8);
  parts.push(colored(lead, "#3a3030", along(len / 2 + 0.325, -Math.PI / 2)));
  // The metal band and the eraser are flat-ended cylinders, so the back of the pencil reads as a crisp ferrule rather than a stack of rounded pills.
  const ferrule = new THREE.CylinderGeometry(0.068, 0.068, 0.14, 8);
  parts.push(colored(ferrule, METAL, along(-len / 2 - 0.04, Math.PI / 2)));
  for (const dx of [-0.01, -0.07]) parts.push(colored(new THREE.CylinderGeometry(0.073, 0.073, 0.02, 8), METAL, along(-len / 2 + dx - 0.02, Math.PI / 2)));
  const rub = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8);
  parts.push(colored(rub, "#f2a0b4", along(-len / 2 - 0.16, Math.PI / 2)));
}

/** How thick the stack of pages is, in world units. The top page is the surface the pumpkin stands on; the notebook rests on the ground below it. */
export const STACK = 0.5;

/** Where the gift box sits: on the ground behind the notebook, across from the mug (the box itself is its own mesh, see `GiftBox`). */
export const GIFT = { x: -3.7, z: -5.0, yaw: -0.4, scale: 1.4 };

/**
 * The notebook's body and the loose things around it, merged into one mesh with an ink hull:
 *  - a block of pages under the top sheet (a handful of slabs, a little ragged, so the edge shows stacked leaves) on a back cover;
 *  - the metal coil binding: one wire wound through the punched holes and round the left edge, like a real spiral;
 *  - pencils, a paintbrush, a ruler, paint tubes, an eraser, a coffee mug and shavings, strewn on the top page and on the ground around the notebook.
 * `floorY` is where the pumpkin stands. Each loose thing adds a `Shade`, so it can sit on a soft shadow wherever it lies.
 */
export function createDeskGeometry(floorY: number, shades: Shade[] = []): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const along = (base: THREE.Matrix4, dx: number) =>
    base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(dx, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
  const page = floorY - 0.04; // things lying on the top page
  const ground = floorY - 0.05 - STACK; // things lying beside the notebook
  const shade = (onPage: boolean, x: number, z: number, hl: number, hw: number, yaw: number) => shades.push({ x, z, hl, hw, yaw, onPage });

  // Notebook body: a back cover, then pages in ragged slabs (their ink edges read as the stack of leaves).
  const slabs = 6;
  const bodyTop = floorY - 0.09; // just under the top page's surface
  const slab = (bodyTop - ground - 0.07) / slabs;
  parts.push(colored(new RoundedBoxGeometry(PAPER_W + 0.3, 0.07, PAPER_D + 0.3, 2, 0.03), "#b8643f", compose(0.02, ground + 0.035, 0.02, 0)));
  for (let i = 0; i < slabs; i++) {
    const jx = Math.sin(i * 2.3) * 0.045, jz = Math.cos(i * 3.1) * 0.045;
    parts.push(colored(new RoundedBoxGeometry(PAPER_W - 0.02 + jx, slab, PAPER_D - 0.02 + jz, 2, 0.02), i % 2 ? "#f4ecd8" : "#efe5cb", compose(jx * 0.5, ground + 0.07 + slab * (i + 0.5), jz * 0.5, Math.sin(i * 1.7) * 0.01)));
  }

  // Coil binding: one continuous round wire wound like a real spiral. Each turn comes up through a punched hole in the top page, arcs over the margin and
  // the edge, goes down outside the cover and back under the pages to the next hole. It advances 0.4 along the spine per turn, so turn k comes up at
  // hole k (the page texture punches the holes at the same x and z).
  const loopR = 0.32;
  const half = (page - ground) / 2; // the loop crosses the top page this far above its centre
  const cross = Math.sqrt(loopR * loopR - half * half);
  const spineX = HOLE_X - cross, midY = (page + ground) / 2;
  const holeAngle = Math.atan2(half, cross); // where in a turn the wire crosses the top page, at the hole
  const turns = 18, perTurn = 24;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= turns * perTurn + perTurn; i++) {
    const turn = (i - perTurn / 2) / perTurn;
    const th = holeAngle + turn * Math.PI * 2;
    pts.push(new THREE.Vector3(spineX + loopR * Math.cos(th), midY + loopR * Math.sin(th), -3.4 + 0.4 * turn));
  }
  parts.push(colored(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.034, 8, false), METAL, new THREE.Matrix4()));

  // Pencils, crossed and dropped at all angles: some on the page, some on the ground.
  const pencils: [boolean, number, number, number, string, number][] = [
    [true, -3.0, 3.0, 0.5, "#f2c94c", 1.5],
    [true, -0.9, 2.3, -0.95, "#5a8fd8", 1.3],
    [true, 4.2, -3.1, 2.3, "#e9684f", 1.4],
    [false, -5.9, -4.9, 0.9, "#6fae4f", 1.5],
    [false, -6.7, 1.3, 1.95, "#f2a0b4", 1.2],
    [false, 1.0, 5.4, 2.75, "#e9684f", 1.0],
  ];
  for (const [on, x, z, yaw, c, len] of pencils) {
    pencil(parts, on ? page : ground, x, z, yaw, c, len);
    shade(on, x + 0.08, z, len / 2 + 0.3, 0.1, yaw);
  }

  // Paintbrush on the ground in front, a little askew.
  const brush = compose(2.6, ground + 0.06, 5.0, -0.2);
  parts.push(colored(new THREE.CapsuleGeometry(0.05, 1.5, 4, 8), "#8c4a3a", along(brush, -0.25)));
  parts.push(colored(new THREE.CapsuleGeometry(0.062, 0.3, 4, 8), METAL, along(brush, 0.7)));
  parts.push(colored(new THREE.ConeGeometry(0.06, 0.42, 8), "#d98a3c", along(brush, 1.05).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI))));
  shade(false, 2.68, 5.0, 1.2, 0.1, -0.2);

  // Ruler on the ground behind the notebook, tilted.
  parts.push(colored(new RoundedBoxGeometry(2.8, 0.05, 0.38, 3, 0.02), "#ecd9a0", compose(-1.4, ground + 0.03, -5.0, 0.12)));
  shade(false, -1.32, -5.0, 1.45, 0.22, 0.12);

  // Paint tubes: one on the page, one tipped on the ground. A pale cap on each.
  for (const [on, x, z, yaw, c] of [[true, 4.3, 2.6, 0.8, "#ee5f55"], [false, 6.0, 4.6, -0.35, "#4aaee8"]] as const) {
    const m = compose(x, (on ? page : ground) + 0.12, z, yaw);
    parts.push(colored(new THREE.CapsuleGeometry(0.12, 0.7, 4, 10), c, along(m, 0)));
    parts.push(colored(new THREE.CapsuleGeometry(0.08, 0.1, 4, 8), "#f4efe2", along(m, 0.62)));
    shade(on, x + 0.1, z, 0.65, 0.2, yaw);
  }

  // An eraser on the ground by the right edge: pink with a blue sleeve.
  const eraser = compose(6.5, ground + 0.1, 0.8, 0.7);
  parts.push(colored(new RoundedBoxGeometry(0.62, 0.2, 0.34, 3, 0.04), "#f2a0b4", eraser.clone().multiply(new THREE.Matrix4().makeTranslation(-0.12, 0, 0))));
  parts.push(colored(new RoundedBoxGeometry(0.3, 0.22, 0.36, 3, 0.04), "#5a7fd0", eraser.clone().multiply(new THREE.Matrix4().makeTranslation(0.3, 0, 0))));
  shade(false, 6.55, 0.8, 0.5, 0.25, 0.7);

  // The gift box's shadow, falling to the right.
  shade(false, GIFT.x + 0.4, GIFT.z + 0.05, 0.62 * GIFT.scale, 0.52 * GIFT.scale, GIFT.yaw);

  // A coffee mug on the ground behind, a little to the right.
  const profile = [[0.001, 0], [0.3, 0], [0.36, 0.05], [0.37, 0.6], [0.34, 0.66], [0.001, 0.66]].map(([r, y]) => new THREE.Vector2(r, y));
  const mugM = compose(3.3, ground, -5.2, 0.3, 1.6);
  parts.push(colored(new THREE.LatheGeometry(profile, 24), "#8ec5c0", mugM));
  parts.push(colored(new THREE.TorusGeometry(0.17, 0.045, 8, 16), "#8ec5c0", mugM.clone().multiply(new THREE.Matrix4().makeTranslation(0.46, 0.34, 0))));
  parts.push(colored(new THREE.CircleGeometry(0.31, 20), "#6b4426", mugM.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.64, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))));
  shade(false, 3.8, -5.1, 0.95, 0.68, 0.3);

  // Shavings beside the yellow pencil's point.
  const curl = new THREE.TorusGeometry(0.06, 0.018, 6, 10, 4.6);
  [[-2.0, 2.75, 0.4], [-1.85, 3.1, 1.7], [-2.2, 3.35, 2.9], [-1.7, 2.9, 4.0]].forEach(([x, z, r]) => {
    parts.push(colored(curl.clone(), "#e6c590", new THREE.Matrix4().compose(new THREE.Vector3(x, page + 0.015, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, r)), new THREE.Vector3(1, 1, 1))));
  });
  curl.dispose();

  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("desk geometry failed to merge");
  return withInkHull(merged);
}

export const SHADE_AREA = { w: 20, d: 16 };

/** The shadows of everything that lies on the ground, and a wide soft halo under the notebook itself. The page's own things are baked into the page texture. */
export function createShadeTexture(shades: Shade[]): THREE.CanvasTexture {
  const W = 1024;
  const H = Math.round((W * SHADE_AREA.d) / SHADE_AREA.w);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const k = W / SHADE_AREA.w;
  const at = (s: Shade) => [((s.x + 0.14) / SHADE_AREA.w + 0.5) * W, ((s.z - 0.04) / SHADE_AREA.d + 0.5) * H] as const;
  paintShade(ctx, { x: 0.25, z: 0.3, hl: PAPER_W / 2 + 0.3, hw: PAPER_D / 2 + 0.3, yaw: 0, onPage: false }, ...at({ x: 0.25, z: 0.3 } as Shade), k, 0.9, true);
  for (const s of shades) if (!s.onPage) paintShade(ctx, s, ...at(s), k);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
