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
 * Tileable pigment granulation, one byte per pixel with 128 as neutral: watercolor pigment settles into the grooves of the paper,
 * so the wash is faintly speckled and fibrous. Fine and mid-scale value noise plus a little per-pixel grain.
 */
export function generateDetail(size = DETAIL_SIZE, seed = 7): Uint8ClampedArray {
  const rand = mulberry32(seed);
  const fine = valueNoise(size, Math.round(size / 3), rand);
  const mid = valueNoise(size, Math.round(size / 12), rand);
  const out = new Uint8ClampedArray(size * size);
  for (let i = 0; i < out.length; i++) {
    const n = 0.5 + (fine[i] - 0.5) * 0.7 + (mid[i] - 0.5) * 0.5 + (rand() - 0.5) * 0.3;
    out[i] = Math.round(Math.min(1, Math.max(0, n)) * 255);
  }
  return out;
}

/**
 * Low-frequency wash blotches, 128 neutral: a brushed wash never dries perfectly even, so soft pools of pigment shift the lightness. Three octaves of tileable value noise.
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

/** Granulation (R) and wash blotches (G) as one repeating texture. Generated once; the caller owns (and disposes) it. */
export function createDetailTexture(seed = 7): THREE.CanvasTexture {
  const size = DETAIL_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const fine = generateDetail(size, seed);
  const mottle = generateMottle(size, seed);
  for (let i = 0; i < fine.length; i++) {
    img.data[i * 4] = fine[i]; // R: pigment granulation
    img.data[i * 4 + 1] = mottle[i]; // G: wash blotches
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
