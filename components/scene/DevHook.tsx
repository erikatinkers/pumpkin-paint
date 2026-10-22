"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PaintEngine } from "@/lib/painting/engine";
import { isSettled } from "@/lib/debug";
import { useBrush } from "@/lib/store";

interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

declare global {
  interface Window {
    __pumpkin?: {
      paintStroke: (points: [number, number][]) => void;
      setCamera: (azimuth: number, polar: number, distance: number) => void;
      reset: () => void;
      stats: () => Record<string, number>;
      settled: () => boolean;
      perf: () => Record<string, number>;
    };
  }
}

/** Dev-only test hook for Playwright: `window.__pumpkin`. Not mounted in production builds. */
export default function DevHook({ engine }: { engine: PaintEngine }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  useEffect(() => {
    window.__pumpkin = {
      /** Points are [u, v] UV coordinates, painted with the current brush as one undoable stroke. */
      paintStroke(points) {
        engine.beginStroke();
        for (const [u, v] of points) engine.strokeTo(u, v, useBrush.getState());
        engine.endStroke();
        engine.flush();
      },
      setCamera(azimuth, polar, distance) {
        const target = controls?.target ?? new THREE.Vector3();
        camera.position.setFromSphericalCoords(distance, polar, azimuth).add(target);
        camera.lookAt(target);
        controls?.update();
      },
      reset() {
        engine.clear();
        engine.flush();
      },
      /** Renderer counters for the last frame, plus texture size. Draw calls should be 4: pumpkin, stem, leaf, shadow plane. */
      /** True once the first frames (environment map, textures) have rendered. */
      settled: isSettled,
      stats() {
        gl.info.autoReset = false;
        gl.info.reset();
        gl.render(scene, camera);
        const out = {
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          textureWidth: engine.width,
          textureHeight: engine.height,
          cameraDistance: camera.position.length(),
          historyMB: Math.round((engine.history.bytes / 1048576) * 10) / 10,
        };
        gl.info.autoReset = true;
        return out;
      },
      /** Milliseconds per raycast against the full body mesh vs the pick mesh, and per 30-sample stroke, per frame, and per frame with all three textures re-uploaded. */
      perf() {
        const ray = new THREE.Raycaster(new THREE.Vector3(0.3, 0.2, 6), new THREE.Vector3(0, 0, -1));
        const time = (name: string, n = 200) => {
          const obj = scene.getObjectByName(name)!;
          const t0 = performance.now();
          for (let i = 0; i < n; i++) ray.intersectObject(obj, false);
          return (performance.now() - t0) / n;
        };
        const raycastFullMs = time("pumpkin-body");
        const raycastPickMs = time("pumpkin-pick");
        const pts: [number, number][] = [];
        for (let i = 0; i < 30; i++) pts.push([0.1 + i * 0.01, 0.5 + 0.1 * Math.sin(i / 3)]);
        const t1 = performance.now();
        for (let k = 0; k < 10; k++) {
          engine.beginStroke();
          for (const [u, v] of pts) engine.strokeTo(u, v, useBrush.getState());
          engine.endStroke();
        }
        const strokeMs = (performance.now() - t1) / 10;
        const ctx = gl.getContext();
        const strokeFrameStart = performance.now();
        engine.beginStroke();
        for (const [u, v] of pts) engine.strokeTo(u, v, useBrush.getState());
        const beforeCommit = performance.now();
        engine.endStroke();
        const commitMs = performance.now() - beforeCommit;
        const drawMs = performance.now() - strokeFrameStart;
        engine.flush();
        gl.render(scene, camera);
        ctx.finish();
        const strokeFrameMs = performance.now() - strokeFrameStart;
        const frame = (upload: boolean) => {
          const t = performance.now();
          for (let k = 0; k < 10; k++) {
            if (upload) engine.colorTexture.needsUpdate = engine.heightTexture.needsUpdate = engine.roughnessTexture.needsUpdate = true;
            gl.render(scene, camera);
          }
          ctx.finish();
          return (performance.now() - t) / 10;
        };
        const renderMs = frame(false);
        const renderWithUploadMs = frame(true);
        invalidate();
        return { raycastFullMs, raycastPickMs, strokeMs, drawMs, commitMs, strokeFrameMs, renderMs, renderWithUploadMs };
      },
    };
    return () => {
      delete window.__pumpkin;
    };
  }, [engine, camera, controls, gl, scene, invalidate]);

  return null;
}
