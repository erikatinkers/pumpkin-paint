"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PaintEngine } from "@/lib/painting/engine";
import { cancelSurprise } from "@/lib/painting/surprise";
import { sound } from "@/lib/sound";
import { PAINTS, type Tool, useBrush } from "@/lib/store";

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
 *  - Pick tool: a press (or drag) on the pumpkin takes up the paint colour under it; letting go hands back to the Paint tool.
 *  - Turn (no key: it is what you have after closing the color window or opening the camera): never intercepts, so OrbitControls always rotates.
 *  - Whatever the tool, a press that misses the pumpkin falls through, so dragging the background turns it.
 *  - Touch: one finger paints (or picks, or erases) on the pumpkin and turns it from the background; a second finger cancels the stroke and pinch-zooms.
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
    let mode: "idle" | "paint" | "pick" | "pinch" = "idle";
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

    /** Loads the colour under a UV spot into the brush, under its watercolor's name if it is one of the twelve. */
    const pickAt = (uv: THREE.Vector2) => {
      const hex = engine.sampleColor(uv.x, uv.y);
      const known = PAINTS.find((p) => p.hex === hex);
      useBrush.getState().setColor(hex, known?.name ?? "Picked");
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
      const tool = useBrush.getState().tool;
      if (mode !== "idle" || pointers.size !== 1 || !(DRAWING_TOOLS.includes(tool) || tool === "pick")) return;

      const uv = uvAt(e.clientX, e.clientY);
      if (!uv) return; // missed the pumpkin: let OrbitControls rotate
      if (tool === "pick") {
        mode = "pick";
        paintId = e.pointerId;
        try {
          host.setPointerCapture(e.pointerId);
        } catch {
          // Not a live pointer (e.g. a synthetic event); picking still works without capture.
        }
        pickAt(uv);
        e.stopPropagation();
        return;
      }
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
      } else if (mode === "pick" && e.pointerId === paintId) {
        const uv = uvAt(e.clientX, e.clientY);
        if (uv) pickAt(uv);
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
      } else if (mode === "pick" && e.pointerId === paintId) {
        mode = "idle";
        useBrush.getState().setTool("paint"); // picked: back to painting with it
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
