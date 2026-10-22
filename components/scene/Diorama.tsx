"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createPageGeometry, createPageTexture } from "@/lib/diorama/pageTexture";
import { GIFT, SHADE_AREA, STACK, createDeskGeometry, createShadeTexture } from "@/lib/diorama/props";
import type { Shade } from "@/lib/diorama/shade";
import { createPropsMaterial } from "@/lib/sketchMaterial";
import GiftBox from "./GiftBox";

/**
 * The pumpkin's world, as real geometry so it turns with the pumpkin as you orbit: a spiral-bound sketchbook lying on the ground, a thick block of pages
 * on a back cover with the coil wrapped through it, and the top page (curled at one corner) that the pumpkin stands on, covered in pencil doodles, a sticky
 * note, a polaroid and washi tape. Pencils, a brush, a ruler, paint tubes, an eraser and a mug are strewn on the page and on the ground around it.
 * Three draw calls: the top page, the soft shadows on the ground, and the notebook body and loose things merged into one mesh.
 */
export default function Diorama({ detail, plain, floorY }: { detail: THREE.Texture; plain: boolean; floorY: number }) {
  const built = useMemo(() => {
    const shades: Shade[] = [];
    const body = createDeskGeometry(floorY, shades);
    return { body, shades };
  }, [floorY]);
  const pageTex = useMemo(() => createPageTexture(built.shades), [built]);
  const shadeTex = useMemo(() => createShadeTexture(built.shades), [built]);
  const pageGeo = useMemo(() => createPageGeometry(), []);
  const shadeGeo = useMemo(() => new THREE.PlaneGeometry(SHADE_AREA.w, SHADE_AREA.d), []);
  const pageMat = useMemo(() => new THREE.MeshBasicMaterial({ map: pageTex, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }), [pageTex]);
  const shadeMat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false, toneMapped: false }), [shadeTex]);
  const bodyMat = useMemo(() => createPropsMaterial(detail, plain), [detail, plain]);

  useEffect(() => () => built.body.dispose(), [built]);
  useEffect(() => () => pageTex.dispose(), [pageTex]);
  useEffect(() => () => shadeTex.dispose(), [shadeTex]);
  useEffect(() => () => pageGeo.dispose(), [pageGeo]);
  useEffect(() => () => shadeGeo.dispose(), [shadeGeo]);
  useEffect(() => () => pageMat.dispose(), [pageMat]);
  useEffect(() => () => shadeMat.dispose(), [shadeMat]);
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);

  return (
    <>
      <mesh geometry={pageGeo} material={pageMat} position={[0, floorY - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2} />
      <mesh geometry={shadeGeo} material={shadeMat} position={[0, floorY - 0.05 - STACK + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1} />
      <mesh geometry={built.body} material={bodyMat} />
      <GiftBox detail={detail} plain={plain} position={[GIFT.x, floorY - 0.05 - STACK, GIFT.z]} yaw={GIFT.yaw} scale={GIFT.scale} />
    </>
  );
}
