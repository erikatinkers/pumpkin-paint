import * as THREE from "three";
import { DETAIL_REPEAT } from "@/lib/painting/detail";
import { RIBS } from "@/lib/pumpkinGeometry";

export interface ClayDetailOptions {
  /** Detail height added to the bump, in the same units as bumpScale * height. */
  bump?: number;
  /** Fraction of albedo lightened or darkened by fingerprints, pits and grain. */
  albedo?: number;
  /** Height of the soft, low-frequency lumps that make a hand-pressed surface uneven. */
  lump?: number;
  /** Fraction of lightness varied by the low-frequency pigment mottling. */
  mottle?: number;
  /** Darkening in the creases beside raised paint (cavity occlusion). */
  cavity?: number;
  /** Wrapped-diffuse strength: light bleeding past the terminator, like light scattering inside clay. */
  wrap?: number;
  /** True for the pumpkin body: enables the pole fade, rib-valley and dimple occlusion, which assume the pumpkin's UV layout. */
  body?: boolean;
}

/**
 * Presses the clay look into a MeshStandardMaterial that has a map and a bumpMap:
 *  - fingerprint/pit/grain detail (detail texture R) added to the bump height and nudged into the albedo;
 *  - pigment mottling (detail texture G);
 *  - cavity occlusion from the bump map, tinted lavender like bounce light, so creases beside paint read as pressed-in;
 *  - body only: darker rib valleys and pole dimples;
 *  - wrapped diffuse from the key light, so the shadow edge is soft like real clay.
 * The detail tiles DETAIL_REPEAT times across UV and fades out near the poles. Chains onto any existing onBeforeCompile (the rim glow).
 */
export function addClayDetail(material: THREE.MeshStandardMaterial, detail: THREE.Texture, opts: ClayDetailOptions = {}): void {
  const o = { bump: 0.8, lump: 1.4, albedo: 0.2, mottle: 0.07, cavity: 0.6, wrap: 0.9, body: true, ...opts };
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uDetailRepeat = { value: new THREE.Vector2(...DETAIL_REPEAT) };
    shader.uniforms.uDetailBump = { value: o.bump };
    shader.uniforms.uLump = { value: o.lump };
    shader.uniforms.uDetailAlbedo = { value: o.albedo };
    shader.uniforms.uMottle = { value: o.mottle };
    shader.uniforms.uCavity = { value: o.cavity };
    shader.uniforms.uWrap = { value: o.wrap };
    shader.uniforms.uIsBody = { value: o.body ? 1 : 0 };

    const decls = /* glsl */ `
      uniform sampler2D uDetail;
      uniform vec2 uDetailRepeat;
      uniform float uDetailBump;
      uniform float uLump;
      uniform float uDetailAlbedo;
      uniform float uMottle;
      uniform float uCavity;
      uniform float uWrap;
      uniform float uIsBody;
      float clayDetailFade( float v ) { return mix( 1.0, smoothstep( 0.12, 0.35, sin( v * 3.14159265 ) ), uIsBody ); }
    `;
    // Bump: route every height sample through clayHeight(), which adds the detail.
    const bumpChunk = THREE.ShaderChunk.bumpmap_pars_fragment
      .replace(/bumpScale \* texture2D\( bumpMap, ([^)]+) \)\.x/g, "clayHeight( $1 )")
      .replace(
        "vec2 dHdxy_fwd() {",
        /* glsl */ `float clayHeight( vec2 uv ) {
          float d = texture2D( uDetail, uv * uDetailRepeat ).x - 0.5;
          float lumps = texture2D( uDetail, uv * vec2( 2.0, 1.0 ) ).y - 0.5;
          return bumpScale * texture2D( bumpMap, uv ).x + clayDetailFade( uv.y ) * ( uDetailBump * d + uLump * lumps );
        }
        vec2 dHdxy_fwd() {`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <bumpmap_pars_fragment>", decls + bumpChunk)
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
        #ifdef USE_MAP
          vec4 clayTex = texture2D( uDetail, vMapUv * uDetailRepeat );
          float fade = clayDetailFade( vMapUv.y );
          // Fingerprints, pits and grain nudge the albedo; mottling shifts lightness a little, warmer where lighter.
          diffuseColor.rgb *= 1.0 + uDetailAlbedo * ( clayTex.x - 0.5 ) * 2.0 * fade;
          float mottle = texture2D( uDetail, vMapUv * vec2( 2.0, 1.0 ) ).y - 0.5;
          diffuseColor.rgb *= vec3( 1.0 + uMottle * mottle * 2.3, 1.0 + uMottle * mottle * 2.0, 1.0 + uMottle * mottle * 1.6 );

          // Cavity: where the blurred height is above the sharp height we are in a crease beside raised paint.
          float cavity = clamp( ( textureLod( bumpMap, vMapUv, 3.0 ).x - texture2D( bumpMap, vMapUv ).x ) * uCavity * uIsBody, 0.0, 1.0 );
          // Body occlusion: the grooves between lobes and the pole dimples.
          float lobe = abs( sin( ${RIBS.toFixed(1)} * 3.14159265 * vMapUv.x ) ); // 0 in a groove, 1 mid-lobe
          float valley = pow( 1.0 - lobe, 3.0 ) * pow( sin( 3.14159265 * vMapUv.y ), 0.45 );
          float dimple = smoothstep( 0.8, 1.0, abs( vMapUv.y - 0.5 ) * 2.0 );
          float occlusion = clamp( cavity + uIsBody * ( 0.8 * valley + 0.3 * dimple ), 0.0, 0.85 );
          // Shadows deepen the clay's own hue (c * c) rather than graying it out.
          diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * diffuseColor.rgb * 1.05, occlusion );
        #endif`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        #if NUM_DIR_LIGHTS > 0
          // Wrapped diffuse: what a plain Lambert term would miss just past the terminator.
          float clayNdl = dot( normal, directionalLights[ 0 ].direction );
          float clayWrap = max( ( clayNdl + 0.5 ) / 1.5, 0.0 ) - max( clayNdl, 0.0 );
          totalEmissiveRadiance += diffuseColor.rgb * directionalLights[ 0 ].color * clayWrap * uWrap * RECIPROCAL_PI;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `${prevKey()}|clay-detail-${JSON.stringify(o)}`;
}
