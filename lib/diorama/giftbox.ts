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
    // The bow: two loops either side of a knot.
    colored(new THREE.TorusGeometry(0.1, 0.035, 8, 16), RIBBON, at(-0.11, 0.25, 0, 0.5)),
    colored(new THREE.TorusGeometry(0.1, 0.035, 8, 16), RIBBON, at(0.11, 0.25, 0, -0.5)),
    colored(new THREE.SphereGeometry(0.06, 10, 8), RIBBON, at(0, 0.19, 0)),
  ])!;
  return { body: withInkHull(body), lid: withInkHull(lid) };
}
