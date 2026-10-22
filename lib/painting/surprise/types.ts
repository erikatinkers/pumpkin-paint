/** Seeded or plain: every recipe draws all its randomness from one of these, so a seed can replay a painting. */
export type Rng = () => number;

/** One pen stroke in UV space: u runs round the pumpkin (0 to 1, wrapping), v from the bottom (0) to the stem (1). */
export interface Stroke {
  color: string;
  /** Dab radius, in px of a 2048-wide texture (the brush slider's units, 6 to 80). */
  size: number;
  points: [number, number][];
}

/**
 * One kind of surprise. `strokes` returns the whole painting in drawing order; the runner paints it back as an animation.
 * To add an inspiration, write a Recipe in its own file and add it to `RECIPES` in `index.ts`.
 */
export interface Recipe {
  name: string;
  strokes: (rng: Rng) => Stroke[];
}
