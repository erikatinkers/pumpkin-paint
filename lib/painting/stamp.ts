/**
 * Soften an RGBA image in place with a separable box blur, run `passes` times (two passes approximate a gaussian).
 * Blurs premultiplied by alpha, so a dab's transparent surround does not darken its rim.
 * Used once per cached height stamp, which turns the nine stepped rings into a smooth, pillowy coil edge.
 */
export function softenStamp(data: Uint8ClampedArray, width: number, height: number, radius = 1, passes = 2): void {
  const n = width * height;
  let a = new Float32Array(n * 4); // premultiplied rgb, alpha
  for (let i = 0; i < n; i++) {
    const al = data[i * 4 + 3] / 255;
    a[i * 4] = data[i * 4] * al;
    a[i * 4 + 1] = data[i * 4 + 1] * al;
    a[i * 4 + 2] = data[i * 4 + 2] * al;
    a[i * 4 + 3] = al;
  }
  let b = new Float32Array(n * 4);
  const taps = radius * 2 + 1;
  for (let p = 0; p < passes; p++) {
    for (const horizontal of [true, false]) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, bl = 0, al = 0;
          for (let k = -radius; k <= radius; k++) {
            const sx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
            const sy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
            const j = (sy * width + sx) * 4;
            r += a[j];
            g += a[j + 1];
            bl += a[j + 2];
            al += a[j + 3];
          }
          const o = (y * width + x) * 4;
          b[o] = r / taps;
          b[o + 1] = g / taps;
          b[o + 2] = bl / taps;
          b[o + 3] = al / taps;
        }
      }
      [a, b] = [b, a];
    }
  }
  for (let i = 0; i < n; i++) {
    const al = a[i * 4 + 3];
    data[i * 4] = al > 0 ? a[i * 4] / al : 0;
    data[i * 4 + 1] = al > 0 ? a[i * 4 + 1] / al : 0;
    data[i * 4 + 2] = al > 0 ? a[i * 4 + 2] / al : 0;
    data[i * 4 + 3] = Math.round(al * 255);
  }
}
