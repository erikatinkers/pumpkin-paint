import { describe, expect, it } from "vitest";
import { HEIGHT_RINGS, brushRadius, heightProfile, roughnessForSheen } from "@/lib/painting/brush";

describe("height profile (round clay tube)", () => {
  it("uses 9 concentric rings from outside in", () => {
    const rings = heightProfile(1);
    expect(rings).toHaveLength(HEIGHT_RINGS);
    expect(rings[0].radius).toBe(1);
    for (let i = 1; i < rings.length; i++) expect(rings[i].radius).toBeLessThan(rings[i - 1].radius);
  });
  it("rises monotonically toward the centre and never exceeds the amplitude", () => {
    const rings = heightProfile(0.6);
    for (let i = 1; i < rings.length; i++) expect(rings[i].value).toBeGreaterThan(rings[i - 1].value);
    expect(Math.max(...rings.map((r) => r.value))).toBeLessThanOrEqual(0.6);
    expect(rings[rings.length - 1].value).toBeGreaterThan(0.55);
  });
  it("follows the edge of a circle: steep at the rim, flat at the top", () => {
    const rings = heightProfile(1, 9);
    const first = rings[1].value - rings[0].value;
    const last = rings[8].value - rings[7].value;
    expect(first).toBeGreaterThan(last);
  });
  it("is flat at zero puffiness", () => {
    expect(heightProfile(0).every((r) => r.value === 0)).toBe(true);
  });
});

describe("brush mapping", () => {
  it("maps sheen 0..1 to roughness 0.95..0.62", () => {
    expect(roughnessForSheen(0)).toBeCloseTo(0.95);
    expect(roughnessForSheen(1)).toBeCloseTo(0.62);
    expect(roughnessForSheen(5)).toBeCloseTo(0.62);
  });
  it("scales radius with texture width", () => {
    expect(brushRadius(26, 2048)).toBe(26);
    expect(brushRadius(26, 1024)).toBe(13);
  });
});
