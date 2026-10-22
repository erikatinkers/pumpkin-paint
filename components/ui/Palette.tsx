"use client";

import { PAINTS, useBrush } from "@/lib/store";

export default function Palette() {
  const { color, colorName, size, puffiness, sheen, setColor, setSize, setPuffiness, setSheen } = useBrush();
  return (
    <aside className="float panel" data-floating aria-label="Paint palette">
      <h2>Clay colors</h2>
      <div className="well">
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
              style={{ backgroundColor: p.hex }}
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
      </div>

      <div className="well">
        <label>Size {size}
          <input type="range" min={6} max={80} value={size} onChange={(e) => setSize(+e.target.value)} />
        </label>
        <label>Puffiness {Math.round(puffiness * 100)}%
          <input type="range" min={0} max={100} value={puffiness * 100} onChange={(e) => setPuffiness(+e.target.value / 100)} />
        </label>
        <label>Sheen {Math.round(sheen * 100)}%
          <input type="range" min={0} max={100} value={sheen * 100} onChange={(e) => setSheen(+e.target.value / 100)} />
        </label>
      </div>
    </aside>
  );
}
