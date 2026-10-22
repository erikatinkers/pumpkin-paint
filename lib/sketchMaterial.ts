import * as THREE from "three";
import { addSketchInk } from "@/lib/shaders/sketchInk";

/** The paint engine still keeps a roughness layer; the sketch shader ignores it, so this is just a neutral fill. */
export const BASE_ROUGHNESS = 0.93;

/** The stem: a flat wash and a shadow shape, outlined by an ink hull (geometry must come from `withInkHull`, as must the body's). `plain` skips the shader patch (the fallback). */
export function createSketchMaterial(color: string, detail: THREE.Texture, marks: "stem", plain = false): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: BASE_ROUGHNESS, metalness: 0 });
  if (!plain) addSketchInk(mat, detail, { hull: true, marks });
  return mat;
}

/** Pumpkin skin: the paint color layer is the wash; the height layer only marks where strokes begin and end (for the pen). Textures are owned (and disposed) by the engine. */
export function createPaintedSketchMaterial(
  maps: { color: THREE.Texture; height: THREE.Texture },
  /** Pass `plain: true` for the fallback: just the color map, no shader patch. */
  extras: { detail: THREE.Texture; plain?: boolean },
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", map: maps.color, roughness: BASE_ROUGHNESS, metalness: 0 });
  if (!extras.plain) addSketchInk(mat, extras.detail, { body: true, hull: true, height: maps.height });
  return mat;
}

/** The desk things around the page: vertex colors give each piece its own wash, and a thinner ink hull suits their small size. */
export function createPropsMaterial(detail: THREE.Texture, plain = false): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: BASE_ROUGHNESS, metalness: 0 });
  if (!plain) addSketchInk(mat, detail, { hull: true, hullWidth: 0.0007 });
  return mat;
}
