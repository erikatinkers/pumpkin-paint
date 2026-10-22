import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { withInkHull } from "@/lib/pumpkinGeometry";
import { colored } from "./props";

const BOX = "#cdb48f"; // kraft paper
const LID = "#d9c3a0";
const RIBBON = "#f3e9d2"; // cream ribbon
const INSIDE = "#8f7654"; // the floor of the box, in shade
const SCRAPS = ["#ee5f55", "#f8cf3a", "#58a944", "#4aaee8", "#ec5f9e", "#fffdf7"]; // confetti left in the bottom

export const GIFT_BODY_HEIGHT = 0.5;

const at = (x: number, y: number, z: number, rotZ = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ), new THREE.Vector3(1, 1, 1));

interface PuffOptions {
  length: number;
  /** Half-width across the piece at the knot end and at the far end: it flares as it goes. */
  root: number;
  tip: number;
  /** Half-thickness at its fullest. */
  thick: number;
  /** How far the middle of the far edge is pulled back toward the knot: a little makes a curved end, a lot a swallowtail. */
  notch: number;
  /** How far the top and bottom are pressed in along the middle, like a crease in cloth. */
  crease?: number;
}

/**
 * A pillowy piece of ribbon or fabric pointing along +x from the origin: a tube whose flat, oval section widens and swells along its length,
 * with the far edge notched. Closed at both ends and smooth-shaded, so the ink outline hugs it.
 */
function puff({ length, root, tip, thick, notch, crease = 0 }: PuffOptions): THREE.BufferGeometry {
  const U = 22, V = 24;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U;
    const round = u > 0.8 ? Math.pow(Math.max(0, 1 - Math.pow((u - 0.8) / 0.2, 2)), 0.4) : 1; // rounds the far end off instead of leaving two sharp corners
    const w = (root + (tip - root) * Math.pow(u, 1.25)) * Math.max(round, 0.08);
    const t = thick * (0.3 + 0.7 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.5));
    for (let j = 0; j < V; j++) {
      const a = (j / V) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const x = length * u - notch * (1 - Math.abs(c)) * Math.pow(u, 5);
      const y = t * sn - Math.sign(sn) * crease * Math.exp(-c * c * 5) * Math.sin(u * Math.PI) * t;
      pos.push(x, y, w * c);
    }
  }
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * V + j, b = i * V + ((j + 1) % V), c = (i + 1) * V + ((j + 1) % V), d = (i + 1) * V + j;
      idx.push(a, d, b, b, d, c);
    }
  }
  // Close the two ends with a fan to a centre point.
  for (const [ring, flip] of [[0, false], [U, true]] as const) {
    const centre = pos.length / 3;
    pos.push(length * (ring / U), 0, 0);
    for (let j = 0; j < V; j++) {
      const a = ring * V + j, b = ring * V + ((j + 1) % V);
      idx.push(...(flip ? [b, a, centre] : [a, b, centre]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2)); // the box pieces carry UVs, so these must too to merge
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Places a piece at (x, y, z): turned `yaw` about the vertical, then raised `lift` about z, after rolling it `roll` about its own length. */
function place(x: number, y: number, z: number, yaw: number, lift: number, roll: number): THREE.Matrix4 {
  const axis = (v: [number, number, number], a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...v), a);
  const q = axis([0, 1, 0], yaw).multiply(axis([0, 0, 1], lift)).multiply(axis([1, 0, 0], roll));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
}

/**
 * A wrapped present, sitting on y = 0. The body and the lid are separate meshes, so the lid can pop off: the lid's own origin is the top of the body.
 * Both carry vertex colors and an ink hull, for the props material.
 */
export function createGiftBoxGeometry(): { body: THREE.BufferGeometry; lid: THREE.BufferGeometry } {
  const h = GIFT_BODY_HEIGHT;
  // The body is an open, empty box: four walls and a floor, with a few scraps of confetti left lying in the bottom.
  const W = 0.8, T = 0.06, R = 0.36; // width, wall thickness, wall centre offset
  const scrap = (i: number) => {
    const x = Math.sin(i * 12.9898) * 0.24, z = Math.cos(i * 78.233) * 0.24;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.056, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 2.1), new THREE.Vector3(1, 1, 1));
    return colored(new THREE.BoxGeometry(0.075, 0.006, 0.045), SCRAPS[i % SCRAPS.length], m);
  };
  const body = mergeGeometries([
    colored(new RoundedBoxGeometry(W, 0.05, W, 2, 0.02), INSIDE, at(0, 0.025, 0)),
    colored(new RoundedBoxGeometry(W, h, T, 2, 0.02), BOX, at(0, h / 2, R)),
    colored(new RoundedBoxGeometry(W, h, T, 2, 0.02), BOX, at(0, h / 2, -R)),
    colored(new RoundedBoxGeometry(T, h, W - 2 * T + 0.02, 2, 0.02), BOX, at(R, h / 2, 0)),
    colored(new RoundedBoxGeometry(T, h, W - 2 * T + 0.02, 2, 0.02), BOX, at(-R, h / 2, 0)),
    // Ribbon bands over the walls (the strips run over the rim, down both sides).
    colored(new RoundedBoxGeometry(0.15, h + 0.006, T + 0.012, 2, 0.015), RIBBON, at(0, h / 2, R)),
    colored(new RoundedBoxGeometry(0.15, h + 0.006, T + 0.012, 2, 0.015), RIBBON, at(0, h / 2, -R)),
    colored(new RoundedBoxGeometry(T + 0.012, h + 0.006, 0.15, 2, 0.015), RIBBON, at(R, h / 2, 0)),
    colored(new RoundedBoxGeometry(T + 0.012, h + 0.006, 0.15, 2, 0.015), RIBBON, at(-R, h / 2, 0)),
    ...Array.from({ length: 9 }, (_, i) => scrap(i)),
  ])!;
  const lid = mergeGeometries([
    colored(new RoundedBoxGeometry(0.9, 0.17, 0.9, 2, 0.03), LID, at(0, 0.075, 0)),
    colored(new RoundedBoxGeometry(0.15, 0.176, 0.906, 2, 0.02), RIBBON, at(0, 0.075, 0)),
    colored(new RoundedBoxGeometry(0.906, 0.176, 0.15, 2, 0.02), RIBBON, at(0, 0.075, 0)),
    // The bow: two puffy wings flaring out either side of a squarish knot, and two tails lying on the lid.
    colored(puff({ length: 0.34, root: 0.045, tip: 0.15, thick: 0.05, notch: 0.06, crease: 0.45 }), RIBBON, place(0.05, 0.225, 0, 0, 0.3, Math.PI / 2)),
    colored(puff({ length: 0.34, root: 0.045, tip: 0.15, thick: 0.05, notch: 0.06, crease: 0.45 }), RIBBON, place(-0.05, 0.225, 0, Math.PI, 0.3, Math.PI / 2)),
    colored(puff({ length: 0.33, root: 0.04, tip: 0.12, thick: 0.014, notch: 0.09 }), RIBBON, place(0, 0.19, 0.04, -Math.PI / 2 - 0.3, -0.02, 0)),
    colored(puff({ length: 0.3, root: 0.04, tip: 0.12, thick: 0.014, notch: 0.09 }), RIBBON, place(0, 0.19, 0.04, -Math.PI / 2 + 0.34, -0.02, 0)),
    // The knot: a squarish band the wings gather into.
    colored(new RoundedBoxGeometry(0.15, 0.115, 0.17, 3, 0.045), RIBBON, at(0, 0.225, 0)),
  ])!;
  return { body: withInkHull(body), lid: withInkHull(lid) };
}
