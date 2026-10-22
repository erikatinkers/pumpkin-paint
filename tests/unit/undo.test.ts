import { describe, expect, it } from "vitest";
import { type TileLayer, TileHistory } from "@/lib/painting/undo";

const W = 256, H = 256;

/** In-memory RGBA layer standing in for a canvas. */
function memLayer() {
  const data = new Uint8ClampedArray(W * H * 4);
  const layer: TileLayer = {
    read(x, y, w, h) {
      const out = new Uint8ClampedArray(w * h * 4);
      for (let r = 0; r < h; r++) out.set(data.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
      return out;
    },
    write(x, y, w, h, src) {
      for (let r = 0; r < h; r++) data.set(src.subarray(r * w * 4, (r + 1) * w * 4), ((y + r) * W + x) * 4);
    },
  };
  const px = (x: number, y: number) => data[(y * W + x) * 4];
  const set = (x: number, y: number, v: number) => (data[(y * W + x) * 4] = v);
  return { layer, px, set };
}

function setup(opts = {}) {
  const a = memLayer();
  const b = memLayer();
  const events: [boolean, boolean][] = [];
  const h = new TileHistory([a.layer, b.layer], W, H, { tileSize: 128, onChange: (u, r) => events.push([u, r]), ...opts });
  const stroke = (x: number, y: number, v: number) => {
    h.begin();
    h.touch(x, y, 1, 1);
    a.set(x, y, v);
    b.set(x, y, v + 1);
    return h.commit();
  };
  return { a, b, h, stroke, events };
}

describe("TileHistory", () => {
  it("undoes and redoes a stroke across every layer", () => {
    const { a, b, h, stroke } = setup();
    stroke(10, 10, 100);
    expect([a.px(10, 10), b.px(10, 10)]).toEqual([100, 101]);
    h.undo();
    expect([a.px(10, 10), b.px(10, 10)]).toEqual([0, 0]);
    h.redo();
    expect([a.px(10, 10), b.px(10, 10)]).toEqual([100, 101]);
  });

  it("returns the tile rects to repaint", () => {
    const { h, stroke } = setup();
    stroke(130, 5, 9);
    expect(h.undo()).toEqual([{ x: 128, y: 0, w: 128, h: 128 }]);
  });

  it("only saves tiles the stroke touched", () => {
    const { h, a } = setup();
    h.begin();
    h.touch(120, 120, 20, 20); // overlaps four tiles
    a.set(121, 121, 5);
    h.commit();
    expect(h.undo()).toHaveLength(4);
    h.redo();
    h.begin();
    h.touch(5, 5, 10, 10); // inside one tile
    a.set(6, 6, 9);
    h.commit();
    expect(h.undo()).toHaveLength(1);
  });

  it("copies nothing when a stroke ends, and captures the after state on undo for redo", () => {
    const { a, h } = setup();
    h.begin();
    h.touch(3, 3, 1, 1);
    a.set(3, 3, 77);
    h.commit();
    expect(h.bytes).toBe(2 * 128 * 128 * 4); // one tile, two layers, 'before' only
    h.undo();
    a.set(3, 3, 0);
    h.redo();
    expect(a.px(3, 3)).toBe(77);
  });

  it("stacks strokes in order", () => {
    const { a, h, stroke } = setup();
    stroke(1, 1, 10);
    stroke(1, 1, 20);
    h.undo();
    expect(a.px(1, 1)).toBe(10);
    h.undo();
    expect(a.px(1, 1)).toBe(0);
    expect(h.undo()).toBeNull();
  });

  it("drops the redo stack when a new stroke is made", () => {
    const { h, stroke } = setup();
    stroke(1, 1, 10);
    h.undo();
    expect(h.canRedo).toBe(true);
    stroke(2, 2, 10);
    expect(h.canRedo).toBe(false);
  });

  it("records nothing for a stroke that touched nothing", () => {
    const { h } = setup();
    h.begin();
    expect(h.commit()).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it("keeps at most 60 strokes", () => {
    const { h, stroke } = setup();
    for (let i = 0; i < 75; i++) stroke(i, 3, 50);
    expect(h.strokeCount).toBe(60);
  });

  it("drops the oldest strokes first when over the memory cap, but keeps the newest", () => {
    const { h, stroke } = setup({ maxBytes: 1 });
    stroke(1, 1, 10);
    stroke(2, 2, 10);
    expect(h.strokeCount).toBe(1);
  });

  it("cancel restores the in-progress stroke", () => {
    const { a, h } = setup();
    h.begin();
    h.touch(7, 7, 1, 1);
    a.set(7, 7, 200);
    expect(h.cancel()).toHaveLength(1);
    expect(a.px(7, 7)).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it("clear empties both stacks and notifies", () => {
    const { h, stroke, events } = setup();
    stroke(1, 1, 10);
    h.clear();
    expect(h.canUndo || h.canRedo).toBe(false);
    expect(events[events.length - 1]).toEqual([false, false]);
  });
});
