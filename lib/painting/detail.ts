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

/** Tileable value noise in [0, 1]: a wrapping lattice of random values, smoothly interpolated. */
function valueNoise(size: number, cells: number, rand: () => number): Float32Array {
  const lattice = new Float32Array(cells * cells);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const out = new Float32Array(size * size);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = smooth(gy - y0);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = smooth(gx - x0);
      const a = lattice[(y0 % cells) * cells + (x0 % cells)];
      const b = lattice[(y0 % cells) * cells + ((x0 + 1) % cells)];
      const c = lattice[(((y0 + 1) % cells) * cells) + (x0 % cells)];
      const d = lattice[(((y0 + 1) % cells) * cells) + ((x0 + 1) % cells)];
      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/**
 * Tileable surface detail for pressed clay, one byte per pixel with 128 as neutral:
 * a few fingerprint whorls (crisp ridges that break up and fade, like a real thumb press), shallow thumb dents with a lifted rim,
 * tiny pits and fine powdery grain. Every feature measures distance with wrap-around, so the map tiles with no visible seam.
 */
export function generateDetail(size = DETAIL_SIZE, seed = 7): Uint8ClampedArray {
  const rand = mulberry32(seed);
  const field = new Float32Array(size * size);
  const breakup = valueNoise(size, 18, rand); // ridges come and go along their length
  const warpX = valueNoise(size, 7, rand); // bends the ridges so no whorl is a perfect bullseye
  const warpY = valueNoise(size, 7, rand);

  const splat = (cx: number, cy: number, radius: number, fn: (dx: number, dy: number, R: number, idx: number) => number) => {
    const reach = Math.ceil(radius * 1.6);
    for (let oy = -reach; oy <= reach; oy++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const x = (((Math.round(cx) + ox) % size) + size) % size;
        const y = (((Math.round(cy) + oy) % size) + size) % size;
        const idx = y * size + x;
        field[idx] += fn(wrapDelta(x, cx, size), wrapDelta(y, cy, size), radius, idx);
      }
    }
  };

  // Fingerprint whorls: slightly oval, off-round ridges with a crisp crest and a flat valley.
  for (let i = 0; i < 3; i++) {
    const cx = rand() * size, cy = rand() * size;
    const radius = 105 + rand() * 45;
    const period = 17 + rand() * 4;
    const squash = 0.75 + rand() * 0.3;
    const tilt = rand() * Math.PI;
    const twist = 0.6 + rand() * 0.8;
    const phase = rand() * Math.PI * 2;
    const [cos, sin] = [Math.cos(tilt), Math.sin(tilt)];
    splat(cx, cy, radius, (dx, dy, R, idx) => {
      const wx = dx + (warpX[idx] - 0.5) * 26;
      const wy = dy + (warpY[idx] - 0.5) * 26;
      const u = wx * cos + wy * sin;
      const v = (-wx * sin + wy * cos) / squash;
      const r = Math.hypot(u, v);
      const angle = Math.atan2(v, u);
      const wave = Math.sin((r / period) * Math.PI * 2 + twist * Math.sin(angle * 2 + phase) * 3.4 + 1.1 * Math.sin(angle * 3 + phase));
      const crest = Math.pow(0.5 + 0.5 * wave, 1.7) - 0.38;
      const fade = Math.exp(-Math.pow(r / R, 3));
      const gaps = Math.min(1, Math.max(0.15, 0.6 + 1.1 * (breakup[idx] - 0.5)));
      return 0.4 * crest * fade * gaps;
    });
  }

  // Shallow thumb dents with a faintly lifted rim.
  for (let i = 0; i < 3; i++) {
    splat(rand() * size, rand() * size, 60 + rand() * 25, (dx, dy, R) => {
      const t = Math.hypot(dx, dy) / R;
      return -0.16 * Math.exp(-Math.pow(t / 0.55, 2)) + 0.05 * Math.exp(-Math.pow((t - 0.75) / 0.2, 2));
    });
  }

  // Tiny pits.
  for (let i = 0; i < 170; i++) {
    splat(rand() * size, rand() * size, 2 + rand() * 1.6, (dx, dy, R) => -0.4 * Math.exp(-Math.pow(Math.hypot(dx, dy) / (R * 0.7), 2)));
  }

  const out = new Uint8ClampedArray(size * size);
  for (let i = 0; i < field.length; i++) {
    const grain = (rand() - 0.5) * 0.1; // fine powdery grain
    out[i] = Math.round((0.5 + field[i] + grain) * 255);
  }
  return out;
}

/**
 * Low-frequency pigment mottling, 128 neutral: clay is never perfectly evenly colored, so a few soft blotches shift the lightness
 * by a few percent. Three octaves of tileable value noise.
 */
export function generateMottle(size = DETAIL_SIZE, seed = 7): Uint8ClampedArray {
  const rand = mulberry32(seed * 7919 + 13);
  const layers = [valueNoise(size, 3, rand), valueNoise(size, 6, rand), valueNoise(size, 12, rand)];
  const weights = [0.58, 0.3, 0.12];
  const out = new Uint8ClampedArray(size * size);
  for (let i = 0; i < out.length; i++) {
    const n = layers[0][i] * weights[0] + layers[1][i] * weights[1] + layers[2][i] * weights[2];
    out[i] = Math.round(Math.min(1, Math.max(0, 0.5 + (n - 0.5) * 1.5)) * 255);
  }
  return out;
}

/** Detail (R) and mottling (G) as one repeating texture. Generated once; the caller owns (and disposes) it. */
export function createDetailTexture(seed = 7): THREE.CanvasTexture {
  const size = DETAIL_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const fine = generateDetail(size, seed);
  const mottle = generateMottle(size, seed);
  for (let i = 0; i < fine.length; i++) {
    img.data[i * 4] = fine[i]; // R: fingerprints, dents, pits, grain
    img.data[i * 4 + 1] = mottle[i]; // G: pigment mottling
    img.data[i * 4 + 2] = 128;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}
