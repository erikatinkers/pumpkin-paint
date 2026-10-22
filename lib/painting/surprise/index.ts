import type { PaintEngine } from "../engine";
import { useBrush } from "@/lib/store";
import { RECIPES } from "./recipes";
import type { Recipe, Rng, Stroke } from "./types";

export { RECIPES } from "./recipes";
export type { Recipe, Rng, Stroke } from "./types";

const SPACING = 0.3; // dab gap as a fraction of the radius: wider than hand painting's, since a painting this size has thousands of dabs to draw before the next frame
const STEP = 0.006; // spacing of the samples fed to the brush, as a fraction of the texture's height
/** Kept for callers that stop a surprise before the user's own stroke: a surprise now paints in one go, so none is ever in progress. */
export function cancelSurprise(): void {}

/** The points along a stroke, close enough together that the brush leaves a continuous line. */
function sample(stroke: Stroke): [number, number][] {
  const out: [number, number][] = [stroke.points[0]];
  for (let i = 1; i < stroke.points.length; i++) {
    const [u0, v0] = stroke.points[i - 1];
    const [u1, v1] = stroke.points[i];
    const n = Math.max(1, Math.ceil(Math.hypot((u1 - u0) * 2, v1 - v0) / STEP));
    for (let k = 1; k <= n; k++) out.push([u0 + ((u1 - u0) * k) / n, v0 + ((v1 - v0) * k) / n]);
  }
  return out;
}

/**
 * Paints a randomly chosen recipe onto the pumpkin all at once. It starts from bare skin, and the whole painting is one undo step.
 * Returns the recipe it chose, or null if there are none.
 */
export function startSurprise(engine: PaintEngine, rng: Rng = Math.random, recipe?: Recipe): Recipe | null {
  const chosen = recipe ?? RECIPES[Math.floor(rng() * RECIPES.length)];
  if (!chosen) return null;

  const { puffiness, sheen } = useBrush.getState();
  engine.beginFresh();
  for (const stroke of chosen.strokes(rng)) {
    engine.breakPath();
    for (const [u, v] of sample(stroke)) {
      engine.strokeTo(((u % 1) + 1) % 1, v, { color: stroke.color, size: stroke.size, puffiness, sheen, spacing: SPACING });
    }
  }
  engine.endStroke();
  return chosen;
}
