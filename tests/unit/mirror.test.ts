import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CanvasMirror } from "@/lib/painting/textures";

const W = 8, H = 4;

/** A canvas context stand-in whose pixels are just a number per pixel in the red channel. */
function fakeCtx(pixel: (x: number, y: number) => number) {
  return {
    getImageData(x: number, y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) data[(r * w + c) * 4] = pixel(x + c, y + r);
      return { data };
    },
  } as unknown as CanvasRenderingContext2D;
}

describe("CanvasMirror", () => {
  it("does a full upload first, stored bottom-up so no flipY is needed", () => {
    const m = new CanvasMirror(fakeCtx((x, y) => y * 10 + x), W, H, false);
    m.sync();
    const data = m.texture.image.data as Uint8Array;
    expect(data[(0 * W + 0) * 4]).toBe(3 * 10 + 0); // texture row 0 = canvas bottom row (y = 3)
    expect(data[((H - 1) * W + 2) * 4]).toBe(0 * 10 + 2); // texture top row = canvas row 0
    expect(m.texture.updateRanges).toHaveLength(0);
    expect(m.texture.version).toBeGreaterThan(0);
  });

  it("sends only the dirty box once the GPU has the first upload", () => {
    let v = 1;
    const m = new CanvasMirror(fakeCtx((x, y) => (x === 3 && y === 1 ? v : 0)), W, H, false);
    m.sync();
    m.texture.onUpdate!(m.texture); // what three calls after the first real upload
    v = 99;
    m.mark(3, 1, 2, 2);
    m.sync();
    const ranges = m.texture.updateRanges;
    expect(ranges).toHaveLength(2); // one range per row
    expect(ranges[0].count).toBe(2 * 4);
    const data = m.texture.image.data as Uint8Array;
    expect(data[((H - 1 - 1) * W + 3) * 4]).toBe(99);
  });

  it("falls back to a full upload when the whole canvas changed", () => {
    const m = new CanvasMirror(fakeCtx(() => 5), W, H, true);
    m.sync();
    m.texture.onUpdate!(m.texture);
    m.markAll();
    m.sync();
    expect(m.texture.updateRanges).toHaveLength(0);
    expect(m.texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("does nothing when nothing changed", () => {
    const m = new CanvasMirror(fakeCtx(() => 0), W, H, false);
    m.sync();
    const v = m.texture.version;
    m.sync();
    expect(m.texture.version).toBe(v);
  });
});
