import { describe, expect, it } from "vitest";
import { interpolateDabs, poleStretch, seamOffsets, textureSizeFor, uvToPixel } from "@/lib/painting/strokes";

describe("pole stretch", () => {
  it("is 1 at the equator", () => {
    expect(poleStretch(512, 1024)).toBeCloseTo(1);
  });
  it("is 1/sin(latitude) between equator and pole", () => {
    expect(poleStretch(256, 1024)).toBeCloseTo(1 / Math.sin(Math.PI / 4));
  });
  it("is symmetric about the equator", () => {
    expect(poleStretch(100, 1024)).toBeCloseTo(poleStretch(1024 - 100, 1024));
  });
  it("is clamped at the pole", () => {
    expect(poleStretch(0, 1024, 10)).toBe(10);
    expect(poleStretch(1024, 1024, 10)).toBe(10);
  });
});

describe("seam wrapping", () => {
  it("draws once in the middle", () => {
    expect(seamOffsets(500, 20, 1000)).toEqual([0]);
  });
  it("also draws at x + W near the left edge", () => {
    expect(seamOffsets(10, 20, 1000)).toEqual([0, 1000]);
  });
  it("also draws at x - W near the right edge", () => {
    expect(seamOffsets(995, 10, 1000)).toEqual([0, -1000]);
  });
});

describe("stroke interpolation", () => {
  it("places dabs at the requested spacing", () => {
    const pts = interpolateDabs({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 100);
    expect(pts.map((p) => p.x)).toEqual([2, 4, 6, 8, 10]);
  });
  it("goes the short way across the seam and wraps x", () => {
    const pts = interpolateDabs({ x: 98, y: 5 }, { x: 4, y: 5 }, 2, 100);
    expect(pts.map((p) => p.x)).toEqual([0, 2, 4]);
    expect(pts.every((p) => p.x >= 0 && p.x < 100)).toBe(true);
  });
  it("returns nothing when closer than the spacing", () => {
    expect(interpolateDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, 2, 100)).toEqual([]);
  });
});

describe("uv and texture size", () => {
  it("puts v = 1 on the top row", () => {
    expect(uvToPixel(0.5, 1, 2048, 1024)).toEqual({ x: 1024, y: 0 });
    expect(uvToPixel(0, 0, 2048, 1024)).toEqual({ x: 0, y: 1024 });
  });
  it("uses 2048x1024 on desktop and 1024x512 on low-density touch screens", () => {
    expect(textureSizeFor(false)).toEqual({ width: 2048, height: 1024 });
    expect(textureSizeFor(true)).toEqual({ width: 1024, height: 512 });
    expect(textureSizeFor(true, 1.5)).toEqual({ width: 1024, height: 512 });
  });
  it("gives high-density touch screens the full size, so paint is not blurry", () => {
    expect(textureSizeFor(true, 2)).toEqual({ width: 2048, height: 1024 });
    expect(textureSizeFor(true, 3)).toEqual({ width: 2048, height: 1024 });
  });
});
