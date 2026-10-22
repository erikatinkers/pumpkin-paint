"use client";

import dynamic from "next/dynamic";
import CameraFrame from "@/components/ui/CameraFrame";
import Palette from "@/components/ui/Palette";
import ToolRail from "@/components/ui/ToolRail";
import { useEffect } from "react";
import { openGift } from "@/lib/gift";
import { sound } from "@/lib/sound";
import { useBrush } from "@/lib/store";

// WebGL only runs in the browser, so the scene is never rendered on the server.
const PumpkinScene = dynamic(() => import("@/components/scene/PumpkinScene"), {
  ssr: false,
  loading: () => <p style={{ padding: 24, color: "var(--muted)" }}>Sharpening the pencils…</p>,
});

export default function PumpkinStudio() {
  const tool = useBrush((s) => s.tool);
  const camera = useBrush((s) => s.camera);
  const paletteOpen = useBrush((s) => s.paletteOpen);

  // One listener for every button's sound: keys tock, paint dabs bloop (a note per swatch), a window's [x] thuds.
  // The shutter plays its own sound when the photo is actually taken.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLButtonElement>("button");
      if (!el || el.disabled) return;
      if (el.classList.contains("dollop")) sound.paint([...(el.parentElement?.children ?? [])].indexOf(el));
      else if (el.classList.contains("wb-close")) sound.close();
      else if (el.classList.contains("key")) sound.key();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <main className="app">
      {/* The gift box's keyboard stand-in: out of sight until it takes focus. */}
      <button className="key gift-key" onClick={openGift}>Surprise me</button>
      <section className="stage" data-tool={tool} aria-label="3D pumpkin you can paint">
        <PumpkinScene />
      </section>
      {camera ? (
        <CameraFrame />
      ) : (
        <>
          <ToolRail />
          {paletteOpen && <Palette />}
        </>
      )}
    </main>
  );
}
