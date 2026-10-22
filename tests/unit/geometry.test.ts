import { describe, expect, it } from "vitest";
import { createPumpkinGeometry, createStemGeometry, RIBS } from "@/lib/pumpkinGeometry";

describe("pumpkin geometry", () => {
  it("has the expected number of ribs", () => {
    expect(RIBS).toBe(9);
  });
  it("is flattened vertically", () => {
    const g = createPumpkinGeometry(32, 24);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    expect(box.max.y - box.min.y).toBeLessThan(box.max.x - box.min.x);
  });
  it("closes the UV seam with matching positions and normals", () => {
    const w = 32;
    const g = createPumpkinGeometry(w, 24);
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let row = 1; row < 24; row++) {
      const a = row * (w + 1), b = a + w;
      expect(pos.getX(a)).toBeCloseTo(pos.getX(b), 5);
      expect(pos.getZ(a)).toBeCloseTo(pos.getZ(b), 5);
      expect(nor.getX(a)).toBeCloseTo(nor.getX(b), 5);
      expect(nor.getZ(a)).toBeCloseTo(nor.getZ(b), 5);
    }
  });
  it("dimples the poles below the shoulders", () => {
    const g = createPumpkinGeometry(32, 24);
    const pos = g.attributes.position;
    let top = -Infinity;
    for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
    expect(pos.getY(0)).toBeLessThan(top - 0.05); // vertex 0 is the top pole
  });
  it("builds the stem with finite vertices", () => {
    for (const g of [createStemGeometry()]) {
      for (const v of g.attributes.position.array) expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("has narrow grooves much deeper than the lobe surface around them", () => {
    const w = 288; // 32 columns per rib
    const g = createPumpkinGeometry(w, 56);
    const pos = g.attributes.position;
    const row = 28 * (w + 1); // equator row
    const radius = (col: number) => Math.hypot(pos.getX(row + col), pos.getZ(row + col));
    const groove = radius(0); // the seam sits in a groove
    const lobeMid = radius(16);
    const nearGroove = radius(4); // about an eighth of a rib away
    expect(groove).toBeLessThan(lobeMid * 0.88);
    expect(nearGroove).toBeGreaterThan(groove * 1.05); // the crease is narrow: it recovers quickly
  });
});
