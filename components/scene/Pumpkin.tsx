"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createLeafGeometry, createPumpkinGeometry, createPumpkinPickGeometry, createStemGeometry } from "@/lib/pumpkinGeometry";
import { createClayMaterial, createPaintedClayMaterial } from "@/lib/clayMaterial";
import { createDetailTexture } from "@/lib/painting/detail";
import type { PaintEngine } from "@/lib/painting/engine";

export const PUMPKIN_COLOR = "#ee7a2a"; // deep clay orange
const STEM_COLOR = "#4f9a3c"; // chunky clay green
const LEAF_COLOR = "#63ae45";

/** Soft blob shadow baked into a radial gradient, so the ground costs one draw call and no shadow map. */
function createShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(125, 84, 42, 0.5)");
  g.addColorStop(0.35, "rgba(125, 84, 42, 0.38)");
  g.addColorStop(0.65, "rgba(125, 84, 42, 0.17)");
  g.addColorStop(1, "rgba(125, 84, 42, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Pumpkin({ engine, detailSeed }: { engine: PaintEngine; detailSeed?: number }) {
  const parts = useMemo(() => {
    const body = createPumpkinGeometry();
    body.computeBoundingBox();
    const detail = createDetailTexture(detailSeed);
    return {
      body,
      detail,
      floorY: body.boundingBox!.min.y,
      pick: createPumpkinPickGeometry(),
      stem: createStemGeometry(),
      leaf: createLeafGeometry(),
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
      console.warn("Clay detail shader failed to compile; using the plain material.");
      setPlain(true);
      prev?.(...args);
    };
    return () => {
      debug.onShaderError = prev;
    };
  }, [getState]);

  const bodyMat = useMemo(
    () =>
      createPaintedClayMaterial(
        { color: engine.colorTexture, height: engine.heightTexture, roughness: engine.roughnessTexture },
        { detail: parts.detail, plain },
      ),
    [engine, parts.detail, plain],
  );
  const stemMat = useMemo(() => createClayMaterial(STEM_COLOR, parts.detail, plain), [parts.detail, plain]);
  const leafMat = useMemo(() => createClayMaterial(LEAF_COLOR, parts.detail, plain), [parts.detail, plain]);
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);
  useEffect(() => () => stemMat.dispose(), [stemMat]);
  useEffect(() => () => leafMat.dispose(), [leafMat]);

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
      parts.leaf.dispose();
      parts.detail.dispose();
      parts.shadowTex.dispose();
      shadowMat.dispose();
    },
    [parts, shadowMat],
  );

  return (
    <group>
      <mesh name="pumpkin-body" geometry={parts.body} material={bodyMat} />
      {/* Invisible, so never drawn: a cheaper surface for pointer raycasts. */}
      <mesh name="pumpkin-pick" geometry={parts.pick} material={bodyMat} visible={false} />
      <mesh geometry={parts.stem} material={stemMat} position={[-0.05, 0.47, 0]} />
      <mesh
        geometry={parts.leaf}
        material={leafMat}
        position={[0.02, 0.56, 0.06]}
        rotation={[0, -0.6, 0.12]}
        scale={1.25}
      />
      <mesh
        material={shadowMat}
        position={[0.1, parts.floorY - 0.02, -0.05]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[4.2, 4.2]} />
      </mesh>
    </group>
  );
}
