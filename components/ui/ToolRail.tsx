"use client";

import { useBrush } from "@/lib/store";
import { CameraIcon, EraseIcon, PaintIcon, TurnIcon } from "./icons";
import Toolbar from "./Toolbar";
import Window from "./Window";

/** Left rail: what the pointer does (paint, erase or turn), then undo, redo and clear. */
export default function ToolRail() {
  const tool = useBrush((s) => s.tool);
  const setTool = useBrush((s) => s.setTool);
  const setCamera = useBrush((s) => s.setCamera);
  return (
    <Window className="rail" label="Tools" title="/tools">
      <div className="keys" role="group" aria-label="Pointer mode">
        <button className="key" aria-pressed={tool === "paint"} onClick={() => setTool("paint")}>
          <span className="key-icon"><PaintIcon /></span>
          <span className="key-label">Paint</span>
        </button>
        <button className="key" aria-pressed={tool === "erase"} onClick={() => setTool("erase")}>
          <span className="key-icon"><EraseIcon /></span>
          <span className="key-label">Erase</span>
        </button>
        <button className="key" aria-pressed={tool === "turn"} onClick={() => setTool("turn")}>
          <span className="key-icon"><TurnIcon /></span>
          <span className="key-label">Turn</span>
        </button>
        <button className="key" onClick={() => setCamera(true)}>
          <span className="key-icon"><CameraIcon /></span>
          <span className="key-label">Capture</span>
        </button>
      </div>
      <Toolbar />
    </Window>
  );
}
