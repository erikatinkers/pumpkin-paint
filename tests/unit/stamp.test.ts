import { describe, expect, it } from "vitest";
import { softenStamp } from "@/lib/painting/stamp";
import { generateMottle } from "@/lib/painting/detail";

/** A white square on a transparent field. */
function square(size: number, inner: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const lo = (size - inner) / 2;
  for (let y = lo; y < lo + inner; y++) {
    for (let x = lo; x < lo + inner; x++) data.set([200, 200, 200, 255], (y * size + x) * 4);
  }
  return data;
}

describe("softenStamp", () => {
  it("turns a hard edge into a ramp without brightening anything", () => {
    const data = square(16, 8);
    softenStamp(data, 16, 16, 1, 2);
    const row = 8;
    const alphas = Array.from({ length: 16 }, (_, x) => data[(row * 16 + x) * 4 + 3]);
    const edge = alphas.slice(2, 8); // from outside into the square
    for (let i = 1; i < edge.length; i++) expect(edge[i]).toBeGreaterThanOrEqual(edge[i - 1]);
    expect(alphas.some((a) => a > 0 && a < 255)).toBe(true);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(255);
  });

  it("keeps the colour at the rim instead of darkening it toward the transparent surround", () => {
    const data = square(16, 8);
    softenStamp(data, 16, 16, 1, 2);
    const rim = data[(8 * 16 + 4) * 4]; // a pixel on the fading edge
    expect(data[(8 * 16 + 4) * 4 + 3]).toBeGreaterThan(0);
    expect(rim).toBeGreaterThan(190);
  });

  it("leaves a fully empty stamp empty", () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    softenStamp(data, 8, 8);
    expect(data.every((v) => v === 0)).toBe(true);
  });
});

describe("pigment mottling", () => {
  const m = generateMottle(128, 3);
  it("is deterministic and centred on neutral", () => {
    expect(Array.from(generateMottle(128, 3))).toEqual(Array.from(m));
    const mean = m.reduce((n, v) => n + v, 0) / m.length;
    expect(mean).toBeGreaterThan(105);
    expect(mean).toBeLessThan(150);
  });
  it("is low-frequency: neighbouring pixels barely differ", () => {
    let sum = 0;
    for (let i = 0; i < m.length - 1; i++) sum += Math.abs(m[i] - m[i + 1]);
    expect(sum / m.length).toBeLessThan(6);
  });
  it("tiles across the wrap", () => {
    let seam = 0, interior = 0;
    for (let y = 0; y < 128; y++) {
      seam += Math.abs(m[y * 128] - m[y * 128 + 127]);
      interior += Math.abs(m[y * 128 + 60] - m[y * 128 + 61]);
    }
    expect(seam).toBeLessThan(interior * 3 + 40);
  });
});
