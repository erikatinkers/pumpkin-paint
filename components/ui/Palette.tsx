"use client";

import { PAINTS, useBrush } from "@/lib/store";
import Toolbar from "./Toolbar";

export default function Palette() {
  const { color, colorName, size, puffiness, sheen, tool, setColor, setSize, setPuffiness, setSheen, setTool } = useBrush();
  return (
    <aside className="panel" aria-label="Paint palette">
      <div className="pills" role="group" aria-label="Pointer mode">
        <button className="pill" aria-pressed={tool === "paint"} onClick={() => setTool("paint")}>Paint</button>
        <button className="pill" aria-pressed={tool === "turn"} onClick={() => setTool("turn")}>Turn</button>
      </div>

      <Toolbar />

      <h2>Clay colors</h2>
      <div className="swatches" role="radiogroup" aria-label="Clay colors">
        {PAINTS.map((p) => (
          <button
            key={p.hex}
            className="dollop"
            role="radio"
            aria-checked={p.hex === color}
            aria-label={p.name}
            title={p.name}
            onClick={() => setColor(p.hex, p.name)}
            style={{ background: p.hex }}
          />
        ))}
      </div>
      <p>{colorName} <small>{color.toUpperCase()}</small></p>
      <input
        type="color"
        aria-label="Custom color"
        value={color}
        onChange={(e) => setColor(e.target.value, "Custom")}
      />

      <label>Size {size}
        <input type="range" min={6} max={80} value={size} onChange={(e) => setSize(+e.target.value)} />
      </label>
      <label>Puffiness {Math.round(puffiness * 100)}%
        <input type="range" min={0} max={100} value={puffiness * 100} onChange={(e) => setPuffiness(+e.target.value / 100)} />
      </label>
      <label>Sheen {Math.round(sheen * 100)}%
        <input type="range" min={0} max={100} value={sheen * 100} onChange={(e) => setSheen(+e.target.value / 100)} />
      </label>
    </aside>
  );
}
