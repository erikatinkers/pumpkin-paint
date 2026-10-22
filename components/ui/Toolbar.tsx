"use client";

import { useEffect, useState } from "react";
import { paintRegistry } from "@/lib/painting/registry";
import { useBrush } from "@/lib/store";

const CONFIRM_MS = 3000;

export default function Toolbar() {
  const canUndo = useBrush((s) => s.canUndo);
  const canRedo = useBrush((s) => s.canRedo);
  const [armed, setArmed] = useState(false);

  // Two-step clear lives in the button: first press arms it, a second press within a few seconds wipes.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) paintRegistry.get()?.redo();
      else paintRegistry.get()?.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pills" role="group" aria-label="Edit">
      <button className="pill" disabled={!canUndo} onClick={() => paintRegistry.get()?.undo()}>Undo</button>
      <button className="pill" disabled={!canRedo} onClick={() => paintRegistry.get()?.redo()}>Redo</button>
      <button
        className="pill"
        data-armed={armed}
        onClick={() => {
          if (!armed) return setArmed(true);
          paintRegistry.get()?.clear();
          setArmed(false);
        }}
        onBlur={() => setArmed(false)}
      >
        {armed ? "Really?" : "Clear"}
      </button>
    </div>
  );
}
