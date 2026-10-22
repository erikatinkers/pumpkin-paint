import * as THREE from "three";

export const GLOW_COLOR = "#ffb48a";

/**
 * Faint warm rim glow, added to the emissive term, to fake light scattering through clay.
 * Patches the standard material in place; milestone 4's detail shader chains onto the same hook.
 */
export function addClayGlow(material: THREE.MeshStandardMaterial, strength = 0.16): void {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uGlowColor = { value: new THREE.Color(GLOW_COLOR) };
    shader.uniforms.uGlowStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uGlowColor;\nuniform float uGlowStrength;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float clayRim = 1.0 - saturate(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += uGlowColor * pow(clayRim, 2.6) * uGlowStrength;`,
      );
  };
  material.customProgramCacheKey = () => `clay-glow-${strength}`;
}
