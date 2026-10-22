"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createPumpkinGeometry, createPumpkinPickGeometry, createStemGeometry, withInkHull } from "@/lib/pumpkinGeometry";
import { createPaintedSketchMaterial, createSketchMaterial } from "@/lib/sketchMaterial";
import Diorama from "./Diorama";
import { createDetailTexture } from "@/lib/painting/detail";
import type { PaintEngine } from "@/lib/painting/engine";

export const PUMPKIN_COLOR = "#f08a2e"; // watercolor orange
const STEM_COLOR = "#4f9a3c"; // stem green
export const PUMPKIN_SCALE = 1.4; // the pumpkin, its stem and its shadow, scaled about the spot it stands on

/** A cast shadow with a crisp edge, to match the pumpkin's own cel-style shadow: one flat warm-brown shape stretched to the right (the light is on the left). Baked once, so the ground costs one draw call and no shadow map. */
function createShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  // The plane sits 0.45 to the right of the pumpkin, so the pumpkin's own centre is left of the texture's.
  const blob = (x: number, y: number, rx: number, ry: number, phase: number) => {
    const path = new Path2D();
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wob = 1 + 0.035 * Math.sin(a * 3 + phase) + 0.02 * Math.sin(a * 6 + phase * 2);
      const px = x + Math.cos(a) * rx * wob;
      const py = y + Math.sin(a) * ry * wob;
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();
    return path;
  };
  ctx.fillStyle = "rgba(70, 50, 35, 0.3)";
  ctx.fill(blob(c + 4, c + 6, 190, 112, 0.8));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Pumpkin({ engine, detailSeed }: { engine: PaintEngine; detailSeed?: number }) {
  const parts = useMemo(() => {
    const plainBody = createPumpkinGeometry();
    plainBody.computeBoundingBox();
    const floorY = plainBody.boundingBox!.min.y;
    const body = withInkHull(plainBody);
    const detail = createDetailTexture(detailSeed);
    return {
      body,
      detail,
      floorY,
      pick: createPumpkinPickGeometry(),
      stem: withInkHull(createStemGeometry()),
      shadowTex: createShadowTexture(),
    };
  }, [detailSeed]);

  // If the detail shader fails to compile, swap in the plain painted material instead.
  const [plain, setPlain] = useState(false);
  const getState = useThree((s) => s.get);
  useEffect(() => {
    const debug = getState().gl.debug;
    const prev = debug.onShaderError;
    debug.onShaderError = (...args) => {
      console.warn("Sketch shader failed to compile; using the plain material.");
      setPlain(true);
      prev?.(...args);
    };
    return () => {
      debug.onShaderError = prev;
    };
  }, [getState]);

  const bodyMat = useMemo(
    () =>
      createPaintedSketchMaterial(
        { color: engine.colorTexture, height: engine.heightTexture },
        { detail: parts.detail, plain },
      ),
    [engine, parts.detail, plain],
  );
  const stemMat = useMemo(() => createSketchMaterial(STEM_COLOR, parts.detail, "stem", plain), [parts.detail, plain]);
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);
  useEffect(() => () => stemMat.dispose(), [stemMat]);

  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: parts.shadowTex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [parts.shadowTex],
  );

  // These are created outside R3F's lifecycle, so we free them ourselves.
  useEffect(
    () => () => {
      parts.body.dispose();
      parts.pick.dispose();
      parts.stem.dispose();
      parts.detail.dispose();
      parts.shadowTex.dispose();
      shadowMat.dispose();
    },
    [parts, shadowMat],
  );

  return (
    <group>
      {/* Scaled about the spot it stands on: the outer group sits at floor level, and its contents hang from there. */}
      <group position={[0, parts.floorY, 0]} scale={PUMPKIN_SCALE}>
        <group position={[0, -parts.floorY, 0]}>
          <mesh name="pumpkin-body" geometry={parts.body} material={bodyMat} />
          {/* Invisible, so never drawn: a cheaper surface for pointer raycasts. */}
          <mesh name="pumpkin-pick" geometry={parts.pick} material={bodyMat} visible={false} />
          <mesh geometry={parts.stem} material={stemMat} position={[-0.05, 0.47, 0]} />
          <mesh
            material={shadowMat}
            position={[0.45, parts.floorY - 0.02, -0.05]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={-1}
          >
            <planeGeometry args={[4.2, 4.2]} />
          </mesh>
        </group>
      </group>
      <Diorama detail={parts.detail} plain={plain} floorY={parts.floorY} />
    </group>
  );
}
