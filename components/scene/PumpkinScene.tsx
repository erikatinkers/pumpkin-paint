"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { PaintEngine } from "@/lib/painting/engine";
import { seedExampleStrokes } from "@/lib/painting/seed";
import { paintRegistry } from "@/lib/painting/registry";
import { useBrush } from "@/lib/store";
import { markSettled, parseDebug } from "@/lib/debug";
import CameraFit, { FixedCamera } from "./CameraFit";
import DevHook from "./DevHook";
import PaintInteraction from "./PaintInteraction";
import Pumpkin, { PUMPKIN_COLOR } from "./Pumpkin";

/** The loop renders on demand, so give async setup (environment map, first texture uploads) a few frames to land. */
function WarmUp() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      invalidate();
      if (++n >= 8) {
        clearInterval(id);
        markSettled();
      }
    }, 120);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

export default function PumpkinScene() {
  const debug = useMemo(() => parseDebug(window.location.search), []);
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const engine = useMemo(() => {
    const e = new PaintEngine({ baseColor: PUMPKIN_COLOR });
    seedExampleStrokes(e);
    return e;
  }, []);

  useEffect(() => {
    paintRegistry.set(engine);
    engine.setHistoryListener((canUndo, canRedo) => useBrush.getState().setHistory(canUndo, canRedo));
    return () => {
      engine.setHistoryListener(null);
      paintRegistry.set(null);
      engine.dispose();
    };
  }, [engine]);

  return (
    // `flat` turns tone mapping off, so the pastels render exactly as authored.
    <Canvas
      flat
      frameloop="demand"
      camera={{ position: [0.4, 1.5, 4.6], fov: 32 }}
      dpr={debug.enabled ? 1 : [1, 2]}
      // Phones render at 2x already; MSAA on top is wasted fill rate.
      gl={{ antialias: !coarse, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <hemisphereLight args={["#fff3e6", "#d8b48c", 0.34]} />
      <directionalLight position={[-3, 4.5, 4]} intensity={2.5} color="#fff1e4" />
      {/* Bright, soft studio environment: big lightformers on a lavender void. */}
      <Environment resolution={128} environmentIntensity={0.3}>
        <color attach="background" args={["#fbeedd"]} />
        <Lightformer form="rect" intensity={2.2} color="#fff4ec" position={[-4, 4, 3]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe8d0" position={[4, 2, -2]} scale={[6, 4, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffe6d6" position={[0, 6, 0]} scale={5} rotation-x={Math.PI / 2} />
      </Environment>
      <WarmUp />
      {debug.enabled ? <FixedCamera /> : <CameraFit />}
      <Pumpkin engine={engine} detailSeed={debug.seed ?? undefined} />
      <OrbitControls
        makeDefault
        enabled={!debug.enabled}
        enablePan={false}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} minDistance={2.4}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.62}
      />
      <PaintInteraction engine={engine} />
      {process.env.NODE_ENV !== "production" && <DevHook engine={engine} />}
    </Canvas>
  );
}
