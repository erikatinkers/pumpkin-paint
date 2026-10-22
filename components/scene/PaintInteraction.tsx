"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PaintEngine } from "@/lib/painting/engine";
import { cancelSurprise } from "@/lib/painting/surprise";
import { sound } from "@/lib/sound";
import { type Tool, useBrush } from "@/lib/store";

const DRAWING_TOOLS: readonly Tool[] = ["paint", "erase"];

/** The brush for the current tool: the same size, but the eraser puts the bare skin back. */
const currentBrush = () => {
  const s = useBrush.getState();
  return { ...s, erase: s.tool === "erase" };
};

interface OrbitLike {
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
}

/**
 * Routes pointer input between painting and orbiting.
 *  - Paint and Erase tools: a press that lands on the pumpkin paints (or erases); a press elsewhere falls through to OrbitControls.
 *  - Turn tool: never intercepts, so OrbitControls always rotates.
 *  - Touch: one finger paints or turns by tool; a second finger cancels the stroke and pinch-zooms.
 * Listeners sit in the capture phase on the canvas wrapper, so a paint press never reaches OrbitControls.
 */
export default function PaintInteraction({ engine }: { engine: PaintEngine }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  useFrame(() => engine.flush());

  // The scene renders on demand: wake it whenever paint changes (strokes, undo, redo, clear).
  useEffect(() => {
    engine.setDirtyListener(invalidate);
    return () => engine.setDirtyListener(null);
  }, [engine, invalidate]);

  useEffect(() => {
    const el = gl.domElement;
    const host = el.parentElement ?? el;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let mode: "idle" | "paint" | "pinch" = "idle";
    let paintId = -1;
    let pinchDist = 0;
    const uvAt = (clientX: number, clientY: number): THREE.Vector2 | null => {
      const body = scene.getObjectByName("pumpkin-pick");
      if (!body) return null;
      const rect = el.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(body, false)[0]?.uv ?? null;
    };

    const twoFingerDistance = (): number => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (e.pointerType === "touch" && pointers.size === 2 && mode !== "idle") {
        // Second finger: drop the stroke and pinch-zoom instead.
        if (mode === "paint") {
          engine.cancelStroke();
        }
        mode = "pinch";
        pinchDist = twoFingerDistance();
        e.stopPropagation();
        return;
      }
      if (mode !== "idle" || pointers.size !== 1 || !DRAWING_TOOLS.includes(useBrush.getState().tool)) return;

      const uv = uvAt(e.clientX, e.clientY);
      if (!uv) return; // missed the pumpkin: let OrbitControls rotate
      mode = "paint";
      paintId = e.pointerId;
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        // Not a live pointer (e.g. a synthetic event); painting still works without capture.
      }
      cancelSurprise(); // a surprise still painting stops where it is; your stroke takes over
      engine.beginStroke();
      engine.strokeTo(uv.x, uv.y, currentBrush());
      sound.strokeStart(useBrush.getState().tool === "erase");
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === "paint" && e.pointerId === paintId) {
        const brush = currentBrush();
        const samples = e.getCoalescedEvents?.() ?? [];
        for (const ce of samples.length ? samples : [e]) {
          const uv = uvAt(ce.clientX, ce.clientY);
          if (uv) engine.strokeTo(uv.x, uv.y, brush);
          else engine.breakPath();
        }
      } else if (mode === "pinch" && pointers.size >= 2 && controls) {
        const d = twoFingerDistance();
        if (pinchDist > 0 && d > 0) {
          const offset = camera.position.clone().sub(controls.target);
          const len = THREE.MathUtils.clamp((offset.length() * pinchDist) / d, controls.minDistance, controls.maxDistance);
          camera.position.copy(controls.target).add(offset.setLength(len));
          controls.update();
        }
        pinchDist = d;
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (mode === "paint" && e.pointerId === paintId) {
        engine.endStroke();
        mode = "idle";
      } else if (mode === "pinch" && pointers.size === 0) {
        mode = "idle";
      }
    };

    host.addEventListener("pointerdown", onDown, { capture: true });
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    return () => {
      host.removeEventListener("pointerdown", onDown, { capture: true });
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      if (mode === "paint") {
        engine.endStroke();
      }
    };
  }, [gl, camera, scene, controls, engine]);

  return null;
}
