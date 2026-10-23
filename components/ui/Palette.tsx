"use client";

import type { CSSProperties } from "react";
import { PAINTS, useBrush } from "@/lib/store";
import Window from "./Window";

/** The fill of a segmented bar, as a percentage the stylesheet reads. */
const fill = (pct: number) => ({ "--v": `${pct}%` }) as CSSProperties;

export default function Palette() {
  const { color, colorName, size, setColor, setSize, closePalette } = useBrush();
  return (
    <Window className="panel" label="Paint palette" onClose={closePalette} title="www.pumpkin.paint/colors">
      <h2>Watercolors</h2>
      <div className="well">
        <div className="swatches" role="radiogroup" aria-label="Watercolors">
          {PAINTS.map((p) => (
            <button
              key={p.hex}
              className="dollop"
              role="radio"
              aria-checked={p.hex === color}
              aria-label={p.name}
              title={p.name}
              onClick={() => setColor(p.hex, p.name)}
              style={{ backgroundColor: p.hex }}
            />
          ))}
        </div>
        <p>{colorName} <small>{color.toUpperCase()}</small></p>
      </div>

      <div className="well tuning">
        <input
          type="color"
          aria-label="Custom color"
          value={color}
          onChange={(e) => setColor(e.target.value, "Custom")}
        />
        <label>Size {size}
          <input type="range" min={6} max={80} value={size} style={fill(((size - 6) / 74) * 100)} onChange={(e) => setSize(+e.target.value)} />
        </label>
      </div>
    </Window>
  );
}
