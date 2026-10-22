"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GIFT_BODY_HEIGHT, createGiftBoxGeometry } from "@/lib/diorama/giftbox";
import { openGift } from "@/lib/gift";
import { sound } from "@/lib/sound";
import { createPropsMaterial } from "@/lib/sketchMaterial";
import { PAINTS, useBrush } from "@/lib/store";

const POP_SECONDS = 1.1;
const CONFETTI = 90; // pieces
const CONFETTI_SECONDS = 3.6; // the pieces shrink away over the last second
const GRAVITY = 6;
const CONFETTI_COLORS = [...PAINTS.map((p) => p.hex), "#fffdf7"];

interface Piece {
  p: THREE.Vector3;
  v: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
}
const CLICK_SLOP = 5; // px of pointer travel past which a press was a drag (turning the pumpkin), not a click

const setCursor = (el: HTMLElement, cursor: string) => {
  el.style.cursor = cursor;
};

/**
 * A present on the page. Hover and it wiggles and its lid lifts a little, with a chime; click and the lid pops off and the pumpkin paints itself something
 * new (see `openGift`). It only draws frames while it is moving, so the scene still renders on demand. Keyboard users get the hidden "Surprise me" key instead.
 */
export default function GiftBox({ detail, plain, position, yaw, scale }: { detail: THREE.Texture; plain: boolean; position: [number, number, number]; yaw: number; scale: number }) {
  const geo = useMemo(() => createGiftBoxGeometry(), []);
  const mat = useMemo(() => createPropsMaterial(detail, plain), [detail, plain]);
  useEffect(() => () => { geo.body.dispose(); geo.lid.dispose(); }, [geo]);
  useEffect(() => () => mat.dispose(), [mat]);

  const confettiGeo = useMemo(() => new THREE.PlaneGeometry(0.09, 0.05), []);
  const confettiMat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), []);
  useEffect(() => () => confettiGeo.dispose(), [confettiGeo]);
  useEffect(() => () => confettiMat.dispose(), [confettiMat]);
  const confetti = useRef<THREE.InstancedMesh>(null);
  const pieces = useRef<Piece[]>([]);
  const burstAge = useRef(-1);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Mesh>(null);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef({ hover: 0, target: 0, pop: -1 });

  const opens = useBrush((s) => s.giftOpens);
  const seen = useRef(opens);
  useEffect(() => {
    if (opens === seen.current) return;
    seen.current = opens;
    anim.current.pop = 0;
    // Confetti shoots up out of the box from where the lid was, fanning out, then flutters down and lies on the ground.
    const mesh = confetti.current;
    if (mesh) {
      const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
      pieces.current = Array.from({ length: CONFETTI }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const out = rand(0.2, 1.6);
        mesh.setColorAt(i, new THREE.Color(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]));
        return {
          p: new THREE.Vector3(Math.cos(a) * 0.15, GIFT_BODY_HEIGHT + 0.1, Math.sin(a) * 0.15),
          v: new THREE.Vector3(Math.cos(a) * out, rand(2.6, 4.6), Math.sin(a) * out),
          rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
          spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)),
          size: rand(0.7, 1.3),
        };
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.visible = true;
      burstAge.current = 0;
    }
    invalidate();
  }, [opens, invalidate]);

  useFrame((state, dt) => {
    const a = anim.current;
    a.hover += (a.target - a.hover) * Math.min(1, dt * 14);
    let moving = Math.abs(a.target - a.hover) > 0.002 || a.hover > 0.002;
    let up = 0;
    let tilt = 0;
    let spin = 0;
    if (a.pop >= 0) {
      a.pop += dt / POP_SECONDS;
      moving = true;
      const t = Math.min(a.pop, 1);
      up = 1.2 * Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - 0.15 * t);
      tilt = 0.6 * Math.sin(t * Math.PI * 3) * (1 - t);
      spin = t * Math.PI * 2;
      if (a.pop >= 1) a.pop = -1;
    }
    if (lid.current) {
      lid.current.position.y = GIFT_BODY_HEIGHT + 0.07 * a.hover + up;
      lid.current.rotation.set(0, spin, tilt);
    }
    if (group.current) group.current.rotation.y = yaw + 0.07 * Math.sin(state.clock.elapsedTime * 16) * a.hover;
    const mesh = confetti.current;
    if (mesh && burstAge.current >= 0) {
      burstAge.current += dt;
      moving = true;
      const fade = Math.min(1, Math.max(0, (CONFETTI_SECONDS - burstAge.current) / 1));
      pieces.current.forEach((c, i) => {
        if (c.p.y > 0.01) {
          c.v.y -= GRAVITY * dt;
          c.v.x *= 1 - 1.6 * dt;
          c.v.z *= 1 - 1.6 * dt;
          if (c.v.y < -0.9) c.v.y = -0.9; // paper falls slowly: it flutters, it doesn't drop
          c.p.addScaledVector(c.v, dt);
          c.rot.x += c.spin.x * dt;
          c.rot.y += c.spin.y * dt;
          c.rot.z += c.spin.z * dt;
          if (c.p.y <= 0.01) {
            c.p.y = 0.01;
            c.rot.x = -Math.PI / 2; // lies flat
          }
        }
        dummy.position.copy(c.p);
        dummy.rotation.copy(c.rot);
        dummy.scale.setScalar(c.size * fade);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (burstAge.current >= CONFETTI_SECONDS) {
        burstAge.current = -1;
        mesh.visible = false;
      }
    }
    if (moving) invalidate();
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, yaw, 0]}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (anim.current.target === 0) sound.chime();
        anim.current.target = 1;
        setCursor(gl.domElement, "pointer");
        invalidate();
      }}
      onPointerOut={() => {
        anim.current.target = 0;
        setCursor(gl.domElement, "");
        invalidate();
      }}
      onClick={(e) => {
        if (e.delta > CLICK_SLOP) return;
        e.stopPropagation();
        openGift();
      }}
    >
      <mesh geometry={geo.body} material={mat} />
      <mesh ref={lid} geometry={geo.lid} material={mat} position={[0, GIFT_BODY_HEIGHT, 0]} />
      {/* No raycast, so a falling scrap of paper never swallows a click meant for the box or the pumpkin behind it. */}
      <instancedMesh ref={confetti} args={[confettiGeo, confettiMat, CONFETTI]} visible={false} frustumCulled={false} raycast={() => null} />
    </group>
  );
}
