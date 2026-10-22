import * as THREE from "three";
import { DETAIL_REPEAT } from "@/lib/painting/detail";

export interface ClayDetailOptions {
  /** Added to the bump height, in the same units as bumpScale * height. */
  bump?: number;
  /** Fraction of albedo lightened or darkened by the detail value. */
  albedo?: number;
}

/**
 * Presses fingerprint/pit/grain detail into a MeshStandardMaterial that has a map and a bumpMap:
 *  (a) the bump height function gains detail * bump, so whorls shade like real relief;
 *  (b) the albedo is nudged slightly lighter or darker by the same value.
 * The detail tiles DETAIL_REPEAT times across UV and fades out near the poles, where UV stretching would smear it.
 * Chains onto any existing onBeforeCompile (the rim glow).
 */
export function addClayDetail(material: THREE.MeshStandardMaterial, detail: THREE.Texture, opts: ClayDetailOptions = {}): void {
  const bump = opts.bump ?? 0.4;
  const albedo = opts.albedo ?? 0.1;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uDetailRepeat = { value: new THREE.Vector2(...DETAIL_REPEAT) };
    shader.uniforms.uDetailBump = { value: bump };
    shader.uniforms.uDetailAlbedo = { value: albedo };

    const decls = /* glsl */ `
      uniform sampler2D uDetail;
      uniform vec2 uDetailRepeat;
      uniform float uDetailBump;
      uniform float uDetailAlbedo;
      float clayDetailFade( float v ) { return smoothstep( 0.12, 0.35, sin( v * 3.14159265 ) ); }
    `;
    // (a) Bump: route every height sample through clayHeight(), which adds the detail.
    const bumpChunk = THREE.ShaderChunk.bumpmap_pars_fragment
      .replace(/bumpScale \* texture2D\( bumpMap, ([^)]+) \)\.x/g, "clayHeight( $1 )")
      .replace(
        "vec2 dHdxy_fwd() {",
        /* glsl */ `float clayHeight( vec2 uv ) {
          float d = texture2D( uDetail, uv * uDetailRepeat ).x - 0.5;
          return bumpScale * texture2D( bumpMap, uv ).x + uDetailBump * clayDetailFade( uv.y ) * d;
        }
        vec2 dHdxy_fwd() {`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <bumpmap_pars_fragment>", decls + bumpChunk)
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
        #ifdef USE_MAP
          float clayDetailValue = texture2D( uDetail, vMapUv * uDetailRepeat ).x - 0.5;
          diffuseColor.rgb *= 1.0 + uDetailAlbedo * clayDetailValue * 2.0 * clayDetailFade( vMapUv.y );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `${prevKey()}|clay-detail-${bump}-${albedo}`;
}
