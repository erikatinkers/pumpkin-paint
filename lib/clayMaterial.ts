import * as THREE from "three";
import { addClayDetail } from "@/lib/shaders/clayDetail";
import { addClayGlow } from "@/lib/shaders/clayGlow";

export const CLAY_ROUGHNESS = 0.93;

/** Dead-matte, powdery pastel clay: near-max roughness, no metalness, almost no specular. */
export function createClayMaterial(color: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: CLAY_ROUGHNESS,
    metalness: 0,
    envMapIntensity: 1,
  });
  addClayGlow(mat);
  return mat;
}

/** Pumpkin skin: the paint layers drive color, bump height and roughness. Textures are owned (and disposed) by the engine. */
export function createPaintedClayMaterial(
  maps: { color: THREE.Texture; height: THREE.Texture; roughness: THREE.Texture },
  /** Pass `plain: true` for the fallback: no shader patches at all, just the three paint maps. */
  extras: { detail?: THREE.Texture; plain?: boolean } = {},
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: maps.color,
    bumpMap: maps.height,
    bumpScale: 4,
    roughnessMap: maps.roughness,
    roughness: 1, // the roughness layer holds the real values
    metalness: 0,
  });
  if (!extras.plain) {
    addClayGlow(mat);
    if (extras.detail) addClayDetail(mat, extras.detail);
  }
  return mat;
}
