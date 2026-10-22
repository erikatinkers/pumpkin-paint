import type { PaintEngine } from "./engine";

/** The live engine, so UI outside the Canvas (toolbar buttons) can reach it without routing pointer-speed state through React. */
let current: PaintEngine | null = null;

export const paintRegistry = {
  get: (): PaintEngine | null => current,
  set: (engine: PaintEngine | null): void => {
    current = engine;
  },
};
