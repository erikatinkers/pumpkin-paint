import { describe, expect, it } from "vitest";
import { generateDetail } from "@/lib/painting/detail";

const N = 128;

describe("clay detail map", () => {
  const a = generateDetail(N, 3);

  it("is deterministic for a seed", () => {
    expect(Array.from(generateDetail(N, 3))).toEqual(Array.from(a));
    expect(Array.from(generateDetail(N, 4))).not.toEqual(Array.from(a));
  });

  it("stays centred on neutral and uses real range", () => {
    const full = generateDetail(); // features are sized in pixels, so judge the real 512 map
    const mean = full.reduce((n, v) => n + v, 0) / full.length;
    expect(mean).toBeGreaterThan(115);
    expect(mean).toBeLessThan(140);
    let lo = 255, hi = 0;
    for (const v of full) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    expect(hi - lo).toBeGreaterThan(40);
  });

  it("tiles: the wrap-around seam is no rougher than the interior", () => {
    const colDiff = (x0: number, x1: number) => {
      let sum = 0;
      for (let y = 0; y < N; y++) sum += Math.abs(a[y * N + x0] - a[y * N + x1]);
      return sum / N;
    };
    let interior = 0;
    for (let x = 10; x < N - 10; x++) interior += colDiff(x, x + 1);
    interior /= N - 20;
    expect(colDiff(N - 1, 0)).toBeLessThan(interior * 1.6);

    const rowDiff = (y0: number, y1: number) => {
      let sum = 0;
      for (let x = 0; x < N; x++) sum += Math.abs(a[y0 * N + x] - a[y1 * N + x]);
      return sum / N;
    };
    let rowInterior = 0;
    for (let y = 10; y < N - 10; y++) rowInterior += rowDiff(y, y + 1);
    rowInterior /= N - 20;
    expect(rowDiff(N - 1, 0)).toBeLessThan(rowInterior * 1.6);
  });
});
