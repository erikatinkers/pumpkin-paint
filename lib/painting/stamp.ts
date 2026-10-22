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
  // A sliding window per row or column: each step adds the pixel entering the window and drops the one leaving it (edges clamp), so cost does not grow with `radius`.
  const blurLine = (start: number, stride: number, len: number) => {
    for (let c = 0; c < 4; c++) {
      const at = (i: number) => a[start + Math.min(len - 1, Math.max(0, i)) * stride + c];
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += at(k);
      for (let i = 0; i < len; i++) {
        b[start + i * stride + c] = sum / taps;
        sum += at(i + radius + 1) - at(i - radius);
      }
    }
  };
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < height; y++) blurLine(y * width * 4, 4, width);
    [a, b] = [b, a];
    for (let x = 0; x < width; x++) blurLine(x * 4, width * 4, height);
    [a, b] = [b, a];
  }
  for (let i = 0; i < n; i++) {
    const al = a[i * 4 + 3];
    data[i * 4] = al > 0 ? a[i * 4] / al : 0;
    data[i * 4 + 1] = al > 0 ? a[i * 4 + 1] / al : 0;
    data[i * 4 + 2] = al > 0 ? a[i * 4 + 2] / al : 0;
    data[i * 4 + 3] = Math.round(al * 255);
  }
}
