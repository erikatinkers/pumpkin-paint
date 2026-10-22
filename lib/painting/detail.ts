import * as THREE from "three";

export const DETAIL_SIZE = 512;
export const DETAIL_REPEAT: [number, number] = [6, 3];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shortest signed distance between two coordinates on a wrapping axis, so every feature tiles seamlessly. */
function wrapDelta(a: number, b: number, size: number): number {
  let d = a - b;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}

/**
 * Tileable height/detail map for pressed clay, one byte per pixel with 128 as neutral:
 * faint fingerprint whorls, tiny pits, shallow thumb dents and fine powdery grain.
 * Every feature measures distance with wrap-around, so the map tiles with no visible seam.
 */
export function generateDetail(size = DETAIL_SIZE, seed = 7): Uint8ClampedArray {
  const rand = mulberry32(seed);
  const field = new Float32Array(size * size);

  const splat = (cx: number, cy: number, radius: number, fn: (dx: number, dy: number, r: number) => number) => {
    const reach = Math.ceil(radius * 2.2);
    for (let oy = -reach; oy <= reach; oy++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const x = (((Math.round(cx) + ox) % size) + size) % size;
        const y = (((Math.round(cy) + oy) % size) + size) % size;
        field[y * size + x] += fn(wrapDelta(x, cx, size), wrapDelta(y, cy, size), radius);
      }
    }
  };

  // Fingerprint whorls: warped concentric ridges inside a soft round window.
  for (let i = 0; i < 6; i++) {
    const cx = rand() * size, cy = rand() * size;
    const radius = 85 + rand() * 40;
    const period = 17 + rand() * 6;
    const twist = 0.5 + rand();
    const phase = rand() * Math.PI * 2;
    splat(cx, cy, radius, (dx, dy, R) => {
      const r = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const ridge = Math.sin((r / period) * Math.PI * 2 + twist * Math.sin(angle * 2 + phase) * 2.4 + 0.6 * Math.sin(angle * 3));
      return 0.15 * ridge * Math.exp(-Math.pow(r / R, 2));
    });
  }

  // Shallow thumb dents: wide, soft dips.
  for (let i = 0; i < 4; i++) {
    splat(rand() * size, rand() * size, 55 + rand() * 25, (dx, dy, R) => -0.11 * Math.exp(-Math.pow(Math.hypot(dx, dy) / (R * 0.6), 2)));
  }

  // Tiny pits.
  for (let i = 0; i < 110; i++) {
    splat(rand() * size, rand() * size, 2 + rand() * 1.6, (dx, dy, R) => -0.34 * Math.exp(-Math.pow(Math.hypot(dx, dy) / (R * 0.7), 2)));
  }

  const out = new Uint8ClampedArray(size * size);
  for (let i = 0; i < field.length; i++) {
    const grain = (rand() - 0.5) * 0.09; // fine powdery grain
    out[i] = Math.round((0.5 + field[i] + grain) * 255);
  }
  return out;
}

/** The detail map as a repeating texture. Generated once; the caller owns (and disposes) it. */
export function createDetailTexture(seed?: number): THREE.CanvasTexture {
  const size = DETAIL_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const values = generateDetail(size, seed);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}
