"use client";

import { type ReactNode, useEffect, useState } from "react";
import { parseDebug } from "@/lib/debug";
import { paintRegistry } from "@/lib/painting/registry";
import { cancelSurprise } from "@/lib/painting/surprise";
import { useBrush } from "@/lib/store";
import { ClearIcon, RedoIcon, UndoIcon } from "./icons";

const CONFIRM_MS = 3000;
const confirmMs = () => parseDebug(window.location.search).confirmMs ?? CONFIRM_MS;

/** The action keys: undo, redo and clear, after any `before` keys (the rail puts Capture first, so on a phone the tools and the actions get a row each). */
export default function Toolbar({ before }: { before?: ReactNode }) {
  const canUndo = useBrush((s) => s.canUndo);
  const canRedo = useBrush((s) => s.canRedo);
  const [armed, setArmed] = useState(false);

  // Two-step clear lives in the button: first press arms it, a second press within a few seconds wipes.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), confirmMs());
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      cancelSurprise();
      if (e.shiftKey) paintRegistry.get()?.redo();
      else paintRegistry.get()?.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="keys" role="group" aria-label="Actions">
      {before}
      <button className="key" disabled={!canUndo} onClick={() => { cancelSurprise(); paintRegistry.get()?.undo(); }}>
        <span className="key-icon"><UndoIcon /></span>
        <span className="key-label">Undo</span>
      </button>
      <button className="key" disabled={!canRedo} onClick={() => { cancelSurprise(); paintRegistry.get()?.redo(); }}>
        <span className="key-icon"><RedoIcon /></span>
        <span className="key-label">Redo</span>
      </button>
      <button
        className="key"
        data-tone={armed ? "red" : undefined}
        data-armed={armed}
        onClick={() => {
          if (!armed) return setArmed(true);
          cancelSurprise();
          paintRegistry.get()?.clear();
          setArmed(false);
        }}
        onBlur={() => setArmed(false)}
      >
        <span className="key-icon"><ClearIcon /></span>
        <span className="key-label">{armed ? "Really?" : "Clear"}</span>
      </button>
    </div>
  );
}
