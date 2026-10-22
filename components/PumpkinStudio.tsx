"use client";

import dynamic from "next/dynamic";
import Palette from "@/components/ui/Palette";

// WebGL only runs in the browser, so the scene is never rendered on the server.
const PumpkinScene = dynamic(() => import("@/components/scene/PumpkinScene"), {
  ssr: false,
  loading: () => <p style={{ padding: 24, color: "var(--muted)" }}>Pressing the pumpkin…</p>,
});

export default function PumpkinStudio() {
  return (
    <main className="app">
      <section className="stage" aria-label="3D pumpkin you can paint">
        <PumpkinScene />
      </section>
      <Palette />
    </main>
  );
}
