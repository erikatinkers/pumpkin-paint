import { type Brush } from "./brush";
import type { PaintEngine } from "./engine";
import { PAINTS } from "@/lib/store";

const hex = (name: string) => PAINTS.find((p) => p.name === name)!.hex;
const base = { puffiness: 0.8, sheen: 0.1 };

/**
 * A few example strokes so the first view is never an empty pumpkin: a lavender wave, a mint wave, and a row of pink and cream dots.
 * UV (0.25, 0.5) faces the default camera. The seed is part of the starting state, not history: undo can't remove it, Clear can.
 */
export function seedExampleStrokes(engine: PaintEngine): void {
  const wave = (brush: Brush, v: number, phase: number) => {
    engine.beginStroke();
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      engine.strokeTo(0.07 + t * 0.36, v + 0.045 * Math.sin(t * Math.PI * 3 + phase), brush);
    }
    engine.endStroke();
  };
  wave({ ...base, color: hex("Lavender"), size: 20 }, 0.7, 0);
  wave({ ...base, color: hex("Mint"), size: 20 }, 0.57, Math.PI);

  const dots = 11;
  for (let i = 0; i < dots; i++) {
    engine.beginStroke();
    engine.strokeTo(0.08 + (i / (dots - 1)) * 0.34, 0.44, { ...base, color: hex(i % 2 ? "Cream" : "Rosy"), size: 17 });
    engine.endStroke();
  }

  engine.history.clear();
  engine.flush();
}
