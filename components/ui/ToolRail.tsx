"use client";

import { useBrush } from "@/lib/store";
import { CameraIcon, EraseIcon, PaintIcon, PickIcon } from "./icons";
import Toolbar from "./Toolbar";
import Window from "./Window";

/** Left rail: what the pointer does on the pumpkin (paint, pick a color or erase), then the actions: capture, undo, redo and clear. There is no Turn key: a drag that starts off the pumpkin turns it. */
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
        <button className="key" aria-pressed={tool === "pick"} onClick={() => setTool("pick")}>
          <span className="key-icon"><PickIcon /></span>
          <span className="key-label">Pick</span>
        </button>
        <button className="key" aria-pressed={tool === "erase"} onClick={() => setTool("erase")}>
          <span className="key-icon"><EraseIcon /></span>
          <span className="key-label">Erase</span>
        </button>
      </div>
      <Toolbar
        before={
          <button className="key" onClick={() => setCamera(true)}>
            <span className="key-icon"><CameraIcon /></span>
            <span className="key-label">Capture</span>
          </button>
        }
      />
    </Window>
  );
}
