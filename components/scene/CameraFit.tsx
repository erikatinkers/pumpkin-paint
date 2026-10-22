"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FIXED_CAMERA } from "@/lib/debug";

const HALF_WIDTH = 1.75; // pumpkin radius plus breathing room
const HALF_HEIGHT = 1.4; // body, stem and the floor shadow
const GAP = 24; // space kept between the pumpkin's frame and a floating panel
const FLOOR_BIAS = 0.04; // seat the pumpkin a little low in the free space, so there is floor under it

interface Free {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The part of the canvas not covered by the floating panels (`[data-floating]`): tall panels take a side, short ones the top or bottom. */
function freeArea(canvas: HTMLElement): Free {
  const box = canvas.getBoundingClientRect();
  const free: Free = { left: 0, right: box.width, top: 0, bottom: box.height };
  for (const el of document.querySelectorAll("[data-floating]")) {
    const r = el.getBoundingClientRect();
    const cx = (r.left + r.right) / 2 - box.left;
    const cy = (r.top + r.bottom) / 2 - box.top;
    if (r.height > r.width && cx < box.width * 0.35) free.left = Math.max(free.left, r.right - box.left + GAP);
    else if (r.height > r.width && cx > box.width * 0.65) free.right = Math.min(free.right, r.left - box.left - GAP);
    else if (cy < box.height / 2) free.top = Math.max(free.top, r.bottom - box.top + GAP);
    else free.bottom = Math.min(free.bottom, r.top - box.top - GAP);
  }
  // If the panels leave almost nothing, ignore them rather than shrink the pumpkin to a dot.
  if (free.right - free.left < box.width * 0.3 || free.bottom - free.top < box.height * 0.3) {
    return { left: 0, right: box.width, top: 0, bottom: box.height };
  }
  return free;
}

/**
 * Backs the camera off until the whole pumpkin fits in the space the floating panels leave free, then shifts the view
 * (a lens shift, so orbiting is unaffected) to centre the pumpkin in that space.
 */
export default function CameraFit() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const fit = () => {
      const { width: W, height: H } = size;
      if (W === 0 || H === 0) return;
      const free = freeArea(gl.domElement);
      const freeW = free.right - free.left;
      const freeH = free.bottom - free.top;
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(HALF_HEIGHT / (tanV * (freeH / H)), HALF_WIDTH / (tanV * (W / H) * (freeW / W)));
      camera.position.setLength(dist);
      const cx = (free.left + free.right) / 2;
      const cy = (free.top + free.bottom) / 2 + FLOOR_BIAS * freeH;
      camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
      camera.updateProjectionMatrix();
      invalidate();
    };
    fit();
    // Fonts and layout can settle just after mount.
    const t = setTimeout(fit, 250);
    return () => {
      clearTimeout(t);
      camera.clearViewOffset();
    };
  }, [camera, gl, size, invalidate]);
  return null;
}

/** Debug mode: the same camera every time, whatever the window size. */
export function FixedCamera() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.setFromSphericalCoords(FIXED_CAMERA.distance, FIXED_CAMERA.polar, FIXED_CAMERA.azimuth);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}
