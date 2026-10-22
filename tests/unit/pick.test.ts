import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createPumpkinGeometry, createPumpkinPickGeometry } from "@/lib/pumpkinGeometry";

describe("pick mesh", () => {
  const full = new THREE.Mesh(createPumpkinGeometry(), new THREE.MeshBasicMaterial());
  const pick = new THREE.Mesh(createPumpkinPickGeometry(), new THREE.MeshBasicMaterial());

  it("has fewer triangles than the visible body", () => {
    const tris = (m: THREE.Mesh) => m.geometry.index!.count / 3;
    expect(tris(pick)).toBeLessThan(tris(full) / 2);
  });

  it("returns nearly the same UV as the full mesh across the front of the pumpkin", () => {
    let checked = 0;
    for (let x = -0.9; x <= 0.9; x += 0.3) {
      for (let y = -0.5; y <= 0.5; y += 0.25) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 6), new THREE.Vector3(0, 0, -1));
        const a = ray.intersectObject(full)[0];
        const b = ray.intersectObject(pick)[0];
        if (!a || !b) continue;
        expect(Math.abs(a.uv!.x - b.uv!.x)).toBeLessThan(0.01);
        expect(Math.abs(a.uv!.y - b.uv!.y)).toBeLessThan(0.01);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(15);
  });
});
