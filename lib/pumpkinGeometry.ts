import * as THREE from "three";

export const RIBS = 9;
const TAU = Math.PI * 2;

/**
 * Recompute normals, then average them across vertices that share a position.
 * Sphere/lathe geometry duplicates vertices along the UV seam and at the poles, which would
 * otherwise leave a visible shading crease.
 */
export function smoothSeams(geo: THREE.BufferGeometry): void {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const i of g) {
      x += nor.getX(i);
      y += nor.getY(i);
      z += nor.getZ(i);
    }
    const len = Math.hypot(x, y, z) || 1;
    for (const i of g) nor.setXYZ(i, x / len, y / len, z / len);
  }
  nor.needsUpdate = true;
}

/**
 * Chubby hand-pressed pumpkin: 9 soft ribs, a slight wobble, dimpled poles.
 * Every displacement is periodic in u (integer frequencies of the azimuth), so the UV seam closes
 * and paint maps cleanly around the body.
 */
export function createPumpkinGeometry(widthSegs = 160, heightSegs = 112): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(1, widthSegs, heightSegs);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = uv.getX(i), v = uv.getY(i);
    const phi = u * TAU;
    const theta = (1 - v) * Math.PI; // 0 at the top pole
    const s = Math.sin(theta);
    const polar = Math.min(theta, Math.PI - theta);

    // Soft rounded ribs; each rib is a touch different, like pressed clay.
    const ribAmp = 0.09 * (1 + 0.18 * Math.sin(2 * phi + 1.3) + 0.1 * Math.sin(3 * phi + 0.4));
    const rib = 1 + ribAmp * Math.cos(RIBS * phi) * Math.pow(s, 0.7);

    // Chubby belly, plus low-frequency wobble so no edge is perfectly straight.
    const belly = 1 + 0.07 * s * s;
    const wobble =
      1 +
      0.022 * Math.sin(2 * phi + 0.7) * s +
      0.016 * Math.sin(4 * phi + 2.1) * s +
      0.014 * Math.sin(theta * 3 + phi + 0.5) * s;

    const r = rib * belly * wobble * 1.04;

    // Polar dimples: a smooth bowl rather than a crease.
    const dimple = 0.21 * Math.exp(-Math.pow(polar / 0.45, 2));
    const lift = 0.015 * Math.sin(3 * phi + 1.9) * s; // uneven height around the belly

    pos.setXYZ(i, x * r, y * 0.84 - Math.sign(y || 1) * dimple + lift, z * r);
  }
  smoothSeams(geo);
  return geo;
}

/** Chunky stem: lathe profile with a flared base and rounded cap, five soft ridges, bent to one side. */
export function createStemGeometry(): THREE.LatheGeometry {
  const profile: THREE.Vector2[] = [];
  const H = 0.46;
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const flare = 0.075 * Math.exp(-t * 7); // wide base blends into the dimple
    const cap = t > 0.86 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) : 1; // round the top
    const r = (0.1 + 0.025 * t + flare) * cap;
    profile.push(new THREE.Vector2(Math.max(r, 0.001), t * H));
  }
  const geo = new THREE.LatheGeometry(profile, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / H;
    const ridge = 1 + 0.07 * Math.cos(Math.atan2(z, x) * 5) * Math.min(1, t * 4);
    const bend = 0.16 * t * t;
    pos.setXYZ(i, x * ridge + bend, y, z * ridge + 0.03 * t);
  }
  smoothSeams(geo);
  return geo;
}

/** One fat clay leaf, base at the origin and tip along +x: a squashed, pointed ellipsoid with a centre fold and an upward curl. */
export function createLeafGeometry(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(1, 28, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (x + 1) / 2; // 0 at the stem end, 1 at the tip
    const width = 0.2 * (1 - 0.5 * t);
    const tip = t > 0.85 ? 1 + 0.18 * Math.pow((t - 0.85) / 0.15, 2) : 1; // gently pointed tip
    pos.setXYZ(i, (x + 1) * 0.3 * tip, y * 0.08 - 0.05 * Math.abs(z) + 0.12 * t * t, z * width);
  }
  smoothSeams(geo);
  return geo;
}

/** Low-poly twin of the pumpkin body, same shape function and UVs, used only for pointer raycasts (about 5x fewer triangles). */
export function createPumpkinPickGeometry(): THREE.SphereGeometry {
  return createPumpkinGeometry(72, 48);
}
