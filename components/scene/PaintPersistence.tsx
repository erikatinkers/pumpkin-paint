"use client";

import { useEffect } from "react";
import { parseDebug } from "@/lib/debug";
import type { PaintEngine } from "@/lib/painting/engine";
import { loadPaint, savePaint } from "@/lib/painting/persist";

const SAVE_DELAY_MS = 800; // after the last edit: long enough to batch a burst of strokes, short enough that the work is stored before the tab is put away

/**
 * Remembers the painting between visits. On load it puts back what was saved last time; after that it saves a moment after every finished edit, and straight
 * away when the page is hidden (switching apps, locking the phone), which is when a browser is most likely to throw the tab away. Saving is best effort:
 * if storage is unavailable or full, painting carries on and just isn't remembered. The undo history is not kept, so a returning visitor starts with a
 * fresh undo list. Debug mode (the e2e tests) leaves it off unless `?persist` is given, so every run starts bare.
 */
export default function PaintPersistence({ engine }: { engine: PaintEngine }) {
  useEffect(() => {
    const debug = parseDebug(window.location.search);
    if (debug.enabled && !debug.persist) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let saveAgain = false;

    const save = async () => {
      if (saving) {
        saveAgain = true; // an edit landed mid-save: go round once more so the last state is the one kept
        return;
      }
      saving = true;
      try {
        const snap = await engine.snapshot();
        await savePaint({
          color: await snap.color.arrayBuffer(),
          roughness: await snap.roughness.arrayBuffer(),
          width: snap.width,
          height: snap.height,
          savedAt: Date.now(),
        });
      } catch {
        // Storage off, full or blocked (a private window, say): not worth interrupting anyone for.
      }
      saving = false;
      if (saveAgain) {
        saveAgain = false;
        void save();
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void save();
      }, SAVE_DELAY_MS);
    };
    const flush = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      void save();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    // Put the last painting back first, and only then start saving, so a save can never overwrite it before it has been read.
    (async () => {
      const saved = await loadPaint();
      if (saved && alive) {
        await engine.restore(new Blob([saved.color], { type: "image/png" }), new Blob([saved.roughness], { type: "image/png" }));
      }
    })()
      .catch(() => {
        // An unreadable save is the same as none.
      })
      .finally(() => {
        if (!alive) return;
        engine.setChangeListener(schedule);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", flush);
      });

    return () => {
      alive = false;
      clearTimeout(timer);
      engine.setChangeListener(null);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [engine]);

  return null;
}
