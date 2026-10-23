"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { PaintEngine } from "@/lib/painting/engine";
import { paintRegistry } from "@/lib/painting/registry";
import { useBrush } from "@/lib/store";
import { markSettled, parseDebug } from "@/lib/debug";
import { captureRegistry } from "@/lib/capture";
import CameraFit, { FixedCamera } from "./CameraFit";
import DevHook from "./DevHook";
import PaintInteraction from "./PaintInteraction";
import PaintPersistence from "./PaintPersistence";
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

/** Lets the viewfinder (outside the Canvas) take a shot: render once, then read the canvas in the same tick, since the buffer isn't preserved. */
function CaptureHook() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    captureRegistry.set(() => {
      gl.render(scene, camera);
      return gl.domElement;
    });
    return () => captureRegistry.set(null);
  }, [gl, scene, camera]);
  return null;
}

export default function PumpkinScene() {
  const debug = useMemo(() => parseDebug(window.location.search), []);
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const engine = useMemo(() => {
    return new PaintEngine({ baseColor: PUMPKIN_COLOR });
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
    // `flat` turns tone mapping off, so the washes render exactly as authored.
    <Canvas
      flat
      frameloop="demand"
      // A narrow lens (near-orthographic) keeps the perspective squash out, so it reads as a drawing, not a model.
      camera={{ position: [0.4, 1.5, 4.6].map((v) => v * 2.75) as [number, number, number], fov: 12 }}
      dpr={debug.enabled ? 1 : [1, 2]}
      // Phones render at 2x already; MSAA on top is wasted fill rate.
      gl={{ antialias: !coarse, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* The sketch shader reads only this light's direction: it picks which side of the pumpkin gets the shadow wash. */}
      <directionalLight position={[-5, 3.5, 1.5]} intensity={1} />
      <WarmUp />
      <CaptureHook />
      {debug.enabled ? <FixedCamera /> : <CameraFit />}
      <Pumpkin engine={engine} detailSeed={debug.seed ?? undefined} />
      <OrbitControls
        makeDefault
        enabled={!debug.enabled}
        enablePan={false}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} minDistance={6.5}
        maxDistance={38}
        maxPolarAngle={Math.PI * 0.53}
      />
      <PaintInteraction engine={engine} />
      <PaintPersistence engine={engine} />
      {process.env.NODE_ENV !== "production" && <DevHook engine={engine} />}
    </Canvas>
  );
}
