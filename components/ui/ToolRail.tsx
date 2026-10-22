"use client";

import { useBrush } from "@/lib/store";
import { PaintIcon, TurnIcon } from "./icons";
import Toolbar from "./Toolbar";

/** Left rail: what the pointer does (paint or turn), then undo, redo and clear. */
export default function ToolRail() {
  const tool = useBrush((s) => s.tool);
  const setTool = useBrush((s) => s.setTool);
  return (
    <aside className="float rail" data-floating aria-label="Tools">
      <div className="keys" role="group" aria-label="Pointer mode">
        <button className="key" aria-pressed={tool === "paint"} onClick={() => setTool("paint")}>
          <span className="key-icon"><PaintIcon /></span>
          <span className="key-label">Paint</span>
        </button>
        <button className="key" aria-pressed={tool === "turn"} onClick={() => setTool("turn")}>
          <span className="key-icon"><TurnIcon /></span>
          <span className="key-label">Turn</span>
        </button>
      </div>
      <Toolbar />
    </aside>
  );
}
