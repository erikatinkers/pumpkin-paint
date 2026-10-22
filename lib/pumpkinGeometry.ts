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
 * Chubby hand-pressed pumpkin: 9 plump lobes with crisp grooves between them, a slight wobble, dimpled poles.
 * Every displacement is periodic in u (integer frequencies of the azimuth), so the UV seam closes
 * and paint maps cleanly around the body.
 */
export function createPumpkinGeometry(widthSegs = 256, heightSegs = 112): THREE.SphereGeometry {
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

    // Plump lobes separated by narrow, crisp grooves running pole to pole. |sin(RIBS * phi / 2)| is 0 along each groove and 1 down the
    // middle of each lobe; raising it to a small power flattens the lobe and leaves a tight V at the crease. The seam sits in a groove.
    const lobe = Math.sqrt(Math.pow(Math.sin((RIBS * phi) / 2), 2) + 0.0002);
    const depth = 0.23 * (1 + 0.16 * Math.sin(2 * phi + 1.3) + 0.09 * Math.sin(3 * phi + 0.4)) * Math.pow(s, 0.45);
    const rib = 1 - depth * (1 - Math.pow(lobe, 0.3));

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

/** Low-poly twin of the pumpkin body, same shape function and UVs, used only for pointer raycasts (about 3x fewer triangles). */
export function createPumpkinPickGeometry(): THREE.SphereGeometry {
  return createPumpkinGeometry(192, 64);
}

/**
 * Adds an ink outline to a closed shape without a second draw call: a copy of the mesh with flipped winding, flagged by `aHull`.
 * Consumes `geo`. The sketch material pushes those vertices outward along their normals and paints them ink, so only the rim behind the shape shows.
 */
export function withInkHull(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = geo.index ? geo : geo.toNonIndexed();
  const n = src.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv", "color"] as const) {
    const a = src.attributes[name];
    if (!a) continue;
    const arr = new Float32Array(a.array.length * 2);
    arr.set(a.array as Float32Array);
    arr.set(a.array as Float32Array, a.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  const hull = new Float32Array(n * 2);
  hull.fill(1, n);
  out.setAttribute("aHull", new THREE.BufferAttribute(hull, 1));
  const idx = src.index ? Array.from(src.index.array) : Array.from({ length: n }, (_, i) => i);
  const flipped: number[] = [];
  for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i] + n, idx[i + 2] + n, idx[i + 1] + n);
  out.setIndex([...idx, ...flipped]);
  if (src !== geo) src.dispose();
  geo.dispose(); // consumed: the caller keeps only the returned geometry
  return out;
}
