"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FIXED_CAMERA } from "@/lib/debug";

const HALF_WIDTH = 1.5; // pumpkin radius plus breathing room
const HALF_HEIGHT = 1.15; // body plus stem

/** Backs the camera off along its current direction until the whole pumpkin fits, on any aspect ratio. */
export default function CameraFit() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useLayoutEffect(() => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(HALF_HEIGHT / tanV, HALF_WIDTH / (tanV * aspect));
    camera.position.setLength(dist);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
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
